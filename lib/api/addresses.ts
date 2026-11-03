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

interface AddressResponse {
  success: boolean;
  message: string;
  data: {
    address: Address;
  };
}

// Get all addresses
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

// Create new address
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

// Update address
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

// Delete address
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
