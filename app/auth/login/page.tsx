"use client";

import { AlertCircle, Eye, EyeOff, Flower2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import React, { useState, Suspense } from "react";

const labelClass = "mb-2 block text-sm font-semibold text-foreground";
const errorTextClass = "mt-2 text-sm font-medium text-error";

function BrandPanel() {
  return (
    <aside className="hidden flex-col justify-between rounded-[32px] bg-black p-12 text-white lg:flex">
      <Link href="/" className="inline-flex items-center gap-3 self-start">
        <Flower2 className="h-6 w-6" aria-hidden="true" />
        <span className="text-xl font-bold tracking-tight">FloraHub</span>
      </Link>

      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/60">
          Florist lokal, langsung ke Anda
        </p>
        <p className="mt-4 text-5xl font-extrabold leading-[1.1] tracking-[-0.024em]">
          Bunga untuk momen yang berarti.
        </p>
        <ul className="mt-10 space-y-4 text-base text-white/80">
          <li className="border-t border-white/15 pt-4">
            Jelajahi koleksi dari florist di FloraHub.
          </li>
          <li className="border-t border-white/15 pt-4">
            Pantau status pesanan sampai bunga diterima.
          </li>
          <li className="border-t border-white/15 pt-4">
            Bayar aman lewat Midtrans.
          </li>
        </ul>
      </div>

      <p className="text-sm text-white/50">
        © {new Date().getFullYear()} FloraHub
      </p>
    </aside>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl");
  const callbackUrl =
    requestedCallback?.startsWith("/") && !requestedCallback.startsWith("//")
      ? requestedCallback
      : "/";

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
        ADMIN: "/",
        CUSTOMER: "/",
      };
      const target = roleHome[role || ""] || "/";
      const allowedCallback =
        callbackUrl === "/" ||
        (role === "CUSTOMER" &&
          !/^\/(admin|supplier|florist)(\/|$)/.test(callbackUrl)) ||
        (role === "FLORIST" && callbackUrl.startsWith("/florist/")) ||
        (role === "SUPPLIER" && callbackUrl.startsWith("/supplier/"));
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
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-2 lg:gap-4 lg:p-4">
      <BrandPanel />

      <main className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-8 lg:min-h-0">
        <div className="mx-auto w-full max-w-[420px]">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-foreground lg:hidden"
          >
            <Flower2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-lg font-bold tracking-tight">FloraHub</span>
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Masuk ke FloraHub
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Lanjutkan aktivitas sesuai peran akun Anda.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-8 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 text-sm text-foreground"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-error"
                aria-hidden="true"
              />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
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
                className={`input-field h-12 ${formErrors.email ? "border-error" : ""}`}
              />
              {formErrors.email && (
                <p id="email-error" className={errorTextClass}>
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Kata sandi
              </label>
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
                  className={`input-field h-12 pr-12 ${formErrors.password ? "border-error" : ""}`}
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
              className="btn-primary h-14 w-full text-base hover:scale-100 active:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Memproses…" : "Masuk"}
            </button>
          </form>

          <p className="mt-8 text-center text-base text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
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
