import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { PlatformSidebar } from "@/components/layout/Sidebar";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.userType !== "platform") redirect("/login");

  return (
    <div className="flex min-h-screen">
      <PlatformSidebar userName={session.user.name || ""} />
      <main className="md:ml-60 flex-1 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  );
}
