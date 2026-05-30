import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const { searchParams } = new URL(req.url);
  // Geselecteerde onderdelen kunnen meegegeven worden tijdens onboarding
  // (`key`/`submodule`/`module`). Wordt er niets meegegeven, dan vallen we terug
  // op de bij de klant opgeslagen module-keuze uit de onboarding.
  let selectedKeys = [
    ...searchParams.getAll("key"),
    ...searchParams.getAll("submodule"),
    ...searchParams.getAll("module"),
  ];

  if (selectedKeys.length === 0) {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { selectedSubmodules: true, selectedModules: true },
    });
    const subs = Array.isArray(settings?.selectedSubmodules) ? (settings!.selectedSubmodules as string[]) : [];
    const mods = Array.isArray(settings?.selectedModules) ? (settings!.selectedModules as string[]) : [];
    selectedKeys = [...subs, ...mods];
  }

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    include: {
      // Alleen de nieuwste actieve versie tonen — bij later inlezen pakt de klant
      // automatisch de meest recente template.
      versions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { _count: { select: { steps: true } } },
      },
      moduleLinks: { select: { moduleKey: true } },
    },
    orderBy: { name: "asc" },
  });

  // Geen module-keuze bekend → alle templates tonen (bv. klant heeft modules
  // overgeslagen tijdens onboarding).
  if (selectedKeys.length === 0) return NextResponse.json(templates);

  const selected = new Set(selectedKeys);
  const filtered = templates.filter((t) => {
    // Niet-gelabelde templates gelden als algemeen en zijn altijd beschikbaar.
    if (t.moduleLinks.length === 0) return true;
    return t.moduleLinks.some((link) => selected.has(link.moduleKey));
  });

  return NextResponse.json(filtered);
}
