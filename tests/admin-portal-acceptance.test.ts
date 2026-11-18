import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Module } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import { NextResponse } from "next/server";

type Role = "ADMIN" | "FLORIST" | "SUPPLIER" | "CUSTOMER";

const projectRoot = resolve(import.meta.dirname, "..");
const readRepoFile = (relPath: string) =>
  readFileSync(resolve(projectRoot, relPath), "utf8");

let currentActor: { id: string; role: Role } | null = null;
let statsQueryCount = 0;

const prismaMock = {
  user: {
    count: async ({ where }: { where?: { isActive?: boolean; role?: string } } = {}) => {
      statsQueryCount++;
      if (where?.isActive) return 8;
      if (where?.role === "ADMIN") return 1;
      if (where?.role === "SUPPLIER") return 2;
      if (where?.role === "FLORIST") return 3;
      if (where?.role === "CUSTOMER") return 4;
      return 10;
    },
  },
  product: {
    count: async ({ where }: { where?: { isActive?: boolean } } = {}) => {
      statsQueryCount++;
      return where?.isActive ? 12 : 15;
    },
  },
  flowerCategory: {
    count: async () => {
      statsQueryCount++;
      return 5;
    },
  },
  order: {
    count: async ({ where }: { where?: { status?: string } } = {}) => {
      statsQueryCount++;
      if (where?.status === "PENDING") return 2;
      if (where?.status === "DELIVERED") return 6;
      if (where?.status === "CANCELLED") return 1;
      return 12;
    },
    aggregate: async ({
      where,
    }: {
      where?: { status?: { in?: string[] } };
    }) => {
      statsQueryCount++;
      assert.deepEqual(where?.status?.in, [
        "PAID",
        "PROCESSING",
        "READY_TO_SHIP",
        "SHIPPED",
        "DELIVERED",
      ]);
      return { _sum: { totalAmount: 450000 } };
    },
  },
  stockTransaction: {
    count: async ({ where }: { where?: { status?: string } } = {}) => {
      statsQueryCount++;
      return where?.status === "PENDING" ? 1 : 4;
    },
    aggregate: async () => {
      statsQueryCount++;
      return { _sum: { totalPrice: 320000 } };
    },
  },
  harvestPreOrder: {
    count: async ({ where }: { where?: { status?: string } } = {}) => {
      statsQueryCount++;
      if (where?.status === "PENDING") return 1;
      if (where?.status === "CONFIRMED") return 2;
      return 6;
    },
    aggregate: async () => {
      statsQueryCount++;
      return { _sum: { totalPrice: 800000 } };
    },
  },
};

const mockModules: Record<string, string> = {
  "@/lib/middleware/requireAuth": `export async function requireAuth(req, allowed) { return globalThis.__adminAcceptAuth(allowed); }`,
  "@/lib/prisma": `export default globalThis.__adminAcceptPrisma;`,
  "@/lib/server-error-report": `export function reportServerError() {}`,
};

const globals = globalThis as typeof globalThis & {
  __adminAcceptAuth: (allowed?: Role[]) => Promise<{ userId: string }>;
  __adminAcceptPrisma: typeof prismaMock;
};

globals.__adminAcceptAuth = async (allowed?: Role[]) => {
  if (!currentActor) {
    throw NextResponse.json({ success: false }, { status: 401 });
  }
  if (allowed && !allowed.includes(currentActor.role)) {
    throw NextResponse.json({ success: false }, { status: 403 });
  }
  return { userId: currentActor.id };
};
globals.__adminAcceptPrisma = prismaMock;

