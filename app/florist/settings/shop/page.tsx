"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Upload,
  Loader2,
} from "lucide-react";

interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

interface FloristProfile {
  id: string;
  shopName: string;
  shopDescription: string | null;
  logo: string | null;
  banner: string | null;
  defaultAddressId: string | null;
}

interface ProfileData {
  profile: FloristProfile;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  addresses: Address[];
}

export default function FloristSettingsShopPage() {
  const router = useRouter();
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
      const formData = new FormData();
      formData.append("file", file);
      const upload = await fetch("/api/upload", { method: "POST", body: formData });
      const uploaded = await upload.json();
      if (!upload.ok || !uploaded.url) throw new Error(uploaded.error || "Upload gagal");
      const response = await fetch("/api/florist/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: uploaded.url }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menyimpan gambar");
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
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/florist/profile");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat profile");
      }

      setData(json.data);
      setShopForm({
        shopName: json.data.profile.shopName,
        shopDescription: json.data.profile.shopDescription || "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveShopInfo() {
    try {
      setIsSavingShop(true);
      const res = await fetch("/api/florist/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan shop info");
      }

      await fetchProfile();
      setIsEditingShop(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setIsSavingShop(false);
    }
  }

  function openAddressModal(address?: Address) {
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
  }

  async function handleSaveAddress() {
    try {
      setIsSavingAddress(true);

      const endpoint = editingAddress
        ? `/api/florist/profile/addresses/${editingAddress.id}`
        : "/api/florist/profile/addresses";

      const method = editingAddress ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan alamat");
      }

      await fetchProfile();
      closeAddressModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan alamat");
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleSetDefault(addressId: string) {
    setIsChangingDefault(true);
    try {
      const res = await fetch(
        `/api/florist/profile/addresses/${addressId}/set-default`,
        {
          method: "PUT",
        },
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal set alamat default");
      }

      await fetchProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal set alamat default");
    } finally {
      setIsChangingDefault(false);
    }
  }

  async function handleDeleteAddress(addressId: string) {
    if (!confirm("Yakin ingin menghapus alamat ini?")) return;

    try {
      const res = await fetch(`/api/florist/profile/addresses/${addressId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus alamat");
      }

      await fetchProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus alamat");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            Memuat pengaturan toko...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error/20 bg-error/5 p-8 text-center max-w-xl mx-auto">
        <p className="text-sm text-error">{error}</p>
        <button onClick={fetchProfile} className="btn-primary mt-4">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { profile, user, addresses } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
            Konfigurasi & Profil
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pengaturan Toko Florist
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Kelola nama toko publik, deskripsi, identitas visual (logo & banner), serta titik alamat pickup armada logistik.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Informasi Toko
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nama dan deskripsi toko yang dilihat oleh pelanggan publik
            </p>
          </div>
          {!isEditingShop && (
            <button
              onClick={() => setIsEditingShop(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-container-low hover:bg-surface-container px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Edit Profil</span>
            </button>
          )}
        </div>

        <div className="p-6">
          {isEditingShop ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Nama Toko *
                </label>
                <input
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Deskripsi Toko
                </label>
                <textarea
                  value={shopForm.shopDescription}
                  onChange={(e) =>
                    setShopForm({
                      ...shopForm,
                      shopDescription: e.target.value,
                    })
                  }
                  className="input-field min-h-[100px]"
                  placeholder="Ceritakan tentang toko bunga Anda..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveShopInfo}
                  disabled={isSavingShop}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-colors disabled:opacity-50"
                >
                  {isSavingShop ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
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
                  className="btn-secondary rounded-xl text-xs py-2.5 px-4"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Nama Toko
                </p>
                <p className="text-base font-bold text-foreground">
                  {profile.shopName}
                </p>
              </div>

              {profile.shopDescription && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Deskripsi Toko
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {profile.shopDescription}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Email: {user.email}
                </p>
                {user.phone && (
                  <p className="text-xs text-muted-foreground">
                    Telepon: {user.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Logo & Banner Toko</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pilih gambar visual toko publik. Format JPG, PNG, WebP, atau GIF maksimal 5 MB.</p>
          </div>
          {mediaMessage && <p role="status" aria-live="polite" className="rounded-xl border border-border bg-surface-container-low p-3 text-sm text-foreground">{mediaMessage}</p>}
          {(["logo", "banner"] as const).map((field) => (
            <div key={field} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{field === "logo" ? "Logo Toko" : "Banner Toko"}</p>
              {(mediaPreview[field] || profile[field]) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPreview[field] || profile[field]!} alt={field === "logo" ? "Logo toko" : "Banner toko"} className={field === "logo" ? "h-20 w-20 rounded-xl object-cover border border-border" : "h-32 w-full rounded-xl object-cover border border-border"} />
              )}
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-container-low hover:bg-surface-container px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Pilih {field === "logo" ? "Logo" : "Banner"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={isUploadingMedia} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleMediaSelect(file, field);
                    event.target.value = "";
                  }} />
                </label>
                {pendingMedia[field] && (
                  <button type="button" onClick={() => void handleMediaSave(field)} disabled={isUploadingMedia} className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-50">
                    {isUploadingMedia && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Simpan {field === "logo" ? "Logo" : "Banner"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Alamat Toko & Titik Pickup
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lokasi penjemputan armada logistik kurir
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAddressModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Alamat</span>
          </button>
        </div>

        <div className="p-6">
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-semibold text-foreground">
                Belum ada alamat terdaftar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tambahkan alamat toko untuk pickup shipment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    address.isDefault
                      ? "border-violet-500/40 bg-violet-950/5"
                      : "border-border bg-surface-container-low/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-semibold text-foreground">
                          {address.label}
                        </p>
                        {address.isDefault && (
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            Alamat Utama
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-foreground">
                        {address.recipientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {address.phone}
                      </p>
                      <p className="text-sm text-foreground mt-2">
                        {address.fullAddress}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {address.city}, {address.province} {address.postalCode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!address.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address.id)}
                          disabled={isChangingDefault}
                          className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
                        >
                          Jadikan Utama
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openAddressModal(address)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-container hover:bg-surface-container-high text-foreground transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(address.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-error/20 bg-error/5 hover:bg-error/10 text-error transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="rounded-2xl border border-border bg-surface max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between bg-[#10121b] text-white p-5 sm:p-6 flex-shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">Titik Penjemputan</p>
                <h3 className="text-lg font-bold text-white mt-1">
                  {editingAddress ? "Edit Alamat Toko" : "Tambah Alamat Baru"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAddressModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Label *
                  </label>
                  <input
                    type="text"
                    value={addressForm.label}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, label: e.target.value })
                    }
                    className="input-field"
                    placeholder="Toko Utama"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Nama Penerima *
                  </label>
                  <input
                    type="text"
                    value={addressForm.recipientName}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        recipientName: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Nama toko/PIC"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Nomor Telepon *
                </label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, phone: e.target.value })
                  }
                  className="input-field"
                  placeholder="081234567890"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Alamat Lengkap *
                </label>
                <textarea
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Kota *
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, city: e.target.value })
                    }
                    className="input-field"
                    placeholder="Surabaya"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Provinsi *
                  </label>
                  <input
                    type="text"
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
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Kode Pos *
                  </label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        postalCode: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="60261"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Simpan Alamat</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeAddressModal}
                  disabled={isSavingAddress}
                  className="btn-secondary rounded-xl text-xs py-2.5 px-4"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
