"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  kicker?: string;
  size?: "sm" | "md" | "lg" | "xl";
  headerVariant?: "light" | "dark";
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "w-[min(calc(100dvw-2rem),28rem)]",
  md: "w-[min(calc(100dvw-2rem),42rem)]",
  lg: "w-[min(calc(100dvw-2rem),56rem)]",
  xl: "w-[min(calc(100dvw-2rem),64rem)]",
};

/** Native top-layer modal dialog with closedby light-dismiss and Safari pointer fallback. */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  kicker,
  size = "md",
  headerVariant = "light",
  footer,
  children,
}: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Safari fallback for closedby="any": require both press and release outside dialog bounds.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    let pressedOutside = false;

    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = event.target === dialog && isOutside(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && event.target === dialog && isOutside(event)) {
        onClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isOpen, onClose]);

  const isDarkHeader = headerVariant === "dark";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      {...({ closedby: "any" } as Record<string, string>)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (isOpen) {
          onClose();
        }
      }}
      className={`${SIZE_CLASSES[size]} rounded-2xl border border-border bg-card p-0 text-card-foreground`}
    >
      {isOpen ? (
        <div className="flex max-h-[min(90dvh,56rem)] flex-col overflow-hidden">
          <div
            className={`flex flex-shrink-0 items-start justify-between gap-4 px-6 py-5 ${
              isDarkHeader
                ? "bg-surface-dark text-white"
                : "border-b border-border bg-surface-container-low text-foreground"
            }`}
          >
            <div className="min-w-0">
              {kicker && (
                <p
                  className={`mb-1 text-xs font-semibold ${
                    isDarkHeader ? "text-kicker" : "text-primary"
                  }`}
                >
                  {kicker}
                </p>
              )}
              <h2
                id={titleId}
                className={`text-lg font-semibold leading-snug sm:text-xl ${
                  isDarkHeader ? "text-white" : "text-foreground"
                }`}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  id={subtitleId}
                  className={`mt-1 text-sm ${
                    isDarkHeader ? "text-white/75" : "text-muted-foreground"
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                isDarkHeader
                  ? "text-white/75 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
              }`}
              aria-label="Tutup dialog"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {footer && (
            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-surface-container-low px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
