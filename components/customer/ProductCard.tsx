"use client";

import { useCartStore } from "@/lib/stores/cartStore";
import type { Product } from "@/types";
import Image from "next/image";
import { ShoppingCart, Star } from "lucide-react";
import Link from "next/link";

// Props interface untuk komponen card display produk
interface ProductCardProps {
  product: Product;
}

// Card display produk dengan image, rating, price, dan add to cart
export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  // Determine status stok produk untuk badge dan disable button
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  // Add produk ke cart store tanpa navigate ke halaman lain
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      floristId: product.floristId,
    });
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:bg-surface-container-low">
      {/* Hanya gambar yang bisa diklik ke detail produk */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square w-full cursor-pointer overflow-hidden bg-surface-container"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Tidak Ada Gambar
          </div>
        )}
        {/* Stock Badge (overlay) */}
        <div className="absolute right-3 top-3">
          {isOutOfStock ? (
            <span className="inline-flex items-center rounded-full bg-error px-3 py-1 text-xs font-semibold text-error-foreground shadow-sm">
              Stok Habis
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center rounded-full bg-warning/90 px-3 py-1 text-xs font-semibold text-warning-foreground shadow-sm">
              Stok Menipis ({product.stock})
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary-container-foreground shadow-sm">
              Tersedia
            </span>
          )}
        </div>
      </Link>

      {/* Content text - bisa di-select/copy, cursor default */}
      <div className="flex-1 p-5 cursor-default">
        <h3 className="line-clamp-2 text-lg font-bold text-foreground select-text group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.averageRating && product.averageRating > 0 && (
          <div className="flex items-center gap-1 text-sm mt-2">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-medium">{product.averageRating.toFixed(1)}</span>
            {product.reviewCount && (
              <span className="text-muted-foreground">({product.reviewCount})</span>
            )}
          </div>
        )}
        <p className="mt-2 text-xl font-bold text-primary select-text">
          Rp {product.price.toLocaleString("id-ID")}
        </p>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground select-text">
            {product.description}
          </p>
        )}
      </div>

      {/* Add to Cart Button - cursor pointer */}
      <div className="p-5 pt-0">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="btn-primary w-full h-12 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
        </button>
      </div>
    </div>
  );
}
