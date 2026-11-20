import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOrderTrackingTimeline,
  buildSupplierTrackingTimeline,
  formatCourierNote,
} from "../lib/order-tracking-timeline";

const ROOT = process.cwd();

function readProjectFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

test("buildOrderTrackingTimeline menggabungkan event sandbox confirmed dengan milestone DB menjadi timeline Indonesia lengkap", () => {
  const events = buildOrderTrackingTimeline({
    order: {
      orderNumber: "ORD-20261111-006-8971",
      status: "DELIVERED",
      createdAt: "2026-11-11T10:20:00.000Z",
      updatedAt: "2026-11-11T12:00:00.000Z",
      address: {
        recipientName: "Rina",
        city: "Surabaya",
      },
      payment: {
        paidAt: "2026-11-11T10:22:00.000Z",
      },
    },
    shipment: {
      courier: "sicepat",
      trackingNumber: "00123456789",
      status: "DELIVERED",
      shippedAt: "2026-11-11T10:40:00.000Z",
      deliveredAt: "2026-11-11T12:00:00.000Z",
      createdAt: "2026-11-11T10:24:00.000Z",
    },
    remoteHistory: [
      {
        status: "confirmed",
        note: "Courier order is confirmed. sicepat has been notified to pick up. Pickup Number: WYB-1794392724344",
        updated_at: "2026-11-11T10:25:00.000Z",
      },
    ],
  });

  assert.equal(events.length, 5);
  assert.deepEqual(
    events.map((ev) => ev.statusTitle),
    [
      "Paket Diterima",
      "Diserahkan ke Kurir",
      "Pesanan Kurir Dikonfirmasi",
      "Pembayaran Terverifikasi",
      "Pesanan Dibuat",
    ],
  );
  assert.equal(
    events.some((ev) => /Courier order is confirmed/i.test(ev.description)),
    false,
  );
  assert.match(events[2].description, /SICEPAT/);
  assert.match(events[2].description, /WYB-1794392724344/);
});

test("buildOrderTrackingTimeline menduplikasi milestone secara aman saat riwayat kurir produksi sudah lengkap", () => {
  const events = buildOrderTrackingTimeline({
    order: {
      orderNumber: "ORD-20261119-001",
      status: "DELIVERED",
      createdAt: "2026-11-19T08:00:00.000Z",
      updatedAt: "2026-11-19T13:00:00.000Z",
      address: { recipientName: "Budi", city: "Malang" },
      payment: { paidAt: "2026-11-19T08:05:00.000Z" },
    },
    shipment: {
      courier: "jne",
      trackingNumber: "JNE123456",
      status: "DELIVERED",
      shippedAt: "2026-11-19T09:00:00.000Z",
      deliveredAt: "2026-11-19T13:00:00.000Z",
    },
    remoteHistory: [
      {
        status: "confirmed",
        note: "Courier order is confirmed. jne has been notified to pick up. Pickup Number: PKP-001",
        updated_at: "2026-11-19T08:15:00.000Z",
      },
      {
        status: "picked",
        note: "Paket sudah dijemput kurir",
        updated_at: "2026-11-19T09:00:00.000Z",
      },
      {
        status: "delivered",
        note: "Diterima langsung oleh Budi",
        updated_at: "2026-11-19T13:00:00.000Z",
      },
    ],
  });

  assert.equal(events.length, 5);
  assert.deepEqual(
    events.map((ev) => ev.statusTitle),
    [
      "Paket Diterima",
      "Paket Dijemput Kurir",
      "Pesanan Kurir Dikonfirmasi",
      "Pembayaran Terverifikasi",
      "Pesanan Dibuat",
    ],
  );
});

test("buildOrderTrackingTimeline menempatkan Pesanan Dibatalkan di paling atas meski pernah ada event confirmed", () => {
  const events = buildOrderTrackingTimeline({
    order: {
      orderNumber: "ORD-20261119-CANCEL",
      status: "CANCELLED",
      createdAt: "2026-11-19T10:00:00.000Z",
      updatedAt: "2026-11-19T10:15:00.000Z",
    },
    shipment: {
      courier: "sicepat",
      status: "CANCELLED",
    },
    remoteHistory: [
      {
        status: "confirmed",
        note: "Courier order is confirmed. sicepat has been notified to pick up. Pickup Number: WYB-99",
        updated_at: "2026-11-19T10:15:00.000Z",
      },
    ],
  });

  assert.equal(events[0].statusTitle, "Pesanan Dibatalkan");
  assert.equal(events[0].isCancelled, true);
  assert.equal(events[1].statusTitle, "Pesanan Kurir Dikonfirmasi");
  assert.equal(events[2].statusTitle, "Pesanan Dibuat");
});

