# Form Patterns & Validation Analysis: Customer vs Florist

**Analysis Date:** November 7, 2026  
**Project:** FloraHub - Flower Marketplace

## Executive Summary

Both customer and florist forms follow controlled component patterns with local state management. **Florist forms demonstrate significantly better architecture** through reusable components (`FormField`, `Modal`), cleaner validation logic, and consistent error handling. Customer forms show inconsistent patterns with mixed inline forms and manual DOM manipulation.

---

## 1. FORM STATE MANAGEMENT

### Florist Forms ✅ SUPERIOR

**Pattern:** Controlled components with centralized state in parent

```typescript
// Products Page (Florist)
const [formData, setFormData] = useState({
  name: "",
  description: "",
  price: "",
  stock: "",
  image: "",
  categoryId: "",
  weight: "",
  tags: "",
  isActive: true,
  isFeatured: false,
});
const [formErrors, setFormErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);

const handleFormChange = (field: string, value: string | boolean) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};
```

**Inventory Modal:**
```typescript
const [formData, setFormData] = useState({
  quantity: inventory.quantity.toString(),
  location: inventory.location || "",
});

const handleFormChange = (field: string, value: string) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};
```

**Shipment Form:**
```typescript
const [formData, setFormData] = useState({
  courier: "",
  service: "",
  trackingNumber: "",
  estimatedDays: "",
  weight: "",
  status: "PENDING",
});
```

**Strengths:**
- ✅ Single source of truth for form state
- ✅ Predictable updates via callback pattern
- ✅ Clear separation: formData, formErrors, isSubmitting
- ✅ String-based number inputs prevent input issues
- ✅ Type-safe with TypeScript interfaces

### Customer Forms ⚠️ INCONSISTENT

**Address Form (Local State):**
```typescript
const [formData, setFormData] = useState({
  label: address?.label || "",
  recipientName: address?.recipientName || "",
  phone: address?.phone || "",
  fullAddress: address?.fullAddress || "",
  city: address?.city || "",
  province: address?.province || "",
  postalCode: address?.postalCode || "",
  isDefault: address?.isDefault || false,
});

// Inline updates - no abstraction
onChange={(e) => setFormData({ ...formData, label: e.target.value })}
```

**Checkout Page (Direct State):**
```typescript
const [couponCode, setCouponCode] = useState("");
const [notes, setNotes] = useState("");
const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
const [appliedCoupon, setAppliedCoupon] = useState<{
  code: string;
  discountAmount: number;
} | null>(null);

// Direct binding - no reusable pattern
<input
  type="text"
  value={couponCode}
  onChange={(e) => {
    setCouponCode(e.target.value.toUpperCase());
    setCouponError(null);
  }}
/>
```

