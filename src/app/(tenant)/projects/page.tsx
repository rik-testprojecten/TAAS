"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { STATUS_COLORS, formatDate } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "IMPLEMENTATION" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowNew(false); setForm({ name: "", description: "", type: "IMPLEMENTATION" }); load(); }
    setSaving(false);
  }

  const TYPE_LABELS: Record<string, string> = { IMPLEMENTATION: "Implementatie", OPTIMIZATION: "Optimalisatie", RELEASE: "Release" };
  const PHASE_ORDER = ["FAT", "GAT", "PAT"];

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projecten</h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? "en" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nieuw project
        </button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Nieuw project aanmaken</h2>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Projectnaam *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="AFAS Implementatie 2025" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Beschrijving</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Korte omschrijving..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="IMPLEMENTATION">Implementatie</option>
                  <option value="OPTIMIZATION">Optimalisatie</option>
                  <option value="RELEASE">Release</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Aanmaken"}</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-slate-400 text-sm">Nog geen projecten. Maak uw eerste project aan.</div>
          </div>
        ) : projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card p-5 hover:border-primary-300 transition-colors block">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{TYPE_LABELS[p.type]}</span>
                </div>
                {p.description && <p className="text-sm text-slate-500 mb-2">{p.description}</p>}
                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span>Aangemaakt: {formatDate(p.createdAt)}</span>
                  <div className="flex gap-2">
                    {PHASE_ORDER.filter(ph => p.phases.some((f: any) => f.name === ph)).map((ph) => (
                      <span key={ph} className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-medium">{ph}</span>
                    ))}
                  </div>
                  {p.openTaskCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      {p.openTaskCount} open taak{p.openTaskCount !== 1 ? "en" : ""}
                    </span>
                  )}
                  {p.openIssueCount > 0 && (
                    <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {p.openIssueCount} open issue{p.openIssueCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <span className={`badge ${STATUS_COLORS[p.status]} shrink-0`}>{p.status}</span>
            </div>
          </Link>
        ))}
      </div>
      <HelpButton pageKey="projects" />
    </div>
  );
}
