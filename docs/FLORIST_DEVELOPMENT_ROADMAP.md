# 🌸 FLORIST Role - Development Roadmap

**Generated:** 2026-11-06  
**Project:** FloraHub  
**Focus:** Melanjutkan dan melengkapi Florist features

---

## 📊 CURRENT STATUS FLORIST

### ✅ **SUDAH ADA (3 pages + layout)**

| File | Status | Lines | Completeness |
|------|--------|-------|--------------|
| `app/florist/layout.tsx` | ✅ Complete | 206 | 100% - Auth guard + sidebar navigation |
| `app/florist/dashboard/page.tsx` | ✅ Complete | 354 | 100% - Stats + recent orders |
| `app/florist/orders/page.tsx` | ✅ Complete | 302 | 100% - List orders + modal detail |
| `app/florist/products/page.tsx` | ⚠️ **STUB** | 17 | 5% - Empty div only! |

### ❌ **MISSING (7 pages)**

| Priority | Page | Requirement | Status |
|----------|------|-------------|--------|
| **HIGH** | `inventory/page.tsx` | KF-17: Kelola Stok Bunga Satuan | ❌ Missing |
| **HIGH** | `preorders/page.tsx` | KF-16: Buat Pre-Order | ❌ Missing |
| **HIGH** | `harvest-plans/page.tsx` | KF-15: Lihat Rencana Panen | ❌ Missing |
| **HIGH** | `products/page.tsx` | KF-18: Kelola Produk | ⚠️ **MUST REPLACE** |
| MEDIUM | `shipments/page.tsx` | KF-20: Update Status Pengiriman | ❌ Missing |
| MEDIUM | `shipments/[id]/page.tsx` | KF-20: Detail Shipment | ❌ Missing |
| LOW | `notifications/page.tsx` | KF-21: Notifikasi Stok Rendah | ❌ Missing |

---

## 🎯 KEBUTUHAN FUNGSIONAL FLORIST (dari Proposal)

### **KF-15: Lihat Rencana Panen Supplier** ⭐ PRIORITY 1
**Use Case:** UC-21 (Tabel 3.3 No. 21)  
**Deskripsi:** Melihat informasi estimasi jadwal panen bunga dari Supplier sebagai acuan perencanaan Pre-Order

**Backend API:** ✅ Sudah ada
- `GET /api/supplier/harvest-announcements` - List semua rencana panen

**Frontend Requirements:**
- [ ] Page: `/app/florist/harvest-plans/page.tsx`
- [ ] Features:
  - Browse daftar rencana panen dari semua supplier
  - Filter: by flower type, by supplier, by date range
  - Search: nama bunga
  - Display: jenis bunga, varietas, estimasi qty, harga per unit, tanggal panen, supplier name, lokasi
  - Action button: "Buat Pre-Order" → redirect ke create pre-order dengan data prefilled
  - Badge: "Upcoming" (belum panen), "Ready" (sudah waktunya), "Expired" (sudah lewat)
- [ ] Components:
  - Card grid layout (desktop) atau list (mobile)
  - Filter sidebar/drawer
  - Date picker untuk filter range
  - Empty state jika tidak ada rencana panen

**Design Inspiration:** Product catalog, tapi khusus untuk wholesale (grosir)

**Estimasi:** 4-5 jam

---

### **KF-16: Buat Pre-Order ke Supplier** ⭐ PRIORITY 1
**Use Case:** UC-20 (Tabel 3.3 No. 20)  
**Deskripsi:** Mengajukan kebutuhan bunga kepada Supplier melalui sistem

**Backend API:** ✅ Sudah ada
- `GET /api/florist/preorders` - List pre-orders florist
- `POST /api/florist/preorders` - Create new pre-order

**Frontend Requirements:**
- [ ] Page: `/app/florist/preorders/page.tsx`
- [ ] Tabs/Sections:
  - **Tab 1: Buat Pre-Order Baru**
    - Form: Select harvest announcement (dropdown/autocomplete)
    - Input: Quantity (number, dengan validation max sesuai estimatedQuantity)
    - Display: Preview total price
    - Input: Notes (optional textarea)
    - Button: Submit Pre-Order
  - **Tab 2: Daftar Pre-Order Saya**
    - Table: orderNumber, announcement (flower name), quantity, totalPrice, status, createdAt
    - Filter: by status (PENDING/CONFIRMED/CANCELLED)
    - Badge status: Pending (yellow), Confirmed (green), Cancelled (red)
    - Action: View detail, Cancel (jika masih PENDING)
