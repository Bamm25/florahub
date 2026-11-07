import { Edit } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils/formatters";

interface Shipment {
  id: string;
  orderId: string;
  courier: string;
  service: string | null;
  trackingNumber: string | null;
  status: string;
  estimatedDays: number | null;
  shippingCost: number;
  weight: number | null;
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

interface ShipmentTableProps {
  shipments: Shipment[];
  onEdit: (shipment: Shipment) => void;
}

export function ShipmentTable({ shipments, onEdit }: ShipmentTableProps) {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Courier</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nomor Resi</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Dibuat</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Aksi</th>
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
                  <p className="text-sm font-medium text-foreground">{shipment.courier}</p>
                  {shipment.service && <p className="text-xs text-muted-foreground">{shipment.service}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground font-mono">{shipment.trackingNumber || "-"}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={shipment.status} variant="shipment" />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{formatDateTime(shipment.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center">
                    {/* NOTE: CANCELLED shipments cannot be edited by design. For corrections, contact admin. */}
                    <button
                      onClick={() => onEdit(shipment)}
                      disabled={shipment.status === "DELIVERED" || shipment.status === "CANCELLED"}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
