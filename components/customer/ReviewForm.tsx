"use client";

import { useState, useEffect } from "react";
import { Star, Send, AlertCircle, CheckCircle2, ShoppingBag } from "lucide-react";
import { createProductReview } from "@/lib/api/products";
import { useSession } from "next-auth/react";
import Link from "next/link";

// Props interface untuk komponen form review produk
interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: () => void;
}

// Interface untuk status pembelian produk user
interface PurchaseStatus {
  canReview: boolean;
  status: "DELIVERED" | "PENDING" | "NOT_PURCHASED";
  message: string | null;
}

// Form untuk tulis review produk dengan rating dan comment validation
export default function ReviewForm({
  productId,
  onReviewSubmitted,
}: ReviewFormProps) {
  const { status } = useSession();
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Check apakah user sudah beli produk ini setelah login
  useEffect(() => {
    let cancelled = false;

    if (status !== "authenticated") {
      return;
    }

    async function check() {
      try {
        setIsCheckingPurchase(true);
        const response = await fetch(`/api/products/${productId}/check-purchase`, {
          credentials: "include",
        });

        if (response.ok && !cancelled) {
          const result = await response.json();
          setPurchaseStatus(result.data);
        }
      } catch (error) {
        if (!cancelled) {

        }
      } finally {
        if (!cancelled) {
          setIsCheckingPurchase(false);
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [status, productId]);

  if (status === "unauthenticated") {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ingin memberikan ulasan?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Masuk ke akun Anda
          </Link>
        </p>
      </div>
    );
  }

  if (isCheckingPurchase) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-6 text-center" role="status">
        <p className="text-sm text-muted-foreground">Memeriksa riwayat pesanan Anda...</p>
      </div>
    );
  }

  if (purchaseStatus && !purchaseStatus.canReview) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {purchaseStatus.status === "PENDING"
                ? "Pesanan dalam proses"
                : "Ulasan hanya untuk pembeli terverifikasi"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {purchaseStatus.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Validate rating dan comment sebelum submit
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Rating validation
    if (!rating || rating === 0) {
      errors.rating = "Silakan pilih rating bintang terlebih dahulu";
    } else if (isNaN(Number(rating))) {
      errors.rating = "Rating tidak valid";
    } else if (rating < 1 || rating > 5) {
      errors.rating = "Rating harus antara 1-5 bintang";
    }

    // Comment validation
    if (!comment.trim()) {
      errors.comment = "Ulasan tidak boleh kosong";
    } else if (comment.trim().length < 10) {
      errors.comment = "Ulasan minimal 10 karakter";
    } else if (comment.trim().length > 500) {
      errors.comment = "Ulasan maksimal 500 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit review ke API setelah validate form
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setFormErrors({});
      await createProductReview(productId, {
        rating,
        comment: comment.trim(),
      });

      setSuccessMessage("Terima kasih! Ulasan Anda berhasil dikirim.");
      setComment("");
      setRating(5);
      onReviewSubmitted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengirim ulasan",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = comment.trim().length;
  const maxCharacters = 500;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-surface p-6 sm:p-7"
    >
      <div className="border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Bagikan pengalaman
        </p>
        <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          Tulis Ulasan Produk
        </h3>
      </div>

      <div aria-live="polite" className="mt-4">
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Star Selector */}
      <div className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rating Bintang
        </label>
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star);
                setFormErrors({ ...formErrors, rating: "" });
              }}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-muted"
              aria-label={`Beri rating ${star} bintang`}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/30"
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-foreground">
            {hoveredRating || rating} dari 5 bintang
          </span>
        </div>
        {formErrors.rating && (
          <p className="mt-1.5 text-xs text-error">{formErrors.rating}</p>
        )}
      </div>

      {/* Comment */}
      <div className="mt-5">
        <label htmlFor="review-comment" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ulasan Anda
        </label>
        <textarea
          id="review-comment"
          rows={4}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setFormErrors({ ...formErrors, comment: "" });
          }}
          placeholder="Ceritakan kondisi bunga saat diterima, kesegaran, keharuman, atau kerapian rangkaian..."
          className="mt-2 w-full rounded-xl border border-border bg-input p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div>
            {formErrors.comment && (
              <p className="text-error">{formErrors.comment}</p>
            )}
          </div>
          <p className={characterCount > maxCharacters ? "text-error" : "text-muted-foreground"}>
            {characterCount}/{maxCharacters} karakter (min. 10)
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary min-w-[180px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Mengirim..." : "Kirim Ulasan"}
        </button>
      </div>
    </form>
  );
}
