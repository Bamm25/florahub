import Link from "next/link";

// Komponen footer informasi platform dan navigasi tautan
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#090a10] text-white">
      <div className="container-custom py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand & Overview */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white">
              Flora<span className="text-[#b4aeff]">Hub</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Platform florikultura modern yang menghubungkan kebun bunga, perangkai florist lokal, dan pelanggan dalam satu rantai pasok terintegrasi.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-white/80">
                Surabaya & Malang
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-[#09e354]">
                Bunga Segar Terkurasi
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            {/* Belanja */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
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
        <div className="mt-12 border-t border-white/10 pt-8 text-xs text-white/50">
          <p>© {currentYear} FloraHub. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
