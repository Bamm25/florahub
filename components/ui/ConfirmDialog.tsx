"use client";

import React, { useId, useState } from "react";
import Modal from "@/components/forms/Modal";

interface ConfirmDialogInputConfig {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  requiredMessage?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  inputConfig?: ConfirmDialogInputConfig;
}

/** Accessible native modal confirmation and optional prompt dialog with safe Cancel autofocus. */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "default",
  loading = false,
  inputConfig,
}: ConfirmDialogProps) {
  const inputId = useId();
  const [editedValue, setEditedValue] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputValue = editedValue ?? (inputConfig?.defaultValue ?? "");

  const resetDialogState = () => {
    setEditedValue(null);
    setValidationError(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetDialogState();
    onClose();
  };

  const confirmVariantClasses: Record<
    NonNullable<ConfirmDialogProps["variant"]>,
    string
  > = {
    danger:
      "bg-error text-error-foreground hover:bg-error/90 focus-visible:ring-error",
    warning:
      "bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning",
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
  };

  const handleConfirm = async () => {
    if (inputConfig) {
      const trimmed = inputValue.trim();
      const minLen = inputConfig.minLength ?? 1;
      if (trimmed.length < minLen) {
        setValidationError(
          inputConfig.requiredMessage ??
            `Isi minimal ${minLen} karakter sebelum melanjutkan.`
        );
        return;
      }
      setValidationError(null);
      await onConfirm(trimmed);
      resetDialogState();
      return;
    }

    await onConfirm();
    resetDialogState();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            autoFocus={!inputConfig}
            disabled={loading}
            onClick={handleClose}
            className="btn-tertiary h-10 px-4"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmVariantClasses[variant]}`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {inputConfig && (
          <div>
            <label
              htmlFor={inputId}
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {inputConfig.label}
            </label>
            <textarea
              id={inputId}
              autoFocus
              value={inputValue}
              onChange={(event) => {
                setEditedValue(event.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={inputConfig.placeholder}
              className="input-field"
              disabled={loading}
            />
            {validationError && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-error">
                {validationError}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
