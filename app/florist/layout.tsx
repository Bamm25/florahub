"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Struktur menu navigasi sidebar operasional florist
const navigationSections = [
  {
    title: "Operasional",
    items: [
      { name: "Ringkasan", href: "/florist/dashboard" },
      { name: "Pesanan", href: "/florist/orders" },
      { name: "Pengiriman", href: "/florist/shipments" },
      { name: "Notifikasi", href: "/florist/notifications" },
    ],
  },
  {
    title: "Katalog & stok",
    items: [
      { name: "Produk", href: "/florist/products" },
      { name: "Bahan Baku & Stok", href: "/florist/inventory" },
      { name: "Rencana panen", href: "/florist/harvest-plans" },
    ],
  },
  {
    title: "Toko",
    items: [{ name: "Profil & alamat", href: "/florist/settings/shop" }],
  },
];

// Layout utama portal operasional florist dengan sidebar responsif
export default function FloristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(pathname));
    } else if (
      status === "authenticated" &&
      session?.user
    ) {
      const userRole = (session.user as { role?: string }).role;
      if (userRole !== "FLORIST" && userRole !== "ADMIN") {
        router.push("/");
      }
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Memuat area florist...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && session?.user) {
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "FLORIST" && userRole !== "ADMIN") {
      return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f7f9]">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="florist-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#10121b] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-6">
          <Link href="/florist/dashboard" onClick={() => setMobileMenuOpen(false)} className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-white">FloraHub</span>
            <span className="block text-xs text-white/60">Area florist</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/10 px-6 py-5">
          <p className="truncate text-sm font-semibold text-white">
            {session?.user?.name || "Toko florist"}
          </p>
          <p className="truncate text-xs text-white/60">{session?.user?.email}</p>
        </div>

        <nav aria-label="Navigasi florist" className="flex-1 overflow-y-auto px-3 py-5">
          {navigationSections.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <h2 className="mb-2 px-3 text-xs font-semibold text-white/60">
                {section.title}
              </h2>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/florist/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        isActive
                          ? "bg-white/10 font-semibold text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
              aria-controls="florist-navigation"
              aria-expanded={mobileMenuOpen}
              className="rounded-lg p-2 text-foreground hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-semibold text-foreground sm:text-base">
              {session?.user?.name || "Area florist"}
            </span>
          </div>
          <Link
            href={`/stores/${(session?.user as { id?: string } | undefined)?.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
          >
            Lihat toko
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
