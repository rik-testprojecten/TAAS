"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, ISSUE_STATUS_LABELS, formatDateTime, getIssueSlaInfo } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";
import { CardGridSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import type { Issue } from "@/types";

const IMPACT_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

type SortField = "impact" | "createdAt" | "status";
type SortDir = "asc" | "desc";
type ViewTab = "open" | "resolved" | "rejected" | "withdrawn" | "wishlist";

const TABS: { id: ViewTab; label: string; icon?: boolean }[] = [
  { id: "open", label: "Open bevindingen" },
  { id: "resolved", label: "Opgelost" },
  { id: "rejected", label: "Afgewezen" },
  { id: "withdrawn", label: "Ingetrokken" },
  { id: "wishlist", label: "Wenslijst", icon: true },
];

export default function IssuesPage() {
  const toast = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewTab>("open");
  const [filters, setFilters] = useState({ type: "", impact: "" });
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (view === "wishlist") {
      params.set("type", "WISH");
    } else if (view === "resolved") {
      params.set("status", "RESOLVED");
    } else if (view === "rejected") {
      params.set("status", "REJECTED");
    } else if (view === "withdrawn") {
      params.set("status", "WITHDRAWN");
    }

    if (view !== "wishlist" && filters.type) params.set("type", filters.type);
    if (filters.impact) params.set("impact", filters.impact);
    try {
      const res = await fetch(`/api/issues?${params}`);
      if (!res.ok) throw new Error();
      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      // Wensen worden uitgesloten uit alle bevindingen-views
      if (view !== "wishlist") {
        data = data.filter((i: Issue) => i.type !== "WISH");
      }
      // Open-tab toont alleen actieve statussen
      if (view === "open") {
        data = data.filter((i: Issue) => ["NEW", "IN_PROGRESS", "QUESTION"].includes(i.status));
      }

      setIssues(data);
    } catch {
      toast.error("Bevindingen konden niet worden geladen");
    } finally {
      setLoading(false);
    }
  }, [filters, view, toast]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    return [...issues].sort((a, b) => {
      let cmp = 0;
      if (sortField === "impact") {
        cmp = (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9);
      } else if (sortField === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [issues, sortField, sortDir]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <svg className="w-3.5 h-3.5 text-slate-300 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortDir === "asc"
      ? <svg className="w-3.5 h-3.5 text-primary-600 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-3.5 h-3.5 text-primary-600 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  }

  const criticalCount = issues.filter(i => i.impact === "CRITICAL" && ["NEW", "IN_PROGRESS", "QUESTION"].includes(i.status)).length;
  const blockerCount = issues.filter(i => i.type === "BLOCKER" && ["NEW", "IN_PROGRESS", "QUESTION"].includes(i.status)).length;

  const pageTitle = view === "wishlist" ? "Wenslijst" : view === "resolved" ? "Opgeloste bevindingen" : view === "rejected" ? "Afgewezen bevindingen" : view === "withdrawn" ? "Ingetrokken bevindingen" : "Open bevindingen";
  const countLabel = view === "wishlist"
    ? `${issues.length} wens${issues.length !== 1 ? "en" : ""}`
    : `${issues.length} bevinding${issues.length !== 1 ? "en" : ""}`;

  return (
    <div className="p-4 md:p-8">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="text-slate-500 text-sm mt-1">{countLabel}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 mb-5 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setView(tab.id); setFilters({ type: "", impact: "" }); }}
            aria-pressed={view === tab.id}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
              view === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon && (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {view === "open" && (criticalCount > 0 || blockerCount > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-6">
          {criticalCount > 0 && <span className="text-red-700 font-medium text-sm">{criticalCount} kritieke open issue{criticalCount !== 1 ? "s" : ""}</span>}
          {blockerCount > 0 && <span className="text-red-700 font-medium text-sm">{blockerCount} open blokkade{blockerCount !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Filters + sortering */}
      <div className="card p-3 mb-5 flex flex-wrap gap-2 items-center">
        {view !== "wishlist" && (
          <select aria-label="Filter op type" className="input w-auto text-sm" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">Alle typen</option>
            <option value="BUG">Fout</option>
            <option value="BLOCKER">Blokkade</option>
          </select>
        )}
        <select aria-label="Filter op impact" className="input w-auto text-sm" value={filters.impact} onChange={e => setFilters({...filters, impact: e.target.value})}>
          <option value="">Alle impacts</option>
          <option value="CRITICAL">Kritiek</option>
          <option value="HIGH">Hoog</option>
          <option value="MEDIUM">Middel</option>
          <option value="LOW">Laag</option>
        </select>
        <div className="ml-auto flex items-center gap-1 text-sm text-slate-500">
          <span className="text-xs font-medium text-slate-400 mr-1">Sorteren:</span>
          <button onClick={() => toggleSort("impact")} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${sortField === "impact" ? "bg-primary-100 text-primary-700" : "hover:bg-slate-100"}`}>
            Impact <SortIcon field="impact" />
          </button>
          <button onClick={() => toggleSort("createdAt")} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${sortField === "createdAt" ? "bg-primary-100 text-primary-700" : "hover:bg-slate-100"}`}>
            Datum <SortIcon field="createdAt" />
          </button>
          {view !== "open" && (
            <button onClick={() => toggleSort("status")} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${sortField === "status" ? "bg-primary-100 text-primary-700" : "hover:bg-slate-100"}`}>
              Status <SortIcon field="status" />
            </button>
          )}
        </div>
        {(filters.type || filters.impact) && (
          <button onClick={() => setFilters({ type: "", impact: "" })} className="text-sm text-slate-500 hover:text-slate-700">
            Wis filters
          </button>
        )}
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : (
      <div className="space-y-3">
        {issues.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">
              {view === "wishlist" ? "Geen wensen gevonden" : view === "open" ? "Geen open bevindingen" : view === "resolved" ? "Geen opgeloste bevindingen" : view === "rejected" ? "Geen afgewezen bevindingen" : "Geen ingetrokken bevindingen"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {view === "wishlist"
                ? "Er staan nog geen wensen op de wenslijst. Markeer een bevinding als wens via de detailpagina."
                : (filters.type || filters.impact) ? "Probeer andere filteropties." : view === "open" ? "Er zijn geen openstaande bevindingen." : "Er zijn geen bevindingen in deze categorie."}
            </p>
          </div>
        ) : sorted.map((issue) => {
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
                    {view === "open" && (
                      <span className={sla.isOverdue ? "text-red-500 font-medium" : ""}>
                        Open: {sla.ageLabel} {sla.isOverdue ? `(SLA: ${sla.slaDays}d)` : ""}
                      </span>
                    )}
                    {(issue._count?.comments ?? 0) > 0 && <span>{issue._count!.comments} reactie{issue._count!.comments !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
                <span className={`badge ${STATUS_COLORS[issue.status]} shrink-0`}>{ISSUE_STATUS_LABELS[issue.status]}</span>
              </div>
            </Link>
          );
        })}
      </div>
      )}
      <HelpButton pageKey="issues" />
    </div>
  );
}
