import type { PrismaClient, TemplateCategory } from "@prisma/client";
import { HRM_TEMPLATES } from "./hrm";
import { FIN_TEMPLATES } from "./fin";
import { CRM_TEMPLATES } from "./crm";
import { PRJ_TEMPLATES } from "./prj";
import { LOG_TEMPLATES } from "./log";
import type { WorkflowTemplate } from "./types";

export type { WorkflowTemplate, WorkflowStep, TemplateCat } from "./types";

// Alle standaard AFAS-workflows per subonderdeel (één template per subonderdeel).
export const ALL_TEMPLATES: WorkflowTemplate[] = [
  ...HRM_TEMPLATES,
  ...FIN_TEMPLATES,
  ...CRM_TEMPLATES,
  ...PRJ_TEMPLATES,
  ...LOG_TEMPLATES,
];

// Stabiele id's afgeleid van de subonderdeel-sleutel, zodat herhaald seeden veilig is.
export const templateId = (key: string) => `tpl-${key.toLowerCase()}`;
export const versionId = (key: string) => `tplv-${key.toLowerCase()}-v1`;
export const stepId = (key: string, order: number) => `tpls-${key.toLowerCase()}-${order}`;

export type SeedOptions = {
  // Maak nieuwe templates als concept (niet zichtbaar voor klanten).
  // Bestaande templates worden hierdoor NIET teruggezet (status blijft behouden).
  asDraft?: boolean;
};

/**
 * Idempotent aanmaken/bijwerken van alle standaard-templates, hun eerste versie,
 * stappen en de koppeling aan het subonderdeel. Veilig om herhaald te draaien.
 * Bestaande publicatiestatus (isActive) van een template blijft behouden.
 */
export async function seedStandardTemplates(
  prisma: PrismaClient,
  opts: SeedOptions = {},
): Promise<{ templates: number; steps: number }> {
  let steps = 0;

  for (const t of ALL_TEMPLATES) {
    const existing = await prisma.template.findUnique({ where: { id: templateId(t.key) }, select: { id: true } });

    await prisma.template.upsert({
      where: { id: templateId(t.key) },
      // Bestaande template: inhoud bijwerken, maar isActive met rust laten.
      update: { name: t.name, category: t.category as TemplateCategory, description: t.description },
      create: {
        id: templateId(t.key),
        name: t.name,
        category: t.category as TemplateCategory,
        description: t.description,
        isActive: opts.asDraft ? false : true,
      },
    });

    await prisma.templateVersion.upsert({
      where: { id: versionId(t.key) },
      update: {},
      create: {
        id: versionId(t.key),
        templateId: templateId(t.key),
        version: "v1.0",
        changelog: "Initiele standaard-workflow (AFAS)",
        isActive: true,
      },
    });

    for (let i = 0; i < t.steps.length; i++) {
      const s = t.steps[i];
      await prisma.templateStep.upsert({
        where: { id: stepId(t.key, i + 1) },
        update: { order: i + 1, title: s.title, instruction: s.instruction, expectedResult: s.expectedResult },
        create: {
          id: stepId(t.key, i + 1),
          templateVersionId: versionId(t.key),
          order: i + 1,
          title: s.title,
          instruction: s.instruction,
          expectedResult: s.expectedResult,
        },
      });
      steps++;
    }

    await prisma.templateModuleLink.upsert({
      where: { templateId_moduleKey: { templateId: templateId(t.key), moduleKey: t.key } },
      update: {},
      create: { templateId: templateId(t.key), moduleKey: t.key },
    });

    void existing;
  }

  return { templates: ALL_TEMPLATES.length, steps };
}
