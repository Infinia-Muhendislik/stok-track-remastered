import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { ReportsPageClient } from "@/components/dashboard/ReportsPageClient";

export const dynamic = "force-dynamic";

export default async function ReportsRoute() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Sadece admin erişebilir
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard/products");
  }

  return <ReportsPageClient />;
}
