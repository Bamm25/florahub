"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, Eye, EyeOff, Flower2 } from "lucide-react";

const labelClass = "mb-2 block text-sm font-semibold text-foreground";
const hintTextClass = "mt-2 text-sm text-muted-foreground";
const errorTextClass = "mt-2 text-sm font-medium text-error";
type PublicRole = "CUSTOMER" | "FLORIST" | "SUPPLIER";
const roleOptions: { value: PublicRole; title: string; description: string }[] = [
  { value: "CUSTOMER", title: "Pembeli", description: "Cari bunga dan pantau pesanan." },
  { value: "FLORIST", title: "Florist", description: "Jual produk dan kelola pesanan." },
  { value: "SUPPLIER", title: "Supplier", description: "Sediakan stok dan rencana panen." },
];

function BrandPanel() {
  return (
    <aside className="hidden flex-col justify-between rounded-[32px] bg-black p-12 text-white lg:flex">
      <Link href="/" className="inline-flex items-center gap-3 self-start">
        <Flower2 className="h-6 w-6" aria-hidden="true" />
        <span className="text-xl font-bold tracking-tight">FloraHub</span>
      </Link>

      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/60">
          Buat akun pelanggan
        </p>
        <p className="mt-4 text-5xl font-extrabold leading-[1.1] tracking-[-0.024em]">
          Kirim bunga untuk momen yang berarti.
        </p>
        <ol className="mt-10 space-y-4 text-base text-white/80">
          <li className="flex gap-4 border-t border-white/15 pt-4">
            <span className="font-semibold text-white">01</span>
            Pilih peran Anda: pembeli, florist, atau supplier.
          </li>
          <li className="flex gap-4 border-t border-white/15 pt-4">
            <span className="font-semibold text-white">02</span>
            Kelola kebutuhan Anda dalam satu tempat.
          </li>
          <li className="flex gap-4 border-t border-white/15 pt-4">
            <span className="font-semibold text-white">03</span>
            Terhubung dari pasokan hingga pesanan.
          </li>
        </ol>
      </div>

      <p className="text-sm text-white/50">© {new Date().getFullYear()} FloraHub</p>
    </aside>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const initialRole: PublicRole = requestedRole === "FLORIST" || requestedRole === "SUPPLIER" ? requestedRole : "CUSTOMER";
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormErrors({});

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.message || "Pendaftaran gagal. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Akun berhasil dibuat. Mengarahkan ke halaman masuk…");
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      setErrorMessage("Koneksi terputus saat mendaftar. Periksa internet Anda, lalu coba lagi.");
      setIsLoading(false);
    }
  };

  const isDone = Boolean(successMessage);

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

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">Buat akun FloraHub</h1>
          <p className="mt-2 text-base text-muted-foreground">Pilih cara Anda menggunakan FloraHub, lalu isi data akun.</p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-8 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4 text-sm text-foreground"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mt-8 flex items-start gap-3 rounded-xl border border-success/50 bg-secondary-container p-4 text-sm text-foreground"
            >
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success-foreground" aria-hidden="true" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <fieldset>
              <legend className={labelClass}>Saya mendaftar sebagai</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {roleOptions.map((option) => (
                  <label key={option.value} className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${role === option.value ? "border-primary bg-primary-container" : "border-border hover:border-primary/50"}`}>
                    <input type="radio" name="role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)} className="sr-only" />
                    <span className="block font-semibold text-foreground">{option.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Akun admin dikelola oleh pengelola platform, bukan melalui pendaftaran umum.</p>
            </fieldset>
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
                className={`input-field h-12 ${formErrors.name ? "border-error" : ""}`}
              />
              {formErrors.name && (
                <p id="name-error" className={errorTextClass}>
                  {formErrors.name}
                </p>
              )}
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
                className={`input-field h-12 ${formErrors.email ? "border-error" : ""}`}
              />
              {formErrors.email && (
                <p id="email-error" className={errorTextClass}>
                  {formErrors.email}
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
                aria-describedby={formErrors.phone ? "phone-error" : "phone-hint"}
                className={`input-field h-12 ${formErrors.phone ? "border-error" : ""}`}
              />
              {formErrors.phone ? (
                <p id="phone-error" className={errorTextClass}>
                  {formErrors.phone}
                </p>
              ) : (
                <p id="phone-hint" className={hintTextClass}>
                  Dipakai florist dan kurir untuk konfirmasi pengiriman.
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
                  aria-describedby={formErrors.password ? "password-error" : "password-hint"}
                  className={`input-field h-12 pr-12 ${formErrors.password ? "border-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
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
              {formErrors.password ? (
                <p id="password-error" className={errorTextClass}>
                  {formErrors.password}
                </p>
              ) : (
                <p id="password-hint" className={hintTextClass}>
                  Gunakan minimal 8 karakter.
                </p>
              )}
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading || isDone}
                aria-busy={isLoading}
                className="btn-primary h-14 w-full text-base hover:scale-100 active:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDone ? "Akun dibuat" : isLoading ? "Mendaftarkan…" : "Buat akun"}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-base text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Masuk
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat pendaftaran…</div>}><RegisterForm /></Suspense>;
}
