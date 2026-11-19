// Interface respons sukses standar API dengan data generik
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

// Interface respons data terpaginasi standar API
export interface PaginatedResponse<T> {
  success: true;
  message: string;
  data: {
    products: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Interface entitas produk sesuai dengan model database
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  images?: string[];
  categoryId: string | null;
  floristId: string;
  stock: number;
  minOrder?: number;
  isActive: boolean;
  isFeatured?: boolean;
  tags?: string[];
  weight?: number | null;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  reviewCount?: number;
  soldCount?: number;
  orderCount?: number;
  category?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  florist?: {
    id: string;
    name: string;
    floristProfile?: {
      shopName: string;
      logo?: string | null;
      defaultAddress?: {
        city: string;
        province?: string;
      } | null;
    } | null;
  } | null;
}

// Interface item produk di dalam keranjang belanja
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
  floristId: string;
  floristName?: string;
  slug?: string;
}

// Tipe status pesanan sesuai dengan enum database
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

// Tipe peran pengguna dalam sistem aplikasi
export type UserRole = "CUSTOMER" | "FLORIST" | "SUPPLIER" | "ADMIN";

export type {
  AdminAuditLogQueryInput,
  AdminCategoryQueryInput,
  AdminCouponQueryInput,
  AdminOrderQueryInput,
  AdminSupplyQueryInput,
  CreateCategoryInput,
  CreateCouponInput,
  UpdateCategoryInput,
  UpdateCouponInput,
} from "@/lib/validations/schemas";
