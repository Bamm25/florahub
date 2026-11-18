"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Modal from "@/components/forms/Modal";
import FormField from "@/components/forms/FormField";
import { LoadingSpinner, ErrorState } from "@/components/ui";
import {
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerProfileData,
} from "@/lib/api/customer";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

// Halaman profil user dengan info personal dan statistik orders
export default function ProfilePage() {
  const router = useRouter();
  const { status, update } = useSession();

  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch profile data dari API
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
        error instanceof Error ? error.message : "Gagal memuat profil",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Redirect ke login jika belum auth, load profile data saat authenticated
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

  // Render loading spinner untuk profile page
  if (status === "loading" || isLoading) {
    return (
      <main className="container-custom section-spacing">
        <LoadingSpinner message="Memuat profil akun..." />
      </main>
    );
  }

  if (errorMessage && !profile) {
    return (
      <main className="container-custom section-spacing">
        <ErrorState
          title="Gagal Memuat Profil"
          error={errorMessage}
          onRetry={() => void loadProfile()}
        />
      </main>
    );
  }

  return (
    <main className="container-custom section-spacing">
      {/* Header Halaman */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Akun Saya
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Profil Saya
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola informasi data diri dan preferensi akun Anda.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/profile/addresses"
            className="btn-secondary h-11 px-5 py-0 text-sm font-semibold"
          >
            Alamat Saya
          </Link>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-primary h-11 px-5 py-0 text-sm"
          >
            Ubah Profil
          </button>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error"
        >
          {errorMessage}
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* Hero Banner: Inisial, Nama, Status */}
          <section
            aria-labelledby="profile-summary-heading"
            className="rounded-2xl bg-surface-dark p-6 text-white sm:p-8 border border-white/10"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-xl font-bold text-white shadow-xs"
                aria-hidden="true"
              >
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="profile-summary-heading"
                    className="truncate text-xl font-bold text-white sm:text-2xl"
                  >
                    {profile.name}
                  </h2>
                  {profile.emailVerified && (
                    <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">
                      Terverifikasi
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/70">
                  {profile.email} · Anggota sejak {formatDate(profile.createdAt)}
                </p>
              </div>
            </div>
          </section>

          {/* Data Detail & Statistik */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Informasi Pribadi */}
            <section
              aria-labelledby="personal-info-heading"
              className="rounded-2xl border border-border bg-card p-6 md:col-span-2"
            >
              <h2
                id="personal-info-heading"
                className="border-b border-border pb-3 text-base font-semibold text-foreground"
              >
                Data Kontak
              </h2>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Nama Lengkap</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {profile.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {profile.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">No. Telepon</dt>
                  <dd className="mt-0.5 font-mono text-sm font-medium text-foreground">
                    {profile.phone || "Belum diisi"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Bergabung</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {formatDate(profile.createdAt)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Quick Stats */}
            <aside
              aria-labelledby="stats-heading"
              className="space-y-4 md:col-span-1"
            >
              {profile.totalOrders !== undefined && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground">Total Pesanan</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {profile.totalOrders}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pesanan selesai
                  </p>
                </div>
              )}

              {profile.totalSpent !== undefined && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground">Total Belanja</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                    {formatRupiah(profile.totalSpent)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dalam 12 bulan terakhir
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onSuccess={async (updatedName?: string) => {
            setShowEditModal(false);
            if (updatedName) {
              await update({ name: updatedName });
            }
            loadProfile();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </main>
  );
}

// Props interface untuk modal edit profil user
interface EditProfileModalProps {
  profile: CustomerProfileData;
  onSuccess: (updatedName?: string) => void;
  onCancel: () => void;
}

// Modal untuk edit nama dan phone user
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

  // Validasi kelengkapan data formulir edit profil sebelum disimpan
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

  // Handle submit edit profile dan refresh session
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
        err instanceof Error ? err.message : "Gagal memperbarui profil",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Ubah profil"
      subtitle="Perbarui nama lengkap dan nomor telepon aktif Anda."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
          >
            {error}
          </div>
        )}

        <FormField
          label="Nama Lengkap"
          name="name"
          type="text"
          value={formData.name}
          onChange={(value) => {
            setFormData((prev) => ({ ...prev, name: value }));
            setFormErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={formErrors.name}
          required
          placeholder="Masukkan nama lengkap"
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          value={profile.email}
          onChange={() => {}}
          disabled
          placeholder="Email tidak dapat diubah"
        />

        <FormField
          label="No. Telepon"
          name="phone"
          type="text"
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
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
