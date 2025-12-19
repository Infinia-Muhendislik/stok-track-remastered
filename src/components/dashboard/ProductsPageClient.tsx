"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

import { Header } from "./Header";
import { ProductsPage } from "./ProductsPage";
import { NewProductModal } from "./NewProductModal";
import { BulkImportModal } from "./BulkImportModal";
import { ProductsTableSkeleton } from "./Skeleton";
import type { Product } from "@/types/dashboard";

interface ProductsPageClientProps {
  isAdmin: boolean;
}

export function ProductsPageClient({ isAdmin }: ProductsPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  if (isLoading) {
    return (
      <>
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddProduct={isAdmin ? () => setIsModalOpen(true) : undefined}
        />
        <ProductsTableSkeleton />
      </>
    );
  }

  return (
    <>
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddProduct={isAdmin ? () => setIsModalOpen(true) : undefined}
      />
      <ProductsPage
        products={products}
        searchTerm={searchTerm}
        onDelete={isAdmin ? handleDeleteProduct : undefined}
        onUpdate={isAdmin ? handleUpdateProduct : undefined}
        onDeleteAll={isAdmin ? handleDeleteAllProducts : undefined}
        onBulkImport={isAdmin ? () => setIsBulkImportOpen(true) : undefined}
        isDistributor={!isAdmin}
        onOrderCreate={fetchProducts}
      />
      <NewProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProduct}
      />
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={fetchProducts}
      />
    </>
  );
}
