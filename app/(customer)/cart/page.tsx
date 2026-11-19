"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Flower2,
  Trash2,
} from "lucide-react";
import CartTable from "@/components/customer/CartTable";
import { ConfirmDialog, LoadingSpinner } from "@/components/ui";
import { useCartStore } from "@/lib/stores/cartStore";
import { formatRupiah } from "@/lib/utils/formatters";

// Halaman keranjang belanja editorial dengan guard satu florist dan ringkasan transparan
export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state._hasHydrated);
  const total = useCartStore((state) => state.getTotal());
  const clearCart = useCartStore((state) => state.clearCart);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Render loading saat belum terhidrasi untuk mencegah hydration mismatch
  if (!hasHydrated) {
    return (
      <div className="container-custom py-12">
        <LoadingSpinner message="Memuat keranjang belanja..." />
      </div>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctFlorists = new Set(items.map((item) => item.floristId)).size;
  const hasMultipleFlorists = distinctFlorists > 1;

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Masthead */}
      <section className="border-b border-white/10 bg-surface-dark py-10 text-white sm:py-14">
        <div className="container-custom">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-kicker">
              1. Keranjang
            </span>
            <span className="text-white/40" aria-hidden="true">
              →
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-white/55">
              2. Checkout
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Keranjang{" "}
                <span className="font-display font-normal italic text-kicker">
                  Belanja
                </span>
              </h1>
              <p className="mt-2 text-base text-white/70">
                {items.length > 0
                  ? `${itemCount} produk siap dipesan.`
                  : "Keranjang masih kosong."}
              </p>
            </div>

            {items.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-kicker underline-offset-4 hover:text-white hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Tambah produk
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/80 transition-colors hover:border-error/40 hover:bg-error/10 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Kosongkan
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container-custom pt-8 sm:pt-12">
        {items.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-container-low text-primary">
              <Flower2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Keranjang masih kosong
            </h2>
            <p className="mt-2.5 text-base text-muted-foreground">
              Pilih bunga favorit Anda di katalog.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/products" className="btn-primary">
                Lihat Katalog
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/stores" className="btn-secondary">
                Lihat Toko
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:gap-14">
            {/* Items Column */}
            <div className="space-y-4">
              {hasMultipleFlorists && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-foreground">
                      Produk berasal dari {distinctFlorists} toko berbeda
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Satu checkout hanya berlaku untuk 1 toko. Sisakan produk dari satu toko untuk melanjutkan.
                    </p>
                  </div>
                </div>
              )}

              <CartTable />
            </div>

            {/* Sticky Receipt Summary Column */}
            <aside className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-dark p-6 text-white sm:p-7">
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Ringkasan Belanja
                </h2>

                <dl className="mt-5 space-y-3.5 border-t border-white/10 pt-5 text-sm">
                  <div className="flex items-center justify-between text-white/75">
                    <dt>Subtotal ({itemCount} produk)</dt>
                    <dd className="font-semibold tabular-nums text-white">
                      {formatRupiah(total)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-white/75">
                    <dt>Ongkos kirim</dt>
                    <dd className="text-xs text-white/60">
                      Dihitung saat checkout
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-6">
                  <div>
                    <span className="text-sm font-medium text-white/75">
                      Total
                    </span>
                    <p className="text-xs text-white/45">Belum termasuk ongkir</p>
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white sm:text-3xl">
                    {formatRupiah(total)}
                  </p>
                </div>

                {hasMultipleFlorists ? (
                  <button
                    type="button"
                    disabled
                    className="btn-primary mt-6 w-full cursor-not-allowed text-sm font-semibold opacity-60"
                  >
                    Pilih produk dari 1 toko
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="btn-primary mt-6 w-full text-base font-semibold"
                  >
                    Checkout
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}

                <Link
                  href="/products"
                  className="mt-3 flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Lanjut Belanja
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearCart();
          setConfirmClearOpen(false);
        }}
        title="Kosongkan keranjang?"
        description="Semua produk di keranjang akan dihapus."
        confirmLabel="Kosongkan"
        cancelLabel="Batal"
        variant="danger"
      />
    </main>
  );
}
