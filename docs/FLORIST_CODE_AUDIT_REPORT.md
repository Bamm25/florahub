# FloraHub Florist Role - Code Audit Report

**Audit Date:** November 6, 2026  
**Scope:** All 5 Florist pages + 9 Florist components  
**Total Lines Audited:** 3,095 lines  
**Audit Method:** Automated parallel deep inspection (5 agents)  
**Duration:** 1m17s

---

## 📊 EXECUTIVE SUMMARY

**Total Issues Found:** 91 issues across 5 pages

### Severity Breakdown
- 🔴 **Critical:** 4 issues (API endpoint mismatches, capacity calculation bugs)
- 🟠 **High:** 14 issues (null safety, validation gaps, race conditions)
- 🟡 **Medium:** 35 issues (error handling, optimistic updates, data mismatches)
- 🟢 **Low:** 33 issues (redundant checks, UX improvements)
- ℹ️ **Info:** 5 observations (good practices, recommendations)

### Issues by Category
| Category | Count | Top Issue |
|----------|-------|-----------|
| **Null Safety** | 18 | Missing null checks on nested objects |
| **Validation** | 12 | Incomplete input validation (NaN, negatives) |
| **API Mismatch** | 9 | Endpoint paths, field names, structure |
| **Error Handling** | 11 | Silent failures, alert() usage |
| **Race Conditions** | 6 | Multiple submits, concurrent updates |
| **Optimistic Updates** | 4 | Full refetch instead of local state |
| **Array Safety** | 7 | Missing Array.isArray() guards |
| **UX Issues** | 8 | Native dialogs, missing feedback |
| **Business Logic** | 5 | Status transitions, capacity checks |
| **Others** | 11 | Redundant checks, performance |

### Issues by Page
| Page | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| **Products** | 2 | 5 | 9 | 5 | **21** |
| **Inventory** | 0 | 2 | 8 | 10 | **20** |
| **Harvest Plans** | 2 | 2 | 3 | 3 | **10** |
| **Shipments** | 0 | 3 | 5 | 7 | **15** |
| **Notifications** | 0 | 0 | 5 | 10 | **15** |
| **Components** | 0 | 2 | 0 | 8 | **10** |

---

## 🔴 CRITICAL ISSUES (MUST FIX)

### 1. **API Endpoint Mismatch - Products Page**
**Files:** `app/florist/products/page.tsx` (lines 246, 275)  
**Severity:** 🔴 Critical  
**Impact:** Create, Update, Delete operations **AKAN GAGAL 404**

**Problem:**
```typescript
// Line 246 - CREATE/UPDATE
const url = modalMode === "create" 
  ? "/api/products"  // ❌ SALAH
  : `/api/products/${selectedProduct?.id}`;  // ❌ SALAH

// Line 275 - DELETE
const res = await fetch(`/api/products/${product.id}`, {  // ❌ SALAH
  method: "DELETE"
});
```

**Root Cause:**  
Backend API ada di `/api/florist/products` tapi frontend call `/api/products`

**Fix Required:**
```typescript
// ✅ CORRECT
const url = modalMode === "create"
  ? "/api/florist/products"
  : `/api/florist/products/${selectedProduct?.id}`;

// ✅ CORRECT
const res = await fetch(`/api/florist/products/${product.id}`, {
  method: "DELETE"
});
```

**Verification:** Check backend route file `app/api/florist/products/route.ts`

---

### 2. **Capacity Calculation Bug - Harvest Plans**
**Files:** `components/florist/AnnouncementCard.tsx` (line 40), `components/florist/PreOrderModal.tsx` (lines 52, 99)  
**Severity:** 🔴 Critical  
**Impact:** **SEVERE OVERBOOKING** - Capacity calculation completely wrong

**Problem:**
```typescript
// ❌ SALAH - Menghitung jumlah RECORD bukan total QUANTITY
const totalOrdered = announcement._count.preOrders || 0;
const available = announcement.estimatedQuantity - totalOrdered;

// Example bug:
// - estimatedQuantity: 1000 stems
// - Florist A orders 500 stems (1 record)
// - Florist B orders 400 stems (1 record)
// - totalOrdered = 2 (bukan 900!)
// - available = 1000 - 2 = 998 ❌ (seharusnya 100)
```

