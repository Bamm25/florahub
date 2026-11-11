import prisma from "@/lib/prisma";

// Fetch semua toko florist yang aktif dengan FloristProfile
export async function getAllPublicStores() {
  const florists = await prisma.user.findMany({
    where: {
      role: "FLORIST",
      floristProfile: {
        isActive: true,
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
      floristProfile: {
        select: {
          shopName: true,
          shopDescription: true,
          logo: true,
          banner: true,
          defaultAddress: {
            select: {
              city: true,
              province: true,
            },
          },
        },
      },
      products: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return florists.filter((f) => f.products.length > 0);
}
