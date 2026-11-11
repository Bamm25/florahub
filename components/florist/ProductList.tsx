import ProductCard from "@/components/florist/ProductCard";

// Interface data produk untuk komponen daftar produk
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

// Props interface untuk komponen daftar produk florist
interface ProductListProps {
  products: Product[];
  hasFilters: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onViewComponents: (product: Product) => void;
  onProduce: (product: Product) => void;
}

// Komponen grid tampilan daftar produk dengan penanganan state kosong
export default function ProductList({
  products,
  hasFilters,
  onEdit,
  onDelete,
  onViewComponents,
  onProduce,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 flex flex-col items-center justify-center text-center">
        <p className="text-base font-semibold text-foreground">
          {hasFilters
            ? "Tidak ada produk yang sesuai filter"
            : "Belum ada produk terdaftar"}
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {hasFilters
            ? "Coba sesuaikan kata kunci pencarian atau kategori filter."
            : "Tambahkan produk buket atau karangan bunga baru ke katalog toko."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewComponents={onViewComponents}
          onProduce={onProduce}
        />
      ))}
    </div>
  );
}
