import prisma from "@/lib/prisma";
import { getPublicStore } from "@/lib/public-store";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Flower2, MapPin, Store } from "lucide-react";

// Tampilkan profil florist dan katalog aktif yang dimiliki toko ini.
export default async function PublicStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getPublicStore(prisma, id);
  if (!store) notFound();
  const shopName = store.floristProfile?.shopName || store.name;
  const logo = store.floristProfile?.logo || store.image;
  const banner = store.floristProfile?.banner;
  const location = store.floristProfile?.defaultAddress;

  return (
    <main className="pb-16 sm:pb-24">
      {/* Store Header Section */}
      <section className="border-b border-border bg-surface">
        {banner && (
          <div className="relative h-48 w-full bg-surface-container-low sm:h-72">
            <Image
              src={banner}
              alt={`Banner ${shopName}`}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized
            />
          </div>
        )}

        <div className="container-custom py-8 sm:py-10">
          <nav aria-label="Navigasi" className="mb-6">
            <Link
              href="/stores"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Semua Toko Florist
            </Link>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-container-low sm:h-24 sm:w-24">
              {logo ? (
                <Image
                  src={logo}
                  alt={shopName}
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                />
              ) : (
                <Store className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-surface-container-low px-3 py-0.5 text-xs font-semibold text-foreground">
                  Toko Florist Terverifikasi
                </span>
                {location && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-0.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {location.city}, {location.province}
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                {shopName}
              </h1>

              {store.floristProfile?.shopDescription && (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {store.floristProfile.shopDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="container-custom mt-10 sm:mt-12">
        <div className="mb-8 flex items-end justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Koleksi Rangkaian Bunga
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rangkaian bunga segar siap kirim dari {shopName}
            </p>
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {store.products.length} produk
          </span>
        </div>

        {store.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 px-6 py-16 text-center">
            <Flower2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
            <h3 className="text-base font-bold text-foreground">
              Belum ada produk aktif di toko ini
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Florist ini sedang mempersiapkan koleksi bunga terbaru. Silakan periksa kembali nanti.
            </p>
            <Link href="/products" className="btn-secondary mt-6 inline-flex h-11 px-6 text-sm">
              Jelajahi Bunga Lainnya
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {store.products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/30"
              >
                <div>
                  <div className="relative aspect-square w-full bg-surface-container-low">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-102"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Gambar tidak tersedia
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border px-5 py-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Harga</span>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      Rp {product.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    {product.stock > 0 ? (
                      <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        Stok {product.stock}
                      </span>
                    ) : (
                      <span className="rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error">
                        Stok habis
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
