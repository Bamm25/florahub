import type { Product } from "@/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            Tidak ada produk ditemukan
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Coba sesuaikan pencarian atau filter Anda
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
