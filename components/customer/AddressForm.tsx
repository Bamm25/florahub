"use client";

import { useState } from "react";
import Modal from "@/components/forms/Modal";
import FormField from "@/components/forms/FormField";

// Interface untuk data alamat yang sudah tersimpan
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
}

// Interface untuk form data create/update alamat
interface AddressFormData {
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

// Props interface untuk modal form alamat
interface AddressFormProps {
  address?: Address | null;
  onSubmit: (data: AddressFormData) => Promise<void>;
  onCancel: () => void;
}

// Modal form untuk tambah atau edit alamat pengiriman
export default function AddressForm({
  address,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  // Initialize form data dari address yang ada atau default kosong
  const [formData, setFormData] = useState<AddressFormData>({
    label: address?.label || "",
    recipientName: address?.recipientName || "",
    phone: address?.phone || "",
    fullAddress: address?.fullAddress || "",
    city: address?.city || "",
    province: address?.province || "",
    postalCode: address?.postalCode || "",
    isDefault: address?.isDefault || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Helper untuk update field dan clear error saat user mengetik
  const set =
    (field: keyof Omit<AddressFormData, "isDefault">) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    };

  // Validate semua field form dengan rules spesifik
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.label.trim()) {
      errors.label = "Label alamat tidak boleh kosong";
    } else if (formData.label.trim().length < 2) {
      errors.label = "Label alamat minimal 2 karakter";
    }

    if (!formData.recipientName.trim()) {
      errors.recipientName = "Nama penerima tidak boleh kosong";
    } else if (formData.recipientName.trim().length < 3) {
      errors.recipientName = "Nama penerima minimal 3 karakter";
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

    if (!formData.fullAddress.trim()) {
      errors.fullAddress = "Alamat lengkap tidak boleh kosong";
    } else if (formData.fullAddress.trim().length < 10) {
      errors.fullAddress = "Alamat lengkap minimal 10 karakter";
    }

    if (!formData.city.trim()) {
      errors.city = "Kota tidak boleh kosong";
    } else if (formData.city.trim().length < 2) {
      errors.city = "Nama kota minimal 2 karakter";
    }

    if (!formData.province.trim()) {
      errors.province = "Provinsi tidak boleh kosong";
    } else if (formData.province.trim().length < 2) {
      errors.province = "Nama provinsi minimal 2 karakter";
    }

    if (!formData.postalCode.trim()) {
      errors.postalCode = "Kode pos tidak boleh kosong";
    } else if (!/^\d+$/.test(formData.postalCode.trim())) {
      errors.postalCode = "Kode pos harus berupa angka";
    } else if (formData.postalCode.trim().length !== 5) {
      errors.postalCode = "Kode pos harus 5 digit";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form setelah validate dan trim whitespace
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Trim semua field text sebelum submit
      const trimmedData: AddressFormData = {
        ...formData,
        label: formData.label.trim(),
        recipientName: formData.recipientName.trim(),
        phone: formData.phone.trim(),
        fullAddress: formData.fullAddress.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim(),
      };
      await onSubmit(trimmedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={address ? "Edit Alamat" : "Tambah Alamat Baru"}
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Label Alamat"
          name="label"
          value={formData.label}
          onChange={set("label")}
          error={formErrors.label}
          placeholder="Contoh: Rumah, Kantor, Apartemen"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Nama Penerima"
            name="recipientName"
            value={formData.recipientName}
            onChange={set("recipientName")}
            error={formErrors.recipientName}
            placeholder="Nama lengkap penerima"
            required
          />
          <FormField
            label="No. Telepon"
            name="phone"
            value={formData.phone}
            onChange={set("phone")}
            error={formErrors.phone}
            placeholder="08xxxxxxxxxx"
            required
          />
        </div>

        <FormField
          label="Alamat Lengkap"
          name="fullAddress"
          type="textarea"
          value={formData.fullAddress}
          onChange={set("fullAddress")}
          error={formErrors.fullAddress}
          placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
          rows={3}
          required
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Kota"
            name="city"
            value={formData.city}
            onChange={set("city")}
            error={formErrors.city}
            placeholder="Contoh: Jakarta Selatan"
            required
          />
          <FormField
            label="Provinsi"
            name="province"
            value={formData.province}
            onChange={set("province")}
            error={formErrors.province}
            placeholder="Contoh: DKI Jakarta"
            required
          />
          <FormField
            label="Kode Pos"
            name="postalCode"
            value={formData.postalCode}
            onChange={set("postalCode")}
            error={formErrors.postalCode}
            placeholder="12345"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
            }
            className="h-4 w-4 rounded border-border text-success focus:ring-success/20"
          />
          <label htmlFor="isDefault" className="text-sm text-foreground/80">
            Jadikan alamat utama
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:cursor-not-allowed disabled:bg-muted-foreground/40"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Alamat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
