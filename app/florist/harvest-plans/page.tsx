"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import AnnouncementCard from "@/components/florist/AnnouncementCard";
import PreOrderTable from "@/components/florist/PreOrderTable";
import PreOrderModal from "@/components/florist/PreOrderModal";

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
  totalReservedQuantity?: number; // Sum of preOrder quantities (not count)
}

interface PreOrder {
  id: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  announcement: {
    id: string;
    flowerName: string;
    variety: string | null;
    harvestDate: string;
    supplier: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function FloristHarvestPlansPage() {
  const [announcements, setAnnouncements] = useState<HarvestAnnouncement[]>([]);
  const [myPreOrders, setMyPreOrders] = useState<PreOrder[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingPreOrders, setIsLoadingPreOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "my-orders">("browse");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<HarvestAnnouncement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchAnnouncements(), fetchMyPreOrders()]);
  };

  const fetchAnnouncements = async () => {
    try {
      setIsLoadingAnnouncements(true);
      setError(null);
      const res = await fetch(
        "/api/supplier/harvest-announcements?activeOnly=true",
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Gagal memuat announcements");
      setAnnouncements(json.data?.announcements || []);
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
      const res = await fetch("/api/florist/preorders");
      const json = await res.json();
      if (res.ok) {
        setMyPreOrders(json.data?.preOrders || []);
      }
    } catch (err) {
      console.error("Failed to fetch pre-orders:", err);
    } finally {
      setIsLoadingPreOrders(false);
    }
  };

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

  const isLoading =
    activeTab === "browse" ? isLoadingAnnouncements : isLoadingPreOrders;

  const pendingCount = Array.isArray(myPreOrders)
    ? myPreOrders.filter((o) => o.status === "PENDING").length
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Rencana Panen
        </h1>
        <p className="text-muted-foreground">
          Lihat jadwal panen supplier dan ajukan pre-order bunga segar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Jadwal Aktif"
          value={Array.isArray(announcements) ? announcements.length : 0}
        />
        <StatCard
          label="Pre-Order Saya"
          value={Array.isArray(myPreOrders) ? myPreOrders.length : 0}
          color="primary"
        />
        <StatCard
          label="Menunggu Konfirmasi"
          value={pendingCount}
          color="warning"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            Jelajah Jadwal Panen
          </button>
          <button
            onClick={() => setActiveTab("my-orders")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "my-orders"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            Pre-Order Saya
          </button>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari nama bunga atau supplier..."
        />
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
              : "Belum ada jadwal panen aktif"
          }
          emptyDescription={
            searchQuery
              ? "Coba ubah kata kunci pencarian"
              : "Jadwal panen dari supplier akan muncul di sini"
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
          error={null}
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
          <PreOrderTable preOrders={filteredPreOrders} />
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
