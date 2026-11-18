import assert from "node:assert/strict";
import { Module } from "node:module";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { build } from "esbuild";
import { NextResponse } from "next/server";
import {
  createAdminCategory,
  createAdminCoupon,
  deleteAdminCategory,
  deleteAdminCoupon,
  fetchAdminCategories,
  fetchAdminCoupons,
  updateAdminCategory,
} from "../lib/api/admin";
import {
  adminCategoryQuerySchema,
  adminCouponQuerySchema,
  createCouponSchema,
  updateCategorySchema,
} from "../lib/validations/schemas";

type Role = "ADMIN" | "FLORIST" | "SUPPLIER" | "CUSTOMER";

interface MockCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number | null;
  usagePerUser: number;
  usageCount: number;
  isActive: boolean;
  createdById: string | null;
  applicableFor: string[];
  createdAt: Date;
  updatedAt: Date;
  usagesCount: number;
}

interface MockCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productsCount: number;
}

interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

const projectRoot = resolve(import.meta.dirname, "..");

let currentActor: { id: string; role: Role } | null = null;
const couponStore = new Map<string, MockCoupon>();
const categoryStore = new Map<string, MockCategory>();
const auditStore: AuditEntry[] = [];
let couponDeleteCount = 0;
let categoryDeleteCount = 0;

function toCouponRow(c: MockCoupon) {
  return {
    ...c,
    _count: { usages: c.usagesCount },
    createdBy: { id: "admin_1", name: "Admin Utama", email: "admin@florahub.id" },
    usages: [],
  };
}

function toCategoryRow(cat: MockCategory) {
  return {
    ...cat,
    _count: { products: cat.productsCount },
  };
}

const txApi = {
  coupon: {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; code?: string };
    }) => {
      if (where.id) {
        const hit = couponStore.get(where.id);
        return hit ? toCouponRow(hit) : null;
      }
      if (where.code) {
        for (const item of couponStore.values()) {
          if (item.code === where.code) return toCouponRow(item);
        }
      }
      return null;
    },
    findFirst: async ({
      where,
    }: {
      where: { code?: string; NOT?: { id?: string } };
    }) => {
      for (const item of couponStore.values()) {
        if (where.code && item.code === where.code && item.id !== where.NOT?.id) {
          return toCouponRow(item);
        }
      }
      return null;
    },
    findMany: async () => [...couponStore.values()].map(toCouponRow),
    count: async () => couponStore.size,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const id = `cpn_${couponStore.size + 1}`;
      const now = new Date();
      const created: MockCoupon = {
        id,
        code: String(data.code),
        name: String(data.name),
        description: (data.description as string | null) ?? null,
        type: data.type as MockCoupon["type"],
        value: Number(data.value),
        minPurchase: (data.minPurchase as number | null) ?? null,
        maxDiscount: (data.maxDiscount as number | null) ?? null,
        validFrom: data.validFrom as Date,
        validUntil: data.validUntil as Date,
        usageLimit: (data.usageLimit as number | null) ?? null,
        usagePerUser: Number(data.usagePerUser ?? 1),
        usageCount: 0,
        isActive: Boolean(data.isActive ?? true),
        createdById: (data.createdById as string | null) ?? null,
        applicableFor: (data.applicableFor as string[]) ?? [],
        createdAt: now,
        updatedAt: now,
        usagesCount: 0,
      };
      couponStore.set(id, created);
      return toCouponRow(created);
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<MockCoupon>;
    }) => {
      const prev = couponStore.get(where.id);
      if (!prev) throw new Error("Coupon not found");
      const next: MockCoupon = { ...prev, ...data, updatedAt: new Date() };
      couponStore.set(where.id, next);
      return toCouponRow(next);
    },
    delete: async ({ where }: { where: { id: string } }) => {
      couponStore.delete(where.id);
      couponDeleteCount++;
    },
  },
  flowerCategory: {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; name?: string };
    }) => {
      if (where.id) {
        const hit = categoryStore.get(where.id);
        return hit ? toCategoryRow(hit) : null;
      }
      if (where.name) {
        for (const c of categoryStore.values()) {
          if (c.name === where.name) return toCategoryRow(c);
        }
      }
      return null;
    },
    findFirst: async ({
      where,
    }: {
      where: {
        OR?: Array<{ name?: string; slug?: string }>;
        NOT?: { id?: string };
      };
    }) => {
      for (const item of categoryStore.values()) {
        if (where.NOT?.id && item.id === where.NOT.id) continue;
        if (!where.OR) return toCategoryRow(item);
        const matches = where.OR.some(
          (cond) =>
            (cond.name && item.name === cond.name) ||
            (cond.slug && item.slug === cond.slug),
        );
        if (matches) return toCategoryRow(item);
      }
      return null;
    },
    findMany: async () => [...categoryStore.values()].map(toCategoryRow),
    count: async () => categoryStore.size,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const id = `cat_${categoryStore.size + 1}`;
      const now = new Date();
      const created: MockCategory = {
        id,
        name: String(data.name),
        slug: String(data.slug),
        description: (data.description as string | null) ?? null,
        image: (data.image as string | null) ?? null,
        isActive: Boolean(data.isActive ?? true),
        createdAt: now,
        updatedAt: now,
        productsCount: 0,
      };
      categoryStore.set(id, created);
      return toCategoryRow(created);
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<MockCategory>;
    }) => {
      const prev = categoryStore.get(where.id);
      if (!prev) throw new Error("Category not found");
      const next: MockCategory = { ...prev, ...data, updatedAt: new Date() };
      categoryStore.set(where.id, next);
      return toCategoryRow(next);
    },
    delete: async ({ where }: { where: { id: string } }) => {
      categoryStore.delete(where.id);
      categoryDeleteCount++;
    },
  },
  auditLog: {
    create: async ({ data }: { data: AuditEntry }) => {
      auditStore.push(data);
    },
  },
};

