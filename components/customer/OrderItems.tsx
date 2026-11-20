"use client";

import Image from "next/image";
import { formatRupiah } from "@/lib/utils/formatters";

// Interface untuk item produk di keranjang checkout
interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
  floristName?: string;
}

// Props interface untuk komponen list produk yang dipesan
interface OrderItemsProps {
  items: CartItem[];
  stepNumber?: string;
}

// Daftar produk yang dipesan dengan foto portrait dan rincian harga
export default function OrderItems({ items, stepNumber = "03" }: OrderItemsProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const storeName = items.find((item) => item.floristName?.trim())?.floristName;

  return (
    <section
      className="rounded-2xl border border-border bg-card"
      aria-labelledby="order-items-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
            {stepNumber}
          </span>
          <h2
            id="order-items-heading"
            className="text-base font-semibold text-foreground"
          >
            Produk Dipesan
          </h2>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {storeName ? `${storeName} · ${totalQuantity} item` : `${totalQuantity} item`}
        </p>
      </header>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-4 px-6 py-4"
          >
            {item.image ? (
              <div className="relative aspect-[4/5] h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container-low">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="flex aspect-[4/5] h-16 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-container-low text-[10px] font-medium text-muted-foreground"
                aria-hidden="true"
              >
                Foto
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
              </p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {item.quantity} × {formatRupiah(item.price)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatRupiah(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
