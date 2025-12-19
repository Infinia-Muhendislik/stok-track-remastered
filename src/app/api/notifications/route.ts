import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

// GET /api/notifications - Kullanıcının bildirimlerini getir
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const countOnly = searchParams.get("countOnly") === "true";

    // Sadece sayı isteniyorsa hızlı dön
    if (countOnly) {
      const unreadCount = await prisma.notification.count({
        where: { userId: session.user.id, read: false },
      });
      return NextResponse.json({ unreadCount, notifications: [] });
    }

    // Tek sorgu ile hem bildirimleri hem count'u al
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          read: true,
          link: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Bildirimler getirilemedi" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Bildirimi okundu olarak işaretle
export async function PATCH(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, markAllRead } = await request.json();

    if (markAllRead) {
      // Tüm bildirimleri okundu yap
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });

      return NextResponse.json({
        message: "Tüm bildirimler okundu olarak işaretlendi",
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId gerekli" },
        { status: 400 }
      );
    }

    // Tek bildirimi okundu yap
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return NextResponse.json({ message: "Bildirim okundu olarak işaretlendi" });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Bildirim güncellenemedi" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Bildirimi sil
export async function DELETE(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, deleteAll } = await request.json();

    if (deleteAll) {
      await prisma.notification.deleteMany({
        where: { userId: session.user.id },
      });

      return NextResponse.json({ message: "Tüm bildirimler silindi" });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId gerekli" },
        { status: 400 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ message: "Bildirim silindi" });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json({ error: "Bildirim silinemedi" }, { status: 500 });
  }
}
