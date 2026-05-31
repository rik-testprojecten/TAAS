// Gedeelde typen voor de standaard template-workflows per subonderdeel.
// Deze worden ingelezen door prisma/seed-templates.ts en aangemaakt als
// Template + TemplateVersion (v1.0) + TemplateStep, gekoppeld aan het
// subonderdeel via TemplateModuleLink (moduleKey === key).

export type TemplateCat = "HR" | "FIN" | "INKOOP" | "ALG";

export type WorkflowStep = {
  title: string;
  instruction: string;
  expectedResult: string;
};

export type WorkflowTemplate = {
  // Submodulesleutel uit src/lib/modules.ts (bv. "HRM_VERLOF").
  key: string;
  name: string;
  category: TemplateCat;
  description: string;
  steps: WorkflowStep[];
};
