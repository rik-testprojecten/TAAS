"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type InsertPosition = { type: "before" | "after" | "end"; stepId?: string };
type StepForm = { title: string; instruction: string; expectedResult: string; assigneeIds: string[] };

const EMPTY_NEW_FORM: StepForm = { title: "", instruction: "", expectedResult: "", assigneeIds: [] };

// ── Top-level sub-components (outside main component to prevent re-mount on state change) ──

function AssigneePills({
  users,
  selected,
  onToggle,
}: {
  users: any[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (users.length === 0) return null;
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">Uitvoerders</label>
      <div className="flex flex-wrap gap-2">
        {users.map((u: any) => {
          const checked = selected.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onToggle(u.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
                checked
                  ? "bg-primary-100 border-primary-300 text-primary-700 font-medium"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {checked && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {u.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewStepForm({
  insertPos,
  form,
  users,
  saving,
  onAdd,
  onCancel,
  onFormChange,
  onToggle,
}: {
  insertPos: InsertPosition | null;
  form: StepForm;
  users: any[];
  saving: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onFormChange: (f: StepForm) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="card p-4 border-2 border-primary-300 border-dashed bg-primary-50/30">
      <p className="text-xs font-semibold text-primary-700 mb-3">
        {insertPos?.type === "before"
          ? "Nieuwe stap invoegen hiervoor"
          : insertPos?.type === "after"
          ? "Nieuwe stap invoegen hierna"
          : "Nieuwe stap toevoegen"}
      </p>
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Stap titel *"
          value={form.title}
          onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          autoFocus
        />
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Instructie / testscript *"
          value={form.instruction}
          onChange={(e) => onFormChange({ ...form, instruction: e.target.value })}
        />
        <input
          className="input"
          placeholder="Verwacht resultaat (optioneel)"
          value={form.expectedResult}
          onChange={(e) => onFormChange({ ...form, expectedResult: e.target.value })}
        />
        <AssigneePills users={users} selected={form.assigneeIds} onToggle={onToggle} />
        <div className="flex gap-2 pt-1">
          <button
            onClick={onAdd}
            disabled={saving || !form.title || !form.instruction}
            className="btn-primary text-sm"
          >
            {saving ? "Toevoegen..." : "Stap toevoegen"}
          </button>
          <button onClick={onCancel} className="btn-secondary text-sm">
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}

function InserterButton({
  insertPos,
  pos,
  onInsert,
}: {
  insertPos: InsertPosition | null;
  pos: InsertPosition;
  onInsert: (pos: InsertPosition) => void;
}) {
  if (insertPos !== null) return null;
  return (
    <button
      onClick={() => onInsert(pos)}
      className="w-full flex items-center gap-2 py-1.5 px-3 text-xs text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors group"
    >
      <span className="w-4 h-4 rounded-full border border-slate-300 group-hover:border-primary-400 flex items-center justify-center shrink-0">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </span>
      Stap hier invoegen
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function FlowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [insertPos, setInsertPos] = useState<InsertPosition | null>(null);
  const [newStepForm, setNewStepForm] = useState<StepForm>(EMPTY_NEW_FORM);
  const [saving, setSaving] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTenantUsers(data); })
      .catch(() => {});
  }, []);

  async function load() {
    const res = await fetch(`/api/flows/${id}`);
    const data = await res.json();
    setFlow(data);
    setLoading(false);
  }

  const activeVersion = flow?.versions?.find((v: any) => v.isActive) ?? flow?.versions?.[0];
  const steps = (activeVersion?.steps ?? []) as any[];
  const hasRuns = (activeVersion?._count?.runs ?? 0) > 0;

  async function saveStep(stepId: string) {
    setSaving(true);
    await fetch(`/api/flowSteps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingStep(null);
    await load();
    setSaving(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm("Stap verwijderen?")) return;
    await fetch(`/api/flowSteps/${stepId}`, { method: "DELETE" });
    load();
  }

  async function addStep() {
    if (!newStepForm.title || !newStepForm.instruction) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      title: newStepForm.title,
      instruction: newStepForm.instruction,
      expectedResult: newStepForm.expectedResult,
      assigneeIds: newStepForm.assigneeIds,
    };
    if (insertPos?.type === "after" && insertPos.stepId) body.afterStepId = insertPos.stepId;
    if (insertPos?.type === "before" && insertPos.stepId) body.beforeStepId = insertPos.stepId;
    await fetch(`/api/flowVersions/${activeVersion.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setInsertPos(null);
    setNewStepForm(EMPTY_NEW_FORM);
    await load();
    setSaving(false);
  }

  async function moveStep(stepId: string, direction: "up" | "down") {
    const ids: string[] = steps.map((s: any) => s.id);
    const idx = ids.indexOf(stepId);
    if (direction === "up" && idx > 0) {
      [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
    } else if (direction === "down" && idx < ids.length - 1) {
      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    } else return;
    await fetch(`/api/flowVersions/${activeVersion.id}/steps/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    load();
  }

  async function createNewVersion() {
    if (!confirm("Nieuwe versie aanmaken? De huidige stappen worden gekopieerd.")) return;
    await fetch(`/api/flows/${id}/versions`, { method: "POST" });
    load();
  }

  function startInsert(pos: InsertPosition) {
    setInsertPos(pos);
    setNewStepForm(EMPTY_NEW_FORM);
    setEditingStep(null);
  }

  function startEdit(step: any) {
    setEditingStep(step.id);
    setInsertPos(null);
    setEditForm({
      title: step.title,
      instruction: step.instruction,
      expectedResult: step.expectedResult ?? "",
      assigneeIds: step.assignees?.map((a: any) => a.userId) ?? [],
    });
  }

  function toggleInEdit(userId: string) {
    const cur: string[] = editForm.assigneeIds ?? [];
    setEditForm({ ...editForm, assigneeIds: cur.includes(userId) ? cur.filter((x: string) => x !== userId) : [...cur, userId] });
  }

  function toggleInNew(userId: string) {
    const cur = newStepForm.assigneeIds;
    setNewStepForm({ ...newStepForm, assigneeIds: cur.includes(userId) ? cur.filter((x) => x !== userId) : [...cur, userId] });
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!flow || flow.error) return <div className="p-8 text-slate-500">Flow niet gevonden</div>;

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/projects" className="hover:text-slate-600">Projecten</Link>
        <span>/</span>
        <Link href={`/projects/${flow.phase.project.id}`} className="hover:text-slate-600">{flow.phase.project.name}</Link>
        <span>/</span>
        <Link href={`/projects/${flow.phase.project.id}/phases/${flow.phase.id}`} className="hover:text-slate-600">{flow.phase.name}</Link>
        <span>/</span>
        <span className="text-slate-700">{flow.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{flow.name}</h1>
            {activeVersion && (
              <span className="text-sm text-slate-400 bg-slate-100 px-2 py-1 rounded">{activeVersion.version}</span>
            )}
          </div>
          {flow.description && <p className="text-slate-500 text-sm">{flow.description}</p>}
          {hasRuns && (
            <div className="flex items-center gap-2 mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Er zijn runs op deze versie — stappen zijn alleen-lezen. Maak een nieuwe versie om te bewerken.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {hasRuns && (
            <button onClick={createNewVersion} className="btn-secondary text-sm">Nieuwe versie</button>
          )}
          {activeVersion && (
            <Link
              href={`/runs/new?versionId=${activeVersion.id}&flowName=${encodeURIComponent(flow.name)}`}
              className="btn-primary text-sm"
            >
              Run starten
            </Link>
          )}
        </div>
      </div>

      {/* Steps list */}
      <div className="max-w-3xl space-y-1">

        {steps.length === 0 && !insertPos && (
          <div className="card p-8 text-center text-slate-400 text-sm">Nog geen stappen. Voeg de eerste stap toe.</div>
        )}

        {/* Insert BEFORE first step */}
        {!hasRuns && steps.length > 0 && (
          insertPos?.type === "before" && insertPos.stepId === steps[0]?.id
            ? <NewStepForm
                insertPos={insertPos}
                form={newStepForm}
                users={tenantUsers}
                saving={saving}
                onAdd={addStep}
                onCancel={() => setInsertPos(null)}
                onFormChange={setNewStepForm}
                onToggle={toggleInNew}
              />
            : <InserterButton insertPos={insertPos} pos={{ type: "before", stepId: steps[0]?.id }} onInsert={startInsert} />
        )}

        {steps.map((step: any, index: number) => (
          <div key={step.id}>
            {editingStep === step.id ? (
              /* ── Edit form ── */
              <div className="card p-5 border-2 border-primary-300">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Titel</label>
                    <input className="input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Instructie / Testscript</label>
                    <textarea className="input resize-none" rows={4} value={editForm.instruction} onChange={(e) => setEditForm({ ...editForm, instruction: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Verwacht resultaat</label>
                    <textarea className="input resize-none" rows={2} value={editForm.expectedResult || ""} onChange={(e) => setEditForm({ ...editForm, expectedResult: e.target.value })} />
                  </div>
                  <AssigneePills users={tenantUsers} selected={editForm.assigneeIds ?? []} onToggle={toggleInEdit} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveStep(step.id)} disabled={saving} className="btn-primary text-sm">
                      {saving ? "Opslaan..." : "Opslaan"}
                    </button>
                    <button onClick={() => setEditingStep(null)} className="btn-secondary text-sm">Annuleren</button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Step card ── */
              <div className="card">
                <div className="flex items-start p-4 gap-3">
                  {/* Reorder buttons */}
                  {!hasRuns && (
                    <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                      <button
                        onClick={() => moveStep(step.id, "up")}
                        disabled={index === 0}
                        title="Omhoog"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveStep(step.id, "down")}
                        disabled={index === steps.length - 1}
                        title="Omlaag"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Step number */}
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900">{step.title}</h4>
                    <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{step.instruction}</p>
                    {step.expectedResult && (
                      <div className="mt-1.5 text-sm">
                        <span className="font-medium text-slate-400">Verwacht: </span>
                        <span className="text-slate-600">{step.expectedResult}</span>
                      </div>
                    )}
                    {step.assignees?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {step.assignees.map((a: any) => (
                          <span key={a.id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                            {a.user.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit / Delete */}
                  {!hasRuns && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(step)}
                        title="Bewerken"
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteStep(step.id)}
                        title="Verwijderen"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insert AFTER this step / BEFORE next step */}
            {!hasRuns && (
              insertPos?.type === "after" && insertPos.stepId === step.id
                ? <div className="mt-1">
                    <NewStepForm
                      insertPos={insertPos}
                      form={newStepForm}
                      users={tenantUsers}
                      saving={saving}
                      onAdd={addStep}
                      onCancel={() => setInsertPos(null)}
                      onFormChange={setNewStepForm}
                      onToggle={toggleInNew}
                    />
                  </div>
                : insertPos?.type === "before" && insertPos.stepId === steps[index + 1]?.id
                ? <div className="mt-1">
                    <NewStepForm
                      insertPos={insertPos}
                      form={newStepForm}
                      users={tenantUsers}
                      saving={saving}
                      onAdd={addStep}
                      onCancel={() => setInsertPos(null)}
                      onFormChange={setNewStepForm}
                      onToggle={toggleInNew}
                    />
                  </div>
                : <InserterButton insertPos={insertPos} pos={{ type: "after", stepId: step.id }} onInsert={startInsert} />
            )}
          </div>
        ))}

        {/* Add to end */}
        {!hasRuns && (
          insertPos?.type === "end"
            ? <NewStepForm
                insertPos={insertPos}
                form={newStepForm}
                users={tenantUsers}
                saving={saving}
                onAdd={addStep}
                onCancel={() => setInsertPos(null)}
                onFormChange={setNewStepForm}
                onToggle={toggleInNew}
              />
            : insertPos === null && (
              <button
                onClick={() => startInsert({ type: "end" })}
                className="w-full card p-3 mt-1 text-sm text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-colors flex items-center justify-center gap-2 border-dashed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {steps.length === 0 ? "Eerste stap toevoegen" : "Stap aan het einde toevoegen"}
              </button>
            )
        )}
      </div>
    </div>
  );
}
