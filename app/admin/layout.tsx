"use client";

import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShoppingBag,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";

const navigationSections = [
  {
    title: "Utama",
    items: [
      { name: "Ringkasan", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Pengawasan Platform",
    items: [
      { name: "Pengguna", href: "/admin/users", icon: Users },
      { name: "Pesanan & Pasokan", href: "/admin/orders", icon: ShoppingBag },
    ],
  },
  {
    title: "Konfigurasi & Audit",
    items: [
      { name: "Promosi & Kupon", href: "/admin/coupons", icon: TicketPercent },
      { name: "Audit Log", href: "/admin/audit-logs", icon: ClipboardList },
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
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <LoadingSpinner message="Memverifikasi hak akses admin..." />
      </div>
    );
  }

  if (status === "authenticated" && session?.user) {
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "ADMIN") {
      return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-surface-dim">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar Admin */}
      <aside
        id="admin-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-surface-dark text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/admin/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 leading-tight"
          >
            <ShieldAlert className="h-6 w-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white">
                FloraHub
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-kicker uppercase">
                Portal Admin
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Menu Navigasi */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                  {section.title}
                </h3>
                <div className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        {/* Profil Akun & Tombol Keluar */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 px-3 py-2">
            <p className="truncate text-xs font-semibold text-white">
              {session?.user?.name || "Administrator"}
            </p>
            <p className="truncate text-[11px] text-white/50">
              {session?.user?.email || "admin@florahub.com"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
      {/* Area Konten Utama */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Mobile */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-surface-container hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Buka menu navigasi"
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-foreground">
            Portal Admin
          </span>
          <div className="w-9" />
        </header>
        {/* Konten Halaman */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
