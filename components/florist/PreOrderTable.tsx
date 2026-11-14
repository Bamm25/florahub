import React, { useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils/formatters";
import { getSupplierShipmentLabel } from "@/lib/api/supplier";
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
}

// Komponen tabel riwayat pre-order florist ke supplier beserta status konfirmasi
export default function PreOrderTable({
  preOrders,
  onPayDeposit,
  onPayFinal,
  payingOrderId,
  onReceiveOrder,
  isReceivingId,
}: PreOrderTableProps) {
  const [trackingOrder, setTrackingOrder] = useState<PreOrder | null>(null);

  const handlePrintLabel = async (order: PreOrder) => {
    try {
      if (order.biteshipLabelUrl) {
        window.open(order.biteshipLabelUrl, "_blank");
        return;
      }
      const labelUrl = await getSupplierShipmentLabel(order.id);
      if (labelUrl) {
        window.open(labelUrl, "_blank");
      } else {
        alert("Label pengiriman Biteship belum tersedia");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuka label pengiriman");
    }
  };

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
                Pembayaran & Aksi
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
                  {order.biteshipOrderId ? <SupplierDeliveryStatus status={order.status} booked={true} /> : <StatusBadge status={order.status} variant="preorder" />}
                </td>
                <td className="px-4 py-3">
                  {order.status === "PENDING" && (
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-amber-700">
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {payingOrderId === order.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Membuka Midtrans...</span>
                          </>
                        ) : (
                          <span>
                            Bayar DP 50% ({formatRupiah(order.depositAmount || 0)})
                          </span>
                        )}
                      </button>
                      {order.depositDeadline && (
                        <p className="text-[11px] text-amber-700 font-medium">
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {payingOrderId === order.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                        DP 50% Lunas • Batas pelunasan: {order.finalDeadline ? formatDate(order.finalDeadline) : formatDate(order.announcement?.harvestDate ?? "")}
                      </p>
                    </div>
                  )}

                  {order.status === "PAID" && !order.biteshipOrderId && (
                    <p className="text-xs text-muted-foreground">
                      Menunggu supplier mengemas & menerbitkan resi Biteship
                    </p>
                  )}

                  {order.status === "PAID" && order.biteshipOrderId && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {order.courier && <span className="font-semibold text-foreground">{order.courier}</span>}
                        {order.trackingNumber && <span> • Resi: {order.trackingNumber}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTrackingOrder(order)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors"
                        >
                          <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Lacak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintLabel(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-surface-container text-foreground transition-colors"
                          title="Cetak Label Pengiriman AWB"
                        >
                          <Printer className="h-3.5 w-3.5 text-primary" />
                          <span>Label</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === "SHIPPED" && order.biteshipOrderId && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {order.courier && <span className="font-semibold text-foreground">{order.courier}</span>}
                        {order.trackingNumber && <span> • Resi: {order.trackingNumber}</span>}
                        {order.shippedAt && (
                          <span className="text-sky-700"> • Dijemput: {formatDate(order.shippedAt)}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTrackingOrder(order)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Navigation className="h-3.5 w-3.5 text-primary" />
                          <span>Lacak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintLabel(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-surface-container text-foreground transition-colors"
                          title="Cetak Label Pengiriman AWB"
                        >
                          <Printer className="h-3.5 w-3.5 text-primary" />
                          <span>Label</span>
                        </button>
                        <button
                          type="button"
                          disabled={isReceivingId === order.id}
                          onClick={() => onReceiveOrder?.(order)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                        >
                          {isReceivingId === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Konfirmasi Bunga Diterima</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === "DELIVERED" && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {order.courier && <span className="font-semibold text-foreground">{order.courier}</span>}
                        {order.trackingNumber && <span> • Resi: {order.trackingNumber}</span>}
                        {order.deliveredAt && (
                          <span className="text-muted-foreground font-medium"> • Tiba: {formatDate(order.deliveredAt)}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {order.biteshipOrderId && (
                          <>
                            <button
                              type="button"
                              onClick={() => setTrackingOrder(order)}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Navigation className="h-3.5 w-3.5 text-primary" />
                              <span>Riwayat Pengiriman</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintLabel(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-surface-container text-foreground transition-colors"
                              title="Cetak Label Pengiriman AWB"
                            >
                              <Printer className="h-3.5 w-3.5 text-primary" />
                              <span>Label</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {order.status === "CANCELLED" && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs">
                      <p className="font-semibold text-rose-800">
                        Ditolak / Dibatalkan
                      </p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Alasan:{" "}
                        {order.cancelReason || "Dibatalkan oleh supplier"}
                      </p>
                    </div>
                  )}

                  {order.status === "EXPIRED" && (
                    <div className="rounded-lg bg-gray-100 border border-gray-200 p-2 text-xs">
                      <p className="font-semibold text-gray-700">Kedaluwarsa</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Batas waktu pembayaran DP 50% (3 hari) telah terlewati
                      </p>
                    </div>
                  )}
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
            if (onReceiveOrder) {
              onReceiveOrder(trackingOrder);
            }
          }}
        />
      )}
    </div>
  );
}
