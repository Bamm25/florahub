"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import ProductGrid from "@/components/customer/ProductGrid";
import {
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Pagination,
  SearchInput,
} from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getCustomerProducts } from "@/lib/api/customer";
import { getCategories, type CategoryItem } from "@/lib/api/products";
import type { Product } from "@/types";

const SORT_OPTIONS = [
  { value: "best-selling", label: "Terlaris" },
  { value: "newest", label: "Terbaru" },
  { value: "price-asc", label: "Harga Terendah" },
  { value: "price-desc", label: "Harga Tertinggi" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "name-desc", label: "Nama Z-A" },
];

// Component utama halaman katalog produk dengan kategori pill rail, filter siap kirim, dan sorotan editorial
function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State data produk dan status pemuatan
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // State filter pencarian, kategori, ketersediaan, dan pengurutan
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "all",
  );
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get("inStock") === "true",
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "newest",
  );

  // State navigasi nomor halaman dan total hasil
  const [currentPage, setCurrentPage] = useState(
    Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1),
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 12;

  // Fetch daftar kategori untuk pill rail
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

  // Fetch produk dengan filter search, kategori, siap kirim, dan sorting
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
            inStock: inStockOnly || undefined,
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
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat produk",
        );
        setProducts([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchProducts();
    return () => controller.abort();
  }, [searchQuery, selectedCategory, inStockOnly, sortBy, currentPage, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Update URL query params saat filter berubah untuk shareable links
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (inStockOnly) params.set("inStock", "true");
    if (sortBy !== "newest") params.set("sortBy", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    router.replace(`/products${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [searchQuery, selectedCategory, inStockOnly, sortBy, currentPage, router]);

  const clearFilter = (filterType: "search" | "category" | "inStock") => {
    setCurrentPage(1);
    if (filterType === "search") setSearchQuery("");
    if (filterType === "category") setSelectedCategory("all");
    if (filterType === "inStock") setInStockOnly(false);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setInStockOnly(false);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedCategory !== "all" || inStockOnly,
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleToggleInStock = () => {
    setInStockOnly((prev) => !prev);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string | null) => {
    setSortBy(value || "newest");
    setCurrentPage(1);
  };

  const startResult =
    totalProducts === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);

  return (
    <main className="min-h-dvh bg-background">
      {/* Full-Bleed Dark Editorial Header */}
      <section className="border-b border-white/10 bg-surface-dark py-12 text-white sm:py-16">
        <div className="container-custom grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-end lg:gap-12">
          <div>
            <p className="mb-3 text-xs font-medium tracking-[0.04em] text-kicker">
              Katalog
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Temukan rangkaian{" "}
              <span className="font-display font-normal italic text-kicker">
                yang pas
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70">
              Pilihan bunga segar dari berbagai toko florist lokal.
            </p>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
            <div className="grid grid-cols-2 gap-4 border-b border-white/12 pb-4">
              <div>
                <p className="text-xs text-white/60">Produk</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {isLoading ? "…" : totalProducts}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60">Kategori</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {categories.length > 0 ? categories.length : "—"}
                </p>
              </div>
            </div>
            <Link
              href="/stores"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-kicker transition-colors hover:text-white"
            >
              Lihat daftar toko
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 sm:py-10">
        {/* Category Pill Rail + Discovery Controls */}
        <div className="mb-6 space-y-5 border-b border-border pb-6">
          {categories.length > 0 && (
            <div
              role="group"
              aria-label="Filter kategori bunga"
              className="flex items-center gap-2 overflow-x-auto pb-1"
            >
              <button
                type="button"
                onClick={() => handleCategoryChange("all")}
                aria-pressed={selectedCategory === "all"}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors sm:text-sm ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:border-outline"
                }`}
              >
                Semua
              </button>
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryChange(category.id)}
                    aria-pressed={isSelected}
                    className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors sm:text-sm ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:border-outline"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_220px]">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari bunga atau buket..."
              className="w-full"
            />

            <button
              type="button"
              onClick={handleToggleInStock}
              aria-pressed={inStockOnly}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                inStockOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-outline"
              }`}
            >
              {inStockOnly && <Check className="h-4 w-4" aria-hidden="true" />}
              Siap Kirim
            </button>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger aria-label="Urutkan produk" className="min-h-11">
                <span className="truncate text-sm">
                  Urutkan:{" "}
                  {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ||
                    "Terbaru"}
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

        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Filter aktif:
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => clearFilter("search")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:text-sm"
              >
                Pencarian: &ldquo;{searchQuery}&rdquo;
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {selectedCategory !== "all" && (
              <button
                type="button"
                onClick={() => clearFilter("category")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:text-sm"
              >
                {categories.find((c) => c.id === selectedCategory)?.name ||
                  "Kategori"}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {inStockOnly && (
              <button
                type="button"
                onClick={() => clearFilter("inStock")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:text-sm"
              >
                Stok siap kirim
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-2 text-sm font-medium text-error hover:underline"
            >
              Hapus Semua
            </button>
          </div>
        )}

        {/* Result Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              "Memuat produk..."
            ) : totalProducts === 0 ? (
              "Tidak ada produk ditemukan"
            ) : (
              <>
                Menampilkan{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {startResult}-{endResult}
                </span>{" "}
                dari{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {totalProducts}
                </span>{" "}
                produk
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
                title="Produk tidak ditemukan"
                description="Coba kata kunci atau filter lain."
                action={{
                  label: "Reset Filter",
                  onClick: clearAllFilters,
                }}
              />
            ) : (
              <ProductGrid
                products={products}
                featuredFirst={!hasActiveFilters && currentPage === 1}
              />
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
            className="mt-10"
          />
        )}
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh bg-background">
          <section className="border-b border-white/10 bg-surface-dark py-12 sm:py-16">
            <div className="container-custom">
              <div className="mb-3 h-4 w-36 animate-pulse rounded bg-white/10" />
              <div className="mb-3 h-11 w-72 animate-pulse rounded-xl bg-white/10" />
              <div className="h-5 w-96 max-w-full animate-pulse rounded-xl bg-white/10" />
            </div>
          </section>
          <div className="container-custom py-8">
            <div className="mb-6 h-20 animate-pulse rounded-xl bg-surface-container" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="mb-4 aspect-[4/5] rounded-2xl bg-surface-container" />
                  <div className="mb-2 h-4 w-3/4 rounded bg-surface-container" />
                  <div className="h-4 w-1/2 rounded bg-surface-container" />
                </div>
              ))}
            </div>
          </div>
        </main>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
