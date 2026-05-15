"use client";
import { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";

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

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entity: "", action: "", from: "", to: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { load(); }, [filters]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.entity) params.set("entity", filters.entity);
    if (filters.action) params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const res = await fetch(`/api/audit-logs?${params}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
        <p className="text-slate-500 text-sm mt-1">Volledige log van alle acties in het systeem — voor compliance en auditing</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
          <select className="input w-auto text-sm" value={filters.entity} onChange={e => setFilters({ ...filters, entity: e.target.value })}>
            <option value="">Alle</option>
            <option value="Issue">Bevinding</option>
            <option value="RunStep">Teststap</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Actie</label>
          <select className="input w-auto text-sm" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}>
            <option value="">Alle acties</option>
            <option value="CREATE">Aangemaakt</option>
            <option value="UPDATE">Bijgewerkt</option>
            <option value="WITHDRAW">Ingetrokken</option>
            <option value="RESOLVE">Opgelost</option>
            <option value="REJECT">Afgewezen</option>
            <option value="STEP_RESULT">Stap resultaat</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Van</label>
          <input type="date" className="input text-sm" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tot</label>
          <input type="date" className="input text-sm" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        </div>
        {(filters.entity || filters.action || filters.from || filters.to) && (
          <button onClick={() => setFilters({ entity: "", action: "", from: "", to: "" })} className="text-sm text-slate-500 hover:text-slate-700 self-end pb-1">
            Wissen
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Laden...</div>
      ) : (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="card p-12 text-center text-slate-400 text-sm">Geen logregels gevonden</div>
          ) : logs.map((log) => (
            <div key={log.id} className="card p-4">
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
                  <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                  {(log.before || log.after) && (
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      {expandedId === log.id ? "Verbergen" : "Details"}
                    </button>
                  )}
                </div>
              </div>

              {expandedId === log.id && (log.before || log.after) && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {log.before && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">Voor</div>
                      <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto text-slate-700">
                        {JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">Na</div>
                      <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto text-slate-700">
                        {JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <HelpButton pageKey="audit" />
    </div>
  );
}
