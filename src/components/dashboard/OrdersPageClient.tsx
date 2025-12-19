"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "./Header";
import { OrdersPage } from "./OrdersPage";
import { OrdersTableSkeleton } from "./Skeleton";
import type { Order } from "@/types/dashboard";

interface OrdersPageClientProps {
  isAdmin: boolean;
}

export function OrdersPageClient({ isAdmin }: OrdersPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (isLoading) {
    return (
      <>
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <OrdersTableSkeleton />
      </>
    );
  }

  return (
    <>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <OrdersPage
        orders={orders}
        searchTerm={searchTerm}
        isDistributor={!isAdmin}
        onStatusUpdate={fetchOrders}
      />
    </>
  );
}
