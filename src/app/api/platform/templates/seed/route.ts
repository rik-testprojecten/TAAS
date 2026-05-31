import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/api-helpers";
import { seedStandardTemplates } from "@/lib/templates";

// Laadt/bijwerkt alle standaard AFAS-templates per subonderdeel. Idempotent.
// Bestaande publicatiestatus (concept/gepubliceerd) blijft behouden.
export async function POST(req: NextRequest) {
  const result = await requirePlatformAuth(["SUPER_ADMIN"]);
  if ("error" in result) return result.error;

  let asDraft = false;
  try {
    const body = await req.json();
    asDraft = body?.asDraft === true;
  } catch {
    // geen body — standaard gepubliceerd
  }

  const { templates, steps } = await seedStandardTemplates(prisma, { asDraft });
  return NextResponse.json({ success: true, templates, steps });
}
