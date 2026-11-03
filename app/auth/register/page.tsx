"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flower2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role: "CUSTOMER",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.message || "Gagal melakukan pendaftaran akun.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        "Akun berhasil dibuat! Mengalihkan ke halaman login...",
      );
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan saat mendaftar.");
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
          Buat Akun Baru
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Sudah memiliki akun?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary hover:underline transition-colors"
          >
            Masuk sekarang
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

          {successMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-base text-success">
              <CheckCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-base font-semibold text-foreground mb-2"
              >
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="input-field pl-12"
                />
              </div>
            </div>

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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="input-field pl-12"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-base font-semibold text-foreground mb-2"
              >
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="input-field pl-12"
                />
              </div>
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="input-field pl-12"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-12 text-base disabled:cursor-not-allowed disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <span>Mendaftarkan...</span>
              ) : (
                <>
                  <span>Daftar Akun</span>
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