- [ ] Modal/Drawer: Pre-Order Detail
  - Info: Supplier name, flower details, quantity, price
  - Timeline: created → pending → confirmed/cancelled
  - Notes dari florist dan supplier (jika ada)

**Business Logic Validation:**
- Cek announcement masih aktif (isActive = true)
- Cek tanggal panen belum lewat
- Cek quantity tidak melebihi estimatedQuantity - totalOrdered
- Prevent double pre-order untuk announcement yang sama

**Estimasi:** 5-6 jam

---

### **KF-17: Kelola Stok Bunga Satuan** ⭐ PRIORITY 1
**Use Case:** UC-22 (Tabel 3.3 No. 22)  
**Deskripsi:** Menambah, mengubah, dan menghapus data stok bunga satuan yang dimiliki Florist

**Backend API:** ✅ Sudah ada
- `GET /api/florist/inventory` - List inventory
- `POST /api/florist/inventory` - Add inventory (dari supplier stock)
- `PUT /api/florist/inventory/[id]` - Update inventory
- `DELETE /api/florist/inventory/[id]` - Delete inventory

**Frontend Requirements:**
- [ ] Page: `/app/florist/inventory/page.tsx`
- [ ] Layout: Table dengan action buttons
- [ ] Columns:
  - Nama Bunga (dari Stock.name)
  - Varietas
  - Quantity (dengan badge LOW jika <= minThreshold)
  - Unit (tangkai/ikat/pot)
  - Min Threshold (batas minimum notifikasi)
  - Max Capacity (optional)
  - Lokasi penyimpanan (optional)
  - Last Restock Date
  - Actions (Edit, Delete)
- [ ] Features:
  - **Add Inventory Button** → Modal/Drawer:
    - Select Stock dari Supplier (autocomplete search)
    - Input Quantity to add
    - Set Min Threshold
    - Set Max Capacity (optional)
    - Set Lokasi (optional)
  - **Edit Button** → Modal dengan form edit
  - **Delete Button** → Confirmation dialog
  - **Search/Filter**: by flower name, by low stock
  - **Badge/Alert**: Red badge untuk stok yang <= minThreshold
- [ ] Integrations:
  - Link ke `/florist/products` untuk lihat produk yang pakai inventory ini (via ProductComponent)
  - Link ke "Beli Stok" → redirect ke supplier stocks atau preorders

**Key Point:** Ini inventory **retail** (bunga satuan untuk dijual ke customer), beda dengan supplier stocks (grosir)

**Estimasi:** 5-6 jam

---

### **KF-18: Kelola Produk** ⭐ PRIORITY 1 (REPLACE STUB!)
**Use Case:** UC-23 (Tabel 3.3 No. 23)  
**Deskripsi:** Menambah, mengubah, dan menghapus produk yang dijual pada platform

**Backend API:** ✅ Sudah ada
- `GET /api/florist/products` - List florist's products
- `POST /api/products` (with FLORIST auth) - Create product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `GET /api/florist/products/[productId]/components` - Get product BOM (Bill of Materials)
- `POST /api/florist/products/[productId]/components` - Add component

**Frontend Requirements:**
- [ ] Page: `/app/florist/products/page.tsx` (**REPLACE current stub!**)
- [ ] Layout: Card grid (desktop) atau list (mobile)
- [ ] Display per product:
  - Image (thumbnail)
  - Name
  - Category
  - Price (formatted Rp)
  - Stock available
  - Status badge (Active/Inactive)
  - Featured badge (if isFeatured)
  - Actions: Edit, Delete, View Components
- [ ] Features:
  - **Add Product Button** → Modal/Form:
    - Upload image (atau input URL)
    - Input: Name, Slug (auto-generate from name)
    - Textarea: Description
    - Select: Category (from FlowerCategory)
    - Input: Price (number, min 0)
    - Input: Stock (number, min 0)
    - Input: Weight (gram, for shipping calculation)
    - Tags: Multi-select or chips input
    - Toggle: isActive, isFeatured
  - **Edit Button** → Same form dengan data prefilled
  - **Delete Button** → Confirmation (cek apakah ada order aktif)
  - **View Components Button** → Modal/Page untuk manage product BOM:
    - List components: Inventory item + quantity used
    - Add component: Select inventory + input quantity
    - Remove component button
    - Purpose: Track bahan baku untuk setiap produk (e.g., Buket Mawar butuh 12 tangkai mawar merah)
  - **Search/Filter**: by name, by category, by stock status (in stock/out of stock)
  - **Bulk Actions**: Activate/Deactivate multiple products

