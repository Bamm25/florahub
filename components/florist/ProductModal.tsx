import React from "react";
import { Loader2, Package } from "lucide-react";
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

        <FormField
          label="URL Gambar"
          name="image"
          type="text"
          value={formData.image}
          onChange={(value) => onChange("image", value)}
          error={formErrors.image}
          required
          placeholder="https://example.com/image.jpg"
        />

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
            disabled={isSubmitting}
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
