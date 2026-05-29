"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { STATUS_COLORS, IMPACT_COLORS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, ISSUE_STATUS_LABELS, formatDateTime } from "@/lib/utils";
import { AttachmentList } from "@/components/AttachmentUploader";

export default function IssuePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const userId: string = (session?.user as any)?.id ?? "";
  const isFM = roles.includes("FUNCTIONAL_MANAGER") || roles.includes("TENANT_ADMIN");
  const isTester = roles.includes("TESTER");

  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [resolveConfirm, setResolveConfirm] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [markWishConfirm, setMarkWishConfirm] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const res = await fetch(`/api/issues/${id}`);
    const data = await res.json();
    setIssue(data);
    if (data && !data.error) {
      setEditForm({
        impact: data.impact,
        type: data.type,
        title: data.title,
        description: data.description,
        hasWorkaround: data.hasWorkaround,
        workaroundNote: data.workaroundNote || "",
        businessAccepted: data.businessAccepted,
        businessAcceptNote: data.businessAcceptNote || "",
      });
    }
    setLoading(false);
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/issues/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setComment("");
    load();
    setSaving(false);
  }

  async function updateIssue() {
    setSaving(true);
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditMode(false);
    load();
    setSaving(false);
  }

  async function resolveIssue() {
    setSaving(true);
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    setResolveConfirm(false);
    load();
    setSaving(false);
  }

  async function rejectIssue() {
    setSaving(true);
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    setRejectConfirm(false);
    load();
    setSaving(false);
  }

  async function withdrawIssue() {
    setSaving(true);
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "WITHDRAWN" }),
    });
    setWithdrawConfirm(false);
    load();
    setSaving(false);
  }

  async function markAsWish() {
    setSaving(true);
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WISH" }),
    });
    setMarkWishConfirm(false);
    load();
    setSaving(false);
  }

  async function resubmitIssue() {
    setSaving(true);
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, status: "NEW" }),
    });
    setEditMode(false);
    load();
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;
  if (!issue || issue.error) return <div className="p-8 text-slate-500">Bevinding niet gevonden</div>;

  const project = issue.runStep?.run?.flowVersion?.flow?.phase?.project;
  const phase = issue.runStep?.run?.flowVersion?.flow?.phase;
  const flow = issue.runStep?.run?.flowVersion?.flow;
  const isOpen = !["RESOLVED", "REJECTED", "WITHDRAWN"].includes(issue.status);
  const isWithdrawn = issue.status === "WITHDRAWN";
  const isWish = issue.type === "WISH";
  const isOwnIssue = issue.createdById === userId;
  const canWithdraw = (isTester && isOwnIssue && isOpen) || ((isFM) && isOpen);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/issues" className="hover:text-slate-600">Bevindingen</Link>
        <span>/</span>
        <span className="text-slate-700 truncate max-w-xs">{issue.title}</span>
      </div>

      {isWish && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-pink-700">Wens</div>
            <div className="text-xs text-pink-500 mt-0.5">Deze bevinding is aangemerkt als wens en staat op de wenslijst.</div>
          </div>
        </div>
      )}

      {isWithdrawn && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-gray-700">Bevinding ingetrokken</div>
            <div className="text-xs text-gray-500 mt-0.5">Deze bevinding is door de melder ingetrokken. Je kunt hem aanpassen en opnieuw indienen.</div>
          </div>
        </div>
      )}

      {/* Main issue card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge border text-xs ${IMPACT_COLORS[issue.impact]}`}>{ISSUE_IMPACT_LABELS[issue.impact]}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ISSUE_TYPE_LABELS[issue.type]}</span>
              {issue.retestRequired && (
                <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                  Hertest loopt
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{issue.title}</h1>
            {project && (
              <div className="text-sm text-slate-500 mt-1">
                {project.name} → {phase?.name} → {flow?.name} → Stap: {issue.runStep?.title}
              </div>
            )}
          </div>
          <span className={`badge ${STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-700"} ml-4 shrink-0`}>
            {ISSUE_STATUS_LABELS[issue.status] ?? issue.status}
          </span>
        </div>

        <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 mb-4">
          {issue.description}
        </div>

        {issue.attachments?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-slate-500 mb-2">Bijlagen</div>
            <AttachmentList attachments={issue.attachments} />
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Door: {issue.createdBy.name}</span>
          <span>{formatDateTime(issue.createdAt)}</span>
        </div>
      </div>

      {/* Retest banner */}
      {issue.retestRequired && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-purple-900">Hertest in behandeling</div>
            <div className="text-xs text-purple-600 mt-0.5">De bevinding is opgelost. De tester voert momenteel de hertest uit.</div>
          </div>
        </div>
      )}

      {/* Tester: intrekken knop */}
      {canWithdraw && !isWithdrawn && !isFM && (
        <div className="card p-4 mb-4">
          {withdrawConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Weet je zeker dat je deze bevinding wilt <strong>intrekken</strong>? De actie wordt gelogd.</p>
              <div className="flex gap-2">
                <button onClick={withdrawIssue} disabled={saving} className="text-sm px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  {saving ? "Bezig..." : "Ja, intrekken"}
                </button>
                <button onClick={() => setWithdrawConfirm(false)} className="btn-secondary text-sm">Annuleren</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setWithdrawConfirm(true)} className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Bevinding intrekken
            </button>
          )}
        </div>
      )}

      {/* Withdrawn: edit + resubmit for own issue */}
      {isWithdrawn && isOwnIssue && (
        <div className="card p-6 mb-4 border-gray-200">
          <h3 className="font-semibold text-slate-900 mb-4">Bevinding aanpassen en opnieuw indienen</h3>
          <div className="space-y-3 mb-4">
            <input className="input text-sm" placeholder="Titel *" value={editForm.title || ""} onChange={e => setEditForm({...editForm, title: e.target.value})} />
            <textarea className="input text-sm resize-none" rows={4} placeholder="Beschrijving *" value={editForm.description || ""} onChange={e => setEditForm({...editForm, description: e.target.value})} />
            <div className="flex gap-3">
              <select className="input text-sm" value={editForm.type || "BUG"} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                <option value="BUG">Fout</option>
                <option value="WISH">Wens</option>
                <option value="BLOCKER">Blokkade</option>
              </select>
              <select className="input text-sm" value={editForm.impact || "MEDIUM"} onChange={e => setEditForm({...editForm, impact: e.target.value})}>
                <option value="CRITICAL">Kritiek</option>
                <option value="HIGH">Hoog</option>
                <option value="MEDIUM">Middel</option>
                <option value="LOW">Laag</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resubmitIssue} disabled={saving || !editForm.title || !editForm.description} className="btn-primary text-sm">
              {saving ? "Bezig..." : "Opnieuw indienen"}
            </button>
          </div>
        </div>
      )}

      {/* FM action bar */}
      {isFM && (
        <div className="card p-4 mb-4">
          {resolveConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Bevinding markeren als <strong>opgelost</strong>? De tester krijgt automatisch een hertest-taak.</p>
              <div className="flex gap-2">
                <button onClick={resolveIssue} disabled={saving} className="btn-primary text-sm">
                  {saving ? "Bezig..." : "Ja, oplossen en hertest aanmaken"}
                </button>
                <button onClick={() => setResolveConfirm(false)} className="btn-secondary text-sm">Annuleren</button>
              </div>
            </div>
          ) : rejectConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Bevinding <strong>afwijzen</strong>? De bevinding wordt gesloten zonder hertest.</p>
              <div className="flex gap-2">
                <button onClick={rejectIssue} disabled={saving} className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  {saving ? "Bezig..." : "Ja, afwijzen"}
                </button>
                <button onClick={() => setRejectConfirm(false)} className="btn-secondary text-sm">Annuleren</button>
              </div>
            </div>
          ) : withdrawConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Bevinding <strong>intrekken</strong>? De actie wordt gelogd en de melder kan hem opnieuw indienen.</p>
              <div className="flex gap-2">
                <button onClick={withdrawIssue} disabled={saving} className="text-sm bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  {saving ? "Bezig..." : "Ja, intrekken"}
                </button>
                <button onClick={() => setWithdrawConfirm(false)} className="btn-secondary text-sm">Annuleren</button>
              </div>
            </div>
          ) : markWishConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Bevinding aanmerken als <strong>wens</strong>? De bevinding verdwijnt uit de bevindingen en komt op de wenslijst te staan.</p>
              <div className="flex gap-2">
                <button onClick={markAsWish} disabled={saving} className="flex items-center gap-2 text-sm bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {saving ? "Bezig..." : "Ja, aanmerken als wens"}
                </button>
                <button onClick={() => setMarkWishConfirm(false)} className="btn-secondary text-sm">Annuleren</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {isOpen && !issue.retestRequired && (
                <button onClick={() => setResolveConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Oplossen (hertest aanmaken)
                </button>
              )}
              {isOpen && (
                <>
                  <button onClick={() => setRejectConfirm(true)} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors">
                    Afwijzen
                  </button>
                  <button onClick={() => setWithdrawConfirm(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Intrekken
                  </button>
                  {!isWish && (
                    <button onClick={() => setMarkWishConfirm(true)} className="flex items-center gap-2 px-4 py-2 border border-pink-200 text-pink-600 text-sm rounded-lg hover:bg-pink-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Aanmerken als wens
                    </button>
                  )}
                </>
              )}
              {!editMode && (
                <button onClick={() => setEditMode(true)} className="btn-secondary text-sm">Bewerken</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit form (FM) */}
      {editMode && isFM && (
        <div className="card p-6 mb-4">
          <h3 className="font-semibold text-slate-900 mb-4">Bevinding bewerken</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Impact</label>
            <select className="input w-48" value={editForm.impact} onChange={e => setEditForm({...editForm, impact: e.target.value})}>
              <option value="CRITICAL">Kritiek</option>
              <option value="HIGH">Hoog</option>
              <option value="MEDIUM">Middel</option>
              <option value="LOW">Laag</option>
            </select>
          </div>
          <div className="space-y-3 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editForm.hasWorkaround} onChange={e => setEditForm({...editForm, hasWorkaround: e.target.checked})} className="rounded" />
              Workaround aanwezig
            </label>
            {editForm.hasWorkaround && (
              <textarea className="input resize-none" rows={2} placeholder="Beschrijf de workaround..." value={editForm.workaroundNote} onChange={e => setEditForm({...editForm, workaroundNote: e.target.value})} />
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editForm.businessAccepted} onChange={e => setEditForm({...editForm, businessAccepted: e.target.checked})} className="rounded" />
              Business akkoord (restpunt/nazorg)
            </label>
            {editForm.businessAccepted && (
              <textarea className="input resize-none" rows={2} placeholder="Toelichting akkoord..." value={editForm.businessAcceptNote} onChange={e => setEditForm({...editForm, businessAcceptNote: e.target.value})} />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={updateIssue} disabled={saving} className="btn-primary text-sm">
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
            <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">Annuleren</button>
          </div>
        </div>
      )}

      {/* Metadata summary */}
      {!editMode && (
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-500">Workaround: </span>
              <span className={issue.hasWorkaround ? "text-green-700" : "text-slate-700"}>{issue.hasWorkaround ? "Ja" : "Nee"}</span>
              {issue.workaroundNote && <p className="text-slate-600 mt-1 text-xs">{issue.workaroundNote}</p>}
            </div>
            <div>
              <span className="font-medium text-slate-500">Business akkoord: </span>
              <span className={issue.businessAccepted ? "text-green-700" : "text-slate-700"}>{issue.businessAccepted ? "Ja" : "Nee"}</span>
              {issue.businessAcceptNote && <p className="text-slate-600 mt-1 text-xs">{issue.businessAcceptNote}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="card">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Reacties ({issue.comments?.length ?? 0})</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {issue.comments?.map((c: any) => (
            <div key={c.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-slate-900">{c.user.name}</span>
                <span className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={addComment} className="p-4 border-t border-slate-100">
          <textarea
            className="input resize-none mb-2"
            rows={3}
            placeholder="Reactie toevoegen..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            required
          />
          <button type="submit" disabled={saving || !comment.trim()} className="btn-primary text-sm">
            {saving ? "Verzenden..." : "Reageren"}
          </button>
        </form>
      </div>
    </div>
  );
}
