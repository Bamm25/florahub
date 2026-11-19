"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/lib/stores/cartStore";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import CustomerNotifications from "./CustomerNotifications";
import {
  ShoppingCart,
  User,
  LogOut,
  Package,
  MapPin,
  Menu,
  X,
  Home,
  Store,
  Bell,
} from "lucide-react";

// Komponen navigasi utama aplikasi dengan menu responsif dan autentikasi peran
export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const itemCount = useCartStore((state) => state.getItemCount());
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuId = useId();
  const mobileMenuId = useId();

  useEffect(() => {
    if (!isDropdownOpen && !isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isDropdownOpen, isMobileMenuOpen]);

  // Check if user is florist
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBusiness =
    role === "FLORIST" || role === "SUPPLIER" || role === "ADMIN";
  const isCustomer = role === "CUSTOMER";

  const navItems = [
    { href: "/", label: "Beranda", icon: Home },
    { href: "/products", label: "Katalog", icon: Store },
    { href: "/stores", label: "Toko", icon: Store },
  ];

  const isNavActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Flora<span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Navigation Links (plain tab-order links, non-color underline active state) */}
          <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-8 text-base font-medium">
            {navItems.map((item) => {
              const isActive = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative py-2 transition-colors ${
                    isActive
                      ? "font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Cart & Profile */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-primary"
              aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls={mobileMenuId}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Cart Icon & Badge - Only for non-florist users */}
            {!isBusiness && (
              <Link
                href="/cart"
                aria-label="Keranjang Belanja"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-primary"
              >
                <ShoppingCart className="h-5 w-5" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold tabular-nums text-primary-foreground animate-in zoom-in-50">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}

            {isCustomer && <CustomerNotifications />}

            {/* Authentication Section */}
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-surface-container" />
            ) : session ? (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  aria-controls={accountMenuId}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {session.user?.name || "Akun"}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div
                    id={accountMenuId}
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card py-1 ring-1 ring-black/5 z-50"
                  >
                    <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                      Masuk sebagai{" "}
                      <strong className="text-foreground block truncate">
                        {session.user?.name || "Akun"}
                      </strong>
                    </div>
                    {isBusiness ? (
                      <Link
                        href={
                          role === "FLORIST"
                            ? "/florist/dashboard"
                            : role === "SUPPLIER"
                              ? "/supplier/dashboard"
                              : "/admin/dashboard"
                        }
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container"
                      >
                        <Home className="h-4 w-4 text-muted-foreground" />
                        {role === "FLORIST"
                          ? "Dashboard Florist"
                          : role === "SUPPLIER"
                            ? "Dashboard Supplier"
                            : "Dashboard Admin"}
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          Profil Saya
                        </Link>

                        <Link
                          href="/orders"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container"
                        >
                          <Package className="h-4 w-4 text-muted-foreground" />
                          Pesanan Saya
                        </Link>

                        <Link
                          href="/notifications"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container"
                        >
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          Notifikasi
                        </Link>

                        <Link
                          href="/profile/addresses"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Alamat Saya
                        </Link>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-error transition-colors hover:bg-error/5"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-primary/90 "
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div id={mobileMenuId} className="md:hidden border-t border-outline-variant bg-surface">
          <nav aria-label="Navigasi seluler" className="container-custom py-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-base rounded-lg transition-colors ${
                    isActive
                      ? "border-l-2 border-primary bg-surface-container font-semibold text-foreground"
                      : "font-medium text-foreground hover:bg-surface-container"
                  }`}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {item.label}
                </Link>
              );
            })}
            {!isBusiness && (
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
              >
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                Keranjang
                {mounted && itemCount > 0 && (
                  <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {session && (
              <>
                <div className="h-px bg-border my-2" />
                {isBusiness ? (
                  <Link
                    href={
                      role === "FLORIST"
                        ? "/florist/dashboard"
                        : role === "SUPPLIER"
                          ? "/supplier/dashboard"
                          : "/admin/dashboard"
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
                  >
                    <Home className="h-5 w-5 text-muted-foreground" />
                    {role === "FLORIST"
                      ? "Dashboard Florist"
                      : role === "SUPPLIER"
                        ? "Dashboard Supplier"
                        : "Dashboard Admin"}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                      Profil Saya
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
                    >
                      <Package className="h-5 w-5 text-muted-foreground" />
                      Pesanan Saya
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
                    >
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      Notifikasi
                    </Link>
                    <Link
                      href="/profile/addresses"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
                    >
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      Alamat Saya
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-base font-medium text-error hover:bg-error/5 rounded-lg transition-colors text-left w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Keluar
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
