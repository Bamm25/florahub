import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils/formatters";

/** Status pengiriman komprehensif untuk portal supplier & florist */
export default function SupplierDeliveryStatus({
  status,
  courier,
  trackingNumber,
  bookedAt,
  deliveredAt,
  booked = false,
}: {
  status: string;
  courier?: string | null;
  trackingNumber?: string | null;
  bookedAt?: string | null;
  deliveredAt?: string | null;
  booked?: boolean;
}) {
  if (status === "DELIVERED") {
    return (
      <div className="space-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          <span>Bunga Diterima oleh Florist</span>
        </span>
        {courier && <p className="text-muted-foreground">Kurir: {courier}</p>}
        {trackingNumber && <p className="font-mono text-[11px] text-muted-foreground">Resi: {trackingNumber}</p>}
        {deliveredAt && (
          <p className="text-[11px] text-success font-medium">
            Tiba: {formatDateTime(deliveredAt)}
          </p>
        )}
      </div>
    );
  }

  if (status === "SHIPPED") {
    return (
      <div className="space-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2.5 py-1 font-semibold text-info">
          <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden="true" />
          <span>Kurir Mengantar ke Florist</span>
        </span>
        {courier && <p className="text-muted-foreground">Kurir: {courier}</p>}
        {trackingNumber && <p className="font-mono text-[11px] text-muted-foreground">Resi: {trackingNumber}</p>}
        {bookedAt && <p className="text-[11px] text-muted-foreground">Dijemput: {formatDateTime(bookedAt)}</p>}
      </div>
    );
  }

  if (booked && status === "PAID") {
    return (
      <div className="space-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-medium text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
          <span>Resi Siap · Menunggu Kurir</span>
        </span>
        {courier && <p className="text-muted-foreground">Kurir: {courier}</p>}
        {trackingNumber && <p className="font-mono text-[11px] text-muted-foreground">Resi: {trackingNumber}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs">
      <StatusBadge status={status} variant="shipment" size="sm" />
      {trackingNumber && <p className="font-mono text-[11px] text-muted-foreground">Resi: {trackingNumber}</p>}
    </div>
  );
}

