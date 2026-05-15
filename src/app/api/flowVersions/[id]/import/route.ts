import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

const REQUIRED_COLUMNS = ["Titel", "Instructie"];

type StepRow = {
  Titel?: string;
  Instructie?: string;
  "Verwacht resultaat"?: string;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireTenantAuth(["TENANT_ADMIN", "SCRIPT_WRITER"]);
  if ("error" in result) return result.error;
  const { tenantId } = result.context;
  const { id } = await params;

  const version = await prisma.flowVersion.findFirst({ where: { id, tenantId } });
  if (!version) return NextResponse.json({ error: "Versie niet gevonden" }, { status: 404 });

  const hasRuns = await prisma.testRun.findFirst({ where: { flowVersionId: id } });
  if (hasRuns) return NextResponse.json({ error: "Versie heeft al testuitvoeringen. Maak een nieuwe versie aan." }, { status: 409 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Alleen .xlsx, .xls of .csv bestanden worden ondersteund" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<StepRow>(sheet, { defval: "" });

  if (rows.length === 0) return NextResponse.json({ error: "Het bestand bevat geen rijen" }, { status: 400 });

  // Validate required columns
  const firstRow = rows[0];
  for (const col of REQUIRED_COLUMNS) {
    if (!(col in firstRow)) {
      return NextResponse.json({
        error: `Kolom "${col}" ontbreekt. Vereiste kolommen: ${REQUIRED_COLUMNS.join(", ")}`,
      }, { status: 400 });
    }
  }

  const validRows = rows.filter((r) => r.Titel?.toString().trim() && r.Instructie?.toString().trim());
  if (validRows.length === 0) return NextResponse.json({ error: "Geen geldige stappen gevonden (Titel en Instructie zijn verplicht)" }, { status: 400 });

  // Get current max order
  const maxOrder = await prisma.flowStep.aggregate({ where: { flowVersionId: id }, _max: { order: true } });
  let order = (maxOrder._max.order ?? 0) + 1;

  await prisma.flowStep.createMany({
    data: validRows.map((row) => ({
      flowVersionId: id,
      tenantId,
      title: row.Titel!.toString().trim(),
      instruction: row.Instructie!.toString().trim(),
      expectedResult: row["Verwacht resultaat"]?.toString().trim() || null,
      order: order++,
    })),
  });

  return NextResponse.json({ imported: validRows.length });
}
