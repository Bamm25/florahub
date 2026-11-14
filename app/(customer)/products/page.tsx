"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductGrid from "@/components/customer/ProductGrid";
import SearchInput from "@/components/ui/SearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";

// Interface untuk data kategori produk di filter
interface Category {
  id: string;
  name: string;
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        if (data.success) {
          setCategories(data.data.items || []);
        }
      } catch (err) {

      }
    }
    fetchCategories();
  }, []);

  // Fetch produk dengan filter search, kategori, dan sorting
  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", PRODUCTS_PER_PAGE.toString());

        if (searchQuery) params.set("search", searchQuery);
        if (selectedCategory && selectedCategory !== "all") params.set("categoryId", selectedCategory);
        if (sortBy) params.set("sortBy", sortBy);

        const response = await fetch(`/api/customer/products?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setProducts(data.data.items || []);
          setTotalProducts(data.data.pagination.total);
          setTotalPages(data.data.pagination.totalPages);
        } else {
          throw new Error(data.message || "Gagal memuat produk");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat produk");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [searchQuery, selectedCategory, sortBy, currentPage]);

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
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-surface-container rounded-xl mb-4" />
                <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
                <div className="h-4 bg-surface-container rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-error/10 mb-4">
              <X className="h-8 w-8 text-error" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Gagal Memuat Produk</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Products Grid or Empty State */}
        {!isLoading && !error && (
          <>
            {totalProducts === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-bold text-foreground mb-2">Belum ada produk yang cocok</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Coba ubah atau hapus beberapa filter untuk melihat lebih banyak produk
                </p>
                <button
                  onClick={clearAllFilters}
                  className="btn-secondary"
                >
                  Hapus Semua Filter
                </button>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </>
        )}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Halaman sebelumnya"
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-border bg-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                // Tampilkan nomor halaman awal, akhir, dan di sekitar halaman aktif
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex items-center justify-center h-10 w-10 rounded-lg border transition-colors ${
                        currentPage === page
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-surface hover:bg-surface-container"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Halaman berikutnya"
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-border bg-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
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
