import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Module, { createRequire } from "node:module";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../proxy";
import { encodeRfc7519Jwt } from "../lib/jwt-rfc7519";
import { detectImageMime } from "../lib/upload-security";
import {
  CouponValidationError,
  validateAndCalculateCoupon,
} from "../lib/coupons";

const ROOT = process.cwd();
const req = createRequire(import.meta.url);

function loadUploadRouteWithMocks(mocks: {
  session?: unknown;
  bypassRequireAuthUser?: { userId: string; userRole: string };
}) {
  const originalLoad = (
    Module as unknown as {
      _load: (
        request: string,
        parent: NodeModule | null,
        isMain: boolean,
      ) => unknown;
    }
  )._load;

  const uploadRouteResolved = req.resolve("../app/api/upload/route");
  const requireAuthResolved = req.resolve("../lib/middleware/requireAuth");
  delete req.cache[uploadRouteResolved];
  delete req.cache[requireAuthResolved];

  (
    Module as unknown as {
      _load: (
        request: string,
        parent: NodeModule | null,
        isMain: boolean,
      ) => unknown;
    }
  )._load = function patchedLoad(
    request: string,
    parent: NodeModule | null,
    isMain: boolean,
  ) {
    if (request === "next-auth") {
      return {
        default: () => ({}),
        getServerSession: async () => mocks.session ?? null,
      };
    }
    if (
      mocks.bypassRequireAuthUser &&
      (request === "@/lib/middleware/requireAuth" ||
        request.endsWith("/middleware/requireAuth"))
    ) {
      return {
        requireAuth: async () => ({
          userId: mocks.bypassRequireAuthUser!.userId,
          userRole: mocks.bypassRequireAuthUser!.userRole,
          session: { user: {}, expires: new Date().toISOString() },
        }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return req("../app/api/upload/route") as {
      POST: (request: NextRequest) => Promise<NextResponse>;
    };
  } finally {
    (
      Module as unknown as {
        _load: (
          request: string,
          parent: NodeModule | null,
          isMain: boolean,
        ) => unknown;
      }
    )._load = originalLoad;
  }
}

test("proxy.ts redirects unauthenticated requests to /auth/login with callbackUrl", async () => {
  const prevSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "audit-test-secret-0123456789abcdef";

  try {
    const request = new NextRequest(
      "http://localhost:3000/admin/dashboard?tab=users",
    );
    const response = await proxy(request);

    assert.equal(response.status, 307);
    const location = response.headers.get("location");
    assert.ok(location);
    const redirectUrl = new URL(location);
    assert.equal(redirectUrl.pathname, "/auth/login");
    assert.equal(
      redirectUrl.searchParams.get("callbackUrl"),
      "/admin/dashboard?tab=users",
    );

    const badCookieReq = new NextRequest("http://localhost:3000/checkout", {
      headers: {
        cookie: "next-auth.session-token=invalid.tampered.jwt",
      },
    });
    const badCookieRes = await proxy(badCookieReq);
    assert.equal(badCookieRes.status, 307);
    const badRedirect = new URL(badCookieRes.headers.get("location")!);
    assert.equal(badRedirect.pathname, "/auth/login");
    assert.equal(badRedirect.searchParams.get("callbackUrl"), "/checkout");
  } finally {
    if (prevSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = prevSecret;
    }
  }
});

test("proxy.ts enforces RBAC isolation across /admin, /florist, and /supplier", async () => {
  const prevSecret = process.env.NEXTAUTH_SECRET;
  const secret = "audit-test-secret-0123456789abcdef";
  process.env.NEXTAUTH_SECRET = secret;

  try {
    const makeCookieReq = async (
      path: string,
      role: "ADMIN" | "FLORIST" | "SUPPLIER" | "CUSTOMER",
    ) => {
      const token = await encodeRfc7519Jwt({
        secret,
        token: {
          sub: `user-${role.toLowerCase()}`,
          id: `user-${role.toLowerCase()}`,
          role,
          email: `${role.toLowerCase()}@florahub.test`,
          name: `Test ${role}`,
        },
      });
      return new NextRequest(`http://localhost:3000${path}`, {
        headers: {
          cookie: `next-auth.session-token=${token}`,
        },
      });
    };

    // CUSTOMER ditolak dari portal admin, florist, dan supplier
    for (const portalPath of [
      "/admin/users",
      "/florist/products",
      "/supplier/stocks",
    ]) {
      const res = await proxy(await makeCookieReq(portalPath, "CUSTOMER"));
      assert.equal(res.status, 307);
      assert.equal(new URL(res.headers.get("location")!).pathname, "/");
    }

    // Lintas role portal ditolak
    const floristToSupplier = await proxy(
      await makeCookieReq("/supplier/stocks", "FLORIST"),
    );
    assert.equal(floristToSupplier.status, 307);
    assert.equal(
      new URL(floristToSupplier.headers.get("location")!).pathname,
      "/",
    );

    const supplierToAdmin = await proxy(
      await makeCookieReq("/admin/orders", "SUPPLIER"),
    );
    assert.equal(supplierToAdmin.status, 307);
    assert.equal(
      new URL(supplierToAdmin.headers.get("location")!).pathname,
      "/",
    );

    // Role sesuai portal diizinkan lanjut
    const adminAllowed = await proxy(
      await makeCookieReq("/admin/users", "ADMIN"),
    );
    assert.equal(adminAllowed.headers.get("x-middleware-next"), "1");

    const floristAllowed = await proxy(
      await makeCookieReq("/florist/orders", "FLORIST"),
    );
    assert.equal(floristAllowed.headers.get("x-middleware-next"), "1");

    const supplierAllowed = await proxy(
      await makeCookieReq("/supplier/stocks", "SUPPLIER"),
    );
    assert.equal(supplierAllowed.headers.get("x-middleware-next"), "1");
  } finally {
    if (prevSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = prevSecret;
    }
  }
});

test("detectImageMime validates magic bytes and rejects SVG/HTML payloads", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const gif = Buffer.from("GIF89a\x01\x00\x01\x00", "ascii");
  const webp = Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP", "ascii"),
  ]);
  const svgSpoof = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  );
  const htmlSpoof = Buffer.from("<html><body>xss</body></html>");

  assert.equal(detectImageMime(png), "image/png");
  assert.equal(detectImageMime(jpeg), "image/jpeg");
  assert.equal(detectImageMime(gif), "image/gif");
  assert.equal(detectImageMime(webp), "image/webp");
  assert.equal(detectImageMime(svgSpoof), null);
  assert.equal(detectImageMime(htmlSpoof), null);
  assert.equal(detectImageMime(Buffer.from([0xff])), null);
});

