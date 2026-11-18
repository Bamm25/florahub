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

export async function fetchAdminOrders<T = Record<string, unknown>>(
  params: { page?: number; limit?: number; status?: string; isPreorder?: boolean } = {},
  signal?: AbortSignal,
): Promise<{ orders: T[]; pagination: AdminPaginationMeta }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.isPreorder !== undefined) query.set("isPreorder", String(params.isPreorder));
  const qs = query.toString();
  const result = await fetchJson<{
    success: boolean;
    data: { orders: T[]; pagination: AdminPaginationMeta };
  }>(qs ? `/api/admin/orders?${qs}` : "/api/admin/orders", {
    method: "GET",
    cache: "no-store",
    signal,
  });
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
