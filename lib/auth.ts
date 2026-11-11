import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

// Konfigurasi opsi autentikasi NextAuth dengan strategi JWT dan validasi kredensial
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email dan password harus diisi");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as typeof user & { role: Role }).role;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      // Sinkronisasi data ID dan peran pengguna dari basis data ke token JWT
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, name: true, isActive: true },
          });
          if (dbUser && dbUser.isActive) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            if (dbUser.name) {
              token.name = dbUser.name;
            }
          }
        } catch {
          // Abaikan galat pembacaan basis data selama proses verifikasi token
        }
      }
      // Perbarui data nama pengguna saat terjadi pemanggilan pembaruan sesi
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
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
