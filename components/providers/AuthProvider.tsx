"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

// Antarmuka properti penyedia otentikasi
interface AuthProviderProps {
  children: React.ReactNode;
}

// Komponen penyedia konteks sesi otentikasi NextAuth
export default function AuthProvider({ children }: AuthProviderProps) {
  // Bungkus komponen anak dengan penyedia sesi
  return <SessionProvider>{children}</SessionProvider>;
}
