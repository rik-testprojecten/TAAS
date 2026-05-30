import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

// Overzicht per subonderdeel (module-key): hoeveel flows, hoeveel getest en
// hoeveel bevindingen (open/opgelost). Flows en bevindingen zijn aan een
// subonderdeel gekoppeld via Flow.moduleKey resp. Issue.moduleKey.

type Bucket = {
  moduleKey: string;
  flows: number;
  runs: number;
  stepsTotal: number;
  stepsDone: number;
  issuesTotal: number;
  issuesOpen: number;
  issuesResolved: number;
};

const DONE_STATUSES = ["PASSED", "FAILED", "BLOCKED"];
const OPEN_ISSUE_STATUSES = ["NEW", "IN_PROGRESS", "QUESTION"];

export async function GET() {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId } = result.context;

  const buckets = new Map<string, Bucket>();
  const get = (key: string): Bucket => {
    let b = buckets.get(key);
    if (!b) {
      b = { moduleKey: key, flows: 0, runs: 0, stepsTotal: 0, stepsDone: 0, issuesTotal: 0, issuesOpen: 0, issuesResolved: 0 };
      buckets.set(key, b);
    }
    return b;
  };

  // 1. Flows met een subonderdeel + hun versies.
  const flows = await prisma.flow.findMany({
    where: { tenantId, moduleKey: { not: null } },
    select: { id: true, moduleKey: true, versions: { select: { id: true } } },
  });

  const versionToModule = new Map<string, string>();
  for (const f of flows) {
    const key = f.moduleKey as string;
    get(key).flows += 1;
    for (const v of f.versions) versionToModule.set(v.id, key);
  }

  // 2. Runs van die flows.
  const versionIds = [...versionToModule.keys()];
  const runs = versionIds.length
    ? await prisma.testRun.findMany({
        where: { tenantId, flowVersionId: { in: versionIds } },
        select: { id: true, flowVersionId: true },
      })
    : [];

  const runToModule = new Map<string, string>();
  for (const r of runs) {
    const key = versionToModule.get(r.flowVersionId);
    if (!key) continue;
    runToModule.set(r.id, key);
    get(key).runs += 1;
  }

  // 3. Teststappen van die runs (voortgang).
  const runIds = [...runToModule.keys()];
  const steps = runIds.length
    ? await prisma.runStep.findMany({
        where: { tenantId, runId: { in: runIds } },
        select: { runId: true, status: true },
      })
    : [];

  for (const s of steps) {
    const key = runToModule.get(s.runId);
    if (!key) continue;
    const b = get(key);
    b.stepsTotal += 1;
    if (DONE_STATUSES.includes(s.status)) b.stepsDone += 1;
  }

  // 4. Bevindingen per subonderdeel (gekoppeld via Issue.moduleKey).
  const issueGroups = await prisma.issue.groupBy({
    by: ["moduleKey", "status"],
    where: { tenantId, moduleKey: { not: null } },
    _count: { _all: true },
  });

  for (const g of issueGroups) {
    const key = g.moduleKey as string;
    const count = g._count._all;
    const b = get(key);
    b.issuesTotal += count;
    if (g.status === "RESOLVED") b.issuesResolved += count;
    if (OPEN_ISSUE_STATUSES.includes(g.status)) b.issuesOpen += count;
  }

  const data = [...buckets.values()].map((b) => ({
    ...b,
    progressPct: b.stepsTotal > 0 ? Math.round((b.stepsDone / b.stepsTotal) * 100) : 0,
  }));

  return NextResponse.json(data);
}
