"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, ISSUE_STATUS_LABELS, formatDateTime } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";
import { CardGridSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import type { Issue } from "@/types";

export default function MyIssuesPage() {
  const toast = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/issues?mine=1");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Bevindingen konden niet worden geladen");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Mijn Bevindingen</h1>
          <p className="text-slate-500 text-sm mt-1">Overzicht van alle bevindingen die jij hebt gemeld</p>
        </header>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  const activeIssues = issues.filter((i) => i.status !== "WITHDRAWN");
  const withdrawnIssues = issues.filter((i) => i.status === "WITHDRAWN");

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mijn Bevindingen</h1>
        <p className="text-slate-500 text-sm mt-1">Overzicht van alle bevindingen die jij hebt gemeld</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Actieve bevindingen */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Actief ({activeIssues.length})
          </h2>
          <div className="space-y-3">
            {activeIssues.length === 0 ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Geen actieve bevindingen</div>
            ) : activeIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>

        {/* Ingetrokken bevindingen */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Ingetrokken ({withdrawnIssues.length})
          </h2>
          <div className="space-y-3">
            {withdrawnIssues.length === 0 ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Geen ingetrokken bevindingen</div>
            ) : withdrawnIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} withdrawn />
            ))}
          </div>
        </div>
      </div>
      <HelpButton pageKey="my-issues" />
    </div>
  );
}

function IssueCard({ issue, withdrawn }: { issue: Issue; withdrawn?: boolean }) {
  const project = issue.runStep?.run?.flowVersion?.flow?.phase?.project;
  return (
    <Link
      href={`/issues/${issue.id}`}
      className={`card p-4 hover:border-primary-300 transition-colors block ${withdrawn ? "opacity-75" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge border text-xs ${IMPACT_COLORS[issue.impact]}`}>{ISSUE_IMPACT_LABELS[issue.impact]}</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ISSUE_TYPE_LABELS[issue.type]}</span>
            {issue.retestRequired && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Hertest</span>}
            {withdrawn && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Klik om opnieuw in te dienen</span>
            )}
          </div>
          <h3 className="font-medium text-slate-900">{issue.title}</h3>
          {project && <div className="text-xs text-slate-400 mt-1">{project.name} — {issue.runStep?.run?.flowVersion?.flow?.name}</div>}
          <div className="text-xs text-slate-400 mt-1 flex gap-3">
            <span>{formatDateTime(issue.createdAt)}</span>
            {(issue._count?.comments ?? 0) > 0 && <span>{issue._count?.comments} reactie{issue._count?.comments !== 1 ? "s" : ""}</span>}
          </div>
        </div>
        <span className={`badge shrink-0 ${withdrawn ? "bg-gray-100 text-gray-600" : (STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-700")}`}>
          {ISSUE_STATUS_LABELS[issue.status] ?? issue.status}
        </span>
      </div>
    </Link>
  );
}
