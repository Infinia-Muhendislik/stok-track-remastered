import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

// GET: Tüm kullanıcıları listele (Sadece Admin)
export async function GET() {
  const session = await getServerAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      phone: true,
      createdAt: true,
      hashedPassword: true, // Şifre oluşturulmuş mu kontrolü için
    },
    orderBy: { createdAt: "desc" },
  });

  // hashedPassword'ı gizle, sadece "activated" durumu döndür
  const formattedUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    phone: user.phone,
    createdAt: user.createdAt,
    isActivated: !!user.hashedPassword,
  }));

  return NextResponse.json(formattedUsers);
}

// PATCH: Kullanıcı rolünü güncelle (Sadece Admin)
export async function PATCH(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    // Admin kendini yetkisizleştiremez
    if (userId === session.user.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: "You cannot remove your own admin rights" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE: Kullanıcı sil (Sadece Admin)
export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Admin kendini silemez
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
