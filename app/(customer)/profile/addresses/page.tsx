"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "@/lib/api/addresses";
import AddressForm from "@/components/customer/AddressForm";
import { MapPin, Plus, Edit, Trash2, Star } from "lucide-react";

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

export default function AddressManagementPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/profile/addresses");
      return;
    }

    loadAddresses();
  }, [status, router]);

  async function loadAddresses() {
    try {
      setIsLoading(true);
      const response = await getAddresses();
      setAddresses(response.data.items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat alamat",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, data);
      } else {
        await createAddress(data);
      }
      await loadAddresses();
      setShowForm(false);
      setEditingAddress(null);
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) {
      return;
    }

    try {
      setDeletingId(addressId);
      await deleteAddress(addressId);
      await loadAddresses();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus alamat");
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alamat Saya</h1>
        <button
          onClick={() => {
            setEditingAddress(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-5 w-5" />
          Tambah Alamat
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <MapPin className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Belum ada alamat tersimpan
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Tambahkan alamat pengiriman untuk memudahkan proses checkout.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Tambah Alamat Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="relative rounded-lg border border-gray-200 bg-white p-6"
            >
              {address.isDefault && (
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Star className="h-3 w-3 fill-current" />
                  Utama
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-emerald-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {address.label}
                  </h3>
                  <p className="mt-2 font-medium text-gray-700">
                    {address.recipientName} • {address.phone}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {address.fullAddress}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {address.city}, {address.province} {address.postalCode}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setEditingAddress(address);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={deletingId === address.id}
                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === address.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddressForm
          address={editingAddress}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingAddress(null);
          }}
        />
      )}
    </div>
  );
}
