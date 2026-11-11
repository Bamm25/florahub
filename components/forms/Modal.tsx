import React from "react";
import { X } from "lucide-react";

// Antarmuka properti komponen modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

// Komponen modal dialog reusable dengan latar blur dan header tetap
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
}: ModalProps) {
  if (!isOpen) return null;

  // Konfigurasi ukuran lebar modal
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
  };

  // Render tampilan modal dialog
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className={`card-elevated w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="sticky top-0 z-50 bg-surface-container-low border-b border-border p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