const statsRoutePromise = build({
  entryPoints: [resolve(projectRoot, "app/api/admin/stats/route.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [
    {
      name: "isolated-admin-stats-deps",
      setup(plugin) {
        plugin.onResolve({ filter: /^@\/lib\// }, ({ path }) =>
          path in mockModules
            ? { path, namespace: "admin-accept-test" }
            : { path: resolve(projectRoot, path.replace(/^@\//, "") + ".ts") },
        );
        plugin.onLoad(
          { filter: /.*/, namespace: "admin-accept-test" },
          ({ path }) => ({
            contents: mockModules[path],
            loader: "js",
          }),
        );
      },
    },
  ],
}).then((output) => {
  const entryPath = resolve(projectRoot, "app/api/admin/stats/route.ts");
  const compiled = new Module(entryPath, module);
  compiled.filename = entryPath;
  compiled.paths = (
    Module as typeof Module & { _nodeModulePaths: (p: string) => string[] }
  )._nodeModulePaths(projectRoot);
  (compiled as Module & { _compile: (src: string, file: string) => void })._compile(
    output.outputFiles[0].text,
    entryPath,
  );
  return compiled.exports as {
    GET: (request: Request) => Promise<Response>;
  };
});

test("Routing dan isolasi antar-portal memisahkan ADMIN, FLORIST, SUPPLIER, dan CUSTOMER", () => {
  const loginPage = readRepoFile("app/auth/login/page.tsx");
  assert.match(loginPage, /ADMIN:\s*"\/admin\/dashboard"/);
  assert.match(loginPage, /role === "ADMIN" && callbackUrl\.startsWith\("\/admin\/"\)/);

  const navbar = readRepoFile("components/layout/Navbar.tsx");
  assert.match(navbar, /role === "ADMIN"/);
  assert.match(navbar, /"\/admin\/dashboard"/);

  const adminLayout = readRepoFile("app/admin/layout.tsx");
  for (const href of [
    "/admin/dashboard",
    "/admin/users",
    "/admin/orders",
    "/admin/coupons",
    "/admin/audit-logs",
  ]) {
    assert.ok(adminLayout.includes(href), `Admin sidebar harus memuat tautan ${href}`);
  }
  assert.match(adminLayout, /if \(userRole !== "ADMIN"\)/);
  assert.match(adminLayout, /event\.key === "Escape"/);
  assert.match(adminLayout, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(adminLayout, /aria-expanded=\{mobileMenuOpen\}/);

  const supplierLayout = readRepoFile("app/supplier/layout.tsx");
  assert.match(supplierLayout, /if \(userRole !== "SUPPLIER"\)/);

  const floristLayout = readRepoFile("app/florist/layout.tsx");
  assert.match(floristLayout, /if \(userRole !== "FLORIST"\s*\)/);
});

test("Seluruh halaman Admin UI mematuhi token FundedNext, 3 status UI, a11y, dan masking PII", () => {
  const adminPages = [
    "app/admin/layout.tsx",
    "app/admin/dashboard/page.tsx",
    "app/admin/users/page.tsx",
    "app/admin/orders/page.tsx",
    "app/admin/coupons/page.tsx",
    "app/admin/audit-logs/page.tsx",
  ];

  for (const file of adminPages) {
    const src = readRepoFile(file);
    assert.doesNotMatch(
      src,
      /\[#[0-9a-fA-F]{3,8}\]/,
      `${file} tidak boleh memakai warna hex arbitrary`,
    );
    assert.doesNotMatch(
      src,
      /\b(?:violet|indigo|amber|rose)-\d+/,
      `${file} harus memakai token desain resmi (primary, warning, error, success)`,
    );
    assert.doesNotMatch(
      src,
      /\$\\rightarrow\$/,
      `${file} tidak boleh mengandung LaTeX mentah di JSX`,
    );
  }

  const dataPages = [
    "app/admin/users/page.tsx",
    "app/admin/orders/page.tsx",
    "app/admin/coupons/page.tsx",
    "app/admin/audit-logs/page.tsx",
  ];
  for (const file of dataPages) {
    const src = readRepoFile(file);
    assert.match(src, /<LoadingSpinner/, `${file} wajib merender LoadingSpinner`);
    assert.match(src, /<ErrorState/, `${file} wajib merender ErrorState`);
    assert.match(src, /<EmptyState/, `${file} wajib merender EmptyState`);
  }

  const usersPage = readRepoFile("app/admin/users/page.tsx");
  assert.match(usersPage, /maskEmail\(user\.email\)/);
  assert.doesNotMatch(usersPage, /\{user\.email\}/);

  const ordersPage = readRepoFile("app/admin/orders/page.tsx");
  assert.match(ordersPage, /maskedEmail/);

  const auditPage = readRepoFile("app/admin/audit-logs/page.tsx");
  assert.match(auditPage, /maskedEmail/);
});

test("Endpoint /api/admin/stats menolak non-admin dan memisahkan metrik B2C GMV vs pasokan B2B", async () => {
  const { GET } = await statsRoutePromise;
  statsQueryCount = 0;

  currentActor = null;
  assert.equal((await GET(new Request("http://localhost/api/admin/stats"))).status, 401);

  for (const role of ["CUSTOMER", "FLORIST", "SUPPLIER"] as const) {
    currentActor = { id: "u_non_admin", role };
    assert.equal(
      (await GET(new Request("http://localhost/api/admin/stats"))).status,
      403,
    );
  }
  assert.equal(statsQueryCount, 0);

  currentActor = { id: "admin_1", role: "ADMIN" };
  const okRes = await GET(new Request("http://localhost/api/admin/stats"));
  assert.equal(okRes.status, 200);
  const body = (await okRes.json()) as {
    success: boolean;
    data: {
      b2cOrders: { settledRevenue: number; pendingCount: number; deliveredCount: number };
      b2bSupply: {
        directSales: { settledRevenue: number };
        preOrders: { committedValue: number };
      };
    };
  };
  assert.equal(body.success, true);
  assert.equal(body.data.b2cOrders.settledRevenue, 450000);
  assert.equal(body.data.b2bSupply.directSales.settledRevenue, 320000);
  assert.equal(body.data.b2bSupply.preOrders.committedValue, 800000);
});
