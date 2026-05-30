import { redirect } from "next/navigation";
import { auth } from "../../auth";

export default async function RootPage() {
  try {
    const session = await auth();
    if (!session) redirect("/login");
    if (session.user.userType === "platform") redirect("/admin");
    redirect("/dashboard");
  } catch (e) {
    // Next.js redirect() throws internally — let those propagate
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect("/login");
  }
}
