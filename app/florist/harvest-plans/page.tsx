"use client";

import { useEffect, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AnnouncementCard from "@/components/florist/AnnouncementCard";
import PreOrderTable, { PreOrder } from "@/components/florist/PreOrderTable";
import PreOrderModal from "@/components/florist/PreOrderModal";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import {
  getPreOrderDepositSnapToken,
  getPreOrderFinalSnapToken,
  confirmPreOrderDepositMidtrans,
  confirmPreOrderFinalMidtrans,
  receivePreOrder,
} from "@/lib/api/supplier";

interface HarvestAnnouncement {
  id: string;
  flowerName: string;
  variety: string | null;
  estimatedQuantity: number;
  pricePerUnit: number;
  harvestDate: string;
  announceDate: string;
  description: string | null;
  location: string | null;
  image: string | null;
  isActive: boolean;
  supplier: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    preOrders: number;
  };
  totalReservedQuantity?: number;
}

const ANNOUNCEMENTS_PER_PAGE = 9;
const PREORDERS_PER_PAGE = 10;

export default function FloristHarvestPlansPage() {
  const [announcements, setAnnouncements] = useState<HarvestAnnouncement[]>([]);
  const [myPreOrders, setMyPreOrders] = useState<PreOrder[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingPreOrders, setIsLoadingPreOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preOrdersError, setPreOrdersError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [preOrdersPage, setPreOrdersPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"browse" | "my-orders">("browse");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<HarvestAnnouncement | null>(null);

  // State loading saat menyiapkan pembayaran dan umpan balik non-blocking
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "status" | "error"; message: string } | null>(null);
  const [pendingReceiveOrder, setPendingReceiveOrder] = useState<PreOrder | null>(null);

  const handlePayDepositMidtrans = async (order: PreOrder) => {
    setFeedback(null);
    try {
      setPayingOrderId(order.id);
      const res = await getPreOrderDepositSnapToken(order.id);

      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(res.snapToken, {
          onSuccess: async (result: MidtransTransactionResult) => {
            try {
              await confirmPreOrderDepositMidtrans(
                order.id,
                result?.transaction_id,
              );
              await fetchData();
              setFeedback({
                type: "status",
                message:
                  "Pembayaran DP 50% berhasil! DP terverifikasi dan status pesanan telah diperbarui.",
              });
            } catch {
              await fetchData();
              setFeedback({
                type: "error",
                message:
                  "Pembayaran belum dapat diverifikasi. Periksa status pesanan kembali sebelum mencoba lagi.",
              });
            }
          },
          onPending: async () => {
            setFeedback({
              type: "status",
              message:
                "Pembayaran sedang diproses / menunggu transfer Virtual Account.",
            });
            await fetchData();
          },
          onError: () => {
            setFeedback({
              type: "error",
              message:
                "Pembayaran gagal atau dibatalkan. Pesanan belum lunas.",
            });
            void fetchMyPreOrders();
          },
          onClose: () => {
            void fetchMyPreOrders();
          },
        });
      } else {
        setFeedback({
          type: "error",
          message: "Layanan pembayaran belum siap. Silakan muat ulang halaman.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal memulai pembayaran DP",
      });
    } finally {
      setPayingOrderId(null);
    }
  };

  const handlePayFinalMidtrans = async (order: PreOrder) => {
    setFeedback(null);
    try {
      setPayingOrderId(order.id);
      const res = await getPreOrderFinalSnapToken(order.id);

      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(res.snapToken, {
          onSuccess: async (result: MidtransTransactionResult) => {
            try {
              await confirmPreOrderFinalMidtrans(
                order.id,
                result?.transaction_id,
              );
              await fetchData();
              setFeedback({
                type: "status",
                message:
                  "Pelunasan berhasil terverifikasi! Supplier akan menyiapkan pengiriman kurir.",
              });
            } catch {
              await fetchData();
              setFeedback({
                type: "error",
                message:
                  "Pembayaran belum dapat diverifikasi. Periksa status pesanan kembali sebelum mencoba lagi.",
              });
            }
          },
          onPending: async () => {
            setFeedback({
              type: "status",
              message:
                "Pembayaran sedang diproses / menunggu transfer Virtual Account.",
            });
            await fetchData();
          },
          onError: () => {
            setFeedback({
              type: "error",
              message:
                "Pembayaran gagal atau dibatalkan. Pesanan belum lunas.",
            });
            void fetchMyPreOrders();
          },
          onClose: () => {
            void fetchMyPreOrders();
          },
        });
      } else {
        setFeedback({
          type: "error",
          message: "Layanan pembayaran belum siap. Silakan muat ulang halaman.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal memulai pelunasan",
      });
    } finally {
      setPayingOrderId(null);
    }
  };

  const [isReceivingId, setIsReceivingId] = useState<string | null>(null);

  const handleConfirmReceivePreOrder = async () => {
    if (!pendingReceiveOrder) return;
    const order = pendingReceiveOrder;

    try {
      setFeedback(null);
      setIsReceivingId(order.id);
      await receivePreOrder(order.id);
      await fetchMyPreOrders();
      setFeedback({
        type: "status",
        message: "Konfirmasi penerimaan berhasil! Bunga telah diterima.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengonfirmasi penerimaan bunga",
      });
    } finally {
      setIsReceivingId(null);
      setPendingReceiveOrder(null);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchAnnouncements(), fetchMyPreOrders()]);
  };

  const fetchAnnouncements = async () => {
    try {
      setIsLoadingAnnouncements(true);
      setError(null);
      const data = await fetchPaginatedCollection<HarvestAnnouncement>("/api/supplier/harvest-announcements?activeOnly=true", "announcements");
      setAnnouncements(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const fetchMyPreOrders = async () => {
    try {
      setIsLoadingPreOrders(true);
      setPreOrdersError(null);
      const data = await fetchPaginatedCollection<PreOrder>("/api/florist/preorders", "preOrders");
      setMyPreOrders(data);
    } catch (err) {
      setPreOrdersError(err instanceof Error ? err.message : "Gagal memuat pre-order");
    } finally {
      setIsLoadingPreOrders(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPreOrderModal = (announcement: HarvestAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAnnouncement(null);
  };

  const handlePreOrderSuccess = async () => {
    await fetchData();
    closeModal();
    setActiveTab("my-orders");
  };

  const filteredAnnouncements = Array.isArray(announcements)
    ? announcements.filter(
        (ann) =>
          ann.flowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ann.variety?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ann.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const filteredPreOrders = Array.isArray(myPreOrders)
    ? myPreOrders.filter(
        (order) =>
          order.announcement.flowerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.announcement.supplier.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : [];

  const pendingCount = Array.isArray(myPreOrders)
    ? myPreOrders.filter((o) => o.status === "PENDING").length
    : 0;

  const announcementsTotalPages = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / ANNOUNCEMENTS_PER_PAGE),
  );
  const safeAnnouncementsPage = Math.min(
    announcementsPage,
    announcementsTotalPages,
  );
  const announcementsStart = (safeAnnouncementsPage - 1) * ANNOUNCEMENTS_PER_PAGE;
  const paginatedAnnouncements = filteredAnnouncements.slice(
    announcementsStart,
    announcementsStart + ANNOUNCEMENTS_PER_PAGE,
  );

  const preOrdersTotalPages = Math.max(
    1,
    Math.ceil(filteredPreOrders.length / PREORDERS_PER_PAGE),
  );
  const safePreOrdersPage = Math.min(preOrdersPage, preOrdersTotalPages);
  const preOrdersStart = (safePreOrdersPage - 1) * PREORDERS_PER_PAGE;
  const paginatedPreOrders = filteredPreOrders.slice(
    preOrdersStart,
    preOrdersStart + PREORDERS_PER_PAGE,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Rantai Pasok & Pengadaan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Rencana Panen & Pre-Order
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pantau jadwal panen kebun supplier mitra lokal dan amankan kuota bunga potong segar melalui pre-order terjadwal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Perbarui Jadwal
          </button>
        </div>
      </section>

      {/* Ringkasan Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Jadwal panen aktif", value: Array.isArray(announcements) ? announcements.length : 0, sub: "Dari supplier mitra" },
          { label: "Pre-order saya", value: Array.isArray(myPreOrders) ? myPreOrders.length : 0, sub: "Total alokasi diajukan" },
          { label: "Menunggu konfirmasi", value: pendingCount, attention: pendingCount > 0, sub: "Perlu konfirmasi supplier" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${item.attention ? "text-warning" : "text-foreground"}`}>
              {item.value.toLocaleString("id-ID")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Tampilan rencana panen"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={activeTab === "browse"}
              onClick={() => setActiveTab("browse")}
              className={`min-h-10 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === "browse"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              Jelajah Jadwal Panen
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "my-orders"}
              onClick={() => setActiveTab("my-orders")}
              className={`min-h-10 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === "my-orders"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              Pre-Order Saya {myPreOrders.length > 0 && `(${myPreOrders.length})`}
            </button>
          </div>

          <div className="w-full sm:w-80">
            <SearchInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setAnnouncementsPage(1);
                setPreOrdersPage(1);
              }}
              placeholder="Cari nama bunga atau supplier..."
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-error/30 bg-error/5 text-error"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {activeTab === "browse" && (
        <DataStateWrapper
          isLoading={isLoadingAnnouncements && announcements.length === 0}
          error={error}
          isEmpty={filteredAnnouncements.length === 0}
          emptyTitle={
            searchQuery
              ? "Tidak ada jadwal panen yang sesuai pencarian"
              : "Belum ada pengumuman panen dari supplier"
          }
          emptyDescription={
            searchQuery
              ? "Coba ubah kata kunci pencarian"
              : "Pengumuman panen aktif dari supplier akan muncul di sini. Pre-order dapat dibuat setelah supplier mengumumkan panen."
          }
          onRetry={fetchData}
          loadingMessage="Memuat data..."
          errorTitle="Gagal Memuat Data"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedAnnouncements.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  onCreatePreOrder={openPreOrderModal}
                />
              ))}
            </div>
            {filteredAnnouncements.length > ANNOUNCEMENTS_PER_PAGE && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Menampilkan {announcementsStart + 1}–
                  {Math.min(
                    announcementsStart + ANNOUNCEMENTS_PER_PAGE,
                    filteredAnnouncements.length,
                  )}{" "}
                  dari {filteredAnnouncements.length} jadwal panen
                </p>
                <Pagination
                  currentPage={safeAnnouncementsPage}
                  totalPages={announcementsTotalPages}
                  onPageChange={(page) => {
                    setAnnouncementsPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  ariaLabel="Navigasi halaman jadwal panen"
                />
              </div>
            )}
          </div>
        </DataStateWrapper>
      )}

      {activeTab === "my-orders" && (
        <DataStateWrapper
          isLoading={isLoadingPreOrders && myPreOrders.length === 0}
          error={preOrdersError}
          isEmpty={filteredPreOrders.length === 0}
          emptyTitle={
            searchQuery
              ? "Tidak ada pre-order yang sesuai pencarian"
              : "Belum ada pre-order"
          }
          emptyDescription={
            searchQuery
              ? "Coba ubah kata kunci pencarian"
              : "Buat pre-order dari tab Jelajah Jadwal Panen"
          }
          onRetry={fetchData}
          loadingMessage="Memuat data..."
        >
          <div className="space-y-4">
            <PreOrderTable
              preOrders={paginatedPreOrders}
              onPayDeposit={handlePayDepositMidtrans}
              onPayFinal={handlePayFinalMidtrans}
              payingOrderId={payingOrderId}
              onReceiveOrder={(order) => setPendingReceiveOrder(order)}
              isReceivingId={isReceivingId}
              onRefresh={() => void fetchData()}
            />
            {filteredPreOrders.length > PREORDERS_PER_PAGE && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Menampilkan {preOrdersStart + 1}–
                  {Math.min(
                    preOrdersStart + PREORDERS_PER_PAGE,
                    filteredPreOrders.length,
                  )}{" "}
                  dari {filteredPreOrders.length} pre-order
                </p>
                <Pagination
                  currentPage={safePreOrdersPage}
                  totalPages={preOrdersTotalPages}
                  onPageChange={(page) => {
                    setPreOrdersPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  ariaLabel="Navigasi halaman pre-order"
                />
              </div>
            )}
          </div>
        </DataStateWrapper>
      )}

      {isModalOpen && selectedAnnouncement && (
        <PreOrderModal
          announcement={selectedAnnouncement}
          isOpen={isModalOpen}
          onClose={closeModal}
          onSuccess={handlePreOrderSuccess}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingReceiveOrder)}
        onClose={() => setPendingReceiveOrder(null)}
        onConfirm={handleConfirmReceivePreOrder}
        title="Konfirmasi Penerimaan Bunga"
        description={
          pendingReceiveOrder
            ? `Apakah Anda yakin telah menerima bunga "${pendingReceiveOrder.announcement.flowerName}" (${pendingReceiveOrder.quantity} tangkai)?`
            : ""
        }
        confirmLabel="Konfirmasi Diterima"
        loading={Boolean(isReceivingId)}
      />
    </div>
  );
}
