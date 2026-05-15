import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP not configured — emails will not be sent");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env.SMTP_FROM ?? "TAAS <noreply@taas.app>";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function sendInviteMail(opts: {
  to: string;
  name: string;
  tempPassword: string;
  tenantName: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  try {
    await transport.sendMail({
      from: FROM,
      to: opts.to,
      subject: `Uitnodiging voor ${opts.tenantName} — TAAS Testbeheer`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b;">
          <div style="background: #1e4d3b; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">TAAS Testbeheer</h1>
            <p style="color: #86efac; margin: 4px 0 0; font-size: 14px;">${opts.tenantName}</p>
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
            <p>Hoi ${opts.name},</p>
            <p>Je bent uitgenodigd om deel te nemen aan het testbeheerplatform van <strong>${opts.tenantName}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Inloggegevens</p>
              <p style="margin: 0; font-size: 14px;"><strong>E-mail:</strong> ${opts.to}</p>
              <p style="margin: 4px 0 0; font-size: 14px;"><strong>Tijdelijk wachtwoord:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${opts.tempPassword}</code></p>
            </div>
            <a href="${APP_URL}/login" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
              Inloggen
            </a>
            <p style="font-size: 12px; color: #94a3b8;">Wijzig je wachtwoord na het eerste inloggen. Stuur dit bericht niet door.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    logger.error(err, "Failed to send invite email");
    return false;
  }
}
