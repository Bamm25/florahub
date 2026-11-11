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
export async function getAddresses(): Promise<AddressesResponse> {
  const response = await fetch("/api/customer/addresses", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal memuat daftar alamat");
  }

  return response.json();
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
  const response = await fetch("/api/customer/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal menambahkan alamat");
  }

  return response.json();
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
  const response = await fetch(`/api/customer/addresses/${addressId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal mengubah alamat");
  }

  return response.json();
}

// Fungsi untuk menghapus alamat pelanggan berdasarkan ID
export async function deleteAddress(
  addressId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/customer/addresses/${addressId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Gagal menghapus alamat");
  }

  return response.json();
}
