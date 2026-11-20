"use client";

import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { FloraHubMark } from "@/components/ui/FloraHubLogo";

const navigationSections = [
  {
    title: "Utama",
    items: [
      { name: "Ringkasan", href: "/admin/dashboard" },
    ],
  },
  {
    title: "Pengawasan Platform",
    items: [
      { name: "Pengguna", href: "/admin/users" },
      { name: "Pesanan & Pasokan", href: "/admin/orders" },
    ],
  },
  {
    title: "Konfigurasi & Audit",
    items: [
      { name: "Promosi & Kupon", href: "/admin/coupons" },
      { name: "Audit Log", href: "/admin/audit-logs" },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeNavItem = navigationSections
    .flatMap((section) =>
      section.items.map((item) => ({ ...item, sectionTitle: section.title })),
    )
    .find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/admin/dashboard" &&
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
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(pathname));
    } else if (status === "authenticated" && session?.user) {
      const userRole = (session.user as { role?: string }).role;
      if (userRole !== "ADMIN") {
        router.push("/");
      }
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <LoadingSpinner message="Memverifikasi hak akses admin..." />
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") {
    return null;
  }

  const displayAdminName = session?.user?.name || "Administrator";

  return (
    <div className="flex min-h-dvh bg-surface-dim">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 cursor-pointer bg-foreground/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Admin */}
      <aside
        id="admin-navigation"
        className={`fixed inset-y-3 left-3 z-50 flex w-64 flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-dark text-white [color-scheme:dark] transition-transform duration-200 lg:sticky lg:top-4 lg:my-4 lg:ml-4 lg:h-[calc(100dvh-2rem)] lg:shrink-0 lg:self-start lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <Link
            href="/admin/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 leading-tight"
          >
            <FloraHubMark className="h-7 w-7" variant="dark" />
            <span className="text-xl font-bold tracking-tight text-white">
              Flora<span className="font-display font-normal italic text-kicker">Hub</span>
            </span>
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-kicker">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-sm p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Informasi Akun Admin */}
        <div className="mx-4 mb-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs">
          <p className="text-white/60">Portal Admin</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">
            {displayAdminName}
          </p>
        </div>

        {/* Menu Navigasi */}
        <nav
          aria-label="Navigasi admin"
          className="sidebar-dark-scroll flex-1 overflow-y-auto border-t border-white/10 px-4 py-3"
        >
          {navigationSections.map((section) => (
            <div key={section.title} className="mt-3 border-t border-white/10 pt-3 first:mt-0 first:border-t-0 first:pt-0">
              <h2 className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {section.title}
              </h2>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" &&
                      pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center rounded-xl px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        isActive
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Tombol Keluar */}
        <div className="border-t border-white/10 p-3.5">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/80 transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Bar Sticky */}
        <header className="sticky top-0 z-30 flex min-h-18 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xs p-2 text-foreground transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
              aria-label="Buka menu navigasi"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-navigation"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="truncate font-semibold text-foreground">
                Portal Admin
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
              href="/admin/audit-logs"
              className="hidden items-center rounded-sm border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low sm:inline-flex"
            >
              Audit Log
            </Link>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
