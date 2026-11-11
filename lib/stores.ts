import prisma from "@/lib/prisma";

// Fungsi untuk mengambil semua profil toko florist aktif yang memiliki produk
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

  return florists.filter((f: any) => f.products.length > 0);
}
