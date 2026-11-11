import React from "react";
import { Eye, Edit, Trash2, ImageIcon, Package } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatters";

// Use full Product type to match parent component
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

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onViewComponents: (product: Product) => void;
  onProduce: (product: Product) => void;
}

/**
 * ProductCard component
 * Grid card for florist product management with image, badges, and action buttons
 */
export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onViewComponents,
  onProduce,
}: ProductCardProps) {
  return (
    <div className="card-elevated p-0 overflow-hidden hover:shadow-xl transition-all">
      {/* Product Image */}
      <div className="relative h-48 bg-surface-container-low">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!product.isActive && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
              Nonaktif
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
              Featured
            </span>
          )}
          {product.stock === 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">
              Stok Habis
            </span>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {product.category.name}
          </p>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">
              {formatRupiah(product.price)}
            </p>
            <p className="text-xs text-muted-foreground">
              Stok: {product.stock}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onViewComponents(product)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-tertiary bg-tertiary/5 rounded-xl hover:bg-tertiary/10 transition-colors"
            title="Lihat Komponen BOM"
          >
            <Eye className="w-4 h-4" />
            BOM
          </button>
          <button
            onClick={() => onProduce(product)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-success bg-success/5 rounded-xl hover:bg-success/10 transition-colors"
            title="Produksi Produk"
          >
            <Package className="w-4 h-4" />
            Produksi
          </button>
          <button
            onClick={() => onEdit(product)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-error bg-error/5 rounded-xl hover:bg-error/10 transition-colors"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
