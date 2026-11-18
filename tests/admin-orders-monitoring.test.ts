import assert from "node:assert/strict";
import { Module } from "node:module";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { build } from "esbuild";
import { NextResponse } from "next/server";
import {
  fetchAdminOrders,
  fetchAdminSupplyOrders,
} from "../lib/api/admin";
import {
  adminOrderQuerySchema,
  adminSupplyQuerySchema,
} from "../lib/validations/schemas";

type Role = "ADMIN" | "FLORIST" | "SUPPLIER" | "CUSTOMER";

interface MockOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  isPreorder: boolean;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  createdAt: Date;
  user: { id: string; name: string; email: string; phone: string | null };
  address: { city: string; province: string } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: {
      name: string;
      florist: {
        id: string;
        name: string;
        floristProfile: { shopName: string } | null;
      };
    };
  }>;
  payment: {
    method: string;
    status: string;
    amount: number;
    paidAt: Date | null;
  } | null;
  shipment: {
    courier: string;
    service: string | null;
    status: string;
    trackingNumber: string | null;
    biteshipOrderId: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  } | null;
}

interface MockDirectRow {
  id: string;
  status: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  shippingCost: number | null;
  paymentProof: string | null;
  courier: string | null;
  service: string | null;
  trackingNumber: string | null;
  biteshipOrderId: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  stock: {
    name: string;
    variety: string | null;
    unit: string;
    supplier: { id: string; name: string; email: string };
  };
  florist: {
    id: string;
    name: string;
    email: string;
    floristProfile: { shopName: string } | null;
  };
}

interface MockPreOrderRow {
  id: string;
  status: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  shippingCost: number | null;
  depositAmount: number | null;
  depositPaidAt: Date | null;
  depositProof: string | null;
  remainingAmount: number | null;
  finalPaidAt: Date | null;
  finalProof: string | null;
  courier: string | null;
  service: string | null;
  trackingNumber: string | null;
  biteshipOrderId: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  announcement: {
    flowerName: string;
    variety: string | null;
    harvestDate: Date;
    supplier: { id: string; name: string; email: string };
  };
  florist: {
    id: string;
    name: string;
    email: string;
    floristProfile: { shopName: string } | null;
  };
}

const projectRoot = resolve(import.meta.dirname, "..");
const ordersRoutePath = resolve(projectRoot, "app/api/admin/orders/route.ts");
const supplyRoutePath = resolve(projectRoot, "app/api/admin/supply/route.ts");

let currentActor: { id: string; role: Role } | null = null;
let dbQueryCount = 0;
let lastOrderWhere: unknown = null;
let mockOrderRows: MockOrderRow[] = [];
let mockDirectRows: MockDirectRow[] = [];
let mockPreOrderRows: MockPreOrderRow[] = [];

const prismaMock = {
  order: {
    findMany: async ({ where }: { where: unknown }) => {
      dbQueryCount++;
      lastOrderWhere = where;
      return mockOrderRows;
    },
    count: async () => mockOrderRows.length,
  },
  stockTransaction: {
    findMany: async () => {
      dbQueryCount++;
      return mockDirectRows;
    },
    count: async () => mockDirectRows.length,
  },
  harvestPreOrder: {
    findMany: async () => {
      dbQueryCount++;
      return mockPreOrderRows;
    },
    count: async () => mockPreOrderRows.length,
  },
};

const mockModules: Record<string, string> = {
  "@/lib/middleware/requireAuth": `export async function requireAuth(req, allowed) { return globalThis.__adminMonitoringAuth(allowed); }`,
  "@/lib/prisma": `export default globalThis.__adminMonitoringPrisma;`,
  "@/lib/server-error-report": `export function reportServerError() {}`,
};

const globals = globalThis as typeof globalThis & {
  __adminMonitoringAuth: (allowed?: Role[]) => Promise<{ userId: string }>;
  __adminMonitoringPrisma: typeof prismaMock;
};

