"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, Store, Trash2 } from "lucide-react";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import { useCartStore } from "@/lib/stores/cartStore";
import { formatRupiah } from "@/lib/utils/formatters";

// Daftar item keranjang belanja editorial dengan pengatur kuantitas dan tautan toko studio
export default function CartTable() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center sm:p-12">
        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Keranjang masih kosong
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Pilih bunga dari katalog untuk mulai belanja.
        </p>
        <Link href="/products" className="btn-primary mt-6">
          Lihat Katalog
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => {
        const isOutOfStock = item.stock <= 0;
        const isLowStock =
          item.stock > 0 && item.stock < PRODUCT_LOW_STOCK_THRESHOLD;

        return (
          <article
            key={item.productId}
            className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            {/* Left Media + Info */}
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container sm:w-24">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Tanpa foto
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/stores/${item.floristId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Lihat toko</span>
                  </Link>
                  {(isOutOfStock || isLowStock) && (
                    <span className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-2.5 py-0.5 text-xs font-semibold tabular-nums text-warning">
                      {isOutOfStock ? "Stok habis" : `Sisa ${item.stock}`}
                    </span>
                  )}
                </div>

                <h2 className="mt-1.5 text-base font-bold leading-snug text-foreground sm:text-lg">
                  {item.name}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatRupiah(item.price)}
                  </span>
                  <span>·</span>
                  <span>Stok {item.stock}</span>
                </div>
              </div>
            </div>

            {/* Right Controls: Stepper, Line Subtotal, Remove */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-4 sm:border-t-0 sm:pt-0 sm:justify-end">
              {/* Quantity Stepper */}
              <div className="flex items-center rounded-xl border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      item.productId,
                      Math.max(1, item.quantity - 1),
                    )
                  }
                  disabled={item.quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Kurangi jumlah ${item.name}`}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={item.stock}
                  value={item.quantity}
                  aria-label={`Jumlah untuk ${item.name}`}
                  onChange={(e) => {
                    const newQty = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(newQty)) {
                      updateQuantity(
                        item.productId,
                        Math.min(Math.max(1, newQty), item.stock),
                      );
                    }
                  }}
                  className="h-11 w-14 border-x border-border/60 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Tambah jumlah ${item.name}`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Line Subtotal + Remove */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground sm:hidden">Subtotal</p>
                  <p className="text-base font-bold tabular-nums text-foreground sm:min-w-[115px] sm:text-lg">
                    {formatRupiah(item.price * item.quantity)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-error/20 hover:bg-error/10 hover:text-error"
                  aria-label={`Hapus ${item.name} dari keranjang`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
