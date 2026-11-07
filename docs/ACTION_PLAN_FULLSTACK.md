# 🎯 FloraHub - Fullstack Development Action Plan

**Generated:** 2026-11-06  
**Project:** C:/Users/khusu/Desktop/coding/florahub  
**Goal:** Membuat project konsisten dengan Proposal PDF → ERD → Backend + Frontend

---

## 📊 EXECUTIVE SUMMARY

### Current State
- **Backend**: 79% complete (22/28 requirements have APIs)
- **Frontend**: 39% complete (13/33 required pages)
- **Overall**: 59% complete

### Critical Findings
1. ✅ **Midtrans Sandbox** - SUDAH SESUAI proposal (bukan contradiction!)
2. ✅ **Pre-Order flow backend** - Sudah complete dengan validasi bisnis
3. ❌ **Lupa Password (KF-03)** - 100% MISSING untuk semua 4 roles
4. ❌ **Admin UI** - 0% (backend ada, frontend tidak ada)
5. ❌ **Supplier UI** - 0% (backend ada, frontend tidak ada)
6. ⚠️ **Florist UI** - 30% (hanya dashboard + orders, sisanya missing)
7. ✅ **Customer UI** - 100% complete

---

## 🎯 DEVELOPMENT PRIORITY MATRIX

### 🔴 **PRIORITY 1: CRITICAL (Must Have untuk Sidang)**

#### 1.1 Password Recovery (KF-03) - **Estimasi: 12 jam**
**Status:** 0% - Completely missing  
**Impact:** Affects ALL 4 roles (UC-02, UC-12, UC-19, UC-29)

**Deliverables:**
- [ ] Database schema: `PasswordResetToken` model
- [ ] Backend API: 
  - `/api/auth/forgot-password` (POST - send email)
  - `/api/auth/reset-password` (POST - update password)
- [ ] Frontend pages:
  - `/app/auth/forgot-password/page.tsx`
  - `/app/auth/reset-password/page.tsx`
  - Add "Lupa Password?" link to login page
- [ ] Email infrastructure: Setup Resend/Nodemailer
- [ ] Security: Token hashing, rate limiting, 1-hour expiry

**Implementation Order:**
1. Prisma schema (30 min)
2. Email service setup (1 jam)
3. Backend APIs (2 jam)
4. Frontend pages (3 jam)
5. Testing (2 jam)

---

#### 1.2 Admin Panel UI - **Estimasi: 24 jam**
**Status:** 0/7 pages - Backend ready, no frontend  
**Impact:** 7 requirements (KF-04 to KF-10)

**Required Pages:**

**Dashboard (KF-10)** - 4 jam
- [ ] `/app/admin/dashboard/page.tsx`
- Components: Stats cards, charts (user count, orders, revenue, pre-orders)

**User Management (KF-04)** - 5 jam
- [ ] `/app/admin/users/page.tsx` - List + search + filter
- [ ] `/app/admin/users/[id]/page.tsx` - Detail + edit
- [ ] Modal/form untuk create/edit user

**RBAC Management (KF-05)** - 3 jam
- [ ] `/app/admin/roles/page.tsx`
- [ ] Assign role to user (dropdown di user edit page)

**Flower Categories (KF-06)** - 3 jam
- [ ] `/app/admin/categories/page.tsx`
- [ ] CRUD operations (modal/drawer)

**Orders Monitoring (KF-07, KF-08)** - 5 jam
- [ ] `/app/admin/orders/page.tsx`
- [ ] Filter by status, payment status
- [ ] View order details + payment info

**Shipments Monitoring (KF-09)** - 3 jam
- [ ] `/app/admin/shipments/page.tsx`
- [ ] Filter by status, search by tracking number

**Layout** - 1 jam
- [ ] `/app/admin/layout.tsx` - Auth guard + sidebar navigation

---

#### 1.3 Supplier Panel UI - **Estimasi: 20 jam**
**Status:** 0/5 pages - Directories exist (empty), backend ready  
**Impact:** 4 requirements (KF-11 to KF-14)

**Dashboard (Supplier)** - 4 jam
- [ ] `/app/(supplier)/dashboard/page.tsx`
- Stats: Revenue, sales, low stock alerts, pending pre-orders

**Wholesale Stock Management (KF-11)** - 5 jam
- [ ] `/app/(supplier)/stocks/page.tsx`
- CRUD operations, search, filter by availability

**Harvest Plans (KF-12)** - 5 jam
- [ ] `/app/(supplier)/harvest-plans/page.tsx`
- Create announcement (jenis bunga, tanggal estimasi, qty)
- Edit/delete existing plans