const prismaMock = {
  ...txApi,
  async $transaction<T>(fn: (tx: typeof txApi) => Promise<T>): Promise<T> {
    const cpnSnapshot = new Map(
      [...couponStore].map(([k, v]) => [k, { ...v }]),
    );
    const catSnapshot = new Map(
      [...categoryStore].map(([k, v]) => [k, { ...v }]),
    );
    const prevAuditLen = auditStore.length;
    try {
      return await fn(txApi);
    } catch (err) {
      couponStore.clear();
      for (const [k, v] of cpnSnapshot) couponStore.set(k, v);
      categoryStore.clear();
      for (const [k, v] of catSnapshot) categoryStore.set(k, v);
      auditStore.length = prevAuditLen;
      throw err;
    }
  },
};

const mockModules: Record<string, string> = {
  "@/lib/middleware/requireAuth": `export async function requireAuth(req, allowed) { return globalThis.__adminPromoAuth(allowed); }`,
  "@/lib/prisma": `export default globalThis.__adminPromoPrisma;`,
  "@/lib/server-error-report": `export function reportServerError() {}`,
};

const globals = globalThis as typeof globalThis & {
  __adminPromoAuth: (allowed?: Role[]) => Promise<{ userId: string }>;
  __adminPromoPrisma: typeof prismaMock;
};

globals.__adminPromoAuth = async (allowed?: Role[]) => {
  if (!currentActor) {
    throw NextResponse.json({ success: false }, { status: 401 });
  }
  if (allowed && !allowed.includes(currentActor.role)) {
    throw NextResponse.json({ success: false }, { status: 403 });
  }
  return { userId: currentActor.id };
};
globals.__adminPromoPrisma = prismaMock;

