import type {
  Product,
  ApiResponse,
  PaginatedResponse,
  ProductFormData,
} from "@/types";
import { fetchJson } from "./client";

// Interface respons API untuk rincian data produk berdasarkan slug
interface ProductDetailResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    image: string | null;
    categoryId: string;
    floristId: string;
    createdAt: string;
    florist: {
      id: string;
      shopName: string;
      city: string;
    };
    category: {
      id: string;
      name: string;
    };
    averageRating: number;
    totalReviews: number;
  };
}

// Interface data ulasan dan penilaian produk dari pengguna
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string;
  };
}

// Interface masukan data untuk membuat ulasan produk baru
export interface CreateReviewInput {
  rating: number;
  comment: string;
  images?: string[];
}

// Interface respons API setelah pengiriman ulasan produk
export interface CreateReviewResponse {
  success: boolean;
  message: string;
  data: {
    review: Review;
  };
}

// Fungsi pembantu untuk menentukan URL dasar API sesuai lingkungan aplikasi
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// Fungsi untuk mengambil daftar produk dengan filter pencarian dan paginasi
export async function getProducts(
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  },
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.search) queryParams.set("search", params.search);
  if (params?.categoryId) queryParams.set("categoryId", params.categoryId);

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/products?${queryParams.toString()}`;
  return fetchJson<PaginatedResponse<Product>>(url, {
    method: "GET",
    cache: "no-store",
    signal,
  });
}

// Fungsi untuk mengambil detail data produk berdasarkan ID
export async function getProductById(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResponse<Product>> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/products/${encodeURIComponent(id)}`;
  return fetchJson<ApiResponse<Product>>(url, {
    method: "GET",
    cache: "no-store",
    signal,
  });
}

// Fungsi untuk menambahkan produk baru florist melalui API
export async function createProduct(
  data: ProductFormData,
): Promise<ApiResponse<Product>> {
  const baseUrl = getBaseUrl();
  return fetchJson<ApiResponse<Product>>(`${baseUrl}/api/florist/products`, {
    method: "POST",
    body: JSON.stringify(data),
    credentials: "include",
  });
}

// Fungsi untuk memperbarui data produk florist berdasarkan ID
export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>,
): Promise<ApiResponse<Product>> {
  const baseUrl = getBaseUrl();
  return fetchJson<ApiResponse<Product>>(
    `${baseUrl}/api/florist/products/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
      credentials: "include",
    },
  );
}

// Fungsi untuk menghapus produk florist berdasarkan ID
export async function deleteProduct(
  id: string,
): Promise<ApiResponse<{ id: string }>> {
  const baseUrl = getBaseUrl();
  return fetchJson<ApiResponse<{ id: string }>>(
    `${baseUrl}/api/florist/products/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
}

// Fungsi untuk mengambil data rincian produk berdasarkan slug
export async function getProductBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetailResponse> {
  return fetchJson<ProductDetailResponse>(
    `/api/products?slug=${encodeURIComponent(slug)}`,
    {
      method: "GET",
      cache: "no-store",
      signal,
    },
  );
}

// Fungsi untuk mengambil daftar ulasan dan statistik rating produk
export async function getProductReviews(
  productId: string,
  signal?: AbortSignal,
) {
  const result = await fetchJson<{
    success: boolean;
    data: {
      items: Review[];
      stats: { averageRating: number; totalReview: number };
    };
  }>(`/api/products/${encodeURIComponent(productId)}/reviews`, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  return {
    success: true,
    data: {
      reviews: result.data.items,
      averageRating: result.data.stats.averageRating,
      totalReviews: result.data.stats.totalReview,
    },
  };
}

// Fungsi untuk mengirimkan ulasan dan rating produk baru
export async function createProductReview(
  productId: string,
  data: CreateReviewInput,
): Promise<CreateReviewResponse> {
  return fetchJson<CreateReviewResponse>(
    `/api/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(data),
    },
  );
}

export interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
}

export async function getCategories(signal?: AbortSignal): Promise<CategoryItem[]> {
  const result = await fetchJson<{
    success: boolean;
    data?: { items?: CategoryItem[] };
  }>("/api/categories", { method: "GET", signal });
  return result.data?.items || [];
}

export interface CheckPurchaseStatus {
  canReview: boolean;
  status: "DELIVERED" | "PENDING" | "NOT_PURCHASED";
  message: string | null;
}

export async function checkProductPurchase(
  productId: string,
  signal?: AbortSignal,
): Promise<CheckPurchaseStatus> {
  const result = await fetchJson<{
    success: boolean;
    data: CheckPurchaseStatus;
  }>(`/api/products/${encodeURIComponent(productId)}/check-purchase`, {
    method: "GET",
    credentials: "include",
    signal,
  });
  return result.data;
}
