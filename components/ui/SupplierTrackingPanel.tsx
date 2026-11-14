"use client";

import { useState } from "react";
import { trackSupplierShipment } from "@/lib/api/supplier";
import { formatDateTime } from "@/lib/utils/formatters";

export default function SupplierTrackingPanel({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Awaited<ReturnType<typeof trackSupplierShipment>> | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setTracking(await trackSupplierShipment(orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melacak paket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <button type="button" disabled={loading} onClick={refresh} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-800 disabled:opacity-50">
        {loading ? "Memuat pelacakan..." : "Lacak status Biteship"}
      </button>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {tracking && (
        <div className="rounded-lg border border-border bg-surface p-2 text-muted-foreground">
          <p className="font-semibold text-foreground">Status kurir: {tracking.status}</p>
          {tracking.history?.length ? (
            <ol className="mt-2 space-y-1">
              {tracking.history.map((entry, index) => (
                <li key={`${index}-${entry.updated_at || entry.date || ""}`}>
                  {entry.note || entry.status || "Pembaruan pengiriman"}
                  {(entry.updated_at || entry.date) && ` · ${formatDateTime(entry.updated_at || entry.date || null)}`}
                </li>
              ))}
            </ol>
          ) : <p>Riwayat kurir belum tersedia. Resi tidak berarti paket sudah dijemput.</p>}
          {tracking.link && <a href={tracking.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-indigo-700 underline">Buka pelacakan kurir</a>}
        </div>
      )}
    </div>
  );
}
