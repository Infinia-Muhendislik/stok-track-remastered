import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool ayarları URL'de
const databaseUrl = process.env.DATABASE_URL?.includes("connection_limit")
  ? process.env.DATABASE_URL
  : `${process.env.DATABASE_URL}&connection_limit=5&pool_timeout=20`;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
