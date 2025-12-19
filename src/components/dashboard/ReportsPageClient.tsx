"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "./Header";
import { ReportsPage } from "./ReportsPage";
import { ReportsPageSkeleton } from "./Skeleton";
import type { Order, Product } from "@/types/dashboard";

export function ReportsPageClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <>
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ReportsPageSkeleton />
      </>
    );
  }

  return (
    <>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <ReportsPage orders={orders} products={products} />
    </>
  );
}
