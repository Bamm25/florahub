import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import { resolve } from "node:path";
import { build } from "esbuild";
import { NextResponse } from "next/server";

// Route dijalankan dengan dependensi auth/DB terisolasi. Tidak menyentuh akun riil.
type Role = "ADMIN" | "FLORIST" | "SUPPLIER" | "CUSTOMER";
type User = { id: string; role: Role; isActive: boolean; name: string; email: string };
const rows = new Map<string, User>();
const audits: Array<{ userId: string; entityId: string; oldValue: unknown; newValue: unknown }> = [];
let actor: { id: string; role: Role } | null = null;
let failAudit = false;
let writes = 0;
let reports = 0;
const projectRoot = resolve(import.meta.dirname, "..");
const routePath = resolve(projectRoot, "app/api/admin/users/[id]/route.ts");

const prismaMock = {
  async $transaction<T>(fn: (tx: {
    $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<void>;
    user: {
      findUnique: ({ where }: { where: { id: string } }) => Promise<User | null>;
      update: ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => Promise<User>;
    };
    auditLog: { create: ({ data }: { data: (typeof audits)[number] }) => Promise<void> };
  }) => Promise<T>): Promise<T> {
    const snapshot = new Map([...rows].map(([id, user]) => [id, { ...user }]));
    const previousAudits = audits.length;
    const previousWrites = writes;
    try {
      return await fn({
        $queryRaw: async () => {},
        user: {
          findUnique: async ({ where }) => rows.get(where.id) ?? null,
          update: async ({ where, data }) => {
            const old = rows.get(where.id);
            if (!old) throw new Error("User tidak ditemukan");
            const updated = { ...old, ...data };
            rows.set(where.id, updated);
            writes++;
            return updated;
          },
        },
        auditLog: {
          create: async ({ data }) => {
            if (failAudit) throw new Error("Simulasi kegagalan audit");
            audits.push(data);
          },
        },
      });
    } catch (error) {
      rows.clear();
      for (const [id, user] of snapshot) rows.set(id, user);
      audits.length = previousAudits;
      writes = previousWrites;
      throw error;
    }
  },
};

const mockModules: Record<string, string> = {
  "@/lib/middleware/requireAuth": `export async function requireAuth() { return globalThis.__adminTestAuth(); }`,
  "@/lib/prisma": `export default globalThis.__adminTestPrisma;`,
  "@/lib/server-error-report": `export function reportServerError() { globalThis.__adminTestReport(); }`,
};

const globals = globalThis as typeof globalThis & {
  __adminTestAuth: () => Promise<{ userId: string }>;
  __adminTestPrisma: typeof prismaMock;
  __adminTestReport: () => void;
};
globals.__adminTestAuth = async () => {
  if (!actor) throw NextResponse.json({ success: false }, { status: 401 });
  if (actor.role !== "ADMIN") throw NextResponse.json({ success: false }, { status: 403 });
  return { userId: actor.id };
};
globals.__adminTestPrisma = prismaMock;
globals.__adminTestReport = () => { reports++; };

const routePromise = build({
  entryPoints: [routePath],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [{
    name: "isolated-route-dependencies",
    setup(plugin) {
      plugin.onResolve({ filter: /^@\/lib\// }, ({ path }) =>
        path in mockModules
          ? { path, namespace: "admin-test" }
          : { path: resolve(projectRoot, path.replace(/^@\//, "") + ".ts") },
      );
      plugin.onLoad({ filter: /.*/, namespace: "admin-test" }, ({ path }) => ({
        contents: mockModules[path], loader: "js",
      }));
    },
  }],
}).then((output) => {
  const compiled = new Module(routePath, module);
  compiled.filename = routePath;
  compiled.paths = (Module as typeof Module & { _nodeModulePaths: (path: string) => string[] })._nodeModulePaths(projectRoot);
  (compiled as Module & { _compile: (source: string, filename: string) => void })
    ._compile(output.outputFiles[0].text, routePath);
  return compiled.exports as {
    PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  };
});

function reset() {
  rows.clear();
  audits.length = 0;
  writes = 0;
  reports = 0;
  failAudit = false;
  actor = { id: "admin1", role: "ADMIN" };
  rows.set("admin1", { id: "admin1", role: "ADMIN", isActive: true, name: "Admin", email: "admin@example.test" });
  rows.set("admin2", { id: "admin2", role: "ADMIN", isActive: true, name: "Admin 2", email: "admin2@example.test" });
  rows.set("florist1", { id: "florist1", role: "FLORIST", isActive: true, name: "Florist", email: "florist@example.test" });
}

async function patch(id: string, body: unknown): Promise<Response> {
  const { PATCH } = await routePromise;
  return PATCH(new Request(`http://localhost/api/admin/users/${id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
}

test("request anonim dan non-admin ditolak tanpa mutasi", async () => {
  reset(); actor = null;
  assert.equal((await patch("florist1", { isActive: false, reasonCode: "USER_REQUEST" })).status, 401);
  actor = { id: "florist1", role: "FLORIST" };
  assert.equal((await patch("admin2", { isActive: false, reasonCode: "USER_REQUEST" })).status, 403);
  assert.equal(writes, 0);
  assert.equal(audits.length, 0);
});

test("admin tidak dapat mengubah dirinya atau admin lain", async () => {
  reset();
  assert.equal((await patch("admin1", { isActive: false, reasonCode: "USER_REQUEST" })).status, 403);
  assert.equal((await patch("admin2", { isActive: false, reasonCode: "USER_REQUEST" })).status, 403);
  assert.equal(writes, 0);
});

test("role, identitas, dan input tanpa alasan ditolak tanpa mutasi", async () => {
  reset();
  assert.equal((await patch("florist1", { isActive: false, role: "ADMIN", reasonCode: "USER_REQUEST" })).status, 403);
  assert.equal((await patch("florist1", { isActive: false, email: "hijack@example.test", reasonCode: "USER_REQUEST" })).status, 400);
  assert.equal((await patch("florist1", { isActive: false })).status, 400);
  assert.equal(writes, 0);
});

test("admin mengubah status non-admin sekali dan audit tidak memuat PII", async () => {
  reset();
  const res = await patch("florist1", { isActive: false, reasonCode: "POLICY_VIOLATION" });
  assert.equal(res.status, 200);
  assert.equal(rows.get("florist1")?.isActive, false);
  assert.equal(writes, 1);
  assert.equal(audits.length, 1);
  assert.deepEqual(audits[0].oldValue, { isActive: true });
  assert.deepEqual(audits[0].newValue, { isActive: false, reasonCode: "POLICY_VIOLATION" });
  assert.equal(audits[0].userId, "admin1");
  assert.equal(audits[0].entityId, "florist1");
  assert.equal((await patch("florist1", { isActive: false, reasonCode: "POLICY_VIOLATION" })).status, 409);
  assert.equal(audits.length, 1);
});

test("kegagalan audit membatalkan mutasi dalam transaksi", async () => {
  reset(); failAudit = true;
  const res = await patch("florist1", { isActive: false, reasonCode: "USER_REQUEST" });
  assert.equal(res.status, 500);
  assert.equal(rows.get("florist1")?.isActive, true);
  assert.equal(writes, 0);
  assert.equal(audits.length, 0);
  assert.equal(reports, 1);
});
