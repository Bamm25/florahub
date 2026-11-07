import { Plus } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  user: {
    name: string;
    email: string;
  };
}

interface OutgoingShipmentTableProps {
  orders: Order[];
  onCreateShipment: (orderId: string) => void;
}

export function OutgoingShipmentTable({ orders, onCreateShipment }: OutgoingShipmentTableProps) {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.isArray(orders) && orders.map((order) => (
        <div key={order.id} className="card-elevated p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{order.orderNumber ?? 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{order.user?.name ?? 'Unknown'}</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
              PAID
            </span>
          </div>

          <div className="space-y-1 pt-2 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Order</span>
              <span className="font-semibold text-foreground">{formatRupiah(order.totalAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Kirim</span>
              <span className="font-semibold text-foreground">{formatRupiah(order.shippingCost ?? 0)}</span>
            </div>
          </div>

          <button
            onClick={() => onCreateShipment(order.id)}
            className="w-full btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Shipment
          </button>
        </div>
      ))}
    </div>
  );
}
