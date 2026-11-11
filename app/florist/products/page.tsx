"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import ProductModal from "@/components/florist/ProductModal";
import BOMModal from "@/components/florist/BOMModal";
import ProduceModal from "@/components/florist/ProduceModal";
import ProductStats from "@/components/florist/ProductStats";
import ProductFilters from "@/components/florist/ProductFilters";
import ProductList from "@/components/florist/ProductList";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";

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
  productComponents?: Array<{
    id: string;
    quantity: number;
    inventory: {
      id: string;
      quantity: number;
      stock: {
        name: string;
        variety: string | null;
        unit: string;
      };
    };
  }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
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
  const [selectedProductForBOM, setSelectedProductForBOM] = useState<Product | null>(null);

  const [isProduceModalOpen, setIsProduceModalOpen] = useState(false);
  const [selectedProductForProduce, setSelectedProductForProduce] = useState<Product | null>(null);

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
      const productList = await fetchPaginatedCollection<Product>("/api/florist/products", "products");
      setProducts(productList);
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

  const openComponentsModal = (product: Product) => {
    setSelectedProductForBOM(product);
    setIsComponentModalOpen(true);
  };

  const openProduceModal = async (product: Product) => {
    try {
      // Fetch full product with BOM components
      const res = await fetch(`/api/florist/products/${product.id}`);
      const json = await res.json();
      
      if (res.ok && json.success) {
        setSelectedProductForProduce(json.data);
        setIsProduceModalOpen(true);
      } else {
        alert(json.message || "Gagal memuat data produk");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memuat data produk");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const closeComponentModal = () => {
    setIsComponentModalOpen(false);
    setSelectedProductForBOM(null);
    void fetchProducts();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Nama produk wajib diisi";

    const priceValue = Number(formData.price);
    const isPriceInvalid = !formData.price.trim() || !Number.isSafeInteger(priceValue) || priceValue <= 0;
    if (isPriceInvalid) errors.price = "Harga harus lebih dari 0";

    const stockValue = Number(formData.stock);
    const isStockInvalid = !formData.stock.trim() || !Number.isSafeInteger(stockValue) || stockValue < 0;
    if (isStockInvalid) errors.stock = "Stok tidak boleh negatif";
    
    // Validate weight if provided
    const hasWeight = formData.weight && formData.weight.trim();
    if (hasWeight) {
      const weightValue = Number(formData.weight);
      const isWeightInvalid = !Number.isSafeInteger(weightValue) || weightValue < 0;
      if (isWeightInvalid) errors.weight = "Berat harus berupa angka valid dan tidak negatif";
    }

    if (!formData.image.trim()) errors.image = "Gambar produk wajib diunggah";
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
      const priceValue = Number(formData.price);
      const stockValue = Number(formData.stock);
      const weightValue = formData.weight ? Number(formData.weight) : null;
      
      // Final validation before submission
      if (!Number.isSafeInteger(priceValue) || !Number.isSafeInteger(stockValue) ||
          (weightValue !== null && !Number.isSafeInteger(weightValue))) {
        throw new Error("Nilai harga atau stok tidak valid");
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

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || `Gagal menyimpan produk (${res.status})`);
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

  const handleDelete = async (productId: string) => {
    if (!confirm(`Hapus produk ini?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/florist/products/${productId}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || `Gagal menghapus produk (${res.status})`);
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
        onProduce={openProduceModal}
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

      {isComponentModalOpen && selectedProductForBOM && (
        <BOMModal
          isOpen={isComponentModalOpen}
          productId={selectedProductForBOM.id}
          productName={selectedProductForBOM.name}
          onClose={closeComponentModal}
        />
      )}

      {isProduceModalOpen && selectedProductForProduce && (
        <ProduceModal
          isOpen={isProduceModalOpen}
          product={selectedProductForProduce}
          onClose={() => {
            setIsProduceModalOpen(false);
            setSelectedProductForProduce(null);
          }}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
