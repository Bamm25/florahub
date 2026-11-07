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
import { AddressCard } from "@/components/customer/AddressCard";
import { MapPin, Plus } from "lucide-react";

// Interface untuk data alamat pengiriman customer
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
  const { status } = useSession();

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

  async function loadAddresses(): Promise<void> {
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

  const handleSubmit = async (data: AddressFormData): Promise<void> => {
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
            <AddressCard
              key={address.id}
              address={address}
              onEdit={(addr) => {
                setEditingAddress(addr);
                setShowForm(true);
              }}
              onDelete={handleDelete}
              isDeleting={deletingId === address.id}
            />
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
