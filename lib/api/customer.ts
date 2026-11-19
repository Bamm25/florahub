import { fetchJson } from "./client";
import {
  getAddresses,
  type Address,
  type AddressesResponse,
} from "./addresses";

export type { Address, AddressesResponse };

// Interface respons API setelah pembuatan pesanan checkout
interface CheckoutOrderResponse {
  success: boolean;
  message: string;
  data: {
    order: {
      id: string;
      orderNumber: string;
      totalAmount: number;
      subtotal: number;
      shippingCost: number;
      discount: number;
      status: string;
      notes: string | null;
      createdAt: string;
      items: Array<{
        id: string;
        quantity: number;
        price: number;
        subtotal: number;
        product: {
          id: string;
          name: string;
          image: string | null;
        };
      }>;
      address: Address | null;
      couponApplied: {
        code: string;
        name: string;
        type: string;
        discountAmount: number;
      } | null;
    };
    payment: {
      id: string;
      orderId: string;
      amount: number;
      method: string;
      status: string;
    };
  };
}

// Interface respons API token pembayaran Midtrans
interface PaymentTokenResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    redirectUrl: string;
  };
}

// Interface respons API validasi kupon dan kalkulasi diskon
export interface ValidateCouponResponse {
  success: boolean;
  message: string;
  data: {
    coupon: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
      value: number;
    };
    calculation: {
      subtotal: number;
      shippingCost: number;
      totalBeforeDiscount: number;
      discountAmount: number;
      finalAmount: number;
    };
  };
}

// Fungsi untuk mengambil daftar alamat pelanggan dari API
export async function getCustomerAddresses(
  signal?: AbortSignal,
): Promise<AddressesResponse> {
  return getAddresses(signal);
}

// Fungsi untuk membuat pesanan checkout baru melalui API
export async function createCheckoutOrder(data: {
  addressId: string;
  shippingCost: number;
  courier?: string;
  service?: string;
  couponCode?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}): Promise<CheckoutOrderResponse> {
  return fetchJson<CheckoutOrderResponse>("/api/customer/checkout", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(data),
  });
}

// Fungsi untuk meminta token pembayaran Midtrans berdasarkan ID pesanan
export async function createPaymentToken(
  orderId: string,
): Promise<PaymentTokenResponse> {
  return fetchJson<PaymentTokenResponse>("/api/customer/payment", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ orderId }),
  });
}

// Fungsi untuk memvalidasi kode kupon dan menghitung nilai diskon
export async function validateCoupon(data: {
  code: string;
  subtotal: number;
  shippingCost?: number;
  productIds?: string[];
}): Promise<ValidateCouponResponse> {
  return fetchJson<ValidateCouponResponse>("/api/customer/coupons/validate", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(data),
  });
}

export interface CustomerProfileData {
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  emailVerified: boolean;
  totalOrders?: number;
  totalSpent?: number;
}

export interface ShippingRateOption {
  courier: string;
  service: string;
  price: number;
  estimatedDays: string;
}

export interface ShippingCalculateResponse {
  success: boolean;
  message: string;
  data: {
    rates: ShippingRateOption[];
    cheapest: ShippingRateOption;
  };
}

export async function getCustomerProfile(
  signal?: AbortSignal,
): Promise<CustomerProfileData> {
  const result = await fetchJson<{
    success: boolean;
    data: { profile: CustomerProfileData };
  }>("/api/customer/profile", {
    method: "GET",
    credentials: "include",
    signal,
  });
  return result.data.profile;
}

export async function updateCustomerProfile(payload: {
  name: string;
  phone: string;
}): Promise<void> {
  await fetchJson("/api/customer/profile", {
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify(payload),
  });
}

export async function calculateCustomerShipping(
  payload: {
    addressId: string;
    items: Array<{ productId: string; quantity: number }>;
  },
  signal?: AbortSignal,
): Promise<ShippingCalculateResponse> {
  return fetchJson<ShippingCalculateResponse>(
    "/api/customer/shipping/calculate",
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
  );
}

export async function registerUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "CUSTOMER" | "FLORIST" | "SUPPLIER";
}): Promise<{ success: boolean; message?: string }> {
  return fetchJson<{ success: boolean; message?: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCustomerProducts<T>(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    sortBy?: string;
    inStock?: boolean;
  },
  signal?: AbortSignal,
): Promise<{
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.categoryId && params.categoryId !== "all") {
    searchParams.set("categoryId", params.categoryId);
  }
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.inStock) searchParams.set("inStock", "true");

  const result = await fetchJson<{
    success: boolean;
    message?: string;
    data: {
      items: T[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>(`/api/customer/products?${searchParams.toString()}`, {
    method: "GET",
    signal,
  });
  return result.data;
}
