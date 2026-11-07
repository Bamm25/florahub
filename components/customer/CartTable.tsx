"use client";

import { useCartStore } from "@/lib/stores/cartStore";
import { Trash2, Plus, Minus } from "lucide-react";
import Image from "next/image";

// Responsive table untuk display cart items dengan quantity controls
export default function CartTable() {
  // Get cart state dan actions dari Zustand store
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // Tampilkan empty state dengan CTA ke catalog
  if (items.length === 0) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-container-low p-8 text-center">
          <div className="mb-4 rounded-full bg-surface-container p-6">
            <svg
              className="h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Keranjang belanja kosong
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Mulai berbelanja bunga segar pilihan terbaik!
          </p>
          <a
            href="/"
            className="btn-primary"
          >
            Lihat Katalog Bunga
          </a>
        </div>
    );
  }

  return (
    <>
      {/* Mobile: Card Layout */}
      <div className="block sm:hidden space-y-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="card-elevated !p-4 space-y-3"
          >
            {/* Product Info */}
            <div className="flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-container text-xs text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {item.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Stok: {item.stock}
                </p>
                <p className="text-base font-bold text-primary mt-1">
                  Rp {item.price.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* Quantity & Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(
                      item.productId,
                      Math.max(1, item.quantity - 1),
                    )
                  }
                  disabled={item.quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 transition-colors touch-manipulation"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.stock}
                  value={item.quantity}
                  onChange={(e) => {
                    const newQty = parseInt(e.target.value, 10);
                    if (!isNaN(newQty)) {
                      updateQuantity(
                        item.productId,
                        Math.min(Math.max(1, newQty), item.stock),
                      );
                    }
                  }}
                  className="w-16 rounded-lg border border-border bg-input px-2 py-2.5 text-center text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() =>
                    updateQuantity(
                      item.productId,
                      Math.min(item.quantity + 1, item.stock),
                    )
                  }
                  disabled={item.quantity >= item.stock}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 transition-colors touch-manipulation"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => removeItem(item.productId)}
                className="inline-flex items-center justify-center rounded-lg h-11 w-11 text-error hover:bg-error/10 transition-colors touch-manipulation"
                aria-label={`Hapus ${item.name}`}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            {/* Subtotal */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold text-foreground">
                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Produk
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Harga
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Jumlah
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subtotal
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.productId} className="transition hover:bg-surface-container-low">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-surface-container text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Stok tersedia: {item.stock}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center text-sm font-semibold text-foreground whitespace-nowrap">
                    Rp {item.price.toLocaleString("id-ID")}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.max(1, item.quantity - 1),
                          )
                        }
                        disabled={item.quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                        aria-label="Kurangi jumlah"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value, 10);
                          if (!isNaN(newQty)) {
                            updateQuantity(
                              item.productId,
                              Math.min(Math.max(1, newQty), item.stock),
                            );
                          }
                        }}
                        className="w-16 rounded-lg border border-border bg-input px-2 py-1.5 text-center text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.min(item.quantity + 1, item.stock),
                          )
                        }
                        disabled={item.quantity >= item.stock}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                        aria-label="Tambah jumlah"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center text-sm font-bold text-foreground whitespace-nowrap">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="inline-flex items-center justify-center rounded-lg p-2 text-error hover:bg-error/10 transition-colors"
                      aria-label={`Hapus ${item.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
