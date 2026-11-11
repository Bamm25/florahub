// Klien API Biteship untuk pengelolaan resi pengiriman dan pelacakan paket
import axios from "axios";
import type { AxiosInstance } from "axios";

// URL dasar endpoint API Biteship sesuai lingkungan aplikasi
const BITESHIP_BASE_URL =
  process.env.BITESHIP_ENV === "production"
    ? "https://api.biteship.com/v1"
    : "https://api.biteship.com/v1"; // Sandbox: ubah saat Biteship provide sandbox URL

// Interface konfigurasi kredensial klien Biteship
interface BiteshipConfig {
  apiKey: string;
  baseURL?: string;
}

// Interface data wilayah administrasi dari API Biteship
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

// Interface spesifikasi barang untuk perhitungan tarif ongkos kirim
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

// Interface tarif dan layanan kurir pengiriman dari API Biteship
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

// Interface respons daftar tarif kurir dari API Biteship
export interface BiteshipRatesResponse {
  success: boolean;
  object: string;
  message: string;
  code: number;
  origin: BiteshipArea;
  destination: BiteshipArea;
  pricing: Array<BiteshipCourierRate>;
}

// Interface muatan data permintaan pembuatan order penjemputan kurir Biteship
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

// Interface data respons pesanan pengiriman dari API Biteship
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

// Interface data pelacakan pengiriman kurir dari API Biteship
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

// Kelas klien HTTP untuk interaksi langsung dengan layanan API Biteship
class BiteshipClient {
  private client: AxiosInstance;

  // Konstruktor inisialisasi instance klien axios Biteship
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

  // Metode pencarian wilayah berdasarkan kode pos atau nama lokasi
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

  // Metode untuk mendapatkan estimasi tarif ongkir kurir pengiriman
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

  // Metode untuk membuat order pengiriman dan menerbitkan nomor resi
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

  // Metode untuk mengambil rincian pesanan pengiriman Biteship berdasarkan ID
  async getOrder(orderId: string): Promise<BiteshipOrderResponse> {
    const response = await this.client.get(`/orders/${orderId}`);

    if (!response.data.success) {
      throw new Error(
        `Biteship getOrder failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Metode untuk mendapatkan URL berkas label resi pengiriman format PDF
  async getShippingLabel(orderId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/orders/${orderId}/label`);
      return response.data?.shipping_label?.file_url || null;
    } catch {
      return null;
    }
  }

  // Metode untuk melacak status paket berdasarkan ID pesanan Biteship
  async trackByOrderId(orderId: string): Promise<BiteshipTrackingResponse> {
    const response = await this.client.get(`/trackings/${orderId}`);

    if (!response.data.success) {
      throw new Error(
        `Biteship trackByOrderId failed: ${response.data.message || "Unknown error"}`
      );
    }

    return response.data;
  }

  // Metode untuk melacak paket berdasarkan nomor resi kurir dan nama ekspedisi
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

  // Metode untuk membatalkan pesanan penjemputan kurir Biteship
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

// Instance tunggal klien Biteship untuk digunakan di seluruh aplikasi
let biteshipClient: BiteshipClient | null = null;

// Fungsi untuk mengembalikan instance tunggal klien API Biteship
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

// Fungsi pemetaan status pengiriman Biteship ke status internal pesanan FloraHub
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
