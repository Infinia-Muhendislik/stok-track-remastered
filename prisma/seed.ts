import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin kullanıcı bilgileri
  const adminEmail = "admin@marisonia.com";
  const adminPassword = "Admin123!"; // Giriş yaptıktan sonra değiştirin!
  const adminName = "Admin";

  // Admin zaten var mı kontrol et
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin kullanıcı zaten mevcut:", adminEmail);

    // Eğer Admin değilse, Admin yap
    if (existingAdmin.role !== "ADMIN") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "ADMIN" },
      });
      console.log("Kullanıcı Admin rolüne yükseltildi.");
    }
    return;
  }

  // Şifreyi hashle
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Admin oluştur
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Admin kullanıcı oluşturuldu:");
  console.log("   Email:", admin.email);
  console.log("   Şifre:", adminPassword);
  console.log("\n⚠️  Giriş yaptıktan sonra şifrenizi değiştirmeyi unutmayın!");
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
