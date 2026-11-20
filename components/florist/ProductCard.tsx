import React from "react";
import Image from "next/image";
import { Eye, Edit, Trash2, ImageIcon, Package } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatters";

// Tipe data lengkap produk untuk sinkronisasi dengan halaman florist
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  image: string;
  images: string[];
  categoryId: string;
  isActive: boolean;
  tags: string[];
  weight: number | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
}

// Props interface untuk komponen kartu produk florist
interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onViewComponents: (product: Product) => void;
  onProduce: (product: Product) => void;
}

// Komponen kartu produk katalog florist dengan aksi edit, hapus, BOM, dan produksi
export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onViewComponents,
  onProduce,
}: ProductCardProps) {
  return (
    <article className="@container m-card group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-foreground/30">
      <div>
        {/* Product Image */}
        <div className="relative h-48 overflow-hidden bg-surface-container-low">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="m-zoom object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/60">
              <ImageIcon className="h-10 w-10 stroke-[1.5]" aria-hidden="true" />
            </div>
          )}

          {/* Status Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {!product.isActive && (
              <span className="inline-flex items-center rounded-md border border-white/15 bg-surface-dark/90 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                Nonaktif
              </span>
            )}
            {product.stock === 0 && (
              <span className="inline-flex items-center rounded-md bg-error px-2 py-0.5 text-[11px] font-semibold text-error-foreground">
                Stok Habis
              </span>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-2.5 p-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </span>
            <h3 className="mt-0.5 line-clamp-1 text-sm font-bold text-foreground">
              {product.name}
            </h3>
          </div>

          <div className="flex items-baseline justify-between border-t border-border/60 pt-2">
            <p className="text-base font-bold tabular-nums text-foreground">
              {formatRupiah(product.price)}
            </p>
            <span
              className={`text-xs font-semibold tabular-nums ${
                product.stock === 0
                  ? "text-error"
                  : product.stock < 10
                    ? "text-warning"
                    : "text-muted-foreground"
              }`}
            >
              Stok: {product.stock}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onProduce(product)}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            title="Produksi Produk Jadi"
          >
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Produksi</span>
          </button>
          <button
            type="button"
            onClick={() => onViewComponents(product)}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
            title="Lihat Komponen BOM"
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>BOM</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/10"
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </article>
  );
}
