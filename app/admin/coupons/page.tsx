"use client";

import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FilterBar from "@/components/ui/FilterBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import TabNavigation from "@/components/ui/TabNavigation";
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
  createAdminCategory,
  createAdminCoupon,
  deleteAdminCategory,
  deleteAdminCoupon,
  fetchAdminCategories,
  fetchAdminCoupons,
  updateAdminCategory,
  updateAdminCoupon,
  type AdminCategoriesPage,
  type AdminCategoryItem,
  type AdminCouponItem,
  type AdminCouponsPage,
  type AdminCouponType,
} from "@/lib/api/admin";
import { formatDateTime, formatRupiah } from "@/lib/utils/formatters";
import {
  Archive,
  CheckCircle2,
  Edit3,
  FolderTree,
  Plus,
  RefreshCw,
  Tag,
  TicketPercent,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PromoTab = "COUPONS" | "CATEGORIES";

const couponFilters = [
  { id: "ALL", label: "Semua" },
  { id: "ACTIVE", label: "Aktif" },
  { id: "INACTIVE", label: "Nonaktif" },
  { id: "PERCENTAGE", label: "Persentase" },
  { id: "FIXED", label: "Nominal Tetap" },
  { id: "FREE_SHIPPING", label: "Gratis Ongkir" },
];

const categoryFilters = [
  { id: "ALL", label: "Semua" },
  { id: "ACTIVE", label: "Aktif" },
  { id: "INACTIVE", label: "Nonaktif" },
];

const couponTypeLabels: Record<AdminCouponType, string> = {
  PERCENTAGE: "Persentase (%)",
  FIXED: "Potongan Tetap (Rp)",
  FREE_SHIPPING: "Gratis Ongkir (Rp)",
};

function toDateTimeLocal(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function defaultEndDateTimeLocal(): string {
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const tzOffsetMs = nextMonth.getTimezoneOffset() * 60000;
  return new Date(nextMonth.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function slugifyName(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getCouponUsageCount(coupon: AdminCouponItem): number {
  return Math.max(coupon.usageCount, coupon._count?.usages ?? 0);
}

export default function AdminCouponsAndCategoriesPage() {
  const [activeTab, setActiveTab] = useState<PromoTab>("COUPONS");
  const [filterId, setFilterId] = useState("ALL");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [couponsData, setCouponsData] = useState<AdminCouponsPage | null>(null);
  const [categoriesData, setCategoriesData] =
    useState<AdminCategoriesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // State Modal Form Kupon
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCouponItem | null>(
    null,
  );
  const [couponCode, setCouponCode] = useState("");
  const [couponName, setCouponName] = useState("");
  const [couponDesc, setCouponDesc] = useState("");
  const [couponType, setCouponType] = useState<AdminCouponType>("PERCENTAGE");
  const [couponValue, setCouponValue] = useState("10");
  const [couponMinPurchase, setCouponMinPurchase] = useState("");
  const [couponMaxDiscount, setCouponMaxDiscount] = useState("");
  const [couponUsageLimit, setCouponUsageLimit] = useState("");
  const [couponUsagePerUser, setCouponUsagePerUser] = useState("1");
  const [couponValidFrom, setCouponValidFrom] = useState(toDateTimeLocal);
  const [couponValidUntil, setCouponValidUntil] = useState(
    defaultEndDateTimeLocal,
  );
  const [couponIsActive, setCouponIsActive] = useState(true);
  const [couponFormError, setCouponFormError] = useState<string | null>(null);
  const [couponSaving, setCouponSaving] = useState(false);

  // State Modal Form Kategori
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<AdminCategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryDesc, setCategoryDesc] = useState("");
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(
    null,
  );
  const [categorySaving, setCategorySaving] = useState(false);

  // State Dialog Konfirmasi Hapus / Nonaktifkan
  const [deletingCoupon, setDeletingCoupon] = useState<AdminCouponItem | null>(
    null,
  );
  const [deletingCategory, setDeletingCategory] =
    useState<AdminCategoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

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
    if (query.trim() !== search) return;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (activeTab === "COUPONS") {
            const typeParam =
              filterId === "PERCENTAGE" ||
              filterId === "FIXED" ||
              filterId === "FREE_SHIPPING"
                ? filterId
                : undefined;
            const activeParam =
              filterId === "ACTIVE"
                ? true
                : filterId === "INACTIVE"
                  ? false
                  : undefined;

            const res = await fetchAdminCoupons(
              {
                page,
                limit: 20,
                type: typeParam,
                isActive: activeParam,
                search: search || undefined,
              },
              controller.signal,
            );
            if (!controller.signal.aborted) {
              setCouponsData(res);
              setError(null);
              setLoading(false);
            }
          } else {
            const activeParam =
              filterId === "ACTIVE"
                ? true
                : filterId === "INACTIVE"
                  ? false
                  : undefined;

            const res = await fetchAdminCategories(
              {
                page,
                limit: 20,
                isActive: activeParam,
                search: search || undefined,
              },
              controller.signal,
            );
            if (!controller.signal.aborted) {
              setCategoriesData(res);
              setError(null);
              setLoading(false);
            }
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
              : "Gagal memuat data promosi & kategori",
          );
          setLoading(false);
        }
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, filterId, page, search, query, refreshKey]);

  const openCreateCouponModal = () => {
    setEditingCoupon(null);
    setCouponCode("");
    setCouponName("");
    setCouponDesc("");
    setCouponType("PERCENTAGE");
    setCouponValue("10");
    setCouponMinPurchase("");
    setCouponMaxDiscount("");
    setCouponUsageLimit("");
    setCouponUsagePerUser("1");
    setCouponValidFrom(toDateTimeLocal());
    setCouponValidUntil(defaultEndDateTimeLocal());
    setCouponIsActive(true);
    setCouponFormError(null);
    setCouponModalOpen(true);
  };

  const openEditCouponModal = (coupon: AdminCouponItem) => {
    setEditingCoupon(coupon);
    setCouponCode(coupon.code);
    setCouponName(coupon.name);
    setCouponDesc(coupon.description ?? "");
    setCouponType(coupon.type);
    setCouponValue(String(coupon.value));
    setCouponMinPurchase(
      coupon.minPurchase !== null ? String(coupon.minPurchase) : "",
    );
    setCouponMaxDiscount(
      coupon.maxDiscount !== null ? String(coupon.maxDiscount) : "",
    );
    setCouponUsageLimit(
      coupon.usageLimit !== null ? String(coupon.usageLimit) : "",
    );
    setCouponUsagePerUser(String(coupon.usagePerUser));
    setCouponValidFrom(toDateTimeLocal(coupon.validFrom));
    setCouponValidUntil(toDateTimeLocal(coupon.validUntil));
    setCouponIsActive(coupon.isActive);
    setCouponFormError(null);
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (couponSaving) return;
    setCouponFormError(null);

    const trimmedCode = couponCode.trim().toUpperCase();
    const trimmedName = couponName.trim();
    const numericValue = Number(couponValue);
    const numericPerUser = Number(couponUsagePerUser);

    if (trimmedCode.length < 3) {
      setCouponFormError("Kode kupon minimal 3 karakter.");
      return;
    }
    if (!trimmedName) {
      setCouponFormError("Nama kupon wajib diisi.");
      return;
    }
    if (Number.isNaN(numericValue) || numericValue < 0) {
      setCouponFormError("Nilai potongan tidak valid.");
      return;
    }
    if (
      couponType === "PERCENTAGE" &&
      (numericValue < 1 || numericValue > 100)
    ) {
      setCouponFormError(
        "Untuk tipe Persentase, nilai harus antara 1 sampai 100.",
      );
      return;
    }
    if (couponType === "FIXED" && numericValue < 1) {
      setCouponFormError("Untuk tipe Nominal Tetap, nilai minimal Rp 1.");
      return;
    }
    if (Number.isNaN(numericPerUser) || numericPerUser < 1) {
      setCouponFormError("Batas pemakaian per pengguna minimal 1.");
      return;
    }

    const startIso = couponValidFrom
      ? new Date(couponValidFrom).toISOString()
      : new Date().toISOString();
    const endIso = couponValidUntil
      ? new Date(couponValidUntil).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setCouponFormError(
        "Tanggal berakhir harus lebih besar dari tanggal mulai berlaku.",
      );
      return;
    }

    const parsedMin = couponMinPurchase.trim()
      ? Number(couponMinPurchase)
      : null;
    const parsedMax = couponMaxDiscount.trim()
      ? Number(couponMaxDiscount)
      : null;
    const parsedLimit = couponUsageLimit.trim()
      ? Number(couponUsageLimit)
      : null;

    setCouponSaving(true);
    setNotice(null);
    try {
      const payload = {
        name: trimmedName,
        description: couponDesc.trim() ? couponDesc.trim() : null,
        type: couponType,
        value: Math.round(numericValue),
        minPurchase: parsedMin !== null ? Math.round(parsedMin) : null,
        maxDiscount: parsedMax !== null ? Math.round(parsedMax) : null,
        usageLimit: parsedLimit !== null ? Math.round(parsedLimit) : null,
        usagePerUser: Math.round(numericPerUser),
        validFrom: startIso,
        validUntil: endIso,
        isActive: couponIsActive,
      };

      if (editingCoupon) {
        const canEditCode = getCouponUsageCount(editingCoupon) === 0;
        await updateAdminCoupon(editingCoupon.id, {
          ...(canEditCode ? { code: trimmedCode } : {}),
          ...payload,
        });
        setNotice(`Kupon "${trimmedCode}" berhasil diperbarui.`);
      } else {
        await createAdminCoupon({
          code: trimmedCode,
          ...payload,
        });
        setNotice(`Kupon "${trimmedCode}" berhasil dibuat.`);
      }

      setCouponModalOpen(false);
      reload();
    } catch (err) {
      setCouponFormError(
        err instanceof Error ? err.message : "Gagal menyimpan kupon promosi.",
      );
    } finally {
      setCouponSaving(false);
    }
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategorySlug("");
    setSlugTouched(false);
    setCategoryDesc("");
    setCategoryIsActive(true);
    setCategoryFormError(null);
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: AdminCategoryItem) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setSlugTouched(true);
    setCategoryDesc(category.description ?? "");
    setCategoryIsActive(category.isActive);
    setCategoryFormError(null);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (categorySaving) return;
    setCategoryFormError(null);

    const trimmedName = categoryName.trim();
    const trimmedSlug = categorySlug.trim();
    if (!trimmedName) {
      setCategoryFormError("Nama kategori wajib diisi.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setCategoryFormError(
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).",
      );
      return;
    }

    setCategorySaving(true);
    setNotice(null);
    try {
      const payload = {
        name: trimmedName,
        slug: trimmedSlug,
        description: categoryDesc.trim() ? categoryDesc.trim() : null,
        isActive: categoryIsActive,
      };

      if (editingCategory) {
        await updateAdminCategory(editingCategory.id, payload);
        setNotice(`Kategori "${trimmedName}" berhasil diperbarui.`);
      } else {
        await createAdminCategory(payload);
        setNotice(`Kategori "${trimmedName}" berhasil ditambahkan.`);
      }

      setCategoryModalOpen(false);
      reload();
    } catch (err) {
      setCategoryFormError(
        err instanceof Error ? err.message : "Gagal menyimpan kategori bunga.",
      );
    } finally {
      setCategorySaving(false);
    }
  };

  const confirmDeleteCoupon = async () => {
    if (!deletingCoupon || deletingBusy) return;
    setDeletingBusy(true);
    setDeleteError(null);
    setNotice(null);
    try {
      const res = await deleteAdminCoupon(deletingCoupon.id);
      setNotice(res.message);
      setDeletingCoupon(null);
      reload();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal memproses kupon.",
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const confirmDeleteOrDeactivateCategory = async (deactivateOnly: boolean) => {
    if (!deletingCategory || deletingBusy) return;
    setDeletingBusy(true);
    setDeleteError(null);
    setNotice(null);
    try {
      if (deactivateOnly) {
        await updateAdminCategory(deletingCategory.id, {
          isActive: !deletingCategory.isActive,
        });
        setNotice(
          `Kategori "${deletingCategory.name}" berhasil ${
            deletingCategory.isActive ? "dinonaktifkan" : "diaktifkan kembali"
          }.`,
        );
      } else {
        await deleteAdminCategory(deletingCategory.id);
        setNotice(`Kategori "${deletingCategory.name}" berhasil dihapus.`);
      }
      setDeletingCategory(null);
      reload();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal memproses kategori.",
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const activePagination =
    activeTab === "COUPONS"
      ? couponsData?.pagination
      : categoriesData?.pagination;

  const isEditingUsedCoupon =
    editingCoupon !== null && getCouponUsageCount(editingCoupon) > 0;

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <header className="flex flex-col gap-4 rounded-2xl bg-surface-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold tracking-wider text-kicker uppercase">
            <TicketPercent className="h-3.5 w-3.5" aria-hidden="true" />
            Promosi &amp; Taksonomi Katalog
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Manajemen Kupon &amp; Kategori Bunga
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/70">
            Atur kode diskon platform dan struktur kategori katalog dengan
            perlindungan penuh terhadap riwayat pesanan dan produk eksisting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={
              activeTab === "COUPONS"
                ? openCreateCouponModal
                : openCreateCategoryModal
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>
              {activeTab === "COUPONS" ? "Tambah Kupon" : "Tambah Kategori"}
            </span>
          </button>
        </div>
      </header>

      {/* Notice Sukses Operasi */}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {/* Panel Kontrol Tab, Search, & Filter */}
      <section className="surface-panel space-y-5">
        <TabNavigation
          tabs={[
            { id: "COUPONS", label: "Kupon Promosi" },
            { id: "CATEGORIES", label: "Kategori Katalog Bunga" },
          ]}
          activeTab={activeTab}
          onChange={(nextTabId) => {
            const nextTab = nextTabId === "CATEGORIES" ? "CATEGORIES" : "COUPONS";
            if (nextTab === activeTab) return;
            setLoading(true);
            setError(null);
            setNotice(null);
            setActiveTab(nextTab);
            setFilterId("ALL");
            setQuery("");
            setSearch("");
            setPage(1);
          }}
        />

        <div className="space-y-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={
              activeTab === "COUPONS"
                ? "Cari kode kupon atau nama promosi..."
                : "Cari nama atau slug kategori bunga..."
            }
          />
          <FilterBar
            filters={activeTab === "COUPONS" ? couponFilters : categoryFilters}
            activeFilter={filterId}
            onChange={(nextFilter) => {
              setLoading(true);
              setFilterId(nextFilter);
              setPage(1);
            }}
          />
        </div>
      </section>

      {/* Area Konten */}
      {loading ? (
        <div className="surface-panel py-14">
          <LoadingSpinner
            message={
              activeTab === "COUPONS"
                ? "Memuat daftar kupon promosi..."
                : "Memuat daftar kategori bunga..."
            }
          />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : activeTab === "COUPONS" ? (
        !couponsData || couponsData.coupons.length === 0 ? (
          <EmptyState
            icon={<TicketPercent className="h-6 w-6" />}
            title="Belum ada kupon promosi yang sesuai"
            description="Buat kupon diskon baru atau ubah filter pencarian untuk melihat kampanye promosi lain."
            action={{
              label: "Tambah Kupon Pertama",
              onClick: openCreateCouponModal,
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        ) : (
          <section className="space-y-4">
            {/* Tabel Desktop Kupon */}
            <div className="surface-panel hidden overflow-hidden p-0 md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-container-low text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3.5">Kode &amp; Nama</th>
                      <th className="px-4 py-3.5">Tipe &amp; Potongan</th>
                      <th className="px-4 py-3.5">Pemakaian</th>
                      <th className="px-4 py-3.5">Masa Berlaku</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {couponsData.coupons.map((coupon) => {
                      const usageTotal = getCouponUsageCount(coupon);
                      const isExpired =
                        new Date(coupon.validUntil) < new Date();
                      return (
                        <tr
                          key={coupon.id}
                          className="transition-colors hover:bg-surface-dim"
                        >
                          <td className="px-4 py-3.5 align-top">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                              {coupon.code}
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                              {coupon.name}
                            </div>
                            {coupon.description && (
                              <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {coupon.description}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 align-top">
                            <div className="font-semibold text-foreground">
                              {coupon.type === "PERCENTAGE"
                                ? `${coupon.value}%`
                                : formatRupiah(coupon.value)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {couponTypeLabels[coupon.type]}
                            </div>
                            {coupon.minPurchase !== null && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Min. {formatRupiah(coupon.minPurchase)}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 align-top">
                            <div className="font-semibold tabular-nums text-foreground">
                              {usageTotal}
                              {coupon.usageLimit !== null
                                ? ` / ${coupon.usageLimit}`
                                : " / ∞"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Maks {coupon.usagePerUser}x / user
                            </div>
                          </td>

                          <td className="px-4 py-3.5 align-top text-xs text-muted-foreground">
                            <div>Mulai: {formatDateTime(coupon.validFrom)}</div>
                            <div>Selesai: {formatDateTime(coupon.validUntil)}</div>
                          </td>

                          <td className="px-4 py-3.5 align-top">
                            {!coupon.isActive ? (
                              <span className="inline-flex rounded-full border border-error/25 bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
                                Nonaktif
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex rounded-full border border-warning/25 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                                Kedaluwarsa
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                                Aktif
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right align-top">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditCouponModal(coupon)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                              >
                                <Edit3
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Ubah</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeletingCoupon(coupon);
                                }}
                                disabled={usageTotal > 0 && !coupon.isActive}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:border-error/40 hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {usageTotal > 0 ? (
                                  <>
                                    <Archive
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                    <span>Arsipkan</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                    <span>Hapus</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kartu Mobile Kupon */}
            <div className="space-y-3 md:hidden">
              {couponsData.coupons.map((coupon) => {
                const usageTotal = getCouponUsageCount(coupon);
                return (
                  <article key={coupon.id} className="surface-panel space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                          {coupon.code}
                        </span>
                        <h3 className="mt-1 font-semibold text-foreground">
                          {coupon.name}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          coupon.isActive
                            ? "border-success/25 bg-success/10 text-success"
                            : "border-error/25 bg-error/10 text-error"
                        }`}
                      >
                        {coupon.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Potongan:{" "}
                        <strong className="text-foreground">
                          {coupon.type === "PERCENTAGE"
                            ? `${coupon.value}%`
                            : formatRupiah(coupon.value)}
                        </strong>
                      </span>
                      <span>Terpakai: {usageTotal}x</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCouponModal(coupon)}
                        className="btn-secondary flex-1 py-2 text-xs font-semibold"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeletingCoupon(coupon);
                        }}
                        disabled={usageTotal > 0 && !coupon.isActive}
                        className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs font-semibold text-error disabled:opacity-40"
                      >
                        {usageTotal > 0 ? "Arsipkan" : "Hapus"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )
      ) : !categoriesData || categoriesData.items.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-6 w-6" />}
          title="Belum ada kategori bunga yang sesuai"
          description="Tambahkan kategori katalog baru atau sesuaikan kata kunci pencarian Anda."
          action={{
            label: "Tambah Kategori Baru",
            onClick: openCreateCategoryModal,
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      ) : (
        <section className="space-y-4">
          {/* Tabel Desktop Kategori */}
          <div className="surface-panel hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-container-low text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3.5">Kategori</th>
                    <th className="px-4 py-3.5">Slug URL</th>
                    <th className="px-4 py-3.5">Jumlah Produk</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {categoriesData.items.map((cat) => {
                    const productCount = cat._count?.products ?? 0;
                    return (
                      <tr
                        key={cat.id}
                        className="transition-colors hover:bg-surface-dim"
                      >
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-foreground">
                            {cat.name}
                          </div>
                          {cat.description && (
                            <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {cat.description}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {cat.slug}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 align-top font-semibold tabular-nums text-foreground">
                          {productCount} produk
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              cat.isActive
                                ? "border-success/25 bg-success/10 text-success"
                                : "border-error/25 bg-error/10 text-error"
                            }`}
                          >
                            {cat.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right align-top">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditCategoryModal(cat)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                            >
                              <Edit3
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span>Ubah</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingCategory(cat);
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                productCount > 0
                                  ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
                                  : "border-border bg-surface-container-low text-error hover:border-error/40 hover:bg-error/10"
                              }`}
                            >
                              {productCount > 0 ? (
                                <>
                                  <Archive
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Trash2
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>Hapus</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kartu Mobile Kategori */}
          <div className="space-y-3 md:hidden">
            {categoriesData.items.map((cat) => {
              const productCount = cat._count?.products ?? 0;
              return (
                <article key={cat.id} className="surface-panel space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {cat.name}
                      </h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        /{cat.slug} • {productCount} produk
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        cat.isActive
                          ? "border-success/25 bg-success/10 text-success"
                          : "border-error/25 bg-error/10 text-error"
                      }`}
                    >
                      {cat.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditCategoryModal(cat)}
                      className="btn-secondary flex-1 py-2 text-xs font-semibold"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingCategory(cat);
                      }}
                      className="rounded-xl border border-border bg-surface-container-low px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      {productCount > 0
                        ? cat.isActive
                          ? "Nonaktifkan"
                          : "Aktifkan"
                        : "Hapus"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Paginasi */}
      {activePagination && activePagination.totalPages > 1 && (
        <div className="surface-panel flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Menampilkan halaman {activePagination.page} dari{" "}
            {activePagination.totalPages} ({activePagination.total} total data)
          </p>
          <Pagination
            currentPage={activePagination.page}
            totalPages={activePagination.totalPages}
            disabled={loading}
            onPageChange={(nextPage) => {
              setLoading(true);
              setPage(nextPage);
            }}
          />
        </div>
      )}

      {/* Modal Tambah / Edit Kupon */}
      <Dialog
        open={couponModalOpen}
        onOpenChange={(open) => {
          if (!couponSaving) setCouponModalOpen(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon
                ? `Edit Kupon ${editingCoupon.code}`
                : "Buat Kupon Promosi Baru"}
            </DialogTitle>
            <DialogDescription>
              Atur nilai potongan, kuota, dan periode berlaku. Perubahan akan
              dicatat dalam Audit Log admin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCoupon} className="space-y-4">
            {couponFormError && (
              <div
                role="alert"
                className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-medium text-error"
              >
                {couponFormError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="coupon-code"
                  className="block text-xs font-semibold text-foreground"
                >
                  Kode Kupon *
                </label>
                <input
                  id="coupon-code"
                  type="text"
                  required
                  disabled={isEditingUsedCoupon}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="BUNGA20"
                  className="input-field mt-1 w-full font-mono uppercase disabled:opacity-60"
                />
                {isEditingUsedCoupon && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Kode terkunci karena kupon sudah pernah dipakai pelanggan.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="coupon-name"
                  className="block text-xs font-semibold text-foreground"
                >
                  Nama Promosi *
                </label>
                <input
                  id="coupon-name"
                  type="text"
                  required
                  value={couponName}
                  onChange={(e) => setCouponName(e.target.value)}
                  placeholder="Promo Musim Mawar"
                  className="input-field mt-1 w-full"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="coupon-desc"
                className="block text-xs font-semibold text-foreground"
              >
                Deskripsi (Opsional)
              </label>
              <textarea
                id="coupon-desc"
                rows={2}
                value={couponDesc}
                onChange={(e) => setCouponDesc(e.target.value)}
                placeholder="Syarat dan keterangan promo untuk pelanggan"
                className="input-field mt-1 w-full"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="coupon-type"
                  className="block text-xs font-semibold text-foreground"
                >
                  Tipe Diskon *
                </label>
                <select
                  id="coupon-type"
                  value={couponType}
                  onChange={(e) =>
                    setCouponType(e.target.value as AdminCouponType)
                  }
                  className="input-field mt-1 w-full"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="FIXED">Potongan Tetap (Rp)</option>
                  <option value="FREE_SHIPPING">Gratis Ongkir (Rp)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="coupon-value"
                  className="block text-xs font-semibold text-foreground"
                >
                  {couponType === "PERCENTAGE"
                    ? "Persentase Potongan (1–100) *"
                    : "Nominal Potongan / Maks Subsidi (Rp) *"}
                </label>
                <input
                  id="coupon-value"
                  type="number"
                  min={0}
                  required
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="coupon-min-purchase"
                  className="block text-xs font-semibold text-foreground"
                >
                  Minimal Belanja (Rp)
                </label>
                <input
                  id="coupon-min-purchase"
                  type="number"
                  min={0}
                  value={couponMinPurchase}
                  onChange={(e) => setCouponMinPurchase(e.target.value)}
                  placeholder="Kosongkan jika tanpa minimal"
                  className="input-field mt-1 w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="coupon-max-discount"
                  className="block text-xs font-semibold text-foreground"
                >
                  Maksimal Potongan (Rp)
                </label>
                <input
                  id="coupon-max-discount"
                  type="number"
                  min={0}
                  value={couponMaxDiscount}
                  onChange={(e) => setCouponMaxDiscount(e.target.value)}
                  placeholder="Kosongkan jika tanpa batas"
                  className="input-field mt-1 w-full"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="coupon-usage-limit"
                  className="block text-xs font-semibold text-foreground"
                >
                  Kuota Global
                </label>
                <input
                  id="coupon-usage-limit"
                  type="number"
                  min={1}
                  value={couponUsageLimit}
                  onChange={(e) => setCouponUsageLimit(e.target.value)}
                  placeholder="Tak terbatas"
                  className="input-field mt-1 w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="coupon-usage-per-user"
                  className="block text-xs font-semibold text-foreground"
                >
                  Kuota per Pengguna *
                </label>
                <input
                  id="coupon-usage-per-user"
                  type="number"
                  min={1}
                  required
                  value={couponUsagePerUser}
                  onChange={(e) => setCouponUsagePerUser(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="coupon-valid-from"
                  className="block text-xs font-semibold text-foreground"
                >
                  Berlaku Mulai *
                </label>
                <input
                  id="coupon-valid-from"
                  type="datetime-local"
                  required
                  value={couponValidFrom}
                  onChange={(e) => setCouponValidFrom(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="coupon-valid-until"
                  className="block text-xs font-semibold text-foreground"
                >
                  Berlaku Hingga *
                </label>
                <input
                  id="coupon-valid-until"
                  type="datetime-local"
                  required
                  value={couponValidUntil}
                  onChange={(e) => setCouponValidUntil(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={couponIsActive}
                onChange={(e) => setCouponIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>Kupon aktif dan dapat digunakan saat checkout</span>
            </label>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Batal
              </DialogClose>
              <Button type="submit" disabled={couponSaving}>
                {couponSaving ? "Menyimpan..." : "Simpan Kupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah / Edit Kategori */}
      <Dialog
        open={categoryModalOpen}
        onOpenChange={(open) => {
          if (!categorySaving) setCategoryModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? `Edit Kategori ${editingCategory.name}`
                : "Tambah Kategori Bunga Baru"}
            </DialogTitle>
            <DialogDescription>
              Kelola kategori katalog produk florist beserta status aktifnya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4">
            {categoryFormError && (
              <div
                role="alert"
                className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-medium text-error"
              >
                {categoryFormError}
              </div>
            )}

            <div>
              <label
                htmlFor="cat-name"
                className="block text-xs font-semibold text-foreground"
              >
                Nama Kategori *
              </label>
              <input
                id="cat-name"
                type="text"
                required
                value={categoryName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategoryName(val);
                  if (!slugTouched) {
                    setCategorySlug(slugifyName(val));
                  }
                }}
                placeholder="Buket Wisuda"
                className="input-field mt-1 w-full"
              />
            </div>

            <div>
              <label
                htmlFor="cat-slug"
                className="block text-xs font-semibold text-foreground"
              >
                Slug URL *
              </label>
              <input
                id="cat-slug"
                type="text"
                required
                value={categorySlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setCategorySlug(e.target.value.toLowerCase());
                }}
                placeholder="buket-wisuda"
                className="input-field mt-1 w-full font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="cat-desc"
                className="block text-xs font-semibold text-foreground"
              >
                Deskripsi (Opsional)
              </label>
              <textarea
                id="cat-desc"
                rows={2}
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
                placeholder="Deskripsi singkat kategori bunga"
                className="input-field mt-1 w-full"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={categoryIsActive}
                onChange={(e) => setCategoryIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>Kategori aktif di etalase platform</span>
            </label>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Batal
              </DialogClose>
              <Button type="submit" disabled={categorySaving}>
                {categorySaving ? "Menyimpan..." : "Simpan Kategori"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus / Arsipkan Kupon */}
      <Dialog
        open={deletingCoupon !== null}
        onOpenChange={(open) => {
          if (!open && !deletingBusy) setDeletingCoupon(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deletingCoupon && getCouponUsageCount(deletingCoupon) > 0
                ? `Arsipkan Kupon ${deletingCoupon.code}?`
                : `Hapus Kupon ${deletingCoupon?.code}?`}
            </DialogTitle>
            <DialogDescription>
              {deletingCoupon && getCouponUsageCount(deletingCoupon) > 0
                ? `Kupon ini telah dipakai ${getCouponUsageCount(deletingCoupon)} kali. Demi menjaga riwayat diskon pesanan historis, kupon akan dinonaktifkan (diarsipkan), bukan dihapus permanen.`
                : "Kupon ini belum pernah dipakai dan akan dihapus secara permanen dari basis data."}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-medium text-error"
            >
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Batal
            </DialogClose>
            <Button
              type="button"
              variant={
                deletingCoupon && getCouponUsageCount(deletingCoupon) > 0
                  ? "default"
                  : "destructive"
              }
              disabled={deletingBusy}
              onClick={confirmDeleteCoupon}
            >
              {deletingBusy
                ? "Memproses..."
                : deletingCoupon && getCouponUsageCount(deletingCoupon) > 0
                  ? "Nonaktifkan / Arsipkan"
                  : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus / Nonaktifkan Kategori */}
      <Dialog
        open={deletingCategory !== null}
        onOpenChange={(open) => {
          if (!open && !deletingBusy) setDeletingCategory(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deletingCategory &&
              (deletingCategory._count?.products ?? 0) > 0
                ? `${deletingCategory.isActive ? "Nonaktifkan" : "Aktifkan"} Kategori "${deletingCategory.name}"?`
                : `Hapus Kategori "${deletingCategory?.name}"?`}
            </DialogTitle>
            <DialogDescription>
              {deletingCategory && (deletingCategory._count?.products ?? 0) > 0
                ? `Kategori ini memiliki ${deletingCategory._count?.products} produk terkait sehingga penghapusan fisik dilarang. Anda dapat mengubah status aktifnya.`
                : "Kategori ini belum memiliki produk terkait dan akan dihapus permanen."}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-medium text-error"
            >
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Batal
            </DialogClose>
            {deletingCategory && (
              <Button
                type="button"
                variant={
                  (deletingCategory._count?.products ?? 0) > 0
                    ? "default"
                    : "destructive"
                }
                disabled={deletingBusy}
                onClick={() =>
                  confirmDeleteOrDeactivateCategory(
                    (deletingCategory._count?.products ?? 0) > 0,
                  )
                }
              >
                {deletingBusy
                  ? "Memproses..."
                  : (deletingCategory._count?.products ?? 0) > 0
                    ? deletingCategory.isActive
                      ? "Nonaktifkan Kategori"
                      : "Aktifkan Kategori"
                    : "Hapus Permanen"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
