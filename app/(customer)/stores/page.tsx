import { getAllPublicStores } from "@/lib/stores";
import { Store, MapPin, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Daftar Toko Florist - FloraHub",
  description: "Jelajahi berbagai toko florist terpercaya di FloraHub",
};

export default async function StoresPage() {
  const stores = await getAllPublicStores();

  return (
    <div className="min-h-screen bg-surface">
      {/* Header Section */}
      <section className="border-b border-border bg-gradient-to-br from-surface via-surface-container-low to-primary/5 py-16">
        <div className="container-custom">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-foreground lg:text-4xl">
              Daftar Toko Florist
            </h1>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl">
            Temukan berbagai toko florist terpercaya dengan koleksi bunga segar dan berkualitas untuk berbagai kebutuhan Anda.
          </p>
        </div>
      </section>

      {/* Stores Grid */}
      <section className="py-12">
        <div className="container-custom">
          {stores.length === 0 ? (
            <div className="text-center py-16">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">
                Belum ada toko tersedia
              </p>
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
                    className="group card-elevated overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02]"
                  >
                    {/* Banner or Placeholder */}
                    <div className="relative h-40 w-full bg-gradient-to-br from-primary/10 to-primary/5">
                      {banner ? (
                        <Image
                          src={banner}
                          alt={`Banner ${shopName}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Store className="h-16 w-16 text-primary/20" />
                        </div>
                      )}
                    </div>

                    {/* Store Info */}
                    <div className="p-5 space-y-3">
                      {/* Logo & Name */}
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border-2 border-border bg-surface-container">
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
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {shopName}
                          </h2>
                          {location && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {location.city}, {location.province}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {description}
                        </p>
                      )}

                      {/* Product Count */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {productCount} Produk
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
