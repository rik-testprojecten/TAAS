"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, formatDateTime } from "@/lib/utils";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step result form
  const [resultForm, setResultForm] = useState({ status: "PASSED", result: "", notes: "" });
  const [showResultForm, setShowResultForm] = useState(false);

  // Issue form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: "", description: "", type: "BUG", impact: "MEDIUM" });

  useEffect(() => { load(); }, [id]);

  async function load() {
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    if (data && !data.error) setTask(data);
    setLoading(false);
  }

  async function submitResult() {
    if (!task?.runStep?.id) return;
    setSaving(true);
    await fetch(`/api/runSteps/${task.runStep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultForm),
    });
    setSaving(false);
    router.push("/tasks");
  }

  async function submitIssue() {
    if (!task?.runStep?.id || !issueForm.title || !issueForm.description) return;
    setSaving(true);
    await fetch(`/api/runSteps/${task.runStep.id}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueForm),
    });
    setSaving(false);
    router.push("/tasks");
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!task) return <div className="p-8 text-slate-500">Taak niet gevonden</div>;

  const step = task.runStep;
  const run = step?.run;
  const project = run?.flowVersion?.flow?.phase?.project;
  const stepIndex = run?.steps?.findIndex((s: any) => s.id === step?.id) ?? -1;
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : null;

  const stepIsDone = step && ["PASSED", "FAILED", "BLOCKED"].includes(step.status);
  const isRetest = task.type === "RETEST";

  return (
    <div className="p-8 max-w-2xl">
      {/* Back */}
      <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Mijn Taken
      </Link>

      {/* Context breadcrumb */}
      {project && (
        <div className="text-xs text-slate-400 mb-4">
          {project.name} — {run?.flowVersion?.flow?.phase?.name} — {run?.name}
        </div>
      )}

      {/* Retest banner */}
      {isRetest && task.issue && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-purple-600 text-lg">🔄</span>
            <div>
              <div className="font-semibold text-purple-900 text-sm mb-1">Hertest vereist</div>
              <div className="text-sm text-purple-700">{task.issue.title}</div>
              <div className="text-xs text-purple-500 mt-1">Door: {task.issue.createdBy?.name} · {formatDateTime(task.issue?.createdAt)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Step card */}
      {step && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {stepNumber && (
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                {stepNumber}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900">{step.title}</h1>
              <span className={`badge text-xs ${STATUS_COLORS[step.status]}`}>{step.status.replace("_", " ")}</span>
            </div>
          </div>

          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">
            {step.instruction}
          </div>

          {step.expectedResult && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <span className="font-semibold text-blue-700">Verwacht resultaat: </span>
              <span className="text-blue-700">{step.expectedResult}</span>
            </div>
          )}
        </div>
      )}

      {/* Existing issues on this step */}
      {step?.issues?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Eerder gemelde bevindingen</h2>
          <div className="space-y-2">
            {step.issues.map((issue: any) => (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-3 p-3 card hover:border-primary-200 transition-colors"
              >
                <span className={`badge border ${IMPACT_COLORS[issue.impact]} text-xs`}>{ISSUE_IMPACT_LABELS[issue.impact]}</span>
                <span className="text-sm text-slate-700 flex-1">{issue.title}</span>
                <span className={`badge ${STATUS_COLORS[issue.status]} text-xs`}>{issue.status.replace("_", " ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {stepIsDone ? (
        <div className="card p-4 text-center text-sm text-slate-500">
          Deze stap is al afgerond ({step.status}). Je hoeft niets meer te doen.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Result form */}
          {showResultForm ? (
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-slate-900">
                {isRetest ? "Hertest resultaat" : "Resultaat vastleggen"}
              </h2>
              <div className="flex gap-3">
                {["PASSED", "FAILED", "BLOCKED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setResultForm({ ...resultForm, status: s })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors font-medium ${
                      resultForm.status === s
                        ? s === "PASSED" ? "bg-green-100 border-green-300 text-green-700"
                          : s === "FAILED" ? "bg-red-100 border-red-300 text-red-700"
                          : "bg-orange-100 border-orange-300 text-orange-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s === "PASSED" ? (isRetest ? "Hertest geslaagd" : "Geslaagd")
                      : s === "FAILED" ? (isRetest ? "Hertest mislukt" : "Mislukt")
                      : "Geblokkeerd"}
                  </button>
                ))}
              </div>
              <input
                className="input text-sm"
                placeholder="Resultaat omschrijving (optioneel)"
                value={resultForm.result}
                onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })}
              />
              <textarea
                className="input text-sm resize-none"
                rows={3}
                placeholder="Notities (optioneel)"
                value={resultForm.notes}
                onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  onClick={submitResult}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Opslaan..." : "Opslaan en terug"}
                </button>
                <button onClick={() => setShowResultForm(false)} className="btn-secondary">
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowResultForm(true); setShowIssueForm(false); }}
              className="w-full btn-primary py-3 text-sm"
            >
              {isRetest ? "Hertest resultaat vastleggen" : "Resultaat vastleggen"}
            </button>
          )}

          {/* Issue form */}
          {showIssueForm ? (
            <div className="card p-5 border-red-200 bg-red-50/50 space-y-4">
              <h2 className="font-semibold text-red-800">Bevinding melden</h2>
              <input
                className="input text-sm"
                placeholder="Titel *"
                value={issueForm.title}
                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
              />
              <textarea
                className="input text-sm resize-none"
                rows={4}
                placeholder="Beschrijving van de bevinding *"
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
                  onClick={submitIssue}
                  disabled={saving || !issueForm.title || !issueForm.description}
                  className="btn-danger text-sm"
                >
                  {saving ? "Melden..." : "Bevinding melden en terug"}
                </button>
                <button onClick={() => setShowIssueForm(false)} className="btn-secondary text-sm">
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowIssueForm(true); setShowResultForm(false); }}
              className="w-full text-sm text-red-600 border border-red-200 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              Bevinding melden
            </button>
          )}
        </div>
      )}
    </div>
  );
}
