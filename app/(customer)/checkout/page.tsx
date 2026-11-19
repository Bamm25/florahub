"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import { useCartStore } from "@/lib/stores/cartStore";
import AddressSelector from "@/components/customer/AddressSelector";
import { CheckoutSummary } from "@/components/customer/CheckoutSummary";
import OrderItems from "@/components/customer/OrderItems";
import CouponInput from "@/components/customer/CouponInput";
import AddressForm from "@/components/customer/AddressForm";
import {
  type Address,
  getCustomerAddresses,
  createCheckoutOrder,
  createPaymentToken,
  validateCoupon,
  calculateCustomerShipping,
} from "@/lib/api/customer";
import { createAddress } from "@/lib/api/addresses";
import { LoadingSpinner } from "@/components/ui";
import { formatRupiah } from "@/lib/utils/formatters";

// Halaman checkout editorial dengan pilihan alamat, ongkos kirim, kupon, dan pembayaran Snap
export default function CheckoutPage() {
  const router = useRouter();
  const { status } = useSession();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state._hasHydrated);
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
  const [shippingRates, setShippingRates] = useState<
    Array<{
      courier: string;
      service: string;
      price: number;
      estimatedDays: string;
    }>
  >([]);
  const [selectedShipping, setSelectedShipping] = useState<{
    courier: string;
    service: string;
  } | null>(null);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctFlorists = new Set(items.map((item) => item.floristId)).size;
  const hasMultipleFlorists = distinctFlorists > 1;

  // Validasi kelengkapan data checkout sebelum pesanan dibuat
  const validateCheckout = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedAddressId) {
      errors.address = "Pilih alamat pengiriman terlebih dahulu.";
    }

    if (items.length === 0) {
      errors.items = "Keranjang masih kosong.";
    }

    if (notes.length > 500) {
      errors.notes = "Catatan maksimal 500 karakter.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validasi dan terapkan kupon promo melalui API
  const handleApplyCoupon = async (): Promise<void> => {
    if (!couponCode.trim()) {
      setCouponError("Masukkan kode promo terlebih dahulu.");
      return;
    }

    try {
      setIsValidatingCoupon(true);
      setCouponError(null);

      const res = await validateCoupon({
        code: couponCode.trim(),
        subtotal: total,
        shippingCost,
        productIds: items.map((item) => item.productId),
      });

      setAppliedCoupon({
        code: res.data.coupon.code,
        discountAmount: res.data.calculation.discountAmount,
      });
    } catch (error) {
      setCouponError(
        error instanceof Error ? error.message : "Kode promo tidak valid.",
      );
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Hapus kupon aktif dan reset input kode promo
  const handleRemoveCoupon = (): void => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  // Hitung tarif pengiriman saat alamat dipilih atau item berubah
  const calculateShipping = useCallback(
    async (addressId: string): Promise<void> => {
      if (!addressId || items.length === 0) return;

      try {
        setIsCalculatingShipping(true);
        const result = await calculateCustomerShipping({
          addressId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });

        if (result.success && result.data.rates.length > 0) {
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
      } catch {
        setShippingCost(15000);
        setShippingRates([]);
        setSelectedShipping(null);
      } finally {
        setIsCalculatingShipping(false);
      }
    },
    [items],
  );

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

  // Simpan alamat baru lalu pilih otomatis untuk checkout
  const handleAddAddress = async (data: AddressFormData): Promise<void> => {
    const response = await createAddress(data);
    const newAddress = response.data.address;

    const addressesResponse = await getCustomerAddresses();
    const addressList = addressesResponse.data.items;
    setAddresses(addressList);

    setSelectedAddressId(newAddress.id);
    void calculateShipping(newAddress.id);

    setShowAddressForm(false);
    setFormErrors({});
  };

  // Redirect ke login bila belum autentikasi atau ke keranjang bila kosong, lalu muat alamat
  useEffect(() => {
    if (!hasHydrated) return;

    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/checkout");
      return;
    }

    if (items.length === 0) {
      router.push("/cart");
      return;
    }

    const controller = new AbortController();

    async function loadAddresses(): Promise<void> {
      try {
        const response = await getCustomerAddresses(controller.signal);
        if (controller.signal.aborted) return;
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
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat alamat.",
        );
      }
    }

    if (status === "authenticated") {
      void loadAddresses();
    }

    return () => {
      controller.abort();
    };
  }, [hasHydrated, status, items, router, calculateShipping]);

  // Buat pesanan, ambil token gerbang pembayaran, lalu buka popup Snap
  const handleCheckout = async (): Promise<void> => {
    if (hasMultipleFlorists) {
      setErrorMessage(
        "Satu checkout hanya berlaku untuk 1 toko. Sesuaikan isi keranjang terlebih dahulu.",
      );
      return;
    }

    if (!validateCheckout()) {
      setErrorMessage("Lengkapi alamat pengiriman terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setFormErrors({});

    try {
      const checkoutResponse = await createCheckoutOrder({
        addressId: selectedAddressId!,
        shippingCost,
        courier: selectedShipping?.courier,
        service: selectedShipping?.service,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      const createdOrder = checkoutResponse.data.order;
      const orderId = createdOrder.id;

      // Pesanan Rp 0 dari promo 100% langsung lunas tanpa membuka popup Snap
      if (createdOrder.status === "PAID" || createdOrder.totalAmount === 0) {
        clearCart();
        router.push(`/orders/${orderId}`);
        return;
      }

      const paymentResponse = await createPaymentToken(orderId);
      const snapToken = paymentResponse.data.token;

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
          "Layanan pembayaran belum siap. Muat ulang halaman lalu coba lagi.",
        );
        setIsLoading(false);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses checkout.",
      );
      setIsLoading(false);
    }
  };

  if (status === "loading" || !hasHydrated) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom py-12">
          <LoadingSpinner message="Memuat checkout..." />
        </div>
      </main>
    );
  }

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    setFormErrors((prev) => ({ ...prev, address: "" }));
    void calculateShipping(id);
  };

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Masthead */}
      <section className="border-b border-white/10 bg-surface-dark py-10 text-white sm:py-14">
        <div className="container-custom">
          <nav aria-label="Tahap pesanan">
            <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <li>
                <Link
                  href="/cart"
                  className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-white/60 transition-colors hover:border-white/25 hover:text-white"
                >
                  1. Keranjang
                </Link>
              </li>
              <li aria-hidden="true" className="text-white/40">
                →
              </li>
              <li
                aria-current="step"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-kicker"
              >
                2. Checkout
              </li>
            </ol>
          </nav>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Checkout{" "}
                <span className="font-display font-normal italic text-kicker">
                  Pesanan
                </span>
              </h1>
              <p className="mt-2 text-base tabular-nums text-white/70">
                {itemCount} produk · {formatRupiah(total)}
              </p>
            </div>

            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-kicker underline-offset-4 hover:text-white hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Kembali ke Keranjang
            </Link>
          </div>
        </div>
      </section>

      <div className="container-custom pt-8 sm:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:gap-14">
          {/* Kolom Kiri */}
          <div className="space-y-6">
            <div aria-live="polite" className="space-y-4">
              {hasMultipleFlorists && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground">
                        Keranjang berisi {distinctFlorists} toko berbeda
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Checkout diproses per 1 toko. Pilih salah satu toko di
                        keranjang.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/cart"
                    className="inline-flex min-h-9 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30"
                  >
                    Ubah di Keranjang
                  </Link>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* 01 · Alamat Pengiriman */}
            <section
              aria-labelledby="shipping-address-heading"
              className="rounded-2xl border border-border bg-card p-6 sm:p-7"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
                    01
                  </span>
                  <h2
                    id="shipping-address-heading"
                    className="text-base font-semibold text-foreground"
                  >
                    Alamat Pengiriman
                  </h2>
                </div>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Tambah
                  </button>
                )}
              </div>

              {addresses.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-border bg-surface-container-low/50 p-8 text-center">
                    <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      Belum ada alamat pengiriman
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tambahkan alamat tujuan penerima untuk melanjutkan.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Tambah Alamat
                    </button>
                  </div>

                  {formErrors.address && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs font-medium text-warning"
                    >
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

                  {formErrors.address && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs font-medium text-warning"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{formErrors.address}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 02 · Pengiriman */}
            {selectedAddressId && (
              <section
                aria-labelledby="shipping-method-heading"
                className="rounded-2xl border border-border bg-card p-6 sm:p-7"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
                      02
                    </span>
                    <h2
                      id="shipping-method-heading"
                      className="text-base font-semibold text-foreground"
                    >
                      Pengiriman
                    </h2>
                  </div>
                  {isCalculatingShipping && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin text-primary"
                        aria-hidden="true"
                      />
                      Menghitung...
                    </span>
                  )}
                </div>

                {shippingRates.length > 0 ? (
                  <fieldset className="space-y-2.5">
                    <legend className="sr-only">Pilih layanan pengiriman</legend>
                    {shippingRates.map((rate) => {
                      const isSelected =
                        selectedShipping?.courier === rate.courier &&
                        selectedShipping?.service === rate.service;
                      return (
                        <label
                          key={`${rate.courier}-${rate.service}`}
                          className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
                            isSelected
                              ? "border-foreground bg-surface-container-low/60"
                              : "border-border bg-card hover:border-foreground/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipping-courier"
                            value={`${rate.courier}-${rate.service}`}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedShipping({
                                courier: rate.courier,
                                service: rate.service,
                              });
                              setShippingCost(rate.price);
                            }}
                            className="sr-only"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {rate.courier.toUpperCase()} · {rate.service}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {rate.estimatedDays}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <p className="text-sm font-bold tabular-nums text-foreground">
                              {formatRupiah(rate.price)}
                            </p>
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-transparent"
                              }`}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </fieldset>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-container-low/60 p-4 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">
                        Pengiriman Florist
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        1–2 hari kerja
                      </p>
                    </div>
                    <p className="font-bold tabular-nums text-foreground">
                      {formatRupiah(shippingCost)}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* 03 · Produk Dipesan */}
            <OrderItems items={items} stepNumber="03" />

            {/* Kode Promo */}
            <CouponInput
              couponCode={couponCode}
              isValidatingCoupon={isValidatingCoupon}
              couponError={couponError}
              appliedCoupon={appliedCoupon}
              onCouponCodeChange={(v) => {
                setCouponCode(v);
                setCouponError(null);
              }}
              onApply={handleApplyCoupon}
              onRemove={handleRemoveCoupon}
            />

            {/* Catatan */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
              <label
                htmlFor="order-notes"
                className="mb-3 block text-base font-semibold text-foreground"
              >
                Catatan{" "}
                <span className="font-normal text-muted-foreground">
                  (opsional)
                </span>
              </label>
              <textarea
                id="order-notes"
                name="orderNotes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setFormErrors({ ...formErrors, notes: "" });
                }}
                placeholder="Ucapan di kartu bunga atau petunjuk untuk kurir..."
                rows={3}
                aria-invalid={Boolean(formErrors.notes)}
                aria-describedby={formErrors.notes ? "notes-error" : undefined}
                className={`input-field min-h-[96px]${formErrors.notes ? " border-error" : ""}`}
                maxLength={500}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <div>
                  {formErrors.notes && (
                    <p id="notes-error" role="alert" className="text-error">
                      {formErrors.notes}
                    </p>
                  )}
                </div>
                <p
                  className={`tabular-nums ${notes.length > 450 ? "font-semibold text-warning" : "text-muted-foreground"}`}
                >
                  {notes.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Ringkasan Pembayaran - Sticky Sidebar */}
          <aside>
            <CheckoutSummary
              items={items}
              subtotal={total}
              shippingCost={shippingCost}
              appliedCoupon={appliedCoupon}
              onCheckout={handleCheckout}
              isProcessing={isLoading}
              isDisabled={!selectedAddressId}
              isCalculatingShipping={isCalculatingShipping}
              hasMultipleFlorists={hasMultipleFlorists}
            />
          </aside>
        </div>
      </div>

      {/* Modal Tambah Alamat */}
      {showAddressForm && (
        <AddressForm
          onSubmit={handleAddAddress}
          onCancel={() => setShowAddressForm(false)}
        />
      )}
    </main>
  );
}
