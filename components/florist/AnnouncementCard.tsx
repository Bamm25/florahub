import React from "react";
import Image from "next/image";
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
    <article className="m-card group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-foreground/30">
      <div>
        <div className="relative h-48 overflow-hidden bg-surface-container-low">
          {announcement.image ? (
            <Image
              src={announcement.image}
              alt={announcement.flowerName}
              fill
              unoptimized
              className="m-zoom object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-4xl italic text-primary/40">
              {announcement.flowerName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center rounded-md bg-primary/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground backdrop-blur-xs">
              Aktif
            </span>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {announcement.supplier.name}
            </span>
            <h3 className="mt-0.5 line-clamp-1 text-base font-bold text-foreground">
              {announcement.flowerName}
              {announcement.variety && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({announcement.variety})
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Panen:{" "}
              <time dateTime={announcement.harvestDate} className="font-medium text-foreground">
                {formatDate(announcement.harvestDate)}
              </time>
            </p>
            {announcement.location && (
              <p className="truncate">{announcement.location}</p>
            )}
          </div>

          <div className="space-y-2 border-t border-border/80 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">
                Harga per Tangkai
              </span>
              <span className="text-base font-bold tabular-nums text-foreground">
                {formatRupiah(announcement.pricePerUnit)}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sisa Kuota</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {available.toLocaleString("id-ID")} /{" "}
                  {announcement.estimatedQuantity.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    percentBooked >= 80
                      ? "bg-error"
                      : percentBooked >= 50
                        ? "bg-warning"
                        : "bg-primary"
                  }`}
                  style={{ width: `${percentBooked}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        <button
          type="button"
          onClick={() => onCreatePreOrder(announcement)}
          disabled={available <= 0}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {available > 0 ? "Ajukan Pre-Order" : "Kuota Habis"}
        </button>
      </div>
    </article>
  );
}
