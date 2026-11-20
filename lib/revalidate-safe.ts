import { revalidatePath } from "next/cache";

/**
 * Revalidates Next.js cache paths without throwing when invoked inside standalone unit tests.
 */
export function safeRevalidatePaths(paths: readonly string[]): void {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Abaikan ketika dipanggil di luar siklus request Next.js (mis. pengujian unit).
    }
  }
}
