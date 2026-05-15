"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, formatDateTime } from "@/lib/utils";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState({ status: "", result: "", notes: "" });
  const [issueForm, setIssueForm] = useState({ title: "", description: "", type: "BUG", impact: "MEDIUM" });
  const [showIssueFor, setShowIssueFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const res = await fetch(`/api/runs/${id}`);
    const data = await res.json();
    setRun(data);
    setLoading(false);
  }

  async function startRun() {
    await fetch(`/api/runs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    load();
  }

  async function updateStep(stepId: string) {
    setSaving(true);
    await fetch(`/api/runSteps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stepForm),
    });
    setActiveStep(null);
    load();
    setSaving(false);
  }

  async function createIssue(stepId: string) {
    setSaving(true);
    await fetch(`/api/runSteps/${stepId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueForm),
    });
    setShowIssueFor(null);
    setIssueForm({ title: "", description: "", type: "BUG", impact: "MEDIUM" });
    load();
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!run || run.error) return <div className="p-8 text-slate-500">Run niet gevonden</div>;

  const project = run.flowVersion.flow.phase.project;
  const phase = run.flowVersion.flow.phase;
  const flow = run.flowVersion.flow;

  const completedSteps = run.steps.filter((s: any) => ["PASSED", "FAILED", "BLOCKED"].includes(s.status)).length;
  const totalSteps = run.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  function isStepUnlocked(index: number): boolean {
    if (run.status !== "IN_PROGRESS") return false;
    if (index === 0) return true;
    return run.steps.slice(0, index).every((s: any) => ["PASSED", "FAILED", "BLOCKED"].includes(s.status));
  }

  function myCompletedThisStep(step: any): boolean {
    if (!currentUserId) return false;
    const mine = step.assignees?.find((a: any) => a.user.id === currentUserId);
    return mine?.completedAt != null;
  }

  function isAssignedToMe(step: any): boolean {
    if (!currentUserId) return false;
    return step.assignees?.some((a: any) => a.user.id === currentUserId) ?? false;
  }

  function canActOnStep(step: any, index: number): boolean {
    if (!isStepUnlocked(index)) return false;
    if (["PASSED", "FAILED", "BLOCKED"].includes(step.status)) return false;
    // If step has assignees, only assignees can act (and only if they haven't completed yet)
    if (step.assignees?.length > 0) {
      if (!isAssignedToMe(step)) return false;
      if (myCompletedThisStep(step)) return false;
    }
    return true;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4 flex-wrap">
        <Link href="/projects" className="hover:text-slate-600 shrink-0">Projecten</Link>
        <span>/</span>
        <Link href={`/projects/${project.id}`} className="hover:text-slate-600 truncate max-w-[120px] sm:max-w-none">{project.name}</Link>
        <span>/</span>
        <Link href={`/projects/${project.id}/phases/${phase.id}`} className="hover:text-slate-600 shrink-0">{phase.name}</Link>
        <span>/</span>
        <span className="text-slate-700 truncate max-w-[120px] sm:max-w-none">{run.name}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{run.name}</h1>
          <p className="text-slate-500 text-sm">{flow.name} — {run.flowVersion.version}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge ${STATUS_COLORS[run.status]}`}>{run.status.replace("_", " ")}</span>
          </div>
        </div>
        {run.status === "DRAFT" && (
          <button onClick={startRun} className="btn-primary self-start">Run starten</button>
        )}
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">Voortgang</span>
          <span className="text-slate-500">{completedSteps}/{totalSteps} stappen</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-green-600">{run.steps.filter((s: any) => s.status === "PASSED").length} geslaagd</span>
          <span className="text-red-600">{run.steps.filter((s: any) => s.status === "FAILED").length} mislukt</span>
          <span className="text-orange-600">{run.steps.filter((s: any) => s.status === "BLOCKED").length} geblokkeerd</span>
          <span className="text-slate-400">{run.steps.filter((s: any) => s.status === "PENDING").length} wacht</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 max-w-3xl">
        {run.steps.map((step: any, index: number) => {
          const unlocked = isStepUnlocked(index);
          const terminal = ["PASSED", "FAILED", "BLOCKED"].includes(step.status);
          const canAct = canActOnStep(step, index);
          const iAmAssignee = isAssignedToMe(step);
          const iDone = myCompletedThisStep(step);
          const hasAssignees = step.assignees?.length > 0;

          return (
            <div
              key={step.id}
              className={`card transition-opacity ${
                step.status === "PASSED" ? "border-green-200" :
                step.status === "FAILED" ? "border-red-200" :
                step.status === "BLOCKED" ? "border-orange-200" :
                !unlocked ? "opacity-50" : ""
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    step.status === "PASSED" ? "bg-green-100 text-green-700" :
                    step.status === "FAILED" ? "bg-red-100 text-red-700" :
                    step.status === "BLOCKED" ? "bg-orange-100 text-orange-700" :
                    step.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                    !unlocked ? "bg-slate-100 text-slate-400" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {step.status === "PASSED" ? "✓" :
                     step.status === "FAILED" ? "✗" :
                     step.status === "BLOCKED" ? "!" :
                     !unlocked ? "🔒" : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">{step.title}</h4>
                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{step.instruction}</p>
                        {step.expectedResult && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <span className="font-medium text-blue-700">Verwacht: </span>
                            <span className="text-blue-600">{step.expectedResult}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex gap-2">
                        <span className={`badge ${STATUS_COLORS[step.status]}`}>{step.status.replace("_", " ")}</span>
                      </div>
                    </div>

                    {/* Assignees with completion status */}
                    {hasAssignees && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {step.assignees.map((a: any) => {
                          const done = a.completedAt != null;
                          const isMe = a.user.id === currentUserId;
                          return (
                            <span
                              key={a.id}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                                done
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : isMe
                                  ? "bg-primary-50 border-primary-200 text-primary-700"
                                  : "bg-slate-50 border-slate-200 text-slate-500"
                              }`}
                            >
                              {done && (
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {a.user.name}{isMe ? " (jij)" : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {step.result && (
                      <div className="mt-2 text-sm text-slate-600"><strong>Resultaat:</strong> {step.result}</div>
                    )}
                    {step.notes && (
                      <div className="mt-1 text-sm text-slate-500 italic">{step.notes}</div>
                    )}
                    {step.doneAt && (
                      <div className="mt-1 text-xs text-slate-400">Afgerond: {formatDateTime(step.doneAt)}</div>
                    )}

                    {/* Waiting for others message */}
                    {iAmAssignee && iDone && !terminal && (
                      <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Wacht op overige uitvoerders voor deze stap verder gaat.
                      </div>
                    )}
                  </div>
                </div>

                {/* Execution controls */}
                {canAct && activeStep !== step.id && (
                  <div className="flex items-center gap-2 mt-3 ml-8 sm:ml-12 flex-wrap">
                    <button
                      onClick={() => { setActiveStep(step.id); setStepForm({ status: "PASSED", result: "", notes: "" }); }}
                      className="text-xs btn-secondary"
                    >
                      Resultaat vastleggen
                    </button>
                    <button
                      onClick={() => setShowIssueFor(step.id)}
                      className="text-xs text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Bevinding melden
                    </button>
                  </div>
                )}

                {/* Unlocked but not assigned to me */}
                {unlocked && !terminal && hasAssignees && !iAmAssignee && run.status === "IN_PROGRESS" && (
                  <div className="mt-3 ml-8 sm:ml-12">
                    <button
                      onClick={() => setShowIssueFor(step.id)}
                      className="text-xs text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Bevinding melden
                    </button>
                  </div>
                )}

                {/* Step result form */}
                {activeStep === step.id && (
                  <div className="mt-3 ml-8 sm:ml-12 space-y-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex gap-2 flex-wrap">
                      {["PASSED", "FAILED", "BLOCKED"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStepForm({ ...stepForm, status: s })}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            stepForm.status === s
                              ? s === "PASSED" ? "bg-green-100 border-green-300 text-green-700" :
                                s === "FAILED" ? "bg-red-100 border-red-300 text-red-700" :
                                "bg-orange-100 border-orange-300 text-orange-700"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {s === "PASSED" ? "Geslaagd" : s === "FAILED" ? "Mislukt" : "Geblokkeerd"}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input text-sm"
                      placeholder="Resultaat (optioneel)"
                      value={stepForm.result}
                      onChange={(e) => setStepForm({ ...stepForm, result: e.target.value })}
                    />
                    <textarea
                      className="input text-sm resize-none"
                      rows={2}
                      placeholder="Notities (optioneel)"
                      value={stepForm.notes}
                      onChange={(e) => setStepForm({ ...stepForm, notes: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStep(step.id)}
                        disabled={saving || !stepForm.status}
                        className="btn-primary text-xs"
                      >
                        {saving ? "Opslaan..." : "Opslaan"}
                      </button>
                      <button onClick={() => setActiveStep(null)} className="btn-secondary text-xs">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {/* Issue form */}
                {showIssueFor === step.id && (
                  <div className="mt-3 ml-12 space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <h5 className="text-sm font-semibold text-red-800">Bevinding melden</h5>
                    <input
                      className="input text-sm"
                      placeholder="Titel *"
                      value={issueForm.title}
                      onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    />
                    <textarea
                      className="input text-sm resize-none"
                      rows={3}
                      placeholder="Beschrijving *"
                      value={issueForm.description}
                      onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    />
                    <div className="flex gap-3">
                      <select className="input text-sm" value={issueForm.type} onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value })}>
                        <option value="BUG">Fout</option>
                        <option value="WISH">Wens</option>
                        <option value="BLOCKER">Blokkade</option>
                      </select>
                      <select className="input text-sm" value={issueForm.impact} onChange={(e) => setIssueForm({ ...issueForm, impact: e.target.value })}>
                        <option value="CRITICAL">Kritiek</option>
                        <option value="HIGH">Hoog</option>
                        <option value="MEDIUM">Middel</option>
                        <option value="LOW">Laag</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => createIssue(step.id)}
                        disabled={saving || !issueForm.title || !issueForm.description}
                        className="btn-danger text-xs"
                      >
                        {saving ? "Melden..." : "Bevinding melden"}
                      </button>
                      <button onClick={() => setShowIssueFor(null)} className="btn-secondary text-xs">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {/* Issues for this step */}
                {step.issues?.length > 0 && (
                  <div className="mt-3 ml-12 space-y-2">
                    {step.issues.map((issue: any) => (
                      <Link
                        key={issue.id}
                        href={`/issues/${issue.id}`}
                        className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <span className={`badge border ${IMPACT_COLORS[issue.impact]} text-xs`}>{ISSUE_IMPACT_LABELS[issue.impact]}</span>
                        <span className="text-sm text-slate-700">{issue.title}</span>
                        <span className={`badge ${STATUS_COLORS[issue.status]} ml-auto text-xs`}>{issue.status.replace("_", " ")}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
