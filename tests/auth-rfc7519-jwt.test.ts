import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Module } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import {
  DEFAULT_MAX_AGE_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  decodeRfc7519Jwt,
  encodeRfc7519Jwt,
} from "../lib/jwt-rfc7519";

const projectRoot = resolve(import.meta.dirname, "..");
const TEST_SECRET = "test-florahub-rfc7519-secret-key-2026";

function signRawJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
): string {
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

test("encodeRfc7519Jwt menghasilkan token 3 segmen sesuai struktur & klaim RFC 7519", async () => {
  const token = await encodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: {
      sub: "cmw7g3y1l000098k37t4j1d37",
      id: "cmw7g3y1l000098k37t4j1d37",
      name: "Toko Bunga Indah",
      email: "florist@shop.com",
      role: "FLORIST",
    },
  });

  const parts = token.split(".");
  assert.equal(parts.length, 3, "JWT RFC 7519 wajib terdiri atas tepat 3 segmen");

  const decodedHeader = JSON.parse(
    Buffer.from(parts[0], "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  assert.deepEqual(decodedHeader, { alg: "HS256", typ: "JWT" });

  const decodedPayload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  ) as Record<string, unknown>;

  assert.equal(decodedPayload.iss, JWT_ISSUER);
  assert.equal(decodedPayload.aud, JWT_AUDIENCE);
  assert.equal(decodedPayload.sub, "cmw7g3y1l000098k37t4j1d37");
  assert.equal(typeof decodedPayload.iat, "number");
  assert.equal(typeof decodedPayload.nbf, "number");
  assert.equal(typeof decodedPayload.exp, "number");
  assert.equal(
    Number(decodedPayload.exp) - Number(decodedPayload.iat),
    DEFAULT_MAX_AGE_SECONDS,
  );
  assert.match(
    String(decodedPayload.jti),
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  assert.equal(decodedPayload.role, "FLORIST");
  assert.equal(decodedPayload.email, "florist@shop.com");
});

test("decodeRfc7519Jwt memverifikasi signature dan menolak token palsu, alg=none, exp, nbf, atau iss/aud salah", async () => {
  const validToken = await encodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: {
      id: "cmw7g3y1l000098k37t4j1d37",
      sub: "cmw7g3y1l000098k37t4j1d37",
      email: "florist@shop.com",
      role: "FLORIST",
    },
  });

  const decoded = await decodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: validToken,
  });
  assert.ok(decoded);
  assert.equal(decoded.sub, "cmw7g3y1l000098k37t4j1d37");
  assert.equal(decoded.role, "FLORIST");

  // Secret salah
  assert.equal(
    await decodeRfc7519Jwt({ secret: "wrong-secret", token: validToken }),
    null,
  );

  // Manipulasi payload tanpa re-sign
  const parts = validToken.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      sub: "cmw7g3y1l000098k37t4j1d37",
      role: "ADMIN",
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: "tampered-id",
    }),
  ).toString("base64url");
  assert.equal(
    await decodeRfc7519Jwt({
      secret: TEST_SECRET,
      token: `${parts[0]}.${tamperedPayload}.${parts[2]}`,
    }),
    null,
  );

  const now = Math.floor(Date.now() / 1000);
  const baseClaims = {
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    sub: "usr_1",
    iat: now,
    nbf: now,
    exp: now + 3600,
    jti: "11111111-2222-4333-8444-555555555555",
  };

  // Algoritma none ditolak
  const algNone = signRawJwt({ alg: "none", typ: "JWT" }, baseClaims, TEST_SECRET);
  assert.equal(await decodeRfc7519Jwt({ secret: TEST_SECRET, token: algNone }), null);

  // Token expired ditolak
  const expired = signRawJwt(
    { alg: "HS256", typ: "JWT" },
    { ...baseClaims, exp: now - 10 },
    TEST_SECRET,
  );
  assert.equal(await decodeRfc7519Jwt({ secret: TEST_SECRET, token: expired }), null);

  // Token nbf masa depan ditolak
  const futureNbf = signRawJwt(
    { alg: "HS256", typ: "JWT" },
    { ...baseClaims, nbf: now + 600 },
    TEST_SECRET,
  );
  assert.equal(await decodeRfc7519Jwt({ secret: TEST_SECRET, token: futureNbf }), null);

  // Issuer atau Audience tidak sesuai ditolak
  const wrongIss = signRawJwt(
    { alg: "HS256", typ: "JWT" },
    { ...baseClaims, iss: "urn:other:auth" },
    TEST_SECRET,
  );
  assert.equal(await decodeRfc7519Jwt({ secret: TEST_SECRET, token: wrongIss }), null);

  const wrongAud = signRawJwt(
    { alg: "HS256", typ: "JWT" },
    { ...baseClaims, aud: "urn:other:api" },
    TEST_SECRET,
  );
  assert.equal(await decodeRfc7519Jwt({ secret: TEST_SECRET, token: wrongAud }), null);
});

