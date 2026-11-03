"use client";

import { useState } from "react";
import { Star, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { createProductReview } from "@/lib/api/products";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  productId,
  onReviewSubmitted,
}: ReviewFormProps) {
  const { data: session, status } = useSession();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (status === "unauthenticated") {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">
          Ingin memberikan ulasan?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-emerald-600 hover:underline"
          >
            Masuk ke akun Anda
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage("Silakan pilih rating bintang terlebih dahulu.");
      return;
    }
    if (comment.trim().length < 10) {
      setErrorMessage("Ulasan minimal 10 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await createProductReview(productId, {
        rating,
        comment: comment.trim(),
      });

      setSuccessMessage("Terima kasih! Ulasan Anda berhasil dikirim.");
      setComment("");
      onReviewSubmitted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengirim ulasan",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-5"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        Tulis Ulasan Produk
      </h3>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Star Selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Beri Rating Bintang:
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition hover:scale-110"
              aria-label={`Bintang ${star}`}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-gray-700">
            {hoveredRating || rating} dari 5
          </span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Pengalaman Anda Menggunakan Produk Ini:
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ceritakan kesegaran bunga, pengemasan, atau ketepatan pengiriman..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? "Mengirim..." : "Kirim Ulasan"}
      </button>
    </form>
  );
}
