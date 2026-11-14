"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
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

export default function FloristHarvestPlansPage() {
  const [announcements, setAnnouncements] = useState<HarvestAnnouncement[]>([]);
  const [myPreOrders, setMyPreOrders] = useState<PreOrder[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingPreOrders, setIsLoadingPreOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preOrdersError, setPreOrdersError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "my-orders">("browse");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<HarvestAnnouncement | null>(null);

  // State loading saat membuka Midtrans Snap
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handlePayDepositMidtrans = async (order: PreOrder) => {
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
              alert(
                "Pembayaran DP 50% berhasil! DP terverifikasi. Status pesanan telah diperbarui.",
              );
            } catch (err) {

              await fetchData();
              alert("Midtrans belum dapat memverifikasi pembayaran. Periksa status pesanan kembali sebelum mencoba lagi.");
            }
          },
          onPending: async () => {
            alert(
              "Pembayaran sedang diproses / menunggu transfer Virtual Account.",
            );
            await fetchData();
          },
          onError: () => {
            alert("Pembayaran Midtrans gagal atau dibatalkan. Pesanan belum lunas.");
            void fetchMyPreOrders();
          },
          onClose: () => {
            void fetchMyPreOrders();
          },
        });
      } else {
        alert("Midtrans Snap belum siap. Silakan muat ulang halaman.");
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Gagal memulai pembayaran DP Midtrans",
      );
    } finally {
      setPayingOrderId(null);
    }
  };

  const handlePayFinalMidtrans = async (order: PreOrder) => {
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
              alert(
                "Pelunasan berhasil! Pelunasan terverifikasi. Supplier akan menyiapkan pengiriman Biteship.",
              );
            } catch (err) {

              await fetchData();
              alert("Midtrans belum dapat memverifikasi pembayaran. Periksa status pesanan kembali sebelum mencoba lagi.");
            }
          },
          onPending: async () => {
            alert(
              "Pembayaran sedang diproses / menunggu transfer Virtual Account.",
            );
            await fetchData();
          },
          onError: () => {
            alert("Pembayaran Midtrans gagal atau dibatalkan. Pesanan belum lunas.");
            void fetchMyPreOrders();
          },
          onClose: () => {
            void fetchMyPreOrders();
          },
        });
      } else {
        alert("Midtrans Snap belum siap. Silakan muat ulang halaman.");
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Gagal memulai pelunasan Midtrans",
      );
    } finally {
      setPayingOrderId(null);
    }
  };

  const [isReceivingId, setIsReceivingId] = useState<string | null>(null);

  const handleReceivePreOrder = async (order: PreOrder) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin telah menerima bunga "${order.announcement.flowerName}" (${order.quantity} tangkai)?`,
    );
    if (!confirmed) return;

    try {
      setIsReceivingId(order.id);
      await receivePreOrder(order.id);
      await fetchMyPreOrders();
      alert("Konfirmasi penerimaan berhasil! Bunga telah diterima.");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Gagal mengonfirmasi penerimaan bunga",
      );
    } finally {
      setIsReceivingId(null);
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Perbarui Jadwal
          </button>
        </div>
      </div>

      {/* Ringkasan Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Jadwal panen aktif", value: Array.isArray(announcements) ? announcements.length : 0, sub: "Dari supplier mitra" },
          { label: "Pre-order saya", value: Array.isArray(myPreOrders) ? myPreOrders.length : 0, sub: "Total alokasi diajukan" },
          { label: "Menunggu konfirmasi", value: pendingCount, attention: pendingCount > 0, sub: "Perlu konfirmasi supplier" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${item.attention ? "text-amber-600" : "text-foreground"}`}>
              {item.value.toLocaleString("id-ID")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "browse"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-low text-muted-foreground hover:text-foreground"
              }`}
            >
              Jelajah Jadwal Panen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my-orders")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "my-orders"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-low text-muted-foreground hover:text-foreground"
              }`}
            >
              Pre-Order Saya {myPreOrders.length > 0 && `(${myPreOrders.length})`}
            </button>
          </div>

          <div className="w-full sm:w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama bunga atau supplier..."
            />
          </div>
        </div>
      </div>

      {activeTab === "browse" && (
        <DataStateWrapper
          isLoading={isLoadingAnnouncements && announcements.length === 0}
          error={error}
          isEmpty={filteredAnnouncements.length === 0}
          emptyIcon={<Calendar className="w-16 h-16 text-muted-foreground" />}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnouncements.map((ann) => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                onCreatePreOrder={openPreOrderModal}
              />
            ))}
          </div>
        </DataStateWrapper>
      )}

      {activeTab === "my-orders" && (
        <DataStateWrapper
          isLoading={isLoadingPreOrders && myPreOrders.length === 0}
          error={preOrdersError}
          isEmpty={filteredPreOrders.length === 0}
          emptyIcon={<Calendar className="w-16 h-16 text-muted-foreground" />}
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
          <PreOrderTable
            preOrders={filteredPreOrders}
            onPayDeposit={handlePayDepositMidtrans}
            onPayFinal={handlePayFinalMidtrans}
            payingOrderId={payingOrderId}
            onReceiveOrder={handleReceivePreOrder}
            isReceivingId={isReceivingId}
          />
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
    </div>
  );
}
