"use client";

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
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section
      className="rounded-2xl border border-border bg-card"
      aria-labelledby="order-items-heading"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-6 py-4">
        <h2 id="order-items-heading" className="text-base font-semibold text-foreground">
          Produk dipesan
        </h2>
        <p className="text-sm text-muted-foreground">
          {items.length} produk · {totalQuantity} barang
        </p>
      </header>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex flex-wrap items-start justify-between gap-2 px-6 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {item.quantity} × Rp {item.price.toLocaleString("id-ID")}
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              Rp {(item.price * item.quantity).toLocaleString("id-ID")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
