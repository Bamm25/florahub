import StatusBadge from "@/components/ui/StatusBadge";
import { CheckCircle2, Truck, PackageCheck } from "lucide-react";
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
        <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
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
        <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2.5 py-1 font-semibold text-info">
          <Truck className="h-3.5 w-3.5 text-info" />
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
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-medium text-warning">
          <PackageCheck className="h-3.5 w-3.5 text-warning" />
          <span>Booking Biteship · Menunggu Jemput</span>
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

