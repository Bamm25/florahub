import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fetchAdminUsers, updateAdminUserStatus } from "../lib/api/admin";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

test("Daftar pengguna membentuk filter dan membaca kontrak data", async () => {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/admin/users");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("role"), "FLORIST");
    assert.equal(url.searchParams.get("search"), "mawar & melati");
    assert.equal(init?.cache, "no-store");
    return Response.json({ success: true, data: {
      users: [], pagination: { page: 2, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: true },
    } });
  };
  const data = await fetchAdminUsers({ page: 2, role: "FLORIST", search: " mawar & melati " });
  assert.equal(data.pagination.page, 2);
});

test("Mutasi mengirim status dan alasan terkontrol, tanpa field lain", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "/api/admin/users/akun%2F1");
    assert.equal(init?.method, "PATCH");
    assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(init?.body)), { isActive: false, reasonCode: "USER_REQUEST" });
    return Response.json({ success: true });
  };
  await updateAdminUserStatus("akun/1", false, "USER_REQUEST");
});

test("HTTP gagal dan respons 200 tanpa success tidak dianggap berhasil", async () => {
  globalThis.fetch = async () => Response.json({ success: false, message: "Akses ditolak" }, { status: 403 });
  await assert.rejects(updateAdminUserStatus("akun1", false, "USER_REQUEST"), /Akses ditolak/);
  globalThis.fetch = async () => Response.json({ success: false });
  await assert.rejects(updateAdminUserStatus("akun1", false, "USER_REQUEST"), /gagal/);
});
