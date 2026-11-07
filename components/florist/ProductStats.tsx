interface Product {
  isActive: boolean;
  stock: number;
  isFeatured: boolean;
}

interface ProductStatsProps {
  products: Product[];
}

export default function ProductStats({ products }: ProductStatsProps) {
  const totalProducts = Array.isArray(products) ? products.length : 0;
  const activeCount = Array.isArray(products) ? products.filter((p) => p.isActive).length : 0;
  const outOfStockCount = Array.isArray(products) ? products.filter((p) => p.stock === 0).length : 0;
  const featuredCount = Array.isArray(products) ? products.filter((p) => p.isFeatured).length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="card-elevated p-4 space-y-1">
        <p className="text-sm text-muted-foreground">Total Produk</p>
        <p className="text-2xl font-semibold">{totalProducts}</p>
      </div>
      <div className="card-elevated p-4 space-y-1">
        <p className="text-sm text-muted-foreground">Aktif</p>
        <p className="text-2xl font-semibold text-success">{activeCount}</p>
      </div>
      <div className="card-elevated p-4 space-y-1">
        <p className="text-sm text-muted-foreground">Stok Habis</p>
        <p className="text-2xl font-semibold text-warning">{outOfStockCount}</p>
      </div>
      <div className="card-elevated p-4 space-y-1">
        <p className="text-sm text-muted-foreground">Featured</p>
        <p className="text-2xl font-semibold text-tertiary">{featuredCount}</p>
      </div>
    </div>
  );
}
