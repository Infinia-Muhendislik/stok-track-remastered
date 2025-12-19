"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  onAddProduct?: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Stok durumunuza genel bakış",
  },
  "/dashboard/products": {
    title: "Ürünler",
    subtitle: "Ürünlerinizi yönetin",
  },
  "/dashboard/orders": {
    title: "Siparişler",
    subtitle: "Sipariş takibi ve yönetimi",
  },
  "/dashboard/reports": {
    title: "Raporlar",
    subtitle: "Satış ve stok raporları",
  },
  "/dashboard/team": {
    title: "Ekip Yönetimi",
    subtitle: "Distribütörleri yönetin",
  },
  "/dashboard/settings": {
    title: "Ayarlar",
    subtitle: "Hesap ve bildirim ayarları",
  },
  "/dashboard/notifications": {
    title: "Bildirimler",
    subtitle: "Tüm bildirimlerinizi görüntüleyin",
  },
};

export function Header({
  searchTerm,
  setSearchTerm,
  onAddProduct,
}: HeaderProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageInfo = PAGE_TITLES[pathname] || PAGE_TITLES["/dashboard"];

  // Sadece unread count çek (hızlı)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?countOnly=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notification count:", err);
    }
  }, []);

  // Tam listeyi çek (dropdown açıldığında)
  const fetchNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    // Sayfa yüklendiğinde sadece count çek
    const initialTimeout = setTimeout(fetchUnreadCount, 1000);
    // Her 60 saniyede bir count yenile
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Dropdown açıldığında tam listeyi çek
  useEffect(() => {
    if (showNotifications && notifications.length === 0) {
      fetchNotifications();
    }
  }, [showNotifications, notifications.length, fetchNotifications]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Background update
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      }).catch((err) => console.error("Failed to mark notification as read:", err));
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
    setShowNotifications(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Az önce";
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    return `${days} gün önce`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order":
        return "shopping_cart";
      case "invoice":
        return "receipt_long";
      case "stock":
        return "inventory";
      default:
        return "notifications";
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-light-primary dark:text-dark-primary">
          {pageInfo.title}
        </h1>
        <p className="text-text-light-secondary dark:text-dark-secondary">
          {pageInfo.subtitle}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <label className="flex flex-col min-w-40 h-11 w-72">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-text-light-secondary dark:text-dark-secondary flex items-center justify-center pl-3">
                search
              </span>
              <input
                className="form-input w-full flex-1 resize-none overflow-hidden rounded-lg text-text-light-primary dark:text-dark-primary focus:outline-none focus:ring-0 border-none bg-transparent h-full placeholder:text-text-light-secondary dark:placeholder:text-dark-secondary pl-2 text-sm font-normal"
                placeholder="Search products, orders..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </label>
        </div>

        {/* Bildirimler */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-text-light-secondary">
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full size-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border-light shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-border-light">
                <h3 className="font-semibold text-text-light-primary">
                  Bildirimler
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Tümünü okundu işaretle
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingNotifications ? (
                  <div className="p-6 text-center text-text-light-secondary">
                    <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="mt-2 text-sm">Yükleniyor...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-text-light-secondary">
                    <span className="material-symbols-outlined text-3xl text-gray-300">
                      notifications_off
                    </span>
                    <p className="mt-2 text-sm">Bildirim yok</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-border-light last:border-0 ${
                        !notification.read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notification.type === "order"
                              ? "bg-blue-100 text-blue-600"
                              : notification.type === "invoice"
                              ? "bg-green-100 text-green-600"
                              : notification.type === "stock"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {getTypeIcon(notification.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              !notification.read ? "font-semibold" : ""
                            } text-text-light-primary truncate`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-text-light-secondary line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-text-light-secondary mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="size-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {onAddProduct && (
          <button
            type="button"
            onClick={onAddProduct}
            className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-11 px-4 bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-bold shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
            <span className="truncate">Yeni Ürün</span>
          </button>
        )}
      </div>
    </header>
  );
}
