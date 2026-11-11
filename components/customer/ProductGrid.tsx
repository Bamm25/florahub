import type { Product } from "@/types";
import ProductCard from "./ProductCard";

// Props interface untuk komponen grid layout produk
interface ProductGridProps {
  products: Product[];
}

// Render grid layout produk atau empty state
export default function ProductGrid({ products }: ProductGridProps) {
  // Tampilkan empty state jika tidak ada produk
  if (products.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 sm:p-12">
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            Tidak ada produk ditemukan
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba sesuaikan kata kunci pencarian atau filter kategori Anda.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
