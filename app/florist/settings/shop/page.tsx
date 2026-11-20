"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Edit2, Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog, LoadingSpinner, ErrorState } from "@/components/ui";
import Modal from "@/components/forms/Modal";
import {
  uploadMediaFile,
  getFloristProfile,
  updateFloristProfile,
  saveFloristAddress,
  setDefaultFloristAddress,
  deleteFloristAddress,
  type FloristProfilePayload,
  type FloristShopAddress,
} from "@/lib/api/florist";

type Address = FloristShopAddress;
type ProfileData = FloristProfilePayload;

export default function FloristSettingsShopPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk perubahan informasi profil toko
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [shopForm, setShopForm] = useState({
    shopName: "",
    shopDescription: "",
  });
  const [isSavingShop, setIsSavingShop] = useState(false);

  // State modal formulir alamat penjemputan toko
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    recipientName: "",
    phone: "",
    fullAddress: "",
    city: "",
    province: "",
    postalCode: "",
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<Partial<Record<"logo" | "banner", File>>>({});
  const [mediaPreview, setMediaPreview] = useState<Partial<Record<"logo" | "banner", string>>>({});
  const [mediaMessage, setMediaMessage] = useState("");
  const [isChangingDefault, setIsChangingDefault] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "status" | "error"; message: string } | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [pendingDeleteAddressId, setPendingDeleteAddressId] = useState<string | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  // Pilih gambar dan tampilkan preview sebelum disimpan.
  function handleMediaSelect(file: File, field: "logo" | "banner") {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMediaMessage("Gunakan JPG, PNG, WebP, atau GIF maksimal 5 MB.");
      return;
    }
    setPendingMedia((current) => ({ ...current, [field]: file }));
    setMediaPreview((current) => {
      if (current[field]) URL.revokeObjectURL(current[field]);
      return { ...current, [field]: URL.createObjectURL(file) };
    });
    setMediaMessage(`${field === "logo" ? "Logo" : "Banner"} dipilih. Klik Simpan untuk mengunggah.`);
  }

  // Upload ke R2 lalu simpan URL pada FloristProfile.
  async function handleMediaSave(field: "logo" | "banner") {
    const file = pendingMedia[field];
    if (!file) return;
    setIsUploadingMedia(true);
    setMediaMessage(`Mengunggah ${field}...`);
    try {
      const uploaded = await uploadMediaFile(file);
      if (!uploaded.url) throw new Error(uploaded.error || "Upload gagal");
      await updateFloristProfile({ [field]: uploaded.url });
      await fetchProfile();
      setPendingMedia((current) => ({ ...current, [field]: undefined }));
      setMediaPreview((current) => {
        if (current[field]) URL.revokeObjectURL(current[field]);
        return { ...current, [field]: undefined };
      });
      setMediaMessage(`${field === "logo" ? "Logo" : "Banner"} berhasil disimpan dan ditampilkan di toko publik.`);
      router.refresh();
    } catch (err) {
      setMediaMessage(err instanceof Error ? err.message : "Gagal mengunggah gambar");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchProfile(controller.signal);
    return () => controller.abort();
  }, []);

  async function fetchProfile(signal?: AbortSignal) {
    try {
      setIsLoading(true);
      setError(null);
      const profileData = await getFloristProfile(signal);
      if (!signal?.aborted) {
        setData(profileData);
        setShopForm({
          shopName: profileData.profile.shopName,
          shopDescription: profileData.profile.shopDescription || "",
        });
      }
    } catch (err) {
      if (
        signal?.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  async function handleSaveShopInfo() {
    setFeedback(null);
    const trimmedShopName = shopForm.shopName.trim();
    try {
      setIsSavingShop(true);
      await updateFloristProfile({
        shopName: trimmedShopName,
        shopDescription: shopForm.shopDescription.trim() || null,
      });
      await fetchProfile();
      if (trimmedShopName) {
        await updateSession({ name: trimmedShopName });
        window.dispatchEvent(
          new CustomEvent("florahub:florist-profile-updated", {
            detail: { shopName: trimmedShopName },
          }),
        );
      }
      router.refresh();
      setIsEditingShop(false);
      setFeedback({ type: "status", message: "Informasi toko berhasil diperbarui." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menyimpan",
      });
    } finally {
      setIsSavingShop(false);
    }
  }

  function openAddressModal(address?: Address) {
    setAddressError(null);
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        label: address.label,
        recipientName: address.recipientName,
        phone: address.phone,
        fullAddress: address.fullAddress,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        label: "",
        recipientName: "",
        phone: "",
        fullAddress: "",
        city: "",
        province: "",
        postalCode: "",
      });
    }
    setShowAddressModal(true);
  }

  function closeAddressModal() {
    setShowAddressModal(false);
    setEditingAddress(null);
    setAddressError(null);
  }

  async function handleSaveAddress() {
    setAddressError(null);
    try {
      setIsSavingAddress(true);
      await saveFloristAddress(addressForm, editingAddress?.id);
      await fetchProfile();
      closeAddressModal();
      router.refresh();
      setFeedback({ type: "status", message: "Alamat penjemputan toko berhasil disimpan." });
    } catch (err) {
      setAddressError(
        err instanceof Error ? err.message : "Gagal menyimpan alamat",
      );
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleSetDefault(addressId: string) {
    setIsChangingDefault(true);
    setFeedback(null);
    try {
      await setDefaultFloristAddress(addressId);
      await fetchProfile();
      router.refresh();
      setFeedback({ type: "status", message: "Alamat utama toko berhasil diperbarui." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal set alamat default",
      });
    } finally {
      setIsChangingDefault(false);
    }
  }

  async function handleConfirmDeleteAddress() {
    if (!pendingDeleteAddressId) return;
    setIsDeletingAddress(true);
    setFeedback(null);
    try {
      await deleteFloristAddress(pendingDeleteAddressId);
      await fetchProfile();
      router.refresh();
      setFeedback({ type: "status", message: "Alamat toko berhasil dihapus." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus alamat",
      });
    } finally {
      setIsDeletingAddress(false);
      setPendingDeleteAddressId(null);
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Memuat pengaturan toko..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Pengaturan Toko Belum Dapat Dimuat"
        error={error}
        onRetry={() => void fetchProfile()}
      />
    );
  }

  if (!data) return null;

  const { profile, user, addresses } = data;
  const sortedAddresses = addresses.toSorted(
    (a, b) => Number(b.isDefault) - Number(a.isDefault),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Editorial Dark Masthead */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Konfigurasi & Profil Studio
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pengaturan Toko Florist
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Kelola identitas toko publik, logo & banner studio, serta titik alamat penjemputan kurir logistik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
              profile.isActive
                ? "border-success/30 bg-success/15 text-success"
                : "border-white/20 bg-white/10 text-white/70"
            }`}
          >
            {profile.isActive ? "Toko Publik Aktif" : "Toko Nonaktif"}
          </span>
        </div>
      </section>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-error/30 bg-error/5 text-error"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Profil & Identitas Visual */}
        <div className="space-y-6 lg:col-span-7">
          {/* Informasi Toko */}
          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Informasi Toko Publik
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Nama dan deskripsi studio yang dilihat oleh customer.
                </p>
              </div>
              {!isEditingShop && (
                <button
                  type="button"
                  onClick={() => setIsEditingShop(true)}
                  className="inline-flex min-h-9 items-center rounded-sm border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
                >
                  Edit Profil
                </button>
              )}
            </div>

            <div className="p-6">
              {isEditingShop ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="shop-name-input"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Nama Toko <span className="text-error">*</span>
                    </label>
                    <input
                      id="shop-name-input"
                      type="text"
                      value={shopForm.shopName}
                      onChange={(e) =>
                        setShopForm({ ...shopForm, shopName: e.target.value })
                      }
                      className="input-field"
                      placeholder="Toko Bunga Indah"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="shop-desc-input"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Deskripsi Toko
                    </label>
                    <textarea
                      id="shop-desc-input"
                      value={shopForm.shopDescription}
                      onChange={(e) =>
                        setShopForm({
                          ...shopForm,
                          shopDescription: e.target.value,
                        })
                      }
                      className="input-field min-h-[100px]"
                      placeholder="Ceritakan karakter rangkaian bunga studio Anda..."
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveShopInfo}
                      disabled={isSavingShop}
                      className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSavingShop && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      <span>{isSavingShop ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingShop(false);
                        setShopForm({
                          shopName: profile.shopName,
                          shopDescription: profile.shopDescription || "",
                        });
                      }}
                      disabled={isSavingShop}
                      className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nama Toko
                    </dt>
                    <dd className="mt-1 text-base font-bold text-foreground">
                      {profile.shopName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Deskripsi Studio
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-foreground">
                      {profile.shopDescription || "Belum ada deskripsi toko."}
                    </dd>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Akun
                      </dt>
                      <dd className="mt-0.5 text-xs font-medium text-foreground">
                        {user.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Telepon Kontak
                      </dt>
                      <dd className="mt-0.5 text-xs font-medium tabular-nums text-foreground">
                        {user.phone || "-"}
                      </dd>
                    </div>
                  </div>
                </dl>
              )}
            </div>
          </section>

          {/* Logo & Banner Toko */}
          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border p-5 sm:p-6">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Logo &amp; Banner Toko
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Identitas visual halaman toko publik. Format JPG, PNG, WebP, atau GIF maksimal 5 MB.
              </p>
            </div>

            <div className="space-y-6 p-6">
              {mediaMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-border bg-surface-container-low p-3 text-xs font-medium text-foreground"
                >
                  {mediaMessage}
                </p>
              )}

              {(["logo", "banner"] as const).map((field) => (
                <div key={field} className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {field === "logo" ? "Logo Toko" : "Banner Toko"}
                  </p>
                  {(mediaPreview[field] || profile[field]) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaPreview[field] || profile[field]!}
                      alt={field === "logo" ? "Logo toko" : "Banner toko"}
                      className={
                        field === "logo"
                          ? "h-20 w-20 rounded-xl border border-border object-cover"
                          : "h-36 w-full rounded-xl border border-border object-cover"
                      }
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex min-h-9 cursor-pointer items-center rounded-sm border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low">
                      <span>Pilih {field === "logo" ? "Logo" : "Banner"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={isUploadingMedia}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleMediaSelect(file, field);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {pendingMedia[field] && (
                      <button
                        type="button"
                        onClick={() => void handleMediaSave(field)}
                        disabled={isUploadingMedia}
                        className="inline-flex min-h-9 items-center gap-2 rounded-sm bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isUploadingMedia && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        )}
                        Simpan {field === "logo" ? "Logo" : "Banner"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Kolom Kanan: Alamat Toko & Titik Pickup */}
        <div className="lg:col-span-5">
          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Alamat Toko &amp; Titik Pickup
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lokasi asal penjemputan kurir ekspedisi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAddressModal()}
                className="inline-flex min-h-9 items-center rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Tambah Alamat
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {sortedAddresses.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Belum ada alamat terdaftar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tambahkan alamat studio agar ongkos kirim kurir dapat dihitung otomatis.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {sortedAddresses.map((address) => (
                    <article
                      key={address.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        address.isDefault
                          ? "border-primary/40 bg-primary/[0.04]"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                              {address.label}
                            </h3>
                            {address.isDefault && (
                              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                Alamat Utama
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs font-semibold text-foreground">
                            {address.recipientName} ·{" "}
                            <span className="tabular-nums text-muted-foreground">
                              {address.phone}
                            </span>
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {address.fullAddress}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {address.city}, {address.province}{" "}
                            {address.postalCode}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAddressModal(address)}
                            aria-label={`Ubah alamat ${address.label}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-surface-container-low"
                          >
                            <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteAddressId(address.id)}
                            aria-label={`Hapus alamat ${address.label}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-error/20 bg-error/5 text-error transition-colors hover:bg-error/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {!address.isDefault && (
                        <div className="mt-3 border-t border-border pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleSetDefault(address.id)}
                            disabled={isChangingDefault}
                            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                          >
                            Jadikan Alamat Pickup Utama
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={showAddressModal}
        onClose={closeAddressModal}
        size="md"
        headerVariant="dark"
        kicker="Titik Penjemputan"
        title={editingAddress ? "Edit Alamat Toko" : "Tambah Alamat Baru"}
      >
        <div className="space-y-4">
          {addressError && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
            >
              {addressError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="shop-addr-label"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Label Alamat <span className="text-error">*</span>
              </label>
              <input
                id="shop-addr-label"
                type="text"
                value={addressForm.label}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, label: e.target.value })
                }
                className="input-field"
                placeholder="Studio Utama"
              />
            </div>

            <div>
              <label
                htmlFor="shop-addr-recipient"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Nama Kontak / PIC <span className="text-error">*</span>
              </label>
              <input
                id="shop-addr-recipient"
                type="text"
                value={addressForm.recipientName}
                autoComplete="name"
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    recipientName: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Nama toko / PIC"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="shop-addr-phone"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Nomor Telepon <span className="text-error">*</span>
            </label>
            <input
              id="shop-addr-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={addressForm.phone}
              onChange={(e) =>
                setAddressForm({ ...addressForm, phone: e.target.value })
              }
              className="input-field tabular-nums"
              placeholder="081234567890"
            />
          </div>

          <div>
            <label
              htmlFor="shop-addr-street"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Alamat Lengkap <span className="text-error">*</span>
            </label>
            <textarea
              id="shop-addr-street"
              autoComplete="street-address"
              value={addressForm.fullAddress}
              onChange={(e) =>
                setAddressForm({
                  ...addressForm,
                  fullAddress: e.target.value,
                })
              }
              className="input-field min-h-[80px]"
              placeholder="Jl. Basuki Rahmat No. 45, Tegalsari"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="shop-addr-city"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Kota <span className="text-error">*</span>
              </label>
              <input
                id="shop-addr-city"
                type="text"
                autoComplete="address-level2"
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, city: e.target.value })
                }
                className="input-field"
                placeholder="Surabaya"
              />
            </div>

            <div>
              <label
                htmlFor="shop-addr-province"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Provinsi <span className="text-error">*</span>
              </label>
              <input
                id="shop-addr-province"
                type="text"
                autoComplete="address-level1"
                value={addressForm.province}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    province: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Jawa Timur"
              />
            </div>

            <div>
              <label
                htmlFor="shop-addr-postal"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Kode Pos <span className="text-error">*</span>
              </label>
              <input
                id="shop-addr-postal"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={addressForm.postalCode}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    postalCode: e.target.value,
                  })
                }
                className="input-field tabular-nums"
                placeholder="60261"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleSaveAddress}
              disabled={isSavingAddress}
              className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSavingAddress && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              <span>{isSavingAddress ? "Menyimpan..." : "Simpan Alamat"}</span>
            </button>
            <button
              type="button"
              onClick={closeAddressModal}
              disabled={isSavingAddress}
              className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteAddressId)}
        onClose={() => setPendingDeleteAddressId(null)}
        onConfirm={handleConfirmDeleteAddress}
        title="Hapus Alamat Toko"
        description="Yakin ingin menghapus alamat penjemputan toko ini?"
        confirmLabel="Hapus Alamat"
        variant="danger"
        loading={isDeletingAddress}
      />
    </div>
  );
}
