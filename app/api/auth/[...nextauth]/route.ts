import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

// Inisialisasi route handler otentikasi NextAuth
const handler = NextAuth(authOptions);

// Ekspor handler HTTP GET dan POST untuk siklus otentikasi NextAuth
export { handler as GET, handler as POST };
