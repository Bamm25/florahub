"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/lib/api/customer";
import { ApiClientError } from "@/lib/api/client";
import { FloraHubMark } from "@/components/ui/FloraHubLogo";

const labelClass = "mb-2 block text-sm font-semibold text-foreground";
const errorTextClass = "mt-1.5 text-xs font-medium text-error";

type PublicRole = "CUSTOMER" | "FLORIST" | "SUPPLIER";

const roleOptions: {
  value: PublicRole;
  title: string;
  description: string;
}[] = [
  {
    value: "CUSTOMER",
    title: "Pembeli",
    description: "Cari bunga & pantau pesanan",
  },
  {
    value: "FLORIST",
    title: "Florist",
    description: "Jual rangkaian & kelola toko",
  },
  {
    value: "SUPPLIER",
    title: "Supplier",
    description: "Pasok bunga & jadwal panen",
  },
];

const ROLE_BRIEFING: Record<
  PublicRole,
  {
    kicker: string;
    leadStart: string;
    leadItalic: string;
    points: string[];
  }
> = {
  CUSTOMER: {
    kicker: "Pembeli",
    leadStart: "Bunga segar ",
    leadItalic: "langsung dari florist",
    points: [
      "Pilih rangkaian dari berbagai toko florist lokal.",
      "Cek stok asli sebelum memesan.",
      "Pantau status pesanan hingga tiba.",
    ],
  },
  FLORIST: {
    kicker: "Florist",
    leadStart: "Kelola toko ",
    leadItalic: "bunga Anda",
    points: [
      "Tampilkan katalog produk di halaman toko sendiri.",
      "Atur stok rangkaian dan bahan baku harian.",
      "Terima pesanan pelanggan dari satu tempat.",
    ],
  },
  SUPPLIER: {
    kicker: "Supplier",
    leadStart: "Pasok bunga potong ",
    leadItalic: "langsung ke florist",
    points: [
      "Catat stok bunga segar siap kirim setiap hari.",
      "Buka jadwal panen lebih awal untuk florist.",
      "Kelola pesanan masuk dengan rapi.",
    ],
  },
};

function BrandPanel({ activeRole }: { activeRole: PublicRole }) {
  const briefing = ROLE_BRIEFING[activeRole];

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
          {briefing.kicker}
        </p>
        <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white xl:text-5xl">
          {briefing.leadStart}
          <span className="font-display font-normal italic text-kicker">
            {briefing.leadItalic}
          </span>
          .
        </h2>

        <ul className="mt-9 divide-y divide-white/10 rounded-2xl border border-white/12 bg-white/[0.04]">
          {briefing.points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 p-4 text-sm leading-relaxed text-white/80 sm:px-5"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kicker"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const initialRole: PublicRole =
    requestedRole === "FLORIST" || requestedRole === "SUPPLIER"
      ? requestedRole
      : "CUSTOMER";
  const [role, setRole] = useState<PublicRole>(initialRole);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Nama wajib diisi.";
    } else if (name.trim().length < 3) {
      errors.name = "Nama minimal 3 karakter.";
    }

    if (!email.trim()) {
      errors.email = "Email wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Format email belum benar. Contoh: nama@email.com";
    }

    if (!phone.trim()) {
      errors.phone = "Nomor HP wajib diisi.";
    } else if (!/^\d{10,15}$/.test(phone.trim())) {
      errors.phone = "Nomor HP harus berisi 10–15 angka. Contoh: 08123456789";
    }

    if (!password) {
      errors.password = "Kata sandi wajib diisi.";
    } else if (password.length < 8) {
      errors.password = "Kata sandi minimal 8 karakter.";
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
    setSuccessMessage(null);
    setFormErrors({});

    try {
      await registerUser({
        name,
        email,
        phone,
        password,
        role,
      });

      setSuccessMessage("Akun berhasil dibuat. Mengarahkan ke halaman masuk…");
      redirectTimerRef.current = window.setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(
          error.message || "Pendaftaran gagal. Silakan coba lagi.",
        );
      } else {
        setErrorMessage(
          "Koneksi terputus saat mendaftar. Periksa internet Anda, lalu coba lagi.",
        );
      }
      setIsLoading(false);
    }
  };

  const isDone = Boolean(successMessage);

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <BrandPanel activeRole={role} />

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
              className="inline-flex min-h-9 items-center rounded-full px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Masuk
            </Link>
            <Link
              href="/auth/register"
              aria-current="page"
              className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Daftar
            </Link>
          </nav>
        </div>

        <div className="mx-auto my-auto w-full max-w-[460px] py-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Buat akun{" "}
            <span className="font-display font-normal italic text-primary">
              FloraHub
            </span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Pilih peran akun Anda.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 text-sm text-foreground"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-error"
                aria-hidden="true"
              />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-success/50 bg-secondary-container p-4 text-sm text-foreground"
            >
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <fieldset>
              <legend className={labelClass}>Saya mendaftar sebagai</legend>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {roleOptions.map((option) => {
                  const isSelected = role === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`relative cursor-pointer rounded-xl border p-3.5 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                        isSelected
                          ? "border-primary bg-primary-container"
                          : "border-border bg-card hover:border-outline"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => setRole(option.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {option.title}
                        </span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        )}
                      </div>
                      <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Nama lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                  placeholder="Contoh: Siti Rahma"
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? "name-error" : undefined}
                  className={`input-field h-12 bg-card ${formErrors.name ? "border-error" : ""}`}
                />
                {formErrors.name && (
                  <p id="name-error" className={errorTextClass}>
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Nomor HP / WhatsApp
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  placeholder="08123456789"
                  aria-invalid={Boolean(formErrors.phone)}
                  aria-describedby={formErrors.phone ? "phone-error" : undefined}
                  className={`input-field h-12 bg-card ${formErrors.phone ? "border-error" : ""}`}
                />
                {formErrors.phone && (
                  <p id="phone-error" className={errorTextClass}>
                    {formErrors.phone}
                  </p>
                )}
              </div>
            </div>

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
              <label htmlFor="password" className={labelClass}>
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="Minimal 8 karakter"
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isDone}
                aria-busy={isLoading}
                className="btn-primary h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDone
                  ? "Akun dibuat"
                  : isLoading
                    ? "Mendaftarkan…"
                    : "Buat akun"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground sm:text-base">
            Sudah punya akun?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Masuk
            </Link>
          </p>
        </div>

        <div aria-hidden="true" />
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
          Memuat pendaftaran…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
