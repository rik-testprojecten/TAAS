import { PrismaClient, PlatformRole, TenantRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

// Resolve a seed password from an env var, or generate a strong random one.
// Plaintext is never printed; generated passwords must be reset via the
// "wachtwoord vergeten / instellen" flow or shared through a secure channel.
function seedPassword(envVar: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  return randomBytes(18).toString("base64url");
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Refusing to seed demo data in production. Set ALLOW_PROD_SEED=true to override.",
    );
  }

  console.log("Seeding database...");

  // SuperAdmin
  const superAdminPassword = await bcrypt.hash(seedPassword("SEED_SUPERADMIN_PASSWORD"), 10);
  await prisma.platformUser.upsert({
    where: { email: "admin@rhoost.nl" },
    update: {},
    create: {
      email: "admin@rhoost.nl",
      name: "Rhoost SuperAdmin",
      role: PlatformRole.SUPER_ADMIN,
      password: superAdminPassword,
    },
  });

  // Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-gemeente" },
    update: {},
    create: {
      name: "Demo Gemeente",
      slug: "demo-gemeente",
    },
  });

  // TenantAdmin
  const adminPassword = await bcrypt.hash(seedPassword("SEED_TENANTADMIN_PASSWORD"), 10);
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo-gemeente.nl" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo-gemeente.nl",
      name: "Demo Admin",
      roles: [TenantRole.TENANT_ADMIN],
      password: adminPassword,
    },
  });

  // Tester user
  const testerPassword = await bcrypt.hash(seedPassword("SEED_TESTER_PASSWORD"), 10);
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "tester@demo-gemeente.nl" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "tester@demo-gemeente.nl",
      name: "Demo Tester",
      roles: [TenantRole.TESTER],
      password: testerPassword,
    },
  });

  // Functional Manager
  const fbPassword = await bcrypt.hash(seedPassword("SEED_MANAGER_PASSWORD"), 10);
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "fb@demo-gemeente.nl" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "fb@demo-gemeente.nl",
      name: "Demo Functioneel Beheerder",
      roles: [TenantRole.FUNCTIONAL_MANAGER],
      password: fbPassword,
    },
  });

  // Tweede demo-klant — met verplichte 2FA, om MFA te demonstreren
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: "demo-provincie" },
    update: {},
    create: {
      name: "Demo Provincie",
      slug: "demo-provincie",
      mfaRequired: true,
    },
  });

  // Gedeeld e-mailadres dat bij BEIDE klanten hoort. De gebruiker kiest na het
  // inloggen welke klantomgeving hij/zij wil openen.
  const sharedPassword = await bcrypt.hash(seedPassword("SEED_CONSULTANT_PASSWORD"), 10);
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "consultant@rhoost.nl" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "consultant@rhoost.nl",
      name: "Gedeelde Consultant",
      roles: [TenantRole.TENANT_ADMIN],
      password: sharedPassword,
    },
  });
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: "consultant@rhoost.nl" } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: "consultant@rhoost.nl",
      name: "Gedeelde Consultant",
      roles: [TenantRole.TENANT_ADMIN],
      password: sharedPassword,
    },
  });

