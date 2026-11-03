"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/lib/stores/cartStore";
import AddressSelector from "@/components/customer/AddressSelector";
import {
  getCustomerAddresses,
  createCheckoutOrder,
  createPaymentToken,
  validateCoupon,
} from "@/lib/api/customer";
import {
  ShoppingBag,
  Truck,
  CreditCard,
  Tag,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";

interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.getTotal());
  const clearCart = useCartStore((state) => state.clearCart);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shippingCost = 15000;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Masukkan kode kupon terlebih dahulu.");
      return;
    }

    try {
      setIsValidatingCoupon(true);
      setCouponError(null);

      const res = await validateCoupon({
        code: couponCode.trim(),
        subtotal: total,
        shippingCost,
      });

      setAppliedCoupon({
        code: res.data.coupon.code,
        discountAmount: res.data.calculation.discountAmount,
      });
    } catch (error) {
      setCouponError(
        error instanceof Error ? error.message : "Kupon tidak valid",
      );
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/checkout");
      return;
    }

    if (items.length === 0) {
      router.push("/cart");
      return;
    }

    async function loadAddresses() {
      try {
        const response = await getCustomerAddresses();
        const addressList = response.data.items;
        setAddresses(addressList);

        const defaultAddress = addressList.find((a: Address) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (addressList.length > 0) {
          setSelectedAddressId(addressList[0].id);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat alamat",
        );
      }
    }

    if (status === "authenticated") {
      loadAddresses();
    }
  }, [status, items, router]);

  const handleCheckout = async () => {
    if (!selectedAddressId) {
      setErrorMessage("Pilih alamat pengiriman terlebih dahulu");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // order
      const checkoutResponse = await createCheckoutOrder({
        addressId: selectedAddressId,
        shippingCost,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      //   midtrans token
      const orderId = checkoutResponse.data.order.id;
      const paymentResponse = await createPaymentToken(orderId);
      const snapToken = paymentResponse.data.token;

      // midtrans pop up
      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: function (result: any) {
            clearCart();
            // Gunakan window.location.href untuk hard navigation
            window.location.href = `/orders/${orderId}`;
          },
          onPending: function (result: any) {
            clearCart();
            window.location.href = `/orders/${orderId}`;
          },
          onError: function (result: any) {
            setErrorMessage("Pembayaran gagal. Silakan coba lagi.");
            setIsLoading(false);
          },
          onClose: function () {
            setIsLoading(false);
          },
        });
      } else {
        setErrorMessage(
          "Script pembayaran Midtrans belum siap dimuat. Silakan refresh halaman.",
        );
        setIsLoading(false);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat checkout",
      );
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="container-custom section-spacing">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-8" />
        <div className="h-96 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, total + shippingCost - discount);

  return (
    <div className="container-custom section-spacing">
      <h1 className="text-4xl font-bold text-foreground mb-8">
        Checkout Pembayaran
      </h1>
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error/5 p-5 text-base text-error">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Alamat Pengiriman */}
          <div className="card-elevated">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Alamat Pengiriman
              </h2>
            </div>
            <AddressSelector
              addresses={addresses}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
            />
          </div>

          {/* Produk Dipesan */}
          <div className="card-elevated">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Produk Dipesan ({items.length} item)
              </h2>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.quantity}x @ Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Kupon Promo */}
          <div className="card-elevated">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                <Tag className="h-6 w-6 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Kode Promo (Opsional)
              </h2>
            </div>

            {couponError && (
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-error/5 p-4 text-sm text-error border border-error/20">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="font-medium">{couponError}</span>
              </div>
            )}

            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border-2 border-success bg-success/5 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-success" />
                  <div>
                    <p className="text-base font-bold text-success">
                      {appliedCoupon.code}
                    </p>
                    <p className="text-sm text-success/80">
                      Hemat Rp{" "}
                      {appliedCoupon.discountAmount.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="flex items-center gap-2 text-sm font-semibold text-error hover:text-error/80 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Contoh: FLORA10"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="btn-primary px-8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isValidatingCoupon ? "Mengecek..." : "Terapkan"}
                </button>
              </div>
            )}
          </div>

          {/* Catatan */}
          <div className="card-elevated">
            <label className="block text-base font-semibold text-foreground mb-3">
              Catatan untuk Penjual (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Tolong kirim pagi hari"
              rows={4}
              className="input-field w-full resize-none"
            />
          </div>
        </div>

        {/* Ringkasan Pembayaran - Sticky Sidebar */}
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
                  Rp {total.toLocaleString("id-ID")}
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
                  <span className="text-success">Diskon Kupon ({appliedCoupon.code})</span>
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
              onClick={handleCheckout}
              disabled={isLoading || !selectedAddressId}
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
                  <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    Pembayaran Aman
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Transaksi Anda dilindungi dengan enkripsi SSL 256-bit dan Midtrans Payment Gateway
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
