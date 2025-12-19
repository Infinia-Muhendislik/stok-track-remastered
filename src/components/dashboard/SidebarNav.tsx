"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMemo } from "react";

const ADMIN_MENU = [
  { id: "dashboard", path: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "products", path: "/dashboard/products", icon: "inventory", label: "Ürünler" },
  { id: "orders", path: "/dashboard/orders", icon: "receipt_long", label: "Siparişler" },
  { id: "reports", path: "/dashboard/reports", icon: "assessment", label: "Raporlar" },
  { id: "team", path: "/dashboard/team", icon: "group", label: "Ekip Yönetimi" },
  { id: "notifications", path: "/dashboard/notifications", icon: "notifications", label: "Bildirimler" },
  { id: "settings", path: "/dashboard/settings", icon: "settings", label: "Ayarlar" },
] as const;

const DISTRIBUTOR_MENU = [
  { id: "products", path: "/dashboard/products", icon: "store", label: "Katalog" },
  { id: "orders", path: "/dashboard/orders", icon: "shopping_cart", label: "Siparişlerim" },
  { id: "notifications", path: "/dashboard/notifications", icon: "notifications", label: "Bildirimler" },
  { id: "settings", path: "/dashboard/settings", icon: "settings", label: "Ayarlar" },
] as const;

export function SidebarNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";

  const menuItems = useMemo(() => {
    return isAdmin ? ADMIN_MENU : DISTRIBUTOR_MENU;
  }, [isAdmin]);

  const userName = session?.user?.name || "Kullanıcı";
  const userRole = isAdmin ? "Admin" : "Distribütör";

  // Generate initials for avatar fallback
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden w-64 flex-col bg-card-light p-4 border-r border-border-light md:flex sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-3 px-2 mb-8">
        <Image
          src="/images/mari-logo.webp"
          alt="Marisonia Logo"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <h1 className="text-xl font-bold text-text-light-primary">
          Marisonia Stok Takip
        </h1>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  active
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-primary/10 text-text-light-secondary"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    !active ? "text-text-light-secondary" : ""
                  }`}
                >
                  {item.icon}
                </span>
                <p
                  className={`text-sm ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 p-2 rounded-lg mt-auto">
        <div className="flex items-center justify-center size-10 rounded-full bg-primary/20 text-primary font-semibold text-sm">
          {initials}
        </div>
        <div className="flex flex-col overflow-hidden">
          <h1 className="text-text-light-primary text-sm font-medium leading-normal truncate">
            {userName}
          </h1>
          <p className="text-text-light-secondary text-xs font-normal leading-normal truncate">
            {userRole}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Çıkış Yap"
        >
          <span className="material-symbols-outlined text-text-light-secondary text-xl">
            logout
          </span>
        </button>
      </div>
    </aside>
  );
}
