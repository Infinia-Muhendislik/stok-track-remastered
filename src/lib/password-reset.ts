import { createHash, randomUUID } from "crypto";
import jwt from "jsonwebtoken";

import prisma from "@/lib/prisma";

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

function getResetSecret() {
  const secret =
    process.env.PASSWORD_RESET_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("PASSWORD_RESET_TOKEN_SECRET is not configured.");
  }
  return secret;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordResetToken(
  userId: string,
  email: string,
  expiresInDays: number = 0 // 0 means 1 hour (default), > 0 means that many days
) {
  const secret = getResetSecret();
  const jwtId = randomUUID();
  const expiresInSeconds =
    expiresInDays > 0 ? expiresInDays * 24 * 60 * 60 : 60 * 60; // seconds

  const token = jwt.sign({ sub: userId, email }, secret, {
    expiresIn: expiresInSeconds,
    jwtid: jwtId,
  });

  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + (expiresInDays > 0 ? expiresInDays * DAY_IN_MS : HOUR_IN_MS)
  );

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function validateAndConsumeResetToken(token: string) {
  try {
    const secret = getResetSecret();
    jwt.verify(token, secret);
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      return null;
    }

    await prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { used: true },
    });
    return record.userId;
  } catch (error) {
    console.error("Token validation failed", error);
    return null;
  }
}
