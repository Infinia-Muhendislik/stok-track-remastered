import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Order, Product } from "@/types/dashboard";

interface ReportsPageProps {
  orders: Order[];
  products: Product[];
}

const CATEGORY_COLORS = ["#137fec", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function ReportsPage({ orders, products }: ReportsPageProps) {
  // Gerçek verilerden istatistikler hesapla
  const stats = useMemo(() => {
    const deliveredOrders = orders.filter((o) => o.status === "Delivered");
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.amount, 0);
    const avgOrderValue =
      deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    const conversionRate =
      orders.length > 0 ? (deliveredOrders.length / orders.length) * 100 : 0;

    return {
      totalRevenue,
      avgOrderValue,
      conversionRate,
      deliveredCount: deliveredOrders.length,
    };
  }, [orders]);

  // Kategori bazlı satış verileri
  const categoryData = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    products.forEach((p) => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    return Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
    }));
  }, [products]);

  // Son 6 ay için revenue trend (mock, gerçek uygulama için API'den gelir)
  const revenueData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const totalRevenue = orders
      .filter((o) => o.status === "Delivered")
      .reduce((sum, o) => sum + o.amount, 0);

    // Basit dağılım simülasyonu
    return months.map((name) => ({
      name,
      revenue: Math.round((totalRevenue / 6) * (0.8 + Math.random() * 0.4)),
    }));
  }, [orders]);

  const reportCards = [
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      delta: `${stats.deliveredCount} delivered orders`,
      positive: true,
    },
    {
      label: "Avg. Order Value",
      value: `$${stats.avgOrderValue.toFixed(2)}`,
      delta: `From ${orders.length} total orders`,
      positive: stats.avgOrderValue > 0,
    },
    {
      label: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      delta: `Delivered vs total orders`,
      positive: stats.conversionRate > 50,
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-bold text-text-light-primary">
          Analytics & Reports
        </h2>
        <p className="text-sm text-text-light-secondary">
          Get a quick pulse on revenue growth and category performance.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {reportCards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-border-light bg-card-light p-6 shadow-sm"
          >
            <p className="text-sm text-text-light-secondary">{card.label}</p>
            <p className="text-2xl font-bold text-text-light-primary">
              {card.value}
            </p>
            <p
              className={`text-xs font-semibold ${
                card.positive ? "text-green-600" : "text-red-500"
              }`}
            >
              {card.delta}
            </p>
          </article>
        ))}
      </div>

      {orders.length === 0 && products.length === 0 ? (
        <div className="text-center py-12 text-text-light-secondary">
          <span className="material-symbols-outlined text-4xl mb-2">
            analytics
          </span>
          <p>No data available yet. Add products and orders to see reports.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="flex h-[400px] flex-col rounded-2xl border border-border-light bg-card-light p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-text-light-primary">
              Revenue Trend
            </h3>
            <div className="mt-4 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#137fec"
                        stopOpacity={0.25}
                      />
                      <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#137fec"
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="flex h-[400px] flex-col rounded-2xl border border-border-light bg-card-light p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-text-light-primary">
              Sales by Category
            </h3>
            <div className="mt-4 flex-1">
              {categoryData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-text-light-secondary">
                  <p>No category data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      height={36}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
