"use client";

import { ShoppingBag } from "lucide-react";

// Interface untuk item produk di keranjang checkout
interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// Props interface untuk komponen list produk yang dipesan
interface OrderItemsProps {
  items: CartItem[];
}

// Component display list produk yang dipesan dengan harga
export default function OrderItems({ items }: OrderItemsProps) {
  return (
    <div className="card-elevated">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ShoppingBag className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Produk Dipesan ({items.length} item)
        </h2>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="flex-1">
              <p className="text-base font-semibold text-foreground">
                {item.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.quantity}x @ Rp {item.price.toLocaleString("id-ID")}
              </p>
            </div>
            <p className="text-lg font-bold text-foreground">
              Rp {(item.price * item.quantity).toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
