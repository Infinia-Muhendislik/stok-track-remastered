import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { SettingsPageClient } from "@/components/dashboard/SettingsPageClient";

export const dynamic = "force-dynamic";

export default async function SettingsRoute() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <SettingsPageClient />;
}
