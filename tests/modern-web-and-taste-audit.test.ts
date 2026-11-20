import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function readProjectFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

function collectUiFiles(dirRel: string): string[] {
  const results: string[] = [];
  const walk = (absDir: string, relPrefix: string) => {
    for (const entry of readdirSync(absDir)) {
      const absPath = join(absDir, entry);
      const relPath = relPrefix ? `${relPrefix}/${entry}` : entry;
      const st = statSync(absPath);
      if (st.isDirectory()) {
        if (relPath === "app/api" || relPath.startsWith("app/api/")) continue;
        walk(absPath, relPath);
      } else if (entry.endsWith(".tsx")) {
        results.push(relPath);
      }
    }
  };
  walk(join(ROOT, dirRel), dirRel);
  return results;
}

test("Phase 1 (modern-web-guidance): app/globals.css enforces top-layer containment, discrete dialog animation, field-sizing, text-wrap, and sticky-safe overflow", () => {
  const css = readProjectFile("app/globals.css");
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.doesNotMatch(css, /overflow-x:\s*hidden/);
  assert.match(css, /h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*text-wrap:\s*balance/);
  assert.match(css, /p,\s*blockquote,\s*li\s*\{[^}]*text-wrap:\s*pretty/);
  assert.match(css, /dialog:modal\s*\{[^}]*overscroll-behavior:\s*contain/);
  assert.match(css, /dialog::backdrop\s*\{[^}]*overflow:\s*hidden[^}]*overscroll-behavior:\s*contain/);
  assert.match(css, /transition-behavior:\s*allow-discrete/);
  assert.match(css, /@starting-style/);
  assert.match(css, /textarea\.input-field\s*\{[^}]*field-sizing:\s*content[^}]*width:\s*100%/);
});

