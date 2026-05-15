"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { STATUS_COLORS, TASK_TYPE_LABELS, IMPACT_COLORS, ISSUE_IMPACT_LABELS, formatDateTime } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const TYPE_ICONS: Record<string, string> = {
    STEP_EXECUTION: "🧪",
    RETEST: "🔄",
    QUESTION: "❓",
  };

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mijn Taken</h1>
        <p className="text-slate-500 text-sm mt-1">{tasks.length} openstaande taak{tasks.length !== 1 ? "en" : ""}</p>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-sm">Geen openstaande taken. Goed bezig!</div>
        ) : tasks.map((task) => {
          const run = task.runStep?.run;
          const project = run?.flowVersion?.flow?.phase?.project;

          // QUESTION tasks: link to the issue, not a task detail page
          if (task.type === "QUESTION" && task.issue) {
            return (
              <Link key={task.id} href={`/issues/${task.issue.id}`} className="card p-4 hover:border-primary-300 transition-colors block">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{TYPE_ICONS[task.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{TASK_TYPE_LABELS[task.type]}</span>
                      <span className={`badge ${STATUS_COLORS[task.status]}`}>{task.status}</span>
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

          // STEP_EXECUTION and RETEST tasks: link to task detail page
          return (
            <Link key={task.id} href={`/tasks/${task.id}`} className="card p-4 hover:border-primary-300 transition-colors block">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{TYPE_ICONS[task.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{TASK_TYPE_LABELS[task.type]}</span>
                    <span className={`badge ${STATUS_COLORS[task.status]}`}>{task.status}</span>
                  </div>
                  <h3 className="font-medium text-slate-900">{task.title}</h3>
                  {project && (
                    <div className="text-xs text-slate-400 mt-1">{project.name} — {run?.name}</div>
                  )}
                  {task.issue && (
                    <div className="text-xs text-primary-600 mt-1">
                      Bevinding: {task.issue.title}
                      {task.issue.impact && <span className={`ml-2 badge border text-xs ${IMPACT_COLORS[task.issue.impact]}`}>{ISSUE_IMPACT_LABELS[task.issue.impact]}</span>}
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
      <HelpButton pageKey="tasks" />
    </div>
  );
}
