import React, { useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils/formatters";
import { Loader2, CheckCircle2, Navigation, Printer } from "lucide-react";

// Interface data pre-order bunga ke supplier
export interface PreOrder {
  id: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  depositAmount?: number | null;
  depositDeadline?: string | null;
  depositProof?: string | null;
  depositPaidAt?: string | null;
  remainingAmount?: number | null;
  finalProof?: string | null;
  finalPaidAt?: string | null;
  finalDeadline?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  biteshipOrderId?: string | null;
  biteshipLabelUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
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
  onPayDeposit?: (order: PreOrder) => void;
  onPayFinal?: (order: PreOrder) => void;
  payingOrderId?: string | null;
  onReceiveOrder?: (order: PreOrder) => void;
  isReceivingId?: string | null;
  onRefresh?: () => void;
}

// Komponen tabel riwayat pre-order florist ke supplier beserta status konfirmasi
export default function PreOrderTable({
  preOrders,
  onPayDeposit,
  onPayFinal,
  payingOrderId,
  onReceiveOrder,
  isReceivingId,
  onRefresh,
}: PreOrderTableProps) {
  const [trackingOrder, setTrackingOrder] = useState<PreOrder | null>(null);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-border bg-surface-container-low/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left">
                  Bunga & Varietas
                </th>
                <th scope="col" className="px-4 py-3.5 text-left">
                  Supplier Kebun
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Kuantitas
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Total Harga
                </th>
                <th scope="col" className="px-4 py-3.5 text-left">
                  Jadwal Panen
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="px-4 py-3.5 text-left">
                  Pembayaran & Aksi
                </th>
                <th scope="col" className="px-4 py-3.5 text-left">
                  Waktu Pesan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {Array.isArray(preOrders) &&
                preOrders.map((order) => {
                  const hasShipmentInfo = Boolean(
                    order.biteshipOrderId ||
                      order.trackingNumber ||
                      order.courier,
                  );

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-surface-container-low/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">
                            {order.announcement?.flowerName ?? "Unknown"}
                          </p>
                          {order.announcement?.variety && (
                            <p className="text-xs text-muted-foreground">
                              {order.announcement.variety}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {order.announcement?.supplier?.name ?? "Unknown"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono font-semibold tabular-nums text-foreground">
                          {order.quantity ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono font-semibold tabular-nums text-foreground">
                          {formatRupiah(order.totalPrice ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs tabular-nums text-muted-foreground">
                          <time dateTime={order.announcement?.harvestDate ?? ""}>
                            {formatDate(order.announcement?.harvestDate ?? "")}
                          </time>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {order.biteshipOrderId ? (
                          <SupplierDeliveryStatus
                            status={order.status}
                            booked={true}
                          />
                        ) : (
                          <StatusBadge
                            status={order.status}
                            variant="preorder"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {order.status === "PENDING" && (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-warning">
                              Menunggu Persetujuan
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Supplier sedang meninjau kuota kebun
                            </p>
                          </div>
                        )}

                        {order.status === "CONFIRMED" && (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              disabled={payingOrderId === order.id}
                              onClick={() => onPayDeposit?.(order)}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              {payingOrderId === order.id ? (
                                <>
                                  <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                  />
                                  <span>Membuka Midtrans...</span>
                                </>
                              ) : (
                                <span>
                                  Bayar DP 50% (
                                  {formatRupiah(order.depositAmount || 0)})
                                </span>
                              )}
                            </button>
                            {order.depositDeadline && (
                              <p className="text-[11px] font-medium text-warning">
                                Batas bayar: {formatDate(order.depositDeadline)}
                              </p>
                            )}
                          </div>
                        )}

                        {order.status === "DEPOSIT_PAID" && (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              disabled={payingOrderId === order.id}
                              onClick={() => onPayFinal?.(order)}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              {payingOrderId === order.id ? (
                                <>
                                  <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                  />
                                  <span>Membuka Midtrans...</span>
                                </>
                              ) : (
                                <span>
                                  Bayar Pelunasan (
                                  {formatRupiah(order.remainingAmount || 0)})
                                </span>
                              )}
                            </button>
                            <p className="text-[11px] text-muted-foreground">
                              DP 50% Lunas · Batas pelunasan:{" "}
                              {order.finalDeadline
                                ? formatDate(order.finalDeadline)
                                : formatDate(
                                    order.announcement?.harvestDate ?? "",
                                  )}
                            </p>
                          </div>
                        )}

                        {order.status === "PAID" && !hasShipmentInfo && (
                          <p className="text-xs text-muted-foreground">
                            Menunggu supplier mengemas & menerbitkan resi pengiriman
                          </p>
                        )}

                        {order.status === "PAID" && hasShipmentInfo && (
                          <div className="space-y-1.5">
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {order.courier && (
                                <span className="font-semibold text-foreground">
                                  {order.courier}
                                </span>
                              )}
                              {order.trackingNumber && (
                                <span> · Resi: {order.trackingNumber}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setTrackingOrder(order)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                              >
                                <Navigation
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <span>Lacak</span>
                              </button>
                              <a
                                href={`/api/supplier/shipments/${order.id}/label`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                                title="Cetak Label Pengiriman AWB"
                              >
                                <Printer
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <span>Label</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {order.status === "SHIPPED" && (
                          <div className="space-y-1.5">
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {order.courier && (
                                <span className="font-semibold text-foreground">
                                  {order.courier}
                                </span>
                              )}
                              {order.trackingNumber && (
                                <span> · Resi: {order.trackingNumber}</span>
                              )}
                              {order.shippedAt && (
                                <span className="text-info">
                                  {" "}
                                  · Dijemput: {formatDate(order.shippedAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {hasShipmentInfo && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setTrackingOrder(order)}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                                  >
                                    <Navigation
                                      className="h-3.5 w-3.5 text-primary"
                                      aria-hidden="true"
                                    />
                                    <span>Lacak</span>
                                  </button>
                                  <a
                                    href={`/api/supplier/shipments/${order.id}/label`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                                    title="Cetak Label Pengiriman AWB"
                                  >
                                    <Printer
                                      className="h-3.5 w-3.5 text-primary"
                                      aria-hidden="true"
                                    />
                                    <span>Label</span>
                                  </a>
                                </>
                              )}
                              <button
                                type="button"
                                disabled={isReceivingId === order.id}
                                onClick={() => onReceiveOrder?.(order)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-xl bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
                              >
                                {isReceivingId === order.id ? (
                                  <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <CheckCircle2
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                )}
                                <span>Konfirmasi Bunga Diterima</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {order.status === "DELIVERED" && (
                          <div className="space-y-1.5">
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {order.courier && (
                                <span className="font-semibold text-foreground">
                                  {order.courier}
                                </span>
                              )}
                              {order.trackingNumber && (
                                <span> · Resi: {order.trackingNumber}</span>
                              )}
                              {order.deliveredAt && (
                                <span className="font-medium text-muted-foreground">
                                  {" "}
                                  · Tiba: {formatDate(order.deliveredAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {hasShipmentInfo && (
                                <button
                                  type="button"
                                  onClick={() => setTrackingOrder(order)}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                                >
                                  <Navigation
                                    className="h-3.5 w-3.5 text-primary"
                                    aria-hidden="true"
                                  />
                                  <span>Riwayat Pengiriman</span>
                                </button>
                              )}
                              <a
                                href={`/api/supplier/shipments/${order.id}/label`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                                title="Cetak Label Pengiriman AWB"
                              >
                                <Printer
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <span>Label</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {order.status === "CANCELLED" && (
                          <div className="rounded-xl border border-error/25 bg-error/10 p-2.5 text-xs">
                            <p className="font-semibold text-error">
                              Ditolak / Dibatalkan
                            </p>
                            <p className="mt-0.5 text-[11px] text-error/90">
                              Alasan:{" "}
                              {order.cancelReason || "Dibatalkan oleh supplier"}
                            </p>
                          </div>
                        )}

                        {order.status === "EXPIRED" && (
                          <div className="rounded-xl border border-border bg-surface-container p-2.5 text-xs">
                            <p className="font-semibold text-foreground">
                              Kedaluwarsa
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Batas waktu pembayaran DP 50% (3 hari) telah terlewati
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          <time dateTime={order.createdAt}>
                            {formatDateTime(order.createdAt)}
                          </time>
                        </p>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PELACAKAN PENGIRIMAN UNTUK FLORIST */}
      {trackingOrder && (
        <ShipmentTrackingModal
          isOpen={Boolean(trackingOrder)}
          onClose={() => setTrackingOrder(null)}
          shipmentId={trackingOrder.id}
          orderNumber={`PO-${trackingOrder.id.slice(-8).toUpperCase()}`}
          orderType="PREORDER"
          courierName={trackingOrder.courier}
          trackingNumber={trackingOrder.trackingNumber}
          currentStatus={trackingOrder.status}
          recipientName="Toko Bunga Florist"
          shippedAt={trackingOrder.shippedAt}
          deliveredAt={trackingOrder.deliveredAt}
          userRole="FLORIST"
          onStatusUpdated={() => {
            setTrackingOrder(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
