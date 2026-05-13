export const dynamic = "force-dynamic";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, TASK_TYPE_LABELS, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;
  const userId = session!.user.id;
  const roles = session!.user.roles;

  const isTesterOnly =
    roles.includes("TESTER") &&
    !roles.some((r) => ["TENANT_ADMIN", "FUNCTIONAL_MANAGER", "SCRIPT_WRITER"].includes(r));

  // ── Tester-only view ───────────────────────────────────────────────────────
  if (isTesterOnly) {
    const myTasks = await prisma.task.findMany({
      where: { tenantId, userId, status: { not: "DONE" } },
      include: {
        runStep: {
          include: {
            run: {
              include: {
                flowVersion: { include: { flow: { include: { phase: { include: { project: true } } } } } },
              },
            },
          },
        },
        issue: { select: { id: true, title: true, impact: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const TYPE_ICONS: Record<string, string> = {
      STEP_EXECUTION: "🧪",
      RETEST: "🔄",
      QUESTION: "❓",
    };

    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welkom, {session!.user.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {myTasks.length === 0
              ? "Je hebt geen openstaande taken. Goed bezig!"
              : `Je hebt ${myTasks.length} openstaande taak${myTasks.length !== 1 ? "en" : ""}.`}
          </p>
        </div>

        {myTasks.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 mb-3">Mijn taken</h2>
            <div className="space-y-3">
              {myTasks.map((task) => {
                const run = task.runStep?.run;
                const project = run?.flowVersion?.flow?.phase?.project;

                const href = task.type === "QUESTION" && task.issue
                  ? `/issues/${task.issue.id}`
                  : `/tasks/${task.id}`;

                return (
                  <Link key={task.id} href={href} className="card p-4 hover:border-primary-300 transition-colors block">
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{TYPE_ICONS[task.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{TASK_TYPE_LABELS[task.type]}</span>
                        </div>
                        <h3 className="font-medium text-slate-900">{task.title}</h3>
                        {project && (
                          <div className="text-xs text-slate-400 mt-1">{project.name} — {run?.name}</div>
                        )}
                        {task.issue && (
                          <div className="text-xs text-primary-600 mt-1">
                            Bevinding: {task.issue.title}
                            {task.issue.impact && (
                              <span className={`ml-2 badge border text-xs ${IMPACT_COLORS[task.issue.impact]}`}>
                                {ISSUE_IMPACT_LABELS[task.issue.impact]}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">{formatDateTime(task.createdAt)}</div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Full dashboard (admin / FM / script writer) ────────────────────────────
  const [projects, openIssues, myTasks, recentRuns] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { phases: true, _count: { select: { phases: true } } },
      take: 5,
    }),
    prisma.issue.count({ where: { tenantId, status: { notIn: ["RESOLVED", "REJECTED"] } } }),
    prisma.task.count({ where: { tenantId, userId, status: { not: "DONE" } } }),
    prisma.testRun.findMany({
      where: { tenantId },
      include: { flowVersion: { include: { flow: { include: { phase: { include: { project: true } } } } } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const criticalIssues = await prisma.issue.count({
    where: { tenantId, impact: "CRITICAL", status: { notIn: ["RESOLVED", "REJECTED"] } },
  });

  const stats = [
    { label: "Actieve projecten", value: projects.length, color: "text-primary-600", bg: "bg-primary-50" },
    { label: "Open bevindingen", value: openIssues, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Kritieke issues", value: criticalIssues, color: "text-red-600", bg: "bg-red-50" },
    { label: "Mijn taken", value: myTasks, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welkom terug, {session!.user.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.bg} mb-3`}>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-sm text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Actieve projecten</h2>
            <Link href="/projects" className="text-primary-600 text-sm hover:underline">Alle projecten</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {projects.length === 0 ? (
              <div className="p-5 text-sm text-slate-400 text-center">Geen actieve projecten</div>
            ) : projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-medium text-slate-900 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.phases.length} fase{p.phases.length !== 1 ? "s" : ""}</div>
                </div>
                <span className={`badge ${STATUS_COLORS[p.status]}`}>{p.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recente testruns</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentRuns.length === 0 ? (
              <div className="p-5 text-sm text-slate-400 text-center">Nog geen testruns</div>
            ) : recentRuns.map((r) => (
              <Link key={r.id} href={`/runs/${r.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-medium text-slate-900 text-sm">{r.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {r.flowVersion.flow.phase.project.name} — {r.flowVersion.flow.phase.name} — {r.flowVersion.flow.name}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge ${STATUS_COLORS[r.status]}`}>{r.status.replace("_", " ")}</span>
                  <div className="text-xs text-slate-400 mt-1">{formatDateTime(r.updatedAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
