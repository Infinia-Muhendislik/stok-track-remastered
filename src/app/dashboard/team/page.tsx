import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { TeamManagementClient } from "@/components/dashboard/TeamManagementClient";

export const dynamic = "force-dynamic";

export default async function TeamRoute() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Sadece admin erişebilir
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard/products");
  }

  return <TeamManagementClient />;
}
