"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";
import { Field, SelectField } from "@/components/Field";
import { useToast } from "@/components/Toast";

const IMPACTS = [
  { key: "CRITICAL", label: "Kritiek", color: "text-red-700 bg-red-50 border-red-200" },
  { key: "HIGH", label: "Hoog", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { key: "MEDIUM", label: "Middel", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { key: "LOW", label: "Laag", color: "text-green-700 bg-green-50 border-green-200" },
] as const;

export default function GoLivePage() {
  const toast = useToast();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [data, setData] = useState<{ criteria: any; counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    goLiveDate: "",
    goNoGoDate: "",
    maxCritical: "",
    maxHigh: "",
    maxMedium: "",
    maxLow: "",
  });

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setProjects(list);
        if (list.length > 0) setSelectedProject(list[0].id);
      })
      .catch(() => toast.error("Projecten konden niet worden geladen"));
  }, [toast]);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetch(`/api/go-live?projectId=${selectedProject}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.criteria) {
          setForm({
            goLiveDate: d.criteria.goLiveDate ? d.criteria.goLiveDate.slice(0, 10) : "",
            goNoGoDate: d.criteria.goNoGoDate ? d.criteria.goNoGoDate.slice(0, 10) : "",
            maxCritical: d.criteria.maxCritical?.toString() ?? "",
            maxHigh: d.criteria.maxHigh?.toString() ?? "",
            maxMedium: d.criteria.maxMedium?.toString() ?? "",
            maxLow: d.criteria.maxLow?.toString() ?? "",
          });
        } else {
          setForm({ goLiveDate: "", goNoGoDate: "", maxCritical: "", maxHigh: "", maxMedium: "", maxLow: "" });
        }
        setLoading(false);
      });
  }, [selectedProject]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/go-live", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          goLiveDate: form.goLiveDate || null,
          goNoGoDate: form.goNoGoDate || null,
          maxCritical: form.maxCritical !== "" ? parseInt(form.maxCritical) : null,
          maxHigh: form.maxHigh !== "" ? parseInt(form.maxHigh) : null,
          maxMedium: form.maxMedium !== "" ? parseInt(form.maxMedium) : null,
          maxLow: form.maxLow !== "" ? parseInt(form.maxLow) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Go-live criteria opgeslagen");
      // Refresh counts
      const r = await fetch(`/api/go-live?projectId=${selectedProject}`);
      setData(await r.json());
    } catch {
      toast.error("Opslaan mislukt — probeer het opnieuw");
    } finally {
      setSaving(false);
    }
  }

  const maxMap: Record<string, number | null> = {
    CRITICAL: form.maxCritical !== "" ? parseInt(form.maxCritical) : null,
    HIGH: form.maxHigh !== "" ? parseInt(form.maxHigh) : null,
    MEDIUM: form.maxMedium !== "" ? parseInt(form.maxMedium) : null,
    LOW: form.maxLow !== "" ? parseInt(form.maxLow) : null,
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Go-live Criteria</h1>
        <p className="text-slate-500 text-sm mt-1">Stel per project de go-live- en go/no-go-datum in en het maximale aantal openstaande bevindingen per impact.</p>
      </header>

      {/* Project selector */}
      <div className="card p-4 mb-6">
        <SelectField
          label="Project"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </SelectField>
      </div>

      {loading ? (
        <div className="card p-6 space-y-4" aria-busy="true" aria-label="Criteria laden">
          <div className="skeleton h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="skeleton h-10" /><div className="skeleton h-10" />
            <div className="skeleton h-10" /><div className="skeleton h-10" />
          </div>
        </div>
      ) : (
        <>
          {/* Criteria form */}
          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-4">Datums</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Field
                label="Go-live datum"
                type="date"
                value={form.goLiveDate}
                onChange={(e) => setForm({ ...form, goLiveDate: e.target.value })}
              />
              <Field
                label="Go/no-go datum"
                type="date"
                value={form.goNoGoDate}
                onChange={(e) => setForm({ ...form, goNoGoDate: e.target.value })}
                hint="Op deze datum wordt getoetst of go-live verantwoord is"
              />
            </div>

            <h2 className="font-semibold text-slate-900 mb-3">Max. openstaande bevindingen op go/no-go datum</h2>
            <p className="text-xs text-slate-500 mb-4">Laat een veld leeg voor onbeperkt (∞). Vul 0 in voor nul toegestaan.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {IMPACTS.map(({ key, label }) => (
                <Field
                  key={key}
                  label={`Impact: ${label}`}
                  type="number"
                  min={0}
                  placeholder="∞ (onbeperkt)"
                  value={key === "CRITICAL" ? form.maxCritical : key === "HIGH" ? form.maxHigh : key === "MEDIUM" ? form.maxMedium : form.maxLow}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({
                      ...form,
                      ...(key === "CRITICAL" ? { maxCritical: v } : {}),
                      ...(key === "HIGH" ? { maxHigh: v } : {}),
                      ...(key === "MEDIUM" ? { maxMedium: v } : {}),
                      ...(key === "LOW" ? { maxLow: v } : {}),
                    });
                  }}
                />
              ))}
            </div>

            <button onClick={save} disabled={saving || !selectedProject} className="btn-primary">
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>

          {/* Real-time monitoring */}
          {data && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-1">Real-time status</h2>
              <p className="text-xs text-slate-500 mb-4">Huidig aantal openstaande bevindingen (niet opgelost, niet afgewezen, niet ingetrokken)</p>

              {(form.goLiveDate || form.goNoGoDate) && (
                <div className="flex gap-6 mb-4 text-sm">
                  {form.goNoGoDate && (
                    <div>
                      <span className="font-medium text-slate-600">Go/no-go: </span>
                      <span className="text-slate-800">{formatDate(form.goNoGoDate)}</span>
                    </div>
                  )}
                  {form.goLiveDate && (
                    <div>
                      <span className="font-medium text-slate-600">Go-live: </span>
                      <span className="text-slate-800">{formatDate(form.goLiveDate)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {IMPACTS.map(({ key, label, color }) => {
                  const count = data.counts[key] ?? 0;
                  const max = maxMap[key];
                  const overLimit = max !== null && count > max;
                  const atLimit = max !== null && count === max;
                  return (
                    <div key={key} className={`flex items-center justify-between p-3 rounded-xl border ${overLimit ? "bg-red-50 border-red-200" : atLimit ? "bg-yellow-50 border-yellow-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`badge border text-xs ${color}`}>{label}</span>
                        <span className="text-sm text-slate-700">
                          {count} openstaand
                          {max !== null ? ` / max ${max}` : " / onbeperkt"}
                        </span>
                      </div>
                      <div>
                        {overLimit && (
                          <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Overschreden
                          </span>
                        )}
                        {atLimit && !overLimit && (
                          <span className="text-xs font-semibold text-yellow-600">Op limiet</span>
                        )}
                        {!overLimit && !atLimit && max !== null && (
                          <span className="text-xs text-green-600 font-medium">OK</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall go/no-go verdict */}
              {Object.values(maxMap).some((v) => v !== null) && (
                <div className={`mt-4 p-4 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
                  IMPACTS.some(({ key }) => maxMap[key] !== null && (data.counts[key] ?? 0) > (maxMap[key] as number))
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}>
                  {IMPACTS.some(({ key }) => maxMap[key] !== null && (data.counts[key] ?? 0) > (maxMap[key] as number)) ? (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      NO-GO — Een of meer impactlimieten zijn overschreden
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      GO — Alle impactlimieten zijn binnen norm
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
      <HelpButton pageKey="go-live" />
    </div>
  );
}