globals.__adminMonitoringAuth = async (allowed?: Role[]) => {
  if (!currentActor) {
    throw NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (allowed && !allowed.includes(currentActor.role)) {
    throw NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return { userId: currentActor.id };
};
globals.__adminMonitoringPrisma = prismaMock;

async function loadCompiledRoute<T>(entryPath: string): Promise<T> {
  const output = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    packages: "external",
    plugins: [
      {
        name: "isolated-admin-monitoring-deps",
        setup(plugin) {
          plugin.onResolve({ filter: /^@\/lib\// }, ({ path }) =>
            path in mockModules
              ? { path, namespace: "admin-monitoring-test" }
              : { path: resolve(projectRoot, path.replace(/^@\//, "") + ".ts") },
          );
          plugin.onLoad({ filter: /.*/, namespace: "admin-monitoring-test" }, ({ path }) => ({
            contents: mockModules[path],
            loader: "js",
          }));
        },
      },
    ],
  });

  const compiled = new Module(entryPath, module);
  compiled.filename = entryPath;
  compiled.paths = (
    Module as typeof Module & { _nodeModulePaths: (p: string) => string[] }
  )._nodeModulePaths(projectRoot);
  (compiled as Module & { _compile: (src: string, file: string) => void })._compile(
    output.outputFiles[0].text,
    entryPath,
  );
  return compiled.exports as T;
}

const ordersRoutePromise = loadCompiledRoute<{
  GET: (request: Request) => Promise<Response>;
}>(ordersRoutePath);

const supplyRoutePromise = loadCompiledRoute<{
  GET: (request: Request) => Promise<Response>;
}>(supplyRoutePath);

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});

function resetFixture() {
  currentActor = { id: "admin_1", role: "ADMIN" };
  dbQueryCount = 0;
  lastOrderWhere = null;
  mockOrderRows = [
    {
      id: "ord_1",
      orderNumber: "ORD-2026-001",
      status: "PENDING",
      isPreorder: false,
      subtotal: 250000,
      shippingCost: 20000,
      discount: 0,
      totalAmount: 270000,
      createdAt: new Date("2026-11-18T03:00:00.000Z"),
      user: {
        id: "cust_1",
        name: "Siti Rahma",
        email: "siti.rahma@gmail.com",
        phone: "081234567890",
      },
      address: { city: "Bandung", province: "Jawa Barat" },
      items: [
        {
          id: "item_1",
          productId: "prod_1",
          quantity: 1,
          price: 250000,
          subtotal: 250000,
          product: {
            name: "Buket Mawar",
            florist: {
              id: "fl_1",
              name: "Pemilik Florist",
              floristProfile: { shopName: "Atelier Flora Bandung" },
            },
          },
        },
      ],
      payment: {
        method: "midtrans_snap",
        status: "PAID",
        amount: 270000,
        paidAt: new Date("2026-11-18T03:05:00.000Z"),
      },
      shipment: null,
    },
  ];

  mockDirectRows = [
    {
      id: "stx_1",
      status: "SHIPPED",
      quantity: 50,
      pricePerUnit: 5000,
      totalPrice: 250000,
      shippingCost: 15000,
      paymentProof: "https://r2.example.test/proof.jpg",
      courier: "jne",
      service: "REG",
      trackingNumber: null,
      biteshipOrderId: null,
      shippedAt: new Date("2026-11-18T04:00:00.000Z"),
      deliveredAt: null,
      createdAt: new Date("2026-11-18T01:00:00.000Z"),
      stock: {
        name: "Mawar Merah",
        variety: "Red Naomi",
        unit: "tangkai",
        supplier: {
          id: "sup_1",
          name: "Kebun Lembang",
          email: "kebun.lembang@example.com",
        },
      },
      florist: {
        id: "fl_1",
        name: "Budi",
        email: "atelier.bandung@example.com",
        floristProfile: { shopName: "Atelier Flora Bandung" },
      },
    },
  ];

  mockPreOrderRows = [
    {
      id: "po_1",
      status: "DEPOSIT_PAID",
      quantity: 200,
      pricePerUnit: 4000,
      totalPrice: 800000,
      shippingCost: 40000,
      depositAmount: 240000,
      depositPaidAt: new Date("2026-11-17T08:00:00.000Z"),
      depositProof: "MIDTRANS:trx_dp_01",
      remainingAmount: 560000,
      finalPaidAt: null,
      finalProof: null,
      courier: null,
      service: null,
      trackingNumber: null,
      biteshipOrderId: null,
      shippedAt: null,
      deliveredAt: null,
      createdAt: new Date("2026-11-17T07:00:00.000Z"),
      announcement: {
        flowerName: "Krisan Putih",
        variety: "Asteria",
        harvestDate: new Date("2026-11-25T00:00:00.000Z"),
        supplier: {
          id: "sup_2",
          name: "Tani Cihideung",
          email: "tani.cihideung@example.com",
        },
      },
      florist: {
        id: "fl_1",
        name: "Budi",
        email: "atelier.bandung@example.com",
        floristProfile: { shopName: "Atelier Flora Bandung" },
      },
    },
  ];
}

test("Skema Zod orders & supply memvalidasi batas paginasi dan enum status secara ketat", () => {
  const validOrder = adminOrderQuerySchema.safeParse({
    page: "2",
    limit: "25",
    status: "SHIPPED",
    isPreorder: "true",
    search: "  ORD-001 ",
  });
  assert.equal(validOrder.success, true);
  if (validOrder.success) {
    assert.equal(validOrder.data.page, 2);
    assert.equal(validOrder.data.isPreorder, true);
    assert.equal(validOrder.data.search, "ORD-001");
  }

  assert.equal(adminOrderQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(adminOrderQuerySchema.safeParse({ limit: "150" }).success, false);
  assert.equal(adminOrderQuerySchema.safeParse({ status: "INVALID" }).success, false);

  assert.equal(
    adminSupplyQuerySchema.safeParse({ type: "DIRECT", status: "DEPOSIT_PAID" }).success,
    false,
  );
  assert.equal(
    adminSupplyQuerySchema.safeParse({ type: "PREORDER", status: "DEPOSIT_PAID" }).success,
    true,
  );
});

test("Endpoint /api/admin/orders dan /api/admin/supply menolak anonim (401) serta non-admin (403)", async () => {
  resetFixture();
  const { GET: getOrders } = await ordersRoutePromise;
  const { GET: getSupply } = await supplyRoutePromise;

  currentActor = null;
  assert.equal((await getOrders(new Request("http://localhost/api/admin/orders"))).status, 401);
  assert.equal((await getSupply(new Request("http://localhost/api/admin/supply"))).status, 401);

  for (const role of ["CUSTOMER", "FLORIST", "SUPPLIER"] as const) {
    currentActor = { id: "u_non_admin", role };
    assert.equal((await getOrders(new Request("http://localhost/api/admin/orders"))).status, 403);
    assert.equal((await getSupply(new Request("http://localhost/api/admin/supply"))).status, 403);
  }

  assert.equal(dbQueryCount, 0);
});

test("Endpoint /api/admin/orders menolak query tidak valid (400), menyamarkan PII, dan mendeteksi anomali", async () => {
  resetFixture();
  const { GET } = await ordersRoutePromise;

  const badRes = await GET(new Request("http://localhost/api/admin/orders?page=-1&status=FOO"));
  assert.equal(badRes.status, 400);
  assert.equal(dbQueryCount, 0);

  const okRes = await GET(new Request("http://localhost/api/admin/orders?status=PENDING&search=ORD-2026"));
  assert.equal(okRes.status, 200);
  const body = (await okRes.json()) as {
    success: boolean;
    data: {
      orders: Array<{
        customer: Record<string, unknown>;
        reconciliation: { hasAnomaly: boolean; anomalyNote: string | null };
      }>;
    };
  };
  assert.equal(body.success, true);
  assert.equal(body.data.orders.length, 1);

  const firstOrder = body.data.orders[0];
  assert.equal(firstOrder.customer.maskedEmail, "si***@gmail.com");
  assert.equal(firstOrder.customer.maskedPhone, "0812****7890");
  assert.equal("email" in firstOrder.customer, false);
  assert.equal("phone" in firstOrder.customer, false);
  assert.equal(firstOrder.reconciliation.hasAnomaly, true);
  assert.match(firstOrder.reconciliation.anomalyNote || "", /PAID.*PENDING/);
  assert.ok(lastOrderWhere);
});

test("Endpoint /api/admin/supply mendukung saluran DIRECT & PREORDER dengan masking PII dan audit anomali", async () => {
  resetFixture();
  const { GET } = await supplyRoutePromise;

  const badRes = await GET(new Request("http://localhost/api/admin/supply?type=DIRECT&status=DEPOSIT_PAID"));
  assert.equal(badRes.status, 400);
  assert.equal(dbQueryCount, 0);

  const directRes = await GET(new Request("http://localhost/api/admin/supply?type=DIRECT"));
  assert.equal(directRes.status, 200);
  const directBody = (await directRes.json()) as {
    success: boolean;
    data: {
      type: string;
      items: Array<{
        supplier: Record<string, unknown>;
        paymentSummary: { hasPaymentProof: boolean } & Record<string, unknown>;
        reconciliation: { hasAnomaly: boolean; anomalyNote: string | null };
      }>;
    };
  };
  assert.equal(directBody.data.type, "DIRECT");
  assert.equal(directBody.data.items[0].supplier.maskedEmail, "ke***@example.com");
  assert.equal("email" in directBody.data.items[0].supplier, false);
  assert.equal(directBody.data.items[0].paymentSummary.hasPaymentProof, true);
  assert.equal("paymentProof" in directBody.data.items[0].paymentSummary, false);
  assert.equal(directBody.data.items[0].reconciliation.hasAnomaly, true);

  const preorderRes = await GET(new Request("http://localhost/api/admin/supply?type=PREORDER"));
  assert.equal(preorderRes.status, 200);
  const preorderBody = (await preorderRes.json()) as {
    success: boolean;
    data: {
      type: string;
      items: Array<{
        paymentSummary: { stage: string; depositAmount: number | null };
        reconciliation: { hasAnomaly: boolean };
      }>;
    };
  };
  assert.equal(preorderBody.data.type, "PREORDER");
  assert.equal(preorderBody.data.items[0].paymentSummary.stage, "DEPOSIT_PAID");
  assert.equal(preorderBody.data.items[0].paymentSummary.depositAmount, 240000);
  assert.equal(preorderBody.data.items[0].reconciliation.hasAnomaly, false);
});

test("Client API fetchAdminOrders dan fetchAdminSupplyOrders menyusun parameter query dan menolak respons gagal", async () => {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/admin/orders");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("status"), "PAID");
    assert.equal(url.searchParams.get("search"), "ORD-12");
    assert.equal(init?.cache, "no-store");
    return Response.json({
      success: true,
      data: {
        orders: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        },
      },
    });
  };
  const orderData = await fetchAdminOrders({
    page: 2,
    status: "PAID",
    search: " ORD-12 ",
  });
  assert.equal(orderData.pagination.page, 2);

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/admin/supply");
    assert.equal(url.searchParams.get("type"), "PREORDER");
    assert.equal(url.searchParams.get("status"), "DEPOSIT_PAID");
    assert.equal(init?.cache, "no-store");
    return Response.json({
      success: true,
      data: {
        type: "PREORDER",
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
    });
  };
  const supplyData = await fetchAdminSupplyOrders({
    type: "PREORDER",
    status: "DEPOSIT_PAID",
  });
  assert.equal(supplyData.type, "PREORDER");

  globalThis.fetch = async () =>
    Response.json({ success: false, message: "Forbidden" }, { status: 403 });
  await assert.rejects(fetchAdminSupplyOrders({ type: "DIRECT" }), /Forbidden/);
});
