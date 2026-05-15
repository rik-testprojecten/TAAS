"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, ISSUE_STATUS_LABELS, formatDateTime, getIssueSlaInfo } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";
import type { Issue } from "@/types";

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", type: "", impact: "" });

  useEffect(() => { load(); }, [filters]);

  async function load() {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);
    if (filters.impact) params.set("impact", filters.impact);
    const res = await fetch(`/api/issues?${params}`);
    const data = await res.json();
    setIssues(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const criticalCount = issues.filter(i => i.impact === "CRITICAL" && !["RESOLVED","REJECTED"].includes(i.status)).length;
  const blockerCount = issues.filter(i => i.type === "BLOCKER" && !["RESOLVED","REJECTED"].includes(i.status)).length;

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bevindingen</h1>
          <p className="text-slate-500 text-sm mt-1">{issues.length} bevinding{issues.length !== 1 ? "en" : ""}</p>
        </div>
      </div>

      {(criticalCount > 0 || blockerCount > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-6">
          {criticalCount > 0 && <span className="text-red-700 font-medium text-sm">{criticalCount} kritieke open issue{criticalCount !== 1 ? "s" : ""}</span>}
          {blockerCount > 0 && <span className="text-red-700 font-medium text-sm">{blockerCount} open blokkade{blockerCount !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">Alle statussen</option>
          <option value="NEW">Nieuw</option>
          <option value="IN_PROGRESS">In behandeling</option>
          <option value="QUESTION">Vraag</option>
          <option value="RESOLVED">Opgelost</option>
          <option value="REJECTED">Afgewezen</option>
        </select>
        <select className="input w-auto text-sm" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
          <option value="">Alle typen</option>
          <option value="BUG">Fout</option>
          <option value="WISH">Wens</option>
          <option value="BLOCKER">Blokkade</option>
        </select>
        <select className="input w-auto text-sm" value={filters.impact} onChange={e => setFilters({...filters, impact: e.target.value})}>
          <option value="">Alle impacts</option>
          <option value="CRITICAL">Kritiek</option>
          <option value="HIGH">Hoog</option>
          <option value="MEDIUM">Middel</option>
          <option value="LOW">Laag</option>
        </select>
        {(filters.status || filters.type || filters.impact) && (
          <button onClick={() => setFilters({ status: "", type: "", impact: "" })} className="text-sm text-slate-500 hover:text-slate-700">
            Filters wissen
          </button>
        )}
      </div>

      <div className="space-y-3">
        {issues.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-sm">Geen bevindingen gevonden</div>
        ) : issues.map((issue) => {
          const project = issue.runStep?.run?.flowVersion?.flow?.phase?.project;
          const sla = getIssueSlaInfo(issue.createdAt, issue.impact, issue.status);
          return (
            <Link key={issue.id} href={`/issues/${issue.id}`} className={`card p-4 hover:border-primary-300 transition-colors block ${sla.isOverdue ? "border-red-200 bg-red-50/30" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge border text-xs ${IMPACT_COLORS[issue.impact]}`}>{ISSUE_IMPACT_LABELS[issue.impact]}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ISSUE_TYPE_LABELS[issue.type]}</span>
                    {issue.retestRequired && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Hertest vereist</span>}
                    {sla.isOverdue && (
                      <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        SLA verlopen
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-slate-900">{issue.title}</h3>
                  {project && <div className="text-xs text-slate-400 mt-1">{project.name} — {issue.runStep?.run?.flowVersion?.flow?.name}</div>}
                  <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
                    <span>Door: {issue.createdBy?.name}</span>
                    <span>{formatDateTime(issue.createdAt)}</span>
                    <span className={sla.isOverdue ? "text-red-500 font-medium" : ""}>
                      Open: {sla.ageLabel} {sla.isOverdue ? `(SLA: ${sla.slaDays}d)` : ""}
                    </span>
                    {(issue._count?.comments ?? 0) > 0 && <span>{issue._count!.comments} reactie{issue._count!.comments !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
                <span className={`badge ${STATUS_COLORS[issue.status]} shrink-0`}>{ISSUE_STATUS_LABELS[issue.status]}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <HelpButton pageKey="issues" />
    </div>
  );
}
