"use client";
import { useState, useEffect } from "react";

type ChecklistItem = { id?: string; label: string; checked: boolean };
type Checklist = {
  id: string;
  name: string;
  phaseType?: string | null;
  items: ChecklistItem[];
  createdAt: string;
};

const PHASE_OPTIONS = [
  { value: "", label: "Alle fases" },
  { value: "FAT", label: "FAT" },
  { value: "GAT", label: "GAT" },
  { value: "PAT", label: "PAT" },
];

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", phaseType: "", items: [{ label: "" }] });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/checklists");
    const data = await res.json();
    setChecklists(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const validItems = newForm.items.filter((i) => i.label.trim());
    if (!newForm.name.trim() || validItems.length === 0) return;
    setSaving(true);
    await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newForm.name,
        phaseType: newForm.phaseType || undefined,
        items: validItems,
      }),
    });
    setSaving(false);
    setShowNew(false);
    setNewForm({ name: "", phaseType: "", items: [{ label: "" }] });
    load();
  }

  async function toggleItem(checklistId: string, items: ChecklistItem[], idx: number) {
    const updated = items.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item);
    await fetch(`/api/checklists/${checklistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: updated }),
    });
    load();
  }

  async function deleteChecklist(id: string) {
    if (!confirm("Checklist verwijderen?")) return;
    await fetch(`/api/checklists/${id}`, { method: "DELETE" });
    load();
  }

  async function resetChecklist(checklist: Checklist) {
    await fetch(`/api/checklists/${checklist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: checklist.items.map((i) => ({ ...i, checked: false })) }),
    });
    load();
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Checklists</h1>
          <p className="text-slate-500 text-sm mt-1">Herbruikbare checklists per testfase</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nieuwe checklist
        </button>
      </div>

      {/* Nieuwe checklist modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-lg mb-4">Nieuwe checklist</h2>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam</label>
                <input className="input" placeholder="bijv. Acceptatieschecklist FAT" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fase <span className="text-slate-400 font-normal">(optioneel)</span></label>
                <select className="input" value={newForm.phaseType} onChange={(e) => setNewForm({ ...newForm, phaseType: e.target.value })}>
                  {PHASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Checklist items</label>
                <div className="space-y-2">
                  {newForm.items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="input flex-1"
                        placeholder={`Item ${i + 1}`}
                        value={item.label}
                        onChange={(e) => {
                          const items = [...newForm.items];
                          items[i] = { label: e.target.value };
                          setNewForm({ ...newForm, items });
                        }}
                      />
                      {newForm.items.length > 1 && (
                        <button type="button" onClick={() => setNewForm({ ...newForm, items: newForm.items.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewForm({ ...newForm, items: [...newForm.items, { label: "" }] })} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Item toevoegen
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Opslaan..." : "Aanmaken"}</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {checklists.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Nog geen checklists aangemaakt.</div>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const doneCount = checklist.items.filter((i) => i.checked).length;
            const total = checklist.items.length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            return (
              <div key={checklist.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{checklist.name}</h3>
                      {checklist.phaseType && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">{checklist.phaseType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{doneCount}/{total} afgerond</span>
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => resetChecklist(checklist)} title="Alles uitvinken" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => deleteChecklist(checklist.id)} title="Verwijderen" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <ul className="divide-y divide-slate-50">
                  {checklist.items.map((item, idx) => (
                    <li key={idx}>
                      <label className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(checklist.id, checklist.items, idx)}
                          className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-400"
                        />
                        <span className={`text-sm ${item.checked ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {item.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
