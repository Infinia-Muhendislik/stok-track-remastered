"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus({ variant: "error", message: "Şifreler eşleşmiyor." });
      return;
    }

    if (!token) {
      setStatus({
        variant: "error",
        message: "Geçersiz veya eksik davet bağlantısı.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Şifre oluşturulamadı."
        );
      }

      setPassword("");
      setConfirmPassword("");
      setStatus({
        variant: "success",
        message: "Şifreniz başarıyla oluşturuldu! Giriş yapabilirsiniz.",
      });

      // 2 saniye sonra login'e yönlendir
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.";
      setStatus({ variant: "error", message: fallbackMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#e8f0ff,#f7f9fc)] px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-8 text-slate-900 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <div className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/images/mari-logo.webp"
              alt="Marisonia Logo"
              className="h-16 w-16 rounded-xl"
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Bayi Portalı
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Şifrenizi Oluşturun
          </h1>
          <p className="text-sm text-slate-600">
            Marisonia Bayi Paneline hoş geldiniz! Lütfen hesabınız için güçlü
            bir şifre belirleyin.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Şifre
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="confirmPassword"
            >
              Şifre Tekrar
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
            />
          </div>

          {status ? (
            <div
              aria-live="polite"
              className={`rounded-xl border px-3 py-2 text-sm ${
                status.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-600"
              }`}
            >
              {status.message}
            </div>
          ) : null}

          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || !token}
            type="submit"
          >
            {isSubmitting ? "Oluşturuluyor..." : "Şifremi Oluştur"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Zaten hesabınız var mı?{" "}
          <Link
            className="font-semibold text-blue-700 hover:text-blue-600"
            href="/login"
          >
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#e8f0ff,#f7f9fc)]">
          <div className="animate-pulse text-slate-500">Yükleniyor...</div>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