test("/api/upload enforces 401 when unauthenticated and 400 on spoofed SVG uploads", async () => {
  const unauthRoute = loadUploadRouteWithMocks({ session: null });
  const unauthReq = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
  });
  const unauthRes = await unauthRoute.POST(unauthReq);
  assert.equal(unauthRes.status, 401);

  const authRoute = loadUploadRouteWithMocks({
    bypassRequireAuthUser: {
      userId: "florist-upload-test-user",
      userRole: "FLORIST",
    },
  });

  // Spoofed SVG disguised with image/png MIME type
  const formData = new FormData();
  const spoofedFile = new File(
    ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    "fake.png",
    { type: "image/png" },
  );
  formData.append("file", spoofedFile);

  const spoofReq = new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });
  const spoofRes = await authRoute.POST(spoofReq);
  assert.equal(spoofRes.status, 400);
  const spoofBody = (await spoofRes.json()) as { error?: string };
  assert.match(spoofBody.error ?? "", /signature gambar yang valid/i);

  // Explicit image/svg+xml MIME rejection
  const svgMimeForm = new FormData();
  svgMimeForm.append(
    "file",
    new File(["<svg></svg>"], "vector.svg", { type: "image/svg+xml" }),
  );
  const svgMimeRes = await authRoute.POST(
    new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: svgMimeForm,
    }),
  );
  assert.equal(svgMimeRes.status, 400);
});

test("sensitive routes do not expose User/Florist models via user: true or florist: true", () => {
  const inspectedFiles = [
    "app/api/florist/shipments/[id]/track/route.ts",
    "lib/supply-chain/preorder-midtrans-routes.ts",
    "app/api/florist/purchase/[id]/confirm-midtrans/route.ts",
  ];

  for (const relPath of inspectedFiles) {
    const absPath = join(ROOT, relPath);
    assert.ok(existsSync(absPath), `Missing expected file: ${relPath}`);
    const content = readFileSync(absPath, "utf-8");
    assert.equal(
      /\buser\s*:\s*true\b/.test(content),
      false,
      `${relPath} masih mengandung unsafe include user: true`,
    );
    assert.equal(
      /\bflorist\s*:\s*true\b/.test(content),
      false,
      `${relPath} masih mengandung unsafe include florist: true`,
    );
  }
});

