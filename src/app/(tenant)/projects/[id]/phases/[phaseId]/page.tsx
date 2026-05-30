"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { STATUS_COLORS, PHASE_DESCRIPTIONS, PHASE_STATUS_LABELS, RUN_STATUS_LABELS, formatDate, todayISO, daysFromNowISO } from "@/lib/utils";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";
import { MODULES, getSubmoduleLabel } from "@/lib/modules";

// Keuzelijst voor het subonderdeel waaraan een flow gekoppeld wordt.
function SubmoduleSelect({ value, onChange, allowed }: { value: string; onChange: (v: string) => void; allowed?: string[] }) {
  const allowSet = allowed && allowed.length > 0 ? new Set(allowed) : null;
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Geen subonderdeel —</option>
      {MODULES.map((mod) => {
        const subs = mod.submodules.filter((s) => !allowSet || allowSet.has(s.key));
        if (subs.length === 0) return null;
        return (
          <optgroup key={mod.key} label={`${mod.emoji} ${mod.label}`}>
            {subs.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

export default function PhasePage() {
  const toast = useToast();
  const { id, phaseId } = useParams<{ id: string; phaseId: string }>();
  const [phase, setPhase] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"flows" | "monitor">("flows");

  // Flow management state
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showOverneemFAT, setShowOverneemFAT] = useState(false);
  const [showCopy, setShowCopy] = useState<{ flow: any } | null>(null);
  const [showFlowDates, setShowFlowDates] = useState<{ flow: any } | null>(null);
  const [showPhaseDates, setShowPhaseDates] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", moduleKey: "" });
  const [importForm, setImportForm] = useState({ name: "", templateVersionId: "", moduleKey: "" });
  const [copyForm, setCopyForm] = useState({ name: "", targetPhaseId: "", moduleKey: "" });
  const [allowedSubmodules, setAllowedSubmodules] = useState<string[]>([]);
  const [flowDatesForm, setFlowDatesForm] = useState({ scheduledStart: "", scheduledEnd: "" });
  const [phaseDatesForm, setPhaseDatesForm] = useState({ startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ flowId: string; name: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState<{ flowId: string; name: string } | null>(null);
  const [fatFlows, setFatFlows] = useState<any[]>([]);
  const [selectedFatFlows, setSelectedFatFlows] = useState<string[]>([]);
  const [loadingFat, setLoadingFat] = useState(false);

  // Fase lifecycle state
  const [confirmStartPhase, setConfirmStartPhase] = useState(false);
  const [confirmStopPhase, setConfirmStopPhase] = useState(false);
  const [phaseActionResult, setPhaseActionResult] = useState<string | null>(null);
  const [savingPhase, setSavingPhase] = useState(false);

  // Monitoring state
  const [monitorData, setMonitorData] = useState<any>(null);
  const [loadingMonitor, setLoadingMonitor] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [reassignTask, setReassignTask] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [savingReassign, setSavingReassign] = useState(false);
  const [advanceStep, setAdvanceStep] = useState<{ stepId: string; stepTitle: string } | null>(null);
  const [advanceStatus, setAdvanceStatus] = useState<"PASSED" | "FAILED" | "BLOCKED">("PASSED");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [savingAdvance, setSavingAdvance] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/phases/${phaseId}`);
    const data = await res.json();
    setPhase(data);
    setLoading(false);
  }, [phaseId]);

  useEffect(() => {
    load();
    // Tenant-endpoint: filtert op de bij onboarding gekozen modules en levert
    // per template de nieuwste actieve versie.
    fetch("/api/templates")
      .then(r => r.json())
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Sjablonen konden niet worden geladen"));
    fetch("/api/users")
      .then(r => r.json())
      .then(d => setTenantUsers(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Gebruikers konden niet worden geladen"));
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => setAllowedSubmodules(Array.isArray(d?.selectedSubmodules) ? d.selectedSubmodules : []))
      .catch(() => {});
  }, [phaseId, load]);

  async function loadMonitor() {
    setLoadingMonitor(true);
    const res = await fetch(`/api/phases/${phaseId}/monitor`);
    const data = await res.json();
    setMonitorData(data);
    setLoadingMonitor(false);
  }

  useEffect(() => {
    if (activeTab === "monitor") loadMonitor();
  }, [activeTab]);

  async function createFlow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/phases/${phaseId}/flows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, moduleKey: form.moduleKey || null }),
    });
    if (res.ok) { setShowNewFlow(false); setForm({ name: "", description: "", moduleKey: "" }); load(); }
    setSaving(false);
  }

  async function importTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/phases/${phaseId}/flows/import-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...importForm, moduleKey: importForm.moduleKey || null }),
    });
    if (res.ok) { setShowImport(false); setImportForm({ name: "", templateVersionId: "", moduleKey: "" }); load(); }
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
      body: JSON.stringify({ sourceFlowVersionId: latestVersion.id, name: copyForm.name, includeIssues: false, moduleKey: copyForm.moduleKey || null }),
    });
    setShowCopy(null);
    setCopyForm({ name: "", targetPhaseId: "", moduleKey: "" });
    load();
    setSaving(false);
  }

  async function saveFlowDates(e: React.FormEvent) {
    e.preventDefault();
    if (!showFlowDates) return;
    setSaving(true);
    await fetch(`/api/flows/${showFlowDates.flow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledStart: flowDatesForm.scheduledStart || null,
        scheduledEnd: flowDatesForm.scheduledEnd || null,
      }),
    });
    setShowFlowDates(null);
    load();
    setSaving(false);
  }

  async function savePhaseDates(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: phaseDatesForm.startDate || null,
        endDate: phaseDatesForm.endDate || null,
      }),
    });
    setShowPhaseDates(false);
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

  async function startPhase() {
    setSavingPhase(true);
    const res = await fetch(`/api/phases/${phaseId}/start`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setPhaseActionResult(`Fase gestart: ${data.createdRuns} run${data.createdRuns !== 1 ? "s" : ""} aangemaakt, ${data.createdTasks} taak${data.createdTasks !== 1 ? "en" : ""} uitgezet.`);
    }
    setConfirmStartPhase(false);
    setSavingPhase(false);
    load();
    if (activeTab === "monitor") loadMonitor();
  }

  async function stopPhase() {
    setSavingPhase(true);
    const res = await fetch(`/api/phases/${phaseId}/stop`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setPhaseActionResult(`Fase gestopt: ${data.deletedTasks} taak${data.deletedTasks !== 1 ? "en" : ""} verwijderd bij testers.`);
    }
    setConfirmStopPhase(false);
    setSavingPhase(false);
    load();
    if (activeTab === "monitor") loadMonitor();
  }

  async function doReassign(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignTask || !reassignUserId) return;
    setSavingReassign(true);
    await fetch(`/api/tasks/${reassignTask.taskId}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: reassignUserId }),
    });
    setSavingReassign(false);
    setReassignTask(null);
    setReassignUserId("");
    loadMonitor();
  }

  async function doAdvance(e: React.FormEvent) {
    e.preventDefault();
    if (!advanceStep) return;
    setSavingAdvance(true);
    await fetch(`/api/runSteps/${advanceStep.stepId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: advanceStatus, notes: advanceNotes }),
    });
    setSavingAdvance(false);
    setAdvanceStep(null);
    setAdvanceNotes("");
    load();
    loadMonitor();
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!phase || phase.error) return <div className="p-8 text-slate-500">Fase niet gevonden</div>;

  const allTemplateVersions = templates.flatMap((t: any) =>
    (t.versions || []).map((v: any) => ({ ...v, templateName: t.name, category: t.category, moduleKeys: (t.moduleLinks || []).map((l: any) => l.moduleKey) }))
  );

  const isGAT = phase.name === "GAT";
  const hasFATPhase = phase.project?.phases?.some((p: any) => p.name === "FAT");
  const siblingPhases = (phase.project?.phases ?? []).filter((p: any) => p.id !== phaseId);
  const canStart = phase.status === "DRAFT" || phase.status === "ACTIVE";
  const canStop = phase.status === "ACTIVE";
  const now = new Date();

  // Gantt data
  type GanttColumn = { label: string; leftPct: number; widthPct: number };
  let ganttData: null | { phaseStart: Date; phaseEnd: Date; phaseDurationMs: number; columns: GanttColumn[] } = null;
  if (phase.startDate && phase.endDate) {
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);
    const phaseDurationMs = phaseEnd.getTime() - phaseStart.getTime();
    const phaseDays = phaseDurationMs / 86400000;
    const columns: GanttColumn[] = [];
    if (phaseDays <= 42) {
      const startMonday = new Date(phaseStart);
      startMonday.setDate(startMonday.getDate() - ((startMonday.getDay() + 6) % 7));
      let cur = new Date(startMonday);
      while (cur.getTime() <= phaseEnd.getTime()) {
        const wStart = new Date(Math.max(cur.getTime(), phaseStart.getTime()));
        const wEnd = new Date(Math.min(cur.getTime() + 6 * 86400000, phaseEnd.getTime()));
        if (wStart <= wEnd) {
          const lp = Math.max(0, ((wStart.getTime() - phaseStart.getTime()) / phaseDurationMs) * 100);
          const wp = ((wEnd.getTime() - wStart.getTime() + 86400000) / phaseDurationMs) * 100;
          columns.push({ label: wStart.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }), leftPct: lp, widthPct: Math.min(wp, 100 - lp) });
        }
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      let cur = new Date(phaseStart.getFullYear(), phaseStart.getMonth(), 1);
      while (cur.getTime() <= phaseEnd.getTime()) {
        const mStart = new Date(Math.max(cur.getTime(), phaseStart.getTime()));
        const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        const mEnd = new Date(Math.min(nextMonth.getTime() - 86400000, phaseEnd.getTime()));
        if (mStart <= mEnd) {
          const lp = Math.max(0, ((mStart.getTime() - phaseStart.getTime()) / phaseDurationMs) * 100);
          const wp = ((mEnd.getTime() - mStart.getTime() + 86400000) / phaseDurationMs) * 100;
          columns.push({ label: cur.toLocaleDateString("nl-NL", { month: "short" }), leftPct: lp, widthPct: Math.min(wp, 100 - lp) });
        }
        cur = nextMonth;
      }
    }
    ganttData = { phaseStart, phaseEnd, phaseDurationMs, columns };
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4 flex-wrap">
        <Link href="/projects" className="hover:text-slate-600 shrink-0">Projecten</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-slate-600 min-w-0 truncate max-w-[140px] sm:max-w-none">{phase.project.name}</Link>
        <span>/</span>
        <span className="text-slate-700 truncate max-w-[140px] sm:max-w-none">{phase.title ? `${phase.name} — ${phase.title}` : phase.name}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary-700 font-bold text-sm">{phase.name}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{PHASE_DESCRIPTIONS[phase.name]}{phase.title ? ` — ${phase.title}` : ""}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`badge ${STATUS_COLORS[phase.status]}`}>{PHASE_STATUS_LABELS[phase.status] ?? phase.status}</span>
                <button
                  onClick={() => {
                    setPhaseDatesForm({
                      startDate: phase.startDate ? new Date(phase.startDate).toISOString().split("T")[0] : todayISO(),
                      endDate: phase.endDate ? new Date(phase.endDate).toISOString().split("T")[0] : daysFromNowISO(30),
                    });
                    setShowPhaseDates(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 group"
                >
                  {(phase.startDate || phase.endDate) ? (
                    <>
                      {phase.startDate && new Date(phase.startDate).toLocaleDateString("nl-NL")}
                      {phase.startDate && phase.endDate && " → "}
                      {phase.endDate && new Date(phase.endDate).toLocaleDateString("nl-NL")}
                    </>
                  ) : (
                    <span className="text-slate-400">Datums instellen</span>
                  )}
                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-start">
          {/* Fase lifecycle knoppen */}
          {canStart && (
            <button
              onClick={() => setConfirmStartPhase(true)}
              className="btn-primary flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fase starten
            </button>
          )}
          {canStop && (
            <button
              onClick={() => setConfirmStopPhase(true)}
              className="btn-secondary flex items-center gap-2 text-sm text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Fase stoppen
            </button>
          )}
          {isGAT && hasFATPhase && (
            <button onClick={openOverneemFAT} className="btn-secondary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              Flows overnemen van FAT
            </button>
          )}
          {allTemplateVersions.length > 0 && (
            <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
              Template importeren
            </button>
          )}
          <button onClick={() => setShowNewFlow(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nieuwe flow
          </button>
        </div>
      </div>

      {/* Resultaatmelding na fase start/stop */}
      {phaseActionResult && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center justify-between">
          <span>{phaseActionResult}</span>
          <button onClick={() => setPhaseActionResult(null)} className="text-emerald-600 hover:text-emerald-800 ml-4">✕</button>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        className="mb-6"
        active={activeTab}
        onChange={(id) => setActiveTab(id as "flows" | "monitor")}
        tabs={[
          { id: "flows", label: "Flows", count: phase.flows.length },
          {
            id: "monitor",
            label: monitorData?.stats?.totalStale > 0 ? `Monitoring · ${monitorData.stats.totalStale} verlopen` : "Monitoring",
            count: monitorData?.stats?.totalOpen || undefined,
          },
        ]}
      />

      {/* ── FLOWS TAB ── */}
      {activeTab === "flows" && ganttData && phase.flows.length > 0 && (
        <div className="card mb-4 overflow-hidden">
          <div className="overflow-x-auto">
          {/* Column header row */}
          <div className="flex border-b border-slate-100 bg-slate-50 min-w-[480px]">
            <div className="w-44 shrink-0 px-4 py-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Balkenplanning</span>
            </div>
            <div className="flex-1 relative h-8 overflow-hidden">
              {ganttData.columns.map((col, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center justify-center border-l border-slate-200 first:border-l-0"
                  style={{ left: `${col.leftPct}%`, width: `${col.widthPct}%` }}
                >
                  <span className="text-xs text-slate-400 font-medium truncate px-1">{col.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Flow rows */}
          <div className="min-w-[480px]">
          {phase.flows.map((flow: any) => {
            const isClosed = flow.status === "CLOSED";
            const hasStart = !!flow.scheduledStart;
            const hasEnd = !!flow.scheduledEnd;
            let barLeft = 0;
            let barWidth = 0;
            if (hasStart || hasEnd) {
              const fStart = hasStart
                ? Math.max(new Date(flow.scheduledStart).getTime(), ganttData!.phaseStart.getTime())
                : ganttData!.phaseStart.getTime();
              const fEnd = hasEnd
                ? Math.min(new Date(flow.scheduledEnd).getTime(), ganttData!.phaseEnd.getTime())
                : ganttData!.phaseEnd.getTime();
              barLeft = Math.max(0, ((fStart - ganttData!.phaseStart.getTime()) / ganttData!.phaseDurationMs) * 100);
              barWidth = Math.max(1.5, ((fEnd - fStart) / ganttData!.phaseDurationMs) * 100);
            }
            const hasSchedule = hasStart || hasEnd;
            return (
              <Link key={flow.id} href={`/flows/${flow.id}`} className="flex items-center border-b border-slate-50 last:border-0 hover:bg-primary-50/40 transition-colors group">
                <div className="w-44 shrink-0 px-4 py-2.5 flex items-center gap-1.5">
                  <span className={`text-sm font-medium truncate block ${isClosed ? "text-slate-400" : "text-slate-700 group-hover:text-primary-700"} transition-colors`}>
                    {flow.name}
                  </span>
                  <svg className="w-3 h-3 text-slate-300 group-hover:text-primary-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex-1 px-4 py-2.5">
                  <div className="relative h-6 rounded-full overflow-hidden bg-primary-50">
                    {ganttData!.columns.map((col, i) => i > 0 && (
                      <div key={i} className="absolute top-0 h-full w-px bg-white" style={{ left: `${col.leftPct}%` }} />
                    ))}
                    {hasSchedule && (
                      <div
                        className={`absolute top-0 h-full rounded-full transition-opacity group-hover:opacity-80 ${isClosed ? "bg-slate-300" : "bg-primary-500"}`}
                        style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                      />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          </div>
          </div>
        </div>
      )}

      {activeTab === "flows" && (
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
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{flow.name}</h3>
                        {latestVersion && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{latestVersion.version}</span>}
                        {isClosed && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Afgesloten</span>}
                        {flow.sourceTemplateVersionId && (
                          <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">Van template</span>
                        )}
                        {flow.sourceFlowVersionId && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Overgenomen</span>
                        )}
                        {flow.moduleKey && (
                          <span className="text-xs text-forest-700 bg-forest-50 border border-forest-100 px-2 py-0.5 rounded">{getSubmoduleLabel(flow.moduleKey)}</span>
                        )}
                      </div>
                      {flow.description && <p className="text-sm text-slate-500 mb-2">{flow.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>{latestVersion?._count?.steps ?? 0} stappen</span>
                        <span>{latestVersion?._count?.runs ?? 0} runs</span>
                        <span className="hidden sm:inline">Bijgewerkt {formatDate(flow.updatedAt)}</span>
                        {(flow.scheduledStart || flow.scheduledEnd) && (
                          <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                            {flow.scheduledStart && new Date(flow.scheduledStart).toLocaleDateString("nl-NL")}
                            {flow.scheduledStart && flow.scheduledEnd && " → "}
                            {flow.scheduledEnd && new Date(flow.scheduledEnd).toLocaleDateString("nl-NL")}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Icon-only actions (always visible) */}
                    <div className="flex gap-1 items-center shrink-0">
                      <button
                        onClick={() => {
                          setShowFlowDates({ flow });
                          setFlowDatesForm({
                            scheduledStart: flow.scheduledStart ? new Date(flow.scheduledStart).toISOString().split("T")[0] : todayISO(),
                            scheduledEnd: flow.scheduledEnd ? new Date(flow.scheduledEnd).toISOString().split("T")[0] : daysFromNowISO(14),
                          });
                        }}
                        title="Planning instellen"
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setShowCopy({ flow }); setCopyForm({ name: `${flow.name} (kopie)`, targetPhaseId: "", moduleKey: flow.moduleKey || "" }); }}
                        title="Flow kopiëren"
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
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
                  {/* Primary action buttons below on all screens */}
                  {(!isClosed) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {latestVersion && (
                        <Link href={`/runs/new?versionId=${latestVersion.id}&flowName=${encodeURIComponent(flow.name)}`} className="btn-secondary text-sm">
                          Run starten
                        </Link>
                      )}
                      <Link href={`/flows/${flow.id}`} className="btn-primary text-sm">
                        Bewerken
                      </Link>
                    </div>
                  )}
                </div>
                {latestVersion?.runs && latestVersion.runs.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-3 flex gap-4">
                    {latestVersion.runs.slice(0, 3).map((run: any) => (
                      <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center gap-2 text-xs hover:text-primary-600">
                        <span className={`badge ${STATUS_COLORS[run.status]}`}>{RUN_STATUS_LABELS[run.status] ?? run.status}</span>
                        <span className="text-slate-500">{run.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MONITOR TAB ── */}
      {activeTab === "monitor" && (
        <div>
          {loadingMonitor ? (
            <div className="text-slate-400 text-sm p-8 text-center">Laden...</div>
          ) : !monitorData ? (
            <div className="text-slate-400 text-sm p-8 text-center">Geen monitoringdata beschikbaar.</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{monitorData.stats.totalOpen}</div>
                  <div className="text-xs text-slate-500 mt-1">Uitstaande taken</div>
                </div>
                <div className="card p-4 text-center">
                  <div className={`text-2xl font-bold ${monitorData.stats.totalStale > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {monitorData.stats.totalStale}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Verlopen (&gt;48u)</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600">{monitorData.stats.activeRuns}</div>
                  <div className="text-xs text-slate-500 mt-1">Actieve runs</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">
                    {monitorData.stats.totalSteps > 0
                      ? `${Math.round((monitorData.stats.doneSteps / monitorData.stats.totalSteps) * 100)}%`
                      : "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Voortgang ({monitorData.stats.doneSteps}/{monitorData.stats.totalSteps} stappen)</div>
                </div>
              </div>

              {/* Taken per persoon */}
              {monitorData.userOverview.length === 0 ? (
                <div className="card p-8 text-center text-slate-400 text-sm">Geen uitstaande taken voor actieve testers.</div>
              ) : (
                <div className="space-y-4">
                  <h2 className="font-semibold text-slate-900">Taken per persoon</h2>
                  {monitorData.userOverview.map((entry: any) => (
                    <div key={entry.user.id} className="card">
                      <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-primary-700 font-bold text-sm">{entry.user.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{entry.user.name}</div>
                            <div className="text-xs text-slate-400 flex gap-3">
                              <span>{entry.activeTasks.length + entry.staleTasks.length} uitstaand</span>
                              {entry.staleTasks.length > 0 && <span className="text-amber-600 font-medium">{entry.staleTasks.length} verlopen</span>}
                              {entry.upcomingStepCount > 0 && <span className="text-slate-400">{entry.upcomingStepCount} aankomend</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {[...entry.staleTasks, ...entry.activeTasks].map((task: any) => {
                          const ageHours = Math.round((now.getTime() - new Date(task.createdAt).getTime()) / 1000 / 3600);
                          const isStale = ageHours > 48;
                          const flowName = task.runStep?.run?.flowVersion?.flow?.name;
                          return (
                            <div key={task.id} className={`flex items-center justify-between px-4 py-3 ${isStale ? "bg-amber-50/50" : ""}`}>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${isStale ? "text-amber-800" : "text-slate-800"}`}>
                                  {task.runStep?.title ?? task.title}
                                </div>
                                {flowName && <div className="text-xs text-slate-400 mt-0.5">{flowName}</div>}
                              </div>
                              <div className="flex items-center gap-2 ml-3 shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded ${isStale ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                                  {ageHours < 1 ? "<1u" : `${ageHours}u`}
                                </span>
                                {/* Hertoewijzen */}
                                <button
                                  onClick={() => { setReassignTask({ taskId: task.id, taskTitle: task.runStep?.title ?? task.title }); setReassignUserId(""); }}
                                  className="text-xs text-primary-600 hover:underline"
                                >
                                  Hertoewijzen
                                </button>
                                {/* Stap doorklikken */}
                                {task.runStep && (
                                  <button
                                    onClick={() => { setAdvanceStep({ stepId: task.runStep.id, stepTitle: task.runStep.title }); setAdvanceStatus("PASSED"); setAdvanceNotes(""); }}
                                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                                  >
                                    Doorklikken
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actieve runs overzicht */}
              {monitorData.runs.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-semibold text-slate-900 mb-4">Runs in deze fase</h2>
                  <div className="space-y-3">
                    {monitorData.runs.map((run: any) => {
                      const doneSteps = run.steps.filter((s: any) => ["PASSED", "FAILED", "BLOCKED"].includes(s.status)).length;
                      const pct = run.steps.length > 0 ? Math.round((doneSteps / run.steps.length) * 100) : 0;
                      return (
                        <div key={run.id} className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-slate-900 text-sm">{run.name}</span>
                              <span className="ml-2 text-xs text-slate-400">{run.flowVersion?.flow?.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`badge ${STATUS_COLORS[run.status]}`}>{RUN_STATUS_LABELS[run.status] ?? run.status}</span>
                              <Link href={`/runs/${run.id}`} className="text-xs text-primary-600 hover:underline">Openen →</Link>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{doneSteps}/{run.steps.length}</span>
                          </div>
                          {/* Stappen die uitstaan */}
                          {run.steps.filter((s: any) => s.status === "PENDING" && s.tasks.length > 0).slice(0, 3).map((step: any) => (
                            <div key={step.id} className="flex items-center justify-between mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                              <span className="truncate max-w-[300px]">{step.title}</span>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span>{step.tasks.map((t: any) => t.user.name).join(", ")}</span>
                                <button
                                  onClick={() => { setAdvanceStep({ stepId: step.id, stepTitle: step.title }); setAdvanceStatus("PASSED"); setAdvanceNotes(""); }}
                                  className="text-primary-600 hover:underline"
                                >
                                  Doorklikken
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Fase starten bevestiging */}
      {confirmStartPhase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-2">Fase starten</h2>
            <p className="text-slate-500 text-sm mb-4">
              Dit maakt automatisch testruns aan voor alle actieve flows en verstuurt taken naar de toegewezen testers. Flows zonder stappen of toegewezen personen worden overgeslagen.
            </p>
            <div className="flex gap-3">
              <button onClick={startPhase} disabled={savingPhase} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                {savingPhase ? "Starten..." : "Fase starten"}
              </button>
              <button onClick={() => setConfirmStartPhase(false)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Fase stoppen bevestiging */}
      {confirmStopPhase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-2">Fase stoppen</h2>
            <p className="text-slate-500 text-sm mb-4">
              Alle openstaande testtaken worden verwijderd bij de testers. De runs blijven bestaan voor rapportage. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3">
              <button onClick={stopPhase} disabled={savingPhase} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-1">
                {savingPhase ? "Stoppen..." : "Fase stoppen"}
              </button>
              <button onClick={() => setConfirmStopPhase(false)} className="btn-secondary flex-1">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Hertoewijzen modal */}
      {reassignTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-1">Taak hertoewijzen</h2>
            <p className="text-slate-500 text-sm mb-4 truncate">{reassignTask.taskTitle}</p>
            <form onSubmit={doReassign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Toewijzen aan *</label>
                <select className="input" value={reassignUserId} onChange={e => setReassignUserId(e.target.value)} required>
                  <option value="">Selecteer persoon...</option>
                  {tenantUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.roles?.join(", ")})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingReassign} className="btn-primary flex-1">{savingReassign ? "Opslaan..." : "Hertoewijzen"}</button>
                <button type="button" onClick={() => setReassignTask(null)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stap doorklikken modal */}
      {advanceStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-1">Stap handmatig doorklikken</h2>
            <p className="text-slate-500 text-sm mb-4 truncate">{advanceStep.stepTitle}</p>
            <form onSubmit={doAdvance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="input" value={advanceStatus} onChange={e => setAdvanceStatus(e.target.value as any)}>
                  <option value="PASSED">Geslaagd</option>
                  <option value="FAILED">Gefaald</option>
                  <option value="BLOCKED">Geblokkeerd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notitie <span className="text-slate-400 font-normal">(optioneel)</span></label>
                <textarea className="input resize-none" rows={2} value={advanceNotes} onChange={e => setAdvanceNotes(e.target.value)} placeholder="Reden voor handmatig doorklikken..." />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingAdvance} className="btn-primary flex-1">{savingAdvance ? "Opslaan..." : "Doorklikken"}</button>
                <button type="button" onClick={() => setAdvanceStep(null)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div>
                <label className="block text-sm font-medium mb-1">Subonderdeel</label>
                <SubmoduleSelect value={form.moduleKey} onChange={(v) => setForm({ ...form, moduleKey: v })} allowed={allowedSubmodules} />
                <p className="text-xs text-slate-400 mt-1">Koppel de flow aan een subonderdeel voor het overzicht per onderdeel.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Aanmaken..." : "Aanmaken"}</button>
                <button type="button" onClick={() => setShowNewFlow(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fase datums modal */}
      {showPhaseDates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-1">Fase planning</h2>
            <p className="text-slate-500 text-sm mb-4">Stel de looptijd van de fase in. Dit bepaalt de schaal van de balkenplanning.</p>
            <form onSubmit={savePhaseDates} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input type="date" className="input" value={phaseDatesForm.startDate} onChange={e => setPhaseDatesForm({ ...phaseDatesForm, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Einddatum</label>
                <input type="date" className="input" value={phaseDatesForm.endDate} onChange={e => setPhaseDatesForm({ ...phaseDatesForm, endDate: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Opslaan"}</button>
                <button type="button" onClick={() => setShowPhaseDates(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flow planning modal */}
      {showFlowDates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-1">Flow planning</h2>
            <p className="text-slate-500 text-sm mb-4">{showFlowDates.flow.name}</p>
            <form onSubmit={saveFlowDates} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Geplande startdatum</label>
                <input type="date" className="input" value={flowDatesForm.scheduledStart} onChange={e => setFlowDatesForm({...flowDatesForm, scheduledStart: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Geplande einddatum</label>
                <input type="date" className="input" value={flowDatesForm.scheduledEnd} onChange={e => setFlowDatesForm({...flowDatesForm, scheduledEnd: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Opslaan"}</button>
                <button type="button" onClick={() => setShowFlowDates(null)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template importeren modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-1">Template importeren als flow</h2>
            <p className="text-sm text-slate-500 mb-4">
              Je ziet de templates die horen bij de modules die bij de onboarding gekozen zijn. Er wordt steeds de nieuwste versie ingelezen als een nieuwe flow; bestaande flows blijven ongewijzigd.
            </p>
            <form onSubmit={importTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Flow naam *</label>
                <input className="input" value={importForm.name} onChange={e => setImportForm({...importForm, name: e.target.value})} required placeholder="HR Instroom FAT" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Template versie *</label>
                <select className="input" value={importForm.templateVersionId} onChange={e => {
                  const v = allTemplateVersions.find((x: any) => x.id === e.target.value);
                  setImportForm({ ...importForm, templateVersionId: e.target.value, moduleKey: importForm.moduleKey || v?.moduleKeys?.[0] || "" });
                }} required>
                  <option value="">Selecteer template...</option>
                  {allTemplateVersions.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.templateName} — {v.version} ({v.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subonderdeel</label>
                <SubmoduleSelect value={importForm.moduleKey} onChange={(v) => setImportForm({ ...importForm, moduleKey: v })} allowed={allowedSubmodules} />
                <p className="text-xs text-slate-400 mt-1">Standaard overgenomen van de template; je kunt dit aanpassen.</p>
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
              <div>
                <label className="block text-sm font-medium mb-1">Subonderdeel</label>
                <SubmoduleSelect value={copyForm.moduleKey} onChange={(v) => setCopyForm({ ...copyForm, moduleKey: v })} allowed={allowedSubmodules} />
              </div>
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
    </div>
  );
}
