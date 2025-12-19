"use client";

import { useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";

import type { Product } from "@/types/dashboard";
import { ProductDetailModal } from "./ProductDetailModal";

interface CartItem {
  product: Product;
  quantity: number;
}

interface ProductsPageProps {
  products: Product[];
  searchTerm: string;
  onDelete?: (productId: string) => void;
  onUpdate?: (productId: string, updates: Partial<Product>) => void;
  onDeleteAll?: () => void;
  onBulkImport?: () => void;
  isDistributor?: boolean;
  onOrderCreate?: () => void;
}

const STATUS_STYLES: Record<Product["status"], string> = {
  "In Stock": "bg-green-100 text-green-700",
  "Low Stock": "bg-orange-100 text-orange-700",
  "Out of Stock": "bg-red-100 text-red-700",
};

const STATUS_OPTIONS: Product["status"][] = [
  "In Stock",
  "Low Stock",
  "Out of Stock",
];

export function ProductsPage({
  products,
  searchTerm,
  onDelete,
  onUpdate,
  onDeleteAll,
  onBulkImport,
  isDistributor = false,
  onOrderCreate,
}: ProductsPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sepet state'leri (sadece distribütörler için)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    status: "" as Product["status"] | "",
    minPrice: "",
    maxPrice: "",
    minStock: "",
    maxStock: "",
  });

  // Kategorileri ürünlerden çıkar
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Arama filtresi
    const normalized = searchTerm.trim().toLowerCase();
    if (normalized) {
      result = result.filter((product) =>
        [product.name, product.category].some((value) =>
          value.toLowerCase().includes(normalized)
        )
      );
    }

    // Kategori filtresi
    if (filters.category) {
      result = result.filter((p) => p.category === filters.category);
    }

    // Status filtresi
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }

    // Fiyat filtreleri
    if (filters.minPrice) {
      result = result.filter((p) => p.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p) => p.price <= Number(filters.maxPrice));
    }

    // Stok filtreleri
    if (filters.minStock) {
      result = result.filter((p) => p.stock >= Number(filters.minStock));
    }
    if (filters.maxStock) {
      result = result.filter((p) => p.stock <= Number(filters.maxStock));
    }

    return result;
  }, [products, searchTerm, filters]);

  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      stock: product.stock,
      price: product.price,
      costPrice: product.costPrice,
    });
    setMenuOpenId(null);
  };

  const handleSaveEdit = () => {
    if (editingId && onUpdate) {
      onUpdate(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Sepet fonksiyonları
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;

    setIsOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          })),
        }),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Sipariş Oluşturuldu!",
          text: "Siparişiniz başarıyla oluşturuldu. Siparişlerim sayfasından takip edebilirsiniz.",
          timer: 2500,
          showConfirmButton: false,
        });
        setCart([]);
        setShowCart(false);
        onOrderCreate?.();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Sipariş oluşturulamadı",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Bağlantı kurulamadı",
      });
    } finally {
      setIsOrdering(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      status: "",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      maxStock: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  // Export fonksiyonları
  const exportToCSV = useCallback(() => {
    const headers = [
      "Name",
      "Category",
      "Selling Price",
      "Cost Price",
      "Stock",
      "Status",
      "Profit Margin",
    ];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.category,
      p.price.toFixed(2),
      p.costPrice.toFixed(2),
      p.stock.toString(),
      p.status,
      p.costPrice > 0
        ? (((p.price - p.costPrice) / p.costPrice) * 100).toFixed(1) + "%"
        : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  }, [filteredProducts]);

  const exportToPDF = useCallback(async () => {
    // PDF oluştur - basit HTML tablosu olarak
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Inventory</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1a1a1a; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            .in-stock { color: #16a34a; }
            .low-stock { color: #ea580c; }
            .out-of-stock { color: #dc2626; }
            .summary { margin-top: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Product Inventory Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Cost Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Profit Margin</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts
                .map(
                  (p) => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.category}</td>
                  <td>$${p.price.toFixed(2)}</td>
                  <td>$${p.costPrice.toFixed(2)}</td>
                  <td>${p.stock}</td>
                  <td class="${p.status.toLowerCase().replace(" ", "-")}">${
                    p.status
                  }</td>
                  <td>${
                    p.costPrice > 0
                      ? (((p.price - p.costPrice) / p.costPrice) * 100).toFixed(
                          1
                        ) + "%"
                      : "N/A"
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="summary">
            <p>Total Products: ${filteredProducts.length}</p>
            <p>Total Stock Value: $${filteredProducts
              .reduce((sum, p) => sum + p.costPrice * p.stock, 0)
              .toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    setShowExportMenu(false);
  }, [filteredProducts]);

  const exportToExcel = useCallback(() => {
    // Excel-uyumlu HTML tablosu oluştur
    const headers = [
      "Name",
      "Category",
      "Selling Price",
      "Cost Price",
      "Stock",
      "Status",
      "Profit Margin",
    ];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.category,
      p.price,
      p.costPrice,
      p.stock,
      p.status,
      p.costPrice > 0 ? ((p.price - p.costPrice) / p.costPrice) * 100 : 0,
    ]);

    let tableHtml = '<table border="1">';
    tableHtml +=
      "<tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr>";
    rows.forEach((row) => {
      tableHtml +=
        "<tr>" + row.map((cell) => `<td>${cell}</td>`).join("") + "</tr>";
    });
    tableHtml += "</table>";

    const blob = new Blob(
      [
        `<html><head><meta charset="UTF-8"></head><body>${tableHtml}</body></html>`,
      ],
      { type: "application/vnd.ms-excel" }
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    setShowExportMenu(false);
  }, [filteredProducts]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold text-text-light-primary">
          {isDistributor ? "Ürün Kataloğu" : "Product Inventory"}
        </h2>
        <div className="flex gap-2">
          {/* Distribütör için Sepet Butonu */}
          {isDistributor && (
            <button
              onClick={() => setShowCart(true)}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 relative"
            >
              <span className="material-symbols-outlined text-[18px]">
                shopping_cart
              </span>
              Sepet
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full size-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Admin için Export Dropdown */}
          {!isDistributor && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 text-sm font-medium text-text-light-secondary border border-border-light rounded-lg hover:bg-background-light transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border-light rounded-lg shadow-lg py-1 min-w-40">
                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-2 text-left text-sm text-text-light-primary hover:bg-background-light flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      description
                    </span>
                    Export as CSV
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-2 text-left text-sm text-text-light-primary hover:bg-background-light flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      table_chart
                    </span>
                    Export as Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full px-4 py-2 text-left text-sm text-text-light-primary hover:bg-background-light flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      picture_as_pdf
                    </span>
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Admin için Import Button */}
          {!isDistributor && onBulkImport && (
            <button
              onClick={onBulkImport}
              className="px-4 py-2 text-sm font-medium text-text-light-secondary border border-border-light rounded-lg hover:bg-background-light transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                upload_file
              </span>
              Import
            </button>
          )}

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center gap-2 ${
              hasActiveFilters
                ? "bg-primary text-white border-primary"
                : "text-text-light-secondary border-border-light hover:bg-background-light"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              filter_list
            </span>
            Filters
            {hasActiveFilters && (
              <span className="bg-white text-primary text-xs rounded-full px-1.5">
                {Object.values(filters).filter((v) => v !== "").length}
              </span>
            )}
          </button>

          {/* Admin için Delete All Button */}
          {!isDistributor && products.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                delete_sweep
              </span>
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Sepet Modal - Distribütör */}
      {isDistributor && showCart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-text-light-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  shopping_cart
                </span>
                Sepetim ({cartItemCount} ürün)
              </h3>
              <button
                onClick={() => setShowCart(false)}
                className="text-text-light-secondary hover:text-text-light-primary p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-text-light-secondary">
                <span className="material-symbols-outlined text-4xl text-gray-300">
                  shopping_cart
                </span>
                <p className="mt-2">Sepetiniz boş</p>
                <p className="text-sm">
                  Ürünleri sepete ekleyerek sipariş oluşturabilirsiniz
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border-light"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text-light-primary">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-text-light-secondary">
                          ${item.product.price.toFixed(2)} / adet
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateCartQuantity(
                              item.product.id,
                              item.quantity - 1
                            )
                          }
                          className="size-8 rounded-lg border border-border-light hover:bg-gray-100 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            remove
                          </span>
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateCartQuantity(
                              item.product.id,
                              item.quantity + 1
                            )
                          }
                          className="size-8 rounded-lg border border-border-light hover:bg-gray-100 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            add
                          </span>
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="size-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center ml-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border-light pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-text-light-secondary">Toplam:</span>
                    <span className="text-xl font-bold text-text-light-primary">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCart([])}
                      className="flex-1 px-4 py-2 border border-border-light rounded-lg text-text-light-secondary hover:bg-gray-50"
                    >
                      Sepeti Temizle
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      disabled={isOrdering}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isOrdering ? (
                        "Oluşturuluyor..."
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">
                            check
                          </span>
                          Sipariş Oluştur
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">
                  warning
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-light-primary">
                  Delete All Products
                </h3>
                <p className="text-sm text-text-light-secondary">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-text-light-secondary mb-6">
              Are you sure you want to delete all{" "}
              <strong>{products.length}</strong> products? This will permanently
              remove all product data from the system.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-text-light-secondary border border-border-light rounded-lg hover:bg-background-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteAll?.();
                  setShowDeleteAllConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  delete_forever
                </span>
                Delete All Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card-light rounded-xl border border-border-light p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-light-primary">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary/80"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="block text-xs font-medium text-text-light-secondary mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light-secondary mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value as Product["status"] | "",
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light-secondary mb-1">
                Min Price
              </label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters({ ...filters, minPrice: e.target.value })
                }
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light-secondary mb-1">
                Max Price
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters({ ...filters, maxPrice: e.target.value })
                }
                placeholder="∞"
                className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light-secondary mb-1">
                Min Stock
              </label>
              <input
                type="number"
                value={filters.minStock}
                onChange={(e) =>
                  setFilters({ ...filters, minStock: e.target.value })
                }
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light-secondary mb-1">
                Max Stock
              </label>
              <input
                type="number"
                value={filters.maxStock}
                onChange={(e) =>
                  setFilters({ ...filters, maxStock: e.target.value })
                }
                placeholder="∞"
                className="w-full px-3 py-2 text-sm border border-border-light rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-card-light rounded-xl border border-border-light shadow-sm overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background-light border-b border-border-light">
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Product Name
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Category
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Selling Price
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Cost Price
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Stock
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Status
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border-light hover:bg-background-light transition-colors last:border-0"
                >
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="font-medium text-text-light-primary hover:text-primary hover:underline transition-colors text-left"
                    >
                      {product.name}
                    </button>
                    <p className="text-xs text-text-light-secondary md:hidden">
                      {product.category}
                    </p>
                  </td>
                  <td className="p-4 text-sm text-text-light-secondary hidden md:table-cell">
                    {product.category}
                  </td>
                  <td className="p-4 text-sm font-medium text-text-light-primary">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.price ?? product.price}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            price: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 border border-border-light rounded text-sm"
                      />
                    ) : (
                      `$${product.price.toFixed(2)}`
                    )}
                  </td>
                  <td className="p-4 text-sm text-text-light-secondary">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.costPrice ?? product.costPrice}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            costPrice: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 border border-border-light rounded text-sm"
                      />
                    ) : (
                      `$${product.costPrice.toFixed(2)}`
                    )}
                  </td>
                  <td className="p-4 text-sm text-text-light-secondary">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={editForm.stock ?? product.stock}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            stock: Number(e.target.value),
                          })
                        }
                        className="w-16 px-2 py-1 border border-border-light rounded text-sm"
                      />
                    ) : (
                      product.stock
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[product.status]
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {isDistributor ? (
                      /* Distribütör için Sepete Ekle butonu */
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-text-light-secondary hover:text-primary transition-colors p-1.5 rounded hover:bg-primary/10"
                          title="Detay Görüntüle"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            visibility
                          </span>
                        </button>
                        <button
                          onClick={() => addToCart(product)}
                          className="text-text-light-secondary hover:text-primary transition-colors p-1.5 rounded hover:bg-primary/10 flex items-center gap-1"
                          title="Sepete Ekle"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            add_shopping_cart
                          </span>
                        </button>
                      </div>
                    ) : editingId === product.id ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
                          title="Kaydet"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            check
                          </span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                          title="İptal"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            close
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-text-light-secondary hover:text-primary transition-colors p-1.5 rounded hover:bg-primary/10"
                          title="Detay Görüntüle"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            visibility
                          </span>
                        </button>
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="text-text-light-secondary hover:text-blue-600 transition-colors p-1.5 rounded hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => onDelete?.(product.id)}
                          className="text-text-light-secondary hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-text-light-secondary"
                  >
                    {searchTerm || hasActiveFilters
                      ? "No products match your filters"
                      : "No products yet. Add your first product!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {filteredProducts.length > 0 && (
        <div className="flex gap-4 text-sm text-text-light-secondary">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <span>•</span>
          <span>
            Total Stock Value: $
            {filteredProducts
              .reduce((sum, p) => sum + p.costPrice * p.stock, 0)
              .toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </span>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={(productId, updates) => {
            onUpdate?.(productId, updates);
            // Update local selected product state to reflect changes
            setSelectedProduct((prev) =>
              prev ? { ...prev, ...updates } : null
            );
          }}
        />
      )}
    </div>
  );
}
