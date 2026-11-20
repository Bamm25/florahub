"use client";

import Modal from "@/components/forms/Modal";
import { FilterBar } from "@/components/ui";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import {
  fetchAdminUsers,
  updateAdminUserStatus,
  type AdminUserItem,
  type AdminUserRole,
  type AdminUserStatusReason,
  type AdminUsersPage,
} from "@/lib/api/admin";
import { formatDate } from "@/lib/utils/formatters";
import { maskEmail } from "@/lib/utils/masking";
import { Loader2 } from "lucide-react";
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
  ADMIN: "Admin",
  CUSTOMER: "Pelanggan",
  FLORIST: "Florist",
  SUPPLIER: "Supplier",
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
  const [refreshing, setRefreshing] = useState(false);
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

  const reload = useCallback((silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (query.trim() !== search) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      try {
        const result = await fetchAdminUsers(
          {
            page,
            role: role === "ALL" ? undefined : (role as AdminUserRole),
            search,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
          setLoading(false);
          setRefreshing(false);
        }
      } catch (err) {
        if (
          !controller.signal.aborted &&
          !(err instanceof Error && err.name === "AbortError")
        ) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat pengguna",
          );
          setLoading(false);
          setRefreshing(false);
        }
      }
    });
    return () => controller.abort();
  }, [page, role, search, query, refreshKey]);

  async function confirmStatusChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !reason || saving) return;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      await updateAdminUserStatus(selected.id, !selected.isActive, reason);
      const updatedName = selected.name;
      setSelected(null);
      setReason("");
      setNotice(`Status akun ${updatedName} berhasil diperbarui.`);
      reload(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal mengubah status akun",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Editorial Gelap */}
      <header className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Pengawasan Platform
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Manajemen Pengguna
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Cari akun lintas peran dan kelola status akses tanpa mengubah peran
            atau riwayat transaksi historis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => reload(Boolean(data))}
          disabled={loading || refreshing}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-sm border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50 lg:self-end"
        >
          {refreshing && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          <span>{refreshing ? "Menyegarkan..." : "Segarkan Data"}</span>
        </button>
      </header>

      {/* Panel Pencarian & Filter */}
      <section
        aria-label="Pencarian dan filter pengguna"
        className="surface-panel space-y-4"
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari nama atau email pengguna..."
        />
        <FilterBar
          filters={roleFilters}
          activeFilter={role}
          onChange={(nextRole) => {
            setData(null);
            setRole(nextRole);
            setPage(1);
            setLoading(true);
          }}
        />
      </section>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {error && data && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <span>{error}</span>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => reload(true)}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="surface-panel py-14">
          <LoadingSpinner message="Memuat daftar pengguna..." />
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => reload(false)} />
      ) : (
        data && (
          <>
            {data.users.length === 0 ? (
              <EmptyState
                title="Tidak ada akun yang sesuai"
                description="Coba ubah kata kunci pencarian atau pilih filter peran lainnya."
              />
            ) : (
              <section className="space-y-4">
                <p className="text-sm text-muted-foreground tabular-nums">
                  Menampilkan {data.users.length} dari{" "}
                  <strong className="font-semibold text-foreground">
                    {data.pagination.total.toLocaleString("id-ID")}
                  </strong>{" "}
                  akun terdaftar
                </p>

                {/* Tabel Desktop */}
                <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Tabel daftar pengguna platform"
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-5 py-3.5">
                            Pengguna
                          </th>
                          <th scope="col" className="px-5 py-3.5">
                            Peran
                          </th>
                          <th scope="col" className="px-5 py-3.5">
                            Status
                          </th>
                          <th scope="col" className="px-5 py-3.5">
                            Terdaftar
                          </th>
                          <th scope="col" className="px-5 py-3.5 text-right">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface">
                        {data.users.map((user) => (
                          <tr
                            key={user.id}
                            className="transition-colors hover:bg-surface-dim"
                          >
                            <td className="px-5 py-4 align-middle">
                              <p className="font-semibold text-foreground">
                                {user.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {maskEmail(user.email)}
                              </p>
                            </td>
                            <td className="px-5 py-4 align-middle text-foreground">
                              {roleLabels[user.role]}
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                  user.isActive
                                    ? "border-success/25 bg-success/10 text-success"
                                    : "border-error/25 bg-error/10 text-error"
                                }`}
                              >
                                {user.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-middle text-xs text-muted-foreground">
                              <time
                                dateTime={user.createdAt}
                                className="tabular-nums"
                              >
                                {formatDate(user.createdAt)}
                              </time>
                            </td>
                            <td className="px-5 py-4 text-right align-middle">
                              {user.role === "ADMIN" ||
                              user.id === currentUserId ? (
                                <span className="text-xs text-muted-foreground">
                                  Dilindungi
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={saving}
                                  className="inline-flex min-h-9 items-center rounded-sm border border-border bg-surface-container-low px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                                  onClick={() => {
                                    setSelected(user);
                                    setReason("");
                                    setActionError(null);
                                  }}
                                >
                                  {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Kartu Mobile */}
                <div className="space-y-3 md:hidden">
                  {data.users.map((user) => (
                    <article
                      key={user.id}
                      className="surface-panel space-y-3 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {maskEmail(user.email)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            user.isActive
                              ? "border-success/25 bg-success/10 text-success"
                              : "border-error/25 bg-error/10 text-error"
                          }`}
                        >
                          {user.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {roleLabels[user.role]}
                        </span>
                        <time
                          dateTime={user.createdAt}
                          className="tabular-nums"
                        >
                          {formatDate(user.createdAt)}
                        </time>
                      </div>

                      {user.role === "ADMIN" || user.id === currentUserId ? (
                        <p className="rounded-sm border border-border bg-surface-container-low px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                          Akun Dilindungi
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setSelected(user);
                            setReason("");
                            setActionError(null);
                          }}
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                        >
                          {user.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <Pagination
              variant="compact"
              ariaLabel="Halaman pengguna"
              currentPage={data.pagination.page}
              totalPages={Math.max(1, data.pagination.totalPages)}
              disabled={loading || refreshing}
              onPageChange={(nextPage) => {
                setData(null);
                setPage(nextPage);
                setLoading(true);
              }}
            />
          </>
        )
      )}

      {/* Modal Ubah Status Akun Pengguna */}
      <Modal
        isOpen={selected !== null}
        onClose={() => {
          if (!saving) {
            setSelected(null);
            setReason("");
            setActionError(null);
          }
        }}
        headerVariant="dark"
        kicker="Status Akses Akun"
        title={
          selected?.isActive
            ? "Nonaktifkan Akun Pengguna?"
            : "Aktifkan Akun Pengguna?"
        }
        subtitle={
          selected ? `${selected.name} · ${roleLabels[selected.role]}` : undefined
        }
        size="sm"
        footer={
          selected ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setSelected(null);
                  setReason("");
                  setActionError(null);
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                form="admin-user-status-form"
                disabled={!reason || saving}
                className={`inline-flex min-h-10 items-center justify-center rounded-sm px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  selected.isActive
                    ? "bg-error text-error-foreground hover:bg-error/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {saving ? "Menyimpan..." : "Konfirmasi"}
              </button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <form
            id="admin-user-status-form"
            onSubmit={confirmStatusChange}
            className="space-y-4"
          >
            <p className="rounded-md border border-border bg-surface-container-low p-3.5 text-xs leading-relaxed text-muted-foreground">
              {selected.isActive
                ? "Pengguna tidak akan dapat masuk ke portal setelah dinonaktifkan. Seluruh riwayat transaksi tetap terjaga."
                : "Pengguna akan langsung mendapatkan akses masuk ke portal kembali sesuai perannya."}
            </p>

            <div>
              <label
                htmlFor="admin-user-reason"
                className="block text-sm font-medium text-foreground"
              >
                Alasan perubahan{" "}
                <span className="text-error" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="admin-user-reason"
                name="reason"
                required
                aria-describedby="admin-user-reason-hint"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as AdminUserStatusReason | "")
                }
                disabled={saving}
                className="input-field mt-1.5"
              >
                <option value="">Pilih alasan</option>
                {reasons.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p
                id="admin-user-reason-hint"
                className="mt-1.5 text-xs text-muted-foreground"
              >
                Setiap perubahan status akses tercatat permanen pada audit log.
              </p>
            </div>

            {actionError && (
              <div
                role="alert"
                className="rounded-md border border-error/30 bg-error/5 p-3.5 text-sm text-error"
              >
                {actionError}
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
