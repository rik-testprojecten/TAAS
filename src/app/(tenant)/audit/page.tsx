"use client";
import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";
import { Field, SelectField } from "@/components/Field";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Aangemaakt",
  UPDATE: "Bijgewerkt",
  WITHDRAW: "Ingetrokken",
  RESOLVE: "Opgelost",
  REJECT: "Afgewezen",
  STEP_RESULT: "Stap resultaat",
};

const ENTITY_LABELS: Record<string, string> = {
  Issue: "Bevinding",
  RunStep: "Teststap",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-blue-100 text-blue-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  WITHDRAW: "bg-gray-100 text-gray-700",
  RESOLVE: "bg-green-100 text-green-700",
  REJECT: "bg-red-100 text-red-700",
  STEP_RESULT: "bg-purple-100 text-purple-700",
};

type AuditLogRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  before?: unknown;
  after?: unknown;
  user?: { name?: string; email?: string };
};

export default function AuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entity: "", action: "", from: "", to: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.entity) params.set("entity", filters.entity);
    if (filters.action) params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    try {
      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Auditlog kon niet worden geladen");
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => { load(); }, [load]);

  const hasFilters = filters.entity || filters.action || filters.from || filters.to;

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
        <p className="text-slate-500 text-sm mt-1">Volledige log van alle acties in het systeem — voor compliance en auditing</p>
      </header>

      {/* Filters */}
      <section aria-label="Filters" className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <SelectField
          label="Type"
          className="w-auto"
          value={filters.entity}
          onChange={e => setFilters({ ...filters, entity: e.target.value })}
        >
          <option value="">Alle</option>
          <option value="Issue">Bevinding</option>
          <option value="RunStep">Teststap</option>
        </SelectField>
        <SelectField
          label="Actie"
          className="w-auto"
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
        >
          <option value="">Alle acties</option>
          <option value="CREATE">Aangemaakt</option>
          <option value="UPDATE">Bijgewerkt</option>
          <option value="WITHDRAW">Ingetrokken</option>
          <option value="RESOLVE">Opgelost</option>
          <option value="REJECT">Afgewezen</option>
          <option value="STEP_RESULT">Stap resultaat</option>
        </SelectField>
        <Field label="Van" type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        <Field label="Tot" type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        {hasFilters && (
          <button onClick={() => setFilters({ entity: "", action: "", from: "", to: "" })} className="text-sm text-slate-500 hover:text-slate-700 self-end pb-2">
            Wissen
          </button>
        )}
      </section>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Auditlog laden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Geen logregels gevonden</div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const expanded = expandedId === log.id;
            const hasDetails = !!(log.before || log.after);
            return (
              <li key={log.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`badge text-xs shrink-0 ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {ENTITY_LABELS[log.entity] ?? log.entity}
                        <span className="text-slate-400 font-normal ml-2 text-xs font-mono">{log.entityId.slice(0, 8)}…</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Door: <span className="font-medium text-slate-700">{log.user?.name ?? "onbekend"}</span>
                        {log.user?.email && <span className="ml-1 text-slate-400">({log.user.email})</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <time className="text-xs text-slate-400" dateTime={log.createdAt}>{formatDateTime(log.createdAt)}</time>
                    {hasDetails && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                        aria-expanded={expanded}
                        aria-controls={`audit-details-${log.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
                      >
                        {expanded ? "Verbergen" : "Details"}
                      </button>
                    )}
                  </div>
                </div>

                {expanded && hasDetails && (
                  <div id={`audit-details-${log.id}`} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {!!log.before && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">Voor</div>
                        <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto text-slate-700">{JSON.stringify(log.before, null, 2)}</pre>
                      </div>
                    )}
                    {!!log.after && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">Na</div>
                        <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto text-slate-700">{JSON.stringify(log.after, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <HelpButton pageKey="audit" />
    </div>
  );
}
