"use client";

import { MapPin, Check } from "lucide-react";

// Interface untuk data alamat pengiriman
interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

// Props interface untuk komponen selector alamat pengiriman
interface AddressSelectorProps {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (addressId: string) => void;
}

// Component untuk pilih alamat pengiriman dari list yang tersimpan
export default function AddressSelector({
  addresses,
  selectedId,
  onSelect,
}: AddressSelectorProps) {
  // Tampilkan empty state jika belum ada alamat
  if (addresses.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-surface-container-low p-8 text-center">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-sm font-semibold text-foreground">
          Belum ada alamat tersimpan
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan alamat pengiriman terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <button
          key={address.id}
          onClick={() => onSelect(address.id)}
          className={`relative w-full cursor-pointer rounded-lg border-2 p-4 text-left transition ${
            selectedId === address.id
              ? "border-success bg-success/10"
              : "border-border hover:border-border/60 hover:bg-surface-container-low"
          }`}
        >
          {selectedId === address.id && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-success">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}

          <div className="flex items-start gap-3">
            <MapPin
              className={`h-5 w-5 mt-0.5 ${
                selectedId === address.id ? "text-success" : "text-muted-foreground"
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    selectedId === address.id
                      ? "text-success"
                      : "text-foreground"
                  }`}
                >
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                    Utama
                  </span>
                )}
              </div>
              <p
                className={`mt-1 text-sm font-medium ${
                  selectedId === address.id
                    ? "text-success"
                    : "text-foreground"
                }`}
              >
                {address.recipientName} • {address.phone}
              </p>
              <p
                className={`mt-1 text-sm ${
                  selectedId === address.id
                    ? "text-success"
                    : "text-muted-foreground"
                }`}
              >
                {address.street}, {address.city}, {address.province}{" "}
                {address.postalCode}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
