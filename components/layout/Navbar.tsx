"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/lib/stores/cartStore";
import { useState, useSyncExternalStore } from "react";
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
} from "lucide-react";

// Komponen navigasi utama aplikasi dengan menu responsif dan autentikasi peran
export default function Navbar() {
  const { data: session, status } = useSession();
  const itemCount = useCartStore((state) => state.getItemCount());
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if user is florist
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBusiness = role === "FLORIST" || role === "SUPPLIER" || role === "ADMIN";
  const isCustomer = role === "CUSTOMER";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Flora<span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-base font-medium">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Beranda
            </Link>
            <Link
              href="/products"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Katalog
            </Link>
            <Link
              href="/stores"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Toko
            </Link>

          </nav>

          {/* Cart & Profile */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-primary"
              aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white animate-in zoom-in-50">
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
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card py-1 shadow-lg ring-1 ring-black/5 z-50">
                    <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                      Masuk sebagai{" "}
                      <strong className="text-foreground block truncate">
                        {session.user?.name || "Akun"}
                      </strong>
                    </div>
                    {isBusiness ? (
                      <Link
                        href={role === "FLORIST" ? "/florist/dashboard" : "/"}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container"
                      >
                        <Home className="h-4 w-4 text-muted-foreground" />
                        {role === "FLORIST" ? "Area florist" : "Beranda"}
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
        <div className="md:hidden border-t border-outline-variant bg-surface shadow-lg">
          <nav className="container-custom py-4 flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
            >
              <Home className="h-5 w-5 text-muted-foreground" />
              Beranda
            </Link>
            <Link
              href="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
            >
              <Store className="h-5 w-5 text-muted-foreground" />
              Katalog
            </Link>
            <Link
              href="/stores"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
            >
              <Store className="h-5 w-5 text-muted-foreground" />
              Toko
            </Link>
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
                    href={role === "FLORIST" ? "/florist/dashboard" : "/"}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-surface-container rounded-lg transition-colors"
                  >
                    <Home className="h-5 w-5 text-muted-foreground" />
                    {role === "FLORIST" ? "Area florist" : "Beranda"}
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