async function loadCompiledRoute<T>(relativePath: string): Promise<T> {
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
        name: "isolated-admin-promo-deps",
        setup(plugin) {
          plugin.onResolve({ filter: /^@\/lib\// }, ({ path }) =>
            path in mockModules
              ? { path, namespace: "admin-promo-test" }
              : { path: resolve(projectRoot, path.replace(/^@\//, "") + ".ts") },
          );
          plugin.onLoad(
            { filter: /.*/, namespace: "admin-promo-test" },
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

const couponsCollectionRoute = loadCompiledRoute<{
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
}>("app/api/admin/coupons/route.ts");

const couponDetailRoute = loadCompiledRoute<{
  GET: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  PUT: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  DELETE: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
}>("app/api/admin/coupons/[id]/route.ts");

const categoriesCollectionRoute = loadCompiledRoute<{
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
}>("app/api/categories/route.ts");

const categoryDetailRoute = loadCompiledRoute<{
  PUT: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  DELETE: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
}>("app/api/categories/[id]/route.ts");

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});

function resetFixture() {
  currentActor = { id: "admin_1", role: "ADMIN" };
  couponStore.clear();
  categoryStore.clear();
  auditStore.length = 0;
  couponDeleteCount = 0;
  categoryDeleteCount = 0;

  const start = new Date("2026-11-01T00:00:00.000Z");
  const end = new Date("2026-12-31T23:59:59.000Z");

  couponStore.set("cpn_unused", {
    id: "cpn_unused",
    code: "BARU10",
    name: "Diskon Pelanggan Baru",
    description: null,
    type: "PERCENTAGE",
    value: 10,
    minPurchase: 100000,
    maxDiscount: 50000,
    validFrom: start,
    validUntil: end,
    usageLimit: 100,
    usagePerUser: 1,
    usageCount: 0,
    isActive: true,
    createdById: "admin_1",
    applicableFor: [],
    createdAt: start,
    updatedAt: start,
    usagesCount: 0,
  });

  couponStore.set("cpn_used", {
    id: "cpn_used",
    code: "TERPAKAI20",
    name: "Promo Sudah Dipakai",
    description: "Punya histori pemakaian",
    type: "FIXED",
    value: 20000,
    minPurchase: 150000,
    maxDiscount: null,
    validFrom: start,
    validUntil: end,
    usageLimit: 50,
    usagePerUser: 1,
    usageCount: 3,
    isActive: true,
    createdById: "admin_1",
    applicableFor: [],
    createdAt: start,
    updatedAt: start,
    usagesCount: 3,
  });

  categoryStore.set("cat_empty", {
    id: "cat_empty",
    name: "Anggrek Bulan",
    slug: "anggrek-bulan",
    description: null,
    image: null,
    isActive: true,
    createdAt: start,
    updatedAt: start,
    productsCount: 0,
  });

  categoryStore.set("cat_linked", {
    id: "cat_linked",
    name: "Buket Mawar",
    slug: "buket-mawar",
    description: "Kategori berisi produk aktif",
    image: null,
    isActive: true,
    createdAt: start,
    updatedAt: start,
    productsCount: 4,
  });
}

test("Skema Zod kupon & kategori memvalidasi query, kode kapital, slug, dan isActive", () => {
  const validCouponQuery = adminCouponQuerySchema.safeParse({
    page: "1",
    limit: "20",
    type: "PERCENTAGE",
    isActive: "true",
    search: "  mawar ",
  });
  assert.equal(validCouponQuery.success, true);
  if (validCouponQuery.success) {
    assert.equal(validCouponQuery.data.isActive, true);
    assert.equal(validCouponQuery.data.search, "mawar");
  }

  assert.equal(adminCouponQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(
    adminCategoryQuerySchema.safeParse({ limit: "200" }).success,
    false,
  );

  const parsedCoupon = createCouponSchema.parse({
    code: " promo15 ",
    name: "Promo 15%",
    type: "PERCENTAGE",
    value: 15,
  });
  assert.equal(parsedCoupon.code, "PROMO15");

  const parsedCatUpdate = updateCategorySchema.safeParse({
    isActive: false,
    slug: "invalid slug!",
  });
  assert.equal(parsedCatUpdate.success, false);
});

test("Route kupon & mutasi kategori menolak anonim (401) serta non-admin (403) tanpa writes", async () => {
  resetFixture();
  const { GET, POST } = await couponsCollectionRoute;
  const { DELETE } = await couponDetailRoute;
  const { POST: postCat } = await categoriesCollectionRoute;
  const { PUT: putCat, DELETE: deleteCat } = await categoryDetailRoute;

  currentActor = null;
  assert.equal((await GET(new Request("http://localhost/api/admin/coupons"))).status, 401);
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/admin/coupons", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await postCat(
        new Request("http://localhost/api/categories", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      )
    ).status,
    401,
  );

  currentActor = { id: "fl_1", role: "FLORIST" };
  assert.equal(
    (
      await DELETE(
        new Request("http://localhost/api/admin/coupons/cpn_unused", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "cpn_unused" }) },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await putCat(
        new Request("http://localhost/api/categories/cat_empty", {
          method: "PUT",
          body: JSON.stringify({ isActive: false }),
        }),
        { params: Promise.resolve({ id: "cat_empty" }) },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await deleteCat(
        new Request("http://localhost/api/categories/cat_empty", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "cat_empty" }) },
      )
    ).status,
    403,
  );
  assert.equal(auditStore.length, 0);
});

test("POST /api/admin/coupons memvalidasi batas nilai, konflik kode (409), dan mencatat AuditLog", async () => {
  resetFixture();
  const { POST } = await couponsCollectionRoute;

  const overPct = await POST(
    new Request("http://localhost/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: "LEBIH150",
        name: "Tidak Valid",
        type: "PERCENTAGE",
        value: 150,
      }),
    }),
  );
  assert.equal(overPct.status, 400);

  const duplicateRes = await POST(
    new Request("http://localhost/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: "BARU10",
        name: "Duplikat",
        type: "PERCENTAGE",
        value: 10,
      }),
    }),
  );
  assert.equal(duplicateRes.status, 409);

  const okRes = await POST(
    new Request("http://localhost/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: "HEMAT50",
        name: "Potongan 50 Ribu",
        type: "FIXED",
        value: 50000,
        validFrom: "2026-11-18T00:00:00.000Z",
        validUntil: "2026-12-18T00:00:00.000Z",
      }),
    }),
  );
  assert.equal(okRes.status, 201);
  assert.equal(auditStore.length, 1);
  assert.equal(auditStore[0].action, "CREATE");
  assert.equal(auditStore[0].entity, "Coupon");
});

