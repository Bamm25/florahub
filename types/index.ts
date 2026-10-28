// API RESPONSE TYPES
// Standard API success response (generic untuk semua endpoints)
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

// API error response (untuk handle validation/server errors)
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Paginated API response (untuk list endpoints dengan pagination)
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

// PRODUCT TYPES
// Product dari database (matching Prisma model)
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: string | null;
  floristId: string;
  stock: number;
  minOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product dengan relasi florist (untuk display dengan info toko)
export interface ProductWithFlorist extends Product {
  florist: {
    id: string;
    shopName: string;
    city: string | null;
  };
}

// Product form data untuk create/update product (tanpa auto-generated fields)
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string | null;
  stock: number;
  minOrder: number;
  isActive: boolean;
}

// CART TYPES
// Item di shopping cart (product + quantity user pilih)
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
  floristId: string;
}

// Cart state untuk Zustand store (global shopping cart)
export interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

// ORDER TYPES
// Order status enum (matching Prisma enum)
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

// Order dari database (matching Prisma model)
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  status: OrderStatus;
  isPreorder: boolean;
  preorderDeadline: string | null;
  estimatedReady: string | null;
  createdAt: string;
  updatedAt: string;
}

// Order item (produk dalam order dengan snapshot price)
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    name: string;
    image: string | null;
  };
}

// Order dengan relasi items & user (untuk detail page)
export interface OrderWithDetails extends Order {
  items: OrderItem[];
  user: {
    name: string;
    email: string;
  };
}

// USER & AUTH TYPES
// User role enum (matching Prisma enum)
export type UserRole = "CUSTOMER" | "FLORIST" | "SUPPLIER" | "ADMIN";

// User dari NextAuth session (tanpa sensitive data)
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
}

// Auth state untuk Zustand store (global auth state)
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}
