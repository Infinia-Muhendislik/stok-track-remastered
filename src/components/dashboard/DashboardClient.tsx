"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";

import { Header } from "@/components/dashboard/Header";
import { NewProductModal } from "@/components/dashboard/NewProductModal";
import { BulkImportModal } from "@/components/dashboard/BulkImportModal";
import { OrdersPage } from "@/components/dashboard/OrdersPage";
import { ProductsPage } from "@/components/dashboard/ProductsPage";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { ReportsPage } from "@/components/dashboard/ReportsPage";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { SettingsPage } from "@/components/dashboard/SettingsPage";
import { TeamManagement } from "@/components/dashboard/TeamManagement";
import { Sidebar, type SidebarTab } from "@/components/dashboard/Sidebar";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import {
  DashboardSkeleton,
  ProductsTableSkeleton,
  OrdersTableSkeleton,
  ReportsPageSkeleton,
} from "@/components/dashboard/Skeleton";
import { StatsCard } from "@/components/dashboard/StatsCard";
import type { Order, Product } from "@/types/dashboard";
import type { NotificationSettings } from "@/types/settings";

type TabId = SidebarTab;

const ADMIN_TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "reports", label: "Reports" },
  { id: "team", label: "Ekip Yönetimi" },
  { id: "settings", label: "Settings" },
];

