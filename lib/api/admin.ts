import { fetchJson } from "./client";

// Tipe data agregasi statistik platform untuk dasbor admin
export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    admins: number;
    suppliers: number;
    florists: number;
    customers: number;
  };
  catalog: {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
  };
  b2cOrders: {
    total: number;
    settledRevenue: number;
    pendingCount: number;
    deliveredCount: number;
    cancelledCount: number;
  };
  b2bSupply: {
    directSales: {
      total: number;
      settledRevenue: number;
      pendingCount: number;
    };
    preOrders: {
      total: number;
      committedValue: number;
      pendingApprovalCount: number;
      waitingDepositCount: number;
    };
  };
}

// Fungsi client untuk mengambil metrik ringkasan platform
export async function fetchAdminStats(signal?: AbortSignal): Promise<AdminDashboardStats> {
  const result = await fetchJson<{
    success: boolean;
    data: AdminDashboardStats;
  }>("/api/admin/stats", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  return result.data;
}

export type AdminUserRole = "ADMIN" | "SUPPLIER" | "FLORIST" | "CUSTOMER";
export type AdminUserStatusReason =
  | "POLICY_VIOLATION"
  | "USER_REQUEST"
  | "ACCOUNT_RECOVERY";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUsersPage {
  users: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function fetchAdminUsers(
  filters: { page?: number; limit?: number; role?: AdminUserRole; search?: string } = {},
  signal?: AbortSignal,
): Promise<AdminUsersPage> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));
  if (filters.role) params.set("role", filters.role);
  if (filters.search?.trim()) params.set("search", filters.search.trim());

  const result = await fetchJson<{ success: boolean; data: AdminUsersPage }>(
    `/api/admin/users?${params.toString()}`,
    { method: "GET", cache: "no-store", signal },
  );
  if (!result?.success || !result.data) {
    throw new Error("Respons daftar pengguna tidak valid");
  }
  return result.data;
}

export async function updateAdminUserStatus(
  id: string,
  isActive: boolean,
  reasonCode: AdminUserStatusReason,
): Promise<void> {
  const result = await fetchJson<{ success: boolean }>(
    `/api/admin/users/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive, reasonCode }),
    },
  );
  if (!result?.success) throw new Error("Perubahan status akun gagal");
}

export interface AdminPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type AdminOrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface AdminB2COrderItem {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  isPreorder: boolean;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    maskedEmail: string;
    maskedPhone: string | null;
  };
  destination: {
    city: string;
    province: string;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
    floristName: string;
  }>;
  payment: {
    method: string;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    amount: number;
    paidAt: string | null;
  } | null;
  shipment: {
    courier: string;
    service: string | null;
    status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    trackingNumber: string | null;
    hasBiteshipOrder: boolean;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  reconciliation: {
    hasAnomaly: boolean;
    anomalyNote: string | null;
  };
}

export interface AdminOrdersPage {
  orders: AdminB2COrderItem[];
  pagination: AdminPaginationMeta;
}

export type AdminSupplyType = "DIRECT" | "PREORDER";
export type AdminDirectSupplyStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
export type AdminPreOrderSupplyStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DEPOSIT_PAID"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "EXPIRED";

export interface AdminSupplyItem {
  id: string;
  type: AdminSupplyType;
  status: AdminDirectSupplyStatus | AdminPreOrderSupplyStatus;
  flowerName: string;
  variety: string | null;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  shippingCost: number | null;
  harvestDate: string | null;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    maskedEmail: string;
  };
  florist: {
    id: string;
    name: string;
    maskedEmail: string;
  };
  paymentSummary: {
    stage: "UNPAID" | "DEPOSIT_PAID" | "FULL_PAID" | "CANCELLED";
    hasPaymentProof: boolean;
    depositAmount: number | null;
    depositPaidAt: string | null;
    remainingAmount: number | null;
    finalPaidAt: string | null;
  };
  shipment: {
    courier: string | null;
    service: string | null;
    trackingNumber: string | null;
    hasBiteshipOrder: boolean;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  reconciliation: {
    hasAnomaly: boolean;
    anomalyNote: string | null;
  };
}

export interface AdminSupplyPage {
  type: AdminSupplyType;
  items: AdminSupplyItem[];
  pagination: AdminPaginationMeta;
}

// Fungsi client read-only untuk mengambil daftar pesanan B2C pada portal admin
export async function fetchAdminOrders(
  params: {
    page?: number;
    limit?: number;
    status?: AdminOrderStatus;
    isPreorder?: boolean;
    search?: string;
  } = {},
  signal?: AbortSignal,
): Promise<AdminOrdersPage> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  if (params.status) query.set("status", params.status);
  if (params.isPreorder !== undefined) {
    query.set("isPreorder", String(params.isPreorder));
  }
  if (params.search?.trim()) query.set("search", params.search.trim());

  const result = await fetchJson<{
    success: boolean;
    data: AdminOrdersPage;
  }>(`/api/admin/orders?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!result?.success || !result.data) {
    throw new Error("Respons daftar pesanan tidak valid");
  }
  return result.data;
}

// Fungsi client read-only untuk memantau pergerakan rantai pasok B2B (Direct & Pre-Order)
export async function fetchAdminSupplyOrders(
  params: {
    type?: AdminSupplyType;
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
  signal?: AbortSignal,
): Promise<AdminSupplyPage> {
  const query = new URLSearchParams();
  query.set("type", params.type ?? "DIRECT");
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  if (params.status) query.set("status", params.status);
  if (params.search?.trim()) query.set("search", params.search.trim());

  const result = await fetchJson<{
    success: boolean;
    data: AdminSupplyPage;
  }>(`/api/admin/supply?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!result?.success || !result.data) {
    throw new Error("Respons rantai pasok B2B tidak valid");
  }
  return result.data;
}

export async function fetchAdminAuditLogs<T = Record<string, unknown>>(
  params: { page?: number; limit?: number; entity?: string; action?: string; userId?: string } = {},
  signal?: AbortSignal,
): Promise<{ logs: T[]; pagination: AdminPaginationMeta }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.entity) query.set("entity", params.entity);
  if (params.action) query.set("action", params.action);
  if (params.userId) query.set("userId", params.userId);
  const qs = query.toString();
  const result = await fetchJson<{
    success: boolean;
    data: { logs: T[]; pagination: AdminPaginationMeta };
  }>(qs ? `/api/admin/audit-logs?${qs}` : "/api/admin/audit-logs", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  return result.data;
}

export async function fetchAdminCoupons<T = Record<string, unknown>>(
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ coupons: T[]; pagination: AdminPaginationMeta }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const result = await fetchJson<{
    success: boolean;
    data: { coupons: T[]; pagination: AdminPaginationMeta };
  }>(qs ? `/api/admin/coupons?${qs}` : "/api/admin/coupons", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  return result.data;
}

export async function createAdminCoupon<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
): Promise<T> {
  const result = await fetchJson<{ success: boolean; data: { coupon: T } }>(
    "/api/admin/coupons",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return result.data.coupon;
}

export async function updateAdminCoupon<T = Record<string, unknown>>(
  id: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const result = await fetchJson<{ success: boolean; data: { coupon: T } }>(
    `/api/admin/coupons/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return result.data.coupon;
}

export async function deleteAdminCoupon(id: string): Promise<void> {
  await fetchJson(`/api/admin/coupons/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
