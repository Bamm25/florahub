import React, { useRef, useState } from "react";
import { Loader2, Package, Upload, X } from "lucide-react";
import Modal from "@/components/forms/Modal";
import FormField from "@/components/forms/FormField";

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
  isFeatured: boolean;
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

    // Reset error
    setUploadError("");

    // Client-side validation
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

    // Upload file
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `Upload gagal (${response.status})`);
      }

      if (data?.storage !== "cloudflare-r2" || typeof data.url !== "string" || !data.url.startsWith("https://")) {
        throw new Error("Respon upload bukan URL publik Cloudflare R2");
      }

      setPreviewError(false);
      onChange("image", data.url);
    } catch (error) {
      console.error("Upload error:", error);
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
      title={mode === "create" ? "Tambah Produk Baru" : "Edit Produk"}
      subtitle={
        mode === "create"
          ? "Isi detail produk yang akan dijual"
          : "Perbarui informasi produk"
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

        <div className="grid grid-cols-2 gap-4">
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border hover:border-primary rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Upload Gambar"}
              </span>
            </button>
          ) : (
            <div className="relative group">
              <img
                src={formData.image}
                alt="Preview"
                onError={() => {
                  setPreviewError(true);
                  setUploadError("Gambar tidak dapat ditampilkan. Unggah ulang gambar sebelum menyimpan.");
                }}
                className="w-full h-48 object-cover rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-error text-white p-2 rounded-full shadow-lg hover:bg-error/90 transition-colors opacity-0 group-hover:opacity-100"
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

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => onChange("isActive", e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-foreground">
              Produk Aktif (tampil di katalog)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => onChange("isFeatured", e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-foreground">
              Featured (tampil di halaman utama)
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-secondary text-sm"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading || previewError}
            className="flex-1 btn-primary text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                {mode === "create" ? "Tambah Produk" : "Simpan Perubahan"}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
