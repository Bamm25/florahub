import React from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils/formatters";

// Interface data pre-order bunga ke supplier
interface PreOrder {
  id: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  announcement: {
    id: string;
    flowerName: string;
    variety: string | null;
    harvestDate: string;
    supplier: {
      id: string;
      name: string;
      email: string;
    };
  };
}

// Props interface untuk komponen tabel riwayat pre-order
interface PreOrderTableProps {
  preOrders: PreOrder[];
}

// Komponen tabel riwayat pre-order florist ke supplier beserta status konfirmasi
export default function PreOrderTable({ preOrders }: PreOrderTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[760px]">
          <thead className="bg-[#181720] border-b border-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Bunga & Varietas
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Supplier Kebun
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Kuantitas
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Total Harga
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Jadwal Panen
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Waktu Pesan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {Array.isArray(preOrders) && preOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-surface-container-low/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">
                      {order.announcement?.flowerName ?? 'Unknown'}
                    </p>
                    {order.announcement?.variety && (
                      <p className="text-xs text-muted-foreground">
                        {order.announcement.variety}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    {order.announcement?.supplier?.name ?? 'Unknown'}
                  </p>
                </td>
                <td scope="col" className="px-4 py-3 text-center">
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {order.quantity ?? 0}
                  </span>
                </td>
                <td scope="col" className="px-4 py-3 text-right">
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatRupiah(order.totalPrice ?? 0)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.announcement?.harvestDate ?? '')}
                  </p>
                </td>
                <td scope="col" className="px-4 py-3 text-center">
                  <StatusBadge status={order.status} variant="preorder" />
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatDateTime(order.createdAt)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
