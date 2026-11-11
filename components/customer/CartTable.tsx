"use client";

import { useCartStore } from "@/lib/stores/cartStore";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Responsive table untuk display cart items dengan quantity controls
export default function CartTable() {
  // Get cart state dan actions dari Zustand store
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // Tampilkan empty state dengan CTA ke catalog
  if (items.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Keranjang kosong</p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
          Belum ada bunga di keranjang
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Pilih bunga segar dari katalog untuk menambahkannya ke keranjang belanja Anda.
        </p>
        <Link
          href="/products"
          className="btn-primary mt-6"
        >
          Lihat Katalog Bunga
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile: Card Layout */}
      <div className="space-y-4 sm:hidden">
        {items.map((item) => (
          <div
            key={item.productId}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            {/* Product Info */}
            <div className="flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Tanpa foto
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {item.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Stok: {item.stock} tangkai
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Rp {item.price.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* Quantity & Actions */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      item.productId,
                      Math.max(1, item.quantity - 1),
                    )
                  }
                  disabled={item.quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Kurangi jumlah ${item.name}`}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.stock}
                  value={item.quantity}
                  aria-label={`Jumlah untuk ${item.name}`}
                  onChange={(e) => {
                    const newQty = parseInt(e.target.value, 10);
                    if (!isNaN(newQty)) {
                      updateQuantity(
                        item.productId,
                        Math.min(Math.max(1, newQty), item.stock),
                      );
                    }
                  }}
                  className="h-11 w-14 rounded-xl border border-border bg-input text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      item.productId,
                      Math.min(item.quantity + 1, item.stock),
                    )
                  }
                  disabled={item.quantity >= item.stock}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Tambah jumlah ${item.name}`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                aria-label={`Hapus ${item.name} dari keranjang`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Subtotal */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Subtotal</span>
              <span className="text-base font-bold text-foreground">
                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Produk
              </th>
              <th scope="col" className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Harga
              </th>
              <th scope="col" className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Jumlah
              </th>
              <th scope="col" className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Subtotal
              </th>
              <th scope="col" className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.productId} className="transition-colors hover:bg-muted/20">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Tanpa foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Stok tersedia: {item.stock}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-5 text-right text-sm font-medium text-foreground whitespace-nowrap">
                  Rp {item.price.toLocaleString("id-ID")}
                </td>

                <td className="px-4 py-5">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          Math.max(1, item.quantity - 1),
                        )
                      }
                      disabled={item.quantity <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Kurangi jumlah ${item.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      aria-label={`Jumlah untuk ${item.name}`}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value, 10);
                        if (!isNaN(newQty)) {
                          updateQuantity(
                            item.productId,
                            Math.min(Math.max(1, newQty), item.stock),
                          );
                        }
                      }}
                      className="h-9 w-14 rounded-lg border border-border bg-input text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          Math.min(item.quantity + 1, item.stock),
                        )
                      }
                      disabled={item.quantity >= item.stock}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Tambah jumlah ${item.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>

                <td className="px-4 py-5 text-right text-base font-bold text-foreground whitespace-nowrap">
                  Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                </td>

                <td className="px-4 py-5 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                    aria-label={`Hapus ${item.name} dari keranjang`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
