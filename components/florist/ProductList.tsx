import { Package } from "lucide-react";
import ProductCard from "@/components/florist/ProductCard";

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

interface ProductListProps {
  products: Product[];
  hasFilters: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewComponents: (productId: string) => void;
}

export default function ProductList({
  products,
  hasFilters,
  onEdit,
  onDelete,
  onViewComponents,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="card-elevated p-12 flex flex-col items-center justify-center text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">
          {hasFilters
            ? "Tidak ada produk yang sesuai filter"
            : "Belum ada produk"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {hasFilters
            ? "Coba ubah filter pencarian"
            : "Mulai tambahkan produk untuk dijual"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewComponents={onViewComponents}
        />
      ))}
    </div>
  );
}