**Pre-order Management (KF-13)** - 5 jam
- [ ] `/app/(supplier)/preorders/page.tsx`
- List pre-orders from florists
- Approve/Reject actions
- View florist details

**Notifications (KF-14)** - 1 jam
- [ ] `/app/(supplier)/notifications/page.tsx`
- Show low stock alerts (reuse Notification API)

---

#### 1.4 Florist Missing Pages - **Estimasi: 22 jam**
**Status:** 3/10 pages - Core features missing  
**Impact:** 7 requirements (KF-15 to KF-17, KF-20, KF-21)

**Harvest Plans View (KF-15)** - 4 jam
- [ ] `/app/florist/harvest-plans/page.tsx`
- Browse supplier announcements
- Filter by flower type, date

**Pre-order Creation (KF-16)** - 5 jam
- [ ] `/app/florist/preorders/page.tsx`
- List existing pre-orders (status, history)
- [ ] `/app/florist/preorders/create/page.tsx`
- Form: select harvest announcement, input quantity

**Inventory Management (KF-17)** - 5 jam
- [ ] `/app/florist/inventory/page.tsx`
- CRUD retail stock (bunga satuan)
- Link to wholesale purchase

**Products Management (KF-18)** - 4 jam
- [ ] **REPLACE** `/app/florist/products/page.tsx` (current is stub!)
- CRUD products sold to customers
- Link products to inventory (BOM)

**Shipment Updates (KF-20)** - 3 jam
- [ ] `/app/florist/shipments/page.tsx`
- List customer orders to ship
- [ ] `/app/florist/shipments/[id]/page.tsx`
- Update status with timeline log (need ShipmentLog table!)

**Notifications (KF-21)** - 1 jam
- [ ] `/app/florist/notifications/page.tsx`
- Low stock alerts

---

### 🟡 **PRIORITY 2: IMPORTANT (Improve Quality)**

#### 2.1 Real-time Shipment Timeline (KF-20, KF-26) - **Estimasi: 8 jam**
**Status:** Partial - Status update works, no historical log

**Schema Addition:**
```prisma
model ShipmentLog {
  id         String   @id @default(cuid())
  shipmentId String
  status     ShipmentStatus
  location   String?
  notes      String?
  timestamp  DateTime @default(now())
  createdBy  String?  // userId who updated
  
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  
  @@index([shipmentId])
  @@index([timestamp])
}
```

**Backend:**
- [ ] API `/api/florist/shipments/[id]/logs` - Add log entry
- [ ] Modify shipment update to auto-create log

**Frontend:**
- [ ] Timeline component (vertical stepper/timeline UI)
- [ ] Add to customer tracking page
- [ ] Add to florist shipment update page

---

#### 2.2 Auto Notification System (KF-14, KF-21, KF-28) - **Estimasi: 6 jam**
**Status:** Schema exists, trigger mechanism unclear

**Backend:**
- [ ] Check/implement background job (cron or Next.js API route with setInterval)
- [ ] Logic: Check `FloristInventory.quantity <= minThreshold`
- [ ] Create Notification record (type: LOW_STOCK_ALERT)

**Frontend:**
- [ ] Notification bell icon in navbar (badge with count)
- [ ] Dropdown to show recent notifications
- [ ] Mark as read functionality

---

### 🟢 **PRIORITY 3: NICE TO HAVE (Post-Demo)**

#### 3.1 Enhanced Features
- [ ] File upload untuk product images (current hardcoded URLs)
- [ ] Advanced filtering/search di tables
- [ ] Export CSV untuk reports
- [ ] Email templates styling (password reset, order confirmation)

#### 3.2 Testing & Documentation
- [ ] Unit tests untuk business logic
- [ ] Integration tests untuk critical flows
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User manual

---

## 📅 DEVELOPMENT TIMELINE

### Week 1 (5 hari kerja = 40 jam)
**Goal:** Critical features + Admin panel

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| **Day 1** | Password Recovery (KF-03) | 8h | Schema + API + UI + Email complete |
| **Day 2** | Admin Dashboard + Users | 8h | Admin dashboard + user management |
| **Day 3** | Admin RBAC + Categories | 8h | Role management + flower categories |
| **Day 4** | Admin Orders + Shipments | 8h | Monitoring pages |
| **Day 5** | Supplier Dashboard + Stocks | 8h | Supplier panel kickstart |

**Progress:** KF-03 ✅, KF-04 to KF-10 ✅, KF-11 partial

---

