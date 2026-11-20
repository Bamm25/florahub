"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Bell, ExternalLink } from "lucide-react";
import { getFloristProfile } from "@/lib/api/florist";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { LoadingSpinner } from "@/components/ui";

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
      { name: "Pasokan Kebun", href: "/florist/supplier-stocks" },
      { name: "Rencana Panen", href: "/florist/harvest-plans" },
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
  const [liveShopName, setLiveShopName] = useState<string | null>(null);
  const unreadCount = useUnreadNotificationCount(status, pathname);

  const activeNavItem = navigationSections
    .flatMap((section) =>
      section.items.map((item) => ({ ...item, sectionTitle: section.title })),
    )
    .find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/florist/dashboard" &&
          pathname.startsWith(item.href + "/")),
    );

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (status !== "authenticated" || userRole !== "FLORIST") return;

    const controller = new AbortController();
    void getFloristProfile(controller.signal)
      .then((profileData) => {
        if (!controller.signal.aborted && profileData?.profile?.shopName) {
          setLiveShopName(profileData.profile.shopName);
        }
      })
      .catch(() => {
        // Abaikan error sementara saat memuat nama toko
      });

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ shopName?: string }>).detail;
      if (detail?.shopName) {
        setLiveShopName(detail.shopName);
      }
    };

    window.addEventListener("florahub:florist-profile-updated", handleProfileUpdated);
    return () => {
      controller.abort();
      window.removeEventListener(
        "florahub:florist-profile-updated",
        handleProfileUpdated,
      );
    };
  }, [status, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(pathname));
    } else if (
      status === "authenticated" &&
      session?.user
    ) {
      const userRole = (session.user as { role?: string }).role;
      if (userRole !== "FLORIST" ) {
        router.push("/");
      }
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <LoadingSpinner message="Memuat area florist..." />
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "FLORIST" ) {
    return null;
  }

  const displayShopName = liveShopName || session?.user?.name || "Toko florist";

  return (
    <div className="flex min-h-dvh bg-surface-dim">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="florist-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-surface-dark text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/florist/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 leading-tight"
          >
            <span className="text-xl font-bold tracking-tight text-white">
              FloraHub
            </span>
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-kicker">
              Studio
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-white/10 px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Toko Florist
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {displayShopName}
          </p>
        </div>

        <nav aria-label="Navigasi florist" className="flex-1 overflow-y-auto px-3 py-5">
          {navigationSections.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                {section.title}
              </h2>
              <div className="space-y-1">
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
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        isActive
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{item.name}</span>
                      {item.href === "/florist/notifications" && unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold tabular-nums text-warning-foreground">
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

        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-18 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
              aria-controls="florist-navigation"
              aria-expanded={mobileMenuOpen}
              className="rounded-lg p-2 text-foreground hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="truncate font-semibold text-foreground">
                {displayShopName}
              </span>
              {activeNavItem && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">
                    /
                  </span>
                  <span className="truncate text-muted-foreground">
                    {activeNavItem.name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/florist/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:bg-surface-container-low"
              title="Notifikasi"
              aria-label="Lihat notifikasi"
            >
              <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold tabular-nums text-warning-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href={`/stores/${(session?.user as { id?: string } | undefined)?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
            >
              <span>Lihat toko</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
