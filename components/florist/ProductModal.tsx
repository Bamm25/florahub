import React, { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import Modal from "@/components/forms/Modal";
import FormField from "@/components/forms/FormField";
import { uploadMediaFile } from "@/lib/api/florist";

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  image: string;
  categoryId: string;
  weight: string;
  tags: string;
  isActive: boolean;
}

interface ProductModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  formData: ProductFormData;
  formErrors: Record<string, string>;
  categories: Category[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: string | boolean) => void;
}

/**
 * ProductModal component
 * Create/Edit modal for florist product management with form validation
 */
export default function ProductModal({
  isOpen,
  mode,
  formData,
  formErrors,
  categories,
  isSubmitting,
  onClose,
  onSubmit,
  onChange,
}: ProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewError, setPreviewError] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Reset pesan error upload sebelumnya
    setUploadError("");

    // Validasi tipe format dan batas ukuran file gambar (maks 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF");
      return;
    }

    if (file.size > maxSize) {
      setUploadError("Ukuran file maksimal 5MB");
      return;
    }

    // Kirim file gambar ke endpoint storage R2
    try {
      setIsUploading(true);

      const data = await uploadMediaFile(file);

      if (data?.storage !== "cloudflare-r2" || typeof data.url !== "string" || !data.url.startsWith("https://")) {
        throw new Error("Respon upload bukan URL publik Cloudflare R2");
      }

      setPreviewError(false);
      onChange("image", data.url);
    } catch (error) {

      setUploadError(error instanceof Error ? error.message : "Gagal mengupload gambar. Coba lagi");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange("image", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadError("");
    setPreviewError(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      headerVariant="dark"
      kicker={mode === "create" ? "Katalog Studio" : "Pembaruan Katalog"}
      title={mode === "create" ? "Tambah Produk Baru" : "Edit Produk"}
      subtitle={
        mode === "create"
          ? "Lengkapi rincian rangkaian bunga yang akan ditampilkan di katalog toko"
          : "Perbarui informasi produk katalog toko"
      }
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {formErrors.submit && (
          <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            {formErrors.submit}
          </div>
        )}

        <FormField
          label="Nama Produk"
          name="name"
          type="text"
          value={formData.name}
          onChange={(value) => onChange("name", value)}
          error={formErrors.name}
          required
          placeholder="Contoh: Buket Mawar Premium"
        />

        <FormField
          label="Deskripsi"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={(value) => onChange("description", value)}
          placeholder="Deskripsi produk..."
          rows={3}
        />

        <FormField
          label="Kategori"
          name="categoryId"
          type="select"
          value={formData.categoryId}
          onChange={(value) => onChange("categoryId", value)}
          error={formErrors.categoryId}
          required
          options={Array.isArray(categories) ? categories.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })) : []}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Harga (Rp)"
            name="price"
            type="number"
            value={formData.price}
            onChange={(value) => onChange("price", value)}
            error={formErrors.price}
            required
            placeholder="50000"
            min={0}
          />

          <FormField
            label="Stok"
            name="stock"
            type="number"
            value={formData.stock}
            onChange={(value) => onChange("stock", value)}
            error={formErrors.stock}
            required
            placeholder="10"
            min={0}
          />
        </div>

        {/* File Upload Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Gambar Produk <span className="text-error">*</span>
          </label>

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            ref={fileInputRef}
            disabled={isUploading}
          />

          {/* Upload button or Image preview */}
          {!formData.image ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border hover:border-foreground/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Upload Gambar"}
              </span>
            </button>
          ) : (
            <div className="relative group h-48 w-full">
              <Image
                src={formData.image}
                alt="Preview"
                fill
                unoptimized
                onError={() => {
                  setPreviewError(true);
                  setUploadError("Gambar tidak dapat ditampilkan. Unggah ulang gambar sebelum menyimpan.");
                }}
                className="object-cover rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-error text-white p-2 rounded-xl hover:bg-error/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Loading state */}
          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Mengupload gambar...</span>
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <p className="text-sm text-error">{uploadError}</p>
          )}

          {/* Form validation error */}
          {formErrors.image && (
            <p className="text-sm text-error">{formErrors.image}</p>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Format: JPG, PNG, WebP, GIF (Max 5MB)
          </p>
        </div>

        <div>
          <FormField
            label="Berat (gram)"
            name="weight"
            type="number"
            value={formData.weight}
            onChange={(value) => onChange("weight", value)}
            placeholder="500"
            min={0}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Untuk perhitungan ongkir (opsional)
          </p>
        </div>

        <FormField
          label="Tags"
          name="tags"
          type="text"
          value={formData.tags}
          onChange={(value) => onChange("tags", value)}
          placeholder="romantis, premium, ulang tahun (pisahkan dengan koma)"
        />

        <div className="pt-2">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-3 transition-colors ${
              formData.isActive
                ? "border-primary bg-primary/5"
                : "border-border bg-surface-container-low/40 hover:border-foreground/30"
            }`}
          >
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => onChange("isActive", e.target.checked)}
              className="h-4 w-4 rounded text-primary focus:ring-2 focus:ring-primary"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Produk Aktif
              </p>
              <p className="text-xs text-muted-foreground">
                Tampilkan produk ini di katalog publik toko
              </p>
            </div>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading || previewError}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                {mode === "create" ? "Tambah Produk" : "Simpan Perubahan"}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
