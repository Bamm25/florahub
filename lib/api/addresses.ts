import { fetchJson } from "./client";

// Interface representasi data alamat pelanggan
interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface respons API untuk daftar alamat pelanggan dengan paginasi
interface AddressesResponse {
  success: boolean;
  message: string;
  data: {
    items: Address[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Interface respons API untuk operasi data alamat tunggal
interface AddressResponse {
  success: boolean;
  message: string;
  data: {
    address: Address;
  };
}

// Fungsi untuk mengambil daftar alamat pelanggan dari API
export async function getAddresses(signal?: AbortSignal): Promise<AddressesResponse> {
  return fetchJson<AddressesResponse>("/api/customer/addresses", {
    method: "GET",
    credentials: "include",
    signal,
  });
}

// Fungsi untuk membuat alamat baru pelanggan melalui API
export async function createAddress(data: {
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
}): Promise<AddressResponse> {
  return fetchJson<AddressResponse>("/api/customer/addresses", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(data),
  });
}

// Fungsi untuk memperbarui data alamat pelanggan berdasarkan ID
export async function updateAddress(
  addressId: string,
  data: {
    label?: string;
    recipientName?: string;
    phone?: string;
    fullAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    isDefault?: boolean;
  },
): Promise<AddressResponse> {
  return fetchJson<AddressResponse>(
    `/api/customer/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "PUT",
      credentials: "include",
      body: JSON.stringify(data),
    },
  );
}

// Fungsi untuk menghapus alamat pelanggan berdasarkan ID
export async function deleteAddress(
  addressId: string,
): Promise<{ success: boolean; message: string }> {
  return fetchJson<{ success: boolean; message: string }>(
    `/api/customer/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
}
