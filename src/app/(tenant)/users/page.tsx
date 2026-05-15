"use client";
import { useState, useEffect } from "react";
import { STATUS_COLORS } from "@/lib/utils";
import { HelpButton } from "@/components/HelpButton";

const ROLE_LABELS: Record<string, string> = {
  TENANT_ADMIN: "Beheerder",
  SCRIPT_WRITER: "Scriptschrijver",
  TESTER: "Tester",
  FUNCTIONAL_MANAGER: "Functioneel Beheerder",
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roles: ["TESTER"] as string[], sendInvite: true });
  const [inviteResult, setInviteResult] = useState<{ sent: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [emailDomain, setEmailDomain] = useState<string | null>(null);

  useEffect(() => { load(); loadSettings(); }, []);

  async function load() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadSettings() {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data.emailDomain) setEmailDomain(data.emailDomain);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
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
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Er is een fout opgetreden");
    }
    setSaving(false);
  }

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  function toggleRole(role: string) {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
    }));
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gebruikers</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} gebruiker{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Gebruiker toevoegen
        </button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Gebruiker toevoegen</h2>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Jan Jansen" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mailadres *</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  required
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
              <div>
                <label className="block text-sm font-medium mb-1">Tijdelijk wachtwoord *</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Min. 8 tekens" minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rollen *</label>
                <div className="space-y-2">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.roles.includes(value)}
                        onChange={() => toggleRole(value)}
                        className="rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendInvite}
                    onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })}
                    className="rounded"
                  />
                  <span>Uitnodigings-e-mail versturen</span>
                </label>
                <p className="text-xs text-slate-400 mt-1 ml-6">Vereist dat SMTP is ingesteld in de omgevingsvariabelen.</p>
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || form.roles.length === 0} className="btn-primary flex-1">{saving ? "Toevoegen..." : "Toevoegen"}</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inviteResult && (
        <div className={`mb-4 p-4 rounded-xl border flex items-center justify-between text-sm ${inviteResult.sent ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          <span>{inviteResult.sent ? "Uitnodigings-e-mail verstuurd." : "Gebruiker aangemaakt, maar e-mail kon niet verstuurd worden. Controleer SMTP-instellingen."}</span>
          <button onClick={() => setInviteResult(null)} className="ml-4 opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="card">
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 flex-wrap justify-end max-w-xs">
                  {user.roles.map((r: string) => (
                    <span key={r} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{ROLE_LABELS[r] || r}</span>
                  ))}
                </div>
                <button
                  onClick={() => toggleActive(user.id, user.isActive)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${user.isActive ? "border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200" : "border-green-200 text-green-700 hover:bg-green-50"}`}
                >
                  {user.isActive ? "Deactiveren" : "Activeren"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <HelpButton pageKey="users" />
    </div>
  );
}
