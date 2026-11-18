import { fetchJson } from "./client";

export interface FloristDashboardData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    productsSold: number;
    activeProducts: number;
    lowStockProducts: number;
    averageRating: number;
    pendingOrders: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
  floristInfo?: {
    shopName: string;
    shopDescription: string;
    logo: string | null;
    banner: string | null;
    name: string;
    email: string;
    phone: string;
    address: {
      recipientName: string;
      phone: string;
      fullAddress: string;
      city: string;
      province: string;
      postalCode: string;
    } | null;
  };
}

export interface RawMaterialUsedInProduct {
  id: string;
  name: string;
  image: string | null;
  quantityRequired: number;
}

export interface RawMaterialItem {
  id: string;
  stockId: string;
  name: string;
  category: string;
  variety: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  minThreshold: number;
  location: string;
  lastRestockDate: string | null;
  createdAt: string;
  isSelfSupplied: boolean;
  sourceLabel: string;
  supplierName: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  usedInBOMCount: number;
  usedInProducts: RawMaterialUsedInProduct[];
}

export interface RawMaterialStats {
  totalItems: number;
  totalStock: number;
  lowStockCount: number;
  usedInBOMCount: number;
}

export interface FloristOrderDetail {
  id: string;
  orderNumber: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      image: string;
    };
  }>;
  payment: {
    id: string;
    status: string;
    method: string;
    paidAt: string | null;
  } | null;
  shipment: {
    id: string;
    status: string;
    courier: string;
    service: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  shippingAddress: {
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
}

export interface FloristShopAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface FloristProfilePayload {
  profile: {
    id: string;
    shopName: string;
    shopDescription: string | null;
    logo: string | null;
    banner: string | null;
    defaultAddressId: string | null;
    isActive: boolean;
  };
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  addresses: FloristShopAddress[];
}

export interface FloristShipmentRate {
  courier: {
    code: string;
    name: string;
    service_name: string;
    service_code: string;
  };
  price: number;
  rate_id: string;
  rate_name: string;
}

export interface UploadMediaResult {
  url: string;
  filename: string;
  size: number;
  type: string;
  storage: string;
  error?: string;
}

export async function getFloristDashboard(
  signal?: AbortSignal,
): Promise<FloristDashboardData> {
  const result = await fetchJson<{
    success: boolean;
    message?: string;
    data: FloristDashboardData;
  }>("/api/florist/dashboard", { method: "GET", cache: "no-store", signal });
  if (!result.success) {
    throw new Error(result.message || "Gagal memuat data dashboard");
  }
  return result.data;
}

export async function getFloristRawMaterials(
  params?: { search?: string; category?: string },
  signal?: AbortSignal,
): Promise<{ rawMaterials: RawMaterialItem[]; stats: RawMaterialStats }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category && params.category !== "ALL") {
    query.set("category", params.category);
  }
  const qs = query.toString();
  const url = qs ? `/api/florist/raw-materials?${qs}` : "/api/florist/raw-materials";
  const result = await fetchJson<{
    success: boolean;
    data: { rawMaterials: RawMaterialItem[]; stats: RawMaterialStats };
  }>(url, { method: "GET", signal });
  return result.data;
}

