"use client";

import { Check } from "lucide-react";
import type { Address } from "@/lib/api/customer";

// Props interface untuk komponen selector alamat pengiriman
interface AddressSelectorProps {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (addressId: string) => void;
}

// Choice cards untuk memilih alamat pengiriman tersimpan
export default function AddressSelector({
  addresses,
  selectedId,
  onSelect,
}: AddressSelectorProps) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 p-6 text-center sm:p-8">
        <p className="text-sm font-semibold text-foreground">
          Belum ada alamat tersimpan
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tambahkan alamat pengiriman terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Pilih alamat pengiriman</legend>
      {addresses.map((address) => {
        const isSelected = selectedId === address.id;
        return (
          <label
            key={address.id}
            className={`relative flex cursor-pointer items-start justify-between gap-4 rounded-2xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
              isSelected
                ? "border-foreground bg-surface-container-low/60"
                : "border-border bg-card hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name="shipping-address"
              value={address.id}
              checked={isSelected}
              onChange={() => onSelect(address.id)}
              className="sr-only"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="rounded-full border border-border bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Utama
                  </span>
                )}
              </div>
              <p className="mt-1 break-words text-sm text-foreground">
                {address.recipientName}
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="tabular-nums text-muted-foreground">
                  {address.phone}
                </span>
              </p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                {address.fullAddress}, {address.city}, {address.province}{" "}
                {address.postalCode}
              </p>
            </div>

            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-transparent"
              }`}
            >
              <Check className="h-3 w-3" />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
