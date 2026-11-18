// Helper pemeriksaan error constraint unik Prisma (P2002) terpisah dari koneksi pool
export function isPrismaUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "P2002") {
    return true;
  }
  return (
    error instanceof Error && error.message.includes("Unique constraint failed")
  );
}
