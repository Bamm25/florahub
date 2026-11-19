import prisma from "@/lib/prisma";
import { getAllPublicStores } from "@/lib/public-store";
import { getPublicStoreShowcaseData } from "@/lib/public-store-metrics";
import StoresDirectoryClient, {
  type PublicStoreDirectoryItem,
} from "@/components/customer/StoresDirectoryClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Daftar Toko Florist",
  description:
    "Jelajahi toko florist terpercaya di FloraHub dengan karangan bunga segar berkualitas.",
};

// Halaman daftar direktori toko florist rekanan terpercaya
export default async function StoresPage() {
  const stores = await getAllPublicStores(prisma);
  const showcaseByStoreId = await getPublicStoreShowcaseData(
    prisma,
    stores.map((store) => store.id),
  );

  const distinctCities = new Set(
    stores
      .map((s) => s.floristProfile?.defaultAddress?.city)
      .filter((city): city is string => Boolean(city)),
  );
  const totalProducts = stores.reduce(
    (sum, s) => sum + s._count.products,
    0,
  );

  const serializedStores: PublicStoreDirectoryItem[] = stores.map((store) => {
    const shopName = store.floristProfile?.shopName || store.name;
    const logo = store.floristProfile?.logo || store.image;
    const banner = store.floristProfile?.banner || null;
    const description = store.floristProfile?.shopDescription || null;
    const location = store.floristProfile?.defaultAddress;
    const metrics = showcaseByStoreId[store.id] ?? {
      previewImages: [],
      categories: [],
      minPrice: null,
      totalSold: 0,
      averageRating: null,
      reviewCount: 0,
      activeProductCount: store._count.products,
    };

    return {
      id: store.id,
      shopName,
      logo,
      banner,
      description,
      city: location?.city ?? null,
      province: location?.province ?? null,
      productCount: store._count.products,
      metrics,
    };
  });

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Directory Header */}
      <section className="border-b border-white/10 bg-surface-dark py-12 text-white sm:py-16 lg:py-20">
        <div className="container-custom grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-end lg:gap-12">
          <div>
            <p className="text-xs font-medium tracking-[0.04em] text-kicker">
              Direktori Toko
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Toko Florist{" "}
              <span className="font-display font-normal italic text-kicker">
                Lokal
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Pilih toko bunga di sekitar kota tujuan pengiriman Anda.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/12 bg-white/[0.04] p-5 text-left">
            <div>
              <p className="text-xs text-white/60">Toko</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {stores.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Kota</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {distinctCities.size || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Produk</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {totalProducts}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid & Filter Direktori Studio */}
      <section className="container-custom mt-10 sm:mt-14">
        <div className="@container">
          <StoresDirectoryClient stores={serializedStores} />
        </div>
      </section>
    </main>
  );
}
