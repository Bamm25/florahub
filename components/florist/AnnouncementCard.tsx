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
  totalReservedQuantity?: number;
}

// Props interface untuk komponen kartu pengumuman panen
interface AnnouncementCardProps {
  announcement: HarvestAnnouncement;
  onCreatePreOrder: (announcement: HarvestAnnouncement) => void;
}

// Komponen kartu pengumuman panen supplier dengan aksi buat pre-order
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
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between">
      <div>
        <div className="relative h-44 bg-surface-container-low overflow-hidden">
          {announcement.image ? (
            <img
              src={announcement.image}
              alt={announcement.flowerName}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/50">
              <Flower2 className="h-10 w-10 stroke-[1.5]" />
            </div>
          )}
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600/95 text-white backdrop-blur-xs">
              Aktif
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {announcement.supplier.name}
            </span>
            <h3 className="font-semibold text-foreground text-sm line-clamp-1 mt-0.5">
              {announcement.flowerName}
              {announcement.variety && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({announcement.variety})
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-violet-500" />
              <span>Panen: {formatDate(announcement.harvestDate)}</span>
            </div>
            {announcement.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{announcement.location}</span>
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-border/80 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Harga per Tangkai</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {formatRupiah(announcement.pricePerUnit)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sisa kuota</span>
                <span className="text-foreground font-semibold tabular-nums">
                  {available.toLocaleString("id-ID")} / {announcement.estimatedQuantity.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    percentBooked >= 80
                      ? "bg-rose-500"
                      : percentBooked >= 50
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${percentBooked}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <button
          onClick={() => onCreatePreOrder(announcement)}
          disabled={available <= 0}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {available > 0 ? "Ajukan Pre-Order" : "Kuota Habis"}
        </button>
      </div>
    </div>
  );
}
