# Review Validation Test Plan

## Changes Made

### 1. API Validation (`app/api/products/[id]/reviews/route.ts`)
- ✅ Added purchase validation before allowing review submission
- ✅ Only allows users with DELIVERED orders to submit reviews
- ✅ Returns 403 error with Indonesian message if user hasn't purchased
- ✅ Removed redundant verification query (reuses purchase check)

### 2. Purchase Check Endpoint (`app/api/products/[id]/check-purchase/route.ts`)
- ✅ Created new endpoint to check user's purchase status
- ✅ Returns three states:
  - `DELIVERED`: User can review
  - `PENDING`: User purchased but order not delivered yet
  - `NOT_PURCHASED`: User never purchased the product

### 3. UI Updates (`components/customer/ReviewForm.tsx`)
- ✅ Added purchase status check on component mount
- ✅ Shows appropriate message based on status:
  - Not purchased: "Beli produk ini untuk memberikan ulasan"
  - Pending: "Ulasan tersedia setelah pesanan diterima"
  - Delivered: Shows review form
- ✅ Added loading state while checking purchase status
- ✅ Added ShoppingBag icon for better UX

## Test Scenarios

### Test 1: User Not Logged In
**Expected:** Login prompt message
**Status:** ✅ Already implemented

### Test 2: User Never Purchased Product
**Steps:**
1. Login as customer with no purchase history for the product
2. Navigate to product detail page
3. Scroll to review section

**Expected:**
- UI shows: "Belum Membeli Produk" with message "Beli produk ini untuk memberikan ulasan"
- Review form is hidden
- If they try to submit via API directly: 403 error

### Test 3: User Purchased But Not Yet Delivered
**Steps:**
1. Login as customer with order status PAID/PROCESSING/SHIPPED
2. Navigate to product detail page
3. Scroll to review section

**Expected:**
- UI shows: "Pesanan Dalam Proses" with message "Ulasan tersedia setelah pesanan diterima"
- Review form is hidden
- If they try to submit via API directly: 403 error

### Test 4: User Purchased and Delivered
**Steps:**
1. Login as customer with DELIVERED order
2. Navigate to product detail page
3. Scroll to review section

**Expected:**
- Review form is visible
- User can submit review successfully
- After submission, review appears in the list

### Test 5: API Direct Access (Security)
**Steps:**
1. Use Postman/curl to POST to `/api/products/{id}/reviews`
2. Try with user who hasn't purchased

**Expected:**
- 403 Forbidden
- Response: `{ "success": false, "message": "Anda harus membeli dan menerima produk ini untuk memberikan ulasan" }`

## Database Requirements

For proper testing, ensure:
- Order status must be exactly "DELIVERED" (not just "SHIPPED")
- OrderItem must link to correct Order and Product
- Order must belong to the user attempting to review

## Quick Manual Test Commands

```bash
# Check if build succeeds
npm run build

# Start dev server
npm run dev

# Test endpoints (replace IDs)
curl -X GET http://localhost:3000/api/products/{productId}/check-purchase \
  -H "Cookie: your-session-cookie"

curl -X POST http://localhost:3000/api/products/{productId}/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"rating": 5, "comment": "Test review"}'
```

## Files Modified

1. `app/api/products/[id]/reviews/route.ts` - Added purchase validation
2. `app/api/products/[id]/check-purchase/route.ts` - New endpoint (created)
3. `components/customer/ReviewForm.tsx` - Added UI conditional rendering

## Security Improvements

✅ **Before:** Any logged-in customer could review any product
✅ **After:** Only customers who purchased AND received the product can review

This prevents:
- Fake reviews from competitors
- Reviews from users who never tried the product
- Spam reviews