**Review Form:**
```typescript
const [rating, setRating] = useState(5);
const [comment, setComment] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Weaknesses:**
- ⚠️ No consistent state management pattern
- ⚠️ Each form implements its own approach
- ⚠️ Mixed inline handlers and direct binding
- ⚠️ No reusable state abstraction

---

## 2. VALIDATION

### Florist Forms ✅ COMPREHENSIVE

**Inventory Modal - Number Validation:**
```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // Validate quantity
  const qtyString = formData.quantity.trim();
  
  if (!qtyString) {
    errors.quantity = "Quantity tidak boleh kosong";
  } else {
    const qty = parseInt(qtyString, 10);
    
    if (isNaN(qty)) {
      errors.quantity = "Quantity harus berupa angka valid";
    } else if (qty === 0) {
      errors.quantity = "Quantity tidak boleh 0";  // ✅ Explicit zero check
    } else if (qty < 0) {
      errors.quantity = "Quantity tidak boleh negatif";
    }
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Product Modal - Required Field & Range Validation:**
```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  if (!formData.name.trim()) {
    errors.name = "Nama produk wajib diisi";
  }

  const priceValue = parseFloat(formData.price);
  if (!formData.price || isNaN(priceValue) || priceValue <= 0) {
    errors.price = "Harga harus lebih dari 0";  // ✅ Prevents zero/negative
  }

  const stockValue = parseInt(formData.stock);
  if (!formData.stock || isNaN(stockValue) || stockValue < 0) {
    errors.stock = "Stok tidak boleh negatif";  // ✅ Allows zero stock
  }

  if (!formData.image.trim()) {
    errors.image = "URL gambar wajib diisi";
  }

  if (!formData.categoryId) {
    errors.categoryId = "Kategori wajib dipilih";
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Shipment Modal - Conditional Validation:**
```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  if (modalMode === "create" && !selectedOrderId) {
    errors.orderId = "Pilih order terlebih dahulu";
  }

  if (!formData.courier.trim()) {
    errors.courier = "Courier wajib diisi";
  }

  // ✅ Context-aware validation
  if (formData.status === "SHIPPED" || formData.status === "DELIVERED") {
    if (!formData.trackingNumber?.trim()) {
      errors.trackingNumber = "Nomor resi wajib untuk status SHIPPED";
    }
  }

  if (formData.estimatedDays && parseInt(formData.estimatedDays) < 0) {
    errors.estimatedDays = "Estimasi hari tidak boleh negatif";
  }

  if (formData.weight && parseFloat(formData.weight) <= 0) {
    errors.weight = "Berat harus lebih dari 0";
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**PreOrder Modal - Capacity Validation:**
```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  if (!formData.quantity || parseInt(formData.quantity) <= 0) {
    errors.quantity = "Quantity harus lebih dari 0";
  }

  // ✅ Business logic validation
  const totalOrdered = announcement.totalReservedQuantity ?? announcement._count.preOrders ?? 0;
  const available = announcement.estimatedQuantity - totalOrdered;
  if (parseInt(formData.quantity) > available) {
    errors.quantity = `Hanya tersisa ${available} unit yang tersedia`;
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Validation Timing:** `onSubmit` only

**Strengths:**
- ✅ Explicit validation for 0, negative, NaN
- ✅ Context-aware conditional validation
- ✅ Business rule enforcement (capacity checks)
- ✅ Clear, specific error messages
- ✅ Returns boolean for flow control

### Customer Forms ⚠️ MINIMAL/INCONSISTENT

**Address Form:**
```html
<!-- HTML5 validation only - no custom logic -->
<input
  type="text"
  required
  value={formData.label}
  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
  placeholder="Contoh: Rumah, Kantor, Apartemen"
  className="w-full rounded-lg border border-gray-300 px-4 py-2..."
/>
```

**Review Form - Basic Length Check:**
```typescript
const handleSubmit = async (e: React.SyntheticEvent) => {
  e.preventDefault();
  if (rating === 0) {
    setErrorMessage("Silakan pilih rating bintang terlebih dahulu.");
    return;
  }
  if (comment.trim().length < 10) {
    setErrorMessage("Ulasan minimal 10 karakter.");
    return;
  }
  // Submit...
};
```

**Checkout - No Field Validation:**
```typescript
const handleCheckout = async () => {
  if (!selectedAddressId) {
    setErrorMessage("Pilih alamat pengiriman terlebih dahulu");
    return;
  }
  // Proceeds without validating notes or other fields
};
```

**Product Detail Page - Client-Side Clamping:**
```typescript
<input
  type="number"
  min="1"
  max={product.stock}
  value={quantity}
  onChange={(e) => {
    const val = parseInt(e.target.value) || 1;
    setQuantity(Math.min(Math.max(1, val), product.stock));
  }}
  className="input-field w-24 text-center text-xl font-bold"
/>
```

**Weaknesses:**
- ⚠️ Heavy reliance on HTML5 validation
- ⚠️ No centralized validation functions
- ⚠️ Mixed inline validation and direct submission
- ⚠️ No NaN/zero/negative explicit checks
- ⚠️ Client-side clamping instead of validation

---

## 3. USER EXPERIENCE

### Florist Forms ✅ EXCELLENT

**Inline Error Display:**
```typescript
<FormField
  label="Harga (Rp)"
  name="price"
  type="number"
  value={formData.price}
  onChange={(value) => onChange("price", value)}
  error={formErrors.price}  // ✅ Per-field errors
  required
  placeholder="50000"
  min={0}
/>

// Renders as:
{error && <p className="mt-1 text-sm text-error">{error}</p>}
```

**Global Submit Error:**
```typescript
{formErrors.submit && (
  <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
    {formErrors.submit}
  </div>
)}
```

**Success Feedback (PreOrder Modal):**
```typescript
{showSuccess && (
  <div className="p-4 bg-success/10 border border-success/30 rounded-xl 
                  flex items-center gap-3 text-success 
                  animate-in fade-in slide-in-from-top-2">
    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
    <div>
      <p className="font-medium">Pre-order berhasil dibuat!</p>
      <p className="text-sm opacity-90">Menunggu konfirmasi dari supplier</p>
    </div>
  </div>
)}
```

**Submit Button States:**
```typescript
<button
  type="submit"
  disabled={isSubmitting}
  className="flex-1 btn-primary text-sm"
>
  {isSubmitting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Menyimpan...
    </>
  ) : (
    <>
      <Package className="w-4 h-4" />
      {mode === "create" ? "Tambah Produk" : "Simpan Perubahan"}
    </>
  )}
</button>
```

**Input Protection (Inventory):**
```typescript
<input
  type="number"
  value={formData.quantity}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '' || parseInt(value) >= 0) {  // ✅ Prevents negative input
      onFormChange("quantity", value);
    }
  }}
  className={`input-field ${formErrors.quantity ? "border-error" : ""}`}
  placeholder="100"
  min="0"