### Week 2 (5 hari kerja = 40 jam)
**Goal:** Supplier + Florist panels

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| **Day 6** | Supplier Harvest + Pre-orders | 8h | KF-12, KF-13 complete |
| **Day 7** | Florist Harvest View + Pre-orders | 8h | KF-15, KF-16 complete |
| **Day 8** | Florist Inventory + Products | 8h | KF-17, KF-18 complete (replace stub) |
| **Day 9** | Florist Shipments + Notifications | 8h | KF-20, KF-21 complete |
| **Day 10** | Real-time Timeline + Auto Notif | 8h | KF-26, KF-28 improved |

**Progress:** ALL 28 KF complete ✅

---

### Week 3 (Testing & Polish)
**Goal:** Integration testing + bug fixes

| Day | Tasks | Hours |
|-----|-------|-------|
| **Day 11-12** | End-to-end testing all flows | 16h |
| **Day 13** | Bug fixes + UI polish | 8h |
| **Day 14** | Documentation + deployment prep | 8h |
| **Day 15** | Buffer (final checks) | 8h |

---

## 🔧 TECHNICAL IMPLEMENTATION GUIDE

### Stack Confirmation
- ✅ **Frontend:** Next.js 15/16 (App Router)
- ✅ **Backend:** Next.js API Routes
- ✅ **Database:** PostgreSQL + Prisma ORM
- ✅ **Auth:** NextAuth v4 (JWT strategy)
- ✅ **Payment:** Midtrans Sandbox
- ✅ **Styling:** Tailwind CSS + shadcn/ui

### Database Migration Steps
1. Add missing models to `schema.prisma`:
   - `PasswordResetToken`
   - `ShipmentLog` (optional Priority 2)
2. Run migrations:
   ```bash
   npx prisma migrate dev --name add-password-reset-and-shipment-log
   npx prisma generate
   ```

### Environment Variables Needed
```env
# Email (untuk Password Reset)
EMAIL_FROM=noreply@florahub.com
RESEND_API_KEY=re_xxxxxxxxxxxx
# OR untuk SMTP:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

### UI Component Library
**Reuse existing shadcn/ui components:**
- Button, Input, Label, Card, Badge
- Table, Dialog, Sheet (drawer)
- Select, Checkbox, Textarea
- Toast (notifications)
- Form (react-hook-form + zod)

**Need to add:**
- Timeline/Stepper component (for shipment log)
- DataTable with pagination
- Stats card component

---

## 🎨 DESIGN PATTERNS

### Page Structure Template
```tsx
// app/[role]/[feature]/page.tsx
import { requireAuth } from '@/lib/middleware/requireAuth';

export default async function FeaturePage() {
  // Server-side auth check
  const auth = await requireAuth(request, ['ROLE']);
  
  // Fetch data server-side
  const data = await prisma.model.findMany();
  
  return (
    <div className="container mx-auto p-6">
      <h1>Feature Title</h1>
      <ClientComponent data={data} />
    </div>
  );
}
```

### API Route Template
```typescript
// app/api/[role]/[resource]/route.ts
import { requireAuth } from '@/lib/middleware/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  field: z.string(),
});

