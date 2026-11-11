import { getAllPublicStores } from "@/lib/stores";
import { Store, MapPin, Package, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Daftar Toko Florist - FloraHub",
  description: "Jelajahi toko florist terpercaya di FloraHub dengan karangan bunga segar berkualitas.",
};

// Halaman daftar direktori toko florist rekanan terpercaya
export default async function StoresPage() {
  const stores = await getAllPublicStores();

  return (
    <div className="pb-16 sm:pb-24">
      {/* Banner utama direktori toko florist */}
      <section className="container-custom pt-6 sm:pt-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#10121b] p-8 text-white sm:p-12 lg:p-16 border border-white/10">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Toko Florist Terpercaya
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70 sm:text-lg leading-relaxed">
              Jelajahi berbagai toko bunga profesional di Surabaya, Malang, dan sekitarnya.
              Rangkaian bunga segar langsung dari pengrajin bunga lokal terbaik.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 border border-white/10">
                {stores.length} Toko Bunga Aktif
              </span>
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#09e354] border border-white/10">
                Pengiriman Terjadwal
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid kartu toko florist rekanan */}
      <section className="container-custom mt-12 sm:mt-16">
        <div className="mb-8 flex items-end justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Semua Toko Florist
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih florist terdekat dari lokasi penerima untuk pengiriman bunga segar tercepat
            </p>
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            Menampilkan {stores.length} toko
          </span>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 p-12 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-bold text-foreground">
              Belum ada toko tersedia
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Saat ini belum ada toko florist yang terdaftar. Silakan kunjungi katalog kami untuk melihat pilihan bunga.
            </p>
            <Link href="/products" className="btn-primary mt-6 inline-flex">
              Lihat Katalog Bunga
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store: typeof stores[number]) => {
              const shopName = store.floristProfile?.shopName || store.name;
              const logo = store.floristProfile?.logo || store.image;
              const banner = store.floristProfile?.banner;
              const description = store.floristProfile?.shopDescription;
              const location = store.floristProfile?.defaultAddress;
              const productCount = store.products.length;

              return (
                <Link
                  key={store.id}
                  href={`/stores/${store.id}`}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/30"
                >
                  <div>
                    {/* Banner */}
                    <div className="relative h-44 w-full bg-surface-container-low">
                      {banner ? (
                        <Image
                          src={banner}
                          alt={`Banner ${shopName}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-102"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Store className="h-10 w-10 opacity-30" />
                        </div>
                      )}
                    </div>

                    {/* Store Info */}
                    <div className="p-6">
                      <div className="flex items-start gap-3.5">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container-low">
                          {logo ? (
                            <Image
                              src={logo}
                              alt={shopName}
                              fill
                              className="object-cover"
                              sizes="56px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Store className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-foreground transition-colors group-hover:text-primary">
                            {shopName}
                          </h3>
                          {location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {location.city}, {location.province}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {description && (
                        <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {productCount} Rangkaian Bunga
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                      Lihat Toko
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
