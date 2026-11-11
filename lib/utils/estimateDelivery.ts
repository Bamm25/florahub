// Interface informasi lokasi kota dan provinsi untuk estimasi pengiriman
interface LocationInfo {
  city: string;
  province: string;
}

// Fungsi untuk menghitung estimasi hari pengiriman berdasarkan lokasi pelanggan dan florist
export function calculateEstimatedDays(
  customerLocation: LocationInfo,
  floristLocation: LocationInfo
): number {
  const customerCity = customerLocation.city.toLowerCase().trim();
  const customerProvince = customerLocation.province.toLowerCase().trim();
  const floristCity = floristLocation.city.toLowerCase().trim();
  const floristProvince = floristLocation.province.toLowerCase().trim();

  // Check if locations are in Jawa Timur
  const isCustomerJatim = customerProvince.includes('jawa timur') || 
                          customerProvince.includes('east java');
  const isFloristJatim = floristProvince.includes('jawa timur') || 
                         floristProvince.includes('east java');

  // Customer not in Jawa Timur - default to 3 days
  if (!isCustomerJatim) {
    return 3;
  }

  // Both in Jawa Timur
  if (isFloristJatim) {
    // Same city within Jawa Timur
    if (customerCity === floristCity) {
      return 1;
    }
    // Different city, same province (Jawa Timur)
    return 2;
  }

  // Customer in Jawa Timur, florist outside
  return 3;
}
