"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Edit, RefreshCw, FileText, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { isValidShippingLabelUrl } from "@/lib/config/domain";
import { formatDateTime, formatRupiah } from "@/lib/utils/formatters";

// Tipe data pengiriman untuk daftar shipment florist
export interface Shipment {
  id: string;
  orderId: string;
  courier: string;
  service: string | null;
  trackingNumber: string | null;
  status: string;
  estimatedDays: number | null;
  shippingCost: number;
  weight: number | null;
  biteshipOrderId?: string | null;
  biteshipLabelUrl?: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  destinationAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    user: {
      name: string;
      email: string;
    };
  };
}

// Props interface untuk komponen tabel pengiriman florist
interface ShipmentTableProps {
  shipments: Shipment[];
  onEdit: (shipment: Shipment) => void;
  onSync?: (shipment: Shipment) => Promise<void> | void;
  syncingId?: string | null;
}

// Komponen tabel daftar pengiriman florist dengan aksi sinkronisasi Biteship dan cetak label
export function ShipmentTable({
  shipments,
  onEdit,
  onSync,
  syncingId,
}: ShipmentTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyResi = (id: string, resi: string) => {
    void navigator.clipboard.writeText(resi);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-surface-container-low/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Pesanan
              </th>
              <th scope="col" className="px-5 py-3.5">
                Customer
              </th>
              <th scope="col" className="px-5 py-3.5">
                Kurir & Layanan
              </th>
              <th scope="col" className="px-5 py-3.5">
                Nomor Resi (AWB)
              </th>
              <th scope="col" className="px-5 py-3.5 text-center">
                Status
              </th>
              <th scope="col" className="px-5 py-3.5">
                Waktu Dibuat
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.isArray(shipments) &&
              shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="transition-colors hover:bg-surface-container-low/40"
                >
                  <td className="px-5 py-4">
                    {shipment.order?.id ? (
                      <Link
                        href={`/florist/orders/${shipment.order.id}`}
                        className="font-mono text-xs font-bold text-foreground hover:text-primary hover:underline"
                      >
                        {shipment.order.orderNumber}
                      </Link>
                    ) : (
                      <p className="font-mono text-xs font-bold text-foreground">
                        {shipment.order?.orderNumber ?? "N/A"}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formatRupiah(shipment.order?.totalAmount ?? 0)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">
                      {shipment.order?.user?.name ?? "Unknown"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {shipment.order?.user?.email ?? "N/A"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-foreground">
                        {shipment.courier}
                      </p>
                      {shipment.biteshipOrderId && (
                        <span className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Biteship
                        </span>
                      )}
                    </div>
                    {shipment.service && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {shipment.service}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {shipment.trackingNumber ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {shipment.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyResi(shipment.id, shipment.trackingNumber!)
                          }
                          aria-label={`Salin resi ${shipment.trackingNumber}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {copiedId === shipment.id ? (
                            <Check
                              className="h-3.5 w-3.5 text-success"
                              aria-hidden="true"
                            />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={shipment.status} variant="shipment" />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-muted-foreground">
                    <time dateTime={shipment.createdAt}>
                      {formatDateTime(shipment.createdAt)}
                    </time>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {/* Tombol sinkron status pengiriman otomatis dari Biteship */}
                      {shipment.biteshipOrderId && onSync && (
                        <button
                          type="button"
                          onClick={() => onSync(shipment)}
                          disabled={
                            syncingId === shipment.id ||
                            shipment.status === "DELIVERED" ||
                            shipment.status === "CANCELLED"
                          }
                          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-primary/30 bg-card px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Sinkronkan status dari Biteship"
                        >
                          {syncingId === shipment.id ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>Sinkron</span>
                        </button>
                      )}

                      {/* Tombol cetak shipping label untuk pengiriman Biteship maupun Manual */}
                      {(Boolean(shipment.id) ||
                        Boolean(shipment.biteshipOrderId) ||
                        isValidShippingLabelUrl(shipment.biteshipLabelUrl)) && (
                        <a
                          href={`/api/florist/shipments/${shipment.id}/label`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                          title="Buka atau cetak label pengiriman (AWB)"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Label</span>
                        </a>
                      )}

                      {/* NOTE: CANCELLED shipments cannot be edited by design. For corrections, contact admin. */}
                      <button
                        type="button"
                        onClick={() => onEdit(shipment)}
                        disabled={
                          shipment.status === "DELIVERED" ||
                          shipment.status === "CANCELLED"
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Update</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
