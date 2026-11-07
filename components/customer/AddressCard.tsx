import { MapPin, Edit, Trash2, Star } from "lucide-react";

// Props interface untuk komponen card display alamat
interface AddressCardProps {
  address: {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
    postalCode: string;
    isDefault: boolean;
  };
  onEdit?: (address: AddressCardProps["address"]) => void;
  onDelete?: (addressId: string) => void;
  isDeleting?: boolean;
}

// Card display alamat dengan badge default dan action buttons
export function AddressCard({
  address,
  onEdit,
  onDelete,
  isDeleting = false,
}: AddressCardProps) {
  return (
    <div className="card-elevated relative">
      {address.isDefault && (
        <div className="absolute right-6 top-6 flex items-center gap-1.5 badge bg-primary text-white">
          <Star className="h-4 w-4 fill-current" />
          Alamat Utama
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-3">
            {address.label}
          </h3>
          <p className="text-base font-semibold text-foreground mb-2">
            {address.recipientName} • {address.phone}
          </p>
          <p className="text-base text-muted-foreground mb-1">
            {address.fullAddress}
          </p>
          <p className="text-base text-muted-foreground">
            {address.city}, {address.province} {address.postalCode}
          </p>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-6 flex gap-3">
          {onEdit && (
            <button onClick={() => onEdit(address)} className="btn-secondary flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(address.id)}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-error/30 bg-error/5 px-6 py-3 text-base font-semibold text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex-1"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
