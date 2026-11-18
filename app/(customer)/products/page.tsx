"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductGrid from "@/components/customer/ProductGrid";
import {
  SearchInput,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Pagination,
} from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { getCustomerProducts } from "@/lib/api/customer";
import { getCategories, type CategoryItem } from "@/lib/api/products";
import { X } from "lucide-react";
import type { Product } from "@/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "price-asc", label: "Harga Terendah" },
  { value: "price-desc", label: "Harga Tertinggi" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "name-desc", label: "Nama Z-A" },
];

// Component utama halaman katalog produk dengan filter dan pagination
function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State data produk dan status pemuatan
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // State filter pencarian, kategori, dan pengurutan
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");

  // State navigasi nomor halaman dan total hasil
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 12;

  // Fetch daftar kategori untuk dropdown filter
  useEffect(() => {
    const controller = new AbortController();
    async function fetchCategories() {
      try {
        const items = await getCategories(controller.signal);
        if (!controller.signal.aborted) {
          setCategories(items);
        }
      } catch {
        // Abaikan kegagalan memuat kategori opsional
      }
    }
    void fetchCategories();
    return () => controller.abort();
  }, []);

  // Fetch produk dengan filter search, kategori, dan sorting
  useEffect(() => {
    const controller = new AbortController();
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getCustomerProducts<Product>(
          {
            page: currentPage,
            limit: PRODUCTS_PER_PAGE,
            search: searchQuery || undefined,
            categoryId:
              selectedCategory && selectedCategory !== "all"
                ? selectedCategory
                : undefined,
            sortBy: sortBy || undefined,
          },
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setProducts(data.items || []);
          setTotalProducts(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat produk");
        setProducts([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchProducts();
    return () => controller.abort();
  }, [searchQuery, selectedCategory, sortBy, currentPage, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Update URL query params saat filter berubah untuk shareable links
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (sortBy !== "newest") params.set("sortBy", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    router.replace(`/products${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [searchQuery, selectedCategory, sortBy, currentPage, router]);

  // Clear filter spesifik dan reset ke halaman pertama
  const clearFilter = (filterType: "search" | "category") => {
    setCurrentPage(1);
    if (filterType === "search") setSearchQuery("");
    if (filterType === "category") setSelectedCategory("all");
  };

  // Reset semua filter ke default state
  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Check apakah ada filter aktif untuk show/hide clear chips
  const hasActiveFilters = searchQuery || selectedCategory !== "all";

  // Handle perubahan search dengan reset pagination
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Handle perubahan kategori dengan reset pagination
  const handleCategoryChange = (value: string | null) => {
    setSelectedCategory(value || "all");
    setCurrentPage(1);
  };

  // Handle perubahan sorting dengan reset pagination
  const handleSortChange = (value: string | null) => {
    setSortBy(value || "newest");
    setCurrentPage(1);
  };

  // Hitung range hasil untuk display pagination info
  const startResult = totalProducts === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <section className="border-b border-border bg-surface py-12 sm:py-16">
        <div className="container-custom">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Jelajahi koleksi</p>
          <h1 className="text-4xl font-bold text-foreground mb-2">Cari bunga yang cocok</h1>
          <p className="text-base text-muted-foreground">Telusuri pilihan bunga dari florist di FloraHub.</p>
        </div>
      </section>

      <div className="container-custom py-8">
        {/* Filters Bar */}
        <div className="border-b border-border pb-6 mb-6">
          <div className="space-y-4">
            {/* Search - full width */}
            <div className="w-full">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Cari produk..."
                className="w-full"
              />
            </div>

            {/* 2 Dropdowns - grid on desktop, stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger aria-label="Filter kategori">
                  <span className="text-sm truncate">
                    Kategori: {selectedCategory === "all" ? "Semua" : categories.find(c => c.id === selectedCategory)?.name || "Semua"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Filter */}
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger aria-label="Urutkan produk">
                  <span className="text-sm truncate">
                    Urutkan: {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || "Terbaru"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Filter aktif:
            </span>
            {searchQuery && (
              <button
                onClick={() => clearFilter("search")}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              >
                Pencarian: &ldquo;{searchQuery}&rdquo;
                <X className="h-3 w-3" />
              </button>
            )}
            {selectedCategory !== "all" && (
              <button
                onClick={() => clearFilter("category")}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              >
                {categories.find(c => c.id === selectedCategory)?.name}
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-error hover:underline ml-2"
            >
              Hapus Semua
            </button>
          </div>
        )}

        {/* Result Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              "Memuat produk..."
            ) : totalProducts === 0 ? (
              "Tidak ada produk ditemukan"
            ) : (
              <>
                Menampilkan <span className="font-semibold text-foreground">{startResult}-{endResult}</span> dari{" "}
                <span className="font-semibold text-foreground">{totalProducts}</span> produk
              </>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSpinner message="Memuat katalog produk..." />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Gagal Memuat Produk"
            error={error}
            onRetry={handleRetry}
          />
        )}

        {/* Products Grid or Empty State */}
        {!isLoading && !error && (
          <>
            {totalProducts === 0 ? (
              <EmptyState
                title="Belum ada produk yang cocok"
                description="Coba ubah atau hapus beberapa filter untuk melihat lebih banyak produk."
                action={{
                  label: "Hapus Semua Filter",
                  onClick: clearAllFilters,
                }}
              />
            ) : (
              <ProductGrid products={products} />
            )}
          </>
        )}

        {/* Pagination */}
        {!isLoading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="Navigasi halaman produk"
            className="mt-8"
          />
        )}
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-surface">
        <section className="bg-gradient-to-br from-surface via-surface-container-low to-primary/5 border-b border-border py-12">
          <div className="container-custom">
            <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-2" />
            <div className="h-6 w-96 animate-pulse rounded-xl bg-surface-container" />
          </div>
        </section>
        <div className="container-custom py-8">
          <div className="h-20 animate-pulse rounded-xl bg-surface-container mb-6" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-surface-container rounded-xl mb-4" />
                <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
                <div className="h-4 bg-surface-container rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </main>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
