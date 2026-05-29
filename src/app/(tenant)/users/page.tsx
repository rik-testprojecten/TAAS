"use client";
import { useState, useEffect } from "react";
import { HelpButton } from "@/components/HelpButton";
import { Modal } from "@/components/Modal";
import { Field } from "@/components/Field";
import { TableSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

const ROLE_LABELS: Record<string, string> = {
  TENANT_ADMIN: "Beheerder",
  SCRIPT_WRITER: "Scriptschrijver",
  TESTER: "Tester",
  FUNCTIONAL_MANAGER: "Functioneel Beheerder",
};

const ALL_ROLES = Object.keys(ROLE_LABELS);

type User = { id: string; name: string; email: string; roles: string[]; isActive: boolean };

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roles: ["TESTER"] as string[], sendInvite: true });
  const [inviteResult, setInviteResult] = useState<{ sent: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [emailDomain, setEmailDomain] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<{ id: string; name: string; roles: string[] } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => { load(); loadSettings(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gebruikers konden niet worden geladen");
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.emailDomain) setEmailDomain(data.emailDomain);
      }
    } catch {
      // Niet-kritisch: e-maildomein is optioneel.
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        if (form.sendInvite) setInviteResult({ sent: data.inviteSent });
        setShowNew(false);
        setForm({ name: "", email: "", password: "", roles: ["TESTER"], sendInvite: true });
        toast.success("Gebruiker toegevoegd");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Er is een fout opgetreden");
      }
    } catch {
      setError("Netwerkfout — probeer het opnieuw");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(isActive ? "Gebruiker gedeactiveerd" : "Gebruiker geactiveerd");
    } catch {
      toast.error("Wijzigen van status mislukt");
    }
    await load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editUser.name, roles: editUser.roles }),
      });
      if (res.ok) {
        setEditUser(null);
        toast.success("Gebruiker bijgewerkt");
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || "Er is een fout opgetreden");
      }
    } catch {
      setEditError("Netwerkfout — probeer het opnieuw");
    } finally {
      setEditSaving(false);
    }
  }

  function toggleRole(role: string) {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
    }));
  }

  return (
    <div className="p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gebruikers</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} gebruiker{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Gebruiker toevoegen
        </button>
      </header>

      {inviteResult && (
        <div
          role="status"
          className={`mb-4 p-4 rounded-xl border flex items-center justify-between text-sm ${inviteResult.sent ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}
        >
          <span>{inviteResult.sent ? "Uitnodigings-e-mail verstuurd." : "Gebruiker aangemaakt, maar e-mail kon niet verstuurd worden. Controleer SMTP-instellingen."}</span>
          <button onClick={() => setInviteResult(null)} aria-label="Melding sluiten" className="ml-4 opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : users.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Nog geen gebruikers.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Lijst van gebruikers met hun rollen en status</caption>
            <thead>
              <tr>
                <th scope="col">Gebruiker</th>
                <th scope="col" className="hidden sm:table-cell">Rollen</th>
                <th scope="col"><span className="sr-only">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium text-sm shrink-0" aria-hidden="true">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">{user.name}</div>
                        <div className="text-xs text-slate-400 truncate">{user.email}</div>
                        <div className="flex gap-1 flex-wrap mt-1 sm:hidden">
                          {user.roles.map((r) => (
                            <span key={r} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{ROLE_LABELS[r] || r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map((r) => (
                        <span key={r} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{ROLE_LABELS[r] || r}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditUser({ id: user.id, name: user.name, roles: user.roles })}
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => toggleActive(user.id, user.isActive)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${user.isActive ? "border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200" : "border-green-200 text-green-700 hover:bg-green-50"}`}
                      >
                        {user.isActive ? "Deactiveren" : "Activeren"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nieuwe gebruiker */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Gebruiker toevoegen"
        footer={
          <>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Annuleren</button>
            <button type="submit" form="new-user-form" disabled={saving || form.roles.length === 0} className="btn-primary">
              {saving ? "Toevoegen..." : "Toevoegen"}
            </button>
          </>
        }
      >
        <form id="new-user-form" onSubmit={create} className="space-y-4">
          <Field
            label="Naam"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Jan Jansen"
          />
          <div>
            <Field
              label="E-mailadres"
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder={emailDomain ? `naam@${emailDomain}` : "jan@organisatie.nl"}
            />
            {emailDomain && !form.email.includes("@") && form.email.length > 0 && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, email: prev.email + "@" + emailDomain }))}
                className="mt-1 text-xs text-primary-600 hover:text-primary-800"
              >
                + @{emailDomain} toevoegen
              </button>
            )}
          </div>
          <Field
            label="Tijdelijk wachtwoord"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Min. 8 tekens"
            hint="De gebruiker kan dit later zelf wijzigen via de uitnodigingslink."
          />
          <fieldset>
            <legend className="label">Rollen *</legend>
            <div className="space-y-2">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.roles.includes(value)} onChange={() => toggleRole(value)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.sendInvite} onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })} className="rounded" />
              <span>Uitnodigings-e-mail versturen</span>
            </label>
            <p className="field-hint ml-6">Vereist dat SMTP is ingesteld in de omgevingsvariabelen.</p>
          </div>
          {error && <div role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}
        </form>
      </Modal>

      {/* Gebruiker bewerken */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Gebruiker bewerken"
        footer={
          <>
            <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">Annuleren</button>
            <button type="submit" form="edit-user-form" disabled={editSaving || !editUser || editUser.roles.length === 0} className="btn-primary">
              {editSaving ? "Opslaan..." : "Opslaan"}
            </button>
          </>
        }
      >
        {editUser && (
          <form id="edit-user-form" onSubmit={saveEdit} className="space-y-4">
            <Field
              label="Naam"
              required
              minLength={2}
              value={editUser.name}
              onChange={e => setEditUser({ ...editUser, name: e.target.value })}
            />
            <fieldset>
              <legend className="label">Rollen *</legend>
              <div className="space-y-2">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editUser.roles.includes(role)}
                      onChange={() => setEditUser({
                        ...editUser,
                        roles: editUser.roles.includes(role)
                          ? editUser.roles.filter(r => r !== role)
                          : [...editUser.roles, role],
                      })}
                      className="rounded"
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </fieldset>
            {editError && <div role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{editError}</div>}
          </form>
        )}
      </Modal>

      <HelpButton pageKey="users" />
    </div>
  );
}
