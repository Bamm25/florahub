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
  status:
    | "PENDING"
    | "CONFIRMED"
    | "DEPOSIT_PAID"
    | "PAID"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "EXPIRED";
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  depositAmount?: number | null;
  depositDeadline?: string | null;
  depositProof?: string | null;
  depositPaidAt?: string | null;
  remainingAmount?: number | null;
  finalProof?: string | null;
  finalPaidAt?: string | null;
  finalDeadline?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  biteshipOrderId?: string | null;
  biteshipLabelUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
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
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentProof: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  biteshipOrderId?: string | null;
  biteshipLabelUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
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

// Supplier memverifikasi pembayaran DP florist
export async function verifyPreOrderDeposit(
  preOrderId: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/supplier/preorders/${preOrderId}/verify-deposit`, {
    method: "PATCH",
  });
  return result.data.preOrder;
}

// Supplier memverifikasi pembayaran pelunasan sisa tagihan florist
export async function verifyPreOrderFinalPayment(
  preOrderId: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/supplier/preorders/${preOrderId}/verify-final`, {
    method: "PATCH",
  });
  return result.data.preOrder;
}

// Florist mengunggah bukti pembayaran DP 50%
export async function uploadPreOrderDepositProof(
  preOrderId: string,
  depositProof: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/florist/preorders/${preOrderId}/deposit`, {
    method: "PUT",
    body: JSON.stringify({ depositProof }),
  });
  return result.data.preOrder;
}

// Florist mengunggah bukti pelunasan sisa tagihan saat panen
export async function uploadPreOrderFinalProof(
  preOrderId: string,
  finalProof: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/florist/preorders/${preOrderId}/final-payment`, {
    method: "PUT",
    body: JSON.stringify({ finalProof }),
  });
  return result.data.preOrder;
}

// Request token transaksi Midtrans Snap untuk pembayaran DP 50%
export async function getPreOrderDepositSnapToken(preOrderId: string): Promise<{
  snapToken: string;
  redirectUrl: string;
  depositAmount: number;
  orderId: string;
}> {
  const result = await fetchJson<{
    success: boolean;
    data: {
      snapToken: string;
      redirectUrl: string;
      depositAmount: number;
      orderId: string;
    };
  }>(`/api/florist/preorders/${preOrderId}/pay-deposit`, {
    method: "POST",
  });
  return result.data;
}

// Request token transaksi Midtrans Snap untuk pelunasan pre-order
export async function getPreOrderFinalSnapToken(preOrderId: string): Promise<{
  snapToken: string;
  redirectUrl: string;
  remainingAmount: number;
  orderId: string;
}> {
  const result = await fetchJson<{
    success: boolean;
    data: {
      snapToken: string;
      redirectUrl: string;
      remainingAmount: number;
      orderId: string;
    };
  }>(`/api/florist/preorders/${preOrderId}/pay-final`, {
    method: "POST",
  });
  return result.data;
}

// Sinkronisasi status DEPOSIT_PAID setelah pembayaran Midtrans Snap sukses
export async function confirmPreOrderDepositMidtrans(
  preOrderId: string,
  transactionId?: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/florist/preorders/${preOrderId}/confirm-deposit-midtrans`, {
    method: "PATCH",
    body: JSON.stringify({ transactionId }),
  });
  return result.data.preOrder;
}

// Sinkronisasi status PAID setelah pelunasan Midtrans Snap sukses
export async function confirmPreOrderFinalMidtrans(
  preOrderId: string,
  transactionId?: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/florist/preorders/${preOrderId}/confirm-final-midtrans`, {
    method: "PATCH",
    body: JSON.stringify({ transactionId }),
  });
  return result.data.preOrder;
}

