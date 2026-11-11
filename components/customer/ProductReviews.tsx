"use client";

import { Star, CheckCircle2 } from "lucide-react";
import type { Review } from "@/lib/api/products";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import ReviewForm from "./ReviewForm";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Props interface untuk komponen list reviews produk
interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

// Component display list review dan form input review baru
export default function ProductReviews({
  productId,
  reviews,
  averageRating,
  totalReviews,
}: ProductReviewsProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Check apakah user sudah pernah review produk ini
  const hasUserReviewed = reviews.some(
    (review) => review.user.name === session?.user?.name,
  );

  return (
    <div className="space-y-8">
      {/* Reviews Summary Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ulasan Pelanggan
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Apa kata pembeli
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ulasan nyata dari pelanggan yang telah memesan bunga ini.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Star className="h-5 w-5 fill-warning text-warning" aria-hidden="true" />
              <span className="text-2xl font-extrabold text-foreground">
                {averageRating.toFixed(1)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              dari {totalReviews} ulasan
            </p>
          </div>
          <div className="h-10 w-px bg-border" aria-hidden="true" />
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">100% Terverifikasi</p>
            <p>Hanya pembeli aktif</p>
          </div>
        </div>
      </div>

      {hasUserReviewed ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-5 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <span>
            Anda sudah memberikan ulasan untuk produk ini. Terima kasih telah membantu pembeli lain!
          </span>
        </div>
      ) : (
        <ReviewForm
          productId={productId}
          onReviewSubmitted={() => router.refresh()}
        />
      )}

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="text-sm font-medium text-foreground">Belum ada ulasan untuk produk ini</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Jadilah pelanggan pertama yang membagikan pengalaman setelah menerima bunga.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="py-6 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-bold text-foreground">
                    {review.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {review.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1" aria-label={`Rating ${review.rating} dari 5 bintang`}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/20"
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              {review.comment && (
                <p className="mt-3.5 text-sm leading-relaxed text-foreground/90">
                  {review.comment}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
