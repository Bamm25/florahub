export interface SupplierDashboardData {
  summary: {
    totalRevenue: number;
    totalSales: number;
    stockSold: number;
    activeStocks: number;
    lowStockAlert: number;
    pendingTransactions: number;
    averageOrderValue: number;
  };
  harvestMetrics: {
    activeAnnouncements: number;
    confirmedPreOrders: number;
  };
  charts: {
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    topStocks: Array<{
      id: string;
      name: string;
      variety: string | null;
      pricePerUnit: number;
      quantity: number;
      totalSold: number;
    }>;
  };
  recentSales: Array<StockTransactionItem>;
}

export interface StockItem {
  id: string;
  supplierId: string;
  name: string;
  variety: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  harvestDate: string;
  expiryDate: string | null;
  location: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockInput {
  name: string;
  variety: string;
  unit: string;
  pricePerUnit: number;
  quantity: number;
}

export interface UpdateStockInput {
  name?: string;
  variety?: string;
  unit?: string;
  pricePerUnit?: number;
  quantity?: number;
  isAvailable?: boolean;
}

export interface HarvestAnnouncementItem {
  id: string;
  supplierId: string;
  flowerName: string;
  variety: string | null;
  estimatedQuantity: number;
  pricePerUnit: number;
  harvestDate: string;
  announceDate: string;
  description: string | null;
  location: string | null;
  image: string | null;
  isActive: boolean;
  totalReservedQuantity?: number;
  supplier?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    preOrders: number;
  };
  preOrders?: HarvestPreOrderItem[];
}

export interface HarvestPreOrderItem {
  id: string;
  announcementId: string;
  floristId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  florist: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateHarvestAnnouncementInput {
  flowerName: string;
  variety?: string;
  estimatedQuantity: number;
  pricePerUnit: number;
  harvestDate: string;
  description?: string;
  location?: string;
  image?: string;
}

export interface StockTransactionItem {
  id: string;
  stockId: string;
  floristId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentProof: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  stock: {
    id: string;
    name: string;
    variety: string | null;
    pricePerUnit: number;
  };
  florist: {
    id: string;
    name: string;
    email: string;
  };
}

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

export async function getSupplierDashboard(): Promise<SupplierDashboardData> {
  const result = await fetchJson<{
    success: boolean;
    data: SupplierDashboardData;
  }>("/api/supplier/dashboard", {
    method: "GET",
    cache: "no-store",
  });
  return result.data;
}

// daftar stok bunga
export async function getSupplierStocks(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  stocks: StockItem[];
  lowStockCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());

  const queryString = query.toString();
  const url = queryString
    ? `/api/supplier/stocks?${queryString}`
    : "/api/supplier/stocks";

  const result = await fetchJson<{
    success: boolean;
    data: {
      stocks: StockItem[];
      lowStockCount: number;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  }>(url, {
    method: "GET",
    cache: "no-store",
  });
  return result.data;
}

// CRUD supplier stock
export async function createSupplierStock(
  input: CreateStockInput,
): Promise<StockItem> {
  const result = await fetchJson<{ success: boolean; data: StockItem }>(
    "/api/supplier/stocks",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return result.data;
}

// CRUD update supplier stock
export async function updateSupplierStock(
  id: string,
  input: UpdateStockInput,
): Promise<StockItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { stock: StockItem };
  }>(`/api/supplier/stocks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return result.data.stock;
}

// // CRUD delete supplier stock
export async function deleteSupplierStock(id: string): Promise<void> {
  await fetchJson<{ success: boolean; message: string }>(
    `/api/supplier/stocks/${id}`,
    {
      method: "DELETE",
    },
  );
}

// Mengambil jadwal panen
export async function getSupplierHarvestAnnouncements(params?: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}): Promise<{
  announcements: HarvestAnnouncementItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.activeOnly !== undefined) {
    query.set("activeOnly", params.activeOnly ? "true" : "false");
  }
  const queryString = query.toString();
  const url = queryString
    ? `/api/supplier/harvest-announcements?${queryString}`
    : "/api/supplier/harvest-announcements";
  const result = await fetchJson<{
    success: boolean;
    data: {
      announcements: HarvestAnnouncementItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  }>(url, {
    method: "GET",
    cache: "no-store",
  });
  return result.data;
}

// CRUD all jadwal panen
export async function getSupplierHarvestAnnouncementDetail(
  id: string,
): Promise<HarvestAnnouncementItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { announcement: HarvestAnnouncementItem };
  }>(`/api/supplier/harvest-announcements/${id}`, {
    method: "GET",
    cache: "no-store",
  });
  return result.data.announcement;
}

// CRUD add jadwal panen
export async function createHarvestAnnouncement(
  input: CreateHarvestAnnouncementInput,
): Promise<HarvestAnnouncementItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { announcement: HarvestAnnouncementItem };
  }>(`/api/supplier/harvest-announcements`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.data.announcement;
}

// CRUD update jadwal panen
export async function updateHarvestAnnouncement(
  id: string,
  input: Partial<CreateHarvestAnnouncementInput>,
): Promise<HarvestAnnouncementItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { announcement: HarvestAnnouncementItem };
  }>(`/api/supplier/harvest-announcements/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return result.data.announcement;
}

// CRUD delete jadwal panen
export async function deleteHarvestAnnouncement(id: string): Promise<void> {
  await fetchJson<{ success: boolean; message: string }>(
    `/api/supplier/harvest-announcements/${id}`,
    {
      method: "DELETE",
    },
  );
}

// update status preOrder
export async function updatePreOrderStatus(
  preOrderId: string,
  status: "CONFIRMED" | "CANCELLED",
  cancelReason?: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/supplier/preorders/${preOrderId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      cancelReason,
    }),
  });
  return result.data.preOrder;
}

// riwayat transaksi penjualan stok
export async function getSupplierSales(params?: {
  page?: number;
  limit?: number;
}): Promise<StockTransactionItem[]> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());
  const queryString = query.toString();
  const url = queryString
    ? `/api/supplier/sales?${queryString}`
    : "/api/supplier/sales";

  const result = await fetchJson<{
    success: boolean;
    data: StockTransactionItem[];
  }>(url, {
    method: "GET",
    cache: "no-store",
  });
  return result.data;
}

export async function confirmSalePayment(
  transactionId: string,
): Promise<StockTransactionItem> {
  const result = await fetchJson<{
    success: boolean;
    data: StockTransactionItem;
  }>(`/api/supplier/sales/${transactionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "PAID" }),
  });
  return result.data;
}
