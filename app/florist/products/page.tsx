"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Package } from "lucide-react";
import ProductModal from "@/components/florist/ProductModal";
import ProductStats from "@/components/florist/ProductStats";
import ProductFilters from "@/components/florist/ProductFilters";
import ProductList from "@/components/florist/ProductList";

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

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductComponent {
  id: string;
  quantity: number;
  inventory: {
    id: string;
    stock: {
      name: string;
      variety: string | null;
    };
  };
}

export default function FloristProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [productComponents, setProductComponents] = useState<
    ProductComponent[]
  >([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    image: "",
    categoryId: "",
    weight: "",
    tags: "",
    isActive: true,
    isFeatured: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/florist/products");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat produk");
      setProducts(json.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (res.ok) {
        // API returns { data: { items: [...], pagination: {...} } }
        setCategories(json.data?.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchProducts(), fetchCategories()]);
    };
    fetchData();
  }, []);

  const fetchProductComponents = async (productId: string) => {
    try {
      const res = await fetch(`/api/florist/products/${productId}/components`);
      const json = await res.json();
      if (res.ok) {
        setProductComponents(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch components:", err);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      stock: "",
      image: "",
      categoryId: "",
      weight: "",
      tags: "",
      isActive: true,
      isFeatured: false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      image: product.image,
      categoryId: product.categoryId,
      weight: product.weight?.toString() || "",
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openComponentsModal = (productId: string) => {
    fetchProductComponents(productId);
    setIsComponentModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const closeComponentModal = () => {
    setIsComponentModalOpen(false);
    setProductComponents([]);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Nama produk wajib diisi";

    const priceValue = parseFloat(formData.price);
    const isPriceInvalid = !formData.price || isNaN(priceValue) || priceValue <= 0;
    if (isPriceInvalid) errors.price = "Harga harus lebih dari 0";

    const stockValue = parseInt(formData.stock, 10);
    const isStockInvalid = !formData.stock || isNaN(stockValue) || stockValue < 0;
    if (isStockInvalid) errors.stock = "Stok tidak boleh negatif";
    
    // Validate weight if provided
    const hasWeight = formData.weight && formData.weight.trim();
    if (hasWeight) {
      const weightValue = parseInt(formData.weight, 10);
      const isWeightInvalid = isNaN(weightValue) || weightValue < 0;
      if (isWeightInvalid) errors.weight = "Berat harus berupa angka valid dan tidak negatif";
    }

    if (!formData.image.trim()) errors.image = "URL gambar wajib diisi";
    if (!formData.categoryId) errors.categoryId = "Kategori wajib dipilih";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const priceValue = parseFloat(formData.price);
      const stockValue = parseInt(formData.stock, 10);
      const weightValue = formData.weight ? parseInt(formData.weight, 10) : null;
      
      // Final validation before submission
      if (isNaN(priceValue) || isNaN(stockValue) || (weightValue !== null && isNaN(weightValue))) {
        throw new Error("Invalid numeric values");
      }
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: priceValue,
        stock: stockValue,
        image: formData.image.trim(),
        categoryId: formData.categoryId,
        weight: weightValue,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
      };

      const url =
        modalMode === "create"
          ? "/api/florist/products"
          : `/api/florist/products/${selectedProduct?.id || ""}`;
      
      if (modalMode === "edit" && !selectedProduct?.id) {
        throw new Error("Product ID is missing");
      }

      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan produk");
      }

      await fetchProducts();
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Hapus produk "${product.name}"?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/florist/products/${product.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Gagal menghapus produk");
      }

      await fetchProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert("Gagal menghapus produk: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filterProduct = (product: Product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || product.categoryId === categoryFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && product.isActive) ||
      (statusFilter === "INACTIVE" && !product.isActive) ||
      (statusFilter === "OUT_OF_STOCK" && product.stock === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter(filterProduct)
    : [];

  const hasFilters = Boolean(
    searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary"></div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Memuat katalog produk...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Gagal Memuat Produk
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={fetchProducts} className="btn-primary">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Kelola Produk
        </h1>
        <p className="text-muted-foreground">
          Atur katalog produk buket & karangan yang dijual ke customer
        </p>
      </div>

      <ProductStats products={products} />

      <ProductFilters
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        onCreateClick={openCreateModal}
      />

      <ProductList
        products={filteredProducts}
        hasFilters={hasFilters}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onViewComponents={openComponentsModal}
      />

      <ProductModal
        isOpen={isModalOpen}
        mode={modalMode}
        formData={formData}
        formErrors={formErrors}
        categories={categories}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
      />

      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="card-elevated w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-50 bg-surface-container-low border-b border-border p-6 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold">Komponen Produk (BOM)</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Bill of Materials - bahan baku penyusun produk
                </p>
              </div>
              <button
                onClick={closeComponentModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!Array.isArray(productComponents) || productComponents.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Belum ada komponen untuk produk ini
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Komponen BOM menghubungkan produk dengan inventori bunga
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productComponents.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-4 border border-border rounded-xl bg-surface-container-low/40"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {comp.inventory?.stock?.name ?? 'Unknown'}
                          {comp.inventory?.stock?.variety && (
                            <span className="text-sm text-muted-foreground">
                              {" "}
                              ({comp.inventory.stock.variety})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {comp.quantity ?? 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
