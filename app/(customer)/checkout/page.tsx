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
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, total + shippingCost - discount);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Checkout Pembayaran
      </h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Alamat Pengiriman
              </h2>
            </div>
            <AddressSelector
              addresses={addresses}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Produk Dipesan ({items.length} item)
              </h2>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.quantity}x @ Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Kupon Promo */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Kode Promo (Opsional)
              </h2>
            </div>

            {couponError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}

            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      {appliedCoupon.code}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Hemat Rp{" "}
                      {appliedCoupon.discountAmount.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Contoh: FLORA10"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isValidatingCoupon ? "Mengecek..." : "Terapkan"}
                </button>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan untuk Penjual (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Tolong kirim pagi hari"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sticky top-4">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Ringkasan Pembayaran
              </h2>
            </div>
            <div className="space-y-3 border-b border-gray-200 pb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal Produk</span>
                <span className="font-medium text-gray-900">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ongkos Kirim</span>
                <span className="font-medium text-gray-900">
                  Rp {shippingCost.toLocaleString("id-ID")}
                </span>
              </div>
              {discount > 0 && appliedCoupon && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Diskon Kupon ({appliedCoupon.code})</span>
                  <span className="font-medium">
                    -Rp {discount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-between text-base font-bold text-gray-900">
              <span>Total Pembayaran</span>
              <span className="text-emerald-600">
                Rp {finalTotal.toLocaleString("id-ID")}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isLoading || !selectedAddressId}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Bayar Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
