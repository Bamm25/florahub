"use client";

import { useCartStore } from "@/lib/stores/cartStore";
import type { Product } from "@/types";
import { Card, CardContent, CardFooter } from "../ui/card";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  const stockBadgeVariant = isOutOfStock
    ? "destructive"
    : isLowStock
      ? "secondary"
      : "default";

  const stockBadgeText = isOutOfStock
    ? "Stok Habis"
    : isLowStock
      ? `Stok Menipis (${product.stock})`
      : "Tersedia";

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            Tidak Ada Gambar
          </div>
        )}
        {/* Stock Badge (overlay) */}
        <div className="absolute right-2 top-2">
          <Badge variant={stockBadgeVariant} className="shadow-sm">
            {stockBadgeText}
          </Badge>
        </div>
      </div>

      <CardContent className="flex-1 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
          {product.name}
        </h3>
        <p className="mt-2 text-lg font-bold text-gray-900">
          Rp {product.price.toLocaleString("id-ID")}
        </p>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
            {product.description}
          </p>
        )}
      </CardContent>

      {/* Add to Cart Button */}
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={() => addItem(product)}
          disabled={isOutOfStock}
          className="w-full"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
        </Button>
      </CardFooter>
    </Card>
  );
}
