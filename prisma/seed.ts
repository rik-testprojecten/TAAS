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

  const hrTemplate = await prisma.template.upsert({
    where: { id: "tpl-hr-instroom" },
    update: {},
    create: {
      id: "tpl-hr-instroom",
      name: "HR Instroom",
      category: "HRM",
      description: "Standaard testflow voor HR Instroom processen in AFAS",
    },
  });

  await prisma.templateVersion.upsert({
    where: { id: "tplv-hr-instroom-v1" },
    update: {},
    create: {
      id: "tplv-hr-instroom-v1",
      templateId: hrTemplate.id,
      version: "v1.0",
      changelog: "Initiële versie",
      steps: {
        create: [
          {
            order: 1,
            title: "Nieuwe medewerker aanmaken",
            instruction: "Navigeer naar HR > Medewerkers > Nieuw. Vul alle verplichte velden in: naam, BSN, geboortedatum, startdatum, functie, afdeling.",
            expectedResult: "Medewerker is aangemaakt met status 'Concept'",
          },
          {
            order: 2,
            title: "Arbeidsovereenkomst vastleggen",
            instruction: "Open de medewerker. Ga naar tabblad 'Arbeidsrelatie'. Vul contracttype, duur, uren per week, en salaris in.",
            expectedResult: "Arbeidsovereenkomst is opgeslagen en gekoppeld aan medewerker",
          },
          {
            order: 3,
            title: "Indienst verwerken",
            instruction: "Klik op de actie 'In dienst nemen'. Controleer de ingangsdatum. Bevestig de actie.",
            expectedResult: "Medewerker heeft status 'In dienst'. Looncomponenten worden actief per startdatum.",
          },
          {
            order: 4,
            title: "Salarisstrook controleren",
            instruction: "Ga naar Salarisadministratie > Berekeningen. Voer een proefberekening uit voor de nieuwe medewerker. Controleer brutoloon, belastingen en nettoloon.",
            expectedResult: "Salarisstrook toont correcte bedragen conform functie en salarisschaal",
          },
        ],
      },
    },
  });

  const finTemplate = await prisma.template.upsert({
    where: { id: "tpl-fin-inkoop" },
    update: {},
    create: {
      id: "tpl-fin-inkoop",
      name: "Financieel Inkoopproces",
category: "FIN",      description: "Standaard testflow voor het inkoopproces (aanvraag → opdracht → factuur)",
    },
  });

  await prisma.templateVersion.upsert({
    where: { id: "tplv-fin-inkoop-v1" },
    update: {},
    create: {
      id: "tplv-fin-inkoop-v1",
      templateId: finTemplate.id,
      version: "v1.0",
      changelog: "Initiële versie",
      steps: {
        create: [
          {
            order: 1,
            title: "Inkooporder aanmaken",
            instruction: "Navigeer naar Inkoop > Orders > Nieuw. Selecteer leverancier, kostenplaats en grootboekrekening. Voer de regelomschrijving en het bedrag in.",
            expectedResult: "Inkooporder aangemaakt met status 'Aanvraag'",
          },
          {
            order: 2,
            title: "Accordering doorlopen",
            instruction: "Log in als budgethouder. Open de inkooporder en klik op 'Akkoord'. Controleer of de accordering correct gelogd is.",
            expectedResult: "Order heeft status 'Geaccordeerd' en accordeur is vastgelegd",
          },
          {
            order: 3,
            title: "Factuur koppelen",
            instruction: "Ga naar Financieel > Facturen > Nieuw. Koppel de factuur aan de inkooporder. Controleer de 3-weg match (order, levering, factuur).",
            expectedResult: "Factuur is gekoppeld en 3-weg match is geslaagd",
          },
          {
            order: 4,
            title: "Betaalopdracht aanmaken",
            instruction: "Voer een betaalrun uit voor de goedgekeurde factuur. Controleer IBAN, bedrag en valutadatum.",
            expectedResult: "Betaalopdracht is aangemaakt in de bank-export",
          },
        ],
      },
    },
  });

// Module links — which modules activate each template in the wizard
  await prisma.templateModuleLink.upsert({
    where: { templateId_moduleKey: { templateId: hrTemplate.id, moduleKey: "HRM" } },
    update: {},
    create: { templateId: hrTemplate.id, moduleKey: "HRM" },
  });
  await prisma.templateModuleLink.upsert({
    where: { templateId_moduleKey: { templateId: hrTemplate.id, moduleKey: "HRM_DOSSIER" } },
    update: {},
    create: { templateId: hrTemplate.id, moduleKey: "HRM_DOSSIER" },
  });
  await prisma.templateModuleLink.upsert({
    where: { templateId_moduleKey: { templateId: finTemplate.id, moduleKey: "FIN" } },
    update: {},
    create: { templateId: finTemplate.id, moduleKey: "FIN" },
  });
  await prisma.templateModuleLink.upsert({
    where: { templateId_moduleKey: { templateId: finTemplate.id, moduleKey: "FIN_FACTURATIE" } },
    update: {},
    create: { templateId: finTemplate.id, moduleKey: "FIN_FACTURATIE" },  });

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
