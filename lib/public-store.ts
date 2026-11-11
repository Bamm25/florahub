type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  image: string;
};

// Ambil identitas toko dan hanya produk aktif milik florist yang dituju.
export async function getPublicStore<
  Store extends {
    id: string;
    name: string;
    image: string | null;
    floristProfile: {
      shopName: string;
      shopDescription: string | null;
      logo: string | null;
      banner: string | null;
      defaultAddress: { city: string; province: string } | null;
    } | null;
    products: PublicProduct[];
  },
>(
  db: {
    user: {
      findFirst: (args: {
        where: { id: string; role: "FLORIST"; isActive: true };
        select: {
          id: true;
          name: true;
          image: true;
          floristProfile: {
            select: {
              shopName: true;
              shopDescription: true;
              logo: true;
              banner: true;
              defaultAddress: { select: { city: true; province: true } };
            };
          };
          products: {
            where: { floristId: string; isActive: true };
            select: {
              id: true;
              name: true;
              slug: true;
              description: true;
              price: true;
              stock: true;
              image: true;
            };
            orderBy: { createdAt: "desc" };
          };
        };
      }) => Promise<Store | null>;
    };
  },
  floristId: string,
): Promise<Store | null> {
  if (!/^[a-z0-9]{25}$/.test(floristId)) return null;
  return db.user.findFirst({
    where: { id: floristId, role: "FLORIST", isActive: true },
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
          defaultAddress: { select: { city: true, province: true } },
        },
      },
      products: {
        where: { floristId, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          stock: true,
          image: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
