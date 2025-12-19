"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

import { Header } from "./Header";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationsPageClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=100");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchNotifications();
      Swal.fire({
        icon: "success",
        title: "Tamamlandı",
        text: "Tüm bildirimler okundu olarak işaretlendi.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    const result = await Swal.fire({
      title: "Bildirimi Sil",
      text: "Bu bildirimi silmek istediğinizden emin misiniz?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Sil",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        Swal.fire({
          icon: "success",
          title: "Silindi",
          text: "Bildirim silindi.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      title: "Tüm Bildirimleri Sil",
      text: `${notifications.length} bildirimin tamamını silmek istediğinizden emin misiniz?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Tümünü Sil",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (res.ok) {
        setNotifications([]);
        Swal.fire({
          icon: "success",
          title: "Silindi",
          text: "Tüm bildirimler silindi.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Az önce";
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString("tr-TR");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order":
        return "shopping_cart";
      case "invoice":
        return "receipt_long";
      case "stock":
        return "inventory";
      case "team":
        return "group";
      default:
        return "notifications";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "order":
        return "bg-blue-100 text-blue-600";
      case "invoice":
        return "bg-green-100 text-green-600";
      case "stock":
        return "bg-orange-100 text-orange-600";
      case "team":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "order":
        return "Sipariş";
      case "invoice":
        return "Fatura";
      case "stock":
        return "Stok";
      case "team":
        return "Ekip";
      default:
        return "Bildirim";
    }
  };

  // Filtreleme
  const filteredNotifications = notifications.filter((n) => {
    // Arama filtresi
    const searchMatch =
      !searchTerm ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase());

    // Okunma durumu filtresi
    const readMatch =
      filter === "all" ||
      (filter === "unread" && !n.read) ||
      (filter === "read" && n.read);

    return searchMatch && readMatch;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <>
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border-light p-4 animate-pulse"
            >
              <div className="flex gap-4">
                <div className="size-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tümü ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Okunmamış ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "read"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Okunmuş ({notifications.length - unreadCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                done_all
              </span>
              Tümünü Okundu İşaretle
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                delete_sweep
              </span>
              Tümünü Sil
            </button>
          )}
        </div>
      </div>

      {/* Bildirim Listesi */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300">
            notifications_off
          </span>
          <h3 className="mt-4 text-lg font-semibold text-text-light-primary">
            {searchTerm || filter !== "all"
              ? "Sonuç bulunamadı"
              : "Henüz bildirim yok"}
          </h3>
          <p className="mt-2 text-text-light-secondary">
            {searchTerm || filter !== "all"
              ? "Arama kriterlerinize uygun bildirim bulunamadı."
              : "Yeni bildirimler burada görünecek."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl border border-border-light p-4 transition-all hover:shadow-md ${
                !notification.read ? "bg-blue-50/30 border-blue-200" : ""
              }`}
            >
              <div className="flex gap-4">
                {/* İkon */}
                <div
                  className={`size-12 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(
                    notification.type
                  )}`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {getTypeIcon(notification.type)}
                  </span>
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-base ${
                            !notification.read ? "font-semibold" : "font-medium"
                          } text-text-light-primary`}
                        >
                          {notification.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(
                            notification.type
                          )}`}
                        >
                          {getTypeLabel(notification.type)}
                        </span>
                        {!notification.read && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-text-light-secondary">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-text-light-secondary">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Okundu işaretle"
                        >
                          <span className="material-symbols-outlined text-text-light-secondary text-xl">
                            check
                          </span>
                        </button>
                      )}
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Detaya git"
                        >
                          <span className="material-symbols-outlined text-text-light-secondary text-xl">
                            open_in_new
                          </span>
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Sil"
                      >
                        <span className="material-symbols-outlined text-red-500 text-xl">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
