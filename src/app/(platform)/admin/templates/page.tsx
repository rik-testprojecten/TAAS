"use client";
import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";

type SubCategory = { id: string; name: string; slug: string };
type MainCategory = { id: string; name: string; slug: string; subCategories: SubCategory[] };
type Template = {
  id: string; name: string; description?: string; isActive: boolean; createdAt: string; updatedAt: string;
  versions?: { version: string; changelog?: string; createdAt: string }[];
  mainCategory?: { id: string; name: string; slug: string } | null;
  subCategory?: { id: string; name: string; slug: string } | null;
};

const PAGE_SIZE = 25;

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<MainCategory[]>([]);

  const [showNew, setShowNew] = useState(false);
  const [showVersionFor, setShowVersionFor] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", mainCategoryId: "", subCategoryId: "", description: "" });
  const [versionForm, setVersionForm] = useState({ version: "v1.0", changelog: "", steps: [{ order: 1, title: "", instruction: "", expectedResult: "" }] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/templates?page=${p}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`Server gaf status ${res.status}`);
      const data = await res.json();
      setTemplates(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden mislukt");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/platform/template-categories")
      .then(r => (r.ok ? r.json() : []))
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  const selectedMain = categories.find(c => c.id === form.mainCategoryId);
  const subOptions = selectedMain?.subCategories ?? [];

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, string> = { name: form.name, description: form.description };
    if (form.mainCategoryId) body.mainCategoryId = form.mainCategoryId;
    if (form.subCategoryId) body.subCategoryId = form.subCategoryId;
    const res = await fetch("/api/platform/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { setShowNew(false); setForm({ name: "", mainCategoryId: "", subCategoryId: "", description: "" }); load(1); setPage(1); }
    setSaving(false);
  }

  async function createVersion(templateId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/platform/templates/${templateId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...versionForm, steps: versionForm.steps.filter(s => s.title && s.instruction) }),
    });
    if (res.ok) { setShowVersionFor(null); load(); }
    setSaving(false);
  }

  function addStep() {
    setVersionForm(prev => ({ ...prev, steps: [...prev.steps, { order: prev.steps.length + 1, title: "", instruction: "", expectedResult: "" }] }));
  }

  function updateStep(index: number, field: string, value: string) {
    setVersionForm(prev => ({ ...prev, steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s) }));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    load(p);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? "Laden..." : `${total} template${total !== 1 ? "s" : ""} totaal`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nieuw template
        </button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Nieuw template</h2>
            <form onSubmit={createTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="HR Instroom" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hoofdcategorie</label>
                <select
                  className="input"
                  value={form.mainCategoryId}
                  onChange={e => setForm({ ...form, mainCategoryId: e.target.value, subCategoryId: "" })}
                >
                  <option value="">— Geen —</option>
                  {categories.filter(c => c.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {subOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategorie</label>
                  <select
                    className="input"
                    value={form.subCategoryId}
                    onChange={e => setForm({ ...form, subCategoryId: e.target.value })}
                  >
                    <option value="">— Geen —</option>
                    {subOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Beschrijving</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Aanmaken..." : "Aanmaken"}</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVersionFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-4">
            <h2 className="font-semibold text-lg mb-4">Versie toevoegen</h2>
            <form onSubmit={(e) => createVersion(showVersionFor, e)} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Versie *</label>
                  <input className="input" value={versionForm.version} onChange={e => setVersionForm({ ...versionForm, version: e.target.value })} required placeholder="v1.0" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Changelog</label>
                  <input className="input" value={versionForm.changelog} onChange={e => setVersionForm({ ...versionForm, changelog: e.target.value })} placeholder="Wijzigingen..." />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Stappen</label>
                  <button type="button" onClick={addStep} className="text-xs text-primary-600 hover:text-primary-700">+ Stap toevoegen</button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {versionForm.steps.map((step, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-6">{i + 1}.</span>
                        <input className="input text-sm" placeholder="Stap titel *" value={step.title} onChange={e => updateStep(i, "title", e.target.value)} />
                      </div>
                      <textarea className="input text-sm resize-none" rows={2} placeholder="Instructie *" value={step.instruction} onChange={e => updateStep(i, "instruction", e.target.value)} />
                      <input className="input text-sm" placeholder="Verwacht resultaat" value={step.expectedResult} onChange={e => updateStep(i, "expectedResult", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Versie opslaan"}</button>
                <button type="button" onClick={() => setShowVersionFor(null)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="card p-8 text-center text-slate-400 text-sm">Laden...</div>
        ) : error ? (
          <div className="card p-8 text-center text-sm">
            <p className="text-red-600 font-medium">Templates konden niet geladen worden</p>
            <p className="text-slate-400 mt-1">{error}</p>
            <button onClick={() => load()} className="btn-secondary text-sm mt-4">Opnieuw proberen</button>
          </div>
        ) : templates.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-sm">Nog geen templates</div>
        ) : templates.map((t) => {
          const latestVersion = t.versions?.[0];
          return (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    {t.mainCategory && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{t.mainCategory.name}</span>
                    )}
                    {t.subCategory && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{t.subCategory.name}</span>
                    )}
                    {latestVersion && <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{latestVersion.version}</span>}
                  </div>
                  {t.description && <p className="text-sm text-slate-500 mb-1">{t.description}</p>}
                  <div className="text-xs text-slate-400">
                    {t.versions?.length ?? 0} versie{t.versions?.length !== 1 ? "s" : ""} · Aangemaakt {formatDate(t.createdAt)}
                    {latestVersion?.changelog && ` · ${latestVersion.changelog}`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowVersionFor(t.id);
                    setVersionForm({ version: `v${((t.versions?.length ?? 0) + 1)}.0`, changelog: "", steps: [{ order: 1, title: "", instruction: "", expectedResult: "" }] });
                  }}
                  className="btn-secondary text-sm ml-4 whitespace-nowrap"
                >
                  + Versie toevoegen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} van {total} templates
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              ← Vorige
            </button>
            <span className="text-sm text-slate-600">Pagina {page} van {totalPages}</span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Volgende →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
