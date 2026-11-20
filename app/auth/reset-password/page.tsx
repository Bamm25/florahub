"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { FloraHubMark } from "@/components/ui/FloraHubLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/lib/config/domain";

type TokenCheckState = "checking" | "invalid" | "valid" | "success";

const SECURITY_NOTES = [
  {
    title: "Minimal 8 Karakter",
    detail: "Gunakan kata sandi yang kuat dan mudah Anda kelola dengan aman.",
  },
  {
    title: "Tautan Sekali Pakai",
    detail: "Setelah disimpan, tautan ini langsung hangus dan tidak bisa dipakai ulang.",
  },
  {
    title: "Logout Perangkat Lain",
    detail: "Seluruh sesi aktif di perangkat lain otomatis berakhir demi keamanan akun.",
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
          Masuk
        </Link>
      </div>

      <div className="my-auto max-w-lg py-10">
        <p className="text-xs font-medium tracking-[0.06em] text-kicker">
          Keamanan akun
        </p>
        <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white xl:text-5xl">
          Buat kata sandi{" "}
          <span className="font-display font-normal italic text-kicker">
            baru Anda
          </span>
          .
        </h2>

        <div className="mt-9 divide-y divide-white/10 rounded-2xl border border-white/12 bg-white/[0.04]">
          {SECURITY_NOTES.map((item) => (
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

function ResetPasswordFormContent({ token }: { token: string }) {
  const [viewState, setViewState] = useState<TokenCheckState>(
    token ? "checking" : "invalid",
  );
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string>(
    token
      ? ""
      : "Tautan pengaturan ulang kata sandi tidak ditemukan atau tidak lengkap.",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function verifyToken() {
      try {
        const response = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean;
          message?: string;
        } | null;

        if (controller.signal.aborted) return;

        if (!response.ok || !payload?.success) {
          setTokenErrorMessage(
            payload?.message ||
              "Tautan pengaturan ulang kata sandi tidak valid atau sudah kedaluwarsa.",
          );
          setViewState("invalid");
          return;
        }

        setViewState("valid");
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setTokenErrorMessage(
          "Tidak dapat memverifikasi tautan saat ini. Periksa koneksi Anda, lalu muat ulang halaman.",
        );
        setViewState("invalid");
      }
    }

    void verifyToken();
    return () => controller.abort();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setFieldError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password.length > 128) {
      setFieldError("Kata sandi maksimal 128 karakter.");
      return;
    }

    setFieldError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !payload?.success) {
        const message =
          payload?.message || "Gagal memperbarui kata sandi. Silakan coba lagi.";
        if (response.status === 400 && /kedaluwarsa|tautan/i.test(message)) {
          setTokenErrorMessage(message);
          setViewState("invalid");
        } else {
          setSubmitError(message);
        }
        return;
      }

      setSuccessMessage(
        payload.message ||
          "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
      );
      setViewState("success");
    } catch {
      setSubmitError(
        "Koneksi terputus. Periksa jaringan internet Anda, lalu coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const describedBy = fieldError
    ? "password-rules password-error"
    : "password-rules";

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
              href="/auth/forgot-password"
              className="inline-flex min-h-9 items-center rounded-full px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Minta Tautan
            </Link>
          </nav>
        </div>

        <div className="mx-auto my-auto w-full max-w-[430px] py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Atur ulang{" "}
            <span className="font-display font-normal italic text-primary">
              kata sandi
            </span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Masukkan kata sandi baru untuk mengamankan akun FloraHub Anda.
          </p>

          {viewState === "checking" && (
            <div className="mt-7 rounded-2xl border border-border bg-card p-6 text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-3 border-surface-container-highest border-t-primary" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Memeriksa tautan pengaturan ulang…
              </p>
            </div>
          )}

          {viewState === "invalid" && (
            <div
              role="alert"
              className="mt-7 space-y-4 rounded-2xl border border-error/30 bg-card p-6"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-error"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Tautan tidak dapat digunakan
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {tokenErrorMessage}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href="/auth/forgot-password"
                  className="btn-primary h-12 w-full text-sm font-semibold"
                >
                  Minta Tautan Baru
                </Link>
                <Link
                  href="/auth/login"
                  className="btn-secondary h-11 w-full text-xs font-semibold"
                >
                  Kembali ke halaman masuk
                </Link>
              </div>
            </div>
          )}

          {viewState === "valid" && (
            <>
              {submitError && (
                <div
                  role="alert"
                  className="mt-7 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 text-sm text-foreground"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-error"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1 block text-sm font-semibold text-foreground"
                  >
                    Kata sandi baru
                  </label>
                  <p
                    id="password-rules"
                    className="mb-2 text-xs text-muted-foreground"
                  >
                    Minimal 8 karakter dan maksimal 128 karakter.
                  </p>
                  <div className="relative">
                    <input
                      id="new-password"
                      name="new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      enterKeyHint="done"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldError) setFieldError(null);
                        if (submitError) setSubmitError(null);
                      }}
                      placeholder="Masukkan kata sandi baru"
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={describedBy}
                      className={`input-field h-12 bg-card pr-12 ${fieldError ? "border-error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {fieldError && (
                    <p id="password-error" className="mt-2 text-sm font-medium text-error">
                      {fieldError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="btn-primary h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan…" : "Simpan kata sandi baru"}
                </button>
              </form>
            </>
          )}

          {viewState === "success" && (
            <div
              role="status"
              className="mt-7 space-y-4 rounded-2xl border border-primary/25 bg-card p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Kata sandi diperbarui
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {successMessage}
                  </p>
                </div>
              </div>

              <Link
                href="/auth/login"
                className="btn-primary h-12 w-full text-sm font-semibold"
              >
                Masuk ke Akun
              </Link>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Butuh bantuan akun?{" "}
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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  return <ResetPasswordFormContent key={token} token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <div className="text-center">
            <div className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-surface-container-highest border-t-primary" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Memuat halaman pengaturan ulang kata sandi…
            </p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