test("authOptions.jwt dan requireAuth mendukung Bearer JWT RFC 7519 terintegrasi", async () => {
  let mockIsActive = true;

  const globals = globalThis as typeof globalThis & {
    __rfcTestPrisma: {
      user: {
        findUnique: () => Promise<{
          id: string;
          role: string;
          name: string;
          email: string;
          isActive: boolean;
        } | null>;
      };
    };
  };

  globals.__rfcTestPrisma = {
    user: {
      findUnique: async () => ({
        id: "cmw7g3y1l000098k37t4j1d37",
        role: "FLORIST",
        name: "Toko Bunga Indah",
        email: "florist@shop.com",
        isActive: mockIsActive,
      }),
    },
  };

  const mockMap: Record<string, string> = {
    "@/lib/prisma": `export default globalThis.__rfcTestPrisma;`,
    "../prisma": `export default globalThis.__rfcTestPrisma;`,
    "./prisma": `export default globalThis.__rfcTestPrisma;`,
    "next-auth": `export async function getServerSession() { return null; } export default function NextAuth() { return () => {}; }`,
    "next-auth/providers/credentials": `export default function Credentials() { return {}; }`,
  };

  async function compile<T>(relPath: string): Promise<T> {
    const abs = resolve(projectRoot, relPath);
    const out = await build({
      entryPoints: [abs],
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      packages: "external",
      plugins: [
        {
          name: "rfc7519-isolated-deps",
          setup(plugin) {
            plugin.onResolve({ filter: /.*/ }, ({ path }) => {
              if (path in mockMap) {
                return { path, namespace: "rfc-test-mock" };
              }
              return undefined;
            });
            plugin.onLoad({ filter: /.*/, namespace: "rfc-test-mock" }, ({ path }) => ({
              contents: mockMap[path],
              loader: "js",
            }));
          },
        },
      ],
    });
    const mod = new Module(abs, module);
    mod.filename = abs;
    mod.paths = (
      Module as typeof Module & { _nodeModulePaths: (p: string) => string[] }
    )._nodeModulePaths(projectRoot);
    (mod as Module & { _compile: (s: string, f: string) => void })._compile(
      out.outputFiles[0].text,
      abs,
    );
    return mod.exports as T;
  }

  const { authOptions } = await compile<{
    authOptions: {
      jwt?: {
        encode?: typeof encodeRfc7519Jwt;
        decode?: typeof decodeRfc7519Jwt;
      };
    };
  }>("lib/auth.ts");

  assert.equal(authOptions.jwt?.encode?.name, "encodeRfc7519Jwt");
  assert.equal(authOptions.jwt?.decode?.name, "decodeRfc7519Jwt");

  const { requireAuth } = await compile<{
    requireAuth: (
      req: Request,
      roles?: string[],
    ) => Promise<{ userId: string; userRole: string }>;
  }>("lib/middleware/requireAuth.ts");

  const mutableEnv = process.env as Record<string, string | undefined>;
  const prevSecret = mutableEnv.NEXTAUTH_SECRET;
  try {
    mutableEnv.NEXTAUTH_SECRET = TEST_SECRET;

    const bearer = await encodeRfc7519Jwt({
      secret: TEST_SECRET,
      token: {
        id: "cmw7g3y1l000098k37t4j1d37",
        sub: "cmw7g3y1l000098k37t4j1d37",
        email: "florist@shop.com",
        role: "FLORIST",
      },
    });

    const authResult = await requireAuth(
      new Request("http://localhost/api/florist/dashboard", {
        headers: { Authorization: `Bearer ${bearer}` },
      }),
      ["FLORIST"],
    );
    assert.equal(authResult.userId, "cmw7g3y1l000098k37t4j1d37");
    assert.equal(authResult.userRole, "FLORIST");

    // Role tidak cocok -> 403
    await assert.rejects(
      requireAuth(
        new Request("http://localhost/api/admin/stats", {
          headers: { Authorization: `Bearer ${bearer}` },
        }),
        ["ADMIN"],
      ),
      (err: Response) => err.status === 403,
    );

    // Akun nonaktif di DB -> 401
    mockIsActive = false;
    await assert.rejects(
      requireAuth(
        new Request("http://localhost/api/florist/dashboard", {
          headers: { Authorization: `Bearer ${bearer}` },
        }),
        ["FLORIST"],
      ),
      (err: Response) => err.status === 401,
    );
  } finally {
    mutableEnv.NEXTAUTH_SECRET = prevSecret;
  }
});