export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireAuth(request, ['ROLE']);
  
  // Validate input
  const body = await request.json();
  const validated = schema.parse(body);
  
  // Business logic
  const result = await prisma.model.create({ data: validated });
  
  return NextResponse.json({ success: true, data: result });
}
```

---

## 🧪 TESTING CHECKLIST

### Functional Testing (per KF)
- [ ] KF-01: Login semua 4 roles berhasil
- [ ] KF-02: Register + auto-assign role
- [ ] KF-03: Forgot password email sent + reset works
- [ ] KF-04 to KF-10: Admin CRUD operations
- [ ] KF-11 to KF-14: Supplier workflow
- [ ] KF-15 to KF-21: Florist workflow
- [ ] KF-22 to KF-27: Customer e-commerce flow
- [ ] KF-28: Notification auto-triggered

### Critical Flows (per UC)
- [ ] **Pre-Order Flow:** Supplier announce → Florist order → Supplier approve → Stock allocated
- [ ] **E-Commerce Flow:** Browse → Cart → Checkout → Midtrans → Payment webhook → Order PAID
- [ ] **Shipment Flow:** Florist ship → Update timeline → Customer track real-time
- [ ] **Admin Monitoring:** View all orders/payments/shipments across system

### Security Testing
- [ ] RBAC: Admin tidak bisa akses Supplier/Florist/Customer routes
- [ ] JWT token expiry handling
- [ ] Password reset token single-use + expiry
- [ ] Rate limiting pada sensitive endpoints
- [ ] XSS/CSRF protection (Next.js default)

---

## 📝 DOCUMENTATION REQUIREMENTS

### Code Documentation
- [ ] JSDoc comments untuk complex functions
- [ ] README.md dengan setup instructions
- [ ] API endpoint documentation (Postman/Swagger)

### User Documentation
- [ ] Admin manual: User management, RBAC, monitoring
- [ ] Supplier manual: Stock management, harvest planning, pre-orders
- [ ] Florist manual: Inventory, products, orders, shipments
- [ ] Customer manual: Browse, cart, checkout, payment, tracking

### Proposal Alignment
- [ ] Tabel mapping KF → Implementation (untuk laporan)
- [ ] Screenshot setiap page untuk dokumentasi TA
- [ ] Use Case diagram update (jika ada perubahan)

---

## 🚨 KNOWN ISSUES & RISKS

### Current Issues
1. ⚠️ `app/florist/products/page.tsx` adalah stub (17 lines) - MUST REPLACE
2. ⚠️ Supplier directories exist but empty - confusing structure
3. ⚠️ No email service configured - blocker untuk KF-03
4. ⚠️ No ShipmentLog table - blocker untuk real-time timeline
5. ⚠️ Auto-notification cron job unclear - may need manual trigger

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Email service setup gagal | HIGH | Use Resend (free 100/day, easy setup) |
| Time constraint (80 jam) | HIGH | Focus P1 only, defer P2/P3 |
| Database migration error | MEDIUM | Backup DB before migrate, test di dev first |
| Midtrans sandbox limit | LOW | Sandbox unlimited transactions |

---

## 🎓 UNTUK SIDANG/DEMO

### Demo Flow Recommendation
1. **Login as Admin** → Show dashboard, user management, monitoring
2. **Login as Supplier** → Add stock, create harvest announcement
3. **Login as Florist** → View harvest, create pre-order, manage products
4. **Login as Customer** → Browse catalog, checkout, Midtrans payment
5. **Back to Florist** → Approve order, update shipment status
6. **Back to Customer** → Track shipment real-time

### Presentation Slides
- [ ] Slide: Proposal requirements (28 KF)
- [ ] Slide: ERD (from docs/ERD.txt)
- [ ] Slide: System architecture (Next.js + Prisma + Midtrans)
- [ ] Slide: Implementation mapping (KF → Code)
- [ ] Slide: Demo screenshots (all 4 roles)
- [ ] Slide: Testing results (Black Box Testing table)

---

## 📊 PROGRESS TRACKING

### Current Status (Before Implementation)
```
Overall: [███████░░░░░░░░░░░░░░] 35% (10/28 KF fully complete)
Backend: [████████████████░░░░] 79% (22/28 APIs ready)
Frontend: [████████░░░░░░░░░░░░] 39% (13/33 pages ready)
```

### Target Status (After 2 Weeks)
```
Overall: [████████████████████] 100% (28/28 KF complete)
Backend: [████████████████████] 100% (28/28 APIs ready)
Frontend: [████████████████████] 100% (33/33 pages ready)
```

---

## 🔗 USEFUL LINKS

- **Proposal PDF:** `C:/Users/khusu/Downloads/sempro fx.pdf`
- **ERD:** `C:/Users/khusu/Desktop/coding/florahub/docs/ERD.txt`
- **Prisma Schema:** `C:/Users/khusu/Desktop/coding/florahub/prisma/schema.prisma`
- **API Routes:** `C:/Users/khusu/Desktop/coding/florahub/app/api/`
- **Audit Reports:**
  - `C:/Users/khusu/Desktop/coding/florahub/FUNCTIONAL_REQUIREMENTS_AUDIT.md`
  - `C:/Users/khusu/Desktop/coding/florahub/KF-03_PASSWORD_RECOVERY_AUDIT.md`
  - `C:/Users/khusu/florahub_frontend_audit.md`

---

## ✅ NEXT IMMEDIATE ACTIONS

1. **Review this action plan** dengan dosen pembimbing (jika perlu)
2. **Choose development approach:**
   - Option A: Saya bimbing Anda step-by-step (slower, learning focus)
   - Option B: Saya coding langsung + explain setelah selesai (faster, result focus)
   - Option C: Hybrid (saya kerjakan P1, Anda kerjakan P2/P3)
3. **Setup email service** (Resend recommended)
4. **Start Priority 1:** Password Recovery (KF-03)

---

**End of Action Plan**  
**Total Estimated Effort:** ~92 hours (12 days @ 8h/day)  
**Critical Path:** P1 items = 78 hours (10 days)  
**Buffer:** 14 hours untuk testing + bug fixes
