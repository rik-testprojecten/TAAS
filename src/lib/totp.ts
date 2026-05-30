import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "TAAS";

/**
 * TOTP-hulpfuncties voor twee-factor-authenticatie (2FA).
 * Compatibel met Microsoft Authenticator, Google Authenticator, e.d.
 */

function buildTotp(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

/** Genereert een nieuw willekeurig base32-geheim. */
export function generateSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** Bouwt de otpauth://-URI die in een authenticator-app geïmporteerd kan worden. */
export function buildOtpauthUrl(secretBase32: string, accountLabel: string): string {
  return buildTotp(secretBase32, accountLabel).toString();
}

/** Genereert een QR-code (data-URL, PNG) voor de gegeven otpauth-URI. */
export async function buildQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

/**
 * Valideert een door de gebruiker ingevoerde code tegen het geheim.
 * Een window van 1 staat een klein tijdsverschil (±30s) toe.
 */
export function verifyToken(secretBase32: string, token: string): boolean {
  if (!token || !/^\d{6}$/.test(token.trim())) return false;
  const totp = buildTotp(secretBase32, ISSUER);
  const delta = totp.validate({ token: token.trim(), window: 1 });
  return delta !== null;
}
