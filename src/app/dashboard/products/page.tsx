import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { ProductsPageClient } from "@/components/dashboard/ProductsPageClient";

export const dynamic = "force-dynamic";

export default async function ProductsRoute() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <ProductsPageClient isAdmin={session.user.role === "ADMIN"} />;
}
