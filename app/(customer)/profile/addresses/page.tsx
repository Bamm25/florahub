"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type Address,
} from "@/lib/api/addresses";
import AddressForm from "@/components/customer/AddressForm";
import { AddressCard } from "@/components/customer/AddressCard";
import { ConfirmDialog } from "@/components/ui";

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

// Halaman manajemen buku alamat pelanggan dengan masthead gelap editorial dan pengaturan alamat utama
export default function AddressManagementPage() {
  const router = useRouter();
  const { status } = useSession();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadAddresses = useCallback(async (signal?: AbortSignal): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await getAddresses(signal);
      if (!signal?.aborted) {
        setAddresses(response.data.items);
      }
    } catch (error) {
      if (
        signal?.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat alamat.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/profile/addresses");
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadAddresses(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [status, router, loadAddresses]);

  const handleSubmit = async (data: AddressFormData): Promise<void> => {
    if (editingAddress) {
      await updateAddress(editingAddress.id, data);
    } else {
      await createAddress(data);
    }
    await loadAddresses();
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleSetDefault = async (addressId: string): Promise<void> => {
    try {
      setErrorMessage(null);
      setSettingDefaultId(addressId);
      await updateAddress(addressId, { isDefault: true });
      await loadAddresses();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengatur alamat utama.",
      );
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      setErrorMessage(null);
      setDeletingId(pendingDeleteId);
      await deleteAddress(pendingDeleteId);
      await loadAddresses();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menghapus alamat.",
      );
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <div className="mb-6 h-6 w-36 animate-pulse rounded bg-surface-container" />
          <div className="mb-8 h-10 w-56 animate-pulse rounded-lg bg-surface-container" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl bg-surface-container-low"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const sortedAddresses = addresses.toSorted(
    (a, b) => Number(b.isDefault) - Number(a.isDefault),
  );
  const pendingDeleteAddress = addresses.find((a) => a.id === pendingDeleteId);

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Masthead */}
      <section className="border-b border-white/10 bg-surface-dark py-10 text-white sm:py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumbs">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-white/60">
              <li>
                <Link
                  href="/profile"
                  className="underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  Profil
                </Link>
              </li>
              <li aria-hidden="true" className="text-white/35">
                /
              </li>
              <li>
                <Link
                  href="/profile/addresses"
                  aria-current="page"
                  className="font-semibold text-white underline-offset-4 hover:underline"
                >
                  Alamat Pengiriman
                </Link>
              </li>
            </ol>
          </nav>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Alamat{" "}
                <span className="font-display font-normal italic text-kicker">
                  Pengiriman
                </span>
              </h1>
              <p className="mt-2 text-base tabular-nums text-white/70">
                {addresses.length > 0
                  ? `${addresses.length} alamat tersimpan`
                  : "Belum ada alamat"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingAddress(null);
                setShowForm(true);
              }}
              className="btn-primary inline-flex h-11 items-center px-5 py-0 text-sm"
            >
              Tambah Alamat
            </button>
          </div>
        </div>
      </section>

      <div className="container-custom pt-8 sm:pt-10">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error"
          >
            {errorMessage}
          </div>
        )}

        {sortedAddresses.length === 0 ? (
          <section
            aria-label="Belum ada alamat"
            className="rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-12"
          >
            <h2 className="text-lg font-bold text-foreground">
              Belum ada alamat tersimpan
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingAddress(null);
                setShowForm(true);
              }}
              className="btn-primary mt-6 inline-flex h-11 items-center px-6 py-0 text-sm"
            >
              Tambah Alamat
            </button>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {sortedAddresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => {
                  setEditingAddress(address);
                  setShowForm(true);
                }}
                onDelete={(addressId) => setPendingDeleteId(addressId)}
                onSetDefault={(addressId) => void handleSetDefault(addressId)}
                isDeleting={deletingId === address.id}
                isSettingDefault={settingDefaultId === address.id}
              />
            ))}
          </div>
        )}
      </div>

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

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Alamat?"
        description={
          pendingDeleteAddress
            ? `Alamat "${pendingDeleteAddress.label}" akan dihapus.`
            : "Alamat ini akan dihapus dari daftar Anda."
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={Boolean(deletingId)}
      />
    </main>
  );
}
