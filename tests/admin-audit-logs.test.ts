import assert from "node:assert/strict";
import { Module } from "node:module";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { build } from "esbuild";
import { NextResponse } from "next/server";
import { fetchAdminAuditLogs } from "../lib/api/admin";
import { adminAuditLogQuerySchema } from "../lib/validations/schemas";

type Role = "ADMIN" | "FLORIST" | "SUPPLIER" | "CUSTOMER";

interface MockAuditRow {
  id: string;
  userId: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "PAYMENT" | "REFUND";
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
}

const projectRoot = resolve(import.meta.dirname, "..");

let currentActor: { id: string; role: Role } | null = null;
let queryCount = 0;
let lastWhere: unknown = null;
const writtenAudits: Array<Record<string, unknown>> = [];
let mockAuditRows: MockAuditRow[] = [];

const prismaMock = {
  auditLog: {
    findMany: async ({ where }: { where: unknown }) => {
      queryCount++;
      lastWhere = where;
      return mockAuditRows;
    },
    count: async () => mockAuditRows.length,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      writtenAudits.push(data);
      return data;
    },
  },
  harvestPreOrder: {
    findUnique: async () => null,
  },
  stockTransaction: {
    findUnique: async () => null,
  },
};

const mockModules: Record<string, string> = {
  "@/lib/middleware/requireAuth": `export async function requireAuth(req, allowed) { return globalThis.__adminAuditAuth(allowed); }`,
  "@/lib/prisma": `export default globalThis.__adminAuditPrisma;`,
  "@/lib/server-error-report": `export function reportServerError() {}`,
  "@/lib/supply-chain/fulfill-inventory": `export async function fulfillPreOrderToInventory() { return false; } export async function fulfillSaleToInventory() { return false; }`,
};

const globals = globalThis as typeof globalThis & {
  __adminAuditAuth: (allowed?: Role[]) => Promise<{ userId: string }>;
  __adminAuditPrisma: typeof prismaMock;
};

globals.__adminAuditAuth = async (allowed?: Role[]) => {
  if (!currentActor) {
    throw NextResponse.json({ success: false }, { status: 401 });
  }
  if (allowed && !allowed.includes(currentActor.role)) {
    throw NextResponse.json({ success: false }, { status: 403 });
  }
  return { userId: currentActor.id };
};
globals.__adminAuditPrisma = prismaMock;

