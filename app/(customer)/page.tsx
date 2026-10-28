"use client";

import ProductGrid from "@/components/customer/ProductGrid";
import { getProducts } from "@/lib/api/products";
import type { Product } from "@/types";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const response = await getProducts();
        setProducts(response.data.products);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat produk",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <p className="text-gray-600">Memuat produk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-blue-600 underline hover:text-blue-800"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Semua Produk</h1>
      <ProductGrid products={products} />
    </main>
  );
}
