"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, ISSUE_STATUS_LABELS, STEP_STATUS_LABELS, formatDateTime } from "@/lib/utils";
import { AttachmentUploader, type AttachmentMeta } from "@/components/AttachmentUploader";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resultForm, setResultForm] = useState({ status: "PASSED", result: "", notes: "" });
  const [showResultForm, setShowResultForm] = useState(false);

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: "", description: "", type: "BUG", impact: "MEDIUM" });
  const [issueAttachments, setIssueAttachments] = useState<AttachmentMeta[]>([]);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [resultAttachments, setResultAttachments] = useState<AttachmentMeta[]>([]);

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
      body: JSON.stringify({ ...resultForm, attachmentIds: resultAttachments.map((a) => a.id) }),
    });
    setSaving(false);
    router.push("/tasks");
  }

  async function submitIssue() {
    if (!task?.runStep?.id || !issueForm.title || !issueForm.description) return;
    setSaving(true);
    const res = await fetch(`/api/runSteps/${task.runStep.id}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...issueForm, attachmentIds: issueAttachments.map((a) => a.id) }),
    });
    setSaving(false);
    if (res.ok) {
      setIssueForm({ title: "", description: "", type: "BUG", impact: "MEDIUM" });
      setIssueAttachments([]);
      setShowIssueForm(false);
      setIssueSuccess(true);
      setTimeout(() => setIssueSuccess(false), 4000);
      await load();
    }
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!task) return <div className="p-8 text-slate-500">Taak niet gevonden</div>;

  const step = task.runStep;
  const run = step?.run;
  const project = run?.flowVersion?.flow?.phase?.project;
  const stepIndex = run?.steps?.findIndex((s: any) => s.id === step?.id) ?? -1;
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : null;

  const myAssignee = step?.assignees?.find((a: any) => a.userId === task.userId);
  const stepIsDone = task.status === "DONE" || (myAssignee?.completedAt != null);
  const isRetest = task.type === "RETEST";

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Mijn Taken
      </Link>

      {project && (
        <div className="text-xs text-slate-400 mb-4">
          {project.name} — {run?.flowVersion?.flow?.phase?.name} — {run?.name}
        </div>
      )}

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
              <span className={`badge text-xs ${STATUS_COLORS[step.status]}`}>{STEP_STATUS_LABELS[step.status] ?? step.status}</span>
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

      {step?.issues?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Gemelde bevindingen op deze stap ({step.issues.length})</h2>
          <div className="space-y-2">
            {step.issues.map((issue: any) => (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-3 p-3 card hover:border-primary-200 transition-colors"
              >
                <span className={`badge border ${IMPACT_COLORS[issue.impact]} text-xs`}>{ISSUE_IMPACT_LABELS[issue.impact]}</span>
                <span className="text-sm text-slate-700 flex-1">{issue.title}</span>
                <span className={`badge ${STATUS_COLORS[issue.status]} text-xs`}>{ISSUE_STATUS_LABELS[issue.status] ?? issue.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {issueSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700 font-medium">
          Bevinding gemeld. Je kunt nog een bevinding melden of het resultaat vastleggen.
        </div>
      )}

      {stepIsDone ? (
        <div className="card p-4 text-center text-sm text-slate-500">
          Deze stap is al afgerond ({STEP_STATUS_LABELS[step?.status ?? ""] ?? step?.status}). Je hoeft niets meer te doen.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Issue form — altijd bovenaan zodat tester eerst bevinding kan melden */}
          {showIssueForm ? (
            <div className="card p-5 border-red-200 bg-red-50/50 space-y-4">
              <h2 className="font-semibold text-red-800">Bevinding melden</h2>
              <div>
                <label className="block text-xs font-medium text-red-800 mb-1">Titel <span className="text-red-600">*</span></label>
                <input
                  className={`input text-sm ${!issueForm.title ? "border-red-300" : ""}`}
                  placeholder="Vul een titel in"
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-800 mb-1">Beschrijving <span className="text-red-600">*</span></label>
                <textarea
                  className={`input text-sm resize-none ${!issueForm.description ? "border-red-300" : ""}`}
                  rows={4}
                  placeholder="Beschrijf de bevinding"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                />
              </div>
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Bijlagen</label>
                <AttachmentUploader value={issueAttachments} onChange={setIssueAttachments} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitIssue}
                  disabled={saving || !issueForm.title || !issueForm.description}
                  className="btn-danger text-sm"
                >
                  {saving ? "Melden..." : "Bevinding melden"}
                </button>
                <button onClick={() => setShowIssueForm(false)} className="btn-secondary text-sm">
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowIssueForm(true)}
              className="w-full text-sm text-red-600 border border-red-200 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              Bevinding melden
            </button>
          )}

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
              <div>
                <label className={`block text-xs font-medium mb-1 ${resultForm.status === "FAILED" ? "text-red-600" : "text-slate-600"}`}>
                  Notities{resultForm.status === "FAILED" ? " *" : " (optioneel)"}
                </label>
                <textarea
                  className={`input text-sm resize-none ${resultForm.status === "FAILED" && !resultForm.notes.trim() ? "border-red-300 focus:ring-red-200" : ""}`}
                  rows={3}
                  placeholder={resultForm.status === "FAILED" ? "Reden voor mislukken (verplicht)" : "Notities (optioneel)"}
                  value={resultForm.notes}
                  onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                />
                {resultForm.status === "FAILED" && !resultForm.notes.trim() && (
                  <p className="text-xs text-red-600 mt-1">Vul een reden in als het resultaat mislukt is.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Bijlagen</label>
                <AttachmentUploader value={resultAttachments} onChange={setResultAttachments} />
              </div>
              <div className="flex gap-2">
                <button onClick={submitResult} disabled={saving || (resultForm.status === "FAILED" && !resultForm.notes.trim())} className="btn-primary">
                  {saving ? "Opslaan..." : "Opslaan en terug"}
                </button>
                <button onClick={() => setShowResultForm(false)} className="btn-secondary">
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResultForm(true)}
              className="w-full btn-primary py-3 text-sm"
            >
              {isRetest ? "Hertest resultaat vastleggen" : "Resultaat vastleggen"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