test("validateAndCalculateCoupon enforces applicableFor targets and FREE_SHIPPING rules", async () => {
  const baseValidFrom = new Date(Date.now() - 60_000);
  const baseValidUntil = new Date(Date.now() + 86_400_000);

  const makeMockDb = (couponOverride: Record<string, unknown>) =>
    ({
      coupon: {
        findUnique: async () => ({
          id: "cpn-1",
          code: "HEMAT10",
          name: "Diskon Spesifik",
          description: "Kupon audit",
          type: "PERCENTAGE",
          value: 10,
          minPurchase: 50_000,
          maxDiscount: 30_000,
          usageLimit: 100,
          usageCount: 1,
          usagePerUser: 2,
          validFrom: baseValidFrom,
          validUntil: baseValidUntil,
          isActive: true,
          applicableFor: ["prod-special", "cat-bouquet"],
          ...couponOverride,
        }),
      },
      couponUsage: {
        count: async () => 0,
      },
    }) as unknown as Parameters<typeof validateAndCalculateCoupon>[0];

  // Ditolak jika keranjang tidak mengandung productId / categoryId yang cocok
  await assert.rejects(
    validateAndCalculateCoupon(makeMockDb({}), {
      code: "hemat10",
      userId: "cust-1",
      subtotal: 120_000,
      shippingCost: 20_000,
      productIds: ["prod-other"],
      categoryIds: ["cat-other"],
    }),
    (err: unknown) =>
      err instanceof CouponValidationError && err.status === 400,
  );

  // Diterima jika kategori cocok
  const matched = await validateAndCalculateCoupon(makeMockDb({}), {
    code: "hemat10",
    userId: "cust-1",
    subtotal: 120_000,
    shippingCost: 20_000,
    productIds: ["prod-other"],
    categoryIds: ["cat-bouquet"],
  });
  assert.equal(matched.discountAmount, 12_000);

  // FREE_SHIPPING: maxDiscount null & value 0 -> penuh sebesar ongkir
  const freeFull = await validateAndCalculateCoupon(
    makeMockDb({
      code: "ONGKIRGRATIS",
      type: "FREE_SHIPPING",
      value: 0,
      maxDiscount: null,
      applicableFor: [],
    }),
    {
      code: "ONGKIRGRATIS",
      userId: "cust-1",
      subtotal: 150_000,
      shippingCost: 24_000,
    },
  );
  assert.equal(freeFull.discountAmount, 24_000);

  // FREE_SHIPPING: dibatasi maxDiscount bila lebih kecil dari ongkir
  const freeCapped = await validateAndCalculateCoupon(
    makeMockDb({
      code: "ONGKIR15",
      type: "FREE_SHIPPING",
      value: 0,
      maxDiscount: 15_000,
      applicableFor: [],
    }),
    {
      code: "ONGKIR15",
      userId: "cust-1",
      subtotal: 150_000,
      shippingCost: 24_000,
    },
  );
  assert.equal(freeCapped.discountAmount, 15_000);
});

test("dead files removed during audit no longer exist and app/layout.tsx uses MIDTRANS_SNAP_SCRIPT_URL", () => {
  const deletedFiles = [
    "lib/supplier-pickup-address.ts",
    "lib/stores.ts",
    "types/midtrans-client.d.ts",
    "prisma/seed.backup.ts",
    "prisma/check-tables.ts",
    "prisma/seed-more.ts",
    "prisma/seed-critical.ts",
    "prisma/seed-reviews.ts",
    "hooks/useFormValidation.ts",
    "components/ui/ActionButtons.tsx",
    "components/ui/StatCard.tsx",
    "components/ui/avatar.tsx",
    "app/api/customer/cart/route.ts",
    "app/api/customer/cart/items/route.ts",
    "app/api/customer/cart/items/[id]/route.ts",
    "app/api/customer/reviews/[id]/route.ts",
    "app/api/products/[id]/route.ts",
    "app/api/florist/inventory/[id]/route.ts",
    "app/api/florist/purchase/[id]/pay/route.ts",
    "app/api/florist/purchase/[id]/route.ts",
    "app/api/supplier/sales/[id]/route.ts",
    "app/api/florist/preorders/[id]/deposit/route.ts",
    "app/api/florist/preorders/[id]/final-payment/route.ts",
    "app/api/supplier/preorders/[id]/verify-deposit/route.ts",
    "app/api/supplier/preorders/[id]/verify-final/route.ts",
    "app/api/supplier/preorders/[id]/ship/route.ts",
  ];

  for (const relPath of deletedFiles) {
    assert.equal(
      existsSync(join(ROOT, relPath)),
      false,
      `Dead file masih ada: ${relPath}`,
    );
  }

  const layoutSource = readFileSync(join(ROOT, "app/layout.tsx"), "utf-8");
  assert.ok(layoutSource.includes("MIDTRANS_SNAP_SCRIPT_URL"));
  assert.ok(layoutSource.includes("PUBLIC_SITE_URL"));
  assert.ok(layoutSource.includes("SITE_AUTHOR"));
  assert.equal(layoutSource.includes("Bambang Wijanarko"), false);
  assert.equal(layoutSource.includes("app.sandbox.midtrans.com"), false);
});
