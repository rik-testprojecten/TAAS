"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// G + key navigation shortcuts
const GO_SHORTCUTS: Record<string, string> = {
  d: "/dashboard",
  p: "/projects",
  i: "/issues",
  t: "/tasks",
  r: "/reports",
  u: "/users",
  a: "/audit",
};

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const waitingForG = useRef(false);
  const gTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || (e.target as HTMLElement).isContentEditable;

    // ? → help overlay (outside inputs)
    if (e.key === "?" && !inInput && !e.metaKey && !e.ctrlKey) {
      setShowHelp((s) => !s);
      return;
    }

    // Escape → close help
    if (e.key === "Escape") {
      setShowHelp(false);
      waitingForG.current = false;
      return;
    }

    if (inInput) return;

    // Ctrl+K / Cmd+K → search (dispatches custom event for SearchModal)
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("taas:open-search"));
      return;
    }

    // G → then letter shortcuts
    if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
      waitingForG.current = true;
      if (gTimeout.current) clearTimeout(gTimeout.current);
      gTimeout.current = setTimeout(() => { waitingForG.current = false; }, 1500);
      return;
    }

    if (waitingForG.current) {
      waitingForG.current = false;
      if (gTimeout.current) clearTimeout(gTimeout.current);
      const route = GO_SHORTCUTS[e.key];
      if (route) {
        e.preventDefault();
        router.push(route);
      }
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <>
      {children}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHelp(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900 text-lg">Sneltoetsen</h2>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Zoeken</span>
                <kbd className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono">Ctrl K</kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Sneltoetsen tonen</span>
                <kbd className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono">?</kbd>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Ga naar... (G dan)</p>
                {Object.entries(GO_SHORTCUTS).map(([key, route]) => (
                  <div key={key} className="flex items-center justify-between text-sm py-1">
                    <span className="text-slate-600">{route.replace("/", "").replace("-", " ") || "dashboard"}</span>
                    <kbd className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono">G {key.toUpperCase()}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
