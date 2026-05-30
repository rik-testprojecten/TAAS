"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MODULES, getModuleLabel, getSubmoduleLabel } from "@/lib/modules";

const PHASES = ["FAT", "GAT", "PAT"] as const;
const PHASE_LABELS: Record<string, string> = { FAT: "FAT – Functionele Acceptatietest", GAT: "GAT – Gebruikers Acceptatietest", PAT: "PAT – Productie Acceptatietest" };
const IMPACTS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const IMPACT_LABELS: Record<string, string> = { CRITICAL: "Kritiek", HIGH: "Hoog", MEDIUM: "Middel", LOW: "Laag" };

type State = {
  selectedModules: string[];
  selectedSubmodules: string[];
  orgName: string;
  emailDomain: string;
  projectName: string;
  logoBase64: string;
  createPhases: boolean;
  selectedPhases: string[];
  selectedTemplates: string[];
  goLiveDate: string;
  goNoGoDate: string;
  maxCritical: string;
  maxHigh: string;
  maxMedium: string;
  maxLow: string;
};

const STEPS = [
  "Modules",
  "Organisatie",
  "Projectnaam",
  "Logo",
  "Testfases",
  "Template flows",
  "Go-live criteria",
  "Instructies",
  "Samenvatting",
];

function domainFromOrg(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".nl";
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 200;
      let { width, height } = img;
      const ratio = Math.min(MAX / width, MAX / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [s, setS] = useState<State>({
    selectedModules: [],
    selectedSubmodules: [],
    orgName: "",
    emailDomain: "",
    projectName: "AFAS Implementatie",
    logoBase64: "",
    createPhases: true,
    selectedPhases: ["FAT", "GAT", "PAT"],
    selectedTemplates: [],
    goLiveDate: "",
    goNoGoDate: "",
    maxCritical: "",
    maxHigh: "",
    maxMedium: "",
    maxLow: "",
  });

  useEffect(() => {
    if (step === 5) {
      // Filter op de gekozen subonderdelen (en modules als fallback), zodat
      // alleen template flows van de gekozen modules worden aangeboden.
      const keys = [...s.selectedSubmodules, ...s.selectedModules];
      const params = keys.map((k) => `key=${encodeURIComponent(k)}`).join("&");
      fetch(`/api/templates${params ? `?${params}` : ""}`)
        .then((r) => r.json())
        .then((d) => setTemplates(Array.isArray(d) ? d : []));
    }
  }, [step]);

  function toggleModule(key: string) {
    const isSelected = s.selectedModules.includes(key);
    if (isSelected) {
      const mod = MODULES.find((m) => m.key === key)!;
      const subKeys = mod.submodules.map((sub) => sub.key);
      setS((prev) => ({
        ...prev,
        selectedModules: prev.selectedModules.filter((k) => k !== key),
        selectedSubmodules: prev.selectedSubmodules.filter((k) => !subKeys.includes(k)),
      }));
      setExpandedModules((prev) => prev.filter((k) => k !== key));
    } else {
      setExpandedModules((prev) => [...prev, key]);
      const mod = MODULES.find((m) => m.key === key)!;
      setS((prev) => ({
        ...prev,
        selectedModules: [...prev.selectedModules, key],
        selectedSubmodules: [...prev.selectedSubmodules, ...mod.submodules.map((sub) => sub.key)],
      }));
    }
  }

  function toggleSubmodule(subKey: string) {
    setS((prev) => ({
      ...prev,
      selectedSubmodules: prev.selectedSubmodules.includes(subKey)
        ? prev.selectedSubmodules.filter((k) => k !== subKey)
        : [...prev.selectedSubmodules, subKey],
    }));
  }

  function toggleExpand(key: string) {
    setExpandedModules((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      setS((prev) => ({ ...prev, logoBase64: b64 }));
    } catch {
      alert("Kon afbeelding niet verwerken. Probeer een PNG of JPG.");
    }
  }

  async function build() {
    setBuilding(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName: s.orgName,
        emailDomain: s.emailDomain,
        logoBase64: s.logoBase64 || null,
        selectedModules: s.selectedModules,
        selectedSubmodules: s.selectedSubmodules,
        projectName: s.projectName || "AFAS Implementatie",
        createPhases: s.createPhases,
        selectedPhases: s.createPhases ? s.selectedPhases : [],
        selectedTemplates: s.selectedTemplates,
        goLiveDate: s.goLiveDate || null,
        goNoGoDate: s.goNoGoDate || null,
        maxCritical: s.maxCritical !== "" ? parseInt(s.maxCritical) : null,
        maxHigh: s.maxHigh !== "" ? parseInt(s.maxHigh) : null,
        maxMedium: s.maxMedium !== "" ? parseInt(s.maxMedium) : null,
        maxLow: s.maxLow !== "" ? parseInt(s.maxLow) : null,
      }),
    });
    router.push("/dashboard");
  }

  const canNext = step === 0 ? true
    : step === 1 ? s.orgName.trim().length > 0
    : step === 2 ? s.projectName.trim().length > 0
    : true;

  function StepDots() {
    return (
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary-500" : i < step ? "w-3 bg-primary-400" : "w-3 bg-white/20"}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="bg-forest-700 px-8 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-white font-bold text-sm">TAAS — Omgeving inrichten</span>
            </div>
            <span className="text-forest-300 text-xs">{step + 1} / {STEPS.length}</span>
          </div>
          <StepDots />
          <div className="text-white/60 text-xs">{STEPS[step]}</div>
        </div>

        {/* Content */}
        <div className="px-8 py-7 min-h-[420px]">
          {/* ── Step 0: Modules ── */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Welke modules gebruik je?</h2>
              <p className="text-slate-500 text-sm mb-5">Selecteer de AFAS-modules die jullie testen. Je kunt ook submodules aanvinken. Overslaan is ook mogelijk.</p>
              <div className="space-y-2">
                {MODULES.map((mod) => {
                  const selected = s.selectedModules.includes(mod.key);
                  const expanded = expandedModules.includes(mod.key);
                  return (
                    <div key={mod.key} className={`rounded-xl border transition-colors ${selected ? "border-primary-300 bg-primary-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center gap-3 p-3">
                        <input type="checkbox" checked={selected} onChange={() => toggleModule(mod.key)} className="rounded" />
                        <span className="text-lg">{mod.emoji}</span>
                        <span className="flex-1 font-medium text-slate-800 text-sm">{mod.label}</span>
                        {selected && (
                          <button onClick={() => toggleExpand(mod.key)} className="text-xs text-primary-600 hover:text-primary-700">
                            {expanded ? "▲ Inklappen" : "▼ Submodules"}
                          </button>
                        )}
                      </div>
                      {selected && expanded && (
                        <div className="px-10 pb-3 grid grid-cols-2 gap-1">
                          {mod.submodules.map((sub) => (
                            <label key={sub.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer py-0.5">
                              <input type="checkbox" checked={s.selectedSubmodules.includes(sub.key)} onChange={() => toggleSubmodule(sub.key)} className="rounded" />
                              {sub.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 1: Organisatie ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Hoe heet jouw organisatie?</h2>
              <p className="text-slate-500 text-sm mb-5">We gebruiken dit om jouw omgeving te personaliseren en e-mailadressen voor te stellen bij nieuwe gebruikers.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Organisatienaam *</label>
                  <input
                    className="input"
                    placeholder="Gemeente Almere"
                    value={s.orgName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setS((prev) => ({ ...prev, orgName: name, emailDomain: domainFromOrg(name) }));
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-maildomein (voorstel voor nieuwe gebruikers)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">@</span>
                    <input
                      className="input flex-1"
                      placeholder="gemeentealmere.nl"
                      value={s.emailDomain}
                      onChange={(e) => setS((prev) => ({ ...prev, emailDomain: e.target.value }))}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Wordt automatisch ingesteld op basis van de naam. Je kunt dit aanpassen.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Projectnaam ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Hoe heet het project?</h2>
              <p className="text-slate-500 text-sm mb-5">Dit wordt de projectnaam in TAAS. Je kunt het later nog aanpassen.</p>
              <input
                className="input text-lg font-medium"
                value={s.projectName}
                onChange={(e) => setS((prev) => ({ ...prev, projectName: e.target.value }))}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2">Suggestie: AFAS Implementatie, AFAS Optimalisatie of AFAS Release</p>
            </div>
          )}

          {/* ── Step 3: Logo ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Logo toevoegen</h2>
              <p className="text-slate-500 text-sm mb-5">Upload het logo van jullie organisatie. Het wordt getoond in de zijbalk en op het dashboard. Je kunt dit ook later toevoegen.</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
              {s.logoBase64 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-xl border border-slate-200 flex items-center justify-center p-3 bg-slate-50">
                    <img src={s.logoBase64} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <button onClick={() => setS((prev) => ({ ...prev, logoBase64: "" }))} className="text-sm text-red-500 hover:text-red-700">
                    Verwijderen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-3xl mb-2">🖼️</div>
                  <div className="text-sm font-medium text-slate-700">Klik om een afbeelding te kiezen</div>
                  <div className="text-xs text-slate-400 mt-1">PNG, JPG of SVG · max 5 MB · automatisch geschaald naar 200×200 px</div>
                </button>
              )}
            </div>
          )}

          {/* ── Step 4: Fases ── */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Testfases (FAT / GAT / PAT)</h2>
              <p className="text-slate-500 text-sm mb-5">Wil je de standaard testfases alvast klaarzetten in het project?</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200">
                  <input type="checkbox" checked={s.createPhases} onChange={(e) => setS((prev) => ({ ...prev, createPhases: e.target.checked }))} className="rounded" id="createPhases" />
                  <label htmlFor="createPhases" className="text-sm font-medium text-slate-800 cursor-pointer">Ja, bereidt de testfases voor in het project</label>
                </div>
                {s.createPhases && (
                  <div className="space-y-2 pl-2">
                    {PHASES.map((ph) => (
                      <label key={ph} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={s.selectedPhases.includes(ph)}
                          onChange={() => setS((prev) => ({
                            ...prev,
                            selectedPhases: prev.selectedPhases.includes(ph)
                              ? prev.selectedPhases.filter((p) => p !== ph)
                              : [...prev.selectedPhases, ph],
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700">{PHASE_LABELS[ph]}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 5: Templates ── */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Template flows toevoegen</h2>
              <p className="text-slate-500 text-sm mb-5">
                {templates.length === 0
                  ? "Er zijn nog geen templates beschikbaar. De platformbeheerder kan templates aanmaken en koppelen aan modules."
                  : `Selecteer templates die je als flow wilt toevoegen aan jouw ${s.selectedPhases.join("/")} fase(s).`}
              </p>
              {templates.length > 0 ? (
                <div className="space-y-4">
                  {MODULES.filter(mod => templates.some(t => t.mainCategory === mod.key)).map(mod => (
                    <div key={mod.key}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm">{mod.emoji}</span>
                        <span className="text-sm font-semibold text-slate-700">{mod.label}</span>
                      </div>
                      <div className="space-y-2 ml-1">
                        {templates.filter(t => t.mainCategory === mod.key).map((t) => {
                          const version = t.versions?.[0];
                          return (
                            <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${s.selectedTemplates.includes(t.id) ? "border-primary-300 bg-primary-50" : "border-slate-200 hover:bg-slate-50"}`}>
                              <input
                                type="checkbox"
                                checked={s.selectedTemplates.includes(t.id)}
                                onChange={() => setS((prev) => ({
                                  ...prev,
                                  selectedTemplates: prev.selectedTemplates.includes(t.id)
                                    ? prev.selectedTemplates.filter((id) => id !== t.id)
                                    : [...prev.selectedTemplates, t.id],
                                }))}
                                className="rounded mt-0.5"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-800">{t.name}</span>
                                  {t.subCategory && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{getSubmoduleLabel(t.subCategory)}</span>}
                                </div>
                                {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                                {version && <div className="text-xs text-slate-400 mt-0.5">{version._count?.steps ?? 0} stappen · versie {version.version}</div>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Geen templates beschikbaar — je kunt dit later handmatig toevoegen via Projecten → Flow
                </div>
              )}
            </div>
          )}

          {/* ── Step 6: Go-live criteria ── */}
          {step === 6 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Go-live criteria</h2>
              <p className="text-slate-500 text-sm mb-5">Optioneel: stel alvast de go-live- en go/no-go-datum in en het maximale aantal open bevindingen per impact. Je kunt dit later aanpassen onder Beheer → Go-live Criteria.</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Go-live datum</label>
                  <input type="date" className="input" value={s.goLiveDate} onChange={(e) => setS((prev) => ({ ...prev, goLiveDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Go/no-go datum</label>
                  <input type="date" className="input" value={s.goNoGoDate} onChange={(e) => setS((prev) => ({ ...prev, goNoGoDate: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">Max. openstaande bevindingen (leeglaten = onbeperkt, 0 = geen toegestaan):</p>
              <div className="grid grid-cols-2 gap-3">
                {IMPACTS.map((imp) => (
                  <div key={imp}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{IMPACT_LABELS[imp]}</label>
                    <input
                      type="number" min={0} className="input text-sm" placeholder="∞"
                      value={imp === "CRITICAL" ? s.maxCritical : imp === "HIGH" ? s.maxHigh : imp === "MEDIUM" ? s.maxMedium : s.maxLow}
                      onChange={(e) => {
                        const v = e.target.value;
                        setS((prev) => ({
                          ...prev,
                          ...(imp === "CRITICAL" ? { maxCritical: v } : {}),
                          ...(imp === "HIGH" ? { maxHigh: v } : {}),
                          ...(imp === "MEDIUM" ? { maxMedium: v } : {}),
                          ...(imp === "LOW" ? { maxLow: v } : {}),
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 7: Instructies ── */}
          {step === 7 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Korte instructie voor TAAS</h2>
              <div className="h-72 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-4 pr-1">
                <p><strong className="text-slate-800">Welkom in TAAS</strong> — het acceptatietestplatform van Rhoost voor AFAS-implementaties.</p>
                <p><strong>Hoe werkt TAAS?</strong> Je maakt een project aan met testfases (FAT, GAT of PAT). Binnen elke fase maak je flows: werkprocessen die je wilt testen. Een flow bestaat uit stappen, elke stap heeft een instructie en een verwacht resultaat.</p>
                <p><strong>Rollen:</strong><br />• Beheerder – beheert gebruikers, projecten en instellingen.<br />• Scriptschrijver – maakt testscripts (flows en stappen).<br />• Tester – voert teststappen uit en meldt bevindingen.<br />• Functioneel Beheerder – beoordeelt bevindingen en keurt goed of af.</p>
                <p><strong>Run starten:</strong> Wanneer een flow klaar is, start je een run. Het systeem maakt automatisch taken aan voor de aangewezen testers. Stappen worden sequentieel ontgrendeld: stap 2 wordt pas beschikbaar als stap 1 is afgerond.</p>
                <p><strong>Bevinding melden:</strong> Testers kunnen op elke stap een of meerdere bevindingen melden. Kies een type (Fout, Wens of Blokkade), een impact (Kritiek, Hoog, Middel, Laag) en een omschrijving. Bevindingen zijn zichtbaar voor de functioneel beheerder.</p>
                <p><strong>Hertest:</strong> Als de functioneel beheerder een bevinding oplost, krijgen de betrokken testers automatisch een hertesttaak. Geslaagde hertests sluiten de bevinding definitief.</p>
                <p><strong>Go-live criteria:</strong> Stel in hoeveel open bevindingen per impactniveau acceptabel zijn op de go/no-go datum. Het dashboard toont in real time of jullie op koers liggen.</p>
                <p><strong>Audit trail:</strong> Elke actie (aanmaken, oplossen, intrekken) wordt gelogd. Admins en functioneel beheerders kunnen het audit trail bekijken onder Beheer → Audit Trail.</p>
                <p><strong>Tip:</strong> Voeg eerst alle testers en functioneel beheerders toe via Beheer → Gebruikers voordat je een run start.</p>
              </div>
            </div>
          )}

          {/* ── Step 8: Samenvatting ── */}
          {step === 8 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Klaar om te bouwen!</h2>
              <p className="text-slate-500 text-sm mb-5">Dit gaan we aanmaken op basis van jouw keuzes:</p>
              <div className="space-y-3">
                <SummaryRow label="Project" value={s.projectName || "AFAS Implementatie"} />
                <SummaryRow label="Organisatie" value={s.orgName || "—"} />
                <SummaryRow label="E-maildomein" value={s.emailDomain ? `@${s.emailDomain}` : "—"} />
                <SummaryRow
                  label="Modules"
                  value={s.selectedModules.length === 0 ? "Niet geselecteerd (lege omgeving)" : s.selectedModules.map((k) => MODULES.find((m) => m.key === k)?.emoji + " " + MODULES.find((m) => m.key === k)?.label).join(", ")}
                />
                <SummaryRow
                  label="Testfases"
                  value={s.createPhases && s.selectedPhases.length > 0 ? s.selectedPhases.join(", ") : "Niet ingesteld"}
                />
                <SummaryRow
                  label="Template flows"
                  value={s.selectedTemplates.length === 0
                    ? "Geen (zelf flows opbouwen)"
                    : `${s.selectedTemplates.length} template${s.selectedTemplates.length !== 1 ? "s" : ""} inlezen`}
                />
                <SummaryRow
                  label="Go-live datum"
                  value={s.goLiveDate || "Niet ingesteld"}
                />
                <SummaryRow
                  label="Go/no-go datum"
                  value={s.goNoGoDate || "Niet ingesteld"}
                />
                <SummaryRow
                  label="Logo"
                  value={s.logoBase64 ? "Geüpload" : "Geen"}
                  extra={s.logoBase64 ? <img src={s.logoBase64} alt="logo" className="w-10 h-10 object-contain rounded border border-slate-200 ml-2" /> : null}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button onClick={() => setStep((p) => p - 1)} className="btn-secondary text-sm">
                ← Vorige
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 ? (
              <>
                {step === 0 && (
                  <button onClick={() => setStep(STEPS.length - 1)} className="text-sm text-slate-400 hover:text-slate-600">
                    Overslaan (lege omgeving)
                  </button>
                )}
                <button
                  onClick={() => setStep((p) => p + 1)}
                  disabled={!canNext}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Volgende →
                </button>
              </>
            ) : (
              <button
                onClick={build}
                disabled={building}
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {building ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Omgeving opbouwen...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Omgeving opbouwen</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-500 w-32 shrink-0 mt-0.5">{label}</span>
      <div className="flex items-center flex-1">
        <span className="text-sm text-slate-800 flex-1">{value}</span>
        {extra}
      </div>
    </div>
  );
}
