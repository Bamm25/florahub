"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";
import ProductReviews from "@/components/customer/ProductReviews";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import {
  getProductBySlug,
  getProductReviews,
  type Review,
} from "@/lib/api/products";
import { useCartStore } from "@/lib/stores/cartStore";
import { formatRupiah } from "@/lib/utils/formatters";

interface RelatedStoreProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string | null;
  category?: { name: string } | null;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  images?: string[];
  tags?: string[];
  florist: {
    id: string;
    shopName: string;
    logo?: string | null;
    city: string;
  };
  category: { id: string; name: string };
  averageRating: number;
  totalReviews: number;
  soldCount?: number;
  relatedProducts?: RelatedStoreProduct[];
}

// Halaman detail produk editorial dengan galeri portrait, kontrol jumlah, toko penjual, ulasan, dan produk lain toko
export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setIsLoading(true);
        const productRes = await getProductBySlug(slug, controller.signal);
        if (controller.signal.aborted) return;

        setError(null);
        setSelectedImage(null);
        setAddedMessage(null);
        setQuantity(1);
        setProduct(productRes.data);

        const actualReviews = await getProductReviews(
          productRes.data.id,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setReviews(actualReviews.data.reviews);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Gagal memuat detail produk",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();
    return () => controller.abort();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
        floristId: product.florist.id,
        floristName: product.florist.shopName,
        slug: product.slug,
      },
      quantity,
    );
    setAddedMessage(`${quantity}x ${product.name} masuk ke keranjang.`);
    setQuantity(1);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setAddedMessage(null);
    }, 5000);
  };

  if (isLoading) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="border-b border-white/10 bg-surface-dark py-4">
          <div className="container-custom">
            <div className="h-4 w-56 animate-pulse rounded bg-white/15" />
          </div>
        </div>
        <div className="container-custom py-8 sm:py-12" role="status">
          <span className="sr-only">Memuat detail produk...</span>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14">
            <div className="aspect-[4/5] animate-pulse rounded-2xl bg-surface-container" />
            <div className="space-y-5">
              <div className="h-6 w-24 animate-pulse rounded-full bg-surface-container" />
              <div className="h-10 w-3/4 animate-pulse rounded-xl bg-surface-container" />
              <div className="h-8 w-1/3 animate-pulse rounded-xl bg-surface-container" />
              <div className="h-48 animate-pulse rounded-2xl bg-surface-container" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom py-20 sm:py-28">
          <div
            role="alert"
            className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 sm:p-10"
          >
            <p className="text-xs font-medium tracking-[0.04em] text-muted-foreground">
              Tidak tersedia
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {error || "Produk tidak ditemukan"}
            </h1>
            <p className="mt-2.5 text-sm leading-6 text-muted-foreground sm:text-base">
              Produk mungkin sudah habis atau tidak lagi aktif.
            </p>
            <Link href="/products" className="btn-primary mt-7 inline-flex">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Lihat Katalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const galleryImages = Array.from(
    new Set(
      [product.image, ...(product.images ?? [])].filter(
        (src): src is string => Boolean(src && src.trim().length > 0),
      ),
    ),
  );
  const activeImage =
    selectedImage && galleryImages.includes(selectedImage)
      ? selectedImage
      : galleryImages[0] ?? null;
  const activeIndex = activeImage ? Math.max(0, galleryImages.indexOf(activeImage)) : 0;

  const isOutOfStock = product.stock === 0;
  const isLowStock =
    product.stock > 0 && product.stock < PRODUCT_LOW_STOCK_THRESHOLD;
  const soldCount = product.soldCount ?? 0;
  const relatedProducts = product.relatedProducts ?? [];

  const handleStepImage = (direction: -1 | 1) => {
    if (galleryImages.length <= 1) return;
    const nextIndex =
      (activeIndex + direction + galleryImages.length) % galleryImages.length;
    setSelectedImage(galleryImages[nextIndex]);
  };

  return (
    <main className="min-h-dvh bg-background">
      {/* Compact Dark Breadcrumb Strip */}
      <div className="border-b border-white/10 bg-surface-dark text-white">
        <div className="container-custom py-2.5">
          <nav aria-label="Breadcrumb" className="text-xs sm:text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-white/65">
              <li>
                <Link
                  href="/products"
                  className="inline-flex min-h-10 items-center gap-1.5 font-medium text-kicker transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Katalog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>{product.category.name}</li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                className="max-w-[16rem] truncate font-medium text-white sm:max-w-md"
              >
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main 2-Column Editorial Product Showcase */}
      <section className="py-8 sm:py-12">
        <div className="container-custom grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 xl:gap-16">
          {/* Portrait Gallery Column */}
          <div className="space-y-4">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-surface-container">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Gambar tidak tersedia
                </div>
              )}

              {(isOutOfStock || isLowStock) && (
                <div className="absolute right-4 top-4">
                  <span className="inline-flex items-center rounded-full border border-border bg-surface/95 px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
                    {isOutOfStock ? "Stok habis" : `Sisa ${product.stock}`}
                  </span>
                </div>
              )}

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStepImage(-1)}
                    aria-label="Foto sebelumnya"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-surface-dark/75 text-white backdrop-blur-xs transition-colors hover:bg-surface-dark"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepImage(1)}
                    aria-label="Foto berikutnya"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-surface-dark/75 text-white backdrop-blur-xs transition-colors hover:bg-surface-dark"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="absolute bottom-3.5 right-3.5 rounded-full border border-white/15 bg-surface-dark/80 px-3 py-1 text-xs font-medium tabular-nums text-white">
                    {activeIndex + 1} / {galleryImages.length}
                  </span>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div
                className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 touch-pan-x"
                aria-label="Galeri foto produk"
              >
                {galleryImages.map((img, idx) => {
                  const isCurrent = img === activeImage;
                  return (
                    <button
                      type="button"
                      key={img}
                      onClick={() => setSelectedImage(img)}
                      aria-label={`Lihat foto ${idx + 1}`}
                      aria-pressed={isCurrent}
                      className={`relative aspect-[4/5] w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-colors sm:w-20 touch-manipulation ${
                        isCurrent
                          ? "border-primary"
                          : "border-border hover:border-outline"
                      }`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Editorial Info & Purchase Card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
              {product.category.name}
            </span>

            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums">
              {product.totalReviews > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <Star
                      className="h-4 w-4 fill-warning text-warning"
                      aria-hidden="true"
                    />
                    {product.averageRating.toFixed(1)}
                  </span>
                  <a
                    href="#ulasan"
                    className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {product.totalReviews} ulasan
                  </a>
                </>
              ) : (
                <a
                  href="#ulasan"
                  className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Belum ada ulasan
                </a>
              )}

              {soldCount > 0 && (
                <>
                  <span className="text-border" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-semibold text-primary">
                    {soldCount} terjual
                  </span>
                </>
              )}
            </div>

            {/* Purchase Panel */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {formatRupiah(product.price)}
                </p>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isOutOfStock ? "text-error" : "text-success"
                  }`}
                >
                  {isOutOfStock ? "Stok habis" : `Stok ${product.stock}`}
                </span>
              </div>

              {!isOutOfStock && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <label
                      htmlFor="product-quantity"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Jumlah
                    </label>
                    <div className="flex items-center rounded-xl border border-border bg-surface p-0.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        aria-label="Kurangi jumlah"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <input
                        id="product-quantity"
                        type="number"
                        min={1}
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          if (!Number.isNaN(val)) {
                            setQuantity(
                              Math.min(Math.max(1, val), product.stock),
                            );
                          }
                        }}
                        className="h-11 w-14 border-x border-border/60 bg-transparent text-center text-base font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(Math.min(quantity + 1, product.stock))
                        }
                        disabled={quantity >= product.stock}
                        aria-label="Tambah jumlah"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {quantity > 1 && (
                    <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                      <span>Subtotal ({quantity} item)</span>
                      <span className="font-semibold text-foreground">
                        {formatRupiah(product.price * quantity)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="btn-primary mt-2 h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
              </button>

              <div aria-live="polite">
                {addedMessage && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-container/60 px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <Check
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      {addedMessage}
                    </span>
                    <Link
                      href="/cart"
                      className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Lihat keranjang
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Florist Store Card */}
            <Link
              href={`/stores/${product.florist.id}`}
              className="m-card group mt-5 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
              aria-label={`Lihat toko ${product.florist.shopName}`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-container-low">
                  {product.florist.logo ? (
                    <Image
                      src={product.florist.logo}
                      alt={product.florist.shopName}
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  ) : (
                    <Store
                      className="h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-foreground transition-colors group-hover:text-primary">
                    {product.florist.shopName}
                  </p>
                  {product.florist.city && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{product.florist.city}</span>
                    </p>
                  )}
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary sm:text-sm">
                Lihat toko
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>

            {/* Description & Tags */}
            {product.description && (
              <div className="mt-7 border-t border-border pt-6">
                <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Deskripsi
                </h2>
                <p className="mt-2.5 whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
                  {product.description}
                </p>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="mt-5">
                <h3 className="sr-only">Tag produk</h3>
                <ul className="flex flex-wrap gap-2">
                  {product.tags.map((tag, idx) => (
                    <li
                      key={`${tag}-${idx}`}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section
        id="ulasan"
        className="scroll-mt-24 border-t border-border bg-surface-container-low/40 py-14 sm:py-20"
      >
        <div className="container-custom">
          <ProductReviews
            productId={product.id}
            reviews={reviews}
            averageRating={product.averageRating}
            totalReviews={product.totalReviews}
          />
        </div>
      </section>

      {/* Same-Store Related Products */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-border bg-background py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Lainnya dari{" "}
                <span className="font-display font-normal italic text-primary">
                  {product.florist.shopName}
                </span>
              </h2>
              <Link
                href={`/stores/${product.florist.id}`}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Lihat toko
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="@container">
              <div className="grid grid-cols-1 gap-6 @sm:grid-cols-2 @lg:grid-cols-4">
                {relatedProducts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    className="m-card group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-container">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="m-zoom object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Tanpa gambar
                        </div>
                      )}

                      {item.category?.name && (
                        <div className="absolute left-3 top-3">
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur-xs">
                            {item.category.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                      <h3 className="line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-primary">
                        {item.name}
                      </h3>
                      <div className="mt-3 flex items-center justify-between gap-2 text-sm tabular-nums">
                        <span className="font-bold text-foreground">
                          {formatRupiah(item.price)}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            item.stock > 0 ? "text-success" : "text-error"
                          }`}
                        >
                          {item.stock > 0 ? `Stok ${item.stock}` : "Habis"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
