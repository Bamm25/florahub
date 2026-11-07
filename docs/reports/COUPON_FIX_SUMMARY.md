# HEMAT25 Coupon Bug - FIXED ✓

**Date:** 2026-11-07  
**Status:** ✅ Resolved

## Problem
- **Coupon:** HEMAT25 (25% discount)
- **Subtotal:** Rp 450,000
- **Wrong Discount:** Rp 15 ❌
- **Expected Discount:** Rp 112,500 ✓

## Root Cause
Database had incorrect value for HEMAT25 coupon:
- **Stored value:** ~0.00333 (decimal)
- **Correct value:** 25 (integer)

The schema expects integer percentages (25 for 25%, not 0.25), as documented in `prisma/schema.prisma` line 502:
```
value Int // Untuk PERCENTAGE: simpan 10 (bukan 0.1)
```

## Fix Applied
Executed SQL update:
```sql
UPDATE "Coupon" 
SET value = 25 
WHERE code = 'HEMAT25' AND type = 'PERCENTAGE';
```

## Verification
After fix, calculation now works correctly:
- Formula: `(450,000 × 25) / 100 = 112,500`
- ✅ Discount: Rp 112,500 (correct)

## Code Analysis
All calculation logic was already correct:

### API Route (`app/api/customer/checkout/route.ts`)
```typescript
if (coupon.type === "PERCENTAGE") {
  const rawDiscount = (subtotal * coupon.value) / 100;
  discount = Math.round(rawDiscount);
}
```

### Frontend (`components/customer/CheckoutSummary.tsx`)
```typescript
const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
const finalTotal = Math.max(0, subtotal + shippingCost - discount);
```

Both components correctly display the discount from the API response.

## Files Modified
1. ✅ Database: Updated `Coupon` table value for HEMAT25
2. 📄 `fix_hemat25_coupon.sql` - SQL fix script
3. 📄 `verify_coupon_fix.sql` - Verification query
4. 📄 `COUPON_BUG_ANALYSIS.md` - Detailed analysis

## Prevention
The admin coupon creation API already validates percentage values (1-100), preventing future occurrences.

## Test Results
- ✅ Database update successful
- ✅ Calculation logic verified
- ✅ Frontend display logic verified
- ✅ Expected discount: Rp 112,500 for Rp 450,000 subtotal with 25% coupon