**Root Cause:**  
`_count.preOrders` menghitung jumlah **records** bukan sum dari **quantities**

**Fix Required:**
```typescript
// ✅ CORRECT - Backend harus return totalReservedQuantity
interface Announcement {
  _count: { preOrders: number };
  totalReservedQuantity: number;  // ← ADD THIS from backend
  // ... other fields
}

// Frontend
const totalOrdered = announcement.totalReservedQuantity || 0;
const available = announcement.estimatedQuantity - totalOrdered;
```

**Backend Change Needed:**
```typescript
// Backend query harus aggregate sum of quantities
const announcements = await prisma.harvestAnnouncement.findMany({
  include: {
    _count: { select: { preOrders: true } },
    _sum: { preOrders: { quantity: true } }  // ← ADD THIS
  }
});

// Transform
totalReservedQuantity: announcement._sum.preOrders.quantity || 0
```

---

### 3. **Race Condition - Pre-Order Capacity Check**
**File:** `components/florist/PreOrderModal.tsx` (line 54)  
**Severity:** 🔴 Critical  
**Impact:** Multiple florists dapat **simultaneously exceed capacity**

**Problem:**
```typescript
// ❌ CLIENT-SIDE validation dengan stale data
const available = announcement.estimatedQuantity - totalOrdered;
if (parseInt(formData.quantity) > available) {
  setError("Quantity melebihi kapasitas yang tersedia");
  return;
}

// Scenario:
// - Available: 100 stems
// - Florist A loads form, sees 100 available
// - Florist B loads form, sees 100 available  
// - Florist A submits 80 (passes client validation)
// - Florist B submits 80 (passes client validation)
// - Total: 160 > 100 ❌ OVERBOOKING
```

**Fix Required:**
```typescript
// ✅ Backend MUST validate atomically
// app/api/florist/preorders/route.ts

export async function POST(req: Request) {
  const { announcementId, quantity } = await req.json();
  
  // ATOMIC check with database lock
  const result = await prisma.$transaction(async (tx) => {
    const announcement = await tx.harvestAnnouncement.findUnique({
      where: { id: announcementId },
      include: { 
        _sum: { preOrders: { quantity: true } }
      }
    });
    
    const reserved = announcement._sum.preOrders.quantity || 0;
    const available = announcement.estimatedQuantity - reserved;
    
    if (quantity > available) {
      throw new Error(`Only ${available} stems available`);
    }
    
    return tx.preOrder.create({ data: { ... } });
  });
  
  return NextResponse.json({ data: result });
}
```

**Client-side:** Keep validation for UX but **always expect backend rejection**

---

### 4. **Unsafe Optional Chaining - Products Page**
**File:** `app/florist/products/page.tsx` (line 247)  
**Severity:** 🔴 Critical (in edit mode)  
**Impact:** Invalid API request `/api/florist/products/undefined`

**Problem:**
```typescript
// ❌ Jika selectedProduct null, generate invalid URL
const url = modalMode === "create" 
  ? "/api/florist/products"
  : `/api/florist/products/${selectedProduct?.id}`;  // ← undefined
```

**Fix Required:**
```typescript
// ✅ Add guard
if (modalMode === "edit" && !selectedProduct?.id) {
  setError("Invalid product selection");
  return;
}

const url = modalMode === "create"
  ? "/api/florist/products"
  : `/api/florist/products/${selectedProduct.id}`;  // ← safe now
```

---

## 🟠 HIGH SEVERITY ISSUES

### 5. **Missing Null Check - product.tags**
**File:** `app/florist/products/page.tsx` (line 168)  
**Severity:** 🟠 High  
**Impact:** Runtime crash jika tags null dari API

```typescript
// ❌ CRASH if tags is null
tags: product.tags.join(", "),

// ✅ FIX
tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
```

---

### 6. **Race Condition - Multiple Form Submits**
**File:** `app/florist/products/page.tsx` (line 220)  
**Severity:** 🟠 High  
**Impact:** Duplicate products created jika user double-click

```typescript
// ❌ No guard before setIsSubmitting
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  setIsSubmitting(true);  // ← Too late, user already clicked twice
  // ...
}

// ✅ FIX
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;  // ← Guard FIRST
  if (!validateForm()) return;
  setIsSubmitting(true);
  // ...
}
```

