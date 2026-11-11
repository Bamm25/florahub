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
import { ShoppingCart, Store, Star, Minus, Plus, ArrowLeft, Tag } from "lucide-react";
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
    alert(`${quantity}x ${product.name} ditambahkan ke keranjang!`);
    setQuantity(1);
  };

  // Render loading skeleton untuk image dan info produk
  if (isLoading) {
    return (
      <div className="container-custom section-spacing">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-surface-container" />
          <div className="space-y-6">
            <div className="h-10 w-3/4 animate-pulse rounded-xl bg-surface-container" />
            <div className="h-8 w-1/2 animate-pulse rounded-xl bg-surface-container" />
            <div className="h-32 animate-pulse rounded-xl bg-surface-container" />
          </div>
        </div>
      </div>
    );
  }

  // Render error state jika produk tidak ditemukan
  if (error || !product) {
    return (
      <div className="container-custom section-spacing">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-error/10 mb-6">
            <ShoppingCart className="h-10 w-10 text-error" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {error || "Produk tidak ditemukan"}
          </h1>
          <p className="text-base text-muted-foreground mb-8">
            Produk yang Anda cari mungkin sudah tidak tersedia atau telah dihapus.
          </p>
          <Link href="/" className="btn-primary">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom section-spacing">
      {/* Back Button */}
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Katalog
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Product Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-container-low shadow-md">
            {(selectedImage || product.image) ? (
              <Image
                src={selectedImage || product.image || ""}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-16 w-16 mb-3 opacity-40" />
                  <span className="text-sm">Gambar tidak tersedia</span>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery - Horizontal Scroll on Mobile */}
          {product.images && product.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory touch-pan-x">
              {/* Main image as first thumbnail */}
              {product.image && (
                <button
                  onClick={() => setSelectedImage(product.image)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all snap-start touch-manipulation ${
                    (selectedImage === product.image || !selectedImage)
                      ? "border-primary shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Image
                    src={product.image}
                    alt={`${product.name} thumbnail`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              )}
              {/* Additional images */}
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all snap-start touch-manipulation ${
                    selectedImage === img
                      ? "border-primary shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} view ${idx + 2}`}
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
        <div className="flex flex-col">
          <div className="badge bg-primary/10 text-primary mb-4 w-fit">
            {product.category.name}
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            {product.name}
          </h1>

          {/* Rating & Reviews */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 fill-warning text-warning" />
              <span className="text-xl font-bold text-foreground">
                {product.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-base text-muted-foreground">
              ({product.totalReviews} ulasan)
            </span>
          </div>

          {/* Price */}
          <div className="mb-6 rounded-xl bg-surface-container-low p-6 border border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">Harga</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">
                Rp {product.price.toLocaleString("id-ID")}
              </span>
              <span className="text-base text-muted-foreground">/ tangkai</span>
            </div>
          </div>

          {/* Florist Info */}
          <Link href={`/stores/${product.florist.id}`} className="mb-6 flex items-center gap-3 rounded-xl bg-surface-container p-4 border border-border transition-colors hover:border-primary" aria-label={`Lihat toko ${product.florist.shopName}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dijual oleh</p>
              <p className="text-base font-bold text-foreground">{product.florist.shopName}</p>
              <p className="text-sm text-muted-foreground">{product.florist.city}</p>
            </div>
          </Link>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3">Deskripsi Produk</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-surface-container text-foreground border border-border hover:bg-surface-container-high transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Ketersediaan Stok</p>
            {product.stock > 0 ? (
              <span className="badge bg-success/10 text-success">
                Tersedia ({product.stock} tangkai)
              </span>
            ) : (
              <span className="badge bg-error/10 text-error">
                Stok Habis
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground mb-3 block">
                Jumlah
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <input
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
                  className="input-field w-24 text-center text-xl font-bold"
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(quantity + 1, product.stock))
                  }
                  disabled={quantity >= product.stock}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="btn-primary w-full h-14 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="mr-2 h-6 w-6" />
            {product.stock === 0 ? "Stok Habis" : "Tambah ke Keranjang"}
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <ProductReviews
          productId={product.id}
          reviews={reviews}
          averageRating={product.averageRating}
          totalReviews={product.totalReviews}
        />
      </div>
    </div>
  );
}
