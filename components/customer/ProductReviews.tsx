"use client";

import { Star, CheckCircle2 } from "lucide-react";
import type { Review } from "@/lib/api/products";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import ReviewForm from "./ReviewForm";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
    <div className="card-elevated space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-bold text-foreground">Ulasan Pembeli</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-warning text-warning" />
            <span className="text-lg font-bold text-foreground">
              {averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">({totalReviews} ulasan)</span>
        </div>
      </div>

      {hasUserReviewed ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <span>
            Anda sudah memberikan ulasan untuk produk ini. Terima kasih atas
            partisipasi Anda!
          </span>
        </div>
      ) : (
        <ReviewForm
          productId={productId}
          onReviewSubmitted={() => router.refresh()}
        />
      )}

      {reviews.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Belum ada ulasan untuk produk ini. Jadilah yang pertama memberikan
          ulasan!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20 text-sm font-semibold text-success">
                    {review.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
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
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? "fill-warning text-warning"
                          : "fill-muted-foreground/20 text-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm leading-relaxed text-foreground">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
