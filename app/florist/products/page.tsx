"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import {
  ConfirmDialog,
  LoadingSpinner,
  ErrorState,
  Pagination,
} from "@/components/ui";
import ProductModal from "@/components/florist/ProductModal";
import BOMModal from "@/components/florist/BOMModal";
import ProduceModal from "@/components/florist/ProduceModal";
import ProductStats from "@/components/florist/ProductStats";
import ProductFilters from "@/components/florist/ProductFilters";
import ProductList from "@/components/florist/ProductList";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { getCategories, type CategoryItem } from "@/lib/api/products";
import {
  getFloristProductById,
  saveFloristProduct,
  deleteFloristProduct,
} from "@/lib/api/florist";

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

const PRODUCTS_PER_PAGE = 12;

export default function FloristProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null);

  const fetchProducts = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const productList = await fetchPaginatedCollection<Product>("/api/florist/products", "products");
      setProducts(productList);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (silent) {
        setActionError("Gagal memperbarui daftar produk: " + message);
      } else {
        setError(message);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      await Promise.all([
        fetchProducts(),
        getCategories(controller.signal)
          .then((items) => {
            if (!controller.signal.aborted) {
              setCategories(items);
            }
          })
          .catch(() => {
            // Abaikan error memuat kategori opsional
          }),
      ]);
    };
    void fetchData();
    return () => controller.abort();
  }, []);

  const openCreateModal = () => {
    setActionSuccess(null);
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
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setActionSuccess(null);
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
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openComponentsModal = (product: Product) => {
    setSelectedProductForBOM(product);
    setIsComponentModalOpen(true);
  };

  const openProduceModal = async (product: Product) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      // Ambil data lengkap produk beserta komponen BOM
      const fullProduct = await getFloristProductById<Product>(product.id);
      setSelectedProductForProduce(fullProduct);
      setIsProduceModalOpen(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal memuat data produk",
      );
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const closeComponentModal = () => {
    setIsComponentModalOpen(false);
    setSelectedProductForBOM(null);
    void fetchProducts(true);
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

    // Validasi berat produk jika diisi (harus bilangan bulat positif)
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

      // Validasi akhir nilai numerik sebelum dikirim ke server
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
      };

      if (modalMode === "edit" && !selectedProduct?.id) {
        throw new Error("Product ID is missing");
      }

      await saveFloristProduct(
        payload,
        modalMode === "edit" ? selectedProduct?.id : undefined,
      );

      await fetchProducts();
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteProductId) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await deleteFloristProduct(pendingDeleteProductId);
      await fetchProducts(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setActionError("Gagal menghapus produk: " + message);
    } finally {
      setIsSubmitting(false);
      setPendingDeleteProductId(null);
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

  const totalProductPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );
  const safeProductPage = Math.min(currentPage, totalProductPages);
  const productStart = (safeProductPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    productStart,
    productStart + PRODUCTS_PER_PAGE,
  );

  const hasFilters = Boolean(
    searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
  );

  if (isLoading) {
    return <LoadingSpinner message="Memuat katalog produk..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal Memuat Produk"
        error={error}
        onRetry={() => void fetchProducts()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Katalog & Perakitan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Kelola Produk Toko
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Atur katalog buket bunga, susun formula bahan baku (BOM), dan lakukan perakitan stok produk siap jual.
          </p>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </section>

      {actionSuccess && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="shrink-0 text-xs font-semibold text-success hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      <ProductStats products={products} />

      <ProductFilters
        categoryFilter={categoryFilter}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        categories={categories}
        onCreateClick={openCreateModal}
      />

      <ProductList
        products={paginatedProducts}
        hasFilters={hasFilters}
        onEdit={openEditModal}
        onDelete={(productId) => setPendingDeleteProductId(productId)}
        onViewComponents={openComponentsModal}
        onProduce={openProduceModal}
      />

      {filteredProducts.length > PRODUCTS_PER_PAGE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
          <p className="text-xs tabular-nums text-muted-foreground">
            Menampilkan {productStart + 1}–
            {Math.min(productStart + PRODUCTS_PER_PAGE, filteredProducts.length)}{" "}
            dari {filteredProducts.length} produk
          </p>
          <Pagination
            currentPage={safeProductPage}
            totalPages={totalProductPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            ariaLabel="Navigasi halaman produk"
          />
        </div>
      )}

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
          onSuccess={(message) => {
            setActionError(null);
            setActionSuccess(message);
            void fetchProducts(true);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteProductId)}
        onClose={() => setPendingDeleteProductId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Produk"
        description="Produk yang dihapus tidak akan tampil lagi di katalog toko Anda."
        confirmLabel="Hapus Produk"
        variant="danger"
        loading={isSubmitting}
      />
    </div>
  );
}
