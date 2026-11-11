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
    <main className="min-h-screen bg-surface">
      <section className="border-b border-border bg-gradient-to-br from-surface via-surface-container-low to-primary/5">
        {banner && (
          <div className="relative h-44 w-full bg-surface-container sm:h-64">
            <Image src={banner} alt={`Banner ${shopName}`} fill className="object-cover" sizes="100vw" unoptimized />
          </div>
        )}
        <div className="container-custom py-12">
          <Link href="/products" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </Link>
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
              {logo ? <Image src={logo} alt={shopName} fill className="object-cover" sizes="80px" unoptimized /> : <Store className="h-10 w-10" />}
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-primary">Toko Florist</p>
              <h1 className="text-3xl font-bold text-foreground">{shopName}</h1>
              {location && <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {location.city}, {location.province}</p>}
              {store.floristProfile?.shopDescription && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{store.floristProfile.shopDescription}</p>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="container-custom py-10">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Produk dari {shopName}</h2>
        {store.products.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-container-low px-6 py-14 text-center text-muted-foreground">
            <Flower2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            Belum ada produk aktif di toko ini.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {store.products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
                <div className="relative aspect-square bg-surface-container">
                  {product.image ? <Image src={product.image} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" /> : <div className="flex h-full items-center justify-center text-muted-foreground">Gambar tidak tersedia</div>}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary">{product.name}</h3>
                  {product.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
                  <p className="mt-3 text-xl font-bold text-primary">Rp {product.price.toLocaleString("id-ID")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{product.stock > 0 ? `Stok: ${product.stock}` : "Stok habis"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
