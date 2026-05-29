"use client";
import { useState, useEffect, useCallback } from "react";
import { Modal, ConfirmDialog } from "@/components/Modal";
import { Field, SelectField } from "@/components/Field";
import { CardGridSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

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
  const toast = useToast();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", phaseType: "", items: [{ label: "" }] });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/checklists");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChecklists(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Checklists konden niet worden geladen");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const validItems = newForm.items.filter((i) => i.label.trim());
    if (!newForm.name.trim() || validItems.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newForm.name, phaseType: newForm.phaseType || undefined, items: validItems }),
      });
      if (!res.ok) throw new Error();
      setShowNew(false);
      setNewForm({ name: "", phaseType: "", items: [{ label: "" }] });
      toast.success("Checklist aangemaakt");
      load();
    } catch {
      toast.error("Aanmaken mislukt — probeer het opnieuw");
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(checklistId: string, items: ChecklistItem[], idx: number) {
    const updated = items.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item);
    try {
      const res = await fetch(`/api/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updated }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Wijziging kon niet worden opgeslagen");
    }
    load();
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/checklists/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Checklist verwijderd");
    } catch {
      toast.error("Verwijderen mislukt");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
      load();
    }
  }

  async function resetChecklist(checklist: Checklist) {
    try {
      const res = await fetch(`/api/checklists/${checklist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checklist.items.map((i) => ({ ...i, checked: false })) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Resetten mislukt");
    }
    load();
  }

  return (
    <div className="p-8 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Checklists</h1>
          <p className="text-slate-500 text-sm mt-1">Herbruikbare checklists per testfase</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nieuwe checklist
        </button>
      </header>

      {/* Nieuwe checklist */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Nieuwe checklist"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Annuleren</button>
            <button type="submit" form="new-checklist-form" disabled={saving} className="btn-primary">{saving ? "Opslaan..." : "Aanmaken"}</button>
          </>
        }
      >
        <form id="new-checklist-form" onSubmit={create} className="space-y-4">
          <Field label="Naam" required placeholder="bijv. Acceptatieschecklist FAT" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
          <SelectField label="Fase (optioneel)" value={newForm.phaseType} onChange={(e) => setNewForm({ ...newForm, phaseType: e.target.value })}>
            {PHASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </SelectField>
          <fieldset>
            <legend className="label">Checklist items</legend>
            <div className="space-y-2">
              {newForm.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    aria-label={`Item ${i + 1}`}
                    placeholder={`Item ${i + 1}`}
                    value={item.label}
                    onChange={(e) => {
                      const items = [...newForm.items];
                      items[i] = { label: e.target.value };
                      setNewForm({ ...newForm, items });
                    }}
                  />
                  {newForm.items.length > 1 && (
                    <button type="button" aria-label={`Item ${i + 1} verwijderen`} onClick={() => setNewForm({ ...newForm, items: newForm.items.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 px-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setNewForm({ ...newForm, items: [...newForm.items, { label: "" }] })} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Item toevoegen
              </button>
            </div>
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Checklist verwijderen"
        message={confirmDelete ? `Weet je zeker dat je "${confirmDelete.name}" wilt verwijderen?` : ""}
        confirmLabel="Verwijderen"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : checklists.length === 0 ? (
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
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Voortgang ${checklist.name}`}>
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => resetChecklist(checklist)} aria-label="Alles uitvinken" title="Alles uitvinken" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => setConfirmDelete({ id: checklist.id, name: checklist.name })} aria-label="Checklist verwijderen" title="Verwijderen" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
