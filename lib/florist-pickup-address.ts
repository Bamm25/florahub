import prisma from "@/lib/prisma";

// Fungsi untuk mengambil alamat penjemputan utama milik florist
export async function getFloristPickupAddress(userId: string) {
  const profile = await prisma.floristProfile.findUnique({
    where: { userId },
    select: { defaultAddressId: true },
  });
  if (!profile?.defaultAddressId) return null;
  return prisma.address.findFirst({
    where: { id: profile.defaultAddressId, userId, isDefault: true },
  });
}
