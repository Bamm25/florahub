"use client";

import { CreditCard } from "lucide-react";

// Interface untuk data kupon yang sudah diapply
interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

// Props interface untuk komponen ringkasan order dan checkout
interface OrderSummaryProps {
  subtotal: number;
  shippingCost: number;
  appliedCoupon: AppliedCoupon | null;
  finalTotal: number;
  isLoading: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
}

// Sticky sidebar dengan breakdown harga dan tombol checkout
export default function OrderSummary({
  subtotal,
  shippingCost,
  appliedCoupon,
  finalTotal,
  isLoading,
  canCheckout,
  onCheckout,
}: OrderSummaryProps) {
  // Calculate discount amount dari kupon yang diapply
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  return (
    <div className="lg:col-span-1">
      <div className="card-elevated sticky top-24">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10">
            <CreditCard className="h-6 w-6 text-tertiary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Ringkasan Pembayaran
          </h2>
        </div>

        <div className="space-y-4 border-b border-border pb-6">
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Subtotal Produk</span>
            <span className="font-semibold text-foreground">
              Rp {subtotal.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Ongkos Kirim</span>
            <span className="font-semibold text-foreground">
              Rp {shippingCost.toLocaleString("id-ID")}
            </span>
          </div>
          {discount > 0 && appliedCoupon && (
            <div className="flex justify-between text-base">
              <span className="text-success">
                Diskon Kupon ({appliedCoupon.code})
              </span>
              <span className="font-semibold text-success">
                -Rp {discount.toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between text-lg">
          <span className="font-bold text-foreground">Total Pembayaran</span>
          <span className="text-2xl font-bold text-primary">
            Rp {finalTotal.toLocaleString("id-ID")}
          </span>
        </div>

        <button
          onClick={onCheckout}
          disabled={isLoading || !canCheckout}
          className="btn-primary w-full mt-6 h-14 text-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span>Memproses Pembayaran...</span>
          ) : (
            <>
              <CreditCard className="mr-2 h-6 w-6" />
              <span>Bayar Sekarang</span>
            </>
          )}
        </button>

        {/* Trust Signal */}
        <div className="mt-6 rounded-xl bg-surface-container-low p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Pembayaran Aman
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transaksi Anda dilindungi dengan enkripsi SSL 256-bit dan
                Midtrans Payment Gateway
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
