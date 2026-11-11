import React from "react";
import { Calendar, MapPin, Plus, Flower2 } from "lucide-react";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

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

interface AnnouncementCardProps {
  announcement: HarvestAnnouncement;
  onCreatePreOrder: (announcement: HarvestAnnouncement) => void;
}

/**
 * AnnouncementCard component
 * Display harvest announcement from Supplier with create pre-order button
 */
export default function AnnouncementCard({
  announcement,
  onCreatePreOrder,
}: AnnouncementCardProps) {
  const totalOrdered = announcement.totalReservedQuantity ?? 0;
  const available = Math.max(0, announcement.estimatedQuantity - totalOrdered);
  const percentBooked = announcement.estimatedQuantity > 0
    ? Math.min(100, (totalOrdered / announcement.estimatedQuantity) * 100)
    : 0;

  return (
    <div className="card-elevated p-0 overflow-hidden hover:shadow-xl transition-all">
      <div className="relative h-48 bg-surface-container-low">
        {announcement.image ? (
          <img
            src={announcement.image}
            alt={announcement.flowerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Flower2 className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/90 text-white border border-success">
            Aktif
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {announcement.flowerName}
            {announcement.variety && (
              <span className="text-sm text-muted-foreground">
                {" "}
                ({announcement.variety})
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {announcement.supplier.name}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-foreground">
              Panen: {formatDate(announcement.harvestDate)}
            </span>
          </div>
          {announcement.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {announcement.location}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Harga</span>
            <span className="text-lg font-bold text-foreground">
              {formatRupiah(announcement.pricePerUnit)}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Kapasitas</span>
              <span className="text-foreground font-medium">
                {available} / {announcement.estimatedQuantity}
              </span>
            </div>
            <div className="w-full bg-surface-container-low rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentBooked >= 80
                    ? "bg-error"
                    : percentBooked >= 50
                      ? "bg-warning"
                      : "bg-success"
                }`}
                style={{ width: `${percentBooked}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => onCreatePreOrder(announcement)}
          disabled={available <= 0}
          className="w-full btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {available > 0 ? "Buat Pre-Order" : "Kapasitas Penuh"}
        </button>
      </div>
    </div>
  );
}
