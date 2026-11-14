"use client";

import { useCallback, useEffect, useState } from "react";
import {
  trackSupplierShipment,
  simulateShipmentStatus,
  receivePreOrder,
  receiveDirectPurchase,
} from "@/lib/api/supplier";
import { formatDateTime } from "@/lib/utils/formatters";
import {
  Navigation,
  X,
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

  if (!isOpen) return null;

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
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
  const isBooked = true; // Selama modal tracking dibuka, booking Biteship sudah terbit

  let currentStep = 1;
  if (isDelivered) currentStep = 3;
  else if (isShipped) currentStep = 2;
  else if (isBooked) currentStep = 1;

  const steps = [
    {
      title: "Pesanan & Pembayaran",
      desc: "Lunas 100% via Midtrans",
      icon: Package,
    },
    {
      title: "Booking Biteship",
      desc: `Resi terbit (${courierName || "Kurir"})`,
      icon: RefreshCw,
    },
    {
      title: "Kurir Menjemput",
      desc: isShipped ? "Dalam perjalanan ke florist" : "Menunggu penjemputan",
      icon: Truck,
    },
    {
      title: "Bunga Diterima",
      desc: isDelivered ? "Tiba di toko bunga florist" : "Menunggu paket tiba",
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
      setSuccessMsg("Bunga berhasil dikonfirmasi diterima! Stok bunga masuk ke inventaris Anda.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Pelacakan Pengiriman: {orderNumber}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kurir: <strong>{courierName || "Biteship Kurir"}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-container transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resi & Salin */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-container-lowest p-3.5">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nomor Resi Pengiriman (AWB)
            </span>
            <p className="font-mono text-sm font-bold text-foreground">
              {trackingNumber || "Resi sedang diterbitkan"}
            </p>
          </div>
          {trackingNumber && (
            <button
              type="button"
              onClick={() => handleCopyResi(trackingNumber)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-container transition-colors"
            >
              {copiedResi ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Resi</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Pesan Sukses / Error */}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
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
                      ? "border-indigo-500 bg-indigo-50/40 shadow-xs"
                      : isPastOrCurrent
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-border bg-surface opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        isCurrent
                          ? "bg-indigo-600 text-white"
                          : isPastOrCurrent
                          ? "bg-emerald-600 text-white"
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

        {/* Informasi Rute Pengiriman (Asal Kebun ➔ Toko Florist) */}
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Rute Pengiriman
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <Building className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Lokasi Pengirim (Kebun Supplier)</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Mitra Kebun FloraHub • Dijemput Kurir
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Tujuan (Toko Bunga Florist)</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {recipientName ? <strong>{recipientName}</strong> : "Florist Mitra"}
                  {recipientAddress && ` • ${recipientAddress}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Riwayat Biteship Aktual */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Riwayat Aktivitas Logistik
            </h3>
            <button
              type="button"
              disabled={loading}
              onClick={loadTracking}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Perbarui Status</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : !tracking || !tracking.history || tracking.history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              Booking kurir Biteship telah berhasil dibuat dan resi telah diterbitkan. Menunggu pembaruan penjemputan dari kurir.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {(tracking.history as { location?: string; description?: string; time?: string; note?: string; status?: string; updated_at?: string; date?: string }[]).map((entry, idx: number) => {
                const isLatest = idx === 0;
                return (
                  <div key={idx} className="relative">
                    <span
                      className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 ${
                        isLatest
                          ? "border-emerald-600 bg-emerald-600 ring-4 ring-emerald-100"
                          : "border-zinc-300 bg-surface"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-xs leading-relaxed ${
                          isLatest
                            ? "font-bold text-foreground"
                            : "font-medium text-foreground/80"
                        }`}
                      >
                        {entry.note || entry.status || "Status Pengiriman"}
                      </p>
                      {isLatest && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Status Terkini
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      <span>
                        {entry.updated_at || entry.date
                          ? formatDateTime(entry.updated_at || entry.date || null)
                          : "Waktu tercatat"}
                      </span>
                      {entry.location && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                          📍 {entry.location}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tracking?.link && (
            <a
              href={tracking.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              <span>Buka halaman pelacakan kurir Biteship</span>
              <ExternalLink className="h-3 w-3" />
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

          {/* Kontrol simulasi hanya tampil untuk supplier/admin. */}
          {(userRole === "SUPPLIER" || userRole === "ADMIN") && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
              <p className="text-xs font-semibold text-amber-950">Simulasi pengiriman</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!isShipped && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSimulate("SHIPPED")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Truck className="h-3.5 w-3.5 text-amber-700" />
                    <span>Simulasikan penjemputan</span>
                  </button>
                )}
                {!isDelivered && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSimulate("DELIVERED")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Simulasikan tiba</span>
                  </button>
                )}
                {isDelivered && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Pengiriman selesai</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
