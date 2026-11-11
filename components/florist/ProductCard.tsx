import React from "react";
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
  isFeatured: boolean;
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
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between">
      <div>
        {/* Product Image */}
        <div className="relative h-44 bg-surface-container-low overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/60">
              <ImageIcon className="h-10 w-10 stroke-[1.5]" />
            </div>
          )}

          {/* Status Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {!product.isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-900/90 text-zinc-300 backdrop-blur-xs">
                Nonaktif
              </span>
            )}
            {product.isFeatured && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/90 text-white backdrop-blur-xs">
                Unggulan
              </span>
            )}
            {product.stock === 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-600 text-white backdrop-blur-xs">
                Stok Habis
              </span>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="p-4 space-y-2.5">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </span>
            <h3 className="font-semibold text-foreground text-sm line-clamp-1 mt-0.5">
              {product.name}
            </h3>
          </div>

          <div className="flex items-baseline justify-between pt-1 border-t border-border/60">
            <div>
              <p className="text-base font-bold text-foreground tabular-nums">
                {formatRupiah(product.price)}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-semibold tabular-nums ${product.stock === 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                Stok: {product.stock}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
          <button
            onClick={() => onProduce(product)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-xs"
            title="Produksi Produk Jadi"
          >
            <Package className="w-3.5 h-3.5" />
            Produksi
          </button>
          <button
            onClick={() => onViewComponents(product)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-surface-container-low hover:bg-surface-container rounded-lg border border-border/80 transition-colors"
            title="Lihat Komponen BOM"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            BOM
          </button>
          <button
            onClick={() => onEdit(product)}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Hapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
