import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const result = await requireTenantAuth();
  if ("error" in result) return result.error;
  const { tenantId, user } = result.context;

  const isAdmin = user.roles.includes("TENANT_ADMIN");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    orgName,
    emailDomain,
    logoBase64,
    selectedModules,
    selectedSubmodules,
    projectName,
    createPhases,
    selectedPhases,
    selectedTemplates,
    goLiveDate,
    goNoGoDate,
    maxCritical,
    maxHigh,
    maxMedium,
    maxLow,
  } = body;

  // 1. Save tenant settings
  await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      orgName,
      emailDomain,
      logoBase64: logoBase64 || null,
      selectedModules: selectedModules ?? [],
      selectedSubmodules: selectedSubmodules ?? [],
      onboardingDone: true,
    },
    update: {
      orgName,
      emailDomain,
      logoBase64: logoBase64 || null,
      selectedModules: selectedModules ?? [],
      selectedSubmodules: selectedSubmodules ?? [],
      onboardingDone: true,
    },
  });

  // 2. Create project
  let project = null;
  if (projectName) {
    project = await prisma.project.create({
      data: {
        tenantId,
        name: projectName,
        description: `Aangemaakt via onboarding`,
        type: "IMPLEMENTATION",
        status: "ACTIVE",
      },
    });

    // 3. Create phases (FAT / GAT / PAT)
    if (createPhases && selectedPhases?.length > 0) {
      const phaseOrder: Record<string, number> = { FAT: 1, GAT: 2, PAT: 3 };
      for (const phase of selectedPhases) {
        await prisma.testPhase.create({
          data: {
            tenantId,
            projectId: project.id,
            name: phase,
            order: phaseOrder[phase] ?? 0,
            status: "DRAFT",
          },
        });
      }
    }

    // 4. Go-live criteria
    if (goLiveDate || goNoGoDate || maxCritical != null || maxHigh != null) {
      await prisma.goLiveCriteria.upsert({
        where: { projectId: project.id },
        create: {
          tenantId,
          projectId: project.id,
          createdById: user.id,
          goLiveDate: goLiveDate ? new Date(goLiveDate) : null,
          goNoGoDate: goNoGoDate ? new Date(goNoGoDate) : null,
          maxCritical: maxCritical ?? null,
          maxHigh: maxHigh ?? null,
          maxMedium: maxMedium ?? null,
          maxLow: maxLow ?? null,
        },
        update: {
          goLiveDate: goLiveDate ? new Date(goLiveDate) : null,
          goNoGoDate: goNoGoDate ? new Date(goNoGoDate) : null,
          maxCritical: maxCritical ?? null,
          maxHigh: maxHigh ?? null,
          maxMedium: maxMedium ?? null,
          maxLow: maxLow ?? null,
        },
      });
    }

    // 5. Add template flows (if templates were selected and phases exist)
    if (selectedTemplates?.length > 0 && createPhases && selectedPhases?.length > 0) {
      const phases = await prisma.testPhase.findMany({ where: { projectId: project.id, tenantId } });
      for (const templateId of selectedTemplates) {
        const templateVersion = await prisma.templateVersion.findFirst({
          where: { templateId, isActive: true },
          orderBy: { createdAt: "desc" },
          include: { steps: { orderBy: { order: "asc" } }, template: true },
        });
        if (!templateVersion) continue;

        for (const phase of phases) {
          const flow = await prisma.flow.create({
            data: {
              tenantId,
              phaseId: phase.id,
              name: templateVersion.template.name,
              sourceTemplateVersionId: templateVersion.id,
              status: "ACTIVE",
            },
          });
          const flowVersion = await prisma.flowVersion.create({
            data: { tenantId, flowId: flow.id, version: "v1.0", isActive: true },
          });
          for (const step of templateVersion.steps) {
            await prisma.flowStep.create({
              data: {
                tenantId,
                flowVersionId: flowVersion.id,
                order: step.order,
                title: step.title,
                instruction: step.instruction,
                expectedResult: step.expectedResult,
              },
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, projectId: project?.id });
}
