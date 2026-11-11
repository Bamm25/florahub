"use client";

import { Check } from "lucide-react";

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
      <div className="rounded-2xl border border-dashed border-border bg-surface-container-low p-6 text-center sm:p-8">
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
    <div className="space-y-3" role="radiogroup" aria-label="Pilih alamat pengiriman">
      {addresses.map((address) => {
        const isSelected = selectedId === address.id;
        return (
          <button
            key={address.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(address.id)}
            className={`relative w-full cursor-pointer rounded-2xl p-4 pr-12 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected
                ? "border-2 border-foreground bg-surface shadow-sm"
                : "border border-border bg-surface hover:border-foreground/30 hover:bg-muted/20"
            }`}
          >
            {isSelected && (
              <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Utama
                  </span>
                )}
              </div>
              <p className="mt-1 break-words text-sm font-medium text-foreground">
                {address.recipientName} • <span className="text-muted-foreground">{address.phone}</span>
              </p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                {address.street}, {address.city}, {address.province}{" "}
                {address.postalCode}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
