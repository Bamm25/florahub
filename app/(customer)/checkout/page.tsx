"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Truck, AlertCircle, MapPin, Plus } from "lucide-react";

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

  // Validasi form checkout sebelum submit order
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
  const calculateShipping = async (addressId: string): Promise<void> => {
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
  };

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
      
      // Refresh addresses list
      const addressesResponse = await getCustomerAddresses();
      const addressList = addressesResponse.data.items;
      setAddresses(addressList);
      
      // Auto-select newly added address
      setSelectedAddressId(newAddress.id);
      
      // Close form
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
          // Calculate shipping untuk default address
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
  }, [status, items, router]);

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
      // order
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
            // Gunakan window.location.href untuk hard navigation
            window.location.href = `/orders/${orderId}`;
          },
          onPending: function (): void {
            clearCart();
            window.location.href = `/orders/${orderId}`;
          },
          onError: function (): void {
            setErrorMessage("Pembayaran gagal. Silakan coba lagi.");
            setIsLoading(false);
          },
          onClose: function (): void {
            clearCart();
            // Arahkan customer ke halaman detail pesanan agar dapat melanjutkan pembayaran kapan saja
            window.location.href = `/orders/${orderId}`;
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
      <div className="container-custom section-spacing">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-8" />
        <div className="h-96 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

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

            {addresses.length === 0 ? (
              <div className="space-y-4">
                {/* Empty state */}
                <div className="rounded-xl border-2 border-dashed border-border bg-surface-container-low p-8 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container mb-4">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Belum ada alamat pengiriman
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Tambah alamat untuk melanjutkan checkout
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
                  >
                    <Plus className="h-5 w-5" />
                    Tambah Alamat Sekarang
                  </button>
                </div>

                {/* Validation error */}
                {formErrors.address && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{formErrors.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <AddressSelector
                  addresses={addresses}
                  selectedId={selectedAddressId}
                  onSelect={setSelectedAddressId}
                />

                {/* Add new address button */}
                <button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="w-full rounded-lg border-2 border-dashed border-border bg-surface-container-low p-4 text-sm font-medium text-foreground/70 hover:border-primary hover:bg-primary/5 hover:text-primary transition flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Tambah Alamat Baru
                </button>

                {/* Validation error */}
                {formErrors.address && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{formErrors.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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
          <div className="card-elevated">
            <label className="block text-base font-semibold text-foreground mb-3">
              Catatan untuk Penjual (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setFormErrors({ ...formErrors, notes: "" });
              }}
              placeholder="Contoh: Tolong kirim pagi hari"
              rows={4}
              className={`input-field w-full resize-none ${formErrors.notes ? "border-error" : ""}`}
              maxLength={500}
            />
            <div className="mt-1 flex items-center justify-between">
              {formErrors.notes && (
                <p className="text-sm text-error">{formErrors.notes}</p>
              )}
              <p className={`text-sm ${notes.length > 450 ? "text-warning" : "text-muted-foreground"} ml-auto`}>
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
