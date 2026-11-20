"use client";

import { AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { FloraHubMark } from "@/components/ui/FloraHubLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/lib/config/domain";

const labelClass = "mb-2 block text-sm font-semibold text-foreground";
const errorTextClass = "mt-2 text-sm font-medium text-error";

const PORTAL_HIGHLIGHTS = [
  {
    title: "Pembeli",
    detail: "Pesan rangkaian & pantau pengiriman.",
  },
  {
    title: "Florist",
    detail: "Kelola katalog & pesanan toko.",
  },
  {
    title: "Supplier",
    detail: "Atur stok kebun & jadwal panen.",
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
          href="/"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-white/65 transition-colors hover:text-kicker"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Beranda
        </Link>
      </div>

      <div className="my-auto max-w-lg py-10">
        <p className="text-xs font-medium tracking-[0.06em] text-kicker">
          Bunga segar lokal
        </p>
        <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white xl:text-5xl">
          Bunga segar{" "}
          <span className="font-display font-normal italic text-kicker">
            untuk setiap momen
          </span>
          .
        </h2>

        <div className="mt-9 divide-y divide-white/10 rounded-2xl border border-white/12 bg-white/[0.04]">
          {PORTAL_HIGHLIGHTS.map((item) => (
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl");
  const isSafeRelativeCallback =
    typeof requestedCallback === "string" &&
    /^\/(?!\/|\\)[^\s\\]*$/.test(requestedCallback);
  const callbackUrl = isSafeRelativeCallback ? requestedCallback : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Format email belum benar. Contoh: nama@email.com";
    }

    if (!password) {
      errors.password = "Kata sandi wajib diisi.";
    } else if (password.length < 6) {
      errors.password = "Kata sandi minimal 6 karakter.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setFormErrors({});
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setErrorMessage(
          "Email atau kata sandi salah. Periksa kembali, lalu coba lagi.",
        );
        setIsLoading(false);
        return;
      }

      // Fetch session to determine user role
      const { getSession } = await import("next-auth/react");
      const session = await getSession();

      const role = (session?.user as { role?: string } | undefined)?.role;
      const roleHome: Record<string, string> = {
        FLORIST: "/florist/dashboard",
        SUPPLIER: "/supplier/dashboard",
        ADMIN: "/admin/dashboard",
        CUSTOMER: "/",
      };
      const target = roleHome[role || ""] || "/";
      const allowedCallback =
        callbackUrl === "/" ||
        (role === "CUSTOMER" &&
          !/^\/(admin|supplier|florist)(\/|$)/.test(callbackUrl)) ||
        (role === "FLORIST" && callbackUrl.startsWith("/florist/")) ||
        (role === "SUPPLIER" && callbackUrl.startsWith("/supplier/")) ||
        (role === "ADMIN" && callbackUrl.startsWith("/admin/"));
      router.push(
        allowedCallback && callbackUrl !== "/" ? callbackUrl : target,
      );
      router.refresh();
    } catch {
      setErrorMessage(
        "Koneksi terputus. Periksa internet Anda, lalu coba lagi.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <BrandPanel />

      <main className="flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-10 sm:py-8 lg:min-h-0">
        {/* Top Utility Bar + Mode Switcher */}
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
              aria-current="page"
              className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
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
            Masuk ke{" "}
            <span className="font-display font-normal italic text-primary">
              FloraHub
            </span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Masukkan email dan kata sandi akun Anda.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-7 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 text-sm text-foreground"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-error"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-medium">{errorMessage}</p>
                <p className="text-xs text-muted-foreground">
                  Kendala akses atau akun dinonaktifkan?{" "}
                  <a
                    href={SUPPORT_MAILTO_URL}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Hubungi Bantuan &amp; Pengaduan ({SUPPORT_EMAIL})
                  </a>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                placeholder="nama@email.com"
                aria-invalid={Boolean(formErrors.email)}
                aria-describedby={formErrors.email ? "email-error" : undefined}
                className={`input-field h-12 bg-card ${formErrors.email ? "border-error" : ""}`}
              />
              {formErrors.email && (
                <p id="email-error" className={errorTextClass}>
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-foreground"
                >
                  Kata sandi
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="Masukkan kata sandi"
                  aria-invalid={Boolean(formErrors.password)}
                  aria-describedby={
                    formErrors.password ? "password-error" : undefined
                  }
                  className={`input-field h-12 bg-card pr-12 ${formErrors.password ? "border-error" : ""}`}
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
              {formErrors.password && (
                <p id="password-error" className={errorTextClass}>
                  {formErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="btn-primary h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Memproses…" : "Masuk"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground sm:text-base">
            Belum punya akun?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Daftar gratis
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Butuh bantuan akun atau pengaduan?{" "}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <div className="text-center">
            <div className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-surface-container-highest border-t-primary" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Memuat halaman masuk…
            </p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
