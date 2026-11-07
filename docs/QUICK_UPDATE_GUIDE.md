# 🎨 FloraHub Design System v2.0 - Quick Implementation Guide

**Last Update:** 2026-11-03 16:13 WIB  
**Status:** Ready for Manual Updates

---

## ✅ COMPLETED

1. ✅ **Color System** (`app/globals.css`) — FundedNext-inspired emerald theme
2. ✅ **Navbar** (`components/layout/Navbar.tsx`) — Partially updated dengan design baru

---

## 🚀 QUICK UPDATE GUIDE - Copy Paste Patterns

Untuk menyelesaikan implementasi dengan cepat, gunakan **Find & Replace** di VSCode dengan patterns berikut:

### **🔧 Global Search & Replace (VSCode)**

#### **Step 1: Update Card Styles**
```
Find (Regex): bg-white(\s+)border-gray-200
Replace: bg-card$1border-border
```

#### **Step 2: Update Button Primary**
```
Find (Regex): bg-emerald-600(\s+)([^\s]*\s+)*hover:bg-emerald-700
Replace: btn-primary
```

#### **Step 3: Update Text Colors**
```
Find: text-gray-900
Replace: text-foreground

Find: text-gray-600
Replace: text-muted-foreground

Find: text-gray-500
Replace: text-muted-foreground

Find: text-emerald-600
Replace: text-primary

Find: text-emerald-700
Replace: text-primary
```

#### **Step 4: Update Borders**
```
Find: border-gray-200
Replace: border-border

Find: border-gray-300
Replace: border-border
```

#### **Step 5: Update Backgrounds**
```
Find: bg-gray-50
Replace: bg-surface-container-low

Find: bg-gray-100
Replace: bg-surface-container

Find: bg-gray-200
Replace: bg-surface-container-high
```

#### **Step 6: Update Rounded Corners**
```
Find (in large cards): rounded-lg
Replace: rounded-xl

Find (in buttons): rounded-full
Replace: rounded-xl
```

---

## 📝 MANUAL UPDATES NEEDED (Priority Components)

### **1. Product Cards** - `components/customer/ProductCard.tsx`

Cari dan ganti:
```tsx
// Old card wrapper:
<div className="group relative overflow-hidden rounded-lg border bg-white shadow-sm">

// New card wrapper:
<div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:bg-surface-container-low">

// Old button:
<button className="... bg-emerald-600 hover:bg-emerald-700">

// New button:
<button className="btn-primary">
```

---

### **2. Homepage** - `app/page.tsx`

Update container dan spacing:
```tsx
// Old container:
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

// New container:
<div className="container-custom">

// Old section spacing:
<section className="py-12">

// New section spacing:
<section className="section-spacing">
```

---

### **3. Cart Page** - `app/(customer)/cart/page.tsx`

Update summary card:
```tsx
// Old:
<div className="rounded-lg border bg-white p-6">

// New:
<div className="rounded-xl border border-border bg-surface-container p-6 shadow-sm">

// Button:
<button className="btn-primary w-full">
```

---

### **4. Checkout Page** - `app/(customer)/checkout/page.tsx`

Update address cards:
```tsx
// Old:
<div className="cursor-pointer rounded-lg border-2 p-4 transition hover:border-emerald-600">

// New:
<div className="cursor-pointer rounded-xl border-2 border-border p-4 transition-all hover:border-primary hover:shadow-sm">
```

---

### **5. Login/Register Pages**

Update form container:
```tsx
// Old:
<div className="rounded-lg border bg-white p-8 shadow">

// New:
<div className="rounded-2xl border border-border bg-card p-8 shadow-lg">

// Input:
<input className="input-field" />

// Button:
<button className="btn-primary">
```

---

## ⚡ FASTEST METHOD - VSCode Batch Replace

1. **Open VSCode**
2. Press `Ctrl+Shift+H` (Find & Replace in Files)
3. Enable **Regex mode** (icon `.*`)
4. Copy-paste patterns di atas satu per satu
5. Click **Replace All** untuk setiap pattern
6. Test di browser: `npm run dev`

**Estimated time:** 15-20 menit untuk semua replacements!

---

## 🎯 TEST CHECKLIST

After updates, test these pages:
- [ ] Homepage - Hero section & product grid
- [ ] Product Detail - Card layout & buttons
- [ ] Cart - Summary card & checkout button
- [ ] Checkout - Address cards & payment form
- [ ] Order History - Order cards & badges
- [ ] Order Detail - Invoice layout
- [ ] Tracking - Timeline (already good)
- [ ] Login/Register - Form styles

---

## 🔄 ROLLBACK INSTRUCTIONS

Jika ada masalah, rollback dengan:
```bash
# Restore backup CSS
cp app/globals.css.backup app/globals.css

# Revert all changes
git checkout .
```

---

## 📊 CURRENT STATUS

**Completion:** ~20%
- ✅ Phase 1: Design tokens (100%)
- ⏳ Phase 2: Components (20%)

**Remaining work:** Manual find-replace (15-20 min) + testing (10 min)

**Total remaining time:** ~30 minutes

---

## 💡 RECOMMENDATION

**Quick Win Strategy:**
1. Lakukan global find-replace sekarang (15 min)
2. Test di browser
3. Fix edge cases yang ketemu
4. Commit semua changes
5. Done! 🎉

Atau kamu mau saya lanjutkan patch komponen satu-per-satu? (akan butuh 2+ jam lagi)

**Pilihan kamu?** 🚀
