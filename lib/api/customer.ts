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

interface PaymentTokenResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    redirectUrl: string;
  };
}

// fetch alamat customer
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

// Fungsi untuk create order (checkout)
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

// request Midtrans payment token
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
