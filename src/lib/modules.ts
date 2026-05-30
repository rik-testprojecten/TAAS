export type Submodule = { key: string; label: string };
export type Module = { key: string; label: string; emoji: string; submodules: Submodule[] };

/**
 * MODULES is the single source of truth for categories throughout the app.
 * Main category = Module.key (e.g. "HRM", "FIN")
 * Sub category  = Submodule.key (e.g. "HRM_DECLARATIES")
 *
 * Super admins edit this list to add/rename categories; all templates and
 * client flows are categorised against this list.
 */
export const MODULES: Module[] = [
  {
    key: "HRM",
    label: "HRM & Payroll",
    emoji: "👥",
    submodules: [
      { key: "HRM_DOSSIER", label: "Medewerkerdossier" },
      { key: "HRM_ATS", label: "Werving & selectie (ATS)" },
      { key: "HRM_ONBOARDING", label: "Onboarding / offboarding" },
      { key: "HRM_VERLOF", label: "Verlof- en verzuimregistratie" },
      { key: "HRM_DECLARATIES", label: "Declaraties" },
      { key: "HRM_FORMATIE", label: "Formatie & organisatie (organigram)" },
      { key: "HRM_SALARIS", label: "Salarisverwerking" },
      { key: "HRM_CAO", label: "CAO / looninrichting" },
      { key: "HRM_PERFORMANCE", label: "Performance / talentmanagement" },
    ],
  },
  {
    key: "FIN",
    label: "Financieel",
    emoji: "💰",
    submodules: [
      { key: "FIN_GROOTBOEK", label: "Grootboekadministratie" },
      { key: "FIN_DEBCRED", label: "Debiteuren / crediteuren" },
      { key: "FIN_FACTURATIE", label: "Facturatie" },
      { key: "FIN_BETALINGEN", label: "Betalingen & bankkoppelingen" },
      { key: "FIN_BTW", label: "BTW / fiscale verwerking" },
      { key: "FIN_KOSTEN", label: "Kostenplaatsen / kostendragers" },
      { key: "FIN_RAPPORTAGES", label: "Rapportages & jaarrekening" },
      { key: "FIN_ABO", label: "Abonnementenfacturatie" },
    ],
  },
  {
    key: "CRM",
    label: "CRM",
    emoji: "🤝",
    submodules: [
      { key: "CRM_RELATIES", label: "Relatiebeheer (debiteuren, crediteuren, prospects)" },
      { key: "CRM_CONTACT", label: "Contactmomenten / communicatie" },
      { key: "CRM_VERKOOP", label: "Verkoopkansen (opportunities)" },
      { key: "CRM_CAMPAGNES", label: "Campagnes & marketing" },
      { key: "CRM_DOSSIERS", label: "Klantdossiers" },
    ],
  },
  {
    key: "PRJ",
    label: "Projecten & uren",
    emoji: "📊",
    submodules: [
      { key: "PRJ_ADMIN", label: "Projectadministratie" },
      { key: "PRJ_UREN", label: "Urenregistratie" },
      { key: "PRJ_BUDGET", label: "Budgetbewaking" },
      { key: "PRJ_NACALC", label: "Nacalculatie" },
      { key: "PRJ_RESOURCE", label: "Resourceplanning" },
      { key: "PRJ_FACTURATIE", label: "Projectfacturatie" },
      { key: "PRJ_RAPPORTAGES", label: "Projectrapportages" },
    ],
  },
  {
    key: "LOG",
    label: "Logistiek / ERP / Ordermanagement / Inkoop",
    emoji: "📦",
    submodules: [
      { key: "LOG_INKOOP", label: "Inkoop (P2P)" },
      { key: "LOG_VERKOOP", label: "Verkoop" },
      { key: "LOG_ORDERS", label: "Orderbeheer" },
      { key: "LOG_VOORRAAD", label: "Voorraadbeheer" },
      { key: "LOG_MAGAZIJN", label: "Magazijnbeheer (WMS)" },
      { key: "LOG_PRODUCTIE", label: "Productie / assemblage (beperkt)" },
      { key: "LOG_LEVERINGEN", label: "Leveringen & logistiek" },
    ],
  },
];

/** All valid main-category keys (e.g. "HRM", "FIN"). */
export const MAIN_CATEGORY_KEYS = MODULES.map((m) => m.key) as [string, ...string[]];

/** All valid sub-category keys (e.g. "HRM_DECLARATIES"). */
export const SUB_CATEGORY_KEYS = MODULES.flatMap((m) => m.submodules.map((s) => s.key)) as [string, ...string[]];

export function getModuleLabel(key: string): string {
  const m = MODULES.find((mod) => mod.key === key);
  return m ? `${m.emoji} ${m.label}` : key;
}

export function getSubmoduleLabel(key: string): string {
  for (const mod of MODULES) {
    const sub = mod.submodules.find((s) => s.key === key);
    if (sub) return sub.label;
  }
  return key;
}

export type SubmoduleInfo = {
  key: string;
  label: string;
  moduleKey: string;
  moduleLabel: string;
  emoji: string;
};

export function getAllSubmodules(): SubmoduleInfo[] {
  return MODULES.flatMap((mod) =>
    mod.submodules.map((sub) => ({
      key: sub.key,
      label: sub.label,
      moduleKey: mod.key,
      moduleLabel: mod.label,
      emoji: mod.emoji,
    })),
  );
}

export function getModuleKeyForSubmodule(submoduleKey: string): string | null {
  const mod = MODULES.find((m) => m.submodules.some((s) => s.key === submoduleKey));
  return mod ? mod.key : null;
}

export function getSubmodules(mainKey: string): Submodule[] {
  return MODULES.find((m) => m.key === mainKey)?.submodules ?? [];
}

export function getParentModule(subKey: string): Module | null {
  return MODULES.find((m) => m.submodules.some((s) => s.key === subKey)) ?? null;
}
