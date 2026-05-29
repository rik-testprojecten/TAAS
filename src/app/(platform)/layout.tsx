import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { PlatformSidebar } from "@/components/layout/Sidebar";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.userType !== "platform") redirect("/login");

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[300] focus:top-2 focus:left-2 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary-500"
      >
        Naar hoofdinhoud
      </a>
      <PlatformSidebar userName={session.user.name || ""} />
      <main id="main-content" className="md:ml-60 flex-1 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  );
}