/>
```

### Customer Forms ⚠️ BASIC

**Generic Error Display:**
```typescript
{error && (
  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 
                  p-4 text-sm text-red-700">
    {error}
  </div>
)}
```

**No Field-Level Errors:**
```typescript
// Address form - errors not shown per field
<input
  type="text"
  required
  value={formData.recipientName}
  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
  placeholder="Nama lengkap penerima"
  className="w-full rounded-lg border border-gray-300..."  // ❌ No error styling
/>
```

**Basic Loading State:**
```typescript
<button
  type="submit"
  disabled={isSubmitting}
  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2..."
>
  {isSubmitting ? "Menyimpan..." : "Simpan Alamat"}
</button>
```

---

## 4. FORM COMPONENTS

### Florist Forms ✅ ABSTRACTED

**FormField Component:**
```typescript
// Reusable component with consistent UX
interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "number" | "email" | "textarea" | "select" | "date";
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
}

export default function FormField({ label, name, type, value, onChange, error, required, ... }) {
  const inputClasses = `input-field ${error ? "border-error" : ""}`;
  
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {renderInput()}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
```

**Modal Component:**
```typescript
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title={mode === "create" ? "Tambah Produk Baru" : "Edit Produk"}
  subtitle="Isi detail produk yang akan dijual"
  size="md"
>
  <form onSubmit={onSubmit} className="space-y-4">
    {/* Form fields */}
  </form>
</Modal>
```

**Usage in ProductModal:**
```typescript
<FormField
  label="Nama Produk"
  name="name"
  type="text"
  value={formData.name}
  onChange={(value) => onChange("name", value)}
  error={formErrors.name}
  required
  placeholder="Contoh: Buket Mawar Premium"
/>

<FormField
  label="Kategori"
  name="categoryId"
  type="select"
  value={formData.categoryId}
  onChange={(value) => onChange("categoryId", value)}
  error={formErrors.categoryId}
  required
  options={categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))}
/>
```

**Strengths:**
- ✅ DRY principle - no repeated markup
- ✅ Consistent error handling
- ✅ Unified styling across all forms
- ✅ Easy to maintain and update
- ✅ Type-safe props

### Customer Forms ❌ NO ABSTRACTION

**Manual Markup Repeated:**
```typescript
// Address Form - every field manually coded
<div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Label Alamat <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    required
    value={formData.label}
    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
    placeholder="Contoh: Rumah, Kantor, Apartemen"
    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm..."
  />
</div>

<div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Nama Penerima <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    required
    value={formData.recipientName}
    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
    placeholder="Nama lengkap penerima"
    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm..."
  />
</div>

