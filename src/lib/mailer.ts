import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getMailer() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST ?? process.env.EMAIL_SERVER;
  const port = Number(process.env.SMTP_PORT ?? process.env.EMAIL_PORT ?? 465);
  const user = process.env.SMTP_USER ?? process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS ?? process.env.EMAIL_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP credentials are not fully configured.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const from =
    process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const mailer = getMailer();
  await mailer.sendMail({
    to,
    from,
    subject: "Reset your Marisonia password",
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you did not request this change, you can safely ignore this email.</p>
    `,
  });
}

// Genel mail gönderme fonksiyonu
export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from =
    process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const mailer = getMailer();
  await mailer.sendMail({
    to,
    from,
    subject,
    html,
  });
}
