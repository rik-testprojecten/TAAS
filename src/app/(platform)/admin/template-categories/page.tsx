"use client";
import { useState, useEffect } from "react";

type SubCategory = { id: string; name: string; slug: string; isActive: boolean; order: number };
type MainCategory = { id: string; name: string; slug: string; isActive: boolean; order: number; subCategories: SubCategory[]; _count: { templates: number } };

export default function TemplateCategoriesPage() {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showNewMain, setShowNewMain] = useState(false);
  const [mainForm, setMainForm] = useState({ name: "", slug: "" });

  const [showNewSub, setShowNewSub] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ name: "", slug: "" });

  const [editMain, setEditMain] = useState<{ id: string; name: string } | null>(null);
  const [editSub, setEditSub] = useState<{ id: string; mainId: string; name: string } | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/platform/template-categories");
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function createMain(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/platform/template-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: mainForm.name, slug: mainForm.slug.toUpperCase() }),
    });
    if (res.ok) { setShowNewMain(false); setMainForm({ name: "", slug: "" }); load(); }
    else { const d = await res.json(); alert(d.error ?? "Aanmaken mislukt"); }
    setSaving(false);
  }

  async function updateMain(id: string, data: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/platform/template-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditMain(null);
    load();
    setSaving(false);
  }

  async function deleteMain(id: string, name: string) {
    if (!confirm(`Hoofdcategorie "${name}" verwijderen?`)) return;
    const res = await fetch(`/api/platform/template-categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Verwijderen mislukt"); return; }
    load();
  }

  async function createSub(mainCategoryId: string, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/platform/template-categories/${mainCategoryId}/subcategories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subForm.name, slug: subForm.slug.toUpperCase() }),
    });
    if (res.ok) { setShowNewSub(null); setSubForm({ name: "", slug: "" }); load(); }
    else { const d = await res.json(); alert(d.error ?? "Aanmaken mislukt"); }
    setSaving(false);
  }

  async function updateSub(mainId: string, subId: string, data: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/platform/template-categories/${mainId}/subcategories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subId, ...data }),
    });
    setEditSub(null);
    load();
    setSaving(false);
  }

  async function deleteSub(mainId: string, subId: string, name: string) {
    if (!confirm(`Subcategorie "${name}" verwijderen?`)) return;
    const res = await fetch(`/api/platform/template-categories/${mainId}/subcategories?subId=${subId}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Verwijderen mislukt"); return; }
    load();
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorieën</h1>
          <p className="text-slate-500 text-sm mt-1">Hoofd- en subcategorieën voor templates</p>
        </div>
        <button onClick={() => setShowNewMain(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nieuwe categorie
        </button>
      </div>

      {showNewMain && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Nieuwe hoofdcategorie</h2>
            <form onSubmit={createMain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={mainForm.name} onChange={e => setMainForm({ ...mainForm, name: e.target.value })} required placeholder="bijv. Logistiek" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (unieke code) *</label>
                <input className="input uppercase" value={mainForm.slug} onChange={e => setMainForm({ ...mainForm, slug: e.target.value.toUpperCase() })} required placeholder="LOG" pattern="[A-Z0-9_]+" title="Alleen hoofdletters, cijfers en underscore" />
                <p className="text-xs text-slate-400 mt-1">Wordt automatisch hoofdletters. Niet meer te wijzigen na aanmaken.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Aanmaken..." : "Aanmaken"}</button>
                <button type="button" onClick={() => { setShowNewMain(false); setMainForm({ name: "", slug: "" }); }} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Nieuwe subcategorie</h2>
            <form onSubmit={(e) => createSub(showNewSub, e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} required placeholder="bijv. Werving & Selectie" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (unieke code) *</label>
                <input className="input uppercase" value={subForm.slug} onChange={e => setSubForm({ ...subForm, slug: e.target.value.toUpperCase() })} required placeholder="WERVING" pattern="[A-Z0-9_]+" title="Alleen hoofdletters, cijfers en underscore" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Aanmaken..." : "Aanmaken"}</button>
                <button type="button" onClick={() => { setShowNewSub(null); setSubForm({ name: "", slug: "" }); }} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.length === 0 && (
          <div className="card p-12 text-center text-slate-400 text-sm">Nog geen categorieën</div>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="card">
            <div className="p-4 flex items-center gap-3">
              <button
                onClick={() => toggleExpanded(cat.id)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                aria-label={expanded.has(cat.id) ? "Inklappen" : "Uitklappen"}
              >
                <svg className={`w-4 h-4 transition-transform ${expanded.has(cat.id) ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {editMain?.id === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    className="input text-sm flex-1"
                    value={editMain.name}
                    onChange={e => setEditMain({ ...editMain, name: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") updateMain(cat.id, { name: editMain.name }); if (e.key === "Escape") setEditMain(null); }}
                    autoFocus
                  />
                  <button onClick={() => updateMain(cat.id, { name: editMain.name })} disabled={saving} className="btn-primary text-xs px-3">Opslaan</button>
                  <button onClick={() => setEditMain(null)} className="btn-secondary text-xs px-3">Annuleren</button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{cat.name}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{cat.slug}</span>
                  {!cat.isActive && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Inactief</span>}
                  <span className="text-xs text-slate-400">{cat._count.templates} template{cat._count.templates !== 1 ? "s" : ""}</span>
                </div>
              )}

              {editMain?.id !== cat.id && (
                <div className="flex items-center gap-1 ml-auto">
                  <button onClick={() => setEditMain({ id: cat.id, name: cat.name })} className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors" title="Naam bewerken">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={() => updateMain(cat.id, { isActive: !cat.isActive })}
                    className={`p-1.5 rounded hover:bg-slate-100 transition-colors text-xs font-medium ${cat.isActive ? "text-slate-400 hover:text-amber-600" : "text-amber-600 hover:text-slate-700"}`}
                    title={cat.isActive ? "Deactiveren" : "Activeren"}
                  >
                    {cat.isActive ? "Deact." : "Activ."}
                  </button>
                  <button
                    onClick={() => setShowNewSub(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 rounded hover:bg-slate-100 transition-colors"
                    title="Subcategorie toevoegen"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button
                    onClick={() => deleteMain(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors"
                    title="Verwijderen"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>

            {expanded.has(cat.id) && (
              <div className="border-t border-slate-100">
                {cat.subCategories.length === 0 ? (
                  <div className="px-10 py-3 text-xs text-slate-400">Geen subcategorieën — klik + om er een toe te voegen</div>
                ) : (
                  cat.subCategories.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-3 px-10 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      {editSub?.id === sub.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            className="input text-sm flex-1"
                            value={editSub.name}
                            onChange={e => setEditSub({ ...editSub, name: e.target.value })}
                            onKeyDown={e => { if (e.key === "Enter") updateSub(cat.id, sub.id, { name: editSub.name }); if (e.key === "Escape") setEditSub(null); }}
                            autoFocus
                          />
                          <button onClick={() => updateSub(cat.id, sub.id, { name: editSub.name })} disabled={saving} className="btn-primary text-xs px-3">Opslaan</button>
                          <button onClick={() => setEditSub(null)} className="btn-secondary text-xs px-3">Annuleren</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm text-slate-700 flex-1">{sub.name}</span>
                          <span className="text-xs font-mono text-slate-400">{sub.slug}</span>
                          {!sub.isActive && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Inactief</span>}
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditSub({ id: sub.id, mainId: cat.id, name: sub.name })} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors" title="Naam bewerken">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => updateSub(cat.id, sub.id, { isActive: !sub.isActive })}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors text-xs ${sub.isActive ? "text-slate-400 hover:text-amber-600" : "text-amber-600"}`}
                              title={sub.isActive ? "Deactiveren" : "Activeren"}
                            >
                              {sub.isActive ? "Deact." : "Activ."}
                            </button>
                            <button onClick={() => deleteSub(cat.id, sub.id, sub.name)} className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors" title="Verwijderen">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