test("formatCourierNote melokalisasi catatan sandbox bahasa Inggris namun menjaga catatan kustom berbahasa Indonesia", () => {
  const localized = formatCourierNote(
    "Courier order is confirmed. sicepat has been notified to pick up. Pickup Number: WYB-1794392724344",
    "sicepat",
    "confirmed",
  );
  assert.match(localized, /Kurir SICEPAT terkonfirmasi/);
  assert.match(localized, /WYB-1794392724344/);
  assert.doesNotMatch(localized, /has been notified/i);

  const indonesianNote = formatCourierNote(
    "Kurir tiba di lobi apartemen sesuai petunjuk.",
    "gosend",
    "dropping_off",
  );
  assert.equal(indonesianNote, "Kurir tiba di lobi apartemen sesuai petunjuk.");
});

test("POST /api/customer/orders/[id]/confirm-delivery menegakkan auth CUSTOMER, ownership, status SHIPPED atomik, sync shipment, notifikasi, dan audit log", () => {
  const route = readProjectFile(
    "app/api/customer/orders/[id]/confirm-delivery/route.ts",
  );
  assert.match(route, /requireAuth\(request,\s*\["CUSTOMER"\]\)/);
  assert.match(route, /order\.userId !== userId/);
  assert.match(route, /order\.status !== "SHIPPED"/);
  assert.match(route, /updateMany\(\s*\{[\s\S]*where:\s*\{[\s\S]*id,[\s\S]*userId,[\s\S]*status:\s*"SHIPPED"/);
  assert.match(route, /deliveredAt:\s*now/);
  assert.match(route, /tx\.notification\.create/);
  assert.match(route, /createAuditLog/);
});

test("UI detail dan pelacakan pesanan menyambungkan confirmOrderDelivery dan ConfirmDialog", () => {
  const detailPage = readProjectFile("app/(customer)/orders/[id]/page.tsx");
  const trackingPage = readProjectFile(
    "app/(customer)/orders/[id]/tracking/page.tsx",
  );

  for (const content of [detailPage, trackingPage]) {
    assert.match(content, /confirmOrderDelivery/);
    assert.match(content, /ConfirmDialog/);
    assert.match(content, /Pesanan Diterima/);
  }
  assert.match(detailPage, /Tulis Ulasan/);
  assert.match(trackingPage, /buildOrderTrackingTimeline/);
});

test("buildSupplierTrackingTimeline menggabungkan milestone Pre-Order DB dengan event sandbox confirmed menjadi timeline Bahasa Indonesia lengkap", () => {
  const events = buildSupplierTrackingTimeline({
    orderType: "PREORDER",
    orderNumber: "PO-O249IUPD",
    status: "DELIVERED",
    flowerName: "Mawar Merah Semi Holland",
    quantity: 100,
    unit: "tangkai",
    supplierName: "Kebun Batu Sejuk",
    floristName: "Studio Flora Indah",
    courier: "jne",
    trackingNumber: "WYB-1794637475192",
    createdAt: "2026-11-14T06:20:00.000Z",
    confirmedAt: "2026-11-14T06:21:00.000Z",
    depositPaidAt: "2026-11-14T06:22:00.000Z",
    finalPaidAt: "2026-11-14T06:23:00.000Z",
    shippedAt: "2026-11-14T06:26:00.000Z",
    deliveredAt: "2026-11-14T06:35:00.000Z",
    remoteHistory: [
      {
        status: "confirmed",
        note: "Courier order is confirmed. jne has been notified to pick up. Pickup Number: WYB-1794637475192",
        updated_at: "2026-11-14T06:24:00.000Z",
      },
    ],
  });

  assert.equal(events.length, 7);
  assert.deepEqual(
    events.map((ev) => ev.statusTitle),
    [
      "Bunga Diterima Florist",
      "Diserahkan ke Kurir",
      "Pesanan Kurir Dikonfirmasi",
      "Pelunasan Terverifikasi",
      "DP 50% Terverifikasi",
      "Kuota Disetujui Supplier",
      "Pre-Order Dibuat",
    ],
  );
  assert.equal(
    events.some((ev) => /Courier order is confirmed/i.test(ev.description)),
    false,
  );
  assert.match(events[2].description, /JNE/);
  assert.match(events[2].description, /WYB-1794637475192/);
});

test("buildSupplierTrackingTimeline menyusun timeline pasokan langsung (DIRECT_SALE) berstatus SHIPPED dengan event sandbox confirmed", () => {
  const events = buildSupplierTrackingTimeline({
    orderType: "DIRECT_SALE",
    orderNumber: "SO-ABC12345",
    status: "SHIPPED",
    flowerName: "Tulip Import",
    quantity: 50,
    unit: "tangkai",
    supplierName: "Kebun Lembang",
    floristName: "Studio Melati",
    courier: "sicepat",
    trackingNumber: "WYB-998877",
    createdAt: "2026-11-14T08:00:00.000Z",
    shippedAt: "2026-11-14T08:15:00.000Z",
    remoteHistory: [
      {
        status: "confirmed",
        note: "Courier order is confirmed. sicepat has been notified to pick up. Pickup Number: WYB-998877",
        updated_at: "2026-11-14T08:05:00.000Z",
      },
    ],
  });

  assert.deepEqual(
    events.map((ev) => ev.statusTitle),
    [
      "Diserahkan ke Kurir",
      "Pesanan Kurir Dikonfirmasi",
      "Pembayaran Terverifikasi",
      "Pesanan Pasokan Dibuat",
    ],
  );
  assert.equal(
    events.some((ev) => /Courier order is confirmed/i.test(ev.description)),
    false,
  );
});

test("buildSupplierTrackingTimeline menduplikasi milestone secara aman saat riwayat kurir produksi sudah memuat picked dan delivered", () => {
  const events = buildSupplierTrackingTimeline({
    orderType: "PREORDER",
    orderNumber: "PO-PROD01",
    status: "DELIVERED",
    flowerName: "Lily Putih",
    quantity: 40,
    courier: "jne",
    trackingNumber: "JNE-PROD-01",
    createdAt: "2026-11-15T07:00:00.000Z",
    confirmedAt: "2026-11-15T07:05:00.000Z",
    depositPaidAt: "2026-11-15T07:10:00.000Z",
    finalPaidAt: "2026-11-15T07:15:00.000Z",
    shippedAt: "2026-11-15T08:00:00.000Z",
    deliveredAt: "2026-11-15T12:00:00.000Z",
    remoteHistory: [
      {
        status: "confirmed",
        note: "Courier order is confirmed. jne has been notified to pick up. Pickup Number: PKP-88",
        updated_at: "2026-11-15T07:20:00.000Z",
      },
      {
        status: "picked",
        note: "Paket sudah dijemput kurir",
        updated_at: "2026-11-15T08:00:00.000Z",
      },
      {
        status: "delivered",
        note: "Paket telah diterima oleh Studio Florist",
        updated_at: "2026-11-15T12:00:00.000Z",
      },
    ],
  });

  assert.equal(events.length, 7);
  assert.deepEqual(
    events.map((ev) => ev.statusTitle),
    [
      "Paket Diterima",
      "Paket Dijemput Kurir",
      "Pesanan Kurir Dikonfirmasi",
      "Pelunasan Terverifikasi",
      "DP 50% Terverifikasi",
      "Kuota Disetujui Supplier",
      "Pre-Order Dibuat",
    ],
  );
});

test("Route track supplier dan ShipmentTrackingModal menggunakan buildSupplierTrackingTimeline serta bebas teks mentah/jargon vendor", () => {
  const trackRoute = readProjectFile(
    "app/api/supplier/shipments/[id]/track/route.ts",
  );
  const trackingModal = readProjectFile(
    "components/ui/ShipmentTrackingModal.tsx",
  );
  const preOrderTable = readProjectFile("components/florist/PreOrderTable.tsx");

  assert.match(trackRoute, /buildSupplierTrackingTimeline/);
  assert.match(trackingModal, /buildSupplierTrackingTimeline/);
  assert.match(trackingModal, /event\.statusTitle/);
  assert.match(trackingModal, /event\.description/);
  assert.match(trackingModal, /timelineEvents/);
  assert.doesNotMatch(trackingModal, /Booking Biteship/);
  assert.doesNotMatch(trackingModal, /Lunas 100% via Midtrans/);
  assert.match(preOrderTable, /onRefresh\?\.\(\)/);
});

test("Desain tracking default menggunakan TrackingProgressTrack (gaya Customer), bebas simulator AI, dan mendukung handover supplier PAID -> SHIPPED", () => {
  const handoverRoute = readProjectFile(
    "app/api/supplier/shipments/[id]/handover/route.ts",
  );
  const trackingModal = readProjectFile(
    "components/ui/ShipmentTrackingModal.tsx",
  );
  const customerTracking = readProjectFile(
    "app/(customer)/orders/[id]/tracking/page.tsx",
  );
  const floristOrderDetail = readProjectFile(
    "app/florist/orders/[id]/page.tsx",
  );

  assert.match(handoverRoute, /requireAuth\(request,\s*\["SUPPLIER"\]\)/);
  assert.match(handoverRoute, /status:\s*"PAID"/);
  assert.match(handoverRoute, /status:\s*"SHIPPED"/);
  assert.match(handoverRoute, /biteshipOrderId/);
  assert.match(handoverRoute, /safeRevalidatePaths/);
  assert.doesNotMatch(handoverRoute, /DELIVERED/);
  assert.doesNotMatch(handoverRoute, /fulfill/);

  assert.match(trackingModal, /TrackingProgressTrack/);
  assert.match(trackingModal, /ConfirmDialog/);
  assert.match(trackingModal, /confirmSupplierShipmentHandover/);
  assert.doesNotMatch(trackingModal, /Simulasi pengiriman/);
  assert.doesNotMatch(trackingModal, /Simulasikan penjemputan/);
  assert.doesNotMatch(trackingModal, /Status Terkini/);
  assert.doesNotMatch(trackingModal, /0\{idx \+ 1\}/);

  assert.match(customerTracking, /TrackingProgressTrack/);
  assert.match(floristOrderDetail, /TrackingProgressTrack/);
});
