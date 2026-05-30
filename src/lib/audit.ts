import { prisma } from "@/lib/prisma";

// Field names whose values must never be persisted in audit before/after snapshots.
const DROP_KEYS = new Set(["password", "tempPassword", "token", "secret", "hash"]);
// Field names whose values are masked (kept for traceability, but minimized).
const MASK_KEYS = new Set(["email", "emailDomain"]);

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at <= 1) return "***";
  return `${value[0]}***@${value.slice(at + 1)}`;
}

/**
 * Recursively strips/masks sensitive fields from an audit snapshot so that the
 * AuditLog table never accumulates secrets or unnecessary PII (GDPR minimization).
 */
export function redact(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redact);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (DROP_KEYS.has(lower)) continue;
      if (MASK_KEYS.has(lower) && typeof value === "string") {
        out[key] = lower.includes("email") ? maskEmail(value) : "***";
        continue;
      }
      out[key] = redact(value);
    }
    return out;
  }
  return input;
}

export async function logAudit(
  tenantId: string,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  before?: object | null,
  after?: object | null,
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      entity,
      entityId,
      before: before ? (redact(before) as object) : undefined,
      after: after ? (redact(after) as object) : undefined,
    },
  });
}
