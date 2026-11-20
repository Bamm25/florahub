"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { SearchInput } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { StoreShowcaseMetrics } from "@/lib/public-store-metrics";
import { formatRupiah } from "@/lib/utils/formatters";

export interface PublicStoreDirectoryItem {
  id: string;
  shopName: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  city: string | null;
  province: string | null;
  productCount: number;
  metrics: StoreShowcaseMetrics;
}

const STORE_SORT_OPTIONS = [
  { value: "popular", label: "Terpopuler" },
  { value: "products", label: "Produk Terbanyak" },
  { value: "name", label: "Nama A–Z" },
];

interface StoresDirectoryClientProps {
  stores: PublicStoreDirectoryItem[];
}

export default function StoresDirectoryClient({
  stores,
}: StoresDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    for (const store of stores) {
      if (store.city) citySet.add(store.city);
    }
    return Array.from(citySet).toSorted((a, b) => a.localeCompare(b));
  }, [stores]);

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = stores.filter((store) => {
      if (selectedCity !== "all" && store.city !== selectedCity) {
        return false;
      }
      if (!q) return true;

      const haystacks = [
        store.shopName,
        store.city || "",
        store.province || "",
        store.description || "",
        ...store.metrics.categories,
      ];
      return haystacks.some((text) => text.toLowerCase().includes(q));
    });

    return filtered.toSorted((a, b) => {
      switch (sortBy) {
        case "products":
          return (
            b.productCount - a.productCount ||
            b.metrics.totalSold - a.metrics.totalSold
          );
        case "name":
          return a.shopName.localeCompare(b.shopName);
        case "popular":
        default:
          return (
            b.metrics.totalSold - a.metrics.totalSold ||
            (b.metrics.averageRating ?? 0) - (a.metrics.averageRating ?? 0) ||
            b.productCount - a.productCount
          );
      }
    });
  }, [stores, searchQuery, selectedCity, sortBy]);

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCity !== "all");
  const showSpotlight = !hasActiveFilters && filteredStores.length >= 3;
  const leadStore = showSpotlight ? filteredStores[0] : null;
  const gridStores = showSpotlight ? filteredStores.slice(1) : filteredStores;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCity("all");
    setSortBy("popular");
  };

  if (stores.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 p-12 text-center">
        <h3 className="text-lg font-bold text-foreground">
          Belum ada toko
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Kunjungi katalog untuk melihat pilihan bunga.
        </p>
        <Link href="/products" className="btn-primary mt-6 inline-flex">
          Lihat Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Discovery Bar */}
      <div className="space-y-4 border-b border-border pb-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari toko atau kota..."
            className="w-full"
          />

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value || "popular")}
          >
            <SelectTrigger aria-label="Urutkan toko florist" className="min-h-11">
              <span className="truncate text-sm">
                Urutkan:{" "}
                {STORE_SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ||
                  "Terpopuler"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {STORE_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cities.length > 0 && (
          <div
            role="group"
            aria-label="Filter kota studio"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            <button
              type="button"
              onClick={() => setSelectedCity("all")}
              aria-pressed={selectedCity === "all"}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors sm:text-sm ${
                selectedCity === "all"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:border-outline"
              }`}
            >
              Semua Kota
            </button>
            {cities.map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-colors sm:text-sm ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground hover:border-outline"
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty Search Results */}
      {filteredStores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <h3 className="text-lg font-bold text-foreground">
            Toko tidak ditemukan
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Coba kata kunci atau pilih kota lain.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="btn-secondary mt-6 inline-flex"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Studio Sorotan (Wide Spotlight) */}
          {leadStore && (
            <Link
              href={`/stores/${leadStore.id}`}
              className="m-card group grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-12"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-dark lg:col-span-6 lg:aspect-auto lg:min-h-[340px]">
                {leadStore.banner || leadStore.metrics.previewImages[0] ? (
                  <Image
                    src={leadStore.banner || leadStore.metrics.previewImages[0]}
                    alt={`Etalase ${leadStore.shopName}`}
                    fill
                    className="m-zoom object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center bg-surface-dark text-white/60">
                    <span className="font-display text-5xl italic text-kicker">
                      {leadStore.shopName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="absolute left-4 top-4">
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-surface-dark/90 px-3.5 py-1.5 text-xs font-semibold text-kicker">
                    Toko Pilihan
                  </span>
                </div>

                {leadStore.metrics.previewImages.length >= 2 && (
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    {leadStore.metrics.previewImages.slice(0, 3).map((img, i) => (
                      <div
                        key={`${leadStore.id}-spot-${i}`}
                        className="relative h-12 w-12 overflow-hidden rounded-lg border-2 border-white/80 bg-surface"
                      >
                        <Image
                          src={img}
                          alt={`Karya ${leadStore.shopName}`}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-6">
                <div>
                  <div className="flex items-start gap-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container-low">
                      {leadStore.logo ? (
                        <Image
                          src={leadStore.logo}
                          alt={leadStore.shopName}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-display text-lg italic text-primary">
                          {leadStore.shopName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl">
                        {leadStore.shopName}
                      </h3>
                      {(leadStore.city || leadStore.province) && (
                        <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                          {[leadStore.city, leadStore.province]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {leadStore.description && (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {leadStore.description}
                    </p>
                  )}

                  {leadStore.metrics.categories.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {leadStore.metrics.categories.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full border border-border bg-surface-container-low px-3 py-1 text-xs font-medium text-foreground"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                  <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums sm:text-sm">
                    <span className="font-semibold text-foreground">
                      {leadStore.productCount} produk
                    </span>
                    {leadStore.metrics.minPrice !== null && (
                      <span className="font-semibold text-primary">
                        Mulai {formatRupiah(leadStore.metrics.minPrice)}
                      </span>
                    )}
                    {leadStore.metrics.totalSold > 0 && (
                      <span className="font-medium text-muted-foreground">
                        {leadStore.metrics.totalSold} terjual
                      </span>
                    )}
                    {leadStore.metrics.averageRating !== null && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                        {leadStore.metrics.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                    Lihat Toko
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Direktori Grid Kartu Atelier */}
          {gridStores.length > 0 && (
            <div className="grid grid-cols-1 gap-6 @sm:grid-cols-2 @lg:grid-cols-3">
              {gridStores.map((store) => {
                const coverImage =
                  store.banner || store.metrics.previewImages[0] || null;
                const monogram = store.shopName.slice(0, 2).toUpperCase();

                return (
                  <Link
                    key={store.id}
                    href={`/stores/${store.id}`}
                    className="m-card group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div>
                      {/* Banner / Product Visual Cover */}
                      <div className="relative h-48 w-full overflow-hidden bg-surface-dark">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={`Etalase ${store.shopName}`}
                            fill
                            className="m-zoom object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-surface-dark">
                            <span className="font-display text-4xl italic text-kicker">
                              {monogram}
                            </span>
                          </div>
                        )}

                        {store.city && (
                          <div className="absolute right-3 top-3">
                            <span className="inline-flex items-center rounded-full border border-white/15 bg-surface-dark/85 px-3 py-1 text-xs font-medium text-white backdrop-blur-xs">
                              {store.city}
                            </span>
                          </div>
                        )}

                        {(store.metrics.totalSold > 0 ||
                          store.metrics.averageRating !== null) && (
                          <div className="absolute left-3 top-3">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-surface-dark/85 px-2.5 py-1 text-xs font-semibold tabular-nums text-kicker backdrop-blur-xs">
                              {store.metrics.totalSold > 0
                                ? `${store.metrics.totalSold} terjual`
                                : `★ ${store.metrics.averageRating?.toFixed(1)}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Identity + Overlapping Studio Logo */}
                      <div className="px-6 pb-5">
                        <div className="relative -mt-7 mb-3 flex items-end justify-between gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-card bg-surface">
                            {store.logo ? (
                              <Image
                                src={store.logo}
                                alt={store.shopName}
                                fill
                                className="object-cover"
                                sizes="56px"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-surface-container-low font-display text-lg italic text-primary">
                                {monogram}
                              </div>
                            )}
                          </div>

                          {store.metrics.averageRating !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-container-low px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                              <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                              {store.metrics.averageRating.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <h3 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                          {store.shopName}
                        </h3>

                        {(store.city || store.province) && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[store.city, store.province].filter(Boolean).join(", ")}
                          </p>
                        )}

                        {store.description && (
                          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {store.description}
                          </p>
                        )}

                        {/* Mini Bouquet Portfolio Strip */}
                        {store.metrics.previewImages.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {store.metrics.previewImages.map((img, i) => (
                              <div
                                key={`${store.id}-thumb-${i}`}
                                className="relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-surface-container-low"
                              >
                                <Image
                                  src={img}
                                  alt={`Pratinjau rangkaian ${store.shopName}`}
                                  fill
                                  className="object-cover"
                                  sizes="96px"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Specialty Category Chips */}
                        {store.metrics.categories.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {store.metrics.categories.map((cat) => (
                              <span
                                key={cat}
                                className="rounded-full border border-border bg-surface-container-low px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4 text-xs tabular-nums">
                      <div className="min-w-0">
                        {store.metrics.minPrice !== null ? (
                          <p className="truncate font-semibold text-foreground">
                            Mulai {formatRupiah(store.metrics.minPrice)}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {store.productCount} produk
                            </span>
                          </p>
                        ) : (
                          <span className="font-medium text-foreground">
                            {store.productCount} produk
                          </span>
                        )}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                        Lihat Toko
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