// Florist mengonfirmasi penerimaan bunga panen
export async function receivePreOrder(
  preOrderId: string,
): Promise<HarvestPreOrderItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { preOrder: HarvestPreOrderItem };
  }>(`/api/florist/preorders/${preOrderId}/receive`, {
    method: "PATCH",
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

// Interface pengiriman terpadu supplier
export interface SupplierUnifiedShipment {
  id: string;
  orderType: "PREORDER" | "DIRECT_SALE";
  orderId: string;
  orderNumber: string;
  courier: string;
  service: string | null;
  trackingNumber: string | null;
  status: string;
  shippingCost: number;
  weight: number;
  biteshipOrderId: string | null;
  biteshipLabelUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  itemName: string;
  totalAmount: number;
  recipient: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

export interface SupplierReadyToShipOrder {
  id: string;
  orderType: "PREORDER" | "DIRECT_SALE";
  orderNumber: string;
  totalAmount: number;
  quantity: number;
  itemName: string;
  weight: number;
  buyer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
  };
}

export interface SupplierBiteshipRate {
  courier: {
    code: string;
    name: string;
    service_name: string;
    service_code: string;
  };
  price: number;
  estimated_days: string;
  rate_id: string;
  rate_name: string;
}

// Mengambil daftar seluruh pengiriman supplier
export async function getSupplierShipments(
  statusFilter?: string,
): Promise<SupplierUnifiedShipment[]> {
  const url =
    statusFilter && statusFilter !== "ALL"
      ? `/api/supplier/shipments?status=${statusFilter}`
      : "/api/supplier/shipments";

  const result = await fetchJson<{
    success: boolean;
    data: { shipments: SupplierUnifiedShipment[] };
  }>(url, {
    method: "GET",
    cache: "no-store",
  });
  return result.data.shipments;
}

// Mengambil pesanan berstatus PAID yang siap dibuatkan resi shipment
export async function getSupplierReadyToShipOrders(): Promise<
  SupplierReadyToShipOrder[]
> {
  const result = await fetchJson<{
    success: boolean;
    data: { orders: SupplierReadyToShipOrder[] };
  }>("/api/supplier/shipments/ready-to-ship", {
    method: "GET",
    cache: "no-store",
  });
  return result.data.orders;
}

// Mengambil tarif kurir Biteship real-time
export async function getSupplierBiteshipRates(
  orderType: "PREORDER" | "DIRECT_SALE",
  orderId: string,
): Promise<SupplierBiteshipRate[]> {
  const result = await fetchJson<{
    success: boolean;
    data: { rates: SupplierBiteshipRate[] };
  }>("/api/supplier/shipments/rates", {
    method: "POST",
    body: JSON.stringify({ orderType, orderId }),
  });
  return result.data.rates;
}

// Membuat pengiriman otomatis Biteship & menerbitkan nomor resi
export async function autoCreateSupplierShipment(payload: {
  orderType: "PREORDER" | "DIRECT_SALE";
  orderId: string;
  courierCompany: string;
  courierType: string;
}): Promise<{
  biteshipOrderId: string;
  trackingNumber: string;
  courier: string;
  service: string;
  shippingCost: number;
  labelUrl: string | null;
}> {
  const result = await fetchJson<{
    success: boolean;
    data: {
      biteshipOrderId: string;
      trackingNumber: string;
      courier: string;
      service: string;
      shippingCost: number;
      labelUrl: string | null;
    };
  }>("/api/supplier/shipments/auto-create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.data;
}

// Melacak pengiriman Biteship
export async function trackSupplierShipment(shipmentId: string): Promise<{ status: string; history: Array<{ note?: string; status?: string; updated_at?: string; date?: string }>; link?: string | null }> {
  const result = await fetchJson<{
    success: boolean;
    data: { tracking: { status: string; history: Array<{ note?: string; status?: string; updated_at?: string; date?: string }>; link?: string | null } };
  }>(`/api/supplier/shipments/${shipmentId}/track`, {
    method: "GET",
    cache: "no-store",
  });
  return result.data.tracking;
}

// Mengambil label cetak thermal AWB Biteship
export async function getSupplierShipmentLabel(
  shipmentId: string,
): Promise<string | null> {
  const result = await fetchJson<{
    success: boolean;
    data: { labelUrl: string | null };
  }>(`/api/supplier/shipments/${shipmentId}/label`, {
    method: "GET",
    cache: "no-store",
  });
  return result.data.labelUrl;
}

// Interface pasokan bunga supplier untuk katalog florist
export interface SupplierMarketplaceStock {
  id: string;
  name: string;
  variety: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  harvestDate: string | null;
  location: string;
  supplier: {
    id: string;
    name: string;
    email: string;
    city: string;
    province: string;
  };
}

// Mengambil katalog stok bunga langsung dari semua supplier mitra untuk florist
export async function getSupplierStocksMarketplace(params?: {
  search?: string;
  variety?: string;
  page?: number;
}): Promise<{ stocks: SupplierMarketplaceStock[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.variety && params.variety !== "ALL")
    query.set("variety", params.variety);
  if (params?.page) query.set("page", params.page.toString());
  const queryString = query.toString();
  const url = queryString
    ? `/api/florist/supplier-stocks?${queryString}`
    : "/api/florist/supplier-stocks";
  const result = await fetchJson<{
    success: boolean;
    data: { stocks: SupplierMarketplaceStock[]; pagination: { total: number } };
  }>(url, { method: "GET", cache: "no-store" });
  return { stocks: result.data.stocks, total: result.data.pagination.total };
}

// Florist membeli stok bunga langsung dari supplier
export async function purchaseSupplierStock(
  stockId: string,
  quantity: number,
): Promise<StockTransactionItem> {
  const result = await fetchJson<{ success: boolean; data: StockTransactionItem }>(
    "/api/florist/purchase",
    {
      method: "POST",
      body: JSON.stringify({ stockId, quantity }),
    },
  );
  return result.data;
}

// Hanya webhook Midtrans yang boleh mengubah status pembayaran; Snap success bukan bukti settlement.
export async function getDirectSaleSnapToken(transactionId: string): Promise<{ snapToken: string; redirectUrl?: string }> {
  const result = await fetchJson<{ success: boolean; data: { snapToken: string; redirectUrl?: string } }>(
    `/api/florist/purchase/${transactionId}/pay-midtrans`, { method: "POST" },
  );
  return result.data;
}

export interface FloristStockPurchase extends StockTransactionItem {
  stock: StockTransactionItem["stock"] & { unit?: string; supplier: { id: string; name: string; email: string } };
}

export async function getFloristStockPurchases(): Promise<FloristStockPurchase[]> {
  const result = await fetchJson<{ success: boolean; data: { transactions: FloristStockPurchase[] } }>(
    "/api/florist/purchase?limit=100", { method: "GET", cache: "no-store" },
  );
  return result.data.transactions;
}

// Verifikasi dan sinkronisasi pembayaran Midtrans untuk pembelian pasokan langsung
export async function confirmDirectPurchaseMidtrans(
  transactionId: string,
  queryId?: string,
): Promise<StockTransactionItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { transaction: StockTransactionItem };
  }>(`/api/florist/purchase/${transactionId}/confirm-midtrans`, {
    method: "PATCH",
    body: JSON.stringify({ transactionId: queryId }),
  });
  return result.data.transaction;
}

// Florist mengonfirmasi penerimaan pasokan bunga langsung yang dikirim via Biteship
export async function receiveDirectPurchase(
  transactionId: string,
): Promise<StockTransactionItem> {
  const result = await fetchJson<{
    success: boolean;
    data: { transaction: StockTransactionItem };
  }>(`/api/florist/purchase/${transactionId}/receive`, {
    method: "PATCH",
  });
  return result.data.transaction;
}

// Simulasi perubahan status kurir Biteship (Sandbox / Testing)
export async function simulateShipmentStatus(
  shipmentId: string,
  status: "SHIPPED" | "DELIVERED",
): Promise<{ status: string }> {
  const result = await fetchJson<{ success: boolean; data: { status: string } }>(
    `/api/supplier/shipments/${shipmentId}/simulate-status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
  return result.data;
}