test("Phase 1 (modern-web-guidance): Modal & ConfirmDialog use native <dialog> without redundant ARIA or window Escape hacks", () => {
  const modal = readProjectFile("components/forms/Modal.tsx");
  const confirm = readProjectFile("components/ui/ConfirmDialog.tsx");

  assert.match(modal, /<dialog\b/);
  assert.match(modal, /showModal\(\)/);
  assert.match(modal, /closedby:\s*"any"/);
  assert.match(modal, /closedBy"\s+in\s+HTMLDialogElement\.prototype/);
  assert.match(modal, /onCancel=/);
  assert.doesNotMatch(modal, /role="dialog"/);
  assert.doesNotMatch(modal, /aria-modal/);
  assert.doesNotMatch(modal, /addEventListener\("keydown"/);

  assert.match(confirm, /import Modal from "@\/components\/forms\/Modal"/);
  assert.match(confirm, /autoFocus=\{!inputConfig\}/);
  assert.doesNotMatch(confirm, /role="dialog"/);
});

test("Phase 1 (modern-web-guidance): zero blocking alert(), confirm(), or prompt() calls across app/ and components/ UI", () => {
  const uiFiles = [...collectUiFiles("app"), ...collectUiFiles("components")];
  const blockingDialogRegex = /\b(?:window\.)?(?:alert|confirm|prompt)\(/;

  for (const relPath of uiFiles) {
    const content = readProjectFile(relPath);
    assert.equal(
      blockingDialogRegex.test(content),
      false,
      `Found blocking alert/confirm/prompt in ${relPath}`,
    );
  }
});

test("Phase 1 (modern-web-guidance): SearchInput uses <search>, tracking uses toSorted(), Navbar exposes aria-current, grids use @container, and views avoid 100vh pitfalls", () => {
  const searchInput = readProjectFile("components/ui/SearchInput.tsx");
  const tracking = readProjectFile("app/(customer)/orders/[id]/tracking/page.tsx");
  const navbar = readProjectFile("components/layout/Navbar.tsx");
  const productGrid = readProjectFile("components/customer/ProductGrid.tsx");
  const storesPage = readProjectFile("app/(customer)/stores/page.tsx");
  const customerLayout = readProjectFile("app/(customer)/layout.tsx");

  assert.match(searchInput, /<search\b/);
  assert.match(tracking, /\.toSorted\(/);
  assert.doesNotMatch(tracking, /\[\.\.\.remoteHistory\]\.sort\(/);
  assert.match(navbar, /usePathname\(\)/);
  assert.match(navbar, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.doesNotMatch(navbar, /role="menubar"/);
  assert.match(productGrid, /@container/);
  assert.match(storesPage, /@container/);
  assert.match(customerLayout, /min-h-dvh/);
});

test("Phase 2 (taste-skill): app/globals.css removes all violet/lavender hues (270-330deg) and defines botanical tokens + pointer-fine motion", () => {
  const css = readProjectFile("app/globals.css");
  assert.doesNotMatch(css, /#635bff/i);
  assert.doesNotMatch(css, /gradient-violet-to-blue/);
  assert.doesNotMatch(css, /FundedNext/i);

  const oklchMatches = [...css.matchAll(/oklch\([^)]*\s(\d+(?:\.\d+)?)(?:\s*\/[^)]*)?\)/g)];
  assert.ok(oklchMatches.length > 20, "Expected calibrated OKLCH palette tokens");
  for (const match of oklchMatches) {
    const hue = Number(match[1]);
    assert.ok(
      hue < 270 || hue > 330,
      `Disallowed violet/lavender OKLCH hue (${hue}deg) found in globals.css: ${match[0]}`,
    );
  }

  assert.match(css, /--font-display:\s*var\(--font-editorial\)/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /@keyframes flora-enter/);
});

test("Phase 2 (taste-skill): RootLayout loads Plus_Jakarta_Sans & Instrument_Serif, Storefront & Admin remove anti-patterns", () => {
  const layout = readProjectFile("app/layout.tsx");
  const home = readProjectFile("app/(customer)/page.tsx");
  const productsPage = readProjectFile("app/(customer)/products/page.tsx");
  const productDetailPage = readProjectFile("app/(customer)/products/[slug]/page.tsx");
  const storesPage = readProjectFile("app/(customer)/stores/page.tsx");
  const storeDetailPage = readProjectFile("app/(customer)/stores/[id]/page.tsx");
  const cartPage = readProjectFile("app/(customer)/cart/page.tsx");
  const adminDashboard = readProjectFile("app/admin/dashboard/page.tsx");
  const login = readProjectFile("app/auth/login/page.tsx");
  const register = readProjectFile("app/auth/register/page.tsx");

  assert.match(layout, /Plus_Jakarta_Sans/);
  assert.match(layout, /Instrument_Serif/);
  assert.match(layout, /MIDTRANS_SNAP_SCRIPT_URL/);
  assert.match(layout, /PUBLIC_SITE_URL/);
  assert.match(layout, /SITE_AUTHOR/);

  assert.doesNotMatch(home, /01 \/ Supplier/);
  assert.doesNotMatch(home, /02 \/ Florist/);
  assert.doesNotMatch(home, /03 \/ Customer/);
  assert.doesNotMatch(home, /mx-3 mt-3 overflow-hidden rounded-\[24px\]/);
  assert.doesNotMatch(home, /lg:grid-cols-\[1fr_2fr\]/);
  assert.match(home, /StarProductsShowcase/);
  assert.match(home, /font-display/);

  for (const pageContent of [
    productsPage,
    productDetailPage,
    storesPage,
    storeDetailPage,
    cartPage,
    login,
    register,
  ]) {
    assert.doesNotMatch(pageContent, /blur-3xl/);
    assert.doesNotMatch(pageContent, /\bbg-black\b/);
    assert.doesNotMatch(pageContent, /shadow-(?:md|lg|xl|2xl)/);
  }
  assert.match(productsPage, /best-selling/);
  assert.match(storesPage, /@container/);
  assert.match(productDetailPage, /@container/);

  assert.doesNotMatch(cartPage, /Garansi kesegaran bunga/);
  assert.doesNotMatch(cartPage, /Kemasan khusus florist/);
  assert.match(cartPage, /ConfirmDialog/);
  assert.match(cartPage, /floristId/);

  assert.match(login, /min-h-dvh/);
  assert.match(register, /min-h-dvh/);

  const leakedPublicJargon =
    /\b(?:Midtrans|Biteship|audit log|BOM|B2B|spreadsheet)\b|Akun admin dikelola|panel kiri menyesuaikan/;
  for (const publicContent of [
    home,
    productsPage,
    productDetailPage,
    storesPage,
    storeDetailPage,
    cartPage,
    login,
    register,
  ]) {
    assert.doesNotMatch(
      publicContent,
      leakedPublicJargon,
      "Public route copy should not expose internal/vendor plumbing or meta-UI filler",
    );
  }

  assert.doesNotMatch(adminDashboard, /blur-3xl/);
});

test("Customer authenticated batch 1 (/checkout, /orders, /orders/[id]) enforces modern choice cards, semantic OrderCard, full-bleed dark headers, and zero vendor/AI jargon", () => {
  const checkoutPage = readProjectFile("app/(customer)/checkout/page.tsx");
  const ordersPage = readProjectFile("app/(customer)/orders/page.tsx");
  const orderDetailPage = readProjectFile("app/(customer)/orders/[id]/page.tsx");
  const addressSelector = readProjectFile("components/customer/AddressSelector.tsx");
  const checkoutSummary = readProjectFile("components/customer/CheckoutSummary.tsx");
  const couponInput = readProjectFile("components/customer/CouponInput.tsx");
  const orderCard = readProjectFile("components/customer/OrderCard.tsx");

  const leakedCustomerJargon =
    /\b(?:Midtrans|Biteship|audit log|BOM|B2B|spreadsheet)\b|Gunakan tombol|di satu tempat/i;

  for (const content of [
    checkoutPage,
    ordersPage,
    orderDetailPage,
    addressSelector,
    checkoutSummary,
    couponInput,
    orderCard,
  ]) {
    assert.doesNotMatch(content, /blur-3xl/);
    assert.doesNotMatch(content, /\bbg-black\b/);
    assert.doesNotMatch(content, /shadow-(?:md|lg|xl|2xl)/);
    assert.doesNotMatch(content, /#10121b/i);
    assert.doesNotMatch(
      content,
      leakedCustomerJargon,
      "Customer routes/components must not expose vendor names, internal terms, or AI filler copy",
    );
  }

  assert.match(checkoutPage, /min-h-dvh/);
  assert.match(ordersPage, /min-h-dvh/);
  assert.match(orderDetailPage, /min-h-dvh/);

  assert.match(addressSelector, /type="radio"/);
  assert.match(checkoutPage, /type="radio"/);
  assert.match(checkoutPage, /input-field/);
  assert.match(orderCard, /<article\b/);
  assert.doesNotMatch(ordersPage, /role="tablist"/);
});

test("Customer authenticated batch 2 (/orders/[id]/tracking, /profile, /profile/addresses, /notifications) enforces semantic breadcrumbs, toSorted, full-bleed dark headers, and zero vendor/AI jargon", () => {
  const trackingPage = readProjectFile("app/(customer)/orders/[id]/tracking/page.tsx");
  const profilePage = readProjectFile("app/(customer)/profile/page.tsx");
  const addressesPage = readProjectFile("app/(customer)/profile/addresses/page.tsx");
  const notificationsPage = readProjectFile("app/(customer)/notifications/page.tsx");
  const addressCard = readProjectFile("components/customer/AddressCard.tsx");
  const notificationCenter = readProjectFile("components/layout/NotificationCenter.tsx");

  const leakedBatch2Jargon =
    /\b(?:Midtrans|Biteship|audit log|BOM|B2B|spreadsheet)\b|Buka Halaman Terkait|Kelola informasi data diri|mempercepat pengiriman dan checkout|muncul otomatis saat Anda/i;

  for (const content of [
    trackingPage,
    profilePage,
    addressesPage,
    notificationsPage,
    addressCard,
    notificationCenter,
  ]) {
    assert.doesNotMatch(content, /blur-3xl/);
    assert.doesNotMatch(content, /\bbg-black\b/);
    assert.doesNotMatch(content, /shadow-(?:md|lg|xl|2xl)/);
    assert.doesNotMatch(content, /#10121b/i);
    assert.doesNotMatch(
      content,
      leakedBatch2Jargon,
      "Batch 2 customer routes/components must not expose vendor names, internal terms, or AI filler copy",
    );
  }

  assert.match(trackingPage, /min-h-dvh/);
  assert.match(profilePage, /min-h-dvh/);
  assert.match(addressesPage, /min-h-dvh/);
  assert.match(notificationCenter, /min-h-dvh/);

  assert.match(trackingPage, /aria-label="Breadcrumbs"/);
  assert.match(trackingPage, /aria-current="page"/);
  assert.match(addressesPage, /aria-label="Breadcrumbs"/);
  assert.match(addressesPage, /aria-current="page"/);

  assert.match(trackingPage, /\.toSorted\(/);
  assert.match(addressesPage, /\.toSorted\(/);

  assert.match(addressCard, /<article\b/);
  assert.match(notificationCenter, /<article\b/);
  assert.match(notificationCenter, /aria-pressed/);
});

test("Multi-florist cart UX groups items per store with floristName provenance and 1-click store resolution", () => {
  const cartStore = readProjectFile("lib/stores/cartStore.ts");
  const cartTable = readProjectFile("components/customer/CartTable.tsx");
  const cartPage = readProjectFile("app/(customer)/cart/page.tsx");

  assert.match(cartStore, /floristName\?: string/);
  assert.match(cartStore, /keepOnlyFlorist/);
  assert.match(cartStore, /removeItemsByFlorist/);
  assert.match(cartStore, /hydrateItemMetadata/);

  assert.match(cartTable, /keepOnlyFlorist/);
  assert.match(cartTable, /removeItemsByFlorist/);
  assert.match(cartTable, /Pilih Toko Ini/);
  assert.match(cartTable, /Hapus Toko/);
  assert.doesNotMatch(cartTable, />Lihat toko</);

  assert.match(cartPage, /keepOnlyFlorist/);
  assert.match(cartPage, /Checkout diproses per 1 toko/);
  assert.match(cartPage, /ConfirmDialog/);
  assert.match(cartPage, /floristId/);
});

test("Florist Batch 1 & Batch 2 routes enforce light-dominant rhythm, aria-pressed filters, toSorted, and end-to-end order timeline", () => {
  const floristOrders = readProjectFile("app/florist/orders/page.tsx");
  const floristOrderDetail = readProjectFile("app/florist/orders/[id]/page.tsx");
  const floristShipments = readProjectFile("app/florist/shipments/page.tsx");
  const shipmentStats = readProjectFile("components/florist/ShipmentStats.tsx");
  const shipmentTable = readProjectFile("components/florist/ShipmentTable.tsx");
  const productFilters = readProjectFile("components/florist/ProductFilters.tsx");
  const productCard = readProjectFile("components/florist/ProductCard.tsx");
  const floristInventory = readProjectFile("app/florist/inventory/page.tsx");
  const floristSupplierStocks = readProjectFile("app/florist/supplier-stocks/page.tsx");
  const floristHarvestPlans = readProjectFile("app/florist/harvest-plans/page.tsx");
  const preOrderTable = readProjectFile("components/florist/PreOrderTable.tsx");
  const floristShopSettings = readProjectFile("app/florist/settings/shop/page.tsx");

  assert.match(floristOrders, /aria-pressed/);
  assert.match(floristOrderDetail, /buildOrderTrackingTimeline/);
  assert.match(floristOrderDetail, /aria-label="Breadcrumbs"/);
  assert.match(floristShipments, /autoCreateFloristShipment/);
  assert.doesNotMatch(floristShipments, /Input Manual/);
  assert.doesNotMatch(shipmentStats, /bg-surface-dark/);
  assert.doesNotMatch(shipmentTable, /<td\s+scope="col"/);
  assert.match(productFilters, /aria-pressed/);
  assert.match(productCard, /<article\b/);
  assert.doesNotMatch(productCard, /zinc-\d+/);
  assert.match(floristInventory, /aria-pressed/);
  assert.doesNotMatch(floristInventory, /<thead[^>]*bg-surface-dark/);
  assert.match(floristSupplierStocks, /aria-pressed/);
  assert.match(floristHarvestPlans, /aria-pressed/);
  assert.doesNotMatch(preOrderTable, /<td\s+scope="col"/);
  assert.doesNotMatch(preOrderTable, /zinc-\d+/);
  assert.match(
    preOrderTable,
    /href=\{`\/api\/supplier\/shipments\/\$\{order\.id\}\/label`\}/,
  );
  assert.match(
    floristSupplierStocks,
    /href=\{`\/api\/supplier\/shipments\/\$\{order\.id\}\/label`\}/,
  );
  assert.match(floristShopSettings, /\.toSorted\(/);
});

test("Supplier portal routes & APIs enforce editorial rhythm, pagination, SearchInput, native AWB label links, full harvest CRUD, and settled-revenue accounting", () => {
  const supplierLayout = readProjectFile("app/supplier/layout.tsx");
  const supplierDashboard = readProjectFile("app/supplier/dashboard/page.tsx");
  const supplierSales = readProjectFile("app/supplier/sales/page.tsx");
  const supplierShipments = readProjectFile("app/supplier/shipments/page.tsx");
  const supplierStocks = readProjectFile("app/supplier/stocks/page.tsx");
  const supplierHarvest = readProjectFile("app/supplier/harvest-announcements/page.tsx");
  const filterBar = readProjectFile("components/ui/FilterBar.tsx");
  const statusBadge = readProjectFile("components/ui/StatusBadge.tsx");
  const supplierDeliveryStatus = readProjectFile("components/ui/SupplierDeliveryStatus.tsx");
  const supplierDashboardApi = readProjectFile("app/api/supplier/dashboard/route.ts");
  const harvestListApi = readProjectFile("app/api/supplier/harvest-announcements/route.ts");
  const floristPreordersApi = readProjectFile("app/api/florist/preorders/route.ts");

  for (const content of [
    supplierLayout,
    supplierDashboard,
    supplierSales,
    supplierShipments,
    supplierStocks,
    supplierHarvest,
  ]) {
    assert.doesNotMatch(content, /blur-3xl/);
    assert.doesNotMatch(content, /\bbg-black\b/);
    assert.doesNotMatch(content, /shadow-(?:md|lg|xl|2xl)/);
    assert.doesNotMatch(content, /zinc-\d+/);
  }

  assert.match(supplierLayout, /Kebun/);
  assert.match(supplierLayout, /bg-primary font-semibold text-primary-foreground/);
  assert.match(supplierLayout, /aria-current/);

  assert.match(supplierDashboard, /rounded-\[24px\]/);
  assert.match(supplierDashboard, /StatusBadge/);
  assert.match(supplierDashboard, /tabular-nums/);
  assert.match(supplierDashboard, /<time\b/);
  assert.doesNotMatch(supplierDashboard, /dalam satu tempat/);

  assert.match(supplierSales, /Pagination/);
  assert.match(supplierSales, /SearchInput/);
  assert.match(supplierSales, /FilterBar/);
  assert.match(supplierSales, /from "next\/link"/);
  assert.doesNotMatch(supplierSales, /Lacak & Kontrol Kurir/);
  assert.doesNotMatch(supplierSales, /Midtrans/);

  assert.match(supplierShipments, /Pagination/);
  assert.match(supplierShipments, /SearchInput/);
  assert.match(supplierShipments, /aria-pressed/);
  assert.match(
    supplierShipments,
    /href=\{`\/api\/supplier\/shipments\/\$\{s\.id\}\/label`\}/,
  );
  assert.doesNotMatch(supplierShipments, /getSupplierShipmentLabel/);
  assert.doesNotMatch(supplierShipments, /handlePrintLabel/);
  assert.match(supplierShipments, /shippedAt=/);
  assert.match(supplierShipments, /deliveredAt=/);
  assert.doesNotMatch(supplierShipments, /Booking Biteship/);

  assert.match(supplierStocks, /Pagination/);
  assert.match(supplierStocks, /SearchInput/);
  assert.match(supplierStocks, /FilterBar/);
  assert.match(supplierStocks, /fetchPaginatedCollection/);
  assert.match(supplierStocks, /headerVariant="dark"/);
  assert.match(supplierStocks, /role="status"/);

  assert.match(supplierHarvest, /Pagination/);
  assert.match(supplierHarvest, /SearchInput/);
  assert.match(supplierHarvest, /FilterBar/);
  assert.match(supplierHarvest, /fetchPaginatedCollection/);
  assert.match(supplierHarvest, /updateHarvestAnnouncement/);
  assert.match(supplierHarvest, /<article\b/);
  assert.match(
    supplierHarvest,
    /href=\{`\/api\/supplier\/shipments\/\$\{order\.id\}\/label`\}/,
  );
  assert.doesNotMatch(supplierHarvest, /membuka keran/);

  assert.match(filterBar, /type="button"/);
  assert.match(filterBar, /aria-pressed/);
  assert.match(statusBadge, /PAID:\s*\{/);
  assert.doesNotMatch(supplierDeliveryStatus, /Booking Biteship/);

  assert.match(supplierDashboardApi, /"DELIVERED"/);
  assert.match(harvestListApi, /userRole === "SUPPLIER"/);
  assert.doesNotMatch(
    floristPreordersApi,
    /\/supplier\/harvest-announcements\/\$\{announcement\.id\}/,
  );
});

test("Admin portal routes enforce editorial rhythm, unified native Modal, accessible tables, aria-pressed filters, TrackingProgressTrack, and zero vendor jargon", () => {
  const adminLayout = readProjectFile("app/admin/layout.tsx");
  const adminDashboard = readProjectFile("app/admin/dashboard/page.tsx");
  const adminUsers = readProjectFile("app/admin/users/page.tsx");
  const adminOrders = readProjectFile("app/admin/orders/page.tsx");
  const adminCoupons = readProjectFile("app/admin/coupons/page.tsx");
  const adminAuditLogs = readProjectFile("app/admin/audit-logs/page.tsx");

  for (const content of [
    adminLayout,
    adminDashboard,
    adminUsers,
    adminOrders,
    adminCoupons,
    adminAuditLogs,
  ]) {
    assert.doesNotMatch(content, /blur-3xl/);
    assert.doesNotMatch(content, /\bbg-black\b/);
    assert.doesNotMatch(content, /shadow-(?:md|lg|xl|2xl)/);
    assert.doesNotMatch(content, /zinc-\d+/);
    assert.doesNotMatch(content, /@\/components\/ui\/dialog/);
    assert.doesNotMatch(content, /@\/components\/ui\/button/);
  }

  assert.match(adminLayout, /sticky top-0/);
  assert.match(adminLayout, /bg-primary font-semibold text-primary-foreground/);
  assert.match(adminLayout, /aria-current/);

  assert.match(adminDashboard, /rounded-\[24px\]/);
  assert.match(adminDashboard, /isRefreshing/);
  assert.match(adminDashboard, /tabular-nums/);
  assert.doesNotMatch(adminDashboard, /User Directory|Marketing/);

  for (const dataPage of [adminUsers, adminOrders, adminCoupons, adminAuditLogs]) {
    assert.match(dataPage, /import Modal from "@\/components\/forms\/Modal"/);
    assert.match(dataPage, /scope="col"/);
    assert.match(dataPage, /role="region"/);
    assert.match(dataPage, /<time\b/);
    assert.match(dataPage, /tabular-nums/);
  }

  assert.match(adminOrders, /TrackingProgressTrack/);
  assert.match(adminOrders, /aria-pressed/);
  assert.doesNotMatch(adminOrders, /\b(?:Midtrans|Biteship)\b/);
  assert.doesNotMatch(adminOrders, /Masked PII/);

  assert.match(adminCoupons, /inputMode="numeric"/);

  assert.match(adminAuditLogs, /HarvestAnnouncement/);
  assert.match(adminAuditLogs, /aria-pressed/);
});

test("Repo-wide icon hygiene & flat hairline discipline remove Sparkles/Flame slop, tinted KPI icon boxes, admin sidebar icons, and shadow-xs/shadow-sm", () => {
  const uiFiles = [...collectUiFiles("app"), ...collectUiFiles("components")];

  for (const relPath of uiFiles) {
    const content = readProjectFile(relPath);
    assert.doesNotMatch(
      content,
      /\b(?:Sparkles|Flame)\b/,
      `${relPath} must not import or render Sparkles/Flame decorative icons`,
    );

    if (
      relPath.startsWith("app/florist/") ||
      relPath.startsWith("components/florist/") ||
      relPath.startsWith("app/supplier/") ||
      relPath.startsWith("app/admin/") ||
      relPath === "components/layout/CustomerNotifications.tsx"
    ) {
      assert.doesNotMatch(
        content,
        /\bshadow-(?:xs|sm)\b/,
        `${relPath} must use flat hairline surfaces without shadow-xs or shadow-sm`,
      );
    }
  }

  const adminLayout = readProjectFile("app/admin/layout.tsx");
  assert.doesNotMatch(
    adminLayout,
    /\b(?:LayoutDashboard|TicketPercent|ClipboardList|LogOut|ShoppingBag|Users)\b/,
  );

  const adminDashboard = readProjectFile("app/admin/dashboard/page.tsx");
  const supplierDashboard = readProjectFile("app/supplier/dashboard/page.tsx");
  const storefrontHome = readProjectFile("app/(customer)/page.tsx");

  for (const content of [adminDashboard, supplierDashboard, storefrontHome]) {
    assert.doesNotMatch(content, /bg-primary\/10\s+p-(?:1\.5|2)\b/);
    assert.doesNotMatch(content, /\bh-10\s+w-10\b[^"]*bg-primary\/10/);
  }
});

test("Jawa Timur regional branding & floating dark summary-card sidebars are enforced consistently across Florist, Supplier, and Admin", () => {
  const regionalFiles = [
    "components/layout/Footer.tsx",
    "app/(customer)/page.tsx",
    "app/auth/login/page.tsx",
    "app/auth/register/page.tsx",
  ];
  for (const relPath of regionalFiles) {
    const content = readProjectFile(relPath);
    assert.match(content, /Jawa Timur/, `${relPath} harus menegaskan fokus wilayah Jawa Timur`);
    assert.doesNotMatch(
      content,
      /Surabaya\s*(?:&amp;|·)\s*Malang/,
      `${relPath} tidak boleh lagi memakai copy Surabaya & Malang`,
    );
  }

  for (const layoutPath of [
    "app/florist/layout.tsx",
    "app/supplier/layout.tsx",
    "app/admin/layout.tsx",
  ]) {
    const layout = readProjectFile(layoutPath);
    assert.match(layout, /rounded-2xl border border-white\/10 bg-surface-dark text-white/);
    assert.match(layout, /rounded-xl border border-white\/10 bg-white\/5/);
    assert.match(layout, /Keluar/);
    assert.doesNotMatch(layout, /Buka Audit Log|Kelola Pengiriman/);
  }
});

test("Fitur refund telah dihapus total dari schema, tipe, API, dan UI aplikasi", () => {
  const roots = ["app", "components", "lib", "types"];
  const files: string[] = ["prisma/schema.prisma"];
  const walk = (dirRel: string) => {
    for (const entry of readdirSync(join(ROOT, dirRel))) {
      const rel = `${dirRel}/${entry}`;
      const st = statSync(join(ROOT, rel));
      if (st.isDirectory()) {
        walk(rel);
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(rel);
      }
    }
  };
  for (const r of roots) walk(r);

  for (const relPath of files) {
    const content = readProjectFile(relPath);
    assert.doesNotMatch(
      content,
      /\b(?:REFUND|REFUNDED|refundedAt|refundAmount)\b/,
      `${relPath} tidak boleh mengandung sisa fitur refund`,
    );
  }
});

test("Seluruh tombol dan elemen interaktif menerapkan cursor: pointer dan sidebar memiliki dark scrollbar", () => {
  const globalsCss = readProjectFile("app/globals.css");
  assert.match(globalsCss, /button:not\(:disabled\)/);
  assert.match(globalsCss, /cursor:\s*pointer;/);
  assert.match(globalsCss, /button:disabled[\s\S]*?cursor:\s*not-allowed;/);
  assert.match(globalsCss, /\.sidebar-dark-scroll\s*\{[\s\S]*?color-scheme:\s*dark;/);
  assert.match(globalsCss, /scrollbar-color:\s*var\(--scrollbar-thumb\)\s+var\(--scrollbar-track\);/);

  const uiButton = readProjectFile("components/ui/button.tsx");
  assert.match(uiButton, /\bcursor-pointer\b/);

  const uiSelect = readProjectFile("components/ui/select.tsx");
  assert.match(uiSelect, /\bcursor-pointer\b/);
  assert.doesNotMatch(uiSelect, /\bcursor-default\b/);

  const modalSource = readProjectFile("components/forms/Modal.tsx");
  assert.match(modalSource, /\bm-auto!/);
  assert.match(globalsCss, /dialog\s*\{[\s\S]*?margin:\s*auto\s*!important;/);
});
