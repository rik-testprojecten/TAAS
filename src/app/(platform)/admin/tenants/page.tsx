"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  TENANT_ADMIN: "Beheerder",
  SCRIPT_WRITER: "Scriptschrijver",
  TESTER: "Tester",
  FUNCTIONAL_MANAGER: "Functioneel beheerder",
};

const ALL_ROLES = ["TENANT_ADMIN", "SCRIPT_WRITER", "TESTER", "FUNCTIONAL_MANAGER"];

type TenantUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number; projects: number };
};

const emptyForm = { name: "", email: "", password: "", roles: [] as string[] };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Contactpersonen state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [contacts, setContacts] = useState<TenantUser[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [contactForm, setContactForm] = useState(emptyForm);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [editContact, setEditContact] = useState<TenantUser | null>(null);
  const [editContactSaving, setEditContactSaving] = useState(false);
  const [editContactError, setEditContactError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/platform/tenants");
    const data = await res.json();
    setTenants(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", slug: "" });
      load();
    } else {
      const data = await res.json();
      setError(data.error?.fieldErrors?.slug?.[0] || "Er is een fout opgetreden");
    }
    setSaving(false);
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function openContacts(tenant: Tenant) {
    setSelectedTenant(tenant);
    setContactsLoading(true);
    setShowNewContact(false);
    setContactForm(emptyForm);
    setContactError("");
    const res = await fetch(`/api/platform/tenants/${tenant.id}/users`);
    const data = await res.json();
    setContacts(Array.isArray(data) ? data : []);
    setContactsLoading(false);
  }

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenant) return;
    setContactSaving(true);
    setContactError("");
    const res = await fetch(`/api/platform/tenants/${selectedTenant.id}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    if (res.ok) {
      setShowNewContact(false);
      setContactForm(emptyForm);
      openContacts(selectedTenant);
      load();
    } else {
      const data = await res.json();
      setContactError(
        typeof data.error === "string"
          ? data.error
          : data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(", ")
            : "Er is een fout opgetreden"
      );
    }
    setContactSaving(false);
  }

  async function deactivateContact(userId: string) {
    if (!selectedTenant) return;
    await fetch(`/api/platform/tenants/${selectedTenant.id}/users`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    openContacts(selectedTenant);
    load();
  }

  async function saveEditContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenant || !editContact) return;
    setEditContactSaving(true);
    setEditContactError("");
    const res = await fetch(`/api/platform/tenants/${selectedTenant.id}/users/${editContact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editContact.name, email: editContact.email, roles: editContact.roles }),
    });
    if (res.ok) {
      setEditContact(null);
      openContacts(selectedTenant);
    } else {
      const data = await res.json();
      setEditContactError(typeof data.error === "string" ? data.error : "Er is een fout opgetreden");
    }
    setEditContactSaving(false);
  }

  function toggleRole(role: string) {
    setContactForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }));
  }

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klanten</h1>
          <p className="text-slate-500 text-sm mt-1">{tenants.length} klant{tenants.length !== 1 ? "en" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Klant toevoegen
        </button>
      </div>

      {/* Klant toevoegen modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Klant toevoegen</h2>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam *</label>
                <input className="input" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) }); }} required placeholder="Gemeente Amsterdam" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug (URL-identifier) *</label>
                <input className="input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required placeholder="gemeente-amsterdam" pattern="[a-z0-9-]+" />
                <p className="text-xs text-slate-400 mt-1">Alleen kleine letters, cijfers en koppeltekens</p>
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Toevoegen..." : "Toevoegen"}</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contactpersoon bewerken modal */}
      {editContact && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Contactpersoon bewerken</h2>
            <form onSubmit={saveEditContact} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Naam *</label>
                <input
                  className="input text-sm"
                  value={editContact.name}
                  onChange={e => setEditContact({ ...editContact, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">E-mailadres *</label>
                <input
                  type="email"
                  className="input text-sm"
                  value={editContact.email}
                  onChange={e => setEditContact({ ...editContact, email: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Als dit e-mailadres bij meerdere omgevingen is geregistreerd, kan alleen de gebruiker het zelf wijzigen.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2">Rol(len) *</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditContact({
                        ...editContact,
                        roles: editContact.roles.includes(role)
                          ? editContact.roles.filter(r => r !== role)
                          : [...editContact.roles, role],
                      })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        editContact.roles.includes(role)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
              {editContactError && <div className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded">{editContactError}</div>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editContactSaving || editContact.roles.length === 0}
                  className="btn-primary flex-1 text-sm disabled:opacity-50"
                >
                  {editContactSaving ? "Opslaan..." : "Opslaan"}
                </button>
                <button type="button" onClick={() => setEditContact(null)} className="btn-secondary flex-1 text-sm">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contactpersonen modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-lg">Contactpersonen — {selectedTenant.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{contacts.filter(c => c.isActive).length} actieve contactpersonen</p>
              </div>
              <button onClick={() => setSelectedTenant(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {contactsLoading ? (
                <div className="text-slate-400 text-sm text-center py-8">Laden...</div>
              ) : contacts.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-8">Nog geen contactpersonen</div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {contacts.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.roles.map(r => (
                            <span key={r} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{ROLE_LABELS[r] ?? r}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`badge text-xs ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.isActive ? "Actief" : "Inactief"}
                        </span>
                        <button
                          onClick={() => { setEditContact({ ...c }); setEditContactError(""); }}
                          className="text-xs text-slate-400 hover:text-slate-700"
                        >
                          Bewerken
                        </button>
                        {c.isActive && (
                          <button onClick={() => { if (confirm(`${c.name} deactiveren?`)) deactivateContact(c.id); }} className="text-xs text-slate-400 hover:text-red-500">
                            Deactiveren
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nieuw contactpersoon formulier */}
              {showNewContact ? (
                <form onSubmit={createContact} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                  <h3 className="font-medium text-sm text-slate-800">Contactpersoon toevoegen</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Naam *</label>
                      <input className="input text-sm" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} required placeholder="Jan de Vries" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">E-mailadres *</label>
                      <input className="input text-sm" type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} required placeholder="jan@klant.nl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Tijdelijk wachtwoord * (min. 8 tekens)</label>
                    <input className="input text-sm" type="password" value={contactForm.password} onChange={e => setContactForm(f => ({ ...f, password: e.target.value }))} required minLength={8} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2">Rol(len) *</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            contactForm.roles.includes(role)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {contactError && <div className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded">{contactError}</div>}
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={contactSaving || contactForm.roles.length === 0} className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
                      {contactSaving ? "Toevoegen..." : "Toevoegen"}
                    </button>
                    <button type="button" onClick={() => { setShowNewContact(false); setContactForm(emptyForm); setContactError(""); }} className="btn-secondary text-sm px-4 py-1.5">
                      Annuleren
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowNewContact(true)} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Contactpersoon toevoegen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="divide-y divide-slate-100">
          {tenants.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Nog geen klanten</div>
          ) : tenants.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-400">/{t.slug} · Aangemaakt {formatDate(t.createdAt)}</div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{t._count?.users ?? 0} gebruikers</span>
                <span>{t._count?.projects ?? 0} projecten</span>
                <span className={`badge ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {t.isActive ? "Actief" : "Inactief"}
                </span>
                <button
                  onClick={() => openContacts(t)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Contactpersonen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