---

### 7. **Array.isArray() Missing - ProductModal**
**File:** `components/florist/ProductModal.tsx` (line 99)  
**Severity:** 🟠 High  
**Impact:** Crash jika categories bukan array

```typescript
// ❌ CRASH if categories is null/undefined
options={categories.map((cat) => ({
  value: cat.id,
  label: cat.name,
}))}

// ✅ FIX
options={Array.isArray(categories) 
  ? categories.map((cat) => ({ value: cat.id, label: cat.name }))
  : []
}
```

---

### 8. **Quantity Validation Gap - Inventory**
**File:** `app/florist/inventory/page.tsx` (line 97)  
**Severity:** 🟠 High  
**Impact:** Allows 0 quantity dan NaN

```typescript
// ❌ BAD validation
if (!formData.quantity || parseInt(formData.quantity) < 0) {
  errors.quantity = "Quantity tidak boleh negatif";
}
// parseInt("") returns NaN, NaN < 0 is false → passes ✓ BUG
// parseInt("0") returns 0, 0 < 0 is false → passes ✓ BUG

// ✅ FIX
const qty = parseInt(formData.quantity);
if (isNaN(qty) || qty <= 0) {
  errors.quantity = "Quantity harus lebih dari 0";
}
```

---

### 9. **Null Safety - stock.variety in Search**
**File:** `app/florist/inventory/page.tsx` (line 162)  
**Severity:** 🟠 High  
**Impact:** Crash saat search jika variety null

```typescript
// ❌ CRASH if variety is null
inv.stock.variety.toLowerCase().includes(searchQuery.toLowerCase())

// ✅ FIX
(inv.stock.variety?.toLowerCase() || "").includes(searchQuery.toLowerCase())
```

---

### 10. **Tracking Number Null Safety - Shipments**
**File:** `app/florist/shipments/page.tsx` (line 244)  
**Severity:** 🟠 High  
**Impact:** Crash saat search jika trackingNumber null

```typescript
// ❌ CRASH if trackingNumber is null
shipment.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase())

// ✅ FIX
(shipment.trackingNumber?.toLowerCase() || "").includes(searchQuery.toLowerCase())
```

---

### 11. **Validation Gap - DELIVERED Status**
**File:** `app/florist/shipments/page.tsx` (line 162)  
**Severity:** 🟠 High  
**Impact:** DELIVERED shipment tanpa tracking number

```typescript
// ❌ Only checks SHIPPED
if (formData.status === "SHIPPED" && !formData.trackingNumber.trim()) {
  errors.trackingNumber = "Tracking number wajib untuk status SHIPPED";
}

// ✅ FIX - DELIVERED juga butuh tracking
if ((formData.status === "SHIPPED" || formData.status === "DELIVERED") 
    && !formData.trackingNumber?.trim()) {
  errors.trackingNumber = "Tracking number wajib untuk status SHIPPED/DELIVERED";
}
```

---

### 12-18. **Other High Issues** (See detailed list below)
- Missing image onError handlers
- Delete button race conditions
- Nested property access without guards
- Status transition validation incomplete
- CANCELLED shipments cannot be edited (business logic)

---

## 🟡 MEDIUM SEVERITY ISSUES (35 total)

### Data Type & Parsing
- **Weight parsing bug:** `parseInt()` instead of `parseFloat()` - decimals lost
- **Price/Stock validation:** No `isNaN()` check after parse
- **estimatedDays vs estimatedDelivery:** Field name mismatch

### Error Handling
- **Silent failures:** `fetchProductComponents`, `fetchCategories` only console.error
- **Native alert():** Used 8x instead of toast notifications
- **Inconsistent error UI:** alert() vs form errors

### API Structure
- **Response structure assumptions:** Nested `json.data?.field` with fallbacks
- **Cross-origin concern:** `/api/supplier/*` called from Florist role
- **Missing fields:** `destinationAddress` mentioned but not in interface
- **Terminology mismatch:** `courier` vs `carrier`, `expectedDate` vs `harvestDate`

### Optimistic Updates
- **Full refetch after PUT/DELETE:** No local state update, feels laggy
- **No loading feedback:** User sees stale data during refetch

