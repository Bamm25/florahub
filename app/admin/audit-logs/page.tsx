"use client";

import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FilterBar from "@/components/ui/FilterBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAdminAuditLogs,
  type AdminAuditAction,
  type AdminAuditLogItem,
  type AdminAuditLogsPage,
} from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils/formatters";
import {
  Calendar,
  ClipboardList,
  Eye,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const actionFilters = [
  { id: "ALL", label: "Semua Aksi" },
  { id: "CREATE", label: "CREATE" },
  { id: "UPDATE", label: "UPDATE" },
  { id: "DELETE", label: "DELETE" },
  { id: "PAYMENT", label: "PAYMENT" },
  { id: "REFUND", label: "REFUND" },
  { id: "LOGIN", label: "LOGIN" },
];

const entityOptions = [
  { id: "ALL", label: "Semua Entitas" },
  { id: "User", label: "User" },
  { id: "Coupon", label: "Coupon" },
  { id: "FlowerCategory", label: "FlowerCategory" },
  { id: "Stock", label: "Stock" },
  { id: "Shipment", label: "Shipment" },
];

const actionBadgeMap: Record<
  AdminAuditAction,
  { label: string; className: string }
> = {
  CREATE: {
    label: "CREATE",
    className: "border-success/25 bg-success/10 text-success",
  },
  UPDATE: {
    label: "UPDATE",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  DELETE: {
    label: "DELETE",
    className: "border-error/25 bg-error/10 text-error",
  },
  PAYMENT: {
    label: "PAYMENT",
    className: "border-success/25 bg-success/10 text-success",
  },
  REFUND: {
    label: "REFUND",
    className: "border-warning/25 bg-warning/10 text-warning",
  },
  LOGIN: {
    label: "LOGIN",
    className: "border-info/25 bg-info/10 text-info",
  },
  LOGOUT: {
    label: "LOGOUT",
    className: "border-border bg-surface-container text-muted-foreground",
  },
};

function renderActionBadge(action: AdminAuditAction) {
  const cfg = actionBadgeMap[action] ?? {
    label: action,
    className: "border-border bg-surface-container text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function summarizePayload(payload: Record<string, unknown> | null): string {
  if (!payload) return "-";
  const entries = Object.entries(payload);
  if (entries.length === 0) return "-";
  return entries
    .slice(0, 3)
    .map(([key, val]) => `${key}: ${typeof val === "object" ? "{...}" : String(val)}`)
    .join(" • ");
}

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminAuditLogsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(
    null,
  );

  const isDateRangeInvalid =
    Boolean(dateFrom) && Boolean(dateTo) && dateFrom > dateTo;

  // Debounce pencarian teks 350ms
  useEffect(() => {
    if (query.trim() === search) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (query.trim() !== search || isDateRangeInvalid) return;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetchAdminAuditLogs(
            {
              page,
              limit: 20,
              action:
                actionFilter === "ALL"
                  ? undefined
                  : (actionFilter as AdminAuditAction),
              entity: entityFilter === "ALL" ? undefined : entityFilter,
              from: dateFrom
                ? new Date(`${dateFrom}T00:00:00`).toISOString()
                : undefined,
              to: dateTo
                ? new Date(`${dateTo}T23:59:59.999`).toISOString()
                : undefined,
              search: search || undefined,
            },
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setData(res);
            setError(null);
            setLoading(false);
          }
        } catch (err) {
          if (
            controller.signal.aborted ||
            (err instanceof Error && err.name === "AbortError")
          ) {
            return;
          }
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat daftar audit log sistem",
          );
          setLoading(false);
        }
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    actionFilter,
    entityFilter,
    dateFrom,
    dateTo,
    isDateRangeInvalid,
    page,
    search,
    query,
    refreshKey,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-2xl bg-surface-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold tracking-wider text-kicker uppercase">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Audit Trail &amp; Keamanan
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Log Audit Aktivitas Sistem
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/70">
            Telusuri riwayat mutasi sensitif lintas aktor secara read-only
            dengan proteksi redaksi PII dan kredensial.
          </p>
        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading || isDateRangeInvalid}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:self-center"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>Muat Ulang</span>
        </button>
      </header>

      {/* Panel Filter */}
      <section className="surface-panel space-y-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari ID entitas, jenis entitas, nama aktor, atau email..."
        />

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Filter Aksi
          </p>
          <FilterBar
            filters={actionFilters}
            activeFilter={actionFilter}
            onChange={(nextAction) => {
              setLoading(true);
              setActionFilter(nextAction);
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Filter Entitas
          </p>
          <div className="flex flex-wrap gap-2">
            {entityOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setEntityFilter(item.id);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  entityFilter === item.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-surface-container-low text-muted-foreground hover:bg-surface-container hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label
              htmlFor="audit-date-from"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Dari Tanggal</span>
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
                if (!e.target.value || !dateTo || e.target.value <= dateTo) {
                  setLoading(true);
                }
              }}
              className="input-field mt-1 w-full"
            />
          </div>

          <div>
            <label
              htmlFor="audit-date-to"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Sampai Tanggal</span>
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
                if (!dateFrom || !e.target.value || dateFrom <= e.target.value) {
                  setLoading(true);
                }
              }}
              className="input-field mt-1 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="btn-secondary w-full py-2.5 text-xs font-semibold sm:w-auto"
              >
                Reset Tanggal
              </button>
            )}
          </div>
        </div>

        {isDateRangeInvalid && (
          <div
            role="alert"
            className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-medium text-error"
          >
            Tanggal mulai tidak boleh melebihi tanggal akhir.
          </div>
        )}
      </section>

      {/* Konten Utama */}
      {isDateRangeInvalid ? null : loading ? (
        <div className="surface-panel py-14">
          <LoadingSpinner message="Memuat rekaman log audit sistem..." />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.logs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Belum ada rekaman audit log yang sesuai"
          description="Tidak ditemukan aktivitas audit dengan filter aksi, entitas, atau rentang tanggal saat ini."
        />
      ) : (
        <section className="space-y-4">
          {/* Tabel Desktop */}
          <div className="surface-panel hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-container-low text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3.5">Waktu</th>
                    <th className="px-4 py-3.5">Aktor (Masked)</th>
                    <th className="px-4 py-3.5">Aksi</th>
                    <th className="px-4 py-3.5">Entitas &amp; ID</th>
                    <th className="px-4 py-3.5">Ringkasan Perubahan</th>
                    <th className="px-4 py-3.5 text-right">Inspeksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {data.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-surface-dim"
                    >
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {formatDateTime(log.createdAt)}
                        </div>
                        {log.maskedIpAddress && (
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            IP: {log.maskedIpAddress}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {log.actor ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {log.actor.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.actor.role} • {log.actor.maskedEmail}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sistem / Otomatis
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {renderActionBadge(log.action)}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-foreground">
                          {log.entity}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {log.entityId}
                        </div>
                      </td>

                      <td className="max-w-xs px-4 py-3.5 align-top">
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {summarizePayload(log.newValue ?? log.oldValue)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Lihat Perubahan</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kartu Mobile */}
          <div className="space-y-3 md:hidden">
            {data.logs.map((log) => (
              <article key={log.id} className="surface-panel space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{log.entity}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {log.entityId}
                    </p>
                  </div>
                  {renderActionBadge(log.action)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {log.actor
                    ? `${log.actor.name} (${log.actor.role})`
                    : "Sistem / Otomatis"}{" "}
                  • {formatDateTime(log.createdAt)}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lihat Perubahan</span>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Paginasi */}
      {!isDateRangeInvalid && data && data.pagination.totalPages > 1 && (
        <div className="surface-panel flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Menampilkan halaman {data.pagination.page} dari{" "}
            {data.pagination.totalPages} ({data.pagination.total} total rekaman)
          </p>
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            disabled={loading}
            onPageChange={(nextPage) => {
              setLoading(true);
              setPage(nextPage);
            }}
          />
        </div>
      )}

      {/* Modal Detail Audit Log */}
      <Dialog
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detail Audit {selectedLog?.entity} ({selectedLog?.action})
            </DialogTitle>
            <DialogDescription>
              Rekaman perubahan bersifat permanen (read-only). Informasi sensitif
              dan PII telah disamarkan secara otomatis.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 rounded-xl border border-border bg-surface-container-low p-4 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Aktor Pelaksana</span>
                  </p>
                  {selectedLog.actor ? (
                    <>
                      <p className="mt-1 font-medium text-foreground">
                        {selectedLog.actor.name} ({selectedLog.actor.role})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedLog.actor.maskedEmail}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sistem / Otomatis
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Metadata Teknis
                  </p>
                  <p className="mt-1 font-mono text-xs text-foreground">
                    ID Entitas: {selectedLog.entityId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Waktu: {formatDateTime(selectedLog.createdAt)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    IP: {selectedLog.maskedIpAddress || "-"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Nilai Sebelum (oldValue)
                  </p>
                  <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-surface-container-low p-3 font-mono text-xs text-foreground">
                    {selectedLog.oldValue
                      ? JSON.stringify(selectedLog.oldValue, null, 2)
                      : "Tidak ada nilai sebelumnya"}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Nilai Sesudah (newValue)
                  </p>
                  <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-surface-container-low p-3 font-mono text-xs text-foreground">
                    {selectedLog.newValue
                      ? JSON.stringify(selectedLog.newValue, null, 2)
                      : "Tidak ada nilai baru"}
                  </pre>
                </div>
              </div>

              {selectedLog.userAgent && (
                <div className="rounded-xl border border-border bg-surface-container-low p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    User Agent
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Tutup
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