async function loadCompiledModule<T>(relativePath: string): Promise<T> {
  const entryPath = resolve(projectRoot, relativePath);
  const output = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    packages: "external",
    plugins: [
      {
        name: "isolated-admin-audit-deps",
        setup(plugin) {
          plugin.onResolve({ filter: /^@\/lib\// }, ({ path }) =>
            path in mockModules
              ? { path, namespace: "admin-audit-test" }
              : { path: resolve(projectRoot, path.replace(/^@\//, "") + ".ts") },
          );
          plugin.onResolve({ filter: /^\.\/prisma$/ }, () => ({
            path: "@/lib/prisma",
            namespace: "admin-audit-test",
          }));
          plugin.onLoad(
            { filter: /.*/, namespace: "admin-audit-test" },
            ({ path }) => ({
              contents: mockModules[path],
              loader: "js",
            }),
          );
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

const auditHelperModule = loadCompiledModule<{
  sanitizeAuditPayload: (value: unknown) => Record<string, unknown> | null;
  createAuditLog: (input: {
    userId?: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "PAYMENT" | "REFUND";
    entity: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) => Promise<void>;
}>("lib/auditLog.ts");

const auditLogsRoute = loadCompiledModule<{
  GET: (request: Request) => Promise<Response>;
}>("app/api/admin/audit-logs/route.ts");

const simulateRoute = loadCompiledModule<{
  POST: (
    request: Request,
    context: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
}>("app/api/supplier/shipments/[id]/simulate-status/route.ts");

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});

function resetFixture() {
  currentActor = { id: "admin_1", role: "ADMIN" };
  queryCount = 0;
  lastWhere = null;
  writtenAudits.length = 0;
  mockAuditRows = [
    {
      id: "aud_1",
      userId: "admin_1",
      action: "UPDATE",
      entity: "User",
      entityId: "usr_target_1",
      oldValue: { isActive: true, email: "secret@user.test" },
      newValue: {
        isActive: false,
        reasonCode: "POLICY_VIOLATION",
        token: "jwt-secret-123",
      },
      ipAddress: "192.168.10.42",
      userAgent: "Mozilla/5.0",
      createdAt: new Date("2026-11-18T05:00:00.000Z"),
      user: {
        id: "admin_1",
        name: "Admin Utama",
        email: "admin.utama@florahub.id",
        role: "ADMIN",
      },
    },
  ];
}

test("Skema Zod audit logs memvalidasi rentang tanggal, enum action, dan paginasi", () => {
  const valid = adminAuditLogQuerySchema.safeParse({
    page: "2",
    limit: "25",
    action: "UPDATE",
    entity: "Coupon",
    from: "2026-11-01T00:00:00.000Z",
    to: "2026-11-30T23:59:59.999Z",
    search: " cpn_1 ",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.page, 2);
    assert.equal(valid.data.search, "cpn_1");
  }

  assert.equal(adminAuditLogQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(adminAuditLogQuerySchema.safeParse({ action: "HACK" }).success, false);
  assert.equal(
    adminAuditLogQuerySchema.safeParse({
      from: "2026-12-01T00:00:00.000Z",
      to: "2026-11-01T00:00:00.000Z",
    }).success,
    false,
  );
});

test("sanitizeAuditPayload dan createAuditLog meredaksi field sensitif dan PII", async () => {
  resetFixture();
  const { sanitizeAuditPayload, createAuditLog } = await auditHelperModule;

  const cleaned = sanitizeAuditPayload({
    isActive: false,
    reasonCode: "USER_REQUEST",
    password: "SuperSecretPassword",
    accessToken: "tok_123",
    paymentUrl: "https://snap.midtrans.com/secret",
    nested: {
      email: "user@example.com",
      phone: "08123456789",
      fullAddress: "Jl. Bunga No. 1",
      code: "PROMO10",
    },
  });

  assert.equal(cleaned?.isActive, false);
  assert.equal(cleaned?.reasonCode, "USER_REQUEST");
  assert.equal(cleaned?.password, "[REDACTED]");
  assert.equal(cleaned?.accessToken, "[REDACTED]");
  assert.equal(cleaned?.paymentUrl, "[REDACTED]");

  const nested = cleaned?.nested as Record<string, unknown>;
  assert.equal(nested.email, "[REDACTED]");
  assert.equal(nested.phone, "[REDACTED]");
  assert.equal(nested.fullAddress, "[REDACTED]");
  assert.equal(nested.code, "PROMO10");

  await createAuditLog({
    userId: "admin_1",
    action: "CREATE",
    entity: "Coupon",
    entityId: "cpn_1",
    newValue: { code: "BUNGA20", token: "should-be-redacted" },
  });

  assert.equal(writtenAudits.length, 1);
  const storedNew = writtenAudits[0].newValue as Record<string, unknown>;
  assert.equal(storedNew.code, "BUNGA20");
  assert.equal(storedNew.token, "[REDACTED]");
});

test("GET /api/admin/audit-logs menolak anonim (401), non-admin (403), dan query invalid (400)", async () => {
  resetFixture();
  const { GET } = await auditLogsRoute;

  currentActor = null;
  assert.equal(
    (await GET(new Request("http://localhost/api/admin/audit-logs"))).status,
    401,
  );

  for (const role of ["CUSTOMER", "FLORIST", "SUPPLIER"] as const) {
    currentActor = { id: "u_1", role };
    assert.equal(
      (await GET(new Request("http://localhost/api/admin/audit-logs"))).status,
      403,
    );
  }

  currentActor = { id: "admin_1", role: "ADMIN" };
  assert.equal(
    (
      await GET(
        new Request(
          "http://localhost/api/admin/audit-logs?from=2026-12-01T00:00:00.000Z&to=2026-11-01T00:00:00.000Z",
        ),
      )
    ).status,
    400,
  );
  assert.equal(queryCount, 0);
});

test("GET /api/admin/audit-logs menyamarkan email aktor, IP, dan payload sensitif saat dibaca", async () => {
  resetFixture();
  const { GET } = await auditLogsRoute;

  const res = await GET(
    new Request(
      "http://localhost/api/admin/audit-logs?action=UPDATE&entity=User&search=usr_target_1",
    ),
  );
  assert.equal(res.status, 200);

  const body = (await res.json()) as {
    success: boolean;
    data: {
      logs: Array<{
        maskedIpAddress: string | null;
        oldValue: Record<string, unknown> | null;
        newValue: Record<string, unknown> | null;
        actor: { name: string; maskedEmail: string } & Record<string, unknown>;
      }>;
    };
  };

  assert.equal(body.success, true);
  assert.equal(body.data.logs.length, 1);
  const first = body.data.logs[0];
  assert.equal(first.actor.maskedEmail, "ad***@florahub.id");
  assert.equal("email" in first.actor, false);
  assert.equal(first.maskedIpAddress, "192.168.*.*");
  assert.equal(first.oldValue?.email, "[REDACTED]");
  assert.equal(first.newValue?.token, "[REDACTED]");
  assert.equal(first.newValue?.reasonCode, "POLICY_VIOLATION");
  assert.ok(lastWhere);
});

test("Endpoint simulasi pengiriman terblokir di produksi (404) dan menolak role ADMIN (403)", async () => {
  resetFixture();
  const { POST } = await simulateRoute;
  const mutableEnv = process.env as Record<string, string | undefined>;
  const prevNodeEnv = mutableEnv.NODE_ENV;
  const prevSimFlag = mutableEnv.ENABLE_BITESHIP_SIMULATOR;

  try {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.ENABLE_BITESHIP_SIMULATOR = "true";
    currentActor = { id: "sup_1", role: "SUPPLIER" };

    const prodRes = await POST(
      new Request("http://localhost/api/supplier/shipments/shp_1/simulate-status", {
        method: "POST",
        body: JSON.stringify({ status: "DELIVERED" }),
      }),
      { params: Promise.resolve({ id: "shp_1" }) },
    );
    assert.equal(prodRes.status, 404);

    mutableEnv.NODE_ENV = "development";
    mutableEnv.ENABLE_BITESHIP_SIMULATOR = "true";
    currentActor = { id: "admin_1", role: "ADMIN" };

    const adminRes = await POST(
      new Request("http://localhost/api/supplier/shipments/shp_1/simulate-status", {
        method: "POST",
        body: JSON.stringify({ status: "DELIVERED" }),
      }),
      { params: Promise.resolve({ id: "shp_1" }) },
    );
    assert.equal(adminRes.status, 403);
  } finally {
    mutableEnv.NODE_ENV = prevNodeEnv;
    mutableEnv.ENABLE_BITESHIP_SIMULATOR = prevSimFlag;
  }
});

test("Client API fetchAdminAuditLogs membentuk filter lengkap dan memvalidasi respons", async () => {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/admin/audit-logs");
    assert.equal(url.searchParams.get("action"), "UPDATE");
    assert.equal(url.searchParams.get("entity"), "Coupon");
    assert.equal(url.searchParams.get("search"), "HEMAT");
    assert.equal(init?.cache, "no-store");
    return Response.json({
      success: true,
      data: {
        logs: [],
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

  const pageData = await fetchAdminAuditLogs({
    action: "UPDATE",
    entity: "Coupon",
    search: " HEMAT ",
  });
  assert.equal(pageData.logs.length, 0);

  globalThis.fetch = async () =>
    Response.json({ success: false, message: "Forbidden" }, { status: 403 });
  await assert.rejects(fetchAdminAuditLogs(), /Forbidden/);
});
