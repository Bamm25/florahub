// Generator HTML label pengiriman (AWB / Resi Cetak) untuk fallback Biteship Sandbox & Pengiriman Manual

export interface ShippingLabelData {
  orderNumber: string;
  orderTypeLabel: string;
  courier: string;
  service?: string | null;
  trackingNumber: string;
  createdAt?: string | Date | null;
  weightGrams?: number | null;
  shippingCost?: number | null;
  sender: {
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  recipient: {
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  items: Array<{
    name: string;
    quantity: string;
  }>;
  notes?: string | null;
}

function escapeHtml(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIdr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDateId(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function renderPrintableShippingLabelHtml(data: ShippingLabelData): string {
  const courierLabel = escapeHtml(data.courier.toUpperCase());
  const serviceLabel = data.service ? escapeHtml(data.service.toUpperCase()) : "REG";
  const trackingNumber = escapeHtml(data.trackingNumber || "RESI-MANUAL");
  const orderNumber = escapeHtml(data.orderNumber);
  const orderTypeLabel = escapeHtml(data.orderTypeLabel);
  const weightKg =
    data.weightGrams && data.weightGrams > 0
      ? `${(data.weightGrams / 1000).toFixed(2)} Kg`
      : "1.00 Kg";

  const itemsRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${escapeHtml(item.name)}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: 700;">${escapeHtml(item.quantity)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Label Pengiriman ${orderNumber} — FloraHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f5f0;
      color: #141c17;
      padding: 24px 16px;
      line-height: 1.5;
    }
    .toolbar {
      max-width: 680px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #142019;
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 16px;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    }
    .btn-print {
      background: #2f6f4e;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-print:hover { background: #265b40; }
    .label-sheet {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #141c17;
      border-radius: 16px;
      overflow: hidden;
    }
    .label-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 2px solid #141c17;
      background: #fafaf7;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #526056;
      font-weight: 700;
    }
    .courier-badge {
      text-align: right;
    }
    .courier-name {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .courier-service {
      display: inline-block;
      margin-top: 2px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #141c17;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .awb-box {
      padding: 20px 24px;
      border-bottom: 2px dashed #141c17;
      text-align: center;
    }
    .awb-caption {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #526056;
    }
    .awb-number {
      margin-top: 6px;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.06em;
    }
    .barcode-bars {
      margin: 12px auto 6px;
      height: 40px;
      max-width: 420px;
      background: repeating-linear-gradient(
        90deg,
        #141c17 0px,
        #141c17 3px,
        transparent 3px,
        transparent 6px,
        #141c17 6px,
        #141c17 7px,
        transparent 7px,
        transparent 11px,
        #141c17 11px,
        #141c17 15px,
        transparent 15px,
        transparent 18px
      );
    }
    .meta-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border-bottom: 1px solid #d1d5db;
      background: #fafaf7;
      font-size: 12px;
    }
    .meta-cell {
      padding: 10px 16px;
      border-right: 1px solid #d1d5db;
    }
    .meta-cell:last-child { border-right: none; }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #526056;
    }
    .meta-val {
      margin-top: 2px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
    }
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 2px solid #141c17;
    }
    .addr-box {
      padding: 18px 20px;
    }
    .addr-box:first-child {
      border-right: 1px solid #d1d5db;
    }
    .addr-role {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #526056;
    }
    .addr-name {
      margin-top: 6px;
      font-size: 15px;
      font-weight: 800;
    }
    .addr-phone {
      margin-top: 2px;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      font-weight: 600;
    }
    .addr-text {
      margin-top: 6px;
      font-size: 12px;
      color: #374151;
    }
    .items-box {
      padding: 18px 24px;
    }
    .items-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #526056;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .notes-box {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f4f5f0;
      font-size: 12px;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none !important; }
      .label-sheet { border-width: 2px; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">Label Resi Pengiriman · ${orderNumber}</span>
    <button type="button" class="btn-print" onclick="window.print()">Cetak Label / Simpan PDF</button>
  </div>

  <main class="label-sheet">
    <header class="label-header">
      <div>
        <div class="brand">FloraHub</div>
        <div class="brand-sub">${orderTypeLabel}</div>
      </div>
      <div class="courier-badge">
        <div class="courier-name">${courierLabel}</div>
        <span class="courier-service">${serviceLabel}</span>
      </div>
    </header>

    <section class="awb-box">
      <div class="awb-caption">Nomor Resi Pengiriman (AWB)</div>
      <div class="barcode-bars" aria-hidden="true"></div>
      <div class="awb-number">${trackingNumber}</div>
    </section>

    <section class="meta-row">
      <div class="meta-cell">
        <div class="meta-label">No. Referensi</div>
        <div class="meta-val">${orderNumber}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Berat &amp; Ongkir</div>
        <div class="meta-val">${escapeHtml(weightKg)} · ${escapeHtml(formatIdr(data.shippingCost))}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Tanggal Cetak</div>
        <div class="meta-val">${escapeHtml(formatDateId(data.createdAt))}</div>
      </div>
    </section>

    <section class="addresses">
      <div class="addr-box">
        <div class="addr-role">Pengirim (Origin)</div>
        <div class="addr-name">${escapeHtml(data.sender.name)}</div>
        ${data.sender.phone ? `<div class="addr-phone">${escapeHtml(data.sender.phone)}</div>` : ""}
        <div class="addr-text">${escapeHtml(data.sender.address || "Mitra Resmi FloraHub")}</div>
      </div>
      <div class="addr-box">
        <div class="addr-role">Penerima (Destination)</div>
        <div class="addr-name">${escapeHtml(data.recipient.name)}</div>
        ${data.recipient.phone ? `<div class="addr-phone">${escapeHtml(data.recipient.phone)}</div>` : ""}
        <div class="addr-text">${escapeHtml(data.recipient.address || "Alamat tujuan terdaftar")}</div>
      </div>
    </section>

    <section class="items-box">
      <div class="items-title">Rincian Muatan Paket (Harap Tangani dengan Hati-Hati — Bunga Segar)</div>
      <table>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      ${
        data.notes
          ? `<div class="notes-box"><strong>Catatan:</strong> ${escapeHtml(data.notes)}</div>`
          : ""
      }
    </section>
  </main>
</body>
</html>`;
}
