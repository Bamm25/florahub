"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "@/lib/api/addresses";
import AddressForm from "@/components/customer/AddressForm";
import { AddressCard } from "@/components/customer/AddressCard";
import { ArrowLeft } from "lucide-react";

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
      <main className="container-custom section-spacing">
        <div className="h-6 w-36 animate-pulse rounded bg-surface-container mb-6" />
        <div className="h-10 w-56 animate-pulse rounded-lg bg-surface-container mb-8" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-surface-container-low"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container-custom section-spacing">
      {/* Navigasi Balik ke Profil */}
      <nav aria-label="Navigasi" className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Profil
        </Link>
      </nav>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Buku Alamat
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Alamat Pengiriman
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola alamat penerima untuk mempercepat pengiriman dan checkout.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAddress(null);
            setShowForm(true);
          }}
          className="btn-primary h-11 px-5 py-0 text-sm"
        >
          Tambah Alamat
        </button>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error"
        >
          {errorMessage}
        </div>
      )}

      {addresses.length === 0 ? (
        <section
          aria-label="Belum ada alamat"
          className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 p-12 text-center"
        >
          <h2 className="text-lg font-bold text-foreground">
            Belum ada alamat tersimpan
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Tambahkan alamat rumah, kantor, atau penerima hadiah agar proses checkout lebih mudah.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-6 h-11 px-6 py-0 text-sm"
          >
            Tambah Alamat Pertama
          </button>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
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
    </main>
  );
}
