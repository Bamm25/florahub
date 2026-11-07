"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Mail, Phone, Calendar, Edit2, CheckCircle } from "lucide-react";
import Modal from "@/components/forms/Modal";
import FormField from "@/components/forms/FormField";

// Interface untuk data profil user dengan statistik orders
interface UserProfile {
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  emailVerified: boolean;
  totalOrders?: number;
  totalSpent?: number;
}

// Halaman profil user dengan info personal dan statistik orders
export default function ProfilePage() {
  const router = useRouter();
  const { status, update } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Redirect ke login jika belum auth, load profile data saat authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/profile");
      return;
    }

    if (status === "authenticated") {
      loadProfile();
    }
  }, [status, router]);

  // Fetch profile data dari API
  async function loadProfile(): Promise<void> {
    try {
      setIsLoading(true);
      const response = await fetch("/api/customer/profile", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal memuat profil");
      }

      const data = await response.json();
      setProfile(data.data.profile);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat profil",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Format tanggal ke format Indonesia readable
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format currency ke Rupiah dengan separator
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Render loading skeleton untuk profile page
  if (status === "loading" || isLoading) {
    return (
      <div className="container-custom section-spacing">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-8" />
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-xl bg-surface-container-low" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-32 animate-pulse rounded-xl bg-surface-container-low" />
            <div className="h-32 animate-pulse rounded-xl bg-surface-container-low" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom section-spacing">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground">Profil Saya</h1>
        <button
          onClick={() => setShowEditModal(true)}
          className="btn-primary"
        >
          <Edit2 className="mr-2 h-5 w-5" />
          Edit Profil
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-error/30 bg-error/5 p-5 text-base text-error">
          {errorMessage}
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* Personal Information Card */}
          <div className="card-elevated">
            <div className="border-b border-border pb-4 mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Informasi Pribadi
              </h2>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Nama Lengkap</p>
                  <p className="text-lg font-medium text-foreground">{profile.name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium text-foreground">{profile.email}</p>
                    {profile.emailVerified && (
                      <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-xs font-medium text-success">Terverifikasi</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">No. Telepon</p>
                  <p className="text-lg font-medium text-foreground">{profile.phone}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Bergabung Sejak</p>
                  <p className="text-lg font-medium text-foreground">
                    {formatDate(profile.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {(profile.totalOrders !== undefined || profile.totalSpent !== undefined) && (
            <div className="grid gap-6 md:grid-cols-2">
              {profile.totalOrders !== undefined && (
                <div className="card-elevated">
                  <div className="text-sm text-muted-foreground mb-2">Total Pesanan</div>
                  <div className="text-3xl font-bold text-primary">
                    {profile.totalOrders}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Pesanan selesai</div>
                </div>
              )}

              {profile.totalSpent !== undefined && (
                <div className="card-elevated">
                  <div className="text-sm text-muted-foreground mb-2">Total Belanja</div>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(profile.totalSpent)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Dalam 12 bulan terakhir</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onSuccess={async (updatedName?: string) => {
            setShowEditModal(false);
            // Refresh NextAuth session so navbar picks up the new name immediately
            if (updatedName) {
              await update({ name: updatedName });
            }
            loadProfile();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

// Props interface untuk modal edit profil user
interface EditProfileModalProps {
  profile: UserProfile;
  onSuccess: (updatedName?: string) => void;
  onCancel: () => void;
}

// Modal untuk edit nama dan phone user
function EditProfileModal({ profile, onSuccess, onCancel }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    name: profile.name,
    phone: profile.phone,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Validasi form edit profile sebelum submit
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
    } else if (formData.phone.trim().length < 10 || formData.phone.trim().length > 13) {
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

      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal memperbarui profil");
      }

      onSuccess(formData.name.trim());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal memperbarui profil",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Edit Profil"
      subtitle="Perbarui informasi pribadi Anda"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
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

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
