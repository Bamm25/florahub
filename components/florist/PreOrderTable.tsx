import React from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils/formatters";

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

interface PreOrderTableProps {
  preOrders: PreOrder[];
}

/**
 * PreOrderTable component
 * Table for displaying florist pre-orders with status badges
 */
export default function PreOrderTable({ preOrders }: PreOrderTableProps) {
  const statusVariants: Record<string, "preorder"> = {
    PENDING: "preorder",
    CONFIRMED: "preorder",
    CANCELLED: "preorder",
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Bunga
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Supplier
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Total Harga
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Tanggal Panen
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Dibuat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.isArray(preOrders) && preOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-surface-container-low/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
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
                  <p className="text-sm text-foreground">
                    {order.announcement?.supplier?.name ?? 'Unknown'}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {order.quantity ?? 0}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatRupiah(order.totalPrice ?? 0)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.announcement?.harvestDate ?? '')}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={order.status} variant="preorder" />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">
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
