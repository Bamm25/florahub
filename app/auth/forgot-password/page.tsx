"use client";

import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { FloraHubMark } from "@/components/ui/FloraHubLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/lib/config/domain";

const RESET_FLOW_NOTES = [
  {
    title: "Berlaku untuk Pembeli, Florist, & Supplier",
    detail: "Masukkan email akun aktif Anda untuk menerima tautan pemulihan.",
  },
  {
    title: "Tautan Berlaku Terbatas",
    detail: "Tautan pengaturan ulang aktif selama 30 menit dan hanya sekali pakai.",
  },
  {
    title: "Keamanan Sesi Otomatis",
    detail: "Setelah kata sandi diubah, seluruh sesi masuk sebelumnya otomatis keluar.",
  },
] as const;

function BrandPanel() {
  return (
    <aside className="hidden flex-col justify-between border-r border-white/10 bg-surface-dark px-12 py-10 text-white lg:flex xl:px-16">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <FloraHubMark className="h-7 w-7" variant="dark" />
          <span className="text-xl font-bold tracking-tight text-white">
            Flora<span className="font-display font-normal italic text-kicker">Hub</span>
          </span>
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-white/65 transition-colors hover:text-kicker"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Kembali ke Masuk
        </Link>
      </div>

      <div className="my-auto max-w-lg py-10">
        <p className="text-xs font-medium tracking-[0.06em] text-kicker">
          Pemulihan akses akun
        </p>
        <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white xl:text-5xl">
          Kembalikan akses{" "}
          <span className="font-display font-normal italic text-kicker">
            akun Anda
          </span>
          .
        </h2>

        <div className="mt-9 divide-y divide-white/10 rounded-2xl border border-white/12 bg-white/[0.04]">
          {RESET_FLOW_NOTES.map((item) => (
            <div key={item.title} className="p-4 sm:px-5">
              <p className="text-sm font-semibold text-kicker">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/70">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/50">
        <span>© {new Date().getFullYear()} FloraHub</span>
        <span className="text-white/55">
          Khusus Wilayah{" "}
          <span className="font-display text-sm font-normal italic text-kicker">
            Jawa Timur
          </span>
        </span>
      </div>
    </aside>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldError("Masukkan alamat email yang valid, misalnya nama@email.com.");
      return;
    }

    setFieldError(null);
    setServerError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !payload?.success) {
        setServerError(
          payload?.message ||
            "Gagal mengirim permintaan pengaturan ulang kata sandi.",
        );
        return;
      }

      setSuccessMessage(
        payload.message ||
          "Jika email terdaftar pada akun aktif, tautan pengaturan ulang kata sandi telah dikirim.",
      );
    } catch {
      setServerError(
        "Koneksi terputus. Periksa jaringan internet Anda, lalu coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const describedBy = fieldError ? "email-hint email-error" : "email-hint";

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <BrandPanel />

      <main className="flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-10 sm:py-8 lg:min-h-0">
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground lg:hidden"
          >
            <FloraHubMark className="h-6 w-6" variant="light" />
            <span className="text-lg font-bold tracking-tight">
              Flora<span className="font-display font-normal italic text-primary">Hub</span>
            </span>
          </Link>

          <nav
            aria-label="Navigasi akun"
            className="ml-auto inline-flex items-center rounded-full border border-border bg-card p-1"
          >
            <Link
              href="/auth/login"
              className="inline-flex min-h-9 items-center rounded-full px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Masuk
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex min-h-9 items-center rounded-full px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Daftar
            </Link>
          </nav>
        </div>

        <div className="mx-auto my-auto w-full max-w-[430px] py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Lupa{" "}
            <span className="font-display font-normal italic text-primary">
              kata sandi
            </span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Masukkan email akun Anda untuk menerima tautan pembuatan kata sandi baru.
          </p>

          {successMessage ? (
            <div
              role="status"
              className="mt-7 space-y-4 rounded-2xl border border-primary/25 bg-card p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    Permintaan diproses
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {successMessage}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href="/auth/login"
                  className="btn-primary h-12 w-full text-sm font-semibold"
                >
                  Kembali ke halaman masuk
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setEmail("");
                  }}
                  className="btn-secondary h-11 w-full text-xs font-semibold"
                >
                  Kirim dengan email lain
                </button>
              </div>
            </div>
          ) : (
            <>
              {serverError && (
                <div
                  role="alert"
                  className="mt-7 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 text-sm text-foreground"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-error"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-semibold text-foreground"
                  >
                    Email terdaftar
                  </label>
                  <p
                    id="email-hint"
                    className="mb-2 text-xs text-muted-foreground"
                  >
                    Contoh format: nama@email.com
                  </p>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    inputMode="email"
                    spellCheck={false}
                    enterKeyHint="send"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldError) setFieldError(null);
                      if (serverError) setServerError(null);
                    }}
                    placeholder="nama@email.com"
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={describedBy}
                    className={`input-field h-12 bg-card ${fieldError ? "border-error" : ""}`}
                  />
                  {fieldError && (
                    <p id="email-error" className="mt-2 text-sm font-medium text-error">
                      {fieldError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="btn-primary h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Mengirim tautan…" : "Kirim tautan pengaturan ulang"}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Sudah ingat kata sandi?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Masuk sekarang
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Kendala akun atau bantuan lebih lanjut?{" "}
            <a
              href={SUPPORT_MAILTO_URL}
              className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Hubungi Bantuan ({SUPPORT_EMAIL})
            </a>
          </p>
        </div>

        <div aria-hidden="true" />
      </main>
    </div>
  );
}
