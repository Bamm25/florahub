"use client";

import { Star } from "lucide-react";
import type { Review } from "@/lib/api/products";
import { formatRelativeTime } from "@/lib/utils/formatters";
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ulasan Pembeli
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5">
          <Star className="h-5 w-5 fill-warning text-warning" aria-hidden="true" />
          <span className="text-2xl font-extrabold tabular-nums text-foreground">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            · {totalReviews} ulasan
          </span>
        </div>
      </div>

      {hasUserReviewed ? (
        <div className="rounded-2xl border border-success/30 bg-card p-5 text-sm font-medium text-foreground">
          Anda sudah mengulas produk ini.
        </div>
      ) : (
        <ReviewForm
          productId={productId}
          onReviewSubmitted={() => router.refresh()}
        />
      )}

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
          <p className="text-sm font-medium text-foreground">Belum ada ulasan</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Jadilah yang pertama mengulas produk ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6"
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
                      {formatRelativeTime(review.createdAt)}
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
