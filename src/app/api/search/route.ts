import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const search = { contains: q, mode: "insensitive" as const };

  const [projects, issues, flows, runs] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId, name: search },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.issue.findMany({
      where: { tenantId, OR: [{ title: search }, { description: search }] },
      select: {
        id: true,
        title: true,
        status: true,
        impact: true,
        type: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.flow.findMany({
      where: { tenantId, name: search },
      select: { id: true, name: true, phaseId: true, phase: { select: { projectId: true } } },
      take: 5,
    }),
    prisma.testRun.findMany({
      where: { tenantId, name: search },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
  ]);

  const results = [
    ...projects.map((p) => ({ type: "project" as const, id: p.id, title: p.name, subtitle: p.status, href: `/projects/${p.id}` })),
    ...issues.map((i) => ({ type: "issue" as const, id: i.id, title: i.title, subtitle: `${i.type} · ${i.impact} · ${i.status}`, href: `/issues/${i.id}` })),
    ...flows.map((f) => ({ type: "flow" as const, id: f.id, title: f.name, subtitle: "Flow", href: `/projects/${f.phase?.projectId ?? ""}/phases/${f.phaseId}` })),
    ...runs.map((r) => ({ type: "run" as const, id: r.id, title: r.name, subtitle: r.status, href: `/runs/${r.id}` })),
  ];

  return NextResponse.json({ results });
}
