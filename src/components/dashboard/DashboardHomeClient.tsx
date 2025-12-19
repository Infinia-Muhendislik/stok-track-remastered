"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { Header } from "./Header";
import { DashboardNotifications } from "./DashboardNotifications";
import { DashboardSkeleton } from "./Skeleton";
import { StatsCard } from "./StatsCard";
import { SalesChart } from "./SalesChart";
import { RecentOrders } from "./RecentOrders";
import type { Order, Product } from "@/types/dashboard";
import type { NotificationSettings } from "@/types/settings";

export function DashboardHomeClient() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      orderAlerts: true,
      lowStockWarnings: true,
      weeklyReports: false,
    });

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status === "Delivered")
      .reduce((sum, o) => sum + o.amount, 0);

    const pendingOrders = orders.filter((o) => o.status === "Pending").length;
    const lowStockItems = products.filter(
      (p) => p.status === "Low Stock" || p.status === "Out of Stock"
    ).length;
    const deliveredOrders = orders.filter(
      (o) => o.status === "Delivered"
    ).length;
    const fulfillmentRate =
      orders.length > 0
        ? ((deliveredOrders / orders.length) * 100).toFixed(1)
        : "0";

    return [
      {
        title: "Toplam Gelir",
        value: `₺${totalRevenue.toLocaleString("tr-TR")}`,
        change: "Teslim edilen siparişlerden",
        trendColor: "text-emerald-600",
      },
      {
        title: "Bekleyen Siparişler",
        value: String(pendingOrders),
        change: `${orders.length} toplam sipariş`,
        trendColor: "text-blue-600",
      },
      {
        title: "Düşük Stok",
        value: String(lowStockItems),
        change: "Dikkat gerekiyor",
        trendColor: lowStockItems > 0 ? "text-amber-600" : "text-emerald-600",
      },
      {
        title: "Teslim Oranı",
        value: `${fulfillmentRate}%`,
        change: `${deliveredOrders} teslim edildi`,
        trendColor: "text-emerald-600",
      },
    ];
  }, [products, orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  if (isLoading) {
    return (
      <>
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <section className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <SalesChart />
          <div className="space-y-6">
            <DashboardNotifications
              orders={orders}
              products={products}
              settings={notificationSettings}
            />
            <RecentOrders orders={recentOrders} />
          </div>
        </div>
      </section>
    </>
  );
}
