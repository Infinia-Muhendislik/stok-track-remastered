"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";

import type { Order } from "@/types/dashboard";

interface OrdersPageProps {
  orders: Order[];
  searchTerm: string;
  isDistributor?: boolean;
  onStatusUpdate?: () => void;
}

const STATUS_STYLES: Record<Order["status"], string> = {
  Pending: "bg-orange-100 text-orange-700",
  Approved: "bg-blue-100 text-blue-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
  Canceled: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<Order["status"], string> = {
  Pending: "schedule",
  Approved: "check_circle",
  Shipped: "local_shipping",
  Delivered: "inventory_2",
  Canceled: "cancel",
};

const STATUS_LABELS: Record<Order["status"], string> = {
  Pending: "Beklemede",
  Approved: "Onaylandı",
  Shipped: "Kargoda",
  Delivered: "Teslim Edildi",
  Canceled: "İptal Edildi",
};

const NEXT_STATUS: Record<Order["status"], Order["status"] | null> = {
  Pending: "Approved",
  Approved: "Shipped",
  Shipped: "Delivered",
  Delivered: null,
  Canceled: null,
};

export function OrdersPage({
  orders,
  searchTerm,
  isDistributor = false,
  onStatusUpdate,
}: OrdersPageProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "">("");
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter) {
      result = result.filter((order) => order.status === statusFilter);
    }

    const normalized = searchTerm.trim().toLowerCase();
    if (normalized) {
      result = result.filter((order) =>
        [order.id, order.customer].some((value) =>
          value.toLowerCase().includes(normalized)
        )
      );
    }

    return result;
  }, [orders, searchTerm, statusFilter]);

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    const result = await Swal.fire({
      title: "Durumu Güncelle",
      text: `Sipariş durumunu "${STATUS_LABELS[newStatus]}" olarak değiştirmek istiyor musunuz?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Güncelle",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    setIsUpdating(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Güncellendi!",
          text: "Sipariş durumu başarıyla güncellendi.",
          timer: 1500,
          showConfirmButton: false,
        });
        onStatusUpdate?.();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Durum güncellenemedi",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Bağlantı kurulamadı",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Siparişi İptal Et",
      text: "Bu siparişi iptal etmek istediğinizden emin misiniz?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, İptal Et",
      cancelButtonText: "Vazgeç",
    });

    if (!result.isConfirmed) return;

    setIsUpdating(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "Canceled" }),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "İptal Edildi!",
          text: "Sipariş başarıyla iptal edildi.",
          timer: 1500,
          showConfirmButton: false,
        });
        onStatusUpdate?.();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Sipariş iptal edilemedi",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Bağlantı kurulamadı",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleInvoiceUpload = async (orderId: string, file: File) => {
    setIsUploading(orderId);

    try {
      // Dosyayı base64'e çevir (gerçek projede Supabase Storage kullanılmalı)
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        // API'ye gönder
        const res = await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, invoiceUrl: base64 }),
        });

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Fatura Yüklendi!",
            text: "Fatura başarıyla yüklendi ve distribütöre bildirim gönderildi.",
            timer: 2000,
            showConfirmButton: false,
          });
          onStatusUpdate?.();
        } else {
          const data = await res.json();
          Swal.fire({
            icon: "error",
            title: "Hata",
            text: data.error || "Fatura yüklenemedi",
          });
        }
        setIsUploading(null);
      };
      reader.readAsDataURL(file);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Dosya yüklenemedi",
      });
      setIsUploading(null);
    }
  };

  const handleInvoiceDownload = (invoiceUrl: string, orderId: string) => {
    // Base64 data URL'i indir
    const link = document.createElement("a");
    link.href = invoiceUrl;
    link.download = `fatura-${orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "Pending").length;
    const approved = orders.filter((o) => o.status === "Approved").length;
    const shipped = orders.filter((o) => o.status === "Shipped").length;
    const delivered = orders.filter((o) => o.status === "Delivered").length;
    return { pending, approved, shipped, delivered };
  }, [orders]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold text-text-light-primary">
          {isDistributor ? "Siparişlerim" : "Sipariş Yönetimi"}
        </h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as Order["status"] | "")
            }
            className="px-4 py-2 text-sm font-medium border border-border-light rounded-lg bg-white outline-none focus:border-primary"
          >
            <option value="">Tüm Durumlar</option>
            <option value="Pending">Beklemede</option>
            <option value="Approved">Onaylandı</option>
            <option value="Shipped">Kargoda</option>
            <option value="Delivered">Teslim Edildi</option>
            <option value="Canceled">İptal Edildi</option>
          </select>
        </div>
      </div>

      {!isDistributor && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600">
                  schedule
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">
                  {stats.pending}
                </p>
                <p className="text-sm text-orange-600">Beklemede</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600">
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.approved}
                </p>
                <p className="text-sm text-blue-600">Onaylandı</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600">
                  local_shipping
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.shipped}
                </p>
                <p className="text-sm text-purple-600">Kargoda</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600">
                  inventory_2
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {stats.delivered}
                </p>
                <p className="text-sm text-green-600">Teslim Edildi</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card-light rounded-xl border border-border-light overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background-light border-b border-border-light">
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Sipariş No
                </th>
                {!isDistributor && (
                  <th className="p-4 text-sm font-bold text-text-light-secondary">
                    Müşteri
                  </th>
                )}
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Tarih
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Tutar
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Durum
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary">
                  Fatura
                </th>
                <th className="p-4 text-sm font-bold text-text-light-secondary text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const nextStatus = NEXT_STATUS[order.status];
                const canProgress = nextStatus !== null && !isDistributor;
                const canCancel =
                  order.status === "Pending" || order.status === "Approved";

                return (
                  <tr
                    key={order.id}
                    className="border-b border-border-light hover:bg-background-light transition-colors last:border-0"
                  >
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.id}
                      </button>
                    </td>
                    {!isDistributor && (
                      <td className="p-4 text-sm font-medium text-text-light-primary">
                        {order.customer}
                      </td>
                    )}
                    <td className="p-4 text-sm text-text-light-secondary">
                      {formatDate(order.date)}
                    </td>
                    <td className="p-4 text-sm font-bold text-text-light-primary">
                      ${order.amount.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_STYLES[order.status]
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {STATUS_ICONS[order.status]}
                        </span>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="p-4">
                      {order.invoiceUrl ? (
                        <button
                          onClick={() =>
                            handleInvoiceDownload(order.invoiceUrl!, order.id)
                          }
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                          title="Faturayı İndir"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            download
                          </span>
                          İndir
                        </button>
                      ) : !isDistributor ? (
                        <label className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm cursor-pointer">
                          <span className="material-symbols-outlined text-[16px]">
                            {isUploading === order.id
                              ? "hourglass_empty"
                              : "upload_file"}
                          </span>
                          {isUploading === order.id ? "Yükleniyor..." : "Yükle"}
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            disabled={isUploading === order.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleInvoiceUpload(order.id, file);
                            }}
                          />
                        </label>
                      ) : (
                        <span className="text-text-light-secondary text-sm">
                          -
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-text-light-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Detay Görüntüle"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            visibility
                          </span>
                        </button>

                        {canProgress && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(order.id, nextStatus)
                            }
                            disabled={isUpdating === order.id}
                            className="p-2 text-text-light-secondary hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title={`${STATUS_LABELS[nextStatus]} olarak işaretle`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {STATUS_ICONS[nextStatus]}
                            </span>
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={isUpdating === order.id}
                            className="p-2 text-text-light-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Siparişi İptal Et"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              cancel
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={isDistributor ? 6 : 7}
                    className="p-12 text-center text-text-light-secondary"
                  >
                    <span className="material-symbols-outlined text-4xl text-gray-300">
                      inbox
                    </span>
                    <p className="mt-2">
                      {searchTerm || statusFilter
                        ? "Filtrelerle eşleşen sipariş bulunamadı"
                        : "Henüz sipariş yok"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-text-light-primary">
                  Sipariş Detayı
                </h3>
                <p className="text-sm text-text-light-secondary">
                  {selectedOrder.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-text-light-secondary hover:text-text-light-primary p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-border-light">
                <span className="text-text-light-secondary">Müşteri</span>
                <span className="font-medium">{selectedOrder.customer}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-light">
                <span className="text-text-light-secondary">Tarih</span>
                <span className="font-medium">
                  {formatDate(selectedOrder.date)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-light">
                <span className="text-text-light-secondary">Durum</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    STATUS_STYLES[selectedOrder.status]
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {STATUS_ICONS[selectedOrder.status]}
                  </span>
                  {STATUS_LABELS[selectedOrder.status]}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="font-medium text-text-light-primary mb-3">
                Ürünler
              </h4>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-text-light-primary">
                          {item.productName}
                        </p>
                        <p className="text-sm text-text-light-secondary">
                          {item.quantity} adet × ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-bold text-text-light-primary">
                        ${(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-light-secondary text-sm">
                  Ürün detayı bulunamadı
                </p>
              )}
            </div>

            <div className="border-t border-border-light pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Toplam</span>
                <span className="text-xl font-bold text-primary">
                  ${selectedOrder.amount.toFixed(2)}
                </span>
              </div>

              {/* Fatura bölümü */}
              <div className="mt-4 pt-4 border-t border-border-light">
                <div className="flex justify-between items-center">
                  <span className="text-text-light-secondary">Fatura</span>
                  {selectedOrder.invoiceUrl ? (
                    <button
                      onClick={() =>
                        handleInvoiceDownload(
                          selectedOrder.invoiceUrl!,
                          selectedOrder.id
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        download
                      </span>
                      Faturayı İndir
                    </button>
                  ) : !isDistributor ? (
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">
                        upload_file
                      </span>
                      Fatura Yükle
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleInvoiceUpload(selectedOrder.id, file);
                            setSelectedOrder(null);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <span className="text-text-light-secondary text-sm">
                      Henüz yüklenmedi
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isDistributor && NEXT_STATUS[selectedOrder.status] && (
              <div className="mt-4 flex gap-3">
                {(selectedOrder.status === "Pending" ||
                  selectedOrder.status === "Approved") && (
                  <button
                    onClick={() => {
                      handleCancelOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    İptal Et
                  </button>
                )}
                <button
                  onClick={() => {
                    handleUpdateStatus(
                      selectedOrder.id,
                      NEXT_STATUS[selectedOrder.status]!
                    );
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {STATUS_ICONS[NEXT_STATUS[selectedOrder.status]!]}
                  </span>
                  {STATUS_LABELS[NEXT_STATUS[selectedOrder.status]!]} Yap
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
