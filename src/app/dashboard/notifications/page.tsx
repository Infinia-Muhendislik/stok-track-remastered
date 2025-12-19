import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { NotificationsPageClient } from "@/components/dashboard/NotificationsPageClient";

export const dynamic = "force-dynamic";

export default async function NotificationsRoute() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <NotificationsPageClient />;
}
