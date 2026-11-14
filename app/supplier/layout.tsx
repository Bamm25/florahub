"use client";

import { Menu, Sprout, X, Bell } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const navigationSections = [
  {
    title: "Operasional",
    items: [
      { name: "Ringkasan", href: "/supplier/dashboard" },
      { name: "Penjualan Stok", href: "/supplier/sales" },
      { name: "Pengiriman", href: "/supplier/shipments" },
      { name: "Notifikasi", href: "/supplier/notifications" },
    ],
  },
  {
    title: "Pasokan",
    items: [
      { name: "Stok Bunga", href: "/supplier/stocks" },
      { name: "Panen & Pre-order", href: "/supplier/harvest-announcements" },
    ],
  },
];

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
      if (res.ok) {
        const json = await res.json();
        setUnreadCount(json.data?.unreadCount ?? 0);
      }
    } catch {
      // Abaikan error polling latar belakang
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const initial = window.setTimeout(() => void fetchUnreadCount(), 0);
      const interval = window.setInterval(() => void fetchUnreadCount(), 30000);
      return () => {
        window.clearTimeout(initial);
        window.clearInterval(interval);
      };
    }
  }, [status, fetchUnreadCount, pathname]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(pathname));
    } else if (status === "authenticated" && session?.user) {
      const userRole = (session.user as { role?: string }).role;
      if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
        router.push("/");
      }
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Memuat area supplier...
          </p>
        </div>
      </div>
    );
  }

  // protect route role
  if (status === "authenticated" && session?.user) {
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPPLIER" && userRole !== "ADMIN") {
      return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f7f9]">
      {/* Overlay latar belakang saat menu mobile terbuka */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar Navigasi Supplier */}
      <aside
        id="supplier-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#10121b] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/supplier/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 leading-tight"
          >
            <Sprout className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white">FloraHub</span>
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
        {/* Informasi Akun Supplier */}
        <div className="border-b border-white/10 px-6 py-5">
          <p className="truncate text-sm font-semibold text-white">
            {session?.user?.name || "Kebun Supplier"}
          </p>
        </div>
        {/* Daftar Tautan Menu Navigasi */}
        <nav
          aria-label="Navigasi supplier"
          className="flex-1 overflow-y-auto px-3 py-5"
        >
          {navigationSections.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <h2 className="mb-2 px-3 text-xs font-semibold text-white/60">
                {section.title}
              </h2>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/supplier/dashboard" &&
                      pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        isActive
                          ? "bg-white/10 font-semibold text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{item.name}</span>
                      {item.href === "/supplier/notifications" && unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {/* Tombol Keluar (Sign Out) */}
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
      {/* Konten Halaman */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
              aria-controls="supplier-navigation"
              aria-expanded={mobileMenuOpen}
              className="rounded-lg p-2 text-foreground hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-semibold text-foreground sm:text-base">
              {session?.user?.name || "Kebun Mitra Supplier"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/supplier/notifications"
              className="relative rounded-xl border border-border bg-surface p-2 text-foreground hover:bg-surface-container transition-colors shadow-2xs"
              title="Notifikasi"
              aria-label="Lihat notifikasi"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
        {/* Tempat Render Sub Halaman */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
