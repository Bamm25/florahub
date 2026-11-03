"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/lib/stores/cartStore";
import { useEffect, useState } from "react";
import {
  ShoppingCart,
  User,
  Flower2,
  LogOut,
  Package,
  MapPin,
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-surface/80">
      <div className="container-custom">
        <div className="flex h-20 items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="rounded-xl bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
              <Flower2 className="h-6 w-6 text-primary" />
            </div>
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
              Katalog Bunga
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Tentang Kami
            </Link>
          </nav>

          {/* Cart & Profile */}
          <div className="flex items-center gap-4">
            {/* Cart Icon & Badge */}
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
                        {session.user?.email}
                      </strong>
                    </div>
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
                className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:scale-105"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