**Important:** Ini adalah **produk jadi** yang dijual ke customer (contoh: Buket Mawar Premium, Rangkaian Ulang Tahun), bukan stok bunga mentah.

**Estimasi:** 6-7 jam (karena ada BOM management)

---

### **KF-19: Kelola Pesanan Customer** ✅ SUDAH ADA
**Use Case:** UC-24 (Tabel 3.3 No. 24)  
**Status:** ✅ **COMPLETE** di `/app/florist/orders/page.tsx`

**Current Features:**
- ✅ List orders dengan filter by status
- ✅ Search by order number
- ✅ View order detail (modal)
- ✅ Display items, payment info, shipment info

**Potential Improvements (Optional):**
- [ ] Quick actions: Accept Order, Cancel Order
- [ ] Print Invoice/Packing Slip
- [ ] Bulk status update

---

### **KF-20: Update Status Pengiriman (Real-time Log)** ⭐ PRIORITY 2
**Use Case:** UC-25 (Tabel 3.3 No. 25)  
**Deskripsi:** Memperbarui status pengiriman pesanan Customer secara real-time (berupa log lini masa perjalanan paket)

**Backend API:** ✅ Partial
- `GET /api/florist/shipments` - List shipments
- `PUT /api/florist/shipments/[id]` - Update shipment status
- ⚠️ **MISSING:** ShipmentLog table untuk timeline history

**Frontend Requirements:**
- [ ] Page: `/app/florist/shipments/page.tsx`
- [ ] Layout: Table dengan list orders yang perlu dikirim
- [ ] Columns:
  - Order Number
  - Customer Name
  - Shipment Status
  - Courier + Service
  - Tracking Number
  - Estimated Days
  - Created Date
  - Actions (Update Status, View Timeline)
- [ ] Filters:
  - By status (PENDING/PROCESSING/SHIPPED/DELIVERED)
  - Search by tracking number or order number
- [ ] Action: **Update Status Button** → Modal/Drawer:
  - Select new status (dropdown)
  - Input: Location/notes (e.g., "Paket tiba di hub Jakarta")
  - Button: Save Update
  - **Behavior:** Create ShipmentLog entry dengan timestamp

- [ ] Page: `/app/florist/shipments/[id]/page.tsx` (Detail)
- [ ] Layout: Timeline vertical (stepper)
- [ ] Display:
  - Order info (customer, address, items)
  - Shipment info (courier, tracking number)
  - **Timeline/History** (dari ShipmentLog):
    - Each log entry: timestamp, status, location, notes, updated by
    - Visual: Icon per status (📦 Pending → 🚚 Shipped → ✅ Delivered)
  - Form untuk add new log entry
  - Button: Mark as Delivered

**Database Change Needed:**
```prisma
model ShipmentLog {
  id         String         @id @default(cuid())
  shipmentId String
  status     ShipmentStatus
  location   String?
  notes      String?
  timestamp  DateTime       @default(now())
  createdBy  String?        // userId yang update
  
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  
  @@index([shipmentId])
  @@index([timestamp])
}
```

**Estimasi:** 6-7 jam (termasuk database migration)

---

### **KF-21: Notifikasi Stok Rendah** 🔔 PRIORITY 3
**Use Case:** UC-26 (Tabel 3.3 No. 26)  
**Deskripsi:** Melihat informasi ketika stok mencapai batas minimum

**Backend API:** ✅ Partial
- `GET /api/notifications` - List notifications (all types)
- ⚠️ **UNCLEAR:** Background job untuk auto-create LOW_STOCK_ALERT notification

**Frontend Requirements:**
- [ ] Page: `/app/florist/notifications/page.tsx`
- [ ] Layout: List/Card dengan grouping by date
- [ ] Display per notification:
  - Icon (based on type: 🔔 general, ⚠️ low stock, 📦 order)
  - Title
  - Message
  - Timestamp (relative: "2 jam yang lalu")
  - Badge: Unread/Read
  - Link (jika ada - e.g., link ke inventory item)
- [ ] Features:
  - Filter: All/Unread/Read
  - Filter: By type (LOW_STOCK_ALERT, ORDER_CREATED, PREORDER_CONFIRMED, dll)
  - Mark as Read button (individual)
  - Mark All as Read button
  - Delete notification
- [ ] Navigation Integration:
  - Bell icon di navbar (dari layout.tsx)
  - Badge dengan unread count
  - Dropdown preview (3 recent notifications)

**Backend Enhancement Needed:**
- [ ] Cron job atau background task untuk cek `FloristInventory.quantity <= minThreshold`
- [ ] Auto-create Notification (type: LOW_STOCK_ALERT) saat kondisi terpenuhi

