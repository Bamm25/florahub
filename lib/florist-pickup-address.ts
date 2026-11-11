import prisma from "@/lib/prisma";

// Ambil alamat pickup default milik florist yang valid.
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
