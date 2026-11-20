"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Modal from "@/components/forms/Modal";
import FormField from "@/components/forms/FormField";
import { LoadingSpinner, ErrorState } from "@/components/ui";
import {
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerProfileData,
} from "@/lib/api/customer";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

// Halaman profil akun editorial dengan masthead gelap tunggal, ringkasan belanja, dan modal edit profil
export default function ProfilePage() {
  const router = useRouter();
  const { status, update } = useSession();

  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadProfile = useCallback(async (signal?: AbortSignal): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getCustomerProfile(signal);
      if (!signal?.aborted) {
        setProfile(data);
      }
    } catch (error) {
      if (
        signal?.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat profil.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/profile");
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadProfile(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [status, router, loadProfile]);

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <LoadingSpinner message="Memuat profil..." />
        </div>
      </main>
    );
  }

  if (errorMessage && !profile) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <ErrorState
            title="Gagal Memuat Profil"
            error={errorMessage}
            onRetry={() => void loadProfile()}
          />
        </div>
      </main>
    );
  }

  const initialLetter = profile?.name
    ? profile.name.charAt(0).toUpperCase()
    : "U";

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Masthead */}
      <section className="border-b border-white/10 bg-surface-dark py-10 text-white sm:py-14">
        <div className="container-custom">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-5">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 font-display text-2xl italic text-kicker"
              >
                {initialLetter}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {profile?.name || "Profil"}
                  </h1>
                  {profile?.emailVerified && (
                    <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">
                      Terverifikasi
                    </span>
                  )}
                </div>
                {profile && (
                  <p className="mt-1.5 text-sm text-white/70">
                    {profile.email} · Bergabung {formatDate(profile.createdAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/profile/addresses"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Buku Alamat
              </Link>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="btn-primary h-11 px-5 py-0 text-sm"
              >
                Ubah Profil
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom pt-8 sm:pt-12">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error"
          >
            {errorMessage}
          </div>
        )}

        {profile && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:gap-12">
            {/* Kolom Kiri: Data Kontak & Akses Cepat */}
            <div className="space-y-6">
              <section
                aria-labelledby="personal-info-heading"
                className="rounded-2xl border border-border bg-card p-6 sm:p-7"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2
                    id="personal-info-heading"
                    className="text-base font-semibold text-foreground"
                  >
                    Data Kontak
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Ubah
                  </button>
                </div>

                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Nama Lengkap
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {profile.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="mt-1 break-all text-sm font-medium text-foreground">
                      {profile.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      No. Telepon
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-medium tabular-nums text-foreground">
                      {profile.phone || "Belum diisi"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Bergabung</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {formatDate(profile.createdAt)}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Akses Cepat */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  href="/orders"
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
                >
                  <div>
                    <span className="block text-sm font-semibold text-foreground">
                      Pesanan Saya
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Status &amp; riwayat
                    </span>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  href="/profile/addresses"
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
                >
                  <div>
                    <span className="block text-sm font-semibold text-foreground">
                      Alamat
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Daftar tujuan
                    </span>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  href="/notifications"
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
                >
                  <div>
                    <span className="block text-sm font-semibold text-foreground">
                      Notifikasi
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Kabar pesanan
                    </span>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            {/* Kolom Kanan: Kartu Ringkasan Belanja Gelap Sticky */}
            <aside className="lg:sticky lg:top-24" aria-labelledby="stats-heading">
              <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-dark p-6 text-white sm:p-7">
                <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-4">
                  <h2
                    id="stats-heading"
                    className="text-xl font-bold tracking-tight text-white"
                  >
                    Ringkasan Belanja
                  </h2>
                  <span className="text-xs text-white/60">12 bulan</span>
                </div>

                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-white/70">Pesanan selesai</dt>
                    <dd className="text-2xl font-bold tabular-nums text-white">
                      {profile.totalOrders ?? 0}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
                    <dt className="text-white/70">Total belanja</dt>
                    <dd className="text-xl font-extrabold tabular-nums text-kicker">
                      {formatRupiah(profile.totalSpent ?? 0)}
                    </dd>
                  </div>
                </dl>

                <Link
                  href="/orders"
                  className="btn-primary mt-6 w-full text-sm font-semibold"
                >
                  Lihat Pesanan
                </Link>
              </section>
            </aside>
          </div>
        )}
      </div>

      {/* Modal Ubah Profil */}
      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onSuccess={async (updatedName?: string) => {
            setShowEditModal(false);
            if (updatedName) {
              await update({ name: updatedName });
            }
            void loadProfile();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </main>
  );
}

interface EditProfileModalProps {
  profile: CustomerProfileData;
  onSuccess: (updatedName?: string) => void;
  onCancel: () => void;
}

// Modal untuk edit nama dan nomor telepon pengguna
function EditProfileModal({
  profile,
  onSuccess,
  onCancel,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    name: profile.name,
    phone: profile.phone,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama tidak boleh kosong";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Nama minimal 3 karakter";
    }

    if (!formData.phone.trim()) {
      errors.phone = "No. telepon tidak boleh kosong";
    } else if (!/^\d+$/.test(formData.phone.trim())) {
      errors.phone = "No. telepon harus berupa angka";
    } else if (
      formData.phone.trim().length < 10 ||
      formData.phone.trim().length > 13
    ) {
      errors.phone = "No. telepon harus 10-13 digit";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateCustomerProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });

      onSuccess(formData.name.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui profil.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onCancel} title="Ubah Profil" size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div aria-live="polite">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error"
            >
              {error}
            </div>
          )}
        </div>

        <FormField
          label="Nama Lengkap"
          name="name"
          type="text"
          autoComplete="name"
          value={formData.name}
          onChange={(value) => {
            setFormData((prev) => ({ ...prev, name: value }));
            setFormErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={formErrors.name}
          required
          placeholder="Nama lengkap"
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={profile.email}
          onChange={() => {}}
          disabled
          placeholder="Email akun"
        />

        <FormField
          label="No. Telepon"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formData.phone}
          onChange={(value) => {
            setFormData((prev) => ({ ...prev, phone: value }));
            setFormErrors((prev) => ({ ...prev, phone: "" }));
          }}
          error={formErrors.phone}
          required
          placeholder="08xxxxxxxxxx"
        />

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary h-11 px-5 py-0 text-sm"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary h-11 px-6 py-0 text-sm disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
