import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
