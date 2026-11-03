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
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Flower2 className="h-7 w-7 text-emerald-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Flora<span className="text-emerald-600">Hub</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="transition hover:text-emerald-600">
            Katalog Bunga
          </Link>
          <Link href="/about" className="transition hover:text-emerald-600">
            Tentang Kami
          </Link>
        </nav>

        {/* Cart & Profile */}
        <div className="flex items-center gap-4">
          {/* Cart Icon & Badge */}
          <Link
            href="/cart"
            aria-label="Keranjang Belanja"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && itemCount > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white animate-in zoom-in-50">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          {/* Authentication Section */}
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : session ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-200 p-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {session.user?.name || "Akun"}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5 z-50">
                  <div className="border-b px-4 py-2 text-xs text-gray-500">
                    Masuk sebagai{" "}
                    <strong className="text-gray-700 block truncate">
                      {session.user?.email}
                    </strong>
                  </div>
                  <Link
                    href="/orders"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Package className="h-4 w-4 text-gray-500" />
                    Pesanan Saya
                  </Link>

                  <Link
                    href="/profile/addresses"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Alamat Saya
                  </Link>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
