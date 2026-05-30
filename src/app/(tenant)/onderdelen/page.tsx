"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULES, getAllSubmodules } from "@/lib/modules";
import { HelpButton } from "@/components/HelpButton";

type ModuleStat = {
  moduleKey: string;
  flows: number;
  runs: number;
  stepsTotal: number;
  stepsDone: number;
  progressPct: number;
  issuesTotal: number;
  issuesOpen: number;
  issuesResolved: number;
};

const EMPTY: Omit<ModuleStat, "moduleKey"> = {
  flows: 0, runs: 0, stepsTotal: 0, stepsDone: 0, progressPct: 0, issuesTotal: 0, issuesOpen: 0, issuesResolved: 0,
};

export default function OnderdelenPage() {
  const [stats, setStats] = useState<Record<string, ModuleStat>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports/by-module").then((r) => r.json()).catch(() => []),
      fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
    ]).then(([byModule, settings]) => {
      const map: Record<string, ModuleStat> = {};
      if (Array.isArray(byModule)) for (const s of byModule) map[s.moduleKey] = s;
      setStats(map);
      setSelected(Array.isArray(settings?.selectedSubmodules) ? settings.selectedSubmodules : []);
      setLoading(false);
    });
  }, []);

  // Toon de gekozen subonderdelen van de klant, plus subonderdelen waarvoor al
  // data bestaat (ook als ze niet meer geselecteerd zijn).
  const all = getAllSubmodules();
  const visibleKeys = new Set<string>([...selected, ...Object.keys(stats)]);
  const rows = all.filter((s) => visibleKeys.has(s.key));

  // Groepeer per module voor de weergave.
  const byModule = MODULES.map((mod) => ({
    mod,
    subs: rows.filter((r) => r.moduleKey === mod.key),
  })).filter((g) => g.subs.length > 0);

  if (loading) return <div className="p-8 text-slate-500">Laden...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Per onderdeel</h1>
        <p className="text-slate-500 text-sm mt-1">
          Voortgang en bevindingen per subonderdeel. Flows en bevindingen tellen mee zodra ze aan een subonderdeel gekoppeld zijn.
        </p>
      </div>

      {byModule.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          Nog geen subonderdelen in gebruik. Koppel flows aan een subonderdeel om hier overzicht te krijgen.
        </div>
      ) : (
        <div className="space-y-8">
          {byModule.map(({ mod, subs }) => (
            <div key={mod.key}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{mod.emoji} {mod.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subs.map((s) => {
                  const st: ModuleStat = stats[s.key] ? stats[s.key] : { moduleKey: s.key, ...EMPTY };
                  return (
                    <div key={s.key} className="card p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-slate-900 text-sm">{s.label}</h3>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">{st.flows} flow{st.flows !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Testvoortgang */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Getest</span>
                          <span>{st.stepsDone}/{st.stepsTotal} stappen · {st.progressPct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${st.progressPct}%` }} />
                        </div>
                      </div>

                      {/* Bevindingen */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-slate-50 py-2">
                          <div className="text-lg font-bold text-slate-700">{st.issuesTotal}</div>
                          <div className="text-[11px] text-slate-400">Bevindingen</div>
                        </div>
                        <div className="rounded-lg bg-amber-50 py-2">
                          <div className="text-lg font-bold text-amber-600">{st.issuesOpen}</div>
                          <div className="text-[11px] text-slate-400">Open</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 py-2">
                          <div className="text-lg font-bold text-emerald-600">{st.issuesResolved}</div>
                          <div className="text-[11px] text-slate-400">Opgelost</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-slate-400">
        <Link href="/issues" className="hover:text-primary-600">Naar alle bevindingen →</Link>
      </div>

      <HelpButton pageKey="onderdelen" />
    </div>
  );
}
