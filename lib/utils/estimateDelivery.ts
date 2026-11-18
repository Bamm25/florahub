// Interface informasi lokasi kota dan provinsi untuk estimasi pengiriman
interface LocationInfo {
  city: string;
  province: string;
}

// Fungsi untuk menghitung estimasi hari pengiriman berdasarkan lokasi pelanggan dan florist
export function calculateEstimatedDays(
  customerLocation: LocationInfo,
  floristLocation: LocationInfo,
): number {
  const customerCity = customerLocation.city.toLowerCase().trim();
  const customerProvince = customerLocation.province.toLowerCase().trim();
  const floristCity = floristLocation.city.toLowerCase().trim();
  const floristProvince = floristLocation.province.toLowerCase().trim();

  if (customerCity && floristCity && customerCity === floristCity && customerProvince === floristProvince) {
    return 1;
  }

  if (customerProvince && floristProvince && customerProvince === floristProvince) {
    return 2;
  }

  return 3;
}
