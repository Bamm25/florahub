# Coupon Discount Bug - Root Cause Analysis

## Issue
- **Coupon Code:** HEMAT25
- **Subtotal:** Rp 450,000
- **Current Discount:** Rp 15 ❌
- **Expected Discount:** Rp 112,500 (25% of 450,000) ✓

## Root Cause
The `value` field in the `Coupon` table has **incorrect data**:
- **Current value in DB:** `0.00333` (or similar small decimal)
- **Correct value:** `25`

### Calculation Proof
```typescript
// Current (wrong):
discount = (450,000 × 0.00333) / 100 = 15

// Expected (correct):
discount = (450,000 × 25) / 100 = 112,500
```

## Why This Happened
According to `prisma/schema.prisma` line 502:
```typescript
value Int // Untuk PERCENTAGE: simpan 10 (bukan 0.1), untuk FIXED: rupiah
```

The coupon was likely created with `value = 0.25` (treating it as a decimal 0.25 = 25%), but the schema expects the integer `25` for 25%.

## Code Analysis
The calculation logic in both routes is **correct**:

### ✅ `app/api/customer/checkout/route.ts` (lines 189-191)
```typescript
if (coupon.type === "PERCENTAGE") {
  const rawDiscount = (subtotal * coupon.value) / 100;
  discount = Math.round(rawDiscount);
}
```

### ✅ `app/api/customer/coupons/validate/route.ts` (lines 100-101)
```typescript
if (coupon.type === "PERCENTAGE") {
  const calculatedDiscount = (subtotal * coupon.value) / 100;
}
```

Both correctly divide by 100, expecting integer percentage values (25 for 25%, not 0.25).

## Solution
Update the database to fix the incorrect value:

```sql
UPDATE "Coupon" 
SET value = 25 
WHERE code = 'HEMAT25' AND type = 'PERCENTAGE';
```

## Verification
After fix, the calculation will work correctly:
- **Subtotal:** Rp 450,000
- **Calculation:** (450,000 × 25) / 100 = 112,500
- **Final Discount:** Rp 112,500 ✓

## Prevention
The admin coupon creation route (`app/api/admin/coupons/route.ts` lines 83-92) already validates:
```typescript
if (type === "PERCENTAGE" && (value < 1 || value > 100)) {
  return NextResponse.json({
    success: false,
    message: "Untuk tipe PERCENTAGE, nilai value harus antara 1 sampai 100 persen"
  }, { status: 400 });
}
```

This ensures future coupons will have correct integer values (1-100).
