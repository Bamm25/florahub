"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCartStore } from "@/lib/stores/cartStore";
import AddressSelector from "@/components/customer/AddressSelector";
import { CheckoutSummary } from "@/components/customer/CheckoutSummary";
import OrderItems from "@/components/customer/OrderItems";
import CouponInput from "@/components/customer/CouponInput";
import AddressForm from "@/components/customer/AddressForm";
import {
  getCustomerAddresses,
  createCheckoutOrder,
  createPaymentToken,
  validateCoupon,
} from "@/lib/api/customer";
import { createAddress } from "@/lib/api/addresses";
import { Truck, AlertCircle, MapPin, Plus, Loader2 } from "lucide-react";

// Interface untuk data alamat pengiriman customer
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

// Halaman checkout dengan address selector, ringkasan, dan Midtrans payment
export default function CheckoutPage() {
  const router = useRouter();
  const { status } = useSession();
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [shippingCost, setShippingCost] = useState(15000);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingRates, setShippingRates] = useState<Array<{
    courier: string;
    service: string;
    price: number;
    estimatedDays: string;
  }>>([]);
  const [selectedShipping, setSelectedShipping] = useState<{
    courier: string;
    service: string;
  } | null>(null);

  // Validasi kelengkapan data formulir checkout sebelum pesanan dibuat
  const validateCheckout = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedAddressId) {
      errors.address = "Pilih alamat pengiriman terlebih dahulu";
    }

    if (items.length === 0) {
      errors.items = "Keranjang belanja kosong";
    }

    if (notes.length > 500) {
      errors.notes = "Catatan maksimal 500 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Apply dan validasi kupon discount dengan API
  const handleApplyCoupon = async (): Promise<void> => {
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

  // Hapus applied coupon dan reset form
  const handleRemoveCoupon = (): void => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  // Calculate shipping cost saat address dipilih atau items berubah
  const calculateShipping = useCallback(async (addressId: string): Promise<void> => {
    if (!addressId || items.length === 0) return;

    try {
      setIsCalculatingShipping(true);
      const response = await fetch("/api/customer/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();
      if (response.ok && result.success && result.data.rates.length > 0) {
        setShippingRates(result.data.rates);
        const cheapest = result.data.cheapest;
        setShippingCost(cheapest.price);
        setSelectedShipping({
          courier: cheapest.courier,
          service: cheapest.service,
        });
      } else {
        setShippingCost(15000);
        setShippingRates([]);
        setSelectedShipping(null);
      }
    } catch (error) {
      console.error("Calculate shipping error:", error);
      setShippingCost(15000);
      setShippingRates([]);
      setSelectedShipping(null);
    } finally {
      setIsCalculatingShipping(false);
    }
  }, [items]);

  interface AddressFormData {
    label: string;
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
    postalCode: string;
    isDefault: boolean;
  }

  // Handle tambah alamat baru dan auto-select setelah berhasil
  const handleAddAddress = async (data: AddressFormData): Promise<void> => {
    try {
      const response = await createAddress(data);
      const newAddress = response.data.address;
      
      // Perbarui daftar alamat pengguna
      const addressesResponse = await getCustomerAddresses();
      const addressList = addressesResponse.data.items;
      setAddresses(addressList);
      
      // Otomatis pilih alamat baru yang baru ditambahkan
      setSelectedAddressId(newAddress.id);
      void calculateShipping(newAddress.id);
      
      // Tutup modal formulir alamat
      setShowAddressForm(false);
      setFormErrors({});
    } catch (error) {
      throw error;
    }
  };

  // Redirect ke login jika belum auth atau cart jika kosong, load addresses
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/checkout");
      return;
    }

    if (items.length === 0) {
      router.push("/cart");
      return;
    }

    async function loadAddresses(): Promise<void> {
      try {
        const response = await getCustomerAddresses();
        const addressList = response.data.items;
        setAddresses(addressList);

        const defaultAddress = addressList.find((a: Address) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          void calculateShipping(defaultAddress.id);
        } else if (addressList.length > 0) {
          setSelectedAddressId(addressList[0].id);
          void calculateShipping(addressList[0].id);
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
  }, [status, items, router, calculateShipping]);

  // Handle checkout: create order, get Midtrans token, open payment popup
  const handleCheckout = async (): Promise<void> => {
    if (!validateCheckout()) {
      setErrorMessage("Mohon lengkapi data checkout terlebih dahulu");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setFormErrors({});

    try {
      // Buat pesanan baru di backend
      const checkoutResponse = await createCheckoutOrder({
        addressId: selectedAddressId!,
        shippingCost,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      // Get Midtrans snap token untuk payment popup
      const orderId = checkoutResponse.data.order.id;
      const paymentResponse = await createPaymentToken(orderId);
      const snapToken = paymentResponse.data.token;

      // Trigger Midtrans payment popup dengan callback handlers
      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: function (): void {
            clearCart();
            router.push(`/orders/${orderId}`);
          },
          onPending: function (): void {
            clearCart();
            router.push(`/orders/${orderId}`);
          },
          onError: function (): void {
            setErrorMessage("Pembayaran gagal. Silakan coba lagi.");
            setIsLoading(false);
          },
          onClose: function (): void {
            clearCart();
            router.push(`/orders/${orderId}`);
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

  // Render loading skeleton saat checking auth status
  if (status === "loading") {
    return (
      <div className="container-custom py-12" role="status">
        <span className="sr-only">Memuat halaman checkout...</span>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-10 w-72 animate-pulse rounded-xl bg-muted" />
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    void calculateShipping(id);
  };

  return (
    <div className="pb-16 sm:pb-24">
      {/* Masthead */}
      <section className="border-b border-border bg-surface py-10 sm:py-14">
        <div className="container-custom">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Langkah 2 dari 2 · Konfirmasi & Pembayaran
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Checkout Pesanan
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Lengkapi alamat pengiriman dan konfirmasi pesanan bunga Anda.
              </p>
            </div>
            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Kembali ke Keranjang
            </Link>
          </div>
        </div>
      </section>

      <div className="container-custom pt-8 sm:pt-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div aria-live="polite">
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/10 p-5 text-sm text-error"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Alamat Pengiriman */}
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <Truck className="h-5 w-5 text-foreground" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-foreground">
                    Alamat Pengiriman
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {addresses.length} alamat tersimpan
                </span>
              </div>

              {addresses.length === 0 ? (
                <div className="space-y-4">
                  {/* Empty state */}
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                      <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <h3 className="mb-1 text-base font-bold text-foreground">
                      Belum ada alamat pengiriman
                    </h3>
                    <p className="mb-6 text-xs text-muted-foreground">
                      Tambah alamat tujuan penerima untuk melanjutkan pesanan
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Tambah Alamat Sekarang
                    </button>
                  </div>

                  {/* Validation error */}
                  {formErrors.address && (
                    <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs font-medium text-warning">
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{formErrors.address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <AddressSelector
                    addresses={addresses}
                    selectedId={selectedAddressId}
                    onSelect={handleSelectAddress}
                  />

                  {/* Add new address button */}
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-foreground/20 hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Tambah Alamat Baru
                  </button>

                  {/* Validation error */}
                  {formErrors.address && (
                    <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs font-medium text-warning">
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{formErrors.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Opsi & Biaya Pengiriman */}
            {selectedAddressId && (
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kurir</p>
                    <h3 className="mt-0.5 text-base font-bold text-foreground">Metode & Biaya Pengiriman</h3>
                  </div>
                  {isCalculatingShipping && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                      Menghitung tarif...
                    </span>
                  )}
                </div>

                {shippingRates.length > 0 ? (
                  <div className="space-y-2.5">
                    {shippingRates.map((rate, idx) => {
                      const isSelected = selectedShipping?.courier === rate.courier && selectedShipping?.service === rate.service;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedShipping({ courier: rate.courier, service: rate.service });
                            setShippingCost(rate.price);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl p-4 text-left transition-all ${
                            isSelected
                              ? "border-2 border-foreground bg-muted/20"
                              : "border border-border bg-surface hover:bg-muted/10"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {rate.courier.toUpperCase()} · {rate.service}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Estimasi pengiriman: {rate.estimatedDays}
                            </p>
                          </div>
                          <p className="text-sm font-extrabold text-foreground">
                            Rp {rate.price.toLocaleString("id-ID")}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">Pengiriman Standar Florist</p>
                      <p className="text-xs text-muted-foreground">Estimasi tiba: 1-2 hari kerja</p>
                    </div>
                    <p className="font-bold text-foreground">
                      Rp {shippingCost.toLocaleString("id-ID")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <OrderItems items={items} />

            <CouponInput
              couponCode={couponCode}
              isValidatingCoupon={isValidatingCoupon}
              couponError={couponError}
              appliedCoupon={appliedCoupon}
              onCouponCodeChange={(v) => { setCouponCode(v); setCouponError(null); }}
              onApply={handleApplyCoupon}
              onRemove={handleRemoveCoupon}
            />

            {/* Catatan */}
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
              <label htmlFor="order-notes" className="mb-2 block text-base font-semibold text-foreground">
                Catatan untuk Penjual (Opsional)
              </label>
              <p className="mb-3 text-xs text-muted-foreground">
                Misal: ucapan pada kartu bunga, petunjuk lokasi kurir, atau instruksi khusus perangkai.
              </p>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setFormErrors({ ...formErrors, notes: "" });
                }}
                placeholder="Tuliskan catatan pesanan Anda di sini..."
                rows={4}
                className={`w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.notes ? "border-error" : ""}`}
                maxLength={500}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <div>
                  {formErrors.notes && (
                    <p className="text-error">{formErrors.notes}</p>
                  )}
                </div>
                <p className={notes.length > 450 ? "font-semibold text-warning" : "text-muted-foreground"}>
                  {notes.length}/500 karakter
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan Pembayaran - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <CheckoutSummary
              items={items}
              subtotal={total}
              shippingCost={shippingCost}
              appliedCoupon={appliedCoupon}
              onCheckout={handleCheckout}
              isProcessing={isLoading}
              isDisabled={!selectedAddressId}
            />
          </div>
        </div>
      </div>

      {/* Address Form Modal */}
      {showAddressForm && (
        <AddressForm
          onSubmit={handleAddAddress}
          onCancel={() => setShowAddressForm(false)}
        />
      )}
    </div>
  );
}
