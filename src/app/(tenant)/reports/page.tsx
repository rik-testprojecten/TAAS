"use client";
import { useState, useEffect } from "react";
import { HelpButton } from "@/components/HelpButton";
import { CardGridSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

const PHASE_LABELS: Record<string, string> = {
  FAT: "Functionele Acceptatietest",
  GAT: "Gebruikers Acceptatietest",
  PAT: "Productie Acceptatietest",
};

export default function ReportsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<import("@/types").Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(Array.isArray(d) ? d : []);
      })
      .catch(() => toast.error("Projecten konden niet worden geladen"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function generateReport(type: string, entityId: string, entityName: string) {
    const key = `${type}-${entityId}`;
    setGenerating(key);
    setError(null);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, entityId, entityName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Fout bij genereren rapport");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match?.[1] || `rapport-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Netwerkfout bij genereren rapport");
    } finally {
      setGenerating(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Rapportages</h1>
          <p className="text-slate-500 text-sm mt-1">Genereer professionele PDF-rapportages voor stuurgroep en oplevering</p>
        </header>
        <CardGridSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rapportages</h1>
        <p className="text-slate-500 text-sm mt-1">
          Genereer professionele PDF-rapportages voor stuurgroep en oplevering
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong>Fout:</strong> {error}
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          Geen projecten beschikbaar
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="card overflow-hidden">
              {/* Project header */}
              <div className="px-4 py-3 md:px-6 md:py-4 bg-forest-700 text-white flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-base">{project.name}</h2>
                <button
                  onClick={() => generateReport("ISSUE_LOG", project.id, project.name)}
                  disabled={generating === `ISSUE_LOG-${project.id}`}
                  className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {generating === `ISSUE_LOG-${project.id}` ? "Genereren..." : "Issue Log PDF"}
                </button>
              </div>

              {/* Phase rows */}
              {!project.phases || project.phases.length === 0 ? (
                <div className="px-6 py-4 text-sm text-slate-400">Geen fases aangemaakt</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {project.phases?.map((phase) => (
                    <div key={phase.id} className="px-4 py-4 md:px-6 md:py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        {/* Phase info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 text-sm">{phase.name}</span>
                            {phase.title && (
                              <span className="text-xs text-slate-500">— {phase.title}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{PHASE_LABELS[phase.name] || phase.name}</p>
                        </div>

                        {/* Report buttons */}
                        <div className="flex flex-wrap gap-2">
                          {/* Voortgangsrapport */}
                          <button
                            onClick={() => generateReport("VOORTGANGSRAPPORT", phase.id, `${project.name} — ${phase.name}`)}
                            disabled={!!generating}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 transition-colors disabled:opacity-50"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
                              {generating === `VOORTGANGSRAPPORT-${phase.id}` ? (
                                <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              )}
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-semibold text-primary-800 leading-none mb-0.5">
                                {generating === `VOORTGANGSRAPPORT-${phase.id}` ? "Genereren..." : "Voortgangsrapport"}
                              </div>
                              <div className="text-xs text-primary-600 leading-none">Stuurgroep update</div>
                            </div>
                          </button>

                          {/* Opleververslag */}
                          <button
                            onClick={() => generateReport("OPLEVERVERSLAG", phase.id, `${project.name} — ${phase.name}`)}
                            disabled={!!generating}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-forest-200 bg-forest-50 hover:bg-forest-100 transition-colors disabled:opacity-50"
                          >
                            <div className="w-7 h-7 rounded-lg bg-forest-700 flex items-center justify-center shrink-0">
                              {generating === `OPLEVERVERSLAG-${phase.id}` ? (
                                <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-semibold text-forest-800 leading-none mb-0.5">
                                {generating === `OPLEVERVERSLAG-${phase.id}` ? "Genereren..." : "Opleververslag"}
                              </div>
                              <div className="text-xs text-forest-600 leading-none">Formeel akkoord</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Report type descriptions */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                          <strong className="text-slate-600">Voortgangsrapport</strong> — KPIs, testvoortgang per flow, openstaande bevindingen, go-live criteria. Geschikt voor tussentijdse stuurgroepupdate.
                        </div>
                        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                          <strong className="text-slate-600">Opleververslag</strong> — Volledige testresultaten per stap, alle bevindingen met details, go/no-go beoordeling en handtekeningpagina. Audit-proof eindrapportage.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-forest-50 border border-forest-200 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-forest-700">
            <strong>Audit-proof rapportage:</strong> Alle PDF-bestanden bevatten organisatienaam, logo, uitvoerder per stap, bevindingen-log met statushistorie, go-live criteria en een akkoordpagina. Rapporten worden gegenereerd op basis van de actuele data op het moment van aanmaken.
          </div>
        </div>
      </div>

      <HelpButton pageKey="reports" />
    </div>
  );
}
