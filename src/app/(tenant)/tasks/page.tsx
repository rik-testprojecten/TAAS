"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { STATUS_COLORS, TASK_TYPE_LABELS, TASK_STATUS_LABELS, IMPACT_COLORS, ISSUE_IMPACT_LABELS, formatDateTime } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";
import { CardGridSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

type Task = {
  id: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  description?: string;
  runStep?: { run?: { name?: string; flowVersion?: { flow?: { phase?: { project?: { name: string } } } } }; name?: string } | null;
  issue?: { id: string; title: string; impact?: string } | null;
  previousStep?: { byName: string | null; title: string } | null;
};

const TYPE_ICONS: Record<string, string> = { STEP_EXECUTION: "🧪", RETEST: "🔄", QUESTION: "❓" };

export default function TasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Taken konden niet worden geladen");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterType && t.type !== filterType) return false;
      return true;
    });
  }, [tasks, filterStatus, filterType]);

  const hasFilters = filterStatus || filterType;

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mijn Taken</h1>
        <p className="text-slate-500 text-sm mt-1">
          {filtered.length} van {tasks.length} taak{tasks.length !== 1 ? "en" : ""}
        </p>
      </header>

      {/* Filters */}
      {!loading && tasks.length > 0 && (
        <div className="card p-3 mb-5 flex flex-wrap gap-2 items-center">
          <select
            aria-label="Filter op status"
            className="input w-auto text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Alle statussen</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">Bezig</option>
            <option value="DONE">Afgerond</option>
          </select>
          <select
            aria-label="Filter op type"
            className="input w-auto text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Alle typen</option>
            <option value="STEP_EXECUTION">Uitvoeren</option>
            <option value="RETEST">Hertest</option>
            <option value="QUESTION">Vraag</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(""); setFilterType(""); }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Wis filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <CardGridSkeleton count={4} />
      ) : (
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">Geen openstaande taken</p>
            <p className="text-slate-400 text-sm mt-1">Goed bezig! Je bent helemaal bij.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-slate-400 text-sm">
            Geen taken gevonden voor de geselecteerde filters.{" "}
            <button onClick={() => { setFilterStatus(""); setFilterType(""); }} className="text-primary-600 hover:underline">
              Filters wissen
            </button>
          </div>
        ) : filtered.map((task) => {
          const run = task.runStep?.run;
          const project = run?.flowVersion?.flow?.phase?.project;

          if (task.type === "QUESTION" && task.issue) {
            return (
              <Link key={task.id} href={`/issues/${task.issue.id}`} className="card p-4 hover:border-primary-300 transition-colors block">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{TYPE_ICONS[task.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{TASK_TYPE_LABELS[task.type]}</span>
                      <span className={`badge ${STATUS_COLORS[task.status]}`}>{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                    </div>
                    <h3 className="font-medium text-slate-900">{task.title}</h3>
                    {task.description && <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>}
                    <div className="text-xs text-slate-400 mt-1">{formatDateTime(task.createdAt)}</div>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          }

          return (
            <Link key={task.id} href={`/tasks/${task.id}`} className="card p-4 hover:border-primary-300 transition-colors block">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{TYPE_ICONS[task.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{TASK_TYPE_LABELS[task.type]}</span>
                    <span className={`badge ${STATUS_COLORS[task.status]}`}>{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                  </div>
                  <h3 className="font-medium text-slate-900">{task.title}</h3>
                  {project && (
                    <div className="text-xs text-slate-400 mt-1">{project.name} — {run?.name}</div>
                  )}
                  {task.previousStep?.byName && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" />
                      </svg>
                      Van: <span className="font-medium text-slate-600">{task.previousStep.byName}</span>
                    </div>
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
      )}
      <HelpButton pageKey="tasks" />
    </div>
  );
}
