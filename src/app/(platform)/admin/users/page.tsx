"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
};

type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive: boolean;
  createdAt: string;
};

const emptyForm = { name: "", email: "", password: "", role: "ADMIN" as "SUPER_ADMIN" | "ADMIN" };

export default function PlatformUsersPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editUser, setEditUser] = useState<PlatformUser | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/platform/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/platform/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm(emptyForm);
      load();
    } else {
      const data = await res.json();
      setError(
        typeof data.error === "string"
          ? data.error
          : data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(", ")
            : "Er is een fout opgetreden"
      );
    }
    setSaving(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/platform/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editUser.name, email: editUser.email, role: editUser.role }),
    });
    if (res.ok) {
      setEditUser(null);
      load();
    } else {
      const data = await res.json();
      setEditError(typeof data.error === "string" ? data.error : "Er is een fout opgetreden");
    }
    setEditSaving(false);
  }

  async function deactivate(user: PlatformUser) {
    if (!confirm(`${user.name} deactiveren?`)) return;
    const res = await fetch(`/api/platform/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Deactiveren mislukt");
      return;
    }
    load();
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platformbeheerders</h1>
          <p className="text-slate-500 text-sm mt-1">
            {users.filter((u) => u.isActive).length} actieve beheerder{users.filter((u) => u.isActive).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Beheerder toevoegen
        </button>
      </div>

      {/* Nieuw beheerder modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Beheerder toevoegen</h2>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                  placeholder="Jan de Vries"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mailadres *</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="jan@rhoost.nl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tijdelijk wachtwoord * (min. 8 tekens)</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rol *</label>
                <div className="flex gap-2">
                  {(["SUPER_ADMIN", "ADMIN"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm({ ...form, role })}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                        form.role === role
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Toevoegen..." : "Toevoegen"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setForm(emptyForm); setError(""); }}
                  className="btn-secondary flex-1"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bewerken modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Beheerder bewerken</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input
                  className="input"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mailadres *</label>
                <input
                  type="email"
                  className="input"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rol *</label>
                <div className="flex gap-2">
                  {(["SUPER_ADMIN", "ADMIN"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditUser({ ...editUser, role })}
                      disabled={role !== "SUPER_ADMIN" && editUser.id === currentUserId}
                      title={
                        role !== "SUPER_ADMIN" && editUser.id === currentUserId
                          ? "U kunt uw eigen SUPER_ADMIN rol niet verwijderen"
                          : undefined
                      }
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        editUser.role === role
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
              {editError && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{editError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editSaving} className="btn-primary flex-1">
                  {editSaving ? "Opslaan..." : "Opslaan"}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gebruikerslijst */}
      <div className="card">
        <div className="divide-y divide-slate-100">
          {users.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Geen beheerders gevonden</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">u zelf</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{u.email} · Aangemaakt {formatDate(u.createdAt)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      u.role === "SUPER_ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ROLE_LABELS[u.role]}
                  </span>
                  <span className={`text-xs ${u.isActive ? "text-green-600" : "text-slate-400"}`}>
                    {u.isActive ? "Actief" : "Inactief"}
                  </span>
                  <button
                    onClick={() => { setEditUser({ ...u }); setEditError(""); }}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    Bewerken
                  </button>
                  {u.isActive && u.id !== currentUserId && (
                    <button
                      onClick={() => deactivate(u)}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      Deactiveren
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
