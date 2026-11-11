import { Edit, RefreshCw, FileText, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils/formatters";

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
export function ShipmentTable({ shipments, onEdit, onSync, syncingId }: ShipmentTableProps) {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[820px]">
          <thead className="bg-[#181720] border-b border-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">Order</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">Customer</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">Kurir</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">Nomor Resi</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">Status</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">Dibuat</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.isArray(shipments) && shipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{shipment.order?.orderNumber ?? 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{formatRupiah(shipment.order?.totalAmount ?? 0)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground">{shipment.order?.user?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{shipment.order?.user?.email ?? 'N/A'}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{shipment.courier}</p>
                    {shipment.biteshipOrderId && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-container-low text-foreground">
                        Auto
                      </span>
                    )}
                  </div>
                  {shipment.service && <p className="text-xs text-muted-foreground">{shipment.service}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground font-mono">{shipment.trackingNumber || "-"}</p>
                </td>
                <td scope="col" className="px-4 py-3 text-center">
                  <StatusBadge status={shipment.status} variant="shipment" />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{formatDateTime(shipment.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {/* Tombol sinkron status pengiriman otomatis dari Biteship */}
                    {shipment.biteshipOrderId && onSync && (
                      <button
                        onClick={() => onSync(shipment)}
                        disabled={syncingId === shipment.id || shipment.status === "DELIVERED" || shipment.status === "CANCELLED"}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-card rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sinkronkan status dari Biteship"
                      >
                        {syncingId === shipment.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Sinkron
                      </button>
                    )}

                    {/* Tombol cetak shipping label untuk pengiriman Biteship */}
                    {(shipment.biteshipOrderId || (shipment.biteshipLabelUrl && !shipment.biteshipLabelUrl.includes("undefined"))) && (
                      <a
                        href={
                          shipment.biteshipLabelUrl && shipment.biteshipLabelUrl.includes("biteship.s3")
                            ? shipment.biteshipLabelUrl
                            : `/api/florist/shipments/${shipment.id}/label`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground border border-border bg-card hover:bg-surface-container-low rounded-xl transition-colors"
                        title="Buka label pengiriman Biteship"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Label
                      </a>
                    )}

                    {/* NOTE: CANCELLED shipments cannot be edited by design. For corrections, contact admin. */}
                    <button
                      onClick={() => onEdit(shipment)}
                      disabled={shipment.status === "DELIVERED" || shipment.status === "CANCELLED"}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Update
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