test("DELETE /api/admin/coupons/[id] menghapus kupon kosong & mengarsipkan (soft-deactivate) kupon terpakai", async () => {
  resetFixture();
  const { DELETE, PUT } = await couponDetailRoute;

  // Tidak boleh ubah kode kupon yang sudah terpakai
  const renameUsed = await PUT(
    new Request("http://localhost/api/admin/coupons/cpn_used", {
      method: "PUT",
      body: JSON.stringify({ code: "UBAHKODE" }),
    }),
    { params: Promise.resolve({ id: "cpn_used" }) },
  );
  assert.equal(renameUsed.status, 409);

  // Hapus kupon terpakai -> dinonaktifkan (archived: true), bukan delete fisik
  const archiveRes = await DELETE(
    new Request("http://localhost/api/admin/coupons/cpn_used", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "cpn_used" }) },
  );
  assert.equal(archiveRes.status, 200);
  const archiveBody = (await archiveRes.json()) as {
    success: boolean;
    data: { archived: boolean };
  };
  assert.equal(archiveBody.data.archived, true);
  assert.equal(couponDeleteCount, 0);
  assert.equal(couponStore.get("cpn_used")?.isActive, false);
  assert.equal(auditStore[0].action, "UPDATE");

  // Menghapus ulang kupon terpakai yang sudah nonaktif ditolak 409
  const secondArchive = await DELETE(
    new Request("http://localhost/api/admin/coupons/cpn_used", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "cpn_used" }) },
  );
  assert.equal(secondArchive.status, 409);

  // Kupon yang belum pernah dipakai dihapus fisik
  const hardDelete = await DELETE(
    new Request("http://localhost/api/admin/coupons/cpn_unused", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "cpn_unused" }) },
  );
  assert.equal(hardDelete.status, 200);
  const hardBody = (await hardDelete.json()) as {
    success: boolean;
    data: { archived: boolean };
  };
  assert.equal(hardBody.data.archived, false);
  assert.equal(couponDeleteCount, 1);
  assert.equal(couponStore.has("cpn_unused"), false);
  assert.equal(auditStore[1].action, "DELETE");
});

