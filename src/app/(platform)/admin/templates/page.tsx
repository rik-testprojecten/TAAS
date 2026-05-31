"use client";
import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { MODULES, getSubmoduleLabel } from "@/lib/modules";

type Template = {
  id: string; name: string; description?: string; isActive: boolean; createdAt: string; updatedAt: string;
  versions?: { version: string; changelog?: string; createdAt: string }[];
  moduleLinks?: { moduleKey: string }[];
};

const PAGE_SIZE = 25;

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [showVersionFor, setShowVersionFor] = useState<string | null>(null);
  const [editVersionId, setEditVersionId] = useState<string | null>(null);
  const [showModulesFor, setShowModulesFor] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", category: "ALG", description: "", isActive: true, moduleLinks: [] as string[] });
  const [versionForm, setVersionForm] = useState({ version: "v1.0", changelog: "", steps: [{ order: 1, title: "", instruction: "", expectedResult: "" }] });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

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

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = editTemplateId
      ? await fetch(`/api/platform/templates/${editTemplateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/platform/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
    if (res.ok) { setShowNew(false); setEditTemplateId(null); setForm({ name: "", category: "ALG", description: "", isActive: true, moduleLinks: [] }); load(); }
    setSaving(false);
  }

  function toggleModuleLink(links: string[], key: string): string[] {
    return links.includes(key) ? links.filter(k => k !== key) : [...links, key];
  }

  function openEditTemplate(t: any) {
    setEditTemplateId(t.id);
    setForm({
      name: t.name,
      category: t.category ?? "ALG",
      description: t.description ?? "",
      isActive: t.isActive ?? true,
      moduleLinks: (t.moduleLinks ?? []).map((l: any) => l.moduleKey),
    });
    setShowNew(true);
  }

  // Alle standaard AFAS-templates (per subonderdeel) laden/bijwerken.
  async function loadStandardTemplates() {
    setSeeding(true);
    const res = await fetch("/api/platform/templates/seed", { method: "POST" });
    if (res.ok) await load();
    setSeeding(false);
  }

  // Concept <-> gepubliceerd. Concept-templates ziet de klant niet.
  async function toggleActive(t: any) {
    await fetch(`/api/platform/templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    load();
  }

  async function createVersion(templateId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const cleanSteps = versionForm.steps.filter(s => s.title && s.instruction).map((s, i) => ({ ...s, order: i + 1 }));
    const res = editVersionId
      ? await fetch(`/api/platform/templates/${templateId}/versions/${editVersionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: versionForm.version, changelog: versionForm.changelog, steps: cleanSteps }),
        })
      : await fetch(`/api/platform/templates/${templateId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...versionForm, steps: cleanSteps }),
        });
    if (res.ok) { setShowVersionFor(null); setEditVersionId(null); load(); }
    setSaving(false);
  }

  // Onderhoud: laad de nieuwste versie inclusief stappen om te bewerken.
  async function openEditVersion(t: any) {
    const versionId = t.versions?.[0]?.id;
    if (!versionId) return;
    const res = await fetch(`/api/platform/templates/${t.id}/versions/${versionId}`);
    if (!res.ok) return;
    const v = await res.json();
    setEditVersionId(versionId);
    setVersionForm({
      version: v.version,
      changelog: v.changelog ?? "",
      steps: (v.steps ?? []).length > 0
        ? v.steps.map((s: any) => ({ order: s.order, title: s.title, instruction: s.instruction, expectedResult: s.expectedResult ?? "" }))
        : [{ order: 1, title: "", instruction: "", expectedResult: "" }],
    });
    setShowVersionFor(t.id);
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

  function openModules(t: any) {
    setShowModulesFor(t.id);
    setModuleForm((t.moduleLinks ?? []).map((l: any) => l.moduleKey));
  }

  function toggleModuleKey(key: string) {
    setModuleForm(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function toggleWholeModule(subKeys: string[], allSelected: boolean) {
    setModuleForm(prev => allSelected
      ? prev.filter(k => !subKeys.includes(k))
      : [...new Set([...prev, ...subKeys])]);
  }

  async function saveModules(e: React.FormEvent) {
    e.preventDefault();
    if (!showModulesFor) return;
    setSaving(true);
    const res = await fetch(`/api/platform/templates/${showModulesFor}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKeys: moduleForm }),
    });
    if (res.ok) { setShowModulesFor(null); setModuleForm([]); load(); }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? "Laden..." : `${total} template${total !== 1 ? "s" : ""} totaal`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={loadStandardTemplates} disabled={seeding} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {seeding ? "Laden..." : "Standaardtemplates laden"}
          </button>
          <button onClick={() => { setEditTemplateId(null); setForm({ name: "", category: "ALG", description: "", isActive: true }); setShowNew(true); }} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nieuw template
          </button>
        </div>
      </div>

      {/* ── New template modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">{editTemplateId ? "Template bewerken" : "Nieuw template"}</h2>
            <form onSubmit={createTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="HR Instroom" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categorie</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {MODULES.map(m => (
                    <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Beschrijving</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="input" value={form.isActive ? "1" : "0"} onChange={e => setForm({ ...form, isActive: e.target.value === "1" })}>
                  <option value="1">Gepubliceerd — zichtbaar voor klanten</option>
                  <option value="0">Concept — alleen zichtbaar voor super admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Module-koppelingen</label>
                <p className="text-xs text-slate-500 mb-2">Kies welke (sub)modules dit template activeren in de wizard.</p>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
                  {MODULES.map(mod => (
                    <div key={mod.key}>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                        <input type="checkbox" className="rounded" checked={form.moduleLinks.includes(mod.key)} onChange={() => setForm(f => ({...f, moduleLinks: toggleModuleLink(f.moduleLinks, mod.key)}))} />
                        {mod.emoji} {mod.label}
                      </label>
                      <div className="ml-5 grid grid-cols-2 gap-x-4">
                        {mod.submodules.map(sub => (
                          <label key={sub.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input type="checkbox" className="rounded" checked={form.moduleLinks.includes(sub.key)} onChange={() => setForm(f => ({...f, moduleLinks: toggleModuleLink(f.moduleLinks, sub.key)}))} />
                            {sub.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : (editTemplateId ? "Opslaan" : "Aanmaken")}</button>
                <button type="button" onClick={() => { setShowNew(false); setEditTemplateId(null); }} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inline category editor modal ── */}
      {editingCategory && (() => {
        const t = templates.find(t => t.id === editingCategory)!;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h2 className="font-semibold text-lg mb-1">Categorie wijzigen</h2>
              <p className="text-sm text-slate-500 mb-4">"{t.name}"</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Hoofdcategorie</label>
                  <select className="input" value={categoryForm.mainCategory} onChange={e => setCategoryForm({ mainCategory: e.target.value, subCategory: "" })}>
                    {MODULES.map(m => <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategorie</label>
                  <select className="input" value={categoryForm.subCategory} onChange={e => setCategoryForm(f => ({ ...f, subCategory: e.target.value }))}>
                    <option value="">— geen —</option>
                    {getSubmodules(categoryForm.mainCategory).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => saveCategory(editingCategory)} disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Opslaan"}</button>
                  <button onClick={() => setEditingCategory(null)} className="btn-secondary flex-1">Annuleren</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Version modal ── */}
      {showVersionFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-4">
            <h2 className="font-semibold text-lg mb-4">{editVersionId ? "Versie bewerken" : "Versie toevoegen"}</h2>
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
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : (editVersionId ? "Wijzigingen opslaan" : "Versie opslaan")}</button>
                <button type="button" onClick={() => { setShowVersionFor(null); setEditVersionId(null); }} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModulesFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-4">
            <h2 className="font-semibold text-lg mb-1">Onderdelen koppelen</h2>
            <p className="text-sm text-slate-500 mb-4">
              Bepaal bij welke modules en subonderdelen deze template hoort. Bij de onboarding en bij het later inlezen krijgen klanten alleen de templates te zien van de onderdelen die zij gekozen hebben. Zonder koppeling is de template algemeen beschikbaar.
            </p>
            <form onSubmit={saveModules}>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {MODULES.map((mod) => {
                  const subKeys = mod.submodules.map((s) => s.key);
                  const allSelected = subKeys.every((k) => moduleForm.includes(k));
                  const someSelected = subKeys.some((k) => moduleForm.includes(k));
                  return (
                    <div key={mod.key} className="border border-slate-200 rounded-lg p-3">
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                          onChange={() => toggleWholeModule(subKeys, allSelected)}
                          className="rounded"
                        />
                        <span className="text-lg">{mod.emoji}</span>
                        <span className="font-medium text-slate-800 text-sm">{mod.label}</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-7">
                        {mod.submodules.map((sub) => (
                          <label key={sub.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={moduleForm.includes(sub.key)}
                              onChange={() => toggleModuleKey(sub.key)}
                              className="rounded"
                            />
                            {sub.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : `Opslaan (${moduleForm.length} gekoppeld)`}</button>
                <button type="button" onClick={() => { setShowModulesFor(null); setModuleForm([]); }} className="btn-secondary flex-1">Annuleren</button>
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                    {t.isActive
                      ? <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Gepubliceerd</span>
                      : <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">Concept</span>}
                  </div>
                  {t.description && <p className="text-sm text-slate-500 mb-1">{t.description}</p>}
                  <div className="text-xs text-slate-400">
                    {t.versions?.length ?? 0} versie{t.versions?.length !== 1 ? "s" : ""} · Aangemaakt {formatDate(t.createdAt)}
                    {latestVersion?.changelog && ` · ${latestVersion.changelog}`}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {(t.moduleLinks ?? []).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Geen onderdelen gekoppeld — algemeen beschikbaar</span>
                    ) : (
                      (t.moduleLinks ?? []).map((l: any) => (
                        <span key={l.moduleKey} className="text-xs bg-forest-50 text-forest-700 border border-forest-100 px-2 py-0.5 rounded">
                          {getSubmoduleLabel(l.moduleKey)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:ml-4 shrink-0">
                  <button onClick={() => toggleActive(t)} className={`text-sm whitespace-nowrap px-3 py-1.5 rounded-lg border ${t.isActive ? "text-amber-700 border-amber-200 hover:bg-amber-50" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}>
                    {t.isActive ? "Naar concept" : "Publiceren"}
                  </button>
                  <button onClick={() => openEditTemplate(t)} className="btn-secondary text-sm whitespace-nowrap">
                    Bewerken
                  </button>
                  <button onClick={() => openModules(t)} className="btn-secondary text-sm whitespace-nowrap">
                    Onderdelen koppelen
                  </button>
                  {latestVersion && (
                    <button onClick={() => openEditVersion(t)} className="btn-secondary text-sm whitespace-nowrap">
                      Stappen bewerken
                    </button>
                  )}
                  <button onClick={() => { setEditVersionId(null); setShowVersionFor(t.id); setVersionForm({ version: `v${((t.versions?.length ?? 0) + 1)}.0`, changelog: "", steps: [{ order: 1, title: "", instruction: "", expectedResult: "" }] }); }} className="btn-secondary text-sm whitespace-nowrap">
                    + Versie toevoegen
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Templates with unknown main category */}
        {templates.filter(t => !MODULES.some(m => m.key === t.mainCategory)).length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 font-semibold text-slate-500 text-sm">Onbekende categorie</div>
            <div className="p-4 space-y-2">
              {templates.filter(t => !MODULES.some(m => m.key === t.mainCategory)).map(t => (
                <TemplateCard key={t.id} t={t} onVersion={() => setShowVersionFor(t.id)} onLinks={() => setEditingLinks(t.id)} onCategory={() => { setEditingCategory(t.id); setCategoryForm({ mainCategory: "HRM", subCategory: "" }); }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ t, onVersion, onLinks, onCategory }: {
  t: Template;
  onVersion: () => void;
  onLinks: () => void;
  onCategory: () => void;
}) {
  const latestVersion = t.versions?.[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
            {latestVersion && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{latestVersion.version}</span>}
          </div>
          {t.description && <p className="text-xs text-slate-500 mb-1">{t.description}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400">
              {t.versions?.length ?? 0} versie{t.versions?.length !== 1 ? "s" : ""} · {latestVersion?.changelog ? `${latestVersion.changelog} · ` : ""}Aangemaakt
            </span>
            {(t.moduleLinks?.length ?? 0) > 0 ? (
              <span className="text-xs text-emerald-600">{t.moduleLinks.length} module-koppeling{t.moduleLinks.length !== 1 ? "en" : ""}</span>
            ) : (
              <span className="text-xs text-amber-500">Geen module-koppelingen</span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onCategory} className="btn-secondary text-xs px-2 py-1">Categorie</button>
          <button onClick={onLinks} className="btn-secondary text-xs px-2 py-1">Modules</button>
          <button onClick={onVersion} className="btn-secondary text-xs px-2 py-1">+ Versie</button>
        </div>
      </div>
    </div>
  );
}

function ModuleLinksEditor({ initialLinks, onSave, onCancel, saving }: {
  initialLinks: string[];
  onSave: (links: string[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [links, setLinks] = useState<string[]>(initialLinks);

  function toggle(key: string) {
    setLinks(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  return (
    <div className="space-y-4">
      <div className="max-h-64 overflow-y-auto space-y-3 border border-slate-200 rounded-lg p-3">
        {MODULES.map(mod => (
          <div key={mod.key}>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
              <input type="checkbox" className="rounded" checked={links.includes(mod.key)} onChange={() => toggle(mod.key)} />
              {mod.emoji} {mod.label}
            </label>
            <div className="ml-5 grid grid-cols-2 gap-x-4">
              {mod.submodules.map(sub => (
                <label key={sub.key} className="flex items-center gap-1.5 text-xs text-slate-600 py-0.5">
                  <input type="checkbox" className="rounded" checked={links.includes(sub.key)} onChange={() => toggle(sub.key)} />
                  {sub.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(links)} disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Opslaan"}</button>
        <button onClick={onCancel} className="btn-secondary flex-1">Annuleren</button>
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
