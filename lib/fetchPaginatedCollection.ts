// Collect all pages before showing totals or filtering; APIs default to twenty rows.
export async function fetchPaginatedCollection<T>(
  path: string,
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; ; page++) {
    const query = new URLSearchParams(path.split("?")[1] || "");
    query.set("page", String(page));
    query.set("limit", "100");
    const response = await fetcher(`${path.split("?")[0]}?${query}`);
    const body = await response.json();
    if (!response.ok || !body?.success || !Array.isArray(body.data?.[key])) {
      throw new Error(body?.message || "Gagal memuat seluruh data");
    }
    results.push(...body.data[key]);
    if (!body.data.pagination?.hasNext && page >= (body.data.pagination?.totalPages ?? 1)) break;
  }
  return results;
}
