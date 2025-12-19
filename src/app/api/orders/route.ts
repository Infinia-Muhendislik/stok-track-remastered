import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

// GET /api/orders - Tüm siparişleri getir
export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin tüm siparişleri görür, Distribütör sadece kendisinin
    const whereClause =
      session.user.role === "ADMIN" ? {} : { userId: session.user.id };

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((o) => ({
      id: o.orderNo,
      customer: o.user.name || o.user.email || "Unknown",
      amount: o.amount,
      status:
        o.status === "APPROVED"
          ? "Approved"
          : o.status === "SHIPPED"
          ? "Shipped"
          : o.status === "DELIVERED"
          ? "Delivered"
          : o.status === "PENDING"
          ? "Pending"
          : "Canceled",
      date: o.createdAt.toISOString(),
      invoiceUrl: o.invoiceUrl,
      items: o.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Yeni sipariş oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Sipariş en az bir ürün içermelidir" },
        { status: 400 }
      );
    }

    // Tüm ürünleri tek seferde çek (N+1 query önleme)
    const productIds = items.map(
      (item: { productId: string }) => item.productId
    );
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, name: true, minStock: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Stok kontrolü
    for (const item of items as { productId: string; quantity: number }[]) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json({ error: `Ürün bulunamadı` }, { status: 400 });
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `${product.name} için yeterli stok yok. Mevcut: ${product.stock}`,
          },
          { status: 400 }
        );
      }
    }

    // Toplam tutarı hesapla
    const amount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    // Benzersiz sipariş numarası oluştur
    const orderNo = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

    // Siparişi oluştur (transaction olmadan - daha hızlı)
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: session.user.id,
        amount,
        status: "PENDING",
        items: {
          create: items.map(
            (item: {
              productId: string;
              quantity: number;
              price: number;
            }) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })
          ),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Stokları paralel güncelle (Promise.all ile)
    const stockUpdates = items.map(
      async (item: { productId: string; quantity: number }) => {
        const product = productMap.get(item.productId)!;
        const newStock = product.stock - item.quantity;

        let newStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
        if (newStock <= 0) {
          newStatus = "OUT_OF_STOCK";
        } else if (newStock <= product.minStock) {
          newStatus = "LOW_STOCK";
        }

        return prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            status: newStatus,
          },
        });
      }
    );

    await Promise.all(stockUpdates);

    // Admin'lere bildirim gönder (arka planda - response'u bekleme)
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    const distributorName = session.user.name || session.user.email;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Yeni Sipariş",
        message: `${distributorName} yeni bir sipariş oluşturdu. Sipariş No: ${orderNo}`,
        type: "order",
        link: "/dashboard/orders",
      })),
    });

    return NextResponse.json({
      id: order.orderNo,
      amount: order.amount,
      status: "Pending",
      date: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Sipariş oluşturulamadı" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders - Sipariş durumunu güncelle (Admin only)
export async function PATCH(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sadece Admin sipariş durumunu güncelleyebilir
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { orderId, status, invoiceUrl } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId gerekli" }, { status: 400 });
    }

    // Siparişi orderNo ile bul
    const order = await prisma.order.findFirst({
      where: { orderNo: orderId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // Update data objesi
    const updateData: { status?: string; invoiceUrl?: string } = {};

    // Status güncelleme
    if (status) {
      const statusMap: Record<string, string> = {
        Pending: "PENDING",
        Approved: "APPROVED",
        Shipped: "SHIPPED",
        Delivered: "DELIVERED",
        Canceled: "CANCELED",
      };

      const dbStatus = statusMap[status];
      if (!dbStatus) {
        return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
      }
      updateData.status = dbStatus;
    }

    // Fatura URL güncelleme
    if (invoiceUrl !== undefined) {
      updateData.invoiceUrl = invoiceUrl;
    }

    // Güncelle
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: updateData as {
        status?: "PENDING" | "APPROVED" | "SHIPPED" | "DELIVERED" | "CANCELED";
        invoiceUrl?: string;
      },
    });

    // Distribütöre bildirim gönder
    const statusLabels: Record<string, string> = {
      Approved: "onaylandı",
      Shipped: "kargoya verildi",
      Delivered: "teslim edildi",
      Canceled: "iptal edildi",
    };

    if (status && statusLabels[status]) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: "Sipariş Güncellendi",
          message: `${orderId} numaralı siparişiniz ${statusLabels[status]}.`,
          type: "order",
          link: "/dashboard/orders",
        },
      });
    }

    // Fatura yüklendiğinde bildirim
    if (invoiceUrl) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: "Fatura Yüklendi",
          message: `${orderId} numaralı siparişiniz için fatura yüklendi.`,
          type: "invoice",
          link: "/dashboard/orders",
        },
      });
    }

    return NextResponse.json({
      id: updated.orderNo,
      status: status || undefined,
      invoiceUrl: updated.invoiceUrl,
      message: "Sipariş güncellendi",
    });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "Sipariş güncellenemedi" },
      { status: 500 }
    );
  }
}
