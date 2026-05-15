"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const path = usePathname();
  const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
        active
          ? "bg-primary-600 text-white"
          : "text-slate-300 hover:bg-forest-600 hover:text-white"
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({
  roles,
  userName,
  tenantName,
  logoBase64,
  onNavigate,
}: {
  roles: string[];
  userName: string;
  tenantName?: string;
  logoBase64?: string | null;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const isAdmin = roles.includes("TENANT_ADMIN");
  const isScriptWriter = roles.includes("SCRIPT_WRITER");
  const isTester = roles.includes("TESTER");
  const isFM = roles.includes("FUNCTIONAL_MANAGER");

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ orgName: tenantName || "", logoBase64: logoBase64 || "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function compressLogo(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = url;
    });
  }

  async function saveSettings() {
    setSettingsSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName: settingsForm.orgName,
        logoBase64: settingsForm.logoBase64 || null,
      }),
    });
    setSettingsSaving(false);
    setShowSettings(false);
    router.refresh();
  }

  const commonItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    },
    {
      href: "/tasks",
      label: "Mijn Taken",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
  ];

  const projectItems: NavItem[] = [
    {
      href: "/projects",
      label: "Projecten",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    },
  ];

  const issueItems: NavItem[] = [
    {
      href: "/issues",
      label: "Bevindingen",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    {
      href: "/my-issues",
      label: "Mijn Bevindingen",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
    {
      href: "/checklists",
      label: "Checklists",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    },
  ];

  const reportItems: NavItem[] = [
    {
      href: "/reports",
      label: "Rapportages",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
  ];

  const adminItems: NavItem[] = [
    {
      href: "/users",
      label: "Gebruikers",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    },
    {
      href: "/go-live",
      label: "Go-live Criteria",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    },
    {
      href: "/audit",
      label: "Audit Trail",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    },
  ];

  return (
    <>
      {/* Logo */}
      <div
        className={`px-4 py-5 border-b border-forest-900 ${isAdmin ? "cursor-pointer hover:bg-forest-600 transition-colors group" : ""}`}
        onClick={isAdmin ? () => { setSettingsForm({ orgName: tenantName || "", logoBase64: logoBase64 || "" }); setShowSettings(true); } : undefined}
        title={isAdmin ? "Naam en logo wijzigen" : undefined}
      >
        <div className="flex items-center gap-2">
          {logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoBase64} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white" />
          ) : (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-500 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm truncate">{tenantName || "TAAS"}</div>
            {tenantName && <div className="text-forest-300 text-xs truncate">Testbeheer</div>}
          </div>
          {isAdmin && (
            <svg className="w-3.5 h-3.5 text-forest-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Naam en logo</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organisatienaam</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                value={settingsForm.orgName}
                onChange={(e) => setSettingsForm({ ...settingsForm, orgName: e.target.value })}
                placeholder="Organisatienaam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
              <div className="flex items-center gap-3">
                {settingsForm.logoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settingsForm.logoBase64} alt="Logo preview" className="w-14 h-14 rounded-lg object-contain border border-slate-200 bg-slate-50 p-1" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs border border-slate-200">Geen</div>
                )}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-sm text-primary-600 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors block w-full text-center"
                  >
                    Logo uploaden
                  </button>
                  {settingsForm.logoBase64 && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, logoBase64: "" })}
                      className="text-xs text-red-500 hover:text-red-700 block w-full text-center"
                    >
                      Logo verwijderen
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const b64 = await compressLogo(file);
                  setSettingsForm({ ...settingsForm, logoBase64: b64 });
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveSettings}
                disabled={settingsSaving}
                className="flex-1 bg-primary-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {settingsSaving ? "Opslaan..." : "Opslaan"}
              </button>
              <button onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoekbalk */}
      <div className="px-3 py-2 border-b border-forest-900">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("taas:open-search"))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-forest-600/50 hover:bg-forest-600 text-forest-300 hover:text-white text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Zoeken (Ctrl+K)"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left">Zoeken...</span>
          <kbd className="hidden sm:block text-xs font-mono bg-forest-800/60 px-1.5 py-0.5 rounded shrink-0">⌃K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Hoofdnavigatie">
        {commonItems.map((item) => <NavLink key={item.href} item={item} onNavigate={onNavigate} />)}

        {(isAdmin || isScriptWriter) && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold text-forest-400 uppercase tracking-wider">Testbeheer</span>
            </div>
            {projectItems.map((item) => <NavLink key={item.href} item={item} onNavigate={onNavigate} />)}
          </>
        )}

        {(isAdmin || isFM || isTester) && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold text-forest-400 uppercase tracking-wider">Kwaliteit</span>
            </div>
            {issueItems.map((item) => <NavLink key={item.href} item={item} onNavigate={onNavigate} />)}
          </>
        )}

        {(isAdmin || isFM) && (
          <>{reportItems.map((item) => <NavLink key={item.href} item={item} onNavigate={onNavigate} />)}</>
        )}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold text-forest-400 uppercase tracking-wider">Beheer</span>
            </div>
            {adminItems.map((item) => <NavLink key={item.href} item={item} onNavigate={onNavigate} />)}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-forest-900">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
            <div className="text-forest-300 text-xs">{roles[0]?.replace("_", " ")}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-forest-600 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Uitloggen
        </button>
      </div>
    </>
  );
}

export function TenantSidebar({
  roles,
  userName,
  tenantName,
  logoBase64,
}: {
  roles: string[];
  userName: string;
  tenantName?: string;
  logoBase64?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-40 md:hidden bg-forest-700 text-white p-2 rounded-lg shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu openen"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar (always visible) */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-forest-700 flex-col z-30 hidden md:flex">
        <SidebarContent
          roles={roles}
          userName={userName}
          tenantName={tenantName}
          logoBase64={logoBase64}
        />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-72 bg-forest-700 flex flex-col z-50 md:hidden transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navigatiemenu"
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="text-forest-300 hover:text-white p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            aria-label="Menu sluiten"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent
          roles={roles}
          userName={userName}
          tenantName={tenantName}
          logoBase64={logoBase64}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}

export function PlatformSidebar({ userName }: { userName: string }) {
  const platformItems: NavItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    },
    {
      href: "/admin/tenants",
      label: "Klanten",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    },
    {
      href: "/admin/templates",
      label: "Templates",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-forest-800 flex flex-col z-10">
      <div className="px-4 py-5 border-b border-forest-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">TAAS Platform</div>
            <div className="text-forest-300 text-xs">Rhoost Admin</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Platform navigatie">
        {platformItems.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>
      <div className="px-3 py-4 border-t border-forest-900">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="text-white text-sm font-medium truncate">{userName}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-forest-700 rounded-lg text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Uitloggen
        </button>
      </div>
    </aside>
  );
}
