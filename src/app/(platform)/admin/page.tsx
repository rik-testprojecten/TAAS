export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function PlatformDashboard() {
  const [tenants, templates] = await Promise.all([
    prisma.tenant.count(),
    prisma.template.count(),
  ]);

  const activeTenants = await prisma.tenant.findMany({
    where: { isActive: true },
    include: { _count: { select: { projects: true, users: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Platform Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Rhoost TAAS Platform Beheer</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-3xl font-bold text-primary-600 mb-1">{tenants}</div>
          <div className="text-sm text-slate-600">Klanten (tenants)</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-bold text-emerald-600 mb-1">{templates}</div>
          <div className="text-sm text-slate-600">Templates</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recente klanten</h2>
          <Link href="/admin/tenants" className="text-primary-600 text-sm hover:underline">Alle klanten →</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {activeTenants.map((t) => (
            <Link key={t.id} href={`/admin/tenants`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50">
              <div>
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">/{t.slug}</div>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                <span>{t._count.users} gebruikers</span>
                <span>{t._count.projects} projecten</span>
                <span className={`badge ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {t.isActive ? "Actief" : "Inactief"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
