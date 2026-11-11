// Interface data produk untuk ringkasan statistik
interface Product {
  isActive: boolean;
  stock: number;
  isFeatured: boolean;
}

// Props interface untuk komponen ringkasan statistik produk
interface ProductStatsProps {
  products: Product[];
}

// Komponen panel statistik metrik produk katalog florist
export default function ProductStats({ products }: ProductStatsProps) {
  const totalProducts = Array.isArray(products) ? products.length : 0;
  const activeCount = Array.isArray(products) ? products.filter((p) => p.isActive).length : 0;
  const outOfStockCount = Array.isArray(products) ? products.filter((p) => p.stock === 0).length : 0;
  const featuredCount = Array.isArray(products) ? products.filter((p) => p.isFeatured).length : 0;

  const stats = [
    { label: "Total katalog", value: totalProducts, accent: "text-foreground" },
    { label: "Produk aktif", value: activeCount, accent: "text-success" },
    { label: "Stok habis", value: outOfStockCount, accent: outOfStockCount > 0 ? "text-warning" : "text-foreground" },
    { label: "Unggulan / featured", value: featuredCount, accent: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border bg-card">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r last:border-r-0"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
          <p className={`mt-2 text-2xl sm:text-3xl font-bold tabular-nums ${s.accent}`}>
            {s.value.toLocaleString("id-ID")}
          </p>
        </div>
      ))}
    </div>
  );
}
