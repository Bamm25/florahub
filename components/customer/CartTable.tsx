"use client";

import { useCartStore } from "@/lib/stores/cartStore";
import { Trash2, Plus, Minus } from "lucide-react";
import Image from "next/image";

export default function CartTable() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  if (items.length === 0) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <div className="mb-4 rounded-full bg-gray-200 p-6">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Keranjang belanja kosong
        </h3>
        <p className="mb-6 text-sm text-gray-600">
          Mulai berbelanja bunga segar pilihan terbaik!
        </p>
        <a
          href="/"
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Lihat Katalog Bunga
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
              Produk
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-600">
              Harga
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-600">
              Jumlah
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-600">
              Subtotal
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-600">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.productId} className="transition hover:bg-gray-50">
              <td className="px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Stok tersedia: {item.stock}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                Rp {item.price.toLocaleString("id-ID")}
              </td>

              <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        Math.max(1, item.quantity - 1),
                      )
                    }
                    disabled={item.quantity <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={item.quantity}
                    onChange={(e) => {
                      const newQty = parseInt(e.target.value, 10);
                      if (!isNaN(newQty)) {
                        updateQuantity(
                          item.productId,
                          Math.min(Math.max(1, newQty), item.stock),
                        );
                      }
                    }}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        Math.min(item.quantity + 1, item.stock),
                      )
                    }
                    disabled={item.quantity >= item.stock}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </td>

              <td className="px-4 py-4 text-center text-sm font-semibold text-gray-900">
                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
              </td>

              <td className="px-4 py-4 text-center">
                <button
                  onClick={() => removeItem(item.productId)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-red-600 transition hover:bg-red-50"
                  aria-label={`Hapus ${item.name}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
