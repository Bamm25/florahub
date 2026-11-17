"use client";

import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FilterBar from "@/components/ui/FilterBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SearchInput from "@/components/ui/SearchInput";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAdminUsers, updateAdminUserStatus,
  type AdminUserItem, type AdminUserRole, type AdminUserStatusReason,
  type AdminUsersPage,
} from "@/lib/api/admin";
import { formatDate } from "@/lib/utils/formatters";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

const roleFilters = [
  { id: "ALL", label: "Semua" },
  { id: "CUSTOMER", label: "Pelanggan" },
  { id: "FLORIST", label: "Florist" },
  { id: "SUPPLIER", label: "Supplier" },
  { id: "ADMIN", label: "Admin" },
];
const roleLabels: Record<AdminUserRole, string> = {
  ADMIN: "Admin", CUSTOMER: "Pelanggan", FLORIST: "Florist", SUPPLIER: "Supplier",
};
const reasons: Array<{ code: AdminUserStatusReason; label: string }> = [
  { code: "POLICY_VIOLATION", label: "Pelanggaran kebijakan" },
  { code: "USER_REQUEST", label: "Permintaan pengguna" },
  { code: "ACCOUNT_RECOVERY", label: "Pemulihan akun" },
];

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUsersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<AdminUserItem | null>(null);
  const [reason, setReason] = useState<AdminUserStatusReason | "">("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    if (query.trim() === search) return;
    const timer = window.setTimeout(() => {
      setData(null);
      setLoading(true);
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);
  useEffect(() => {
    if (query.trim() !== search) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      try {
        const result = await fetchAdminUsers({
          page,
          role: role === "ALL" ? undefined : (role as AdminUserRole),
          search,
        }, controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Gagal memuat pengguna");
          setLoading(false);
        }
      }
    });
    return () => controller.abort();
  }, [page, role, search, query, refreshKey]);

  async function confirmStatusChange() {
    if (!selected || !reason || saving) return;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      await updateAdminUserStatus(selected.id, !selected.isActive, reason);
      setSelected(null);
      setReason("");
      setNotice(`Status akun ${selected.name} berhasil diperbarui.`);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengubah status akun");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pengawasan Platform</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Manajemen Pengguna</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cari akun dan kelola status akses tanpa mengubah peran atau riwayat transaksi.</p>
      </header>
      <div className="surface-panel space-y-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Cari nama atau email" />
        <FilterBar filters={roleFilters} activeFilter={role} onChange={(nextRole) => {
          setData(null); setRole(nextRole); setPage(1); setLoading(true);
        }} />
      </div>
      {notice && <p role="status" className="rounded-xl bg-primary-container p-4 text-sm text-primary-container-foreground">{notice}</p>}
      {error && data && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-card p-4 text-sm text-foreground"><span>{error}</span><button type="button" className="btn-tertiary" onClick={reload}>Coba lagi</button></div>}
      {loading && !data ? (
        <LoadingSpinner message="Memuat daftar pengguna..." />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && (
        <>
          <div className="surface-panel overflow-x-auto">
            <div className="mb-4 text-sm text-muted-foreground">{data.pagination.total} akun ditemukan</div>
            {data.users.length === 0 ? (
              <EmptyState title="Tidak ada akun" description="Coba kata kunci atau filter peran lainnya." />
            ) : (
              <table className="w-full min-w-160 text-left text-sm">
                <thead className="border-b border-border text-muted-foreground"><tr><th className="pb-3 font-semibold">Pengguna</th><th className="pb-3 font-semibold">Peran</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Terdaftar</th><th className="pb-3 text-right font-semibold">Aksi</th></tr></thead>
                <tbody>{data.users.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-0">
                    <td className="py-4 pr-4"><p className="font-semibold text-foreground">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></td>
                    <td className="py-4 pr-4 text-foreground">{roleLabels[user.role]}</td>
                    <td className="py-4 pr-4"><span className={user.isActive ? "font-medium text-success-foreground" : "font-medium text-error"}>{user.isActive ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td className="py-4 text-right">{user.role === "ADMIN" || user.id === currentUserId ? <span className="text-xs text-muted-foreground">Dilindungi</span> : <button type="button" disabled={saving} className="rounded-lg px-3 py-2 font-semibold text-primary hover:bg-primary-container disabled:opacity-50" onClick={() => { setSelected(user); setReason(""); setActionError(null); }}>{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
          <nav aria-label="Halaman pengguna" className="flex items-center justify-between gap-4 text-sm">
            <button type="button" className="btn-tertiary" disabled={!data.pagination.hasPrev || loading} onClick={() => { setData(null); setPage((value) => value - 1); setLoading(true); }}>Sebelumnya</button>
            <span className="text-muted-foreground">Halaman {data.pagination.page} dari {Math.max(1, data.pagination.totalPages)}</span>
            <button type="button" className="btn-tertiary" disabled={!data.pagination.hasNext || loading} onClick={() => { setData(null); setPage((value) => value + 1); setLoading(true); }}>Berikutnya</button>
          </nav>
        </>
      )}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !saving) { setSelected(null); setReason(""); setActionError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.isActive ? "Nonaktifkan akun?" : "Aktifkan akun?"}</DialogTitle>
            <DialogDescription>Perubahan akses untuk {selected?.name}. Riwayat transaksi tetap tersimpan.</DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm font-medium text-foreground" htmlFor="admin-user-reason">Alasan perubahan</label>
          <select id="admin-user-reason" value={reason} onChange={(event) => setReason(event.target.value as AdminUserStatusReason | "")} disabled={saving} className="input-field">
            <option value="">Pilih alasan</option>
            {reasons.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          {actionError && <p role="alert" className="text-sm text-error">{actionError}</p>}
          <DialogFooter>
            <button type="button" className="btn-tertiary" disabled={saving} onClick={() => setSelected(null)}>Batal</button>
            <button type="button" className="btn-primary" disabled={!reason || saving} onClick={() => void confirmStatusChange()}>{saving ? "Menyimpan..." : "Konfirmasi"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
