import type {
  Product,
  ApiResponse,
  PaginatedResponse,
  ProductFormData,
} from "@/types";

// Response type dari API GET product by slug
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

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string;
  };
}

export interface CreateReviewInput {
  rating: number;
  comment: string;
  images?: string[];
}

export interface CreateReviewResponse {
  success: boolean;
  message: string;
  data: {
    review: Review;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Fetch semua products dengan filter dan pagination
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}): Promise<PaginatedResponse<Product>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.search) queryParams.set("search", params.search);
  if (params?.categoryId) queryParams.set("categoryId", params.categoryId);

  const url = `${API_BASE_URL}/api/products?${queryParams.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch products: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

// Fetch detail product berdasarkan ID
export async function getProductById(
  id: string,
): Promise<ApiResponse<Product>> {
  const url = `${API_BASE_URL}/api/products/${id}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Product not found");
    }
    throw new Error(`Failed to fetch product: ${res.status}`);
  }

  return res.json();
}

// Post create product florist
export async function createProduct(
  data: ProductFormData,
): Promise<ApiResponse<Product>> {
  const url = `${API_BASE_URL}/api/florist/products`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.message || `Failed to create product: ${res.status}`,
    );
  }

  return res.json();
}

// Put update product optional value florist
export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>,
): Promise<ApiResponse<Product>> {
  const url = `${API_BASE_URL}/api/florist/products/${id}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.message || `Failed to update product: ${res.status}`,
    );
  }

  return res.json();
}

// delete product florist
export async function deleteProduct(
  id: string,
): Promise<ApiResponse<{ id: string }>> {
  const url = `${API_BASE_URL}/api/florist/products/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.message || `Failed to delete product: ${res.status}`,
    );
  }

  return res.json();
}

// Fetch detail produk berdasarkan slug untuk SEO
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailResponse> {
  const response = await fetch(`/api/products?slug=${slug}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal memuat detail produk");
  }
  return response.json();
}

// Fetch reviews dan rating stats untuk productId
export async function getProductReviews(productId: string) {
  const response = await fetch(`/api/products/${productId}/reviews`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal memuat ulasan produk");
  }
  const result = await response.json();
  return {
    success: true,
    data: {
      reviews: result.data.items,
      averageRating: result.data.stats.averageRating,
      totalReviews: result.data.stats.totalReview,
    },
  };
}

// Submit review baru untuk productId dengan rating dan comment
export async function createProductReview(
  productId: string,
  data: CreateReviewInput,
): Promise<CreateReviewResponse> {
  const response = await fetch(`/api/products/${productId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detailedMessage =
      errorData?.errors?.[0]?.message ||
      errorData?.message ||
      "Gagal mengirim ulasan";
    throw new Error(detailedMessage);
  }

  return response.json();
}
