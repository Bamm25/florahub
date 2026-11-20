// Antarmuka item galat validasi field dari server
export interface ApiFieldIssue {
  path?: Array<string | number>;
  message: string;
}

// Kelas error terstandarisasi untuk klien API FloraHub
export class ApiClientError extends Error {
  status: number;
  errors?: ApiFieldIssue[];

  constructor(message: string, status: number, errors?: ApiFieldIssue[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
  }
}

// Helper generic untuk request HTTP JSON / FormData terstandarisasi
export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const method = (options?.method ?? "GET").toUpperCase();

  const response = await fetch(url, {
    ...options,
    cache: options?.cache ?? (method === "GET" ? "no-store" : undefined),
    headers: isFormData
      ? { ...(options?.headers || {}) }
      : {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const issues = Array.isArray(payload?.errors)
      ? (payload.errors as ApiFieldIssue[])
      : undefined;
    const errorMessage =
      issues?.[0]?.message ||
      payload?.message ||
      payload?.error ||
      `Permintaan gagal dengan status ${response.status}`;
    throw new ApiClientError(errorMessage, response.status, issues);
  }

  return payload as T;
}
