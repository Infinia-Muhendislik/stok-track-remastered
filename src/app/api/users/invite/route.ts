import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { issuePasswordResetToken } from "@/lib/password-reset";

// POST: Yeni distribütör davet et (Sadece Admin)
export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // E-posta zaten kayıtlı mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 400 }
      );
    }

    // Şifresiz kullanıcı oluştur
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        role: "DISTRIBUTOR",
        hashedPassword: null, // Şifre henüz yok
      },
    });

    // Reset token oluştur (şifre belirleme için, 7 gün geçerli)
    const { token } = await issuePasswordResetToken(newUser.id, email, 7);

    // Davet e-postası gönder
    const inviteLink = `${
      process.env.NEXTAUTH_URL
    }/set-password?token=${encodeURIComponent(token)}`;

    await sendMail({
      to: email,
      subject: "Marisonia Bayi Paneline Davet Edildiniz",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Marisonia Bayi Paneline Hoş Geldiniz! 🎉</h2>
          <p style="color: #475569;">
            Marisonia Stok Takip sistemine bayi olarak davet edildiniz.
          </p>
          <p style="color: #475569;">
            Hesabınızı aktifleştirmek ve şifrenizi oluşturmak için aşağıdaki bağlantıya tıklayın:
          </p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Şifremi Oluştur
          </a>
          <p style="color: #94a3b8; font-size: 14px;">
            Bu bağlantı 7 gün boyunca geçerlidir.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px;">
            Bu e-postayı beklemiyorsanız, lütfen dikkate almayın.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Failed to invite distributor:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
