import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TenantSidebar } from "@/components/layout/Sidebar";
import { KeyboardProvider } from "@/components/KeyboardProvider";
import { SearchModal } from "@/components/SearchModal";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.userType !== "tenant") redirect("/login");

  const tenantId = session.user.tenantId!;
  const isAdmin = session.user.roles.includes("TENANT_ADMIN");

  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.tenantSettings.findUnique({ where: { tenantId } }),
  ]);

  if (isAdmin && (!settings || !settings.onboardingDone)) {
    redirect("/onboarding");
  }

  return (
    <KeyboardProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[300] focus:top-2 focus:left-2 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary-500"
      >
        Naar hoofdinhoud
      </a>
      <SearchModal />
      <div className="flex min-h-screen">
        <TenantSidebar
          roles={session.user.roles}
          userName={session.user.name || ""}
          tenantName={settings?.orgName || tenant?.name}
          logoBase64={settings?.logoBase64 ?? null}
        />
        <main id="main-content" className="md:ml-60 flex-1 min-h-screen bg-slate-50 pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </KeyboardProvider>
  );
}
