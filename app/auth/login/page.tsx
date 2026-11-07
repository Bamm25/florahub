"use client";

import { AlertCircle, ArrowRight, Flower2, Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import React, { useState, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email tidak boleh kosong";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Format email tidak valid";
    }

    if (!password) {
      errors.password = "Kata sandi tidak boleh kosong";
    } else if (password.length < 6) {
      errors.password = "Kata sandi minimal 6 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
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
          "Email atau kata sandi tidak cocok. Silakan coba lagi.",
        );
        setIsLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage("Terjadi gangguan koneksi. Silakan coba sesaat lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-surface via-surface-container-low to-primary/5 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Flower2 className="h-8 w-8 text-primary" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            Flora<span className="text-primary">Hub</span>
          </span>
        </Link>
        <h2 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
          Masuk ke Akun Anda
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-primary hover:underline transition-colors"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-elevated">
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error/5 p-4 text-base text-error">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-base font-semibold text-foreground mb-2"
              >
                Alamat Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormErrors({ ...formErrors, email: "" });
                  }}
                  placeholder="nama@email.com"
                  className={`input-field pl-12 ${formErrors.email ? "border-error" : ""}`}
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-sm text-error">{formErrors.email}</p>
              )}
            </div>
            
            <div>
              <label
                htmlFor="password"
                className="block text-base font-semibold text-foreground mb-2"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors({ ...formErrors, password: "" });
                  }}
                  placeholder="••••••••"
                  className={`input-field pl-12 ${formErrors.password ? "border-error" : ""}`}
                />
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-error">{formErrors.password}</p>
              )}
            </div>
            
            <div className="rounded-xl bg-success/5 p-4 text-sm text-success border border-success/20">
              <strong className="font-bold">Demo Customer:</strong> budi@mail.com / password123
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-12 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface via-surface-container-low to-primary/5">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary"></div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Memuat halaman login...
          </p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
