"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/stores/cartStore";

interface StoreQuickAddButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
    floristId: string;
    floristName?: string;
    slug?: string;
  };
  fullWidth?: boolean;
}

export default function StoreQuickAddButton({
  product,
  fullWidth = false,
}: StoreQuickAddButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isOutOfStock = product.stock <= 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      floristId: product.floristId,
      floristName: product.floristName,
      slug: product.slug,
    });
    setJustAdded(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setJustAdded(false);
    }, 1500);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isOutOfStock}
      aria-label={
        isOutOfStock
          ? `${product.name} stok habis`
          : `Tambah ${product.name} ke keranjang`
      }
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 ${
        fullWidth ? "w-full sm:w-auto sm:px-5 text-sm h-12" : "shrink-0"
      }`}
    >
      {isOutOfStock ? (
        "Habis"
      ) : justAdded ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          Masuk
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Keranjang
        </>
      )}
    </button>
  );
}
