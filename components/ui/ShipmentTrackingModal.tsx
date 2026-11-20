"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/forms/Modal";
import {
  trackSupplierShipment,
  simulateShipmentStatus,
  receivePreOrder,
  receiveDirectPurchase,
} from "@/lib/api/supplier";
import { buildSupplierTrackingTimeline } from "@/lib/order-tracking-timeline";
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Building,
} from "lucide-react";

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
  const [tracking, setTracking] = useState<Awaited<
    ReturnType<typeof trackSupplierShipment>
  > | null>(null);
  const [activeStatus, setActiveStatus] = useState(currentStatus);

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveStatus(currentStatus), 0);
    return () => window.clearTimeout(timer);
  }, [currentStatus]);

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

  const handleCopyResi = (resi: string) => {
    void navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    window.setTimeout(() => setCopiedResi(false), 2000);
  };

  // Hitung langkah stepper aktif (0-3)
  const isDelivered =
    activeStatus === "DELIVERED" || tracking?.status?.toLowerCase() === "delivered";
  const isShipped =
    isDelivered ||
    activeStatus === "SHIPPED" ||
    ["picking_up", "picked", "dropping_off"].includes(
      tracking?.status?.toLowerCase() || "",
    );
  const isBooked = true;

  let currentStep = 1;
  if (isDelivered) currentStep = 3;
  else if (isShipped) currentStep = 2;
  else if (isBooked) currentStep = 1;

  const steps = [
    {
      title: "Pesanan & Pembayaran",
      desc: "Pembayaran terverifikasi",
      icon: Package,
    },
    {
      title: "Resi Diterbitkan",
      desc: `Kurir ${courierName || "ekspedisi"} dikonfirmasi`,
      icon: RefreshCw,
    },
    {
      title: "Dalam Perjalanan",
      desc: isShipped
        ? "Paket sedang menuju toko florist"
        : "Menunggu penjemputan kurir",
      icon: Truck,
    },
    {
      title: "Bunga Diterima",
      desc: isDelivered
        ? "Tiba di toko & masuk inventaris"
        : "Menunggu paket tiba",
      icon: CheckCircle2,
    },
  ];

  const handleSimulate = async (target: "SHIPPED" | "DELIVERED") => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await simulateShipmentStatus(shipmentId, target);
      setActiveStatus(target);
      setSuccessMsg(
        target === "SHIPPED"
          ? "Status kurir diperbarui: Paket Dijemput & Dalam Perjalanan!"
          : "Status kurir diperbarui: Paket Telah Diterima Florist & Stok Ditambahkan!",
      );
      await loadTracking();
      onStatusUpdated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui status kurir",
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
      setActiveStatus("DELIVERED");
      setSuccessMsg(
        "Bunga berhasil dikonfirmasi diterima! Stok bunga masuk ke inventaris Anda.",
      );
      await loadTracking();
      onStatusUpdated?.();
    } catch (err) {
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

  const senderDisplayName =
    tracking?.route?.senderName || "Mitra Kebun Supplier";
  const senderDisplayLocation =
    tracking?.route?.senderLocation || "Dijemput Kurir Ekspedisi";
  const recipientDisplayName =
    tracking?.route?.recipientName || recipientName || "Studio Florist";
  const recipientDisplayLocation =
    tracking?.route?.recipientLocation || recipientAddress || "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      headerVariant="dark"
      kicker="Pelacakan Pengiriman"
      title={orderNumber}
      subtitle={`Kurir: ${courierName || "Kurir Ekspedisi"}`}
    >
      <div className="space-y-6">
        {/* Resi & Salin + Cetak Label */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-container-lowest p-3.5">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nomor Resi Pengiriman (AWB)
            </span>
            <p className="font-mono text-sm font-bold text-foreground">
              {trackingNumber || "Resi sedang diterbitkan"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {trackingNumber && (
              <button
                type="button"
                onClick={() => handleCopyResi(trackingNumber)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container"
              >
                {copiedResi ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="text-primary">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Salin Resi</span>
                  </>
                )}
              </button>
            )}
            {shipmentId && (
              <a
                href={`/api/supplier/shipments/${shipmentId}/label`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Cetak Label</span>
              </a>
            )}
          </div>
        </div>

        {/* Pesan Sukses / Error */}
        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-3 rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success">
            {successMsg}
          </div>
        )}

        {/* Stepper Progress Visual (Mirip Customer Tracking) */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Tahapan Perjalanan Bunga
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isPastOrCurrent = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 shadow-xs"
                      : isPastOrCurrent
                      ? "border-success/30 bg-success/10"
                      : "border-border bg-surface opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isPastOrCurrent
                          ? "bg-success text-white"
                          : "bg-surface-container text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground font-mono">
                      0{idx + 1}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-foreground leading-tight">
                      {step.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informasi Rute Pengiriman (Asal Kebun -> Studio Florist) */}
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Rute Pengiriman
          </h4>
          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <Building
                className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-foreground">
                  {senderDisplayName}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {senderDisplayLocation}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-foreground">
                  {recipientDisplayName}
                </p>
                {recipientDisplayLocation && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {recipientDisplayLocation}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Riwayat Pengiriman Lengkap (Start -> End) */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Riwayat Aktivitas Logistik
            </h3>
            <button
              type="button"
              disabled={loading}
              onClick={loadTracking}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Perbarui Status</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2
                className="h-6 w-6 animate-spin text-primary"
                aria-hidden="true"
              />
            </div>
          ) : (
            <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
              {timelineEvents.map((event, idx) => {
                const isLatest = idx === 0;
                const isCancelledEvent = Boolean(event.isCancelled);
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute -left-[30px] top-1 h-3 w-3 rounded-full border-2 ${
                        isCancelledEvent
                          ? "border-error bg-error"
                          : isLatest
                            ? "border-primary bg-primary ring-4 ring-primary/15"
                            : "border-border bg-surface"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <time
                        dateTime={event.isoDate}
                        className="text-xs font-medium tabular-nums text-muted-foreground"
                      >
                        {event.dateStr} · {event.timeStr}
                      </time>
                      {isLatest && (
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          Status Terkini
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 text-sm font-bold ${
                        isCancelledEvent ? "text-error" : "text-foreground"
                      }`}
                    >
                      {event.statusTitle}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {event.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          {tracking?.link && tracking.link.startsWith("https://") && (
            <a
              href={tracking.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline hover:text-primary/80"
            >
              <span>Peta Pelacakan Kurir</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Tindakan Status: Konfirmasi Florist & Kontrol Supplier */}
        <div className="mt-6 border-t border-border pt-4 space-y-3">
          {/* SISI FLORIST: Konfirmasi Bunga Telah Tiba di Toko (Proof of Receipt) */}
          {userRole === "FLORIST" && !isDelivered && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isShipped
                    ? "Apakah bunga pesanan sudah tiba di toko Anda?"
                    : "Paket Menunggu Penjemputan Kurir dari Kebun Supplier"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isShipped
                    ? "Tekan tombol ini setelah Anda menerima fisik bunga untuk menyelesaikan pesanan dan memasukkan stok ke inventaris toko Anda."
                    : "Supplier sedang mengemas pesanan. Konfirmasi penerimaan akan aktif setelah kurir menjemput dan mengantar bunga."}
                </p>
              </div>
              {isShipped && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleFloristConfirmReceipt}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs shrink-0"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Konfirmasi Bunga Diterima</span>
                </button>
              )}
            </div>
          )}

          {/* Kontrol simulasi hanya tampil di mode development bila flag diaktifkan */}
          {process.env.NEXT_PUBLIC_ENABLE_BITESHIP_SIMULATOR === "true" &&
            (userRole === "SUPPLIER" || userRole === "ADMIN") && (
            <div className="rounded-xl border border-dashed border-warning/40 bg-warning/10 p-4">
              <p className="text-xs font-semibold text-foreground">Simulasi pengiriman</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!isShipped && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSimulate("SHIPPED")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-warning/15 disabled:opacity-50 transition-colors"
                  >
                    <Truck className="h-3.5 w-3.5 text-warning" />
                    <span>Simulasikan penjemputan</span>
                  </button>
                )}
                {!isDelivered && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSimulate("DELIVERED")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>Simulasikan tiba</span>
                  </button>
                )}
                {isDelivered && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Pengiriman selesai</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
