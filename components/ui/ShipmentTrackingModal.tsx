"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/forms/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TrackingProgressTrack from "@/components/ui/TrackingProgressTrack";
import {
  trackSupplierShipment,
  confirmSupplierShipmentHandover,
  receivePreOrder,
  receiveDirectPurchase,
} from "@/lib/api/supplier";
import { buildSupplierTrackingTimeline } from "@/lib/order-tracking-timeline";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";

const TRACKING_STEPS = ["Siap Dikirim", "Dalam Perjalanan", "Tiba"] as const;

interface ShipmentTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  orderNumber: string;
  orderType?: "PREORDER" | "DIRECT_SALE";
  courierName?: string | null;
  trackingNumber?: string | null;
  currentStatus: string;
  recipientName?: string | null;
  recipientAddress?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  userRole?: "SUPPLIER" | "FLORIST" | "ADMIN";
  onStatusUpdated?: () => void;
}

export default function ShipmentTrackingModal({
  isOpen,
  onClose,
  shipmentId,
  orderNumber,
  orderType = "PREORDER",
  courierName,
  trackingNumber,
  currentStatus,
  recipientName,
  recipientAddress,
  shippedAt,
  deliveredAt,
  userRole = "SUPPLIER",
  onStatusUpdated,
}: ShipmentTrackingModalProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
  const [tracking, setTracking] = useState<Awaited<
    ReturnType<typeof trackSupplierShipment>
  > | null>(null);
  const [activeStatus, setActiveStatus] = useState(currentStatus);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveStatus(currentStatus);
      setError(null);
      setSuccessMsg(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentStatus, shipmentId]);

  const loadTracking = useCallback(async () => {
    if (!shipmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await trackSupplierShipment(shipmentId);
      setTracking(data);
      if (data.orderStatus) {
        setActiveStatus(data.orderStatus);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pelacakan");
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => void loadTracking(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, loadTracking]);

  const handleCopyResi = async (resi: string) => {
    try {
      await navigator.clipboard.writeText(resi);
      setCopiedResi(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedResi(false), 2000);
    } catch {
      // Browser menolak akses clipboard
    }
  };

  const isCancelled = activeStatus === "CANCELLED";
  const isDelivered =
    activeStatus === "DELIVERED" ||
    tracking?.status?.toLowerCase() === "delivered";
  const isShipped =
    isDelivered ||
    activeStatus === "SHIPPED" ||
    ["picking_up", "picked", "dropping_off"].includes(
      tracking?.status?.toLowerCase() || "",
    );

  let activeStepIndex = 0;
  if (isDelivered) activeStepIndex = 2;
  else if (isShipped) activeStepIndex = 1;

  const handleConfirmHandover = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await confirmSupplierShipmentHandover(shipmentId);
      setShowHandoverConfirm(false);
      setActiveStatus("SHIPPED");
      setSuccessMsg(
        "Paket dikonfirmasi telah diserahkan ke kurir dan dalam perjalanan ke florist.",
      );
      await loadTracking();
      onStatusUpdated?.();
    } catch (err) {
      setShowHandoverConfirm(false);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengonfirmasi penyerahan paket ke kurir",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleFloristConfirmReceipt = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (orderType === "PREORDER") {
        await receivePreOrder(shipmentId);
      } else {
        await receiveDirectPurchase(shipmentId);
      }
      setShowReceiptConfirm(false);
      setActiveStatus("DELIVERED");
      setSuccessMsg(
        "Bunga berhasil dikonfirmasi diterima. Stok otomatis masuk ke inventaris toko Anda.",
      );
      await loadTracking();
      onStatusUpdated?.();
    } catch (err) {
      setShowReceiptConfirm(false);
      setError(
        err instanceof Error ? err.message : "Gagal mengonfirmasi penerimaan",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const timelineEvents =
    tracking?.timeline && tracking.timeline.length > 0
      ? tracking.timeline
      : buildSupplierTrackingTimeline({
          orderType,
          orderNumber,
          status: activeStatus,
          flowerName: "Pesanan Bunga",
          quantity: 1,
          supplierName: tracking?.route?.senderName || undefined,
          floristName:
            tracking?.route?.recipientName || recipientName || undefined,
          courier: courierName,
          trackingNumber,
          createdAt:
            tracking?.timestamps?.createdAt ||
            shippedAt ||
            deliveredAt ||
            new Date().toISOString(),
          updatedAt:
            deliveredAt ||
            shippedAt ||
            tracking?.timestamps?.createdAt ||
            new Date().toISOString(),
          shippedAt: tracking?.timestamps?.shippedAt || shippedAt || null,
          deliveredAt: tracking?.timestamps?.deliveredAt || deliveredAt || null,
        });

  const resolvedCourier = tracking?.courier?.company || courierName;
  const courierDisplayName = resolvedCourier
    ? resolvedCourier.toUpperCase()
    : "KURIR EKSPEDISI";
  const resolvedTrackingNumber =
    tracking?.courier?.waybill_id || trackingNumber || null;

  const senderDisplayName =
    tracking?.route?.senderName || "Mitra Kebun Supplier";
  const senderDisplayLocation =
    tracking?.route?.senderLocation || "Dijemput Kurir Ekspedisi";
  const recipientDisplayName =
    tracking?.route?.recipientName || recipientName || "Studio Florist";
  const recipientDisplayLocation =
    tracking?.route?.recipientLocation || recipientAddress || "";

  const headlineTitle = isCancelled
    ? "Pengiriman Dibatalkan"
    : isDelivered
      ? "Bunga Telah Tiba"
      : isShipped
        ? "Dalam Perjalanan"
        : "Menunggu Penjemputan Kurir";

  const hasValidTrackingLink = Boolean(
    tracking?.link && tracking.link.startsWith("https://"),
  );
  const canSupplierHandover =
    userRole === "SUPPLIER" && !isShipped && !isDelivered && !isCancelled;
  const canFloristConfirmReceipt =
    userRole === "FLORIST" && isShipped && !isDelivered && !isCancelled;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        headerVariant="dark"
        bodyClassName="bg-background"
        kicker="Pelacakan Pengiriman"
        title={headlineTitle}
        subtitle={`${orderNumber} · ${courierDisplayName}`}
        headerContent={
          <div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canSupplierHandover && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setShowHandoverConfirm(true);
                  }}
                  className="btn-primary h-10 px-4 py-0 text-xs font-semibold"
                >
                  <span>Serahkan ke Kurir</span>
                </button>
              )}

              {canFloristConfirmReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setShowReceiptConfirm(true);
                  }}
                  className="btn-primary h-10 px-4 py-0 text-xs font-semibold"
                >
                  <span>Pesanan Diterima</span>
                </button>
              )}

              {hasValidTrackingLink && tracking?.link && (
                <a
                  href={tracking.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-sm bg-white px-3.5 text-xs font-semibold text-surface-dark transition-colors hover:bg-white/90"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Peta Kurir</span>
                </a>
              )}

              {shipmentId && (
                <a
                  href={`/api/supplier/shipments/${shipmentId}/label`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center rounded-sm border border-white/15 bg-white/5 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <span>Cetak Label</span>
                </a>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => void loadTracking()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-white/15 bg-white/5 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {loading && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>{loading ? "Memperbarui..." : "Perbarui"}</span>
              </button>
            </div>

            {!isCancelled && (
              <TrackingProgressTrack
                steps={TRACKING_STEPS}
                activeStepIndex={activeStepIndex}
                isCompletedAll={isDelivered}
                ariaLabel="Tahap pengiriman"
              />
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <div aria-live="polite" className="space-y-3">
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs font-semibold underline"
                >
                  Tutup
                </button>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
              >
                <span>{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg(null)}
                  className="text-xs font-semibold underline"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:items-start">
            {/* Kolom Kiri: Pengiriman & Rute */}
            <div className="space-y-4">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-4 border-b border-border pb-3 text-base font-semibold tracking-normal text-foreground">
                  Pengiriman
                </h3>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Kurir</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">
                      {courierDisplayName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Nomor Resi
                    </dt>
                    <dd className="mt-1">
                      {resolvedTrackingNumber ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-container-low px-3.5 py-2.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {resolvedTrackingNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyResi(resolvedTrackingNumber)
                            }
                            aria-label={`Salin nomor resi ${resolvedTrackingNumber}`}
                            className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                          >
                            {copiedResi ? (
                              <>
                                <Check className="h-3 w-3" aria-hidden="true" />
                                <span role="status">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" aria-hidden="true" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Menunggu resi dari kurir
                        </p>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 border-b border-border pb-3 text-base font-semibold tracking-normal text-foreground">
                  Rute Pengiriman
                </h3>
                <dl className="space-y-3.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Pengirim</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {senderDisplayName}
                    </dd>
                    <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {senderDisplayLocation}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Tujuan</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {recipientDisplayName}
                    </dd>
                    {recipientDisplayLocation && (
                      <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {recipientDisplayLocation}
                      </dd>
                    )}
                  </div>
                </dl>
              </section>
            </div>

            {/* Kolom Kanan: Timeline Vertikal */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h3 className="mb-5 border-b border-border pb-3 text-base font-semibold tracking-normal text-foreground">
                Riwayat Pengiriman
              </h3>

              {loading && !tracking ? (
                <div className="space-y-4 py-2">
                  <div className="h-12 animate-pulse rounded-xl bg-surface-container-low" />
                  <div className="h-12 animate-pulse rounded-xl bg-surface-container-low" />
                </div>
              ) : (
                <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
                  {timelineEvents.map((event, index) => {
                    const isFirst = index === 0;
                    const isCancelledEvent = Boolean(event.isCancelled);
                    return (
                      <li key={event.id} className="relative">
                        <span
                          className={`absolute -left-[31px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card ${
                            isCancelledEvent
                              ? "bg-error"
                              : isFirst
                                ? "bg-primary"
                                : "bg-border"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <time
                            dateTime={event.isoDate}
                            className="block text-xs tabular-nums text-muted-foreground"
                          >
                            {event.dateStr} · {event.timeStr}
                          </time>
                          <p
                            className={`mt-0.5 text-sm ${
                              isCancelledEvent
                                ? "font-semibold text-error"
                                : isFirst
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground/80"
                            }`}
                          >
                            {event.statusTitle}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showHandoverConfirm}
        onClose={() => !actionLoading && setShowHandoverConfirm(false)}
        onConfirm={handleConfirmHandover}
        title="Konfirmasi paket diserahkan ke kurir?"
        description="Pastikan paket bunga sudah diambil kurir ekspedisi. Notifikasi perjalanan akan dikirimkan ke florist."
        confirmLabel="Ya, Serahkan"
        cancelLabel="Batal"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showReceiptConfirm}
        onClose={() => !actionLoading && setShowReceiptConfirm(false)}
        onConfirm={handleFloristConfirmReceipt}
        title="Konfirmasi bunga telah diterima?"
        description="Pastikan bunga sudah sampai dengan baik di toko Anda. Setelah dikonfirmasi, stok bunga otomatis masuk ke inventaris studio."
        confirmLabel="Ya, Sudah Diterima"
        cancelLabel="Batal"
        loading={actionLoading}
      />
    </>
  );
}
