import { Plus } from "lucide-react";

// Interface data pesanan customer yang siap dikirim
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

// Props interface untuk komponen tabel pesanan siap kirim
interface OutgoingShipmentTableProps {
  orders: Order[];
  onCreateShipment: (orderId: string) => void;
}

// Komponen daftar kartu pesanan lunas yang memerlukan pembuatan resi pengiriman
export function OutgoingShipmentTable({ orders, onCreateShipment }: OutgoingShipmentTableProps) {
  // Helper untuk memformat nominal mata uang Rupiah
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
        <div key={order.id} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-border/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{order.orderNumber ?? 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{order.user?.name ?? 'Unknown'}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                LUNAS
              </span>
            </div>

            <div className="space-y-1 pt-3 mt-3 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Order</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">{formatRupiah(order.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ongkos Kirim</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">{formatRupiah(order.shippingCost ?? 0)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onCreateShipment(order.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Buat Resi Shipment
          </button>
        </div>
      ))}
    </div>
  );
}
