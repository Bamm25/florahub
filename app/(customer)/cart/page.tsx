"use client";

import CartTable from "@/components/customer/CartTable";
import { useCartStore } from "@/lib/stores/cartStore";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.getTotal());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Keranjang Belanja
      </h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CartTable />
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Ringkasan Belanja
            </h2>
            <div className="space-y-3 border-b border-gray-200 pb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({items.length} produk)</span>
                <span className="font-medium text-gray-900">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Biaya Admin</span>
                <span className="font-medium text-gray-900">Rp 0</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span className="text-emerald-600">
                Rp {total.toLocaleString("id-ID")}
              </span>
            </div>
            <Link
              href="/checkout"
              className={`mt-6 block w-full rounded-lg py-3 text-center text-sm font-semibold transition ${
                items.length === 0
                  ? "cursor-not-allowed bg-gray-300 text-gray-500"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
              onClick={(e) => {
                if (items.length === 0) e.preventDefault();
              }}
            >
              Lanjut ke Pembayaran
            </Link>
            <Link
              href="/"
              className="mt-3 block text-center text-sm text-emerald-600 underline hover:text-emerald-700"
            >
              ← Lanjut Belanja
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
