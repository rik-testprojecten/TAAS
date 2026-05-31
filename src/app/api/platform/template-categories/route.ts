import { NextResponse } from "next/server";
import { MODULES } from "@/lib/modules";

// Categories zijn nu gebaseerd op modules.ts, niet meer op database-tabellen.
export async function GET() {
  return NextResponse.json(MODULES.map(m => ({
    id: m.key,
    name: m.label,
    slug: m.key,
    subCategories: m.submodules.map(s => ({ id: s.key, name: s.label, slug: s.key })),
  })));
}
