// Biteship API Client untuk automatic shipping label & tracking
import axios from "axios";
import type { AxiosInstance } from "axios";

const BITESHIP_BASE_URL =
  process.env.BITESHIP_ENV === "production"
    ? "https://api.biteship.com/v1"
    : "https://api.biteship.com/v1"; // Sandbox: ubah saat Biteship provide sandbox URL

interface BiteshipConfig {
  apiKey: string;
  baseURL?: string;
}

// Response types dari Biteship API
export interface BiteshipArea {
  id: string;
  name: string;
  country_code: string;
  country_name: string;
  administrative_division_level_1_name: string; // Provinsi
  administrative_division_level_1_type: string;
  administrative_division_level_2_name: string; // Kota/Kabupaten
  administrative_division_level_2_type: string;
  administrative_division_level_3_name: string; // Kecamatan
  administrative_division_level_3_type: string;
  postal_code: number;
}

export interface BiteshipRateItem {
  name: string;
  description?: string;
  value: number; // Nilai barang (IDR)
  quantity: number;
  height: number; // cm
  length: number; // cm
  width: number; // cm
  weight: number; // gram
}

export interface BiteshipCourierRate {
  available_for_cash_on_delivery: boolean;
  available_for_proof_of_delivery: boolean;
  available_for_instant_waybill_id: boolean;
  available_for_insurance: boolean;
  company: string; // "jne", "jnt", "sicepat"
  courier_name: string; // "JNE", "J&T Express"
  courier_code: string;
  courier_service_name: string; // "REG", "YES", "OKE"
  courier_service_code: string;
  description: string;
  duration: string; // "1 - 2 days"
  shipment_duration_range: string;
  shipment_duration_unit: string;
  service_type: string;
  shipping_type: string;
  price: number; // IDR
  type: string;
}

export interface BiteshipRatesResponse {
  success: boolean;
  object: string;
  message: string;
  code: number;
  origin: BiteshipArea;
  destination: BiteshipArea;
  pricing: Array<BiteshipCourierRate>;
}

export interface BiteshipOrderRequest {
  shipper_contact_name: string;
  shipper_contact_phone: string;
  shipper_contact_email: string;
  shipper_organization: string;
  origin_contact_name: string;
  origin_contact_phone: string;
  origin_address: string;
  origin_note?: string;
  origin_postal_code: number;
  origin_coordinate?: {
    latitude: number;
    longitude: number;
  };
  destination_contact_name: string;
  destination_contact_phone: string;
  destination_contact_email?: string;
  destination_address: string;
  destination_postal_code: number;
  destination_note?: string;
  destination_coordinate?: {
    latitude: number;
    longitude: number;
  };
  destination_cash_on_delivery?: number; // Jumlah COD (IDR), 0 jika non-COD
  destination_cash_on_delivery_type?: string; // "cash" atau "bank_transfer"
  delivery_type: "now" | "scheduled"; // "now" = pickup segera, "scheduled" = pickup terjadwal
  delivery_date?: string; // YYYY-MM-DD untuk scheduled
  delivery_time?: string; // HH:mm untuk scheduled
  courier_company: string; // "jne", "jnt", "sicepat"
  courier_type: string; // "express", "reg", "oke"
  courier_insurance?: number; // Nilai asuransi (IDR)
  order_note?: string;
  metadata?: Record<string, any>; // Data custom (order_id internal, dll)
  reference_id?: string; // Order ID internal FloraHub (unique per order)
  items: Array<{
    id?: string;
    name: string;
    description?: string;
    value: number; // Nilai per item (IDR)
    quantity: number;
    height: number; // cm
    length: number; // cm
    width: number; // cm
    weight: number; // gram
  }>;
}

// Response order Biteship sesuai dokumentasi resmi create dan retrieve order
export interface BiteshipOrderResponse {
  success: boolean;
  object: string;
  message: string;
  code?: number;
  id: string;
  order_id?: string;
  reference_id?: string | null;
  price: number;
  status: string;
  courier: {
    tracking_id: string | null;
    waybill_id: string | null;
    company: string;
    name?: string | null;
    phone?: string | null;
    type?: string;
    link?: string | null;
    history?: Array<{
      note: string;
      status: string;
      updated_at: string;
      service_type?: string;
    }>;
  };
  origin: any;
  destination: any;
  items: any[];
}

export interface BiteshipTrackingResponse {
  success: boolean;
  object: string;
  message: string;
  code: number;
  courier: {
    company: string;
    name: string;
    waybill_id: string;
    link: string; // Link tracking public
  };
  origin: any;
  destination: any;
  history: Array<{
    note: string;
    updated_at: string; // ISO timestamp
    status: string;
  }>;
  status: string; // "confirmed", "allocated", "picking_up", "picked", "dropping_off", "delivered", "cancelled", "rejected", "courier_not_found", "returned"
}

