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
import { ShoppingCart, Store, Star, Minus, Plus } from "lucide-react";
import ProductReviews from "@/components/customer/ProductReviews";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  florist: { id: string; shopName: string; city: string };
  category: { id: string; name: string };
  averageRating: number;
  totalReviews: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [productRes, reviewsRes] = await Promise.all([
          getProductBySlug(slug),
          Promise.resolve({
            data: { reviews: [], averageRating: 0, totalReviews: 0 },
          }),
        ]);

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          {error || "Produk tidak ditemukan"}
        </h1>
        <a
          href="/"
          className="inline-block rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <span className="text-sm">Gambar tidak tersedia</span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="mb-2 inline-block w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            {product.category.name}
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            {product.name}
          </h1>

          <div className="mb-4 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900">
                {product.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              ({product.totalReviews} ulasan)
            </span>
          </div>

          <div className="mb-6 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">
              Rp {product.price.toLocaleString("id-ID")}
            </span>
            <span className="text-sm text-gray-500">/ tangkai</span>
          </div>

          {/* Info Florist */}
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Store className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {product.florist.shopName}
              </p>
              <p className="text-xs text-gray-500">{product.florist.city}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-gray-900">Deskripsi</h3>
            <p className="text-sm leading-relaxed text-gray-700">
              {product.description}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Stok tersedia:{" "}
              <span className="font-semibold text-gray-900">
                {product.stock} tangkai
              </span>
            </p>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Jumlah
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(1, val), product.stock));
                }}
                className="w-20 rounded-md border border-gray-300 px-3 py-2 text-center text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={() =>
                  setQuantity(Math.min(quantity + 1, product.stock))
                }
                disabled={quantity >= product.stock}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ShoppingCart className="h-5 w-5" />
            {product.stock === 0 ? "Stok Habis" : "Tambah ke Keranjang"}
          </button>
        </div>
      </div>

      <div className="mt-12">
        <ProductReviews
          reviews={reviews}
          averageRating={product.averageRating}
          totalReviews={product.totalReviews}
        />
      </div>
    </div>
  );
}