**Estimasi:** 3-4 jam (frontend + backend cron job)

---

## 🗂️ SIDEBAR NAVIGATION (Existing)

Dari `layout.tsx`, navigation sudah didefinisikan:

```typescript
const navigation = [
  { name: "Dashboard", href: "/florist/dashboard", icon: LayoutDashboard }, // ✅
  { name: "Pesanan Masuk", href: "/florist/orders", icon: ShoppingBag },    // ✅
  { name: "Produk Saya", href: "/florist/products", icon: Package },        // ⚠️ STUB!
  { name: "Inventori Bunga", href: "/florist/inventory", icon: Boxes },     // ❌
  { name: "Pre-Order Supplier", href: "/florist/preorders", icon: CalendarClock }, // ❌
];
```

**Tambahan yang Perlu:**
- [ ] "Rencana Panen" atau "Harvest Plans" (link ke harvest-plans)
- [ ] "Pengiriman" atau "Shipments" (link ke shipments)
- [ ] Bell icon untuk Notifications (di navbar, bukan sidebar)

---

## 📋 DEVELOPMENT PRIORITY FLORIST

### **PHASE 1: Core Features (HIGH Priority)** - 20-25 jam

| Order | Task | File | Hours | Reason |
|-------|------|------|-------|--------|
| 1 | **REPLACE Products Stub** | `products/page.tsx` | 6-7h | Currently broken (stub), blocks product management |
| 2 | Kelola Inventory | `inventory/page.tsx` | 5-6h | Core untuk manage stok retail |
| 3 | Lihat Rencana Panen | `harvest-plans/page.tsx` | 4-5h | Prerequisite untuk pre-order |
| 4 | Buat Pre-Order | `preorders/page.tsx` | 5-6h | Unlock pre-order flow |

**Total Phase 1:** ~22 jam (3 hari kerja @ 8h)

---

### **PHASE 2: Logistics & Notifications (MEDIUM Priority)** - 10-11 jam

| Order | Task | File | Hours | Reason |
|-------|------|------|-------|--------|
| 5 | Shipments List | `shipments/page.tsx` | 3h | Track orders to ship |
| 6 | Shipment Detail + Timeline | `shipments/[id]/page.tsx` | 3-4h | Real-time tracking log |
| 7 | Add ShipmentLog table | Database migration | 1h | Enable timeline feature |
| 8 | Notifications Page | `notifications/page.tsx` | 3-4h | Low stock alerts + general notif |

**Total Phase 2:** ~11 jam (1.5 hari kerja)

---

### **PHASE 3: Enhancements (LOW Priority)** - Optional

- [ ] Product image upload (current: URL input only)
- [ ] Bulk product operations (activate/deactivate many)
- [ ] Export inventory report (CSV/PDF)
- [ ] Analytics charts (di dashboard)
- [ ] Email notifications (bukan hanya in-app)

---

## 🔧 TECHNICAL REQUIREMENTS

### **Dependencies (Already Installed)**
- ✅ Next.js 15/16 (App Router)
- ✅ NextAuth v4
- ✅ Prisma ORM
- ✅ shadcn/ui components
- ✅ Tailwind CSS
- ✅ Lucide Icons

### **Components to Reuse (from existing pages)**
- ✅ Layout dengan sidebar (dari `layout.tsx`)
- ✅ Loading states (dari `dashboard/page.tsx`)
- ✅ Error handling patterns (dari `orders/page.tsx`)
- ✅ Modal/Dialog (dari `orders/page.tsx` - order detail modal)
- ✅ Badge components (status badges)
- ✅ Search + Filter UI patterns

### **Components to Build**
- [ ] DataTable reusable component (untuk inventory, preorders, shipments)
- [ ] Form components (add/edit inventory, add/edit product, create preorder)
- [ ] Timeline/Stepper component (untuk shipment log)
- [ ] Notification dropdown (bell icon di navbar)
- [ ] Empty state illustrations

---

## 🎨 DESIGN PATTERNS TO FOLLOW

### **1. Page Structure (from dashboard/orders)**
```tsx
"use client";
import { useState, useEffect } from "react";

export default function FeaturePage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/florist/endpoint");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;

  return (
    <div className="container mx-auto p-6">
      {/* Content */}
    </div>
  );
}
```

### **2. Auth Check (sudah ada di layout.tsx)**
```tsx
// Layout sudah handle auth guard:
useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/auth/login");
  } else if (
    status === "authenticated" &&
    role !== "FLORIST" && role !== "ADMIN"
  ) {
    router.push("/");
  }
}, [status, session]);
```

