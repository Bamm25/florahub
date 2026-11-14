import prisma from "@/lib/prisma";

// Fungsi untuk mengambil alamat penjemputan kebun supplier (origin Biteship)
export async function getSupplierPickupAddress(userId: string) {
  let address = await prisma.address.findFirst({
    where: { userId, isDefault: true },
  });

  if (!address) {
    address = await prisma.address.findFirst({
      where: { userId },
    });
  }

  // Jika supplier belum memiliki data alamat, daftarkan otomatis sentra kebun bunga
  if (!address) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true },
    });

    address = await prisma.address.create({
      data: {
        userId,
        label: "Kebun Utama",
        recipientName: user?.name || "Kebun Mitra Supplier",
        phone: user?.phone || "081234567898",
        fullAddress: "Jl. Raya Selecta No. 12, Tulungrejo, Kec. Bumiaji",
        city: "Kota Batu",
        province: "Jawa Timur",
        postalCode: "65336",
        isDefault: true,
      },
    });
  }

  return address;
}
