import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatters";

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
export function OutgoingShipmentTable({
  orders,
  onCreateShipment,
}: OutgoingShipmentTableProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.isArray(orders) &&
        orders.map((order) => (
          <article
            key={order.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-colors hover:border-foreground/25"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/florist/orders/${order.id}`}
                    className="font-mono text-sm font-bold text-foreground hover:text-primary hover:underline"
                  >
                    {order.orderNumber ?? "N/A"}
                  </Link>
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {order.user?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.user?.email ?? ""}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                  Lunas
                </span>
              </div>

              <dl className="mt-4 space-y-1.5 border-t border-border pt-3.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Pesanan</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {formatRupiah(order.totalAmount ?? 0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Biaya Pengiriman</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {formatRupiah(order.shippingCost ?? 0)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Link
                href={`/florist/orders/${order.id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
              >
                Detail
              </Link>
              <button
                type="button"
                onClick={() => onCreateShipment(order.id)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              >
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Buat Resi Pengiriman</span>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
    </div>
  );
}