// ... 6 more similar blocks
```

**Weaknesses:**
- ❌ High code duplication
- ❌ Inconsistent styling (Tailwind classes vary)
- ❌ Difficult to maintain
- ❌ No error display pattern
- ❌ Changes require updating multiple files

---

## 5. SUBMISSION FLOW

### Florist Forms ✅ ROBUST

**Standard Pattern:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (isSubmitting) return;  // ✅ Prevent double submit
  if (!validateForm()) return;  // ✅ Validate first

  setIsSubmitting(true);

  try {
    const payload = {
      name: formData.name.trim(),  // ✅ Clean data
      description: formData.description.trim() || null,
      price: parseFloat(formData.price),  // ✅ Type conversion
      stock: parseInt(formData.stock),
      // ... transform data
    };

    const url = modalMode === "create" 
      ? "/api/florist/products"
      : `/api/florist/products/${selectedProduct?.id || ""}`;
    
    if (modalMode === "edit" && !selectedProduct?.id) {
      throw new Error("Product ID is missing");  // ✅ Guard clause
    }

    const method = modalMode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Gagal menyimpan produk");
    }

    await fetchProducts();  // ✅ Refresh data
    closeModal();  // ✅ Clean exit
  } catch (err: any) {
    setFormErrors({ submit: err.message });  // ✅ User-facing error
  } finally {
    setIsSubmitting(false);  // ✅ Always reset
  }
};
```

**Shipment - Session Error Handling:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    const payload: any = {
      courier: formData.courier.trim(),
      service: formData.service.trim() || null,
      trackingNumber: formData.trackingNumber.trim() || null,
      estimatedDays: formData.estimatedDays ? parseInt(formData.estimatedDays) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
    };

    if (modalMode === "create") {
      payload.orderId = selectedOrderId;
      payload.status = "PENDING";
      const res = await fetch("/api/florist/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal membuat shipment");
      await fetchPaidOrders();  // ✅ Refresh related data
    } else {
      payload.status = formData.status;
      const res = await fetch(`/api/florist/shipments/${selectedShipment?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memperbarui shipment");
    }

    await fetchData();  // ✅ Refresh all data
    closeModal();
    setActiveTab("shipments");  // ✅ Navigate after success
  } catch (err: any) {
    setFormErrors({ submit: err.message });
  } finally {
    setIsSubmitting(false);
  }
};
```

**PreOrder - Success Animation:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    const payload = {
      harvestAnnouncementId: announcement.id,
      quantity: parseInt(formData.quantity),
      notes: formData.notes || null,
    };

    const res = await fetch("/api/florist/preorders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Gagal membuat pre-order");
    }

    // ✅ Show success notification
    setShowSuccess(true);
    
    // ✅ Reset form
    setFormData({ quantity: "", notes: "" });
    setFormErrors({});
    
    // ✅ Delayed callback for better UX
    setTimeout(() => {
      setShowSuccess(false);
      onSuccess();
    }, 1500);
  } catch (err: any) {
    setFormErrors({ submit: err.message });
  } finally {
    setIsSubmitting(false);
  }
};
```

### Customer Forms ⚠️ INCONSISTENT

**Address Form - Basic Pattern:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  try {
    await onSubmit(formData);  // ❌ No validation, delegates to parent
  } catch (err) {
    setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    setIsSubmitting(false);  // ❌ Not in finally
  }
};
```

**Checkout - Complex Midtrans Integration:**
```typescript
const handleCheckout = async () => {
  if (!selectedAddressId) {
    setErrorMessage("Pilih alamat pengiriman terlebih dahulu");
    return;
  }
  setIsLoading(true);
  setErrorMessage(null);

  try {
    // Create order
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

    // Get payment token
    const orderId = checkoutResponse.data.order.id;
    const paymentResponse = await createPaymentToken(orderId);
    const snapToken = paymentResponse.data.token;

    // ⚠️ External dependency - Midtrans popup
    if (typeof window !== "undefined" && window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: function (result: any) {
          clearCart();
          window.location.href = `/orders/${orderId}`;  // ⚠️ Hard navigation
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
      setErrorMessage("Script pembayaran Midtrans belum siap dimuat...");
      setIsLoading(false);
    }
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan...");
    setIsLoading(false);  // ❌ Not in finally
  }
};
```

**Review Form:**
```typescript
const handleSubmit = async (e: React.SyntheticEvent) => {
  e.preventDefault();
  if (rating === 0) {
    setErrorMessage("Silakan pilih rating bintang terlebih dahulu.");
    return;
  }
  if (comment.trim().length < 10) {
    setErrorMessage("Ulasan minimal 10 karakter.");
    return;
  }

  try {
    setIsSubmitting(true);
    setErrorMessage(null);
    await createProductReview(productId, {
      rating,
      comment: comment.trim(),
    });

    setSuccessMessage("Terima kasih! Ulasan Anda berhasil dikirim.");
    setComment("");
    onReviewSubmitted();
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : "Gagal mengirim ulasan");
  } finally {
    setIsSubmitting(false);  // ✅ Correct finally usage
  }
};
```