const DISTRIBUTOR_TABS: { id: TabId; label: string }[] = [
  { id: "products", label: "Katalog" },
  { id: "orders", label: "Siparişlerim" },
  { id: "settings", label: "Ayarlar" },
];

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const tabItems = useMemo(
    () => (isAdmin ? ADMIN_TABS : DISTRIBUTOR_TABS),
    [isAdmin]
  );
  const defaultTab = isAdmin ? "dashboard" : "products";
  const tabParam = searchParams.get("tab") as TabId | null;

  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && tabItems.some((t) => t.id === tabParam) ? tabParam : defaultTab
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      orderAlerts: true,
      lowStockWarnings: true,
      weeklyReports: false,
    });

  // Tab değiştiğinde URL'i güncelle
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      router.push(`/dashboard?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  // Verileri API'den çek
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

  const handleAddProduct = () => {
    handleTabChange("products");
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    const result = await Swal.fire({
      title: "Ürünü Sil",
      text: "Bu ürünü silmek istediğinizden emin misiniz?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Sil",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        Swal.fire({
          title: "Silindi!",
          text: "Ürün başarıyla silindi.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: "Hata!",
          text: "Ürün silinirken bir hata oluştu.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      Swal.fire({
        title: "Bağlantı Hatası",
        text: "Sunucuya bağlanılamadı.",
        icon: "error",
      });
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    updates: Partial<Product>
  ) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? updatedProduct : p))
        );
        Swal.fire({
          title: "Güncellendi!",
          text: "Ürün başarıyla güncellendi.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: "Hata!",
          text: "Ürün güncellenirken bir hata oluştu.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Failed to update product:", error);
      Swal.fire({
        title: "Bağlantı Hatası",
        text: "Sunucuya bağlanılamadı.",
        icon: "error",
      });
    }
  };

  const handleDeleteAllProducts = async () => {
    const result = await Swal.fire({
      title: "Tüm Ürünleri Sil",
      text: `${products.length} ürünün tamamını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Tümünü Sil",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
      });

      if (response.ok) {
        setProducts([]);
        Swal.fire({
          title: "Silindi!",
          text: "Tüm ürünler başarıyla silindi.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: "Hata!",
          text: "Ürünler silinirken bir hata oluştu.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Failed to delete all products:", error);
      Swal.fire({
        title: "Bağlantı Hatası",
        text: "Sunucuya bağlanılamadı.",
        icon: "error",
      });
    }
  };

  const handleCreateProduct = async (payload: {
    name: string;
    sku?: string;
    barcode?: string;
    category: string;
    price: number;
    costPrice: number;
    stock: number;
    minStock: number;
    unit: string;
    supplier?: string;
    description?: string;
    location?: string;
  }) => {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts((previous) => [newProduct, ...previous]);
        Swal.fire({
          title: "Eklendi!",
          text: "Ürün başarıyla eklendi.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to create product:", errorData);
        Swal.fire({
          title: "Hata!",
          text: "Ürün eklenirken bir hata oluştu.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Failed to create product:", error);
      Swal.fire({
        title: "Bağlantı Hatası",
        text: "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.",
        icon: "error",
      });
    }
  };

  const handleNotificationChange = useCallback(
    (settings: NotificationSettings) => {
      setNotificationSettings(settings);
    },
    []
  );

  // Stats hesapla
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
        title: "Total Revenue",
        value: `$${totalRevenue.toLocaleString()}`,
        change: "From delivered orders",
        trendColor: "text-emerald-600",
      },
      {
        title: "Pending Orders",
        value: String(pendingOrders),
        change: `${orders.length} total orders`,
        trendColor: "text-blue-600",
      },
      {
        title: "Low Stock Items",
        value: String(lowStockItems),
        change: "Needs attention",
        trendColor: lowStockItems > 0 ? "text-amber-600" : "text-emerald-600",
      },
      {
        title: "Fulfillment Rate",
        value: `${fulfillmentRate}%`,
        change: `${deliveredOrders} delivered`,
        trendColor: "text-emerald-600",
      },
    ];
  }, [products, orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const dashboardContent = useMemo(
    () => (
      <section className="space-y-8">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
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
          </>
        )}
      </section>
    ),
    [isLoading, stats, recentOrders, orders, products, notificationSettings]
  );

  const renderActiveContent = () => {
    // Distribütör sadece products, orders, settings sekmelerine erişebilir
    if (!isAdmin && (activeTab === "dashboard" || activeTab === "reports")) {
      return (
        <ProductsPage
          products={products}
          searchTerm={searchTerm}
          onDelete={handleDeleteProduct}
          onUpdate={handleUpdateProduct}
          onDeleteAll={handleDeleteAllProducts}
          onBulkImport={() => setIsBulkImportOpen(true)}
          isDistributor={true}
          onOrderCreate={fetchData}
        />
      );
    }

    if (isLoading) {
      switch (activeTab) {
        case "products":
          return <ProductsTableSkeleton />;
        case "orders":
          return <OrdersTableSkeleton />;
        case "reports":
          return <ReportsPageSkeleton />;
        case "settings":
          return (
            <SettingsPage onNotificationChange={handleNotificationChange} />
          );
        default:
          return dashboardContent;
      }
    }

    switch (activeTab) {
      case "products":
        return (
          <ProductsPage
            products={products}
            searchTerm={searchTerm}
            onDelete={handleDeleteProduct}
            onUpdate={handleUpdateProduct}
            onDeleteAll={handleDeleteAllProducts}
            onBulkImport={() => setIsBulkImportOpen(true)}
            isDistributor={!isAdmin}
            onOrderCreate={fetchData}
          />
        );
      case "orders":
        return (
          <OrdersPage
            orders={orders}
            searchTerm={searchTerm}
            isDistributor={!isAdmin}
            onStatusUpdate={fetchData}
          />
        );
      case "reports":
        return <ReportsPage orders={orders} products={products} />;
      case "team":
        return <TeamManagement />;
      case "settings":
        return <SettingsPage onNotificationChange={handleNotificationChange} />;
      default:
        return dashboardContent;
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light text-text-light-primary">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <div className="flex flex-1 flex-col">
        <nav className="sticky top-0 z-10 border-b border-border-light bg-card-light px-4 py-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {tabItems.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-light-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 px-4 py-8 md:px-10 lg:px-12">
          <Header
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onAddProduct={isAdmin ? handleAddProduct : undefined}
          />
          {renderActiveContent()}
        </main>
      </div>
      <NewProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProduct}
      />
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
