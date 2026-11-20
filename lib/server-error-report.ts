/** Laporkan kegagalan operasional tanpa menulis payload, kredensial, atau PII ke log. */
export function reportServerError(context: string, error?: unknown): void {
  const kind = error instanceof Error ? error.name : "UnknownError";
  const rawCode =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  const codeSuffix = typeof rawCode === "string" && rawCode ? ` (${rawCode})` : "";
  process.stderr.write(`[${new Date().toISOString()}] ${context}: ${kind}${codeSuffix}\n`);
}
