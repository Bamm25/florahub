// Interface respons sukses standar API dengan data generik
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

// Interface respons galat standar API
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
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
  categoryId: string | null;
  floristId: string;
  stock: number;
  minOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  reviewCount?: number;
}

// Interface entitas produk beserta informasi toko florist
export interface ProductWithFlorist extends Product {
  florist: {
    id: string;
    shopName: string;
    city: string | null;
  };
}

// Interface data formulir untuk pembuatan atau pembaruan produk
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

// Interface item produk di dalam keranjang belanja
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
  floristId: string;
}

// Interface state dan aksi keranjang belanja pada Zustand store
export interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

// Tipe status pesanan sesuai dengan enum database
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

// Interface entitas pesanan sesuai dengan model database
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

// Interface item rincian produk di dalam pesanan
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

// Interface entitas pesanan lengkap dengan daftar item dan data pengguna
export interface OrderWithDetails extends Order {
  items: OrderItem[];
  user: {
    name: string;
    email: string;
  };
}

// Tipe peran pengguna dalam sistem aplikasi
export type UserRole = "CUSTOMER" | "FLORIST" | "SUPPLIER" | "ADMIN";

// Interface data profil pengguna dalam sesi autentikasi
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
}

// Interface state dan aksi autentikasi pada Zustand store
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}
