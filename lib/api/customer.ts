// Interface representasi data alamat pengiriman pelanggan
interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface respons API untuk daftar alamat pelanggan
interface AddressesResponse {
  success: boolean;
  message: string;
  data: {
    items: Address[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

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
        type: string;
        value: number;
        discount: number;
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
export async function getCustomerAddresses(): Promise<AddressesResponse> {
  const response = await fetch("/api/customer/addresses", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal memuat daftar alamat");
  }

  return response.json();
}

// Fungsi untuk membuat pesanan checkout baru melalui API
export async function createCheckoutOrder(data: {
  addressId: string;
  shippingCost: number;
  couponCode?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}): Promise<CheckoutOrderResponse> {
  const response = await fetch("/api/customer/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal membuat pesanan");
  }

  return response.json();
}

// Fungsi untuk meminta token pembayaran Midtrans berdasarkan ID pesanan
export async function createPaymentToken(
  orderId: string,
): Promise<PaymentTokenResponse> {
  const response = await fetch("/api/customer/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal membuat link pembayaran");
  }

  return response.json();
}

// Fungsi untuk memvalidasi kode kupon dan menghitung nilai diskon
export async function validateCoupon(data: {
  code: string;
  subtotal: number;
  shippingCost?: number;
}): Promise<ValidateCouponResponse> {
  const response = await fetch("/api/customer/coupons/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || "Kupon tidak valid");
  }

  return response.json();
}
