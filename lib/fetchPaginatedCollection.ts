const MAX_PAGES = 100;

// Fungsi untuk mengambil seluruh halaman data terpaginasi dari endpoint API
export async function fetchPaginatedCollection<T>(
  path: string,
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const query = new URLSearchParams(path.split("?")[1] || "");
    query.set("page", String(page));
    query.set("limit", "100");
    const targetUrl = `${path.split("?")[0]}?${query}`;
    const response =
      fetcher === fetch
        ? await fetcher(targetUrl, { cache: "no-store" })
        : await fetcher(targetUrl);
    const body = await response.json();
    if (!response.ok || !body?.success || !Array.isArray(body.data?.[key])) {
      throw new Error(body?.message || "Gagal memuat seluruh data");
    }
    results.push(...body.data[key]);
    if (!body.data.pagination?.hasNext && page >= (body.data.pagination?.totalPages ?? 1)) break;
  }
  return results;
}