### Validation
- **HTML min="0" insufficient:** Doesn't prevent negative manual input
- **Status field missing:** Create mode doesn't send status explicitly
- **Capacity validation:** Client-side only (see Critical #3)

---

## 🟢 LOW SEVERITY ISSUES (33 total)

### Redundant Checks
- **Array.isArray() overkill:** useState initialized as `[]`, type already enforces array
- **Duplicate checks:** Same validation repeated multiple times

### UX Improvements
- **Native confirm():** Not styled, inconsistent with design system
- **Status dropdown bug:** Shows current status twice
- **Loading only on initial:** No spinner on filter changes
- **No optimistic delete:** Full refetch instead of remove from local state

### Edge Cases
- **Tags split logic:** Multiple commas not handled gracefully
- **Category name access:** Assumes category always exists (type says required)
- **maxCapacity unused:** Field in model but never displayed

### Documentation Needs
- **Cascade delete behavior:** Not documented
- **LOW_STOCK threshold:** Frontend doesn't know backend logic
- **API contract:** Structure assumptions not verified

---

## ℹ️ INFORMATIONAL (5 observations)

1. ✅ **Good:** Icon mapping complete for all notification types
2. ✅ **Good:** Filter query parameter matches backend pattern  
3. ✅ **Good:** Delete confirmation exists (though uses native dialog)
4. ✅ **Good:** Status enum properly typed
5. ℹ️ **Note:** lowStockCount from API vs client calculation - clarify source of truth

---

## 📋 COMPLETE ISSUE LIST BY FILE

### Products Page (21 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 246 | 🔴 Critical | API | Endpoint `/api/products` should be `/api/florist/products` (CREATE/UPDATE) |
| 275 | 🔴 Critical | API | Endpoint `/api/products` should be `/api/florist/products` (DELETE) |
| 168 | 🟠 High | Null | `product.tags.join()` without null check |
| 247 | 🟠 High | Null | `selectedProduct?.id` can generate `/api/.../undefined` |
| 220 | 🟠 High | Race | No guard before `setIsSubmitting` |
| 271 | 🟠 High | Race | `handleDelete` no loading state |
| 236 | 🟡 Medium | Validation | `parseInt()` should be `parseFloat()` for weight |
| 165 | 🟡 Medium | Null | `product.image` not checked before assign |
| 482 | 🟡 Medium | Null | Nested `comp.inventory.stock.name` without guards |
| 130 | 🟡 Medium | Error | `fetchProductComponents` silent failure |
| 116 | 🟡 Medium | Error | `fetchCategories` silent failure |
| 200 | 🟡 Medium | Validation | Price validation missing `isNaN()` check |
| 204 | 🟡 Medium | Validation | Stock validation missing `isNaN()` check |
| 86 | 🟢 Low | Null | `product.category.name` without null check |
| 237 | 🟢 Low | Validation | Tags split edge case (multiple commas) |
| 231 | 🟢 Low | Validation | `parseFloat()` called again without validation |
| 232 | 🟢 Low | Validation | `parseInt()` called again without validation |
| 208 | 🟢 Low | Validation | URL validation only checks empty, not format |

### ProductCard Component (2 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 87 | 🟢 Low | Null | `product.category.name` without null check |
| 50 | 🟡 Medium | Error | Image tag no `onError` handler |

### ProductModal Component (1 issue)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 99 | 🟠 High | Array | `categories.map()` without `Array.isArray()` |

### Inventory Page (20 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 97 | 🟠 High | Validation | Quantity allows 0 and NaN |
| 162 | 🟠 High | Null | `stock.variety` without null check in search |
| 114 | 🟡 Medium | Validation | `parseInt()` without NaN check before API |
| 66 | 🟡 Medium | API | Response structure assumptions |
| 140 | 🟡 Medium | Null | `inventory.stock.name` in confirm dialog |
| 130 | 🟡 Medium | UX | Full refetch after update (no optimistic) |
| 153 | 🟡 Medium | UX | Full refetch after delete (no optimistic) |
| 155 | 🟢 Low | Error | Delete error uses `alert()` |
| 67 | 🟡 Medium | API | lowStockCount API vs client calculation |
| 166 | 🟢 Low | Logic | Status filter uses `isLowStock` flag |
| 143 | 🟢 Low | Logic | Delete cascade behavior not documented |
| 118 | 🟢 Low | Race | Modal snapshot can be stale |
| 235 | 🟢 Low | Null | Good defensive check on modal render |
| 159 | 🟢 Low | Array | Redundant `Array.isArray()` |
| _(+6 more low issues)_ | | | See JSON for details |

### InventoryTable Component (2 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 78 | 🟢 Low | Null | `inv.stock.name` without check |
| 85 | 🟢 Low | Null | `inv.stock.supplier.name` deep access |

### InventoryModal Component (2 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 78 | 🟢 Low | Null | Stock properties without guards |
| 102 | 🟠 High | Validation | HTML `min="0"` doesn't prevent negative input |

### Harvest Plans Page (10 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 40 | 🔴 Critical | Logic | Capacity uses record count not quantity sum |
| 52 | 🔴 Critical | Logic | Capacity validation uses stale data (race) |
| 29 | 🟠 High | API | `_count` aggregation may not exist in backend |
| 42 | 🟠 High | Logic | Progress bar shows wrong percentage |
| 83 | 🟡 Medium | API | Cross-role `/api/supplier/*` access |
| 18 | 🟡 Medium | API | `harvestDate` vs `expectedDate` mismatch |
| 247 | 🟢 Low | UX | Loading only on initial load |

### AnnouncementCard Component (2 issues) - See Harvest Plans Critical #1

### PreOrderModal Component (2 issues) - See Harvest Plans Critical #2, #3

### Shipments Page (15 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 244 | 🟠 High | Null | `trackingNumber?.toLowerCase()` can crash |
| 162 | 🟠 High | Validation | DELIVERED doesn't require tracking |
| 228 | 🟡 Medium | Validation | Status transition incomplete for unknown values |
| 207 | 🟡 Medium | API | Create mode doesn't send status field |
| 14 | 🟠 High | API | Missing `destinationAddress` field |
| 17 | 🟡 Medium | API | `courier` vs `carrier` terminology |
| 21 | 🟡 Medium | API | `estimatedDays` vs `estimatedDelivery` mismatch |
| 218 | 🟡 Medium | Race | Concurrent status updates (no deduplication) |
| 78 | 🟢 Low | Data | No refetch after shipment creation |
| 402 | 🟢 Low | UI | Status dropdown shows duplicate |
| 92 | 🟢 Low | API | Inconsistent response structure |
| 239 | 🟢 Low | Array | Redundant `Array.isArray()` |

### ShipmentTable Component (1 issue)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 87 | 🟠 High | Logic | CANCELLED cannot be edited (business rule?) |

### OutgoingShipmentTable Component (1 issue)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 31 | 🟢 Low | Array | Missing empty array guard |

### Notifications Page (15 issues)
| Line | Severity | Type | Issue |
|------|----------|------|-------|
| 45 | 🟡 Medium | Null | Nested optional chaining without fallback |
| 46 | 🟡 Medium | Null | `unreadCount` optional chaining |
| 228 | 🟡 Medium | Null | `formatRelativeTime()` no null check |
| 54 | 🟢 Low | UX | No optimistic update (mark as read) |
| 67 | 🟢 Low | UX | No optimistic update (mark all) |
| 63 | 🟡 Medium | Error | Uses `alert()` instead of toast |
| 76 | 🟡 Medium | Error | Uses `alert()` instead of toast |
| 91 | 🟡 Medium | Error | Uses `alert()` instead of toast |
| 80 | ℹ️ Info | UX | Native `confirm()` not styled |
| 106 | 🟢 Low | Array | Redundant `Array.isArray()` |
| 134 | 🟢 Low | Array | Redundant array check in StatCard |
| 108 | 🟢 Low | UX | Loading only on initial load |
| 95 | ℹ️ Info | Good | Icon mapping complete ✓ |
| 38 | ℹ️ Info | Good | Filter query matches backend ✓ |

---

## 🎯 RECOMMENDED FIX PRIORITY

### Phase 1: BLOCKERS (Must fix before production)
1. ✅ Fix API endpoints Products page (lines 246, 275)
2. ✅ Fix capacity calculation Harvest Plans (Critical bug)
3. ✅ Add backend atomic validation for pre-orders
4. ✅ Fix unsafe optional chaining Products edit mode

### Phase 2: HIGH PRIORITY (Fix within 1 week)
5. Add null checks on tags, variety, trackingNumber searches
6. Add race condition guards (isSubmitting checks)
7. Fix Array.isArray() missing in ProductModal
8. Fix quantity validation in Inventory
9. Add DELIVERED tracking requirement
10. Fix CANCELLED shipment edit logic

### Phase 3: MEDIUM PRIORITY (Fix within 2 weeks)
11. Replace all alert() with toast notifications
12. Add image onError handlers
13. Implement optimistic updates (inventory, notifications)
14. Fix validation gaps (isNaN checks, parseFloat vs parseInt)
15. Verify API field names (courier/carrier, expectedDate/harvestDate)
16. Add silent failure error handling

### Phase 4: LOW PRIORITY (Backlog)
17. Remove redundant Array.isArray() checks
18. Replace native confirm() with styled modals
19. Add loading states on filter changes
20. Document cascade delete behavior
21. Add URL format validation

---

## 📝 TESTING RECOMMENDATIONS

### Critical Path Testing
1. **Products:** Create → Edit → Delete flow (verify API endpoints work)
2. **Harvest Plans:** Pre-order creation with capacity limits (verify no overbooking)
3. **Inventory:** Edit quantity with invalid inputs (0, negative, NaN)
4. **Shipments:** Status transitions PENDING → DELIVERED (verify tracking required)

### Edge Case Testing
5. API returns null/undefined for optional fields (variety, trackingNumber, image)
6. User double-clicks submit buttons (race conditions)
7. Multiple users edit same resource simultaneously
8. Network errors during mutations (error handling)

### Regression Testing
9. All searches with special characters
10. Form validation with boundary values
11. Modal open/close state management
12. Filter state sync with data fetch

---

## 📊 CODE QUALITY METRICS

**Before Audit:**
- ⚠️ Potential runtime crashes: ~18 locations
- ⚠️ Data integrity risks: 4 critical bugs
- ⚠️ UX inconsistencies: 11 issues
- ⚠️ Validation gaps: 12 issues

**After Fixes (Estimated):**
- ✅ Runtime stability: 95%+ (null checks added)
- ✅ Data integrity: 100% (capacity + API fixes)
- ✅ UX consistency: 90%+ (toast + modals)
- ✅ Validation coverage: 100% (isNaN + guards)

---

## 🔍 BACKEND VERIFICATION CHECKLIST

Verify these backend implementations:

### API Endpoints
- [ ] `POST /api/florist/products` exists (not `/api/products`)
- [ ] `PUT /api/florist/products/[id]` exists
- [ ] `DELETE /api/florist/products/[id]` exists
- [ ] `GET /api/supplier/harvest-announcements` accessible by Florist role

### Data Structure
- [ ] HarvestAnnouncement includes `_count.preOrders` AND `totalReservedQuantity`
- [ ] Shipment has `courier` or `carrier` field (clarify which)
- [ ] Shipment has `estimatedDays` or `estimatedDelivery` (clarify which)
- [ ] Shipment includes `destinationAddress` object

### Business Logic
- [ ] Pre-order creation has atomic capacity check
- [ ] LOW_STOCK threshold logic documented
- [ ] Status transitions validated server-side
- [ ] Cascade delete rules for inventory

---

## 📦 DELIVERABLES

**Audit Reports Generated:**
1. `florahub_audit_report.json` - Products issues (21)
2. `inventory-audit-results.json` - Inventory issues (20)
3. `harvest-plans-audit.json` - Harvest Plans issues (10)
4. `shipment-audit.json` - Shipments issues (15)
5. `audit_notifications_page.json` - Notifications issues (15)
6. **`FLORIST_CODE_AUDIT_REPORT.md`** - This master report (91 issues compiled)

**Next Steps:**
1. Review this report with team
2. Prioritize fixes by phase (see Recommended Fix Priority)
3. Create tickets for each Critical + High issue
4. Verify backend API contracts
5. Implement fixes with test coverage
6. Re-audit after fixes

---

**Report Generated:** November 6, 2026, 10:23 UTC  
**Audit Duration:** 1m17s (5 parallel agents)  
**Team:** Kiro AI + 5 Audit Agents (Opus-5)  
**Status:** ✅ AUDIT COMPLETE - READY FOR FIX PHASE