// ─── Templates ──────────────────────────────────────────────────────────────
  // Each template has category (Module key from src/lib/modules.ts).
  // Module links control which tenants see the template in the wizard.
  // See src/lib/modules.ts for the full hierarchy.
  type TplSeed = {
    id: string;
    name: string;
    category: string;
    description: string;
    moduleLinks: string[];
    steps: { order: number; title: string; instruction: string; expectedResult: string }[];
  };

  const templates: TplSeed[] = [
    // ── HRM & Payroll ─────────────────────────────────────────────────────────
    {
      id: "tpl-hrm-dossier",
      name: "Medewerkerdossier — Instroom",
      category: "HRM",
      description: "Nieuw medewerker aanmaken, arbeidsrelatie vastleggen en in dienst nemen.",
      moduleLinks: ["HRM", "HRM_DOSSIER"],
      steps: [
        { order: 1, title: "Nieuwe medewerker aanmaken", instruction: "Navigeer naar HR > Medewerkers > Nieuw. Vul naam, BSN, geboortedatum, startdatum, functie en afdeling in.", expectedResult: "Medewerker aangemaakt met status 'Concept'" },
        { order: 2, title: "Arbeidsovereenkomst vastleggen", instruction: "Open de medewerker → Arbeidsrelatie. Vul contracttype, duur, uren/week en salaris in.", expectedResult: "Arbeidsovereenkomst opgeslagen en gekoppeld aan medewerker" },
        { order: 3, title: "Indienst verwerken", instruction: "Klik op 'In dienst nemen'. Controleer ingangsdatum en bevestig.", expectedResult: "Status 'In dienst'. Looncomponenten actief per startdatum." },
        { order: 4, title: "Salarisstrook controleren", instruction: "Ga naar Salarisadministratie > Berekeningen. Voer proefberekening uit. Controleer brutoloon, belastingen en nettoloon.", expectedResult: "Salarisstrook toont correcte bedragen conform salarisschaal" },
      ],
    },
    {
      id: "tpl-hrm-ats",
      name: "Werving & selectie — Vacature tot aanstelling",
      category: "HRM",
      description: "Vacature publiceren, kandidaten beoordelen en aanstelling verwerken.",
      moduleLinks: ["HRM", "HRM_ATS"],
      steps: [
        { order: 1, title: "Vacature aanmaken", instruction: "Ga naar Werving > Vacatures > Nieuw. Vul functie, afdeling, vereisten en publicatiedatum in.", expectedResult: "Vacature aangemaakt met status 'Concept'" },
        { order: 2, title: "Kandidaat toevoegen", instruction: "Open de vacature en voeg een testkandiaat toe via 'Nieuwe sollicitant'. Vul NAW-gegevens in.", expectedResult: "Kandidaat gekoppeld aan vacature in fase 'Screening'" },
        { order: 3, title: "Sollicitatiegesprek plannen", instruction: "Selecteer de kandidaat en plan een gesprek via 'Afspraak toevoegen'. Koppel gesprekspartners.", expectedResult: "Gesprek zichtbaar in agenda met juiste genodigden" },
        { order: 4, title: "Aanstellingsbesluit verwerken", instruction: "Stel status in op 'Aangenomen'. Klik op 'Naar instroom'. Controleer dat medewerker aangemaakt wordt.", expectedResult: "Medewerker-record aangemaakt vanuit kandidaat; vacature gesloten" },
      ],
    },
    {
      id: "tpl-hrm-onboarding",
      name: "Onboarding nieuw personeel",
      category: "HRM",
      description: "Onboardingproces inclusief toegangsrechten, buddy-koppeling en checklist.",
      moduleLinks: ["HRM", "HRM_ONBOARDING"],
      steps: [
        { order: 1, title: "Onboarding-checklist activeren", instruction: "Ga naar de medewerker → Onboarding. Activeer de standaard onboarding-checklist.", expectedResult: "Checklist zichtbaar met openstaande taken" },
        { order: 2, title: "Buddy / manager koppelen", instruction: "Wijs een buddy en directe manager toe aan de nieuwe medewerker.", expectedResult: "Buddy en manager zichtbaar op medewerkerprofiel" },
        { order: 3, title: "Toegangsrechten aanvragen", instruction: "Stuur vanuit AFAS een autorisatie-aanvraag voor de benodigde rollen.", expectedResult: "Aanvraag verstuurd en zichtbaar in workflow" },
        { order: 4, title: "Checklist afsluiten", instruction: "Controleer alle taken op de onboarding-checklist. Zet status op 'Afgerond'.", expectedResult: "Onboarding volledig afgerond; medewerker actief" },
      ],
    },
    {
      id: "tpl-hrm-verlof",
      name: "Verlof- en verzuimregistratie",
      category: "HRM",
      description: "Verlofaanvraag indienen, accorderen en verwerken; ziekmelding registreren.",
      moduleLinks: ["HRM", "HRM_VERLOF"],
      steps: [
        { order: 1, title: "Verlofaanvraag indienen", instruction: "Log in als medewerker. Ga naar Verlof > Aanvragen. Selecteer type, periode en noteer reden.", expectedResult: "Aanvraag zichtbaar bij leidinggevende met status 'In behandeling'" },
        { order: 2, title: "Verlof accorderen", instruction: "Log in als leidinggevende. Open de aanvraag en klik op 'Akkoord'.", expectedResult: "Verlof goedgekeurd; saldo bijgewerkt" },
        { order: 3, title: "Ziekmelding registreren", instruction: "Ga naar HR > Verzuim > Nieuwe melding. Vul medewerker, datum en reden in.", expectedResult: "Ziekmelding aangemaakt; verzuimteller actief" },
        { order: 4, title: "Hersteldmelding verwerken", instruction: "Open de verzuimmelding en klik op 'Hersteld melden'. Vul hersteldatum in.", expectedResult: "Verzuim afgesloten; verzuimpercentage bijgewerkt" },
      ],
    },
    {
      id: "tpl-hrm-declaraties",
      name: "Declaratieproces medewerker",
      category: "HRM",
      description: "Onkostendeclaratie aanmaken, controleren en uitbetalen.",
      moduleLinks: ["HRM", "HRM_DECLARATIES"],
      steps: [
        { order: 1, title: "Declaratie aanmaken", instruction: "Log in als medewerker. Ga naar Declaraties > Nieuw. Voeg bonnen toe met bedrag, datum en kostensoort.", expectedResult: "Declaratie aangemaakt met status 'Ingediend'" },
        { order: 2, title: "Declaratie accorderen", instruction: "Log in als leidinggevende. Open de declaratie en controleer bonnen. Klik op 'Akkoord'.", expectedResult: "Declaratie geaccordeerd en door naar financiën" },
        { order: 3, title: "Uitbetaling controleren", instruction: "Controleer of de declaratie meegenomen is in de salarisrun of aparte betaalrun.", expectedResult: "Bedrag zichtbaar op salarisstrook of bancaire overboeking" },
      ],
    },
    {
      id: "tpl-hrm-salaris",
      name: "Salarisverwerking — Maandrun",
      category: "HRM",
      description: "Volledige salarisrun uitvoeren: controle, berekening en afdracht.",
      moduleLinks: ["HRM", "HRM_SALARIS"],
      steps: [
        { order: 1, title: "Mutaties controleren", instruction: "Controleer openstaande salaris-mutaties (nieuwe medewerkers, functiewisselingen, loonswijzigingen) vóór de run.", expectedResult: "Alle mutaties verwerkt; geen openstaande foutmeldingen" },
        { order: 2, title: "Proefberekening uitvoeren", instruction: "Start de proefberekening. Controleer totaalcijfers op plausibiliteit (vergelijk met vorige maand).", expectedResult: "Proefberekening geslaagd zonder blokkerende fouten" },
        { order: 3, title: "Definitieve run starten", instruction: "Bevestig de definitieve salarisrun. Controleer de verwerkingsstatus.", expectedResult: "Run verwerkt; salarisstroken beschikbaar" },
        { order: 4, title: "Afdracht-bestanden controleren", instruction: "Download de betaalbestanden (loonheffing, pensioenafdracht). Controleer bedragen en datums.", expectedResult: "Bestanden gereed voor upload bij belastingdienst/pensioenfonds" },
      ],
    },
    {
      id: "tpl-hrm-cao",
      name: "CAO / Looninrichting — Jaarlijkse aanpassing",
      category: "HRM",
      description: "CAO-aanpassingen doorvoeren: salaristabellen, vergoedingen en toeslagen.",
      moduleLinks: ["HRM", "HRM_CAO"],
      steps: [
        { order: 1, title: "Salaristabel bijwerken", instruction: "Ga naar Looninrichting > Salarisschalen. Importeer of pas de nieuwe CAO-tabel aan per ingangsdatum.", expectedResult: "Nieuwe tabel actief per opgegeven datum" },
        { order: 2, title: "Vaste toeslagen controleren", instruction: "Controleer reiskostenvergoeding, onregelmatigheidstoeslag en andere vaste componenten.", expectedResult: "Alle componenten overeenkomen met de CAO-tekst" },
        { order: 3, title: "Proefberekening voor steekproef", instruction: "Voer een proefberekening uit voor 3 medewerkers uit verschillende schalen.", expectedResult: "Brutoloon past bij de nieuwe CAO-schaal" },
      ],
    },
    {
      id: "tpl-hrm-performance",
      name: "Performance & Talentmanagement — Beoordelingscyclus",
      category: "HRM",
      description: "Beoordelingsgesprek plannen, afspraken vastleggen en beoordeling afronden.",
      moduleLinks: ["HRM", "HRM_PERFORMANCE"],
      steps: [
        { order: 1, title: "Beoordelingsformulier aanmaken", instruction: "Ga naar Performance > Beoordelingen > Nieuw. Selecteer medewerker en beoordelingsperiode.", expectedResult: "Formulier aangemaakt en zichtbaar bij medewerker en manager" },
        { order: 2, title: "Zelfevaluatie invullen", instruction: "Log in als medewerker. Open de beoordeling en vul zelfevaluatie in.", expectedResult: "Zelfevaluatie opgeslagen" },
        { order: 3, title: "Managerbeoordeling toevoegen", instruction: "Log in als manager. Open de beoordeling en vul scores en toelichting in.", expectedResult: "Managerbeoordeling opgeslagen naast zelfevaluatie" },
        { order: 4, title: "Beoordeling afronden en archiveren", instruction: "Zet status op 'Afgerond'. Controleer dat de beoordeling in het dossier opgeslagen is.", expectedResult: "Beoordeling gearchiveerd in medewerkerdossier" },
      ],
    },

    // ── Financieel ────────────────────────────────────────────────────────────
    {
      id: "tpl-fin-grootboek",
      name: "Grootboek — Periode-afsluiting",
      category: "FIN",
      description: "Maandelijkse afsluiting van het grootboek inclusief controles en journaalposten.",
      moduleLinks: ["FIN", "FIN_GROOTBOEK"],
      steps: [
        { order: 1, title: "Openstaande boekingen controleren", instruction: "Controleer of alle facturen, betalingen en memoriaalboekingen verwerkt zijn voor de periode.", expectedResult: "Geen openstaande conceptboekingen" },
        { order: 2, title: "Memoriaalpost aanmaken", instruction: "Ga naar Financieel > Journaalposten > Nieuw. Voer een correctieboeking in met debet- en creditbedrag.", expectedResult: "Journaalpost geboekt; saldi kloppen" },
        { order: 3, title: "Proefbalans genereren", instruction: "Ga naar Rapportages > Proefbalans. Selecteer de afgesloten periode.", expectedResult: "Proefbalans toont evenwichtig debet/credit" },
        { order: 4, title: "Periode vergrendelen", instruction: "Vergrendel de boekhoudperiode zodat er geen wijzigingen meer mogelijk zijn.", expectedResult: "Periode vergrendeld" },
      ],
    },
    {
      id: "tpl-fin-debcred",
      name: "Debiteuren- en crediteurenbeheer",
      category: "FIN",
      description: "Debiteurenherinnering sturen en crediteurenstand reconciliëren.",
      moduleLinks: ["FIN", "FIN_DEBCRED"],
      steps: [
        { order: 1, title: "Openstaande debiteuren overzicht", instruction: "Ga naar Debiteuren > Openstaande posten. Filter op vervaldatum > 30 dagen.", expectedResult: "Lijst met te herinneren debiteuren" },
        { order: 2, title: "Herinneringsrun uitvoeren", instruction: "Selecteer debiteuren en klik op 'Herinnering versturen'. Kies herinneringsniveau.", expectedResult: "Herinneringen verstuurd; herinneringsdatum bijgewerkt" },
        { order: 3, title: "Crediteurenstand reconciliëren", instruction: "Vergelijk de crediteurenstand in AFAS met het rekeningafschrift van de leverancier.", expectedResult: "Saldi komen overeen of verschil is verklaard" },
      ],
    },
    {
      id: "tpl-fin-facturatie",
      name: "Verkoopfactuur aanmaken en versturen",
      category: "FIN",
      description: "Verkoopfactuur aanmaken op basis van order, controleren en versturen.",
      moduleLinks: ["FIN", "FIN_FACTURATIE"],
      steps: [
        { order: 1, title: "Factuur aanmaken", instruction: "Ga naar Financieel > Verkoopfacturen > Nieuw. Selecteer klant, BTW-code en voeg factuurregels toe.", expectedResult: "Factuur aangemaakt als concept" },
        { order: 2, title: "Factuur controleren", instruction: "Controleer klantgegevens, factuurdatum, betalingstermijn en regelomschrijvingen.", expectedResult: "Geen fouten; factuur klaar voor verzending" },
        { order: 3, title: "Factuur versturen", instruction: "Klik op 'Versturen'. Controleer dat de factuur per e-mail of portal is verzonden.", expectedResult: "Factuur verstuurd; status 'Verzonden'" },
      ],
    },
    {
      id: "tpl-fin-betalingen",
      name: "Betaalrun — Leveranciersbetaling",
      category: "FIN",
      description: "Inkoopfactuur verwerken, accorderen en betaalrun uitvoeren.",
      moduleLinks: ["FIN", "FIN_BETALINGEN", "LOG", "LOG_INKOOP"],
      steps: [
        { order: 1, title: "Inkooporder aanmaken", instruction: "Navigeer naar Inkoop > Orders > Nieuw. Selecteer leverancier, kostenplaats en grootboekrekening.", expectedResult: "Inkooporder aangemaakt met status 'Aanvraag'" },
        { order: 2, title: "Accordering doorlopen", instruction: "Log in als budgethouder en klik op 'Akkoord'. Controleer logging.", expectedResult: "Order geaccordeerd; accordeur vastgelegd" },
        { order: 3, title: "Factuur koppelen en 3-weg match", instruction: "Ga naar Financieel > Facturen > Nieuw. Koppel factuur aan order. Controleer 3-weg match.", expectedResult: "Factuur gekoppeld; match geslaagd" },
        { order: 4, title: "Betaalopdracht aanmaken", instruction: "Voer betaalrun uit. Controleer IBAN, bedrag en valutadatum.", expectedResult: "Betaalopdracht aangemaakt in bank-exportbestand" },
      ],
    },
    {
      id: "tpl-fin-btw",
      name: "BTW-aangifte voorbereiding",
      category: "FIN",
      description: "BTW-saldi controleren en aangiftebestand gereedmaken.",
      moduleLinks: ["FIN", "FIN_BTW"],
      steps: [
        { order: 1, title: "BTW-rapport genereren", instruction: "Ga naar Financieel > BTW > Aangifte. Selecteer aangifteperiode en genereer het rapport.", expectedResult: "Rapport toont BTW te betalen / te ontvangen per code" },
        { order: 2, title: "Saldi controleren", instruction: "Controleer de BTW-rekeningen in het grootboek op afwijkingen.", expectedResult: "BTW-saldi komen overeen met het aangifterapport" },
        { order: 3, title: "Aangifte indienen", instruction: "Exporteer het XBRL-bestand of gebruik de directe koppeling met de Belastingdienst.", expectedResult: "Aangifte ingediend; bevestiging ontvangen" },
      ],
    },
    {
      id: "tpl-fin-kosten",
      name: "Kostenplaatsen & kostendragers — Inrichting check",
      category: "FIN",
      description: "Kostenplaatsstructuur controleren en herboeken van kosten.",
      moduleLinks: ["FIN", "FIN_KOSTEN"],
      steps: [
        { order: 1, title: "Kostenplaatsstructuur controleren", instruction: "Ga naar Financieel > Kostenplaatsen. Controleer of alle actieve afdelingen een kostenplaats hebben.", expectedResult: "Alle afdelingen gekoppeld aan actieve kostenplaats" },
        { order: 2, title: "Kost herboeken", instruction: "Maak een memoriaalpost om kosten van de ene kostenplaats naar de andere te verplaatsen.", expectedResult: "Kosten geboekt op juiste kostenplaats" },
      ],
    },
    {
      id: "tpl-fin-rapportages",
      name: "Rapportages & Jaarrekening — Jaarafsluiting",
      category: "FIN",
      description: "Jaarrekening-rapporten genereren en controleren voor de externe accountant.",
      moduleLinks: ["FIN", "FIN_RAPPORTAGES"],
      steps: [
        { order: 1, title: "Balans genereren", instruction: "Ga naar Rapportages > Balans. Selecteer boekjaar en genereer de balans.", expectedResult: "Balans toont activa en passiva in evenwicht" },
        { order: 2, title: "W&V-rekening controleren", instruction: "Genereer de winst-en-verliesrekening. Vergelijk met het voorgaande jaar.", expectedResult: "W&V-rekening klopt; afwijkingen verklaard" },
        { order: 3, title: "Consolidatie export", instruction: "Exporteer de jaarrekening in het gewenste formaat (PDF/Excel) voor de accountant.", expectedResult: "Export beschikbaar en volledig" },
      ],
    },

    // ── CRM ────────────────────────────────────────────────────────────────────
    {
      id: "tpl-crm-relaties",
      name: "Relatiebeheer — Nieuwe relatie aanmaken",
      category: "CRM",
      description: "Debiteur, crediteur of prospect aanmaken en volledig inrichten.",
      moduleLinks: ["CRM", "CRM_RELATIES"],
      steps: [
        { order: 1, title: "Relatie aanmaken", instruction: "Ga naar CRM > Relaties > Nieuw. Vul type (debiteur/crediteur/prospect), naam, adres en KvK-nummer in.", expectedResult: "Relatie aangemaakt met status 'Actief'" },
        { order: 2, title: "Contactpersoon toevoegen", instruction: "Open de relatie en voeg een contactpersoon toe via het tabblad 'Contacten'.", expectedResult: "Contactpersoon gekoppeld aan relatie" },
        { order: 3, title: "Betalingsafspraken vastleggen", instruction: "Stel betalingstermijn en bankrekening in op de relatie.", expectedResult: "Betalingsgegevens opgeslagen" },
      ],
    },
    {
      id: "tpl-crm-contact",
      name: "Contactmomenten & communicatie",
      category: "CRM",
      description: "Contactmoment registreren en opvolgtaak aanmaken.",
      moduleLinks: ["CRM", "CRM_CONTACT"],
      steps: [
        { order: 1, title: "Contactmoment vastleggen", instruction: "Open een relatie en ga naar 'Contactmomenten'. Voeg een nieuw moment toe (type, datum, samenvatting).", expectedResult: "Contactmoment zichtbaar in de tijdlijn van de relatie" },
        { order: 2, title: "Opvolgtaak aanmaken", instruction: "Koppel een taak aan het contactmoment met deadline en verantwoordelijke.", expectedResult: "Taak zichtbaar in het taakscherm van de verantwoordelijke" },
      ],
    },
    {
      id: "tpl-crm-verkoop",
      name: "Verkoopkansen (opportunities) — Beheer",
      category: "CRM",
      description: "Verkoopkans aanmaken, kansen doorlopen en deal sluiten.",
      moduleLinks: ["CRM", "CRM_VERKOOP"],
      steps: [
        { order: 1, title: "Opportunity aanmaken", instruction: "Ga naar CRM > Verkoopkansen > Nieuw. Koppel relatie, vul omzetschatting en verwachte sluitingsdatum in.", expectedResult: "Opportunity aangemaakt in fase 'Prospect'" },
        { order: 2, title: "Offerte opstellen", instruction: "Maak een offerte vanuit de opportunity. Voeg producten/diensten en prijzen toe.", expectedResult: "Offerte verstuurd en gelinkt aan opportunity" },
        { order: 3, title: "Deal sluiten", instruction: "Zet de opportunity op 'Gewonnen'. Controleer dat een order of project aangemaakt wordt.", expectedResult: "Opportunity gesloten; vervolgrecord aangemaakt" },
      ],
    },
    {
      id: "tpl-crm-campagnes",
      name: "Campagnes & Marketing — Mailcampagne",
      category: "CRM",
      description: "Mailcampagne aanmaken, doelgroep samenstellen en resultaten meten.",
      moduleLinks: ["CRM", "CRM_CAMPAGNES"],
      steps: [
        { order: 1, title: "Campagne aanmaken", instruction: "Ga naar CRM > Campagnes > Nieuw. Vul naam, type (e-mail), periode en budget in.", expectedResult: "Campagne aangemaakt" },
        { order: 2, title: "Doelgroep samenstellen", instruction: "Voeg een selectie van relaties toe op basis van filters (bijv. branche, regio).", expectedResult: "Doelgroeplijst gevuld met geselecteerde relaties" },
        { order: 3, title: "Mailing versturen en respons controleren", instruction: "Verstuur de campagne. Controleer na 24 uur de open- en klikratio.", expectedResult: "Statistieken zichtbaar in campagneoverzicht" },
      ],
    },
    {
      id: "tpl-crm-dossiers",
      name: "Klantdossier — Inrichting en archivering",
      category: "CRM",
      description: "Klantdossier opbouwen met documenten, contacthistorie en notities.",
      moduleLinks: ["CRM", "CRM_DOSSIERS"],
      steps: [
        { order: 1, title: "Document toevoegen", instruction: "Open het klantdossier en upload een contract of offerte via 'Bestanden toevoegen'.", expectedResult: "Document opgeslagen in dossier" },
        { order: 2, title: "Notitie vastleggen", instruction: "Voeg een interne notitie toe aan het dossier met context van de klantrelatie.", expectedResult: "Notitie zichtbaar voor alle interne gebruikers" },
        { order: 3, title: "Dossier archiveren", instruction: "Sluit het dossier bij beëindiging van de klantrelatie. Stel archiefdatum in.", expectedResult: "Dossier gearchiveerd en niet meer actief zichtbaar in het standaardoverzicht" },
      ],
    },

    // ── Projecten & uren ──────────────────────────────────────────────────────
    {
      id: "tpl-prj-admin",
      name: "Projectadministratie — Aanmaken en inrichten",
      category: "PRJ",
      description: "Nieuw project aanmaken met fasering, budget en teamleden.",
      moduleLinks: ["PRJ", "PRJ_ADMIN"],
      steps: [
        { order: 1, title: "Project aanmaken", instruction: "Ga naar Projecten > Nieuw. Vul projectnummer, naam, klant, start- en einddatum in.", expectedResult: "Project aangemaakt met status 'In voorbereiding'" },
        { order: 2, title: "Fasen toevoegen", instruction: "Voeg projectfasen toe (bijv. Analyse, Realisatie, Oplevering) met doorlooptijden.", expectedResult: "Fasen zichtbaar in projectplanning" },
        { order: 3, title: "Teamleden koppelen", instruction: "Voeg projectleden toe met rollen (projectleider, consultant, tester).", expectedResult: "Teamleden zichtbaar op project; uren-invoer mogelijk" },
      ],
    },
    {
      id: "tpl-prj-uren",
      name: "Urenregistratie — Week afsluiten",
      category: "PRJ",
      description: "Uren invoeren op project en fase, week indienen en accorderen.",
      moduleLinks: ["PRJ", "PRJ_UREN"],
      steps: [
        { order: 1, title: "Uren invoeren", instruction: "Log in als medewerker. Ga naar Uren > Weekstaat. Voer uren in per dag per project/fase.", expectedResult: "Urenregel aangemaakt per dag" },
        { order: 2, title: "Weekstaat indienen", instruction: "Klik op 'Indienen' voor de volledige week.", expectedResult: "Weekstaat heeft status 'Ingediend'" },
        { order: 3, title: "Weekstaat accorderen", instruction: "Log in als projectmanager. Open de weekstaat en klik op 'Akkoord'.", expectedResult: "Uren geaccordeerd; beschikbaar voor facturatie en nacalculatie" },
      ],
    },
    {
      id: "tpl-prj-budget",
      name: "Budgetbewaking — Overschrijding signaleren",
      category: "PRJ",
      description: "Projectbudget controleren, afwijkingen analyseren en rapporteren.",
      moduleLinks: ["PRJ", "PRJ_BUDGET"],
      steps: [
        { order: 1, title: "Budget vs. realisatie bekijken", instruction: "Ga naar Projecten > [project] > Budget. Vergelijk geraamde vs. gerealiseerde kosten.", expectedResult: "Overzicht toont afwijkingspercentage per fase" },
        { order: 2, title: "Afwijking vastleggen", instruction: "Registreer de oorzaak van een budgetoverschrijding als projectnotitie.", expectedResult: "Notitie zichtbaar voor projectteam" },
        { order: 3, title: "Bijraming aanvragen", instruction: "Maak een bijramingsverzoek aan voor extra budget en stuur ter accordering.", expectedResult: "Bijraming geaccordeerd; budget bijgewerkt" },
      ],
    },
    {
      id: "tpl-prj-nacalc",
      name: "Nacalculatie projectafsluiting",
      category: "PRJ",
      description: "Project afsluiten, nacalculatierapport genereren en afwijkingen documenteren.",
      moduleLinks: ["PRJ", "PRJ_NACALC"],
      steps: [
        { order: 1, title: "Openstaande uren/kosten controleren", instruction: "Controleer of alle uren en kosten geboekt zijn op het project vóór afsluiting.", expectedResult: "Geen openstaande posten" },
        { order: 2, title: "Nacalculatierapport genereren", instruction: "Ga naar Projecten > Rapporten > Nacalculatie. Genereer het rapport voor het project.", expectedResult: "Rapport toont budget vs. realisatie per fase" },
        { order: 3, title: "Project afsluiten", instruction: "Zet de projectstatus op 'Afgesloten'. Controleer dat de projectcode geblokkeerd is voor nieuwe boekingen.", expectedResult: "Project afgesloten; geen nieuwe uren/kosten mogelijk" },
      ],
    },
    {
      id: "tpl-prj-resource",
      name: "Resourceplanning — Bezetting controleren",
      category: "PRJ",
      description: "Medewerker inplannen op project, beschikbaarheid controleren en conflicten oplossen.",
      moduleLinks: ["PRJ", "PRJ_RESOURCE"],
      steps: [
        { order: 1, title: "Bezettingsoverzicht openen", instruction: "Ga naar Projecten > Resourceplanning. Controleer de bezetting voor de komende 4 weken.", expectedResult: "Overzicht toont geplande vs. beschikbare uren per medewerker" },
        { order: 2, title: "Medewerker inplannen", instruction: "Wijs een medewerker toe aan een projectfase voor een specifieke periode.", expectedResult: "Geplande uren zichtbaar op de resourceplanning" },
        { order: 3, title: "Conflict oplossen", instruction: "Controleer of de medewerker niet dubbel ingepland is. Los overlap op door planning te verschuiven.", expectedResult: "Geen overbezetting in de planning" },
      ],
    },
    {
      id: "tpl-prj-facturatie",
      name: "Projectfacturatie — Uren & kosten factureren",
      category: "PRJ",
      description: "Geaccordeerde uren en kosten omzetten naar een projectfactuur.",
      moduleLinks: ["PRJ", "PRJ_FACTURATIE", "FIN", "FIN_FACTURATIE"],
      steps: [
        { order: 1, title: "Facturabel werk selecteren", instruction: "Ga naar Projectfacturatie > Te factureren. Selecteer de geaccordeerde uren en kosten voor deze periode.", expectedResult: "Selectie gevuld met facturabel werk" },
        { order: 2, title: "Factuurconcept aanmaken", instruction: "Klik op 'Factuur aanmaken'. Controleer klant, projectnummer, periode en totaalbedrag.", expectedResult: "Factuurconcept aangemaakt" },
        { order: 3, title: "Factuur versturen", instruction: "Controleer het concept en klik op 'Versturen'. Controleer levering bij klant.", expectedResult: "Factuur verstuurd; status 'Verzonden'; uren afgesloten voor refacturatie" },
      ],
    },

    // ── Logistiek / ERP / Ordermanagement / Inkoop ────────────────────────────
    {
      id: "tpl-log-inkoop",
      name: "Inkoopproces (P2P) — Aanvraag tot betaling",
      category: "LOG",
      description: "Purchase-to-Pay: inkooporder aanmaken, levering bevestigen en factuur verwerken.",
      moduleLinks: ["LOG", "LOG_INKOOP"],
      steps: [
        { order: 1, title: "Inkooporder aanmaken", instruction: "Ga naar Inkoop > Orders > Nieuw. Selecteer leverancier, artikelen/diensten, hoeveelheden en levertermijn.", expectedResult: "Inkooporder aangemaakt met status 'Open'" },
        { order: 2, title: "Levering bevestigen", instruction: "Bij ontvangst: ga naar Inkoop > Leveringen > Nieuw. Koppel aan inkooporder en bevestig ontvangen hoeveelheden.", expectedResult: "Levering geboekt; voorraad bijgewerkt" },
        { order: 3, title: "Factuur koppelen en matchen", instruction: "Koppel de leveranciersfactuur aan order en levering. Controleer 3-weg match.", expectedResult: "Factuur gematcht en klaar voor betaling" },
      ],
    },
    {
      id: "tpl-log-verkoop",
      name: "Verkooporder verwerken",
      category: "LOG",
      description: "Verkooporder aanmaken, bevestigen en klaarzetten voor verzending.",
      moduleLinks: ["LOG", "LOG_VERKOOP"],
      steps: [
        { order: 1, title: "Verkooporder aanmaken", instruction: "Ga naar Verkoop > Orders > Nieuw. Selecteer klant, artikelen en gewenste leverdatum.", expectedResult: "Order aangemaakt met status 'Open'" },
        { order: 2, title: "Orderbevestiging versturen", instruction: "Stuur de orderbevestiging naar de klant via e-mail vanuit de orderkaart.", expectedResult: "Bevestiging verstuurd; order in status 'Bevestigd'" },
        { order: 3, title: "Orderpicklist genereren", instruction: "Genereer de picklist voor het magazijn. Controleer beschikbaarheid op voorraad.", expectedResult: "Picklist beschikbaar voor magazijnmedewerker" },
      ],
    },
    {
      id: "tpl-log-orders",
      name: "Orderbeheer — Status en leverafspraken",
      category: "LOG",
      description: "Orderstatus bewaken, leverafspraken aanpassen en klant informeren.",
      moduleLinks: ["LOG", "LOG_ORDERS"],
      steps: [
        { order: 1, title: "Openstaande orders controleren", instruction: "Ga naar Orderbeheer > Openstaand. Filter op orders met verstreken leverdatum.", expectedResult: "Lijst met te laat orders" },
        { order: 2, title: "Leverdatum aanpassen", instruction: "Open een order en pas de verwachte leverdatum aan. Sla op.", expectedResult: "Nieuwe leverdatum opgeslagen; klant ontvangt automatische update (indien geconfigureerd)" },
      ],
    },
    {
      id: "tpl-log-voorraad",
      name: "Voorraadbeheer — Inventarisatie",
      category: "LOG",
      description: "Voorraadtelling uitvoeren, afwijkingen boeken en rapporteren.",
      moduleLinks: ["LOG", "LOG_VOORRAAD"],
      steps: [
        { order: 1, title: "Tellijst genereren", instruction: "Ga naar Voorraad > Inventarisatie. Genereer een tellijst voor de te controleren locaties.", expectedResult: "Tellijst klaar voor printout of mobiele invoer" },
        { order: 2, title: "Telresultaten invoeren", instruction: "Voer de getelde aantallen in per artikel en locatie.", expectedResult: "Telresultaten ingevoerd" },
        { order: 3, title: "Afwijkingen verwerken", instruction: "Vergelijk telresultaten met systeemvoorraad. Boek correcties voor afwijkingen.", expectedResult: "Voorraadcorrecties geboekt; sysvoorraad bijgewerkt" },
      ],
    },
    {
      id: "tpl-log-magazijn",
      name: "Magazijnbeheer (WMS) — Inslag en uitslag",
      category: "LOG",
      description: "Goederen inslaan op locatie en uitslaan voor verzending.",
      moduleLinks: ["LOG", "LOG_MAGAZIJN"],
      steps: [
        { order: 1, title: "Inslaagopdracht verwerken", instruction: "Scan de binnengekomen goederen en wijs ze toe aan een opslaglocatie via WMS.", expectedResult: "Goederen ingeboekt op locatie; systeem bijgewerkt" },
        { order: 2, title: "Uitslaagopdracht uitvoeren", instruction: "Open de pickorder voor een verkooporder. Scan en verzamel de artikelen van de opgegeven locaties.", expectedResult: "Artikelen gepickt; uitslaaglabel gegenereerd" },
        { order: 3, title: "Verzending gereedmelden", instruction: "Meld de zending gereed in het WMS. Koppel track-and-trace informatie.", expectedResult: "Zending afgeboekt; track-and-trace beschikbaar voor klant" },
      ],
    },
    {
      id: "tpl-log-productie",
      name: "Productie / Assemblage — Werkorder uitvoeren",
      category: "LOG",
      description: "Productiewerkorder aanmaken, materiaalverbruik boeken en eindproduct opleveren.",
      moduleLinks: ["LOG", "LOG_PRODUCTIE"],
      steps: [
        { order: 1, title: "Werkorder aanmaken", instruction: "Ga naar Productie > Werkorders > Nieuw. Selecteer eindproduct, BOM en geplande hoeveelheid.", expectedResult: "Werkorder aangemaakt met benodigde materiaallijst" },
        { order: 2, title: "Materiaaluitgifte boeken", instruction: "Boek de materiaaluitgifte vanuit het magazijn voor de werkorder.", expectedResult: "Materialen afgeboekt van voorraad en gekoppeld aan werkorder" },
        { order: 3, title: "Eindproduct opleveren", instruction: "Sluit de werkorder af. Boek het eindproduct op de voorraadlocatie.", expectedResult: "Eindproduct op voorraad; werkorder gesloten" },
      ],
    },
    {
      id: "tpl-log-leveringen",
      name: "Leveringen & Logistiek — Verzending en track-and-trace",
      category: "LOG",
      description: "Zending aanmaken, pakbon genereren en transporteur koppelen.",
      moduleLinks: ["LOG", "LOG_LEVERINGEN"],
      steps: [
        { order: 1, title: "Verzendopdracht aanmaken", instruction: "Ga naar Logistiek > Verzendingen > Nieuw. Koppel aan verkooporder(s) en selecteer transporteur.", expectedResult: "Verzendopdracht aangemaakt" },
        { order: 2, title: "Pakbon genereren", instruction: "Genereer de pakbon voor de zending. Controleer artikelen en aantallen.", expectedResult: "Pakbon beschikbaar als PDF" },
        { order: 3, title: "Track-and-trace koppelen", instruction: "Voer het track-and-trace nummer in van de vervoerder. Controleer klantnotificatie.", expectedResult: "Track-and-trace gekoppeld; klant geïnformeerd" },
      ],
    },
  ];

  for (const tpl of templates) {
    const record = await prisma.template.upsert({
      where: { id: tpl.id },
      update: {
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
      },
      create: {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
      },
    });

await prisma.templateVersion.upsert({
      where: { id: `${tpl.id}-v1` },
      update: {},
      create: {
        id: `${tpl.id}-v1`,
        templateId: record.id,
        version: "v1.0",
        changelog: "Initiële versie",
        steps: { create: tpl.steps },
      },
    });
    for (const moduleKey of tpl.moduleLinks) {
      await prisma.templateModuleLink.upsert({
        where: { templateId_moduleKey: { templateId: record.id, moduleKey } },
        update: {},
        create: { templateId: record.id, moduleKey },
      });
    }
  }

  console.log(`Seeded ${templates.length} templates across all modules.`);
  console.log("Seed completed!");
  console.log("Accounts created (passwords come from SEED_*_PASSWORD env vars,");
  console.log("or were randomly generated — reset them via the set-password flow):");
  console.log("  Platform:     admin@rhoost.nl");
  console.log("  Tenant admin: admin@demo-gemeente.nl");
  console.log("  Tester:       tester@demo-gemeente.nl");
  console.log("  Manager:      fb@demo-gemeente.nl");
  console.log("  Consultant:   consultant@rhoost.nl (gedeeld over 2 klanten)");
  console.log("  → Demo Provincie vereist 2FA (koppelstap bij eerste inlog)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
