"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "DISTRIBUTOR";
  isActivated: boolean;
  createdAt: string;
}

export function TeamManagement() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Davet Gönderildi!",
          text: `Davet e-postası ${inviteEmail} adresine gönderildi.`,
          timer: 2500,
          showConfirmButton: false,
        });
        setInviteEmail("");
        setInviteName("");
        setShowInviteForm(false);
        fetchMembers();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Davet gönderilemedi",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Bağlantı kurulamadı",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    // Current user kendini silemez
    if (userId === currentUserId) {
      Swal.fire({
        icon: "warning",
        title: "İşlem Engellendi",
        text: "Kendinizi silemezsiniz.",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Kullanıcıyı Sil",
      html: `<strong>${email}</strong> kullanıcısını silmek istediğinizden emin misiniz?<br><br><span class="text-sm text-gray-500">Bu işlem geri alınamaz!</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Sil",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Silindi!",
          text: "Kullanıcı başarıyla silindi.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchMembers();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Kullanıcı silinemedi",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Bağlantı kurulamadı",
      });
    }
  };

  const handleResendInvite = async (
    userId: string,
    email: string,
    name: string | null
  ) => {
    const result = await Swal.fire({
      title: "Daveti Yenile",
      text: `${email} adresine yeni bir davet bağlantısı göndermek istediğinizden emin misiniz?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Evet, Gönder",
      cancelButtonText: "İptal",
    });

    if (!result.isConfirmed) return;

    try {
      // Önce kullanıcıyı silip yeniden davet gönderelim
      const deleteRes = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!deleteRes.ok) {
        const data = await deleteRes.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Davet yenilenemedi",
        });
        return;
      }

      // Yeni davet gönder
      const inviteRes = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || "" }),
      });

      if (inviteRes.ok) {
        Swal.fire({
          icon: "success",
          title: "Davet Gönderildi!",
          text: `Yeni davet bağlantısı ${email} adresine gönderildi.`,
          timer: 2500,
          showConfirmButton: false,
        });
        fetchMembers();
      } else {
        const data = await inviteRes.json();
        Swal.fire({
          icon: "error",
          title: "Hata",
          text: data.error || "Davet gönderilemedi",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Sunucu Hatası",
        text: "Bağlantı kurulamadı",
      });
    }
  };

  if (isLoading) {
    return (
      <section className="flex max-w-5xl flex-col gap-6">
        <header>
          <h2 className="text-xl font-bold text-text-light-primary">
            Ekip Yönetimi
          </h2>
          <p className="text-sm text-text-light-secondary">
            Distribütörleri davet edin ve ekip üyelerini yönetin.
          </p>
        </header>
        <article className="rounded-2xl border border-border-light bg-card-light p-6 shadow-sm">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="flex max-w-5xl flex-col gap-6">
      <header>
        <h2 className="text-xl font-bold text-text-light-primary">
          Ekip Yönetimi
        </h2>
        <p className="text-sm text-text-light-secondary">
          Distribütörleri davet edin ve ekip üyelerini yönetin.
        </p>
      </header>

      <article className="rounded-2xl border border-border-light bg-card-light p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-light-primary">
            Ekip Üyeleri ({members.length})
          </h3>
          <button
            type="button"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">
              person_add
            </span>
            Distribütör Davet Et
          </button>
        </div>

        {showInviteForm && (
          <form
            onSubmit={handleInvite}
            className="mb-6 rounded-lg border border-border-light bg-gray-50 p-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-text-light-primary">
                Ad Soyad
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Distribütör adı"
                  className="rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-text-light-primary">
                E-posta *
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail("");
                  setInviteName("");
                }}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text-light-secondary transition hover:bg-gray-100"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {isInviting ? "Gönderiliyor..." : "Davet Gönder"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light text-left text-sm text-text-light-secondary">
                <th className="pb-3 font-medium">Kullanıcı</th>
                <th className="pb-3 font-medium">Rol</th>
                <th className="pb-3 font-medium">Durum</th>
                <th className="pb-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;

                return (
                  <tr key={member.id} className="text-sm">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-10 items-center justify-center rounded-full font-medium ${
                            isCurrentUser
                              ? "bg-primary text-white"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {(member.name || member.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text-light-primary flex items-center gap-2">
                            {member.name || "İsim belirtilmemiş"}
                            {isCurrentUser && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Sen
                              </span>
                            )}
                          </p>
                          <p className="text-text-light-secondary">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          member.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {member.role === "ADMIN"
                            ? "shield_person"
                            : "storefront"}
                        </span>
                        {member.role === "ADMIN" ? "Admin" : "Distribütör"}
                      </span>
                    </td>
                    <td className="py-4">
                      {member.isActivated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          <span className="size-1.5 rounded-full bg-green-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Davet Bekliyor
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Davet yenile - sadece aktif değilse ve kendisi değilse */}
                        {!member.isActivated && !isCurrentUser && (
                          <button
                            type="button"
                            onClick={() =>
                              handleResendInvite(
                                member.id,
                                member.email,
                                member.name
                              )
                            }
                            className="rounded-lg p-2 text-text-light-secondary transition hover:bg-gray-100 hover:text-primary"
                            title="Daveti Yeniden Gönder"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              send
                            </span>
                          </button>
                        )}

                        {/* Sil butonu - sadece kendisi değilse göster */}
                        {!isCurrentUser && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(member.id, member.email)
                            }
                            className="rounded-lg p-2 text-text-light-secondary transition hover:bg-red-50 hover:text-red-600"
                            title="Kullanıcıyı Sil"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        )}

                        {/* Kendisi ise bilgi göster */}
                        {isCurrentUser && (
                          <span className="text-xs text-text-light-secondary px-2">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {members.length === 0 && (
            <div className="py-12 text-center text-text-light-secondary">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                group_off
              </span>
              <p className="mt-2">Henüz ekip üyesi yok</p>
              <p className="text-sm">Distribütör davet ederek başlayın</p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
