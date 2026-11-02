"use client";

import { MapPin, Check } from "lucide-react";

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

interface AddressSelectorProps {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (addressId: string) => void;
}

export default function AddressSelector({
  addresses,
  selectedId,
  onSelect,
}: AddressSelectorProps) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-sm font-semibold text-gray-900">
          Belum ada alamat tersimpan
        </h3>
        <p className="mt-1 text-sm text-gray-500">
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
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {selectedId === address.id && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}

          <div className="flex items-start gap-3">
            <MapPin
              className={`h-5 w-5 mt-0.5 ${
                selectedId === address.id ? "text-emerald-600" : "text-gray-400"
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    selectedId === address.id
                      ? "text-emerald-900"
                      : "text-gray-900"
                  }`}
                >
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Utama
                  </span>
                )}
              </div>
              <p
                className={`mt-1 text-sm font-medium ${
                  selectedId === address.id
                    ? "text-emerald-800"
                    : "text-gray-700"
                }`}
              >
                {address.recipientName} • {address.phone}
              </p>
              <p
                className={`mt-1 text-sm ${
                  selectedId === address.id
                    ? "text-emerald-700"
                    : "text-gray-600"
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
