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
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(true);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Check apakah user sudah beli produk ini setelah login
  useEffect(() => {
    if (status === "authenticated") {
      checkPurchaseStatus();
    } else {
      setIsCheckingPurchase(false);
    }
  }, [status, productId]);

  // Fetch purchase status dari API untuk validate eligibility
  const checkPurchaseStatus = async () => {
    try {
      setIsCheckingPurchase(true);
      const response = await fetch(`/api/products/${productId}/check-purchase`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const result = await response.json();
        setPurchaseStatus(result.data);
      }
    } catch (error) {
      console.error("Failed to check purchase status:", error);
    } finally {
      setIsCheckingPurchase(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-border bg-surface-container-low p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Ingin memberikan ulasan?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-success hover:underline"
          >
            Masuk ke akun Anda
          </Link>
        </p>
      </div>
    );
  }

  if (isCheckingPurchase) {
    return (
      <div className="rounded-xl border border-border bg-surface-container-low p-4 text-center">
        <p className="text-sm text-muted-foreground">Memeriksa status pembelian...</p>
      </div>
    );
  }

  if (purchaseStatus && !purchaseStatus.canReview) {
    return (
      <div className="rounded-xl border border-border bg-surface-container-low p-4">
        <div className="flex items-start gap-3">
          <ShoppingBag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              {purchaseStatus.status === "PENDING" ? "Pesanan Dalam Proses" : "Belum Membeli Produk"}
            </p>
            <p className="text-sm text-muted-foreground">
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
      className="rounded-lg border border-success/20 bg-success/5 p-5"
    >
      <h3 className="text-base font-semibold text-foreground mb-3">
        Tulis Ulasan Produk
      </h3>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-error/10 p-3 text-sm text-error border border-error/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success border border-success/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Star Selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">
          Beri Rating Bintang:
        </label>
        <div className="flex items-center gap-1">
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
              className="p-1 transition hover:scale-110"
              aria-label={`Bintang ${star}`}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating)
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-foreground/80">
            {hoveredRating || rating} dari 5
          </span>
        </div>
        {formErrors.rating && (
          <p className="mt-1 text-xs text-error">{formErrors.rating}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">
          Pengalaman Anda Menggunakan Produk Ini:
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setFormErrors({ ...formErrors, comment: "" });
          }}
          placeholder="Ceritakan kesegaran bunga, pengemasan, atau ketepatan pengiriman..."
          className="w-full rounded-lg border border-border p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
        <div className="mt-1 flex items-center justify-between">
          <div>
            {formErrors.comment && (
              <p className="text-xs text-error">{formErrors.comment}</p>
            )}
          </div>
          <p className={`text-xs ${characterCount > maxCharacters ? 'text-error' : 'text-muted-foreground'}`}>
            {characterCount}/{maxCharacters} karakter
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? "Mengirim..." : "Kirim Ulasan"}
      </button>
    </form>
  );
}
