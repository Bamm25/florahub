import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { test } from "node:test";
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  decodeRfc7519Jwt,
  encodeRfc7519Jwt,
  isTokenIssuedBeforePasswordChange,
} from "../lib/jwt-rfc7519";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isRoleEligibleForPasswordReset,
  isValidPasswordResetTokenFormat,
} from "../lib/password-reset";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../lib/validations/schemas";

const req = createRequire(import.meta.url);
const TEST_SECRET = "test-florahub-password-reset-secret-2026";

interface MockUserRecord {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "FLORIST" | "SUPPLIER" | "ADMIN";
  isActive: boolean;
  password: string;
  passwordChangedAt: Date | null;
}

interface MockTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

function loadPasswordResetRoutesWithMocks(state: {
  users: MockUserRecord[];
  tokens: MockTokenRecord[];
  sentEmails: Array<{ to: string; name: string; resetUrl: string; expiresInMinutes: number }>;
  auditLogs: Array<Record<string, unknown>>;
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

  const forgotRoutePath = req.resolve("../app/api/auth/forgot-password/route");
  const resetRoutePath = req.resolve("../app/api/auth/reset-password/route");
  delete req.cache[forgotRoutePath];
  delete req.cache[resetRoutePath];

  let nextTokenSeq = 1;

  const findUser = (where: { id?: string; email?: string }) => {
    if (where.id) return state.users.find((u) => u.id === where.id) ?? null;
    if (where.email) return state.users.find((u) => u.email === where.email) ?? null;
    return null;
  };

  const prismaStub: Record<string, unknown> = {
    user: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; email?: string };
      }) => findUser(where),
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { password?: string; passwordChangedAt?: Date | null };
      }) => {
        const user = findUser(where);
        if (!user) throw new Error("User not found");
        if (data.password !== undefined) user.password = data.password;
        if (data.passwordChangedAt !== undefined) {
          user.passwordChangedAt = data.passwordChangedAt;
        }
        return user;
      },
    },
    passwordResetToken: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; tokenHash?: string };
      }) => {
        const row =
          (where.tokenHash
            ? state.tokens.find((t) => t.tokenHash === where.tokenHash)
            : state.tokens.find((t) => t.id === where.id)) ?? null;
        if (!row) return null;
        const user = state.users.find((u) => u.id === row.userId) ?? null;
        return { ...row, user };
      },
      create: async ({
        data,
      }: {
        data: { userId: string; tokenHash: string; expiresAt: Date };
      }) => {
        const row: MockTokenRecord = {
          id: `prt_mock_${nextTokenSeq++}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          usedAt: null,
          createdAt: new Date(),
        };
        state.tokens.push(row);
        return row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = state.tokens.findIndex((t) => t.id === where.id);
        if (idx !== -1) state.tokens.splice(idx, 1);
        return null;
      },
      deleteMany: async ({
        where,
      }: {
        where: { userId?: string; usedAt?: null };
      }) => {
        let count = 0;
        for (let i = state.tokens.length - 1; i >= 0; i--) {
          const item = state.tokens[i];
          const matchUser = !where.userId || item.userId === where.userId;
          const matchUnused = where.usedAt !== null || item.usedAt === null;
          if (matchUser && matchUnused) {
            state.tokens.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; usedAt: null; expiresAt?: { gt: Date } };
        data: { usedAt: Date };
      }) => {
        let count = 0;
        for (const item of state.tokens) {
          if (
            item.id === where.id &&
            item.usedAt === null &&
            (!where.expiresAt?.gt || item.expiresAt > where.expiresAt.gt)
          ) {
            item.usedAt = data.usedAt;
            count++;
          }
        }
        return { count };
      },
    },
    $transaction: async <T>(fn: (tx: Record<string, unknown>) => Promise<T>) =>
      fn(prismaStub),
  };

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
    if (request === "@/lib/prisma" || request.endsWith("/lib/prisma")) {
      return { default: prismaStub, __esModule: true };
    }
    if (request === "@/lib/email" || request.endsWith("/lib/email")) {
      return {
        sendPasswordResetEmail: async (payload: {
          to: string;
          name: string;
          resetUrl: string;
          expiresInMinutes: number;
        }) => {
          state.sentEmails.push(payload);
        },
      };
    }
    if (request === "@/lib/auditLog" || request.endsWith("/lib/auditLog")) {
      return {
        createAuditLog: async (entry: Record<string, unknown>) => {
          state.auditLogs.push(entry);
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const forgotRoute = req("../app/api/auth/forgot-password/route") as {
      POST: (request: Request) => Promise<Response>;
    };
    const resetRoute = req("../app/api/auth/reset-password/route") as {
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    };
    return { forgotRoute, resetRoute };
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

test("Skema Zod forgotPasswordSchema dan resetPasswordSchema memvalidasi input dengan benar", () => {
  const validForgot = forgotPasswordSchema.parse({
    email: "Customer@FloraHub.biz.id",
  });
  assert.equal(validForgot.email, "customer@florahub.biz.id");

  assert.throws(() => forgotPasswordSchema.parse({ email: "bukan-email" }));

  const validToken = "a".repeat(64);
  const validReset = resetPasswordSchema.parse({
    token: validToken,
    password: "KataSandiAman123",
  });
  assert.equal(validReset.token, validToken);

  assert.throws(() =>
    resetPasswordSchema.parse({ token: "pendek", password: "KataSandiAman123" }),
  );
  assert.throws(() =>
    resetPasswordSchema.parse({ token: validToken, password: "1234567" }),
  );
});

test("Utilitas reset password menghasilkan token SHA-256 valid dan menolak role ADMIN", () => {
  const rawToken = generatePasswordResetToken();
  assert.equal(isValidPasswordResetTokenFormat(rawToken), true);
  assert.equal(isValidPasswordResetTokenFormat("invalid-token"), false);

  const hashA = hashPasswordResetToken(rawToken);
  const hashB = hashPasswordResetToken(rawToken);
  assert.equal(hashA.length, 64);
  assert.equal(hashA, hashB);
  assert.notEqual(hashA, rawToken);

  assert.equal(isRoleEligibleForPasswordReset("CUSTOMER"), true);
  assert.equal(isRoleEligibleForPasswordReset("FLORIST"), true);
  assert.equal(isRoleEligibleForPasswordReset("SUPPLIER"), true);
  assert.equal(isRoleEligibleForPasswordReset("ADMIN"), false);
  assert.equal(isRoleEligibleForPasswordReset(null), false);
});

test("JWT RFC 7519 membatalkan sesi sebelum passwordChangedAt dan mengizinkan sesi sesudahnya", async () => {
  const issuedAtMs = Date.now() - 10_000;
  const oldJwt = await encodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: {
      sub: "user_cust_1",
      id: "user_cust_1",
      role: "CUSTOMER",
      email: "buyer@florahub.biz.id",
      authTime: issuedAtMs,
    },
  });

  const decodedOld = await decodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: oldJwt,
  });
  assert.ok(decodedOld);
  assert.equal(decodedOld.iss, JWT_ISSUER);
  assert.equal(decodedOld.aud, JWT_AUDIENCE);
  assert.equal(decodedOld.authTime, issuedAtMs);

  const passwordChangedAt = new Date(issuedAtMs + 5_000);
  assert.equal(
    isTokenIssuedBeforePasswordChange(decodedOld, passwordChangedAt),
    true,
  );

  const newJwt = await encodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: {
      sub: "user_cust_1",
      id: "user_cust_1",
      role: "CUSTOMER",
      email: "buyer@florahub.biz.id",
      authTime: passwordChangedAt.getTime(),
    },
  });

  const decodedNew = await decodeRfc7519Jwt({
    secret: TEST_SECRET,
    token: newJwt,
  });
  assert.ok(decodedNew);
  assert.equal(
    isTokenIssuedBeforePasswordChange(decodedNew, passwordChangedAt),
    false,
  );
  assert.equal(isTokenIssuedBeforePasswordChange(decodedOld, null), false);
});

test("POST /api/auth/forgot-password memproses non-Admin aktif, serta mengembalikan 200 generik tanpa email untuk anonim, nonaktif, dan ADMIN", async () => {
  const state = {
    users: [
      {
        id: "u_cust_1",
        name: "Budi Pembeli",
        email: "budi@example.com",
        role: "CUSTOMER" as const,
        isActive: true,
        password: "hashed-old-password",
        passwordChangedAt: null,
      },
      {
        id: "u_inactive_1",
        name: "Siti Nonaktif",
        email: "nonaktif@example.com",
        role: "FLORIST" as const,
        isActive: false,
        password: "hashed-old-password",
        passwordChangedAt: null,
      },
      {
        id: "u_admin_1",
        name: "Admin FloraHub",
        email: "admin@florahub.biz.id",
        role: "ADMIN" as const,
        isActive: true,
        password: "hashed-admin-password",
        passwordChangedAt: null,
      },
    ],
    tokens: [] as MockTokenRecord[],
    sentEmails: [] as Array<{
      to: string;
      name: string;
      resetUrl: string;
      expiresInMinutes: number;
    }>,
    auditLogs: [] as Array<Record<string, unknown>>,
  };

  const { forgotRoute } = loadPasswordResetRoutesWithMocks(state);

  // 1. Email tidak terdaftar -> tetap 200 generik, 0 email
  const resUnknown = await forgotRoute.POST(
    new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.1",
      },
      body: JSON.stringify({ email: "unknown@example.com" }),
    }),
  );
  assert.equal(resUnknown.status, 200);
  assert.equal(state.sentEmails.length, 0);

  // 2. Akun nonaktif -> tetap 200 generik, 0 email
  const resInactive = await forgotRoute.POST(
    new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.2",
      },
      body: JSON.stringify({ email: "nonaktif@example.com" }),
    }),
  );
  assert.equal(resInactive.status, 200);
  assert.equal(state.sentEmails.length, 0);

  // 3. Akun ADMIN -> diblokir diam-diam (200 generik), 0 token & 0 email
  const resAdmin = await forgotRoute.POST(
    new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.3",
      },
      body: JSON.stringify({ email: "admin@florahub.biz.id" }),
    }),
  );
  assert.equal(resAdmin.status, 200);
  assert.equal(state.sentEmails.length, 0);
  assert.equal(state.tokens.length, 0);

  // 4. Akun non-Admin aktif -> simpan token ter-hash & kirim 1 email
  const resCustomer = await forgotRoute.POST(
    new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.1.4",
      },
      body: JSON.stringify({ email: "budi@example.com" }),
    }),
  );
  assert.equal(resCustomer.status, 200);
  assert.equal(state.sentEmails.length, 1);
  assert.equal(state.tokens.length, 1);

  const sent = state.sentEmails[0];
  assert.equal(sent.to, "budi@example.com");
  assert.equal(sent.expiresInMinutes, 30);
  const urlToken = new URL(sent.resetUrl).searchParams.get("token") || "";
  assert.equal(isValidPasswordResetTokenFormat(urlToken), true);
  assert.equal(state.tokens[0].tokenHash, hashPasswordResetToken(urlToken));
  assert.notEqual(state.tokens[0].tokenHash, urlToken);
});

test("POST /api/auth/reset-password menolak token invalid/kadaluarsa/ADMIN, serta memperbarui password, passwordChangedAt, dan audit log atomik untuk non-Admin", async () => {
  const validRawToken = generatePasswordResetToken();
  const expiredRawToken = generatePasswordResetToken();
  const adminRawToken = generatePasswordResetToken();

  const state: {
    users: MockUserRecord[];
    tokens: MockTokenRecord[];
    sentEmails: Array<{
      to: string;
      name: string;
      resetUrl: string;
      expiresInMinutes: number;
    }>;
    auditLogs: Array<Record<string, unknown>>;
  } = {
    users: [
      {
        id: "u_florist_1",
        name: "Toko Mawar",
        email: "toko@example.com",
        role: "FLORIST",
        isActive: true,
        password: "old-bcrypt-hash",
        passwordChangedAt: null,
      },
      {
        id: "u_admin_1",
        name: "Admin FloraHub",
        email: "admin@florahub.biz.id",
        role: "ADMIN",
        isActive: true,
        password: "admin-old-hash",
        passwordChangedAt: null,
      },
    ],
    tokens: [
      {
        id: "tok_valid",
        userId: "u_florist_1",
        tokenHash: hashPasswordResetToken(validRawToken),
        expiresAt: new Date(Date.now() + 15 * 60_000),
        usedAt: null,
        createdAt: new Date(),
      },
      {
        id: "tok_expired",
        userId: "u_florist_1",
        tokenHash: hashPasswordResetToken(expiredRawToken),
        expiresAt: new Date(Date.now() - 60_000),
        usedAt: null,
        createdAt: new Date(),
      },
      {
        id: "tok_admin",
        userId: "u_admin_1",
        tokenHash: hashPasswordResetToken(adminRawToken),
        expiresAt: new Date(Date.now() + 15 * 60_000),
        usedAt: null,
        createdAt: new Date(),
      },
    ],
    sentEmails: [],
    auditLogs: [] as Array<Record<string, unknown>>,
  };

  const { resetRoute } = loadPasswordResetRoutesWithMocks(state);

  // GET valid & invalid
  const verifyValid = await resetRoute.GET(
    new Request(
      `http://localhost:3000/api/auth/reset-password?token=${validRawToken}`,
      { headers: { "x-forwarded-for": "10.0.2.1" } },
    ),
  );
  assert.equal(verifyValid.status, 200);

  const verifyAdmin = await resetRoute.GET(
    new Request(
      `http://localhost:3000/api/auth/reset-password?token=${adminRawToken}`,
      { headers: { "x-forwarded-for": "10.0.2.2" } },
    ),
  );
  assert.equal(verifyAdmin.status, 400);

  // Token kadaluarsa ditolak 400
  const resExpired = await resetRoute.POST(
    new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.2.3",
      },
      body: JSON.stringify({
        token: expiredRawToken,
        password: "PasswordBaruAman99",
      }),
    }),
  );
  assert.equal(resExpired.status, 400);

  // Token ADMIN ditolak 400
  const resAdmin = await resetRoute.POST(
    new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.2.4",
      },
      body: JSON.stringify({
        token: adminRawToken,
        password: "PasswordBaruAman99",
      }),
    }),
  );
  assert.equal(resAdmin.status, 400);

  // Token valid non-Admin -> sukses 200, password berubah, passwordChangedAt terisi, usedAt terisi, audit log tercatat
  const resValid = await resetRoute.POST(
    new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.2.5",
        "user-agent": "NodeTestRunner/1.0",
      },
      body: JSON.stringify({
        token: validRawToken,
        password: "PasswordBaruAman99",
      }),
    }),
  );
  assert.equal(resValid.status, 200);

  const updatedFlorist = state.users[0];
  assert.notEqual(updatedFlorist.password, "old-bcrypt-hash");
  assert.notEqual(updatedFlorist.password, "PasswordBaruAman99");
  assert.ok(updatedFlorist.passwordChangedAt instanceof Date);

  const claimedToken = state.tokens.find((t) => t.id === "tok_valid");
  assert.ok(claimedToken?.usedAt instanceof Date);

  assert.equal(state.auditLogs.length, 1);
  assert.equal(state.auditLogs[0].action, "UPDATE");
  assert.equal(state.auditLogs[0].entity, "User");
  assert.equal(state.auditLogs[0].entityId, "u_florist_1");
  const serializedAudit = JSON.stringify(state.auditLogs[0]);
  assert.equal(serializedAudit.includes("PasswordBaruAman99"), false);
  assert.equal(serializedAudit.includes(validRawToken), false);

  // Pemakaian ulang token yang sama wajib gagal (400)
  const resReuse = await resetRoute.POST(
    new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.2.6",
      },
      body: JSON.stringify({
        token: validRawToken,
        password: "PasswordBaruLain88",
      }),
    }),
  );
  assert.equal(resReuse.status, 400);
});
