import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { OrdersPageClient } from "@/components/dashboard/OrdersPageClient";

export const dynamic = "force-dynamic";

export default async function OrdersRoute() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <OrdersPageClient isAdmin={session.user.role === "ADMIN"} />;
}