### **3. API Call Pattern**
```tsx
// GET
const res = await fetch("/api/florist/inventory");
const json = await res.json();

// POST
const res = await fetch("/api/florist/inventory", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ stockId, quantity, minThreshold }),
});

// Error handling
if (!res.ok) {
  throw new Error(json.message || "Something went wrong");
}
```

---

## 📦 DATABASE SCHEMA CHECK

### **Required Tables (Already Exist):**
- ✅ `User` (with role FLORIST)
- ✅ `Stock` (supplier wholesale stocks)
- ✅ `FloristInventory` (retail inventory)
- ✅ `Product` (products sold to customer)
- ✅ `ProductComponent` (BOM - product → inventory mapping)
- ✅ `HarvestAnnouncement` (rencana panen dari supplier)
- ✅ `HarvestPreOrder` (pre-order dari florist)
- ✅ `Order` + `OrderItem` (customer orders)
- ✅ `Shipment` (shipment info)
- ✅ `Notification` (notifikasi system)

### **Table to ADD:**
- ❌ `ShipmentLog` - Timeline history untuk tracking (Phase 2)

---

## 🧪 TESTING CHECKLIST (Post-Development)

### **Manual Testing per Feature:**
- [ ] **Inventory:**
  - Add inventory dari supplier stock
  - Edit quantity + threshold
  - Delete inventory (dengan confirm)
  - Low stock badge muncul jika qty <= threshold
- [ ] **Products:**
  - Create product dengan semua fields
  - Edit product (ubah price, stock, status)
  - Delete product
  - Add/remove components (BOM)
  - View product di customer catalog
- [ ] **Harvest Plans:**
  - Browse rencana panen
  - Filter by date range, flower type
  - Click "Buat Pre-Order" redirect ke form dengan data prefilled
- [ ] **Pre-Orders:**
  - Create pre-order dari harvest announcement
  - Validation: quantity tidak boleh > available
  - View list pre-orders dengan status
  - Cancel pre-order (jika PENDING)
- [ ] **Shipments:**
  - List orders yang perlu dikirim
  - Update status dengan notes
  - View timeline history (setelah add ShipmentLog)
- [ ] **Notifications:**
  - Notifikasi low stock muncul otomatis
  - Mark as read works
  - Bell icon badge count benar

### **Integration Testing:**
- [ ] Flow lengkap: Lihat harvest → Pre-order → Supplier approve → Inventory bertambah → Buat product → Customer order → Ship → Delivered
- [ ] Auth: Hanya FLORIST + ADMIN yang bisa akses /florist/*
- [ ] Data integrity: Delete inventory tidak boleh jika ada product component yang pakai

---

## 🚀 IMMEDIATE NEXT STEPS

### **Step 1: Review & Confirm** (5 menit)
- [ ] Review roadmap ini
- [ ] Confirm priority order (apakah setuju mulai dari Products → Inventory → Harvest → PreOrder?)
- [ ] Pilih approach: Guided (saya bimbing step-by-step) atau Fast (saya code langsung)?

### **Step 2: Setup** (10 menit)
- [ ] Pull latest code dari Git (jika ada)
- [ ] Install dependencies: `npm install`
- [ ] Check database connection: `npx prisma studio` (untuk verify data)
- [ ] Test existing pages: Login sebagai FLORIST, check dashboard + orders works

### **Step 3: Start Development** (mulai!)
**First Task:** Replace Products stub → Full Products Management Page

**Recommended Order:**
1. **Products** (6-7h) - Paling urgent, currently broken
2. **Inventory** (5-6h) - Core feature
3. **Harvest Plans** (4-5h) - Browsing only, simple
4. **Pre-Orders** (5-6h) - Complex form + list

---

## 💬 **PERTANYAAN UNTUK ANDA:**

1. **Approach pilih mana?**
   - A: **Guided** - Saya kasih code lengkap per component → Anda review + tanya → Anda yang ketik
   - B: **Fast** - Saya langsung code semua → Push ke Git → Explain setelah selesai
   - C: **Hybrid** - Saya code structure + logic → Anda styling + polish

2. **Mau mulai dari mana?**
   - Rekomendasi saya: **Products** (karena currently broken stub)
   - Atau: **Inventory** (jika Anda mau flow yang lebih logic)

3. **Target selesai kapan?**
   - Phase 1 (4 core pages): 3 hari kerja (realistic)
   - Phase 1 + 2 (semua): 5 hari kerja

Jawab 3 pertanyaan ini, lalu kita **MULAI SEKARANG!** 🚀
