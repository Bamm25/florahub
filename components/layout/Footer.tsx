import Link from "next/link";

// Komponen footer informasi platform dan navigasi tautan
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-surface-darker text-white">
      <div className="container-custom py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand & Overview */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white">
              Flora<span className="font-display font-normal italic text-kicker">Hub</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Belanja bunga segar langsung dari florist lokal.
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            {/* Belanja */}
            <div>
              <p className="text-xs font-medium tracking-[0.04em] text-kicker">
                Belanja
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/products" className="transition-colors hover:text-white">
                    Katalog Bunga
                  </Link>
                </li>
                <li>
                  <Link href="/stores" className="transition-colors hover:text-white">
                    Toko Florist
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="transition-colors hover:text-white">
                    Keranjang Belanja
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kemitraan */}
            <div>
              <p className="text-xs font-medium tracking-[0.04em] text-kicker">
                Kemitraan
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/auth/register?role=FLORIST" className="transition-colors hover:text-white">
                    Daftar Jadi Florist
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register?role=SUPPLIER" className="transition-colors hover:text-white">
                    Daftar Jadi Supplier
                  </Link>
                </li>
                <li>
                  <Link href="/florist/dashboard" className="transition-colors hover:text-white">
                    Portal Florist
                  </Link>
                </li>
                <li>
                  <Link href="/supplier/dashboard" className="transition-colors hover:text-white">
                    Portal Supplier
                  </Link>
                </li>
              </ul>
            </div>

            {/* Akun & Bantuan */}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs font-medium tracking-[0.04em] text-kicker">
                Akun
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/orders" className="transition-colors hover:text-white">
                    Pesanan Saya
                  </Link>
                </li>
                <li>
                  <Link href="/notifications" className="transition-colors hover:text-white">
                    Notifikasi
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="transition-colors hover:text-white">
                    Masuk Akun
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="transition-colors hover:text-white">
                    Registrasi Baru
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Baris Hak Cipta */}
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-8 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} FloraHub.</p>
          <p>Surabaya &amp; Malang</p>
        </div>
      </div>
    </footer>
  );
}