---

## 6. ACCESSIBILITY

### Florist Forms ✅ GOOD

**Label Association:**
```typescript
<label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
  {label}
  {required && <span className="text-error ml-1">*</span>}
</label>
<input
  id={name}
  name={name}
  type={type}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  ...
/>
```

**Error Announcements:**
```typescript
{error && <p className="mt-1 text-sm text-error">{error}</p>}
// ✅ Visible error text read by screen readers
```

**Semantic Buttons:**
```typescript
<button
  type="submit"
  disabled={isSubmitting}
  className="flex-1 btn-primary text-sm"
>
  {isSubmitting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Menyimpan...
    </>
  ) : (
    <>
      <Package className="w-4 h-4" />
      {mode === "create" ? "Tambah Produk" : "Simpan Perubahan"}
    </>
  )}
</button>
```

**Focus Management:**
```typescript
// Modal closes on submit success - returns focus
closeModal();
```

### Customer Forms ⚠️ BASIC

**Label Association:**
```typescript
<label className="mb-1 block text-sm font-medium text-gray-700">
  Nama Penerima <span className="text-red-500">*</span>
</label>
<input
  type="text"
  required
  value={formData.recipientName}
  // ❌ No id/htmlFor connection
  ...
/>
```

**Review Form - Interactive Rating:**
```typescript
{[1, 2, 3, 4, 5].map((star) => (
  <button
    key={star}
    type="button"
    onClick={() => setRating(star)}
    onMouseEnter={() => setHoveredRating(star)}
    onMouseLeave={() => setHoveredRating(0)}
    className="p-1 transition hover:scale-110"
    aria-label={`Bintang ${star}`}  // ✅ Good ARIA label
  >
    <Star className={...} />
  </button>
))}
```

---

## COMPARISON SUMMARY

### Which Role Has Better Form UX?
**Winner: Florist** ⭐⭐⭐⭐⭐

| Aspect | Florist | Customer |
|--------|---------|----------|
| **Error Messages** | Inline per-field + global | Generic global only |
| **Loading States** | Icon + text + disabled | Text only |
| **Success Feedback** | Animated notifications | Basic text |
| **Input Protection** | Prevents negative/invalid | Basic HTML5 |
| **Validation Timing** | onSubmit with clear errors | Mixed/HTML5 |

### Which Has Cleaner Validation Logic?
**Winner: Florist** ⭐⭐⭐⭐⭐

| Aspect | Florist | Customer |
|--------|---------|----------|
| **Validation Functions** | Centralized, reusable | Inline mixed |
| **Error Specificity** | NaN, zero, negative, range | Generic required |
| **Business Rules** | Capacity, status, conditional | None |
| **Number Handling** | Explicit isNaN/zero checks | HTML5 + clamping |

### Which Is More Reusable?
**Winner: Florist** ⭐⭐⭐⭐⭐

| Component | Florist | Customer |
|-----------|---------|----------|
| **FormField** | ✅ Reusable across 4+ forms | ❌ None |
| **Modal** | ✅ Reusable wrapper | ❌ Inline modals |
| **Validation** | ✅ Pattern can be extracted | ❌ Each form unique |
| **State Management** | ✅ Consistent pattern | ❌ Ad-hoc |

### Which Follows Best Practices Better?
**Winner: Florist** ⭐⭐⭐⭐⭐

| Best Practice | Florist | Customer |
|---------------|---------|----------|
| **DRY Principle** | ✅ Minimal duplication | ❌ High duplication |
| **Single Responsibility** | ✅ Components focused | ⚠️ Mixed concerns |
| **Type Safety** | ✅ Full TypeScript | ✅ TypeScript (less strict) |
| **Error Handling** | ✅ Comprehensive try/catch/finally | ⚠️ Inconsistent finally |
| **Controlled Components** | ✅ Fully controlled | ✅ Fully controlled |
| **Accessibility** | ✅ Labels, ARIA, semantics | ⚠️ Missing label associations |

