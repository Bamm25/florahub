"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  getProductBySlug,
  getProductReviews,
  type Review,
} from "@/lib/api/products";
import { useCartStore } from "@/lib/stores/cartStore";
import {
  ShoppingCart,
  Star,
  Minus,
  Plus,
  ArrowLeft,
  Check,
  MapPin,
} from "lucide-react";
import ProductReviews from "@/components/customer/ProductReviews";
import Link from "next/link";

// Interface untuk data detail produk dengan relasi florist dan category
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
  florist: { id: string; shopName: string; city: string };
  category: { id: string; name: string };
  averageRating: number;
  totalReviews: number;
}

// Halaman detail produk dengan gallery, info lengkap, dan reviews
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

  const addItem = useCartStore((state) => state.addItem);

  // Fetch detail produk dan reviews berdasarkan slug
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const productRes = await getProductBySlug(slug);

        setProduct(productRes.data);

        const actualReviews = await getProductReviews(productRes.data.id);
        setReviews(actualReviews.data.reviews);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat detail produk",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // Handle tambah produk ke cart dengan quantity yang dipilih
  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
        floristId: product.florist.id,
      },
      quantity,
    );
    setAddedMessage(`${quantity}x ${product.name} ditambahkan ke keranjang.`);
    setQuantity(1);
  };

  // Render loading skeleton untuk image dan info produk
  if (isLoading) {
    return (
      <div className="container-custom py-10 sm:py-14" role="status">
        <span className="sr-only">Memuat detail produk...</span>
        <div className="mb-8 h-4 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
          <div className="space-y-5">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted" />
            <div className="h-8 w-1/3 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Render error state jika produk tidak ditemukan
  if (error || !product) {
    return (
      <div className="container-custom py-20 sm:py-28">
        <div role="alert" className="mx-auto max-w-xl border-t border-border pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Produk tidak tersedia
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            {error || "Produk tidak ditemukan"}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Produk yang Anda cari mungkin sudah tidak tersedia atau telah dihapus.
          </p>
          <Link href="/products" className="btn-primary mt-8">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;
  const activeImage = selectedImage || product.image;
  const hasGallery = Boolean(product.images && product.images.length > 0);

  return (
    <div className="pb-16 sm:pb-24">
      <div className="container-custom pt-8 sm:pt-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/products" className="inline-flex min-h-11 items-center gap-2 font-medium hover:text-primary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Katalog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>{product.category.name}</li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-[16rem] truncate font-medium text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Gambar tidak tersedia
                </div>
              )}
            </div>

            {/* Thumbnail Gallery - Horizontal Scroll on Mobile */}
            {hasGallery && (
              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 touch-pan-x" aria-label="Galeri foto produk">
                {product.image && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(product.image)}
                    aria-label="Lihat foto utama"
                    aria-pressed={selectedImage === product.image || !selectedImage}
                    className={`relative h-20 w-20 flex-shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-colors touch-manipulation ${
                      selectedImage === product.image || !selectedImage
                        ? "border-foreground"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                )}
                {product.images!.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    aria-label={`Lihat foto ${idx + 2}`}
                    aria-pressed={selectedImage === img}
                    className={`relative h-20 w-20 flex-shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-colors touch-manipulation ${
                      selectedImage === img
                        ? "border-foreground"
                        : "border-transparent hover:border-border"
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
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {product.category.name}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] text-foreground [text-wrap:balance] sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                {product.averageRating.toFixed(1)}
              </span>
              <a href="#ulasan" className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                {product.totalReviews} ulasan
              </a>
            </div>

            <p className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Rp {product.price.toLocaleString("id-ID")}
            </p>

            {/* Purchase panel */}
            <div className="mt-8 rounded-2xl border border-border p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Ketersediaan</span>
                {isOutOfStock ? (
                  <span className="text-sm font-semibold text-error">Stok habis</span>
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    Stok tersedia: {product.stock}
                  </span>
                )}
              </div>

              {!isOutOfStock && (
                <div className="flex items-center justify-between gap-4 py-4">
                  <label htmlFor="product-quantity" className="text-sm text-muted-foreground">
                    Jumlah
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Kurangi jumlah"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <input
                      id="product-quantity"
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setQuantity(Math.min(Math.max(1, val), product.stock));
                        }
                      }}
                      className="h-11 w-16 rounded-xl border border-border bg-input text-center text-base font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(Math.min(quantity + 1, product.stock))
                      }
                      disabled={quantity >= product.stock}
                      aria-label="Tambah jumlah"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
              </button>

              <div aria-live="polite">
                {addedMessage && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      {addedMessage}
                    </span>
                    <Link href="/cart" className="font-semibold text-primary underline-offset-4 hover:underline">
                      Lihat keranjang
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Florist Info */}
            <Link
              href={`/stores/${product.florist.id}`}
              className="group mt-6 flex items-center justify-between gap-4 border-y border-border py-5 transition-colors"
              aria-label={`Lihat toko ${product.florist.shopName}`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dijual oleh</p>
                <p className="mt-1 text-base font-semibold text-foreground group-hover:text-primary">{product.florist.shopName}</p>
                {product.florist.city && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {product.florist.city}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold text-primary">Kunjungi toko <span aria-hidden="true">→</span></span>
            </Link>

            {/* Description */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-foreground">Deskripsi produk</h2>
              <p className="mt-3 whitespace-pre-line text-base leading-7 text-muted-foreground">
                {product.description}
              </p>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="mt-6">
                <h3 className="sr-only">Tag produk</h3>
                <ul className="flex flex-wrap gap-2">
                  {product.tags.map((tag, idx) => (
                    <li
                      key={idx}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section id="ulasan" className="container-custom mt-16 scroll-mt-24 sm:mt-24">
        <ProductReviews
          productId={product.id}
          reviews={reviews}
          averageRating={product.averageRating}
          totalReviews={product.totalReviews}
        />
      </section>
    </div>
  );
}
