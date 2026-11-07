# 🚀 FloraHub Design System v2.0 - Implementation Progress

**Started:** 2026-11-03 16:00 WIB  
**Last Update:** 2026-11-03 16:11 WIB  
**Status:** In Progress (Phase 2)

---

## ✅ COMPLETED PHASES

### **FASE 1: Color System & Design Tokens** ✅ (30 menit)

**File Modified:** `app/globals.css`

**Achievements:**
- ✅ Converted FundedNext design system to OKLCH color space
- ✅ Emerald primary (#10b981) - preserved FloraHub brand
- ✅ Success green secondary (#09e354) - perfect for fresh flowers
- ✅ Premium violet tertiary (#635bff) - sophisticated feel
- ✅ Surface stack with emerald tint containers
- ✅ Light theme (e-commerce standard) + optional dark mode
- ✅ Typography scale (Inter font, heading sizes 48px-96px)
- ✅ Spacing system (60px-80px section gaps)
- ✅ Border radius scale (10px-20px, organic feel)
- ✅ Custom utility classes (btn-primary 56px, card-elevated, input-field)
- ✅ Container max-width: 1440px

**Backup Created:** `app/globals.css.backup`

---

## 🔨 IN PROGRESS

### **FASE 2: Component Updates** ⏳

**Currently Updating:**
1. ⏳ Navbar (components/layout/Navbar.tsx) - Partial updates applied
2. ⏸️ Homepage Hero
3. ⏸️ Product Cards
4. ⏸️ Buttons & Forms
5. ⏸️ Tracking Page Polish

---

## 📋 NEXT STEPS - QUICK IMPLEMENTATION GUIDE

Untuk menyelesaikan implementasi dengan cepat, berikut komponen-komponen yang **HARUS** diupdate dengan design system baru:

### **Priority 1: Global Components** 🔴

#### 1. **Navbar** - `components/layout/Navbar.tsx`
**Status:** Partially updated (header + logo done)

**Remaining Updates Needed:**
```tsx
// Navigation Links - Update classes:
<nav className="hidden md:flex items-center gap-8 text-base font-medium">
  <Link className="text-muted-foreground transition-colors hover:text-primary">

// Cart Button - Update to:
<Link className="relative flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-surface-container hover:text-primary">

// Cart Badge - Update to:
<span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-sm">

// Profile Button - Update to:
<button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-surface-container-low hover:shadow">

// Dropdown Menu - Update to:
<div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">

// Login Button - Update to:
<Link href="/auth/login" className="btn-primary h-11 rounded-xl px-6 text-sm">
```

---

#### 2. **Product Cards** - `components/customer/ProductCard.tsx`

**Update Needed:**
```tsx
// Card Container
<div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:bg-surface-container-low">

// Image Container
<div className="aspect-square overflow-hidden rounded-t-xl bg-surface-container">

// Badge
<span className="absolute top-3 right-3 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary-container-foreground shadow-sm">

// Product Name
<h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">

// Price
<p className="text-xl font-bold text-primary">

// Add to Cart Button
<button className="btn-primary w-full h-12 rounded-xl">
```

---

#### 3. **Homepage** - `app/page.tsx`

**Update Needed:**
```tsx
// Hero Section
<section className="section-spacing bg-gradient-to-br from-surface via-surface-container-low to-primary/5">
  <div className="container-custom">
    <h1 className="text-5xl font-bold tracking-tight text-foreground lg:text-6xl">
      {/* Hero title */}
    </h1>
    <p className="text-lg text-muted-foreground">
      {/* Hero description */}
    </p>
    <Link href="/products" className="btn-primary">
      Jelajahi Katalog
    </Link>
  </div>
</section>

// Product Grid
<section className="section-spacing">
  <div className="container-custom">
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

---

#### 4. **Forms & Inputs** - All form components

**Global Pattern:**
```tsx
// Input Fields
<input className="input-field" />

// Primary Buttons
<button className="btn-primary">Submit</button>

// Secondary Buttons
<button className="btn-secondary">Cancel</button>

// Error Messages
<p className="text-sm text-error font-medium">Error message</p>

// Success Messages
<p className="text-sm text-success font-semibold">Success message</p>
```

---

### **Priority 2: Customer Pages** 🟡

#### 5. **Cart Page** - `app/(customer)/cart/page.tsx`
- Update card styles: `rounded-xl border border-border bg-card shadow-sm`
- Update buttons: Use `btn-primary` class
- Update summary card: `rounded-xl bg-surface-container p-6`

#### 6. **Checkout Page** - `app/(customer)/checkout/page.tsx`
- Update address cards: `rounded-xl border-2 border-border hover:border-primary`
- Update payment summary: `rounded-xl bg-surface-container-high p-6`
- Update CTA: `btn-primary text-lg h-14`

#### 7. **Order History** - `app/(customer)/orders/page.tsx`
- Update order cards: `rounded-xl border border-border bg-card`
- Update status badges: Use utility class `.badge`
- Update pagination: `rounded-lg border border-border`

#### 8. **Order Detail** - `app/(customer)/orders/[id]/page.tsx`
- Update invoice card: `rounded-xl shadow-md`
- Update status header: `bg-gradient-to-r from-primary/10 to-secondary/10`

#### 9. **Tracking Page** - `app/(customer)/orders/[id]/tracking/page.tsx`
**Status:** Already updated in previous session ✅
- Already using modern design
- May need minor color token updates

---

### **Priority 3: Auth Pages** 🟢

#### 10. **Login/Register** - `app/auth/login/page.tsx`, `app/auth/register/page.tsx`
- Update form container: `rounded-2xl border border-border bg-card shadow-lg p-8`
- Update inputs: Use `input-field` class
- Update buttons: Use `btn-primary` class
- Update links: `text-primary hover:underline`

---

## 🎨 QUICK REFERENCE - CLASS MAPPINGS

### **Old → New Class Migrations:**

| Component | Old Class | New Class |
|-----------|-----------|-----------|
| **Card** | `bg-white border-gray-200` | `bg-card border-border` |
| **Button Primary** | `bg-emerald-600 hover:bg-emerald-700` | `btn-primary` |
| **Button Secondary** | `bg-gray-100 hover:bg-gray-200` | `btn-secondary` |
| **Input** | `bg-gray-50 border-gray-300` | `input-field` |
| **Text Heading** | `text-gray-900` | `text-foreground` |
| **Text Body** | `text-gray-600` | `text-muted-foreground` |
| **Border** | `border-gray-200` | `border-border` |
| **Container** | `max-w-7xl mx-auto px-4` | `container-custom` |
| **Section** | `py-12` | `section-spacing` |
| **Badge** | `bg-green-100 text-green-800` | `badge` |
| **Rounded** | `rounded-lg` (8px) | `rounded-xl` (20px) |

---

## 🛠️ AUTOMATED UPDATE SCRIPT

Untuk mempercepat proses, gunakan find-replace di VSCode:

### **Search & Replace Patterns:**

1. **Card Backgrounds:**
   - Find: `bg-white\s+border-gray-200`
   - Replace: `bg-card border-border`

2. **Primary Buttons:**
   - Find: `bg-emerald-600.*?hover:bg-emerald-700`
   - Replace: `btn-primary`

3. **Text Colors:**
   - Find: `text-gray-900`
   - Replace: `text-foreground`
   
   - Find: `text-gray-600`
   - Replace: `text-muted-foreground`

4. **Borders:**
   - Find: `border-gray-200`
   - Replace: `border-border`
   
   - Find: `border-gray-300`
   - Replace: `border-border`

5. **Rounded Corners:**
   - Find: `rounded-lg`
   - Replace: `rounded-xl` (for large cards)
   
   - Find: `rounded-md`
   - Replace: `rounded-lg` (for small elements)

---

## ⚡ FASTEST PATH TO COMPLETION

### **Option A: Manual Component-by-Component** (2-3 hours)
- Update setiap komponen satu per satu dengan patch
- Thorough tapi lambat

### **Option B: Global Find & Replace** (30-45 minutes) ⚡ **RECOMMENDED**
1. Buka VSCode
2. Global search & replace dengan patterns di atas
3. Test di browser
4. Fix edge cases manually

### **Option C: AI Batch Processing** (1 hour)
- Saya generate file updates untuk top 10 komponen priority
- Kamu copy-paste sekaligus
- Test & commit

---

## 📊 ESTIMATED COMPLETION TIME

| Task | Time | Status |
|------|------|--------|
| Phase 1: Design tokens | 30 min | ✅ Done |
| Phase 2: Navbar | 15 min | ⏳ 50% |
| Phase 2: Product Cards | 20 min | ⏸️ Pending |
| Phase 2: Homepage | 30 min | ⏸️ Pending |
| Phase 2: Forms & Auth | 25 min | ⏸️ Pending |
| Phase 2: Cart & Checkout | 30 min | ⏸️ Pending |
| Phase 2: Orders & Tracking | 20 min | ⏸️ Pending |
| Testing & Fixes | 20 min | ⏸️ Pending |
| **TOTAL** | **~3 hours** | **17% Complete** |

---

## 🎯 RECOMMENDATION

**Current time:** 16:11 WIB

**Option 1:** Continue automated updates (finish ~19:00 WIB)  
**Option 2:** Stop now, commit Phase 1, continue tomorrow  
**Option 3:** I provide complete updated files for top 5 components, you copy-paste (finish ~17:30 WIB)

**Pilih mana yang kamu mau?** 🚀