---

## KEY CODE SNIPPETS

### Florist: Reusable FormField Pattern

```typescript
// components/forms/FormField.tsx
export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  placeholder,
  options,
  rows = 3,
  min,
  max,
  step,
  disabled = false,
}: FormFieldProps) {
  const inputClasses = `input-field ${error ? "border-error" : ""}`;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {/* Renders: input, textarea, or select based on type */}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
```

### Florist: Validation with Explicit Checks

```typescript
// Inventory Modal
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  const qtyString = formData.quantity.trim();
  
  if (!qtyString) {
    errors.quantity = "Quantity tidak boleh kosong";
  } else {
    const qty = parseInt(qtyString, 10);
    
    if (isNaN(qty)) {
      errors.quantity = "Quantity harus berupa angka valid";
    } else if (qty === 0) {
      errors.quantity = "Quantity tidak boleh 0";
    } else if (qty < 0) {
      errors.quantity = "Quantity tidak boleh negatif";
    }
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### Customer: Manual Form Without Abstraction

```typescript
// Address Form - All fields manually coded
<div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Label Alamat <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    required
    value={formData.label}
    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
    placeholder="Contoh: Rumah, Kantor, Apartemen"
    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm..."
  />
</div>
{/* Repeat 7 more times with slight variations */}
```

### Customer: Inline Validation (Review Form)

```typescript
const handleSubmit = async (e: React.SyntheticEvent) => {
  e.preventDefault();
  if (rating === 0) {
    setErrorMessage("Silakan pilih rating bintang terlebih dahulu.");
    return;
  }
  if (comment.trim().length < 10) {
    setErrorMessage("Ulasan minimal 10 karakter.");
    return;
  }
  // Submit...
};
```

---

## RECOMMENDATIONS

### For Customer Forms (Urgent Improvements)

1. **Create Reusable FormField Component**
   - Extract common input pattern
   - Add per-field error display
   - Implement consistent styling

2. **Centralize Validation Logic**
   - Create validation functions
   - Add NaN/zero/negative checks
   - Move away from HTML5-only validation

3. **Improve Error UX**
   - Add field-level error messages
   - Highlight invalid fields
   - Provide specific error text

4. **Fix Accessibility**
   - Add `id`/`htmlFor` associations
   - Ensure error announcements
   - Test with screen readers

5. **Standardize State Management**
   - Use consistent `formData` pattern
   - Separate `formErrors` state
   - Add `isSubmitting` guards

### For Florist Forms (Minor Enhancements)

1. **Extract Validation Patterns**
   - Create validation utility functions
   - Share common validators (isPositiveNumber, isNonEmpty)
   - Consider validation schema (Zod)

2. **Add Form Libraries**
   - Consider React Hook Form for complex forms
   - Reduce boilerplate
   - Built-in validation

3. **Enhance Success Feedback**
   - Add success animations to all forms (like PreOrder)
   - Toast notifications for non-modal forms
   - Clear success messages

4. **Improve Type Safety**
   - Define stricter form data types
   - Use discriminated unions for form modes
   - Type validation error keys

---

## TECHNICAL DEBT

### Customer Forms
- ❌ **High duplication** - Each form reimplements basic patterns
- ❌ **Inconsistent error handling** - No standard approach
- ❌ **No validation abstraction** - Each form validates differently
- ❌ **Accessibility gaps** - Missing label associations
- ⚠️ **HTML5 reliance** - No JavaScript validation fallback

### Florist Forms
- ⚠️ **Validation boilerplate** - Could use schema validation
- ⚠️ **Type conversions** - Manual parseInt/parseFloat in every form
- ✅ **Minimal debt** - Well-structured and maintainable

---

## CONCLUSION

**Florist forms demonstrate production-ready patterns** with reusable components, comprehensive validation, excellent UX feedback, and consistent architecture. The `FormField` component and centralized validation approach create a maintainable, scalable system.

**Customer forms require significant refactoring** to match the quality of florist forms. The lack of abstraction, minimal validation, and inconsistent patterns create maintenance burden and poor user experience.

**Recommended Action:** Refactor customer forms to use the florist form architecture as a template. Extract the `FormField` component for global use, implement validation functions, and standardize error handling across all customer-facing forms.
