import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const version = await prisma.flowVersion.findFirst({
    where: { id, tenantId },
    include: {
      steps: { where: { isArchived: false }, orderBy: { order: "asc" } },
      flow: { select: { name: true } },
    },
  });
  if (!version) return NextResponse.json({ error: "Versie niet gevonden" }, { status: 404 });

  const rows = version.steps.map((step) => ({
    Stap: step.order,
    Titel: step.title,
    Instructie: step.instruction,
    "Verwacht resultaat": step.expectedResult ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 60 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, ws, "Testscript");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const safeName = version.flow.name.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="testscript_${safeName}_${version.version}.xlsx"`,
    },
  });
}

// Download blank template
export async function POST() {
  const rows = [
    { Stap: 1, Titel: "Voorbeeld stap", Instructie: "Beschrijf de actie die uitgevoerd moet worden", "Verwacht resultaat": "Beschrijf het verwachte resultaat" },
    { Stap: 2, Titel: "", Instructie: "", "Verwacht resultaat": "" },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 60 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, ws, "Testscript");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="testscript_sjabloon.xlsx"',
    },
  });
}
