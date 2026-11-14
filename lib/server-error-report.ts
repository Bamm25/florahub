import "server-only";

/** Laporkan kegagalan operasional tanpa menulis payload, kredensial, atau PII ke log. */
export function reportServerError(context: string, error?: unknown): void {
  const kind = error instanceof Error ? error.name : "UnknownError";
  process.stderr.write(`[${new Date().toISOString()}] ${context}: ${kind}\n`);
}