test("Kategori berproduk menolak DELETE (409) namun bisa dinonaktifkan via PUT dengan AuditLog", async () => {
  resetFixture();
  const { PUT, DELETE } = await categoryDetailRoute;

  const blockedDelete = await DELETE(
    new Request("http://localhost/api/categories/cat_linked", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "cat_linked" }) },
  );
  assert.equal(blockedDelete.status, 409);
  assert.equal(categoryDeleteCount, 0);

  const deactivateRes = await PUT(
    new Request("http://localhost/api/categories/cat_linked", {
      method: "PUT",
      body: JSON.stringify({ isActive: false }),
    }),
    { params: Promise.resolve({ id: "cat_linked" }) },
  );
  assert.equal(deactivateRes.status, 200);
  assert.equal(categoryStore.get("cat_linked")?.isActive, false);
  assert.equal(auditStore[0].action, "UPDATE");
  assert.equal(auditStore[0].entity, "FlowerCategory");

  const okDelete = await DELETE(
    new Request("http://localhost/api/categories/cat_empty", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "cat_empty" }) },
  );
  assert.equal(okDelete.status, 200);
  assert.equal(categoryDeleteCount, 1);
  assert.equal(auditStore[1].action, "DELETE");
});

test("Client API kupon & kategori mengirim parameter yang tepat dan memparsing respons", async () => {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/admin/coupons");
    assert.equal(url.searchParams.get("type"), "FIXED");
    assert.equal(url.searchParams.get("isActive"), "true");
    assert.equal(init?.cache, "no-store");
    return Response.json({
      success: true,
      data: {
        coupons: [],
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
  const coupons = await fetchAdminCoupons({ type: "FIXED", isActive: true });
  assert.equal(coupons.coupons.length, 0);

  globalThis.fetch = async () =>
    Response.json({
      success: true,
      data: { coupon: { id: "cpn_x", code: "TEST" } },
    });
  const created = await createAdminCoupon({
    code: "TEST",
    name: "Test",
    type: "FIXED",
    value: 10000,
  });
  assert.equal(created.code, "TEST");

  globalThis.fetch = async () =>
    Response.json({
      success: true,
      message: "Kupon diarsipkan",
      data: { archived: true },
    });
  const delRes = await deleteAdminCoupon("cpn_x");
  assert.equal(delRes.archived, true);

  globalThis.fetch = async (input) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/categories");
    assert.equal(url.searchParams.get("isActive"), "false");
    return Response.json({
      success: true,
      data: {
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
  const cats = await fetchAdminCategories({ isActive: false });
  assert.equal(cats.items.length, 0);

  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "POST");
    return Response.json({
      success: true,
      data: { id: "cat_new", name: "Lily", slug: "lily", isActive: true },
    });
  };
  const newCat = await createAdminCategory({ name: "Lily", slug: "lily" });
  assert.equal(newCat.slug, "lily");

  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "PUT");
    return Response.json({
      success: true,
      data: { id: "cat_new", name: "Lily", slug: "lily", isActive: false },
    });
  };
  const updatedCat = await updateAdminCategory("cat_new", { isActive: false });
  assert.equal(updatedCat.isActive, false);

  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "DELETE");
    return Response.json({ success: true });
  };
  await deleteAdminCategory("cat_new");
});
