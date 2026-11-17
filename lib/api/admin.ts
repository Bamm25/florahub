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
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
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
