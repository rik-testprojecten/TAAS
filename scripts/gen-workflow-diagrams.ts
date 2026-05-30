// Genereert één Mermaid-stroomschema per template-workflow (36 processen),
// gebundeld in docs/template-workflows.md. Leest de echte stapdata zodat de
// schema's exact overeenkomen met de aangemaakte templates.
//
// Draaien:  npx tsx scripts/gen-workflow-diagrams.ts

import { writeFileSync } from "node:fs";
import { HRM_TEMPLATES } from "../prisma/templates/hrm";
import { FIN_TEMPLATES } from "../prisma/templates/fin";
import { CRM_TEMPLATES } from "../prisma/templates/crm";
import { PRJ_TEMPLATES } from "../prisma/templates/prj";
import { LOG_TEMPLATES } from "../prisma/templates/log";
import type { WorkflowTemplate } from "../prisma/templates/types";
import { getSubmoduleLabel } from "../src/lib/modules";

const GROUPS: { label: string; emoji: string; templates: WorkflowTemplate[] }[] = [
  { label: "HRM & Payroll", emoji: "👥", templates: HRM_TEMPLATES },
  { label: "Financieel", emoji: "💰", templates: FIN_TEMPLATES },
  { label: "CRM", emoji: "🤝", templates: CRM_TEMPLATES },
  { label: "Projecten & uren", emoji: "📊", templates: PRJ_TEMPLATES },
  { label: "Logistiek / ERP / Inkoop", emoji: "📦", templates: LOG_TEMPLATES },
];

// Maak een label veilig voor een Mermaid-node-tekst tussen dubbele quotes.
function nodeLabel(s: string): string {
  return s
    .replace(/"/g, "'")
    .replace(/[\[\]{}]/g, "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function diagram(t: WorkflowTemplate): string {
  const lines: string[] = ["```mermaid", "flowchart TD"];
  lines.push('  S([Start])');
  t.steps.forEach((step, i) => {
    const id = `N${i + 1}`;
    lines.push(`  ${id}["${i + 1}. ${nodeLabel(step.title)}"]`);
  });
  lines.push("  E([Klaar])");
  // Verbindingen
  let prev = "S";
  t.steps.forEach((_, i) => {
    const id = `N${i + 1}`;
    lines.push(`  ${prev} --> ${id}`);
    prev = id;
  });
  lines.push(`  ${prev} --> E`);
  lines.push("```");
  return lines.join("\n");
}

const out: string[] = [];
out.push("# Standaard template-workflows — stroomschema's");
out.push("");
out.push(
  "Eén schema per proces, automatisch gegenereerd uit de template-stappen " +
    "(`scripts/gen-workflow-diagrams.ts`). De diagrammen renderen op GitHub. " +
    "Elke node is een teststap; de volgorde is de happy-path van het proces.",
);
out.push("");

let total = 0;
out.push("## Inhoud");
for (const g of GROUPS) {
  out.push(`- **${g.emoji} ${g.label}** (${g.templates.length})`);
}
out.push("");

for (const g of GROUPS) {
  out.push(`## ${g.emoji} ${g.label}`);
  out.push("");
  for (const t of g.templates) {
    total++;
    out.push(`### ${t.name}`);
    out.push("");
    out.push(`**Subonderdeel:** ${getSubmoduleLabel(t.key)} \`(${t.key})\``);
    out.push("");
    out.push(`_${t.description}_`);
    out.push("");
    out.push(diagram(t));
    out.push("");
  }
}

writeFileSync("docs/template-workflows.md", out.join("\n") + "\n", "utf8");
console.log(`Gegenereerd: docs/template-workflows.md met ${total} stroomschema's.`);
