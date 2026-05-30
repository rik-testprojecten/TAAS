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
  setPasswordToken: string;
  tenantName: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const setPasswordUrl = `${APP_URL}/set-password?token=${encodeURIComponent(opts.setPasswordToken)}`;

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
            <p style="font-size: 14px;">Klik op de knop hieronder om je eigen wachtwoord in te stellen. Deze link is 7 dagen geldig.</p>
            <a href="${setPasswordUrl}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
              Wachtwoord instellen
            </a>
            <p style="font-size: 12px; color: #94a3b8;">Werkt de knop niet? Kopieer deze link naar je browser:<br><span style="word-break: break-all;">${setPasswordUrl}</span></p>
            <p style="font-size: 12px; color: #94a3b8;">Heb je deze uitnodiging niet verwacht? Negeer dit bericht. Stuur het niet door.</p>
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
