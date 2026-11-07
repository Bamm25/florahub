"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import InventoryTable from "@/components/florist/InventoryTable";
import InventoryModal from "@/components/florist/InventoryModal";
import InventoryStats from "@/components/florist/InventoryStats";
import InventoryFilters from "@/components/florist/InventoryFilters";

interface InventoryItem {
  id: string;
  quantity: number;
  minThreshold: number;
  maxCapacity: number | null;
  location: string | null;
  lastRestockDate: string | null;
  isLowStock: boolean;
  stock: {
    id: string;
    name: string;
    variety: string | null;
    unit: string;
    pricePerUnit: number;
    harvestDate: string;
    supplier: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function FloristInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    quantity: "",
    location: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lowStockCount, setLowStockCount] = useState(0);

  // Prevent data fetching until session is confirmed
  useEffect(() => {
    if (status === "authenticated") {
      fetchInventories();
    }
  }, [status]);

  const fetchInventories = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/florist/inventory");
      const json = await res.json();
      
      // Handle session errors
      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
        return;
      }
      
      if (!res.ok) throw new Error(json.message || "Gagal memuat inventory");
      
      setInventories(json.data?.inventories || []);
      setLowStockCount(json.data?.lowStockCount || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (inventory: InventoryItem) => {
    setSelectedInventory(inventory);
    setFormData({
      quantity: inventory.quantity.toString(),
      location: inventory.location || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInventory(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const qtyString = formData.quantity.trim();
    
    if (!qtyString) {
      errors.quantity = "Quantity tidak boleh kosong";
      setFormErrors(errors);
      return false;
    }

    const qty = parseInt(qtyString, 10);
    
    if (isNaN(qty)) {
      errors.quantity = "Quantity harus berupa angka valid";
    } else if (qty === 0) {
      errors.quantity = "Quantity tidak boleh 0";
    } else if (qty < 0) {
      errors.quantity = "Quantity tidak boleh negatif";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const qty = parseInt(formData.quantity.trim(), 10);
      if (isNaN(qty)) {
        throw new Error("Quantity harus berupa angka valid");
      }
      
      const payload = {
        quantity: qty,
        location: formData.location || null,
      };

      const res = await fetch(`/api/florist/inventory/${selectedInventory?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      // Handle session errors
      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
        return;
      }

      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan inventory");
      }

      await fetchInventories();
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (inventory: InventoryItem) => {
    if (!confirm(`Hapus inventory "${inventory?.stock?.name || 'Unknown'}"?`)) return;

    try {
      const res = await fetch(`/api/florist/inventory/${inventory.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      // Handle session errors
      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
        return;
      }

      if (!res.ok) {
        throw new Error(json.message || "Gagal menghapus inventory");
      }

      await fetchInventories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus inventory';
      setError(message);
    }
  };

  const filterInventory = (inv: InventoryItem) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      inv.stock?.name?.toLowerCase().includes(query) ||
      (inv.stock?.variety?.toLowerCase() || '').includes(query) ||
      inv.stock?.supplier?.name?.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "LOW_STOCK" && inv.isLowStock) ||
      (statusFilter === "NORMAL" && !inv.isLowStock);

    return matchesSearch && matchesStatus;
  };

  const filteredInventories = Array.isArray(inventories)
    ? inventories.filter(filterInventory)
    : [];

  const totalInventory = Array.isArray(inventories) ? inventories.length : 0;
  const normalStock = totalInventory - lowStockCount;

  // Prevent hydration issues - wait for session to load
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary"></div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Memuat inventory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Inventory Bunga</h1>
        <p className="text-muted-foreground">
          Kelola stok bahan baku bunga yang dibeli dari supplier
        </p>
      </div>

      <InventoryStats
        totalInventory={totalInventory}
        lowStockCount={lowStockCount}
        normalStock={normalStock}
      />

      <InventoryFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <DataStateWrapper
        isLoading={isLoading}
        error={error}
        isEmpty={filteredInventories.length === 0}
        emptyIcon={<Package className="w-16 h-16 text-muted-foreground" />}
        emptyTitle={
          searchQuery || statusFilter !== "ALL"
            ? "Tidak ada inventory yang sesuai filter"
            : "Belum ada inventory"
        }
        emptyDescription={
          searchQuery || statusFilter !== "ALL"
            ? "Coba ubah filter pencarian"
            : "Inventory akan otomatis bertambah setelah Anda membeli stock dari supplier"
        }
        onRetry={fetchInventories}
        loadingMessage="Memuat inventory..."
        errorTitle="Gagal Memuat Inventory"
      >
        <InventoryTable
          inventories={filteredInventories}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </DataStateWrapper>

      {isModalOpen && selectedInventory && (
        <InventoryModal
          inventory={selectedInventory}
          formData={formData}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onFormChange={handleFormChange}
        />
      )}
    </div>
  );
}
