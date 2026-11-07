"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  CalendarClock,
  LogOut,
  Flower2,
  Menu,
  X,
  Store,
  ChevronRight,
  Bell,
  Truck,
  Sprout,
} from "lucide-react";

interface NavigationSection {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navigationSections: NavigationSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/florist/dashboard", icon: LayoutDashboard },
      { name: "Notifikasi", href: "/florist/notifications", icon: Bell },
    ],
  },
  {
    title: "PRODUCTS & INVENTORY",
    items: [
      { name: "Produk Saya", href: "/florist/products", icon: Package },
      { name: "Inventori Bunga", href: "/florist/inventory", icon: Boxes },
    ],
  },
  {
    title: "ORDERS & FULFILLMENT",
    items: [
      { name: "Pesanan Masuk", href: "/florist/orders", icon: ShoppingBag },
      { name: "Pengiriman", href: "/florist/shipments", icon: Truck },
    ],
  },
  {
    title: "PROCUREMENT",
    items: [
      { name: "Rencana Panen", href: "/florist/harvest-plans", icon: Sprout },
    ],
  },
];

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
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary"></div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Memuat dashboard florist...
          </p>
        </div>
      </div>
    );
  }

  if (
    status === "authenticated" &&
    session?.user
  ) {
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "FLORIST" && userRole !== "ADMIN") {
      return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-surface-container-low/40">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-border px-6">
          <Link href="/florist/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Flower2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Flora<span className="text-primary">Hub</span>
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary">
                Florist Portal
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-container lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 mx-4 my-4 rounded-xl bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {session?.user?.name || "Toko Florist"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 px-4 overflow-y-auto py-2">
          {navigationSections.map((section, sectionIdx) => (
            <div key={section.title} className="space-y-1.5">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
                {section.title}
              </h3>
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/florist/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                        : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 text-white/80" />}
                  </Link>
                );
              })}
              {sectionIdx < navigationSections.length - 1 && (
                <div className="h-px bg-border/50 my-3" />
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-error hover:bg-error/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-container lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
              Panel Pengelolaan Florist
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <Store className="h-4 w-4" />
              <span>Lihat Toko Publik</span>
            </Link>
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary">
              {session?.user?.name
                ? session.user.name.charAt(0).toUpperCase()
                : "F"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
