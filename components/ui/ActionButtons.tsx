import React from "react";
import { Edit, Trash2 } from "lucide-react";

// Antarmuka properti kumpulan tombol aksi
interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  customActions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
    variant?: "primary" | "error" | "tertiary";
  }>;
  size?: "sm" | "md";
  disabled?: boolean;
}

// Komponen grup tombol aksi reusable untuk melihat, mengedit, menghapus, atau aksi kustom
export default function ActionButtons({
  onEdit,
  onDelete,
  onView,
  customActions,
  size = "md",
  disabled = false,
}: ActionButtonsProps) {
  // Penentuan ukuran ikon dan jarak dalam tombol berdasarkan prop ukuran
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const buttonPadding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5";

  // Pemetaan kelas gaya berdasarkan varian warna aksi kustom
  const variantClasses: Record<string, string> = {
    primary: "text-primary bg-primary/5 hover:bg-primary/10",
    error: "text-error bg-error/5 hover:bg-error/10",
    tertiary: "text-tertiary bg-tertiary/5 hover:bg-tertiary/10",
  };

  // Render wadah flex horizontal berisi kumpulan tombol aksi
  return (
    <div className="flex items-center justify-center gap-2">
      {onView && (
        <button
          onClick={onView}
          disabled={disabled}
          className={`inline-flex items-center gap-1 ${buttonPadding} text-sm font-medium text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          title="View"
        >
          <span className={iconSize}>👁</span>
          View
        </button>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          disabled={disabled}
          className={`inline-flex items-center gap-1 ${buttonPadding} text-sm font-medium text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Edit"
        >
          <Edit className={iconSize} />
          Edit
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          disabled={disabled}
          className={`${buttonPadding} text-error bg-error/5 rounded-xl hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Hapus"
        >
          <Trash2 className={iconSize} />
        </button>
      )}

      {customActions &&
        customActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-1 ${buttonPadding} text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              variantClasses[action.variant || "primary"]
            }`}
            title={action.label}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
    </div>
  );
}
