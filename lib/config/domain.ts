// Konfigurasi domain dan environment terpusat untuk FloraHub

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
  process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "") ||
  `http://localhost:${process.env.PORT || 3000}`;

export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
  "https://florahub.com";

export const SITE_AUTHOR =
  process.env.NEXT_PUBLIC_SITE_AUTHOR?.trim() || "FloraHub Team";

export const APP_TIMEZONE =
  process.env.APP_TIMEZONE?.trim() || "Asia/Jakarta";

// Konfigurasi Midtrans (Snap & Core API)
export const IS_MIDTRANS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === "true" ||
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

export const MIDTRANS_SNAP_SCRIPT_URL =
  process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL?.trim() ||
  (IS_MIDTRANS_PRODUCTION
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js");

export const MIDTRANS_API_HOST =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "api.midtrans.com"
    : "api.sandbox.midtrans.com";

export const MIDTRANS_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.MIDTRANS_API_TIMEOUT_MS) || 10000,
);

// Konfigurasi Biteship & Pengiriman
export const BITESHIP_BASE_URL = (
  process.env.BITESHIP_BASE_URL?.trim() || "https://api.biteship.com/v1"
).replace(/\/+$/, "");

export const BITESHIP_TIMEOUT_MS = Math.max(
  3000,
  Number(process.env.BITESHIP_TIMEOUT_MS) || 30000,
);

export const SUPPORTED_COURIERS =
  process.env.BITESHIP_COURIERS?.trim() || "jne,jnt,sicepat,anteraja,ninja";

export const SUPPORTED_COURIER_LIST = SUPPORTED_COURIERS.split(",")
  .map((c) => c.trim())
  .filter(Boolean);

export const DEFAULT_PRODUCT_WEIGHT_GRAMS = 500;
export const B2B_STEM_WEIGHT_GRAMS = 100;
export const MIN_B2B_WEIGHT_GRAMS = 1000;

export const FALLBACK_SHIPPING_COST = Math.max(
  0,
  Number(process.env.FALLBACK_SHIPPING_COST) || 15000,
);

export const ALLOW_FALLBACK_SHIPPING =
  process.env.ALLOW_FALLBACK_SHIPPING_RATE !== undefined
    ? process.env.ALLOW_FALLBACK_SHIPPING_RATE === "true"
    : process.env.NODE_ENV !== "production";

export const SHIPMENT_STATUS_RANK: Record<string, number> = {
  PENDING: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 99,
};

export function isValidShippingLabelUrl(
  url: string | null | undefined,
): url is string {
  if (!url || typeof url !== "string") return false;
  if (url.includes("undefined") || /[\r\n\s]/.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Ambang batas stok & parameter Pre-Order B2B
export const PRODUCT_LOW_STOCK_THRESHOLD = 10;
export const RAW_MATERIAL_DEFAULT_MIN_THRESHOLD = 10;
export const SUPPLIER_LOW_STOCK_THRESHOLD = 50;

export const PREORDER_DEPOSIT_RATE =
  Number(process.env.PREORDER_DEPOSIT_RATE) > 0 &&
  Number(process.env.PREORDER_DEPOSIT_RATE) < 1
    ? Number(process.env.PREORDER_DEPOSIT_RATE)
    : 0.5;

export const PREORDER_DEPOSIT_DEADLINE_DAYS = Math.max(
  1,
  Number(process.env.PREORDER_DEPOSIT_DEADLINE_DAYS) || 3,
);

export const PREORDER_REMINDER_WINDOW_HOURS = Math.max(
  1,
  Number(process.env.PREORDER_REMINDER_WINDOW_HOURS) || 24,
);

// Konfigurasi Unggahan Media & Paginasi API
export const MAX_UPLOAD_SIZE_BYTES = Math.max(
  1024,
  Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024,
);

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = DEFAULT_PAGE_SIZE,
  maxLimit = MAX_PAGE_SIZE,
): ParsedPagination {
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = Number.parseInt(
    searchParams.get("limit") || String(defaultLimit),
    10,
  );
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const boundedDefault = Math.min(Math.max(1, defaultLimit), maxLimit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, maxLimit)
      : boundedDefault;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
