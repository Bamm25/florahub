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

// Helper generic untuk request HTTP JSON terstandarisasi (pola FloraHub)
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      payload?.message || `Permintaan gagal dengan status ${response.status}`;
    throw new Error(errorMessage);
  }
  return payload;
}

// Fungsi client untuk mengambil metrik ringkasan platform
export async function fetchAdminStats(): Promise<AdminDashboardStats> {
  const result = await fetchJson<{
    success: boolean;
    data: AdminDashboardStats;
  }>("/api/admin/stats", {
    method: "GET",
    cache: "no-store",
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
