"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { STATUS_COLORS, PHASE_DESCRIPTIONS, formatDate } from "@/lib/utils";

export default function PhasePage() {
  const { id, phaseId } = useParams<{ id: string; phaseId: string }>();
  const [phase, setPhase] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showOverneemFAT, setShowOverneemFAT] = useState(false);
  const [showCopy, setShowCopy] = useState<{ flow: any } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [importForm, setImportForm] = useState({ name: "", templateVersionId: "" });
  const [copyForm, setCopyForm] = useState({ name: "", targetPhaseId: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ flowId: string; name: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState<{ flowId: string; name: string } | null>(null);
  const [fatFlows, setFatFlows] = useState<any[]>([]);
  const [selectedFatFlows, setSelectedFatFlows] = useState<string[]>([]);
  const [loadingFat, setLoadingFat] = useState(false);

  useEffect(() => {
    load();
    fetch("/api/platform/templates")
      .then(r => r.json())
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [phaseId]);

  async function load() {
    const res = await fetch(`/api/phases/${phaseId}`);
    const data = await res.json();
    setPhase(data);
    setLoading(false);
  }

  async function createFlow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/phases/${phaseId}/flows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowNewFlow(false); setForm({ name: "", description: "" }); load(); }
    setSaving(false);
  }

  async function importTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/phases/${phaseId}/flows/import-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importForm),
    });
    if (res.ok) { setShowImport(false); setImportForm({ name: "", templateVersionId: "" }); load(); }
    setSaving(false);
  }

  async function copyFlow(e: React.FormEvent) {
    e.preventDefault();
    if (!showCopy) return;
    setSaving(true);
    const latestVersion = showCopy.flow.versions?.[0];
    if (!latestVersion) { setSaving(false); return; }
    const targetPhase = copyForm.targetPhaseId || phaseId;
    await fetch(`/api/phases/${targetPhase}/flows/clone-from-phase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceFlowVersionId: latestVersion.id, name: copyForm.name, includeIssues: false }),
    });
    setShowCopy(null);
    setCopyForm({ name: "", targetPhaseId: "" });
    load();
    setSaving(false);
  }

  async function closeFlow(flowId: string) {
    await fetch(`/api/flows/${flowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setConfirmClose(null);
    load();
  }

  async function deleteFlow(flowId: string) {
    await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  async function openOverneemFAT() {
    setShowOverneemFAT(true);
    setSelectedFatFlows([]);
    const fatPhase = phase?.project?.phases?.find((p: any) => p.name === "FAT");
    if (!fatPhase) return;
    setLoadingFat(true);
    const res = await fetch(`/api/phases/${fatPhase.id}/flows`);
    const data = await res.json();
    setFatFlows(Array.isArray(data) ? data : []);
    setLoadingFat(false);
  }

  async function overneemFatFlows() {
    setSaving(true);
    for (const fatFlow of fatFlows.filter((f: any) => selectedFatFlows.includes(f.id))) {
      const latestVersion = fatFlow.versions?.[0];
      if (!latestVersion) continue;
      await fetch(`/api/phases/${phaseId}/flows/clone-from-phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFlowVersionId: latestVersion.id, name: fatFlow.name, includeIssues: false }),
      });
    }
    setShowOverneemFAT(false);
    setSelectedFatFlows([]);
    load();
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!phase || phase.error) return <div className="p-8 text-slate-500">Fase niet gevonden</div>;

  const allTemplateVersions = templates.flatMap((t: any) =>
    (t.versions || []).map((v: any) => ({ ...v, templateName: t.name, category: t.category }))
  );

  const isGAT = phase.name === "GAT";
  const hasFATPhase = phase.project?.phases?.some((p: any) => p.name === "FAT");
  const siblingPhases = (phase.project?.phases ?? []).filter((p: any) => p.id !== phaseId);

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/projects" className="hover:text-slate-600">Projecten</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-slate-600">{phase.project.name}</Link>
        <span>/</span>
        <span className="text-slate-700">{phase.title ? `${phase.name} — ${phase.title}` : phase.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary-700 font-bold text-sm">{phase.name}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{PHASE_DESCRIPTIONS[phase.name]}{phase.title ? ` — ${phase.title}` : ""}</h1>
              <span className={`badge ${STATUS_COLORS[phase.status]}`}>{phase.status}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isGAT && hasFATPhase && (
            <button onClick={openOverneemFAT} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              Flows overnemen van FAT
            </button>
          )}
          {allTemplateVersions.length > 0 && (
            <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2 text-sm">
              Template importeren
            </button>
          )}
          <button onClick={() => setShowNewFlow(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nieuwe flow
          </button>
        </div>
      </div>

      {/* Nieuwe flow modal */}
      {showNewFlow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Nieuwe flow aanmaken</h2>
            <form onSubmit={createFlow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="HR Instroom" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Beschrijving</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Aanmaken..." : "Aanmaken"}</button>
                <button type="button" onClick={() => setShowNewFlow(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template importeren modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Template importeren als flow</h2>
            <form onSubmit={importTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Flow naam *</label>
                <input className="input" value={importForm.name} onChange={e => setImportForm({...importForm, name: e.target.value})} required placeholder="HR Instroom FAT" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Template versie *</label>
                <select className="input" value={importForm.templateVersionId} onChange={e => setImportForm({...importForm, templateVersionId: e.target.value})} required>
                  <option value="">Selecteer template...</option>
                  {allTemplateVersions.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.templateName} — {v.version} ({v.category})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Importeren..." : "Importeren"}</button>
                <button type="button" onClick={() => setShowImport(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flow kopiëren modal */}
      {showCopy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-1">Flow kopiëren</h2>
            <p className="text-sm text-slate-500 mb-4">Kopie van <strong>{showCopy.flow.name}</strong> — bevindingen worden niet meegenomen.</p>
            <form onSubmit={copyFlow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam kopie *</label>
                <input className="input" value={copyForm.name} onChange={e => setCopyForm({...copyForm, name: e.target.value})} required placeholder={`${showCopy.flow.name} (kopie)`} />
              </div>
              {siblingPhases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Kopiëren naar fase</label>
                  <select className="input" value={copyForm.targetPhaseId} onChange={e => setCopyForm({...copyForm, targetPhaseId: e.target.value})}>
                    <option value="">Huidige fase ({phase.name})</option>
                    {siblingPhases.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — {PHASE_DESCRIPTIONS[p.name]}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Kopiëren..." : "Kopiëren"}</button>
                <button type="button" onClick={() => setShowCopy(null)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flows overnemen van FAT modal */}
      {showOverneemFAT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="font-semibold text-lg mb-1">Flows overnemen van FAT</h2>
            <p className="text-sm text-slate-500 mb-4">Selecteer welke FAT-flows je wilt overnemen. Bevindingen worden niet meegenomen.</p>
            {loadingFat ? (
              <p className="text-slate-400 text-sm py-4">Laden...</p>
            ) : fatFlows.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">Geen flows gevonden in de FAT-fase.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                {fatFlows.map((flow: any) => {
                  const checked = selectedFatFlows.includes(flow.id);
                  return (
                    <label key={flow.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary-300 bg-primary-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedFatFlows(prev => checked ? prev.filter(x => x !== flow.id) : [...prev, flow.id])}
                        className="w-4 h-4 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900">{flow.name}</div>
                        {flow.description && <div className="text-xs text-slate-400 truncate">{flow.description}</div>}
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">
                        {flow.versions?.[0]?._count?.steps ?? 0} stappen
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={overneemFatFlows} disabled={saving || selectedFatFlows.length === 0} className="btn-primary flex-1">
                {saving ? "Overnemen..." : `${selectedFatFlows.length} flow${selectedFatFlows.length !== 1 ? "s" : ""} overnemen`}
              </button>
              <button onClick={() => setShowOverneemFAT(false)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Bevestiging flow afsluiten */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-2">Flow afsluiten</h2>
            <p className="text-slate-500 text-sm mb-4">Weet je zeker dat je <strong>{confirmClose.name}</strong> wilt afsluiten? Alle openstaande taken bij testers worden verwijderd.</p>
            <div className="flex gap-3">
              <button onClick={() => closeFlow(confirmClose.flowId)} className="btn-primary flex-1">Afsluiten</button>
              <button onClick={() => setConfirmClose(null)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Bevestiging flow verwijderen */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-2 text-red-700">Flow verwijderen</h2>
            <p className="text-slate-500 text-sm mb-4">Weet je zeker dat je <strong>{confirmDelete.name}</strong> wilt verwijderen? Alle runs en bevindingen worden ook verwijderd. Dit kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteFlow(confirmDelete.flowId)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-1">Definitief verwijderen</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Flows */}
      <div className="grid gap-4">
        {phase.flows.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-slate-400 text-sm">Nog geen flows in deze fase.</div>
          </div>
        ) : phase.flows.map((flow: any) => {
          const latestVersion = flow.versions?.[0];
          const isClosed = flow.status === "CLOSED";
          return (
            <div key={flow.id} className={`card ${isClosed ? "opacity-70" : ""}`}>
              <div className="flex items-center justify-between p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-900">{flow.name}</h3>
                    {latestVersion && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{latestVersion.version}</span>}
                    {isClosed && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Afgesloten</span>}
                    {flow.sourceTemplateVersionId && (
                      <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">Van template</span>
                    )}
                    {flow.sourceFlowVersionId && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Overgenomen</span>
                    )}
                  </div>
                  {flow.description && <p className="text-sm text-slate-500 mb-2">{flow.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{latestVersion?._count?.steps ?? 0} stappen</span>
                    <span>{latestVersion?._count?.runs ?? 0} runs</span>
                    <span>Bijgewerkt {formatDate(flow.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 items-center">
                  {!isClosed && latestVersion && (
                    <Link href={`/runs/new?versionId=${latestVersion.id}&flowName=${encodeURIComponent(flow.name)}`} className="btn-secondary text-sm">
                      Run starten
                    </Link>
                  )}
                  {!isClosed && (
                    <Link href={`/flows/${flow.id}`} className="btn-primary text-sm">
                      Bewerken
                    </Link>
                  )}
                  {/* Kopiëren */}
                  <button
                    onClick={() => { setShowCopy({ flow }); setCopyForm({ name: `${flow.name} (kopie)`, targetPhaseId: "" }); }}
                    title="Flow kopiëren"
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {/* Afsluiten */}
                  {!isClosed && (
                    <button
                      onClick={() => setConfirmClose({ flowId: flow.id, name: flow.name })}
                      title="Flow afsluiten"
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  {/* Verwijderen */}
                  <button
                    onClick={() => setConfirmDelete({ flowId: flow.id, name: flow.name })}
                    title="Flow verwijderen"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {latestVersion?.runs && latestVersion.runs.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 flex gap-4">
                  {latestVersion.runs.slice(0, 3).map((run: any) => (
                    <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center gap-2 text-xs hover:text-primary-600">
                      <span className={`badge ${STATUS_COLORS[run.status]}`}>{run.status.replace("_", " ")}</span>
                      <span className="text-slate-500">{run.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