class BiteshipClient {
  private client: AxiosInstance;

  constructor(config: BiteshipConfig) {
    this.client = axios.create({
      baseURL: config.baseURL || BITESHIP_BASE_URL,
      headers: {
        Authorization: config.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  // Search area by postal code, city name, atau district name
  async searchAreas(query: string, types?: string[]): Promise<BiteshipArea[]> {
    const params: Record<string, any> = {
      countries: "ID",
      input: query,
    };

    if (types && types.length > 0) {
      params.types = types.join(","); // "postal_code", "subdistrict", "urban", "city"
    }

    const response = await this.client.get("/maps/areas", { params });

    if (!response.data.success) {
      throw new Error(
        `Biteship searchAreas failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data.areas || [];
  }

  // Get shipping rates dari origin ke destination
  async getRates(
    originPostalCode: number,
    destinationPostalCode: number,
    items: BiteshipRateItem[],
    couriers?: string[] // ["jne", "jnt", "sicepat"]
  ): Promise<BiteshipRatesResponse> {
    const payload: Record<string, any> = {
      origin_postal_code: originPostalCode,
      destination_postal_code: destinationPostalCode,
      items,
    };

    if (couriers && couriers.length > 0) {
      payload.couriers = couriers.join(",");
    }

    const response = await this.client.post("/rates/couriers", payload);

    if (!response.data.success) {
      throw new Error(
        `Biteship getRates failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Create order & auto-generate AWB (nomor resi)
  async createOrder(
    orderData: BiteshipOrderRequest
  ): Promise<BiteshipOrderResponse> {
    const response = await this.client.post("/orders", orderData);

    if (!response.data.success) {
      throw new Error(
        `Biteship createOrder failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Ambil detail order Biteship berdasarkan order id untuk status dan riwayat terbaru
  async getOrder(orderId: string): Promise<BiteshipOrderResponse> {
    const response = await this.client.get(`/orders/${orderId}`);

    if (!response.data.success) {
      throw new Error(
        `Biteship getOrder failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Ambil URL file PDF shipping label resmi dari Biteship
  async getShippingLabel(orderId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/orders/${orderId}/label`);
      return response.data?.shipping_label?.file_url || null;
    } catch {
      return null;
    }
  }

  // Track shipment by order_id (Biteship internal ID)
  async trackByOrderId(orderId: string): Promise<BiteshipTrackingResponse> {
    const response = await this.client.get(`/trackings/${orderId}`);

    if (!response.data.success) {
      throw new Error(
        `Biteship trackByOrderId failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Track shipment by waybill_id (nomor resi) + courier company
  async trackByWaybillId(
    waybillId: string,
    courierCompany: string
  ): Promise<BiteshipTrackingResponse> {
    const payload = {
      waybill_id: waybillId,
      courier_company: courierCompany, // "jne", "jnt", "sicepat"
    };

    const response = await this.client.post("/trackings", payload);

    if (!response.data.success) {
      throw new Error(
        `Biteship trackByWaybillId failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Cancel order (hanya bisa sebelum kurir pickup)
  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    const payload: Record<string, any> = {};
    if (reason) {
      payload.cancellation_reason = reason;
    }

    const response = await this.client.post(
      `/orders/${orderId}/cancel`,
      payload
    );

    return response.data.success || false;
  }
}

// Singleton instance
let biteshipClient: BiteshipClient | null = null;

export function getBiteshipClient(): BiteshipClient {
  if (!process.env.BITESHIP_API_KEY) {
    throw new Error(
      "BITESHIP_API_KEY tidak ditemukan di environment variables"
    );
  }

  if (!biteshipClient) {
    biteshipClient = new BiteshipClient({
      apiKey: process.env.BITESHIP_API_KEY,
    });
  }

  return biteshipClient;
}

// Helper: Mapping Biteship status ke status internal FloraHub
export function mapBiteshipStatus(
  biteshipStatus: string
): "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" {
  const statusMap: Record<
    string,
    "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  > = {
    confirmed: "PENDING",
    allocated: "PROCESSING",
    picking_up: "PROCESSING",
    pickingUp: "PROCESSING",
    picked: "SHIPPED",
    inTransit: "SHIPPED",
    in_transit: "SHIPPED",
    dropping_off: "SHIPPED",
    droppingOff: "SHIPPED",
    on_delivery: "SHIPPED",
    on_hold: "PROCESSING",
    onHold: "PROCESSING",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
    rejected: "CANCELLED",
    courier_not_found: "CANCELLED",
    courierNotFound: "CANCELLED",
    returned: "CANCELLED",
    disposed: "CANCELLED",
  };

  return statusMap[biteshipStatus] || "PENDING";
}

export { BiteshipClient };
