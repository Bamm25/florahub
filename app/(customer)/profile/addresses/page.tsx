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
      <div className="container-custom section-spacing">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-8" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-surface-container-low"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom section-spacing">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground">Alamat Saya</h1>
        <button
          onClick={() => {
            setEditingAddress(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus className="mr-2 h-5 w-5" />
          Tambah Alamat
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-error/30 bg-error/5 p-5 text-base text-error">
          {errorMessage}
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface-container-low p-16 text-center">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-container mb-6">
            <MapPin className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Belum ada alamat tersimpan
          </h3>
          <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
            Tambahkan alamat pengiriman untuk memudahkan proses checkout.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="mr-2 h-5 w-5" />
            Tambah Alamat Pertama
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="card-elevated relative"
            >
              {address.isDefault && (
                <div className="absolute right-6 top-6 flex items-center gap-1.5 badge bg-primary text-white">
                  <Star className="h-4 w-4 fill-current" />
                  Alamat Utama
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    {address.label}
                  </h3>
                  <p className="text-base font-semibold text-foreground mb-2">
                    {address.recipientName} • {address.phone}
                  </p>
                  <p className="text-base text-muted-foreground mb-1">
                    {address.fullAddress}
                  </p>
                  <p className="text-base text-muted-foreground">
                    {address.city}, {address.province} {address.postalCode}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setEditingAddress(address);
                    setShowForm(true);
                  }}
                  className="btn-secondary flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={deletingId === address.id}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-error/30 bg-error/5 px-6 py-3 text-base font-semibold text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex-1"
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
