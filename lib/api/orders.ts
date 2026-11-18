import { fetchJson } from "./client";

// Interface rincian lengkap data pesanan beserta relasinya
interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      image: string;
      currentPrice: number;
    };
  }>;
  address: {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    transactionId: string | null;
    paidAt: string | null;
  } | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
}

// Interface respons API untuk rincian pesanan
interface OrderDetailResponse {
  success: boolean;
  message: string;
  data: {
    order: OrderDetail;
  };
}

// Interface ringkasan data pesanan untuk riwayat belanja
interface OrderSummary {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity?: number;
    product: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  payment: {
    status: string;
  };
}

// Interface respons API untuk riwayat pesanan dengan paginasi
interface OrderHistoryResponse {
  success: boolean;
  message: string;
  data: {
    orders: OrderSummary[];
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

// Interface data pengiriman dan pelacakan pesanan
export interface Shipment {
  id: string;
  courier: string;
  service: string | null;
  trackingNumber: string | null;
  status: string;
  estimatedDays: number | null;
  shippingCost: number;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt?: string;
}

export interface ShipmentTrackingDetails {
  status: string;
  history: Array<{
    note: string;
    status: string;
    updated_at: string;
    service_type?: string;
  }>;
  link: string | null;
}

// Interface respons API untuk data pengiriman pesanan
interface ShipmentResponse {
  success: boolean;
  message: string;
  data: {
    shipment: Shipment;
    tracking?: ShipmentTrackingDetails | null;
  };
}

// Fungsi untuk mengambil rincian pesanan berdasarkan ID
export async function getOrderDetail(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderDetailResponse> {
  return fetchJson<OrderDetailResponse>(
    `/api/customer/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
    },
  );
}

// Fungsi untuk mengambil riwayat pesanan dengan filter status dan paginasi
export async function getOrderHistory(
  params?: {
    status?: string;
    page?: number;
    limit?: number;
  },
  signal?: AbortSignal,
): Promise<OrderHistoryResponse> {
  const searchParams = new URLSearchParams();

  if (params?.status) searchParams.append("status", params.status);
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  const url = `/api/customer/orders${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  return fetchJson<OrderHistoryResponse>(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
}

// Fungsi untuk membatalkan pesanan yang berstatus pending
export async function cancelOrder(orderId: string): Promise<{
  success: boolean;
  message: string;
  data?: { orderId: string };
}> {
  return fetchJson<{
    success: boolean;
    message: string;
    data?: { orderId: string };
  }>(`/api/customer/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    credentials: "include",
  });
}

// Fungsi untuk mengambil informasi status pengiriman berdasarkan ID pesanan
export async function getOrderShipment(
  orderId: string,
  signal?: AbortSignal,
): Promise<ShipmentResponse> {
  return fetchJson<ShipmentResponse>(
    `/api/customer/shipments/order/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      credentials: "include",
      signal,
    },
  );
}
