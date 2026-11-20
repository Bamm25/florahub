import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "./prisma";
import { createAuditLog } from "./auditLog";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "./rate-limit";
import {
  DEFAULT_MAX_AGE_SECONDS,
  decodeRfc7519Jwt,
  encodeRfc7519Jwt,
  isTokenIssuedBeforePasswordChange,
} from "./jwt-rfc7519";

// Konfigurasi opsi autentikasi NextAuth dengan strategi JWT standar RFC 7519 (JWS HS256)
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: DEFAULT_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: DEFAULT_MAX_AGE_SECONDS,
    encode: encodeRfc7519Jwt,
    decode: decodeRfc7519Jwt,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email dan password harus diisi");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const limitCheck = checkRateLimit(
          `login:${normalizedEmail}`,
          10,
          60_000,
        );
        if (!limitCheck.allowed) {
          throw new Error(
            "Terlalu banyak percobaan login. Silakan tunggu sebentar.",
          );
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.password || !user.isActive) {
          throw new Error("Email atau password salah atau akun tidak aktif");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValidPassword) {
          throw new Error("Email atau password salah");
        }

        const rawIp =
          req?.headers?.["x-forwarded-for"] ?? req?.headers?.["x-real-ip"];
        const rawUa = req?.headers?.["user-agent"];
        await createAuditLog({
          userId: user.id,
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          newValue: { role: user.role, method: "credentials" },
          ipAddress: typeof rawIp === "string" ? rawIp : undefined,
          userAgent: typeof rawUa === "string" ? rawUa : undefined,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const isFreshSignIn = Boolean(user);
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as typeof user & { role: Role }).role;
        token.authTime = Date.now();
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      if (token.id && !token.sub) {
        token.sub = token.id as string;
      }
      // Sinkronisasi data ID, status aktif, dan peran pengguna dari basis data ke token JWT
      const lookupId = (token.id || token.sub) as string | undefined;
      if (lookupId || token.email) {
        try {
          const dbUser = lookupId
            ? await prisma.user.findUnique({
                where: { id: lookupId },
                select: {
                  id: true,
                  role: true,
                  name: true,
                  isActive: true,
                  passwordChangedAt: true,
                  floristProfile: { select: { shopName: true } },
                },
              })
            : await prisma.user.findUnique({
                where: { email: token.email as string },
                select: {
                  id: true,
                  role: true,
                  name: true,
                  isActive: true,
                  passwordChangedAt: true,
                  floristProfile: { select: { shopName: true } },
                },
              });
          if (!dbUser || !dbUser.isActive) {
            return {
              ...token,
              id: "",
              sub: "",
              isActive: false,
            };
          }
          if (isFreshSignIn && dbUser.passwordChangedAt) {
            token.authTime = Math.max(
              Date.now(),
              dbUser.passwordChangedAt.getTime(),
            );
          } else if (
            !isFreshSignIn &&
            isTokenIssuedBeforePasswordChange(token, dbUser.passwordChangedAt)
          ) {
            return {
              ...token,
              id: "",
              sub: "",
              isActive: false,
            };
          }
          token.id = dbUser.id;
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.isActive = true;
          const resolvedName =
            dbUser.role === "FLORIST" && dbUser.floristProfile?.shopName
              ? dbUser.floristProfile.shopName
              : dbUser.name;
          if (resolvedName) {
            token.name = resolvedName;
          }
        } catch {
          // Abaikan galat pembacaan basis data selama proses verifikasi token
        }
      }
      // Perbarui data nama pengguna tervalidasi saat terjadi pemanggilan pembaruan sesi
      if (
        trigger === "update" &&
        typeof session?.name === "string" &&
        session.name.trim().length > 0 &&
        session.name.trim().length <= 100
      ) {
        token.name = session.name.trim();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.isActive === false || (!token.id && !token.sub)) {
        session.user = undefined as never;
        return session;
      }
      if (session.user) {
        Object.assign(session.user, {
          id: (token.id as string) || (token.sub as string),
          role: token.role as Role,
        });
        if (token.name) {
          session.user.name = token.name as string;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
