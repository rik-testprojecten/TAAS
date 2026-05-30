// Standaard template-workflows per subonderdeel.
//
// Dit script maakt voor elk subonderdeel (zie src/lib/modules.ts) een
// platform-template aan met een eerste versie (v1.0), bijbehorende stappen en
// een koppeling aan het subonderdeel (TemplateModuleLink). De inhoud is per
// subonderdeel een voorstel voor de standaard AFAS-workflow.
//
// Het script is idempotent: het gebruikt stabiele id's en upserts, dus
// herhaald draaien werkt bestaande templates bij in plaats van te dupliceren.
// Bestaande klant-flows zijn snapshots en worden hier niet geraakt.
//
// Draaien:  npx tsx prisma/seed-templates.ts   (of: npm run db:seed-templates)
// Vereist een bereikbare DATABASE_URL.

import { PrismaClient, TemplateCategory } from "@prisma/client";
import { HRM_TEMPLATES } from "./templates/hrm";
import { FIN_TEMPLATES } from "./templates/fin";
import { CRM_TEMPLATES } from "./templates/crm";
import { PRJ_TEMPLATES } from "./templates/prj";
import { LOG_TEMPLATES } from "./templates/log";
import type { WorkflowTemplate } from "./templates/types";

const prisma = new PrismaClient();

const ALL_TEMPLATES: WorkflowTemplate[] = [
  ...HRM_TEMPLATES,
  ...FIN_TEMPLATES,
  ...CRM_TEMPLATES,
  ...PRJ_TEMPLATES,
  ...LOG_TEMPLATES,
];

async function main() {
  // Stabiele id's afgeleid van de subonderdeel-sleutel, zodat herhaald draaien
  // veilig is.
  const tplId = (key: string) => `tpl-${key.toLowerCase()}`;
  const verId = (key: string) => `tplv-${key.toLowerCase()}-v1`;
  const stepId = (key: string, order: number) => `tpls-${key.toLowerCase()}-${order}`;

  let createdSteps = 0;

  for (const t of ALL_TEMPLATES) {
    // 1. Template
    await prisma.template.upsert({
      where: { id: tplId(t.key) },
      update: {
        name: t.name,
        category: t.category as TemplateCategory,
        description: t.description,
        isActive: true,
      },
      create: {
        id: tplId(t.key),
        name: t.name,
        category: t.category as TemplateCategory,
        description: t.description,
        isActive: true,
      },
    });

    // 2. Versie v1.0
    await prisma.templateVersion.upsert({
      where: { id: verId(t.key) },
      update: { isActive: true },
      create: {
        id: verId(t.key),
        templateId: tplId(t.key),
        version: "v1.0",
        changelog: "Initiele standaard-workflow (AFAS)",
        isActive: true,
      },
    });

    // 3. Stappen
    for (let i = 0; i < t.steps.length; i++) {
      const s = t.steps[i];
      await prisma.templateStep.upsert({
        where: { id: stepId(t.key, i + 1) },
        update: {
          order: i + 1,
          title: s.title,
          instruction: s.instruction,
          expectedResult: s.expectedResult,
        },
        create: {
          id: stepId(t.key, i + 1),
          templateVersionId: verId(t.key),
          order: i + 1,
          title: s.title,
          instruction: s.instruction,
          expectedResult: s.expectedResult,
        },
      });
      createdSteps++;
    }

    // 4. Koppeling aan subonderdeel
    await prisma.templateModuleLink.upsert({
      where: { templateId_moduleKey: { templateId: tplId(t.key), moduleKey: t.key } },
      update: {},
      create: { templateId: tplId(t.key), moduleKey: t.key },
    });
  }

  console.log(
    `Template-seed klaar: ${ALL_TEMPLATES.length} templates, ${createdSteps} stappen, ${ALL_TEMPLATES.length} koppelingen.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