export async function createFloristRawMaterial(payload: {
  name: string;
  category: string;
  variety: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  minThreshold: number;
  location: string | null;
}): Promise<void> {
  await fetchJson("/api/florist/raw-materials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFloristRawMaterial(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await fetchJson(`/api/florist/raw-materials/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFloristRawMaterial(id: string): Promise<void> {
  await fetchJson(`/api/florist/raw-materials/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getFloristOrderById(
  orderId: string,
  signal?: AbortSignal,
): Promise<FloristOrderDetail> {
  const result = await fetchJson<{
    success: boolean;
    data?: FloristOrderDetail;
    order?: FloristOrderDetail;
  }>(`/api/florist/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  const detail = result.data || result.order;
  if (!detail) {
    throw new Error("Detail pesanan tidak tersedia");
  }
  return detail;
}

export async function getFloristProductById<T>(
  productId: string,
  signal?: AbortSignal,
): Promise<T> {
  const result = await fetchJson<{ success: boolean; data: T; message?: string }>(
    `/api/florist/products/${encodeURIComponent(productId)}`,
    { method: "GET", signal },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal memuat data produk");
  }
  return result.data;
}

export async function saveFloristProduct(
  payload: Record<string, unknown>,
  productId?: string,
): Promise<void> {
  const url = productId
    ? `/api/florist/products/${encodeURIComponent(productId)}`
    : "/api/florist/products";
  await fetchJson(url, {
    method: productId ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteFloristProduct(productId: string): Promise<void> {
  await fetchJson(`/api/florist/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}

export async function getProductComponents<T>(
  productId: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const result = await fetchJson<{ success: boolean; data?: { items?: T[] } }>(
    `/api/florist/products/${encodeURIComponent(productId)}/components`,
    { method: "GET", signal },
  );
  return result.data?.items || [];
}

export async function addProductComponent(
  productId: string,
  payload: { inventoryId: string; quantity: number },
): Promise<void> {
  await fetchJson(
    `/api/florist/products/${encodeURIComponent(productId)}/components`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteProductComponent(
  productId: string,
  componentId: string,
): Promise<void> {
  await fetchJson(
    `/api/florist/products/${encodeURIComponent(productId)}/components/${encodeURIComponent(componentId)}`,
    { method: "DELETE" },
  );
}

export async function produceFloristProduct(
  productId: string,
  quantity: number,
): Promise<{ lowStockTriggered?: boolean }> {
  const result = await fetchJson<{
    success: boolean;
    data?: { lowStockTriggered?: boolean };
  }>(`/api/florist/products/${encodeURIComponent(productId)}/produce`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
  return result.data || {};
}

export async function createFloristPreOrder(payload: {
  harvestAnnouncementId: string;
  quantity: number;
  notes: string | null;
}): Promise<void> {
  await fetchJson("/api/florist/preorders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFloristProfile(
  signal?: AbortSignal,
): Promise<FloristProfilePayload> {
  const result = await fetchJson<{
    success: boolean;
    message?: string;
    data: FloristProfilePayload;
  }>("/api/florist/profile", { method: "GET", cache: "no-store", signal });
  if (!result.success) {
    throw new Error(result.message || "Gagal memuat profile");
  }
  return result.data;
}

export async function updateFloristProfile(
  payload: Record<string, unknown>,
): Promise<void> {
  const result = await fetchJson<{ success: boolean; message?: string }>(
    "/api/florist/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal memperbarui profil toko");
  }
}

export async function saveFloristAddress(
  payload: Record<string, unknown>,
  addressId?: string,
): Promise<void> {
  const endpoint = addressId
    ? `/api/florist/profile/addresses/${encodeURIComponent(addressId)}`
    : "/api/florist/profile/addresses";
  const result = await fetchJson<{ success: boolean; message?: string }>(
    endpoint,
    {
      method: addressId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal menyimpan alamat");
  }
}

export async function setDefaultFloristAddress(addressId: string): Promise<void> {
  const result = await fetchJson<{ success: boolean; message?: string }>(
    `/api/florist/profile/addresses/${encodeURIComponent(addressId)}/set-default`,
    { method: "PUT" },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal set alamat default");
  }
}

export async function deleteFloristAddress(addressId: string): Promise<void> {
  const result = await fetchJson<{ success: boolean; message?: string }>(
    `/api/florist/profile/addresses/${encodeURIComponent(addressId)}`,
    { method: "DELETE" },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal menghapus alamat");
  }
}

export async function trackFloristShipment(shipmentId: string): Promise<void> {
  await fetchJson(`/api/florist/shipments/${encodeURIComponent(shipmentId)}/track`, {
    method: "GET",
  });
}

export async function getFloristShipmentRates(
  orderId: string,
): Promise<FloristShipmentRate[]> {
  const result = await fetchJson<{
    success: boolean;
    rates?: FloristShipmentRate[];
    data?: { rates?: FloristShipmentRate[] };
  }>("/api/florist/shipments/rates", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
  return result.rates || result.data?.rates || [];
}

export async function autoCreateFloristShipment(payload: {
  orderId: string;
  courierCompany: string;
  courierType: string;
}): Promise<void> {
  await fetchJson("/api/florist/shipments/auto-create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createManualFloristShipment(
  payload: Record<string, unknown>,
): Promise<void> {
  await fetchJson("/api/florist/shipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFloristShipment(
  shipmentId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await fetchJson(`/api/florist/shipments/${encodeURIComponent(shipmentId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadMediaFile(file: File): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<UploadMediaResult>("/api/upload", {
    method: "POST",
    body: formData,
  });
}
