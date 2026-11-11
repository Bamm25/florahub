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
    <article
      className={`flex h-full flex-col rounded-2xl border bg-card ${
        address.isDefault ? "border-foreground/30" : "border-border"
      }`}
    >
      <div className="flex-1 px-5 py-4">
        <header className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {address.label}
          </h3>
          {address.isDefault && (
            <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-xs font-semibold text-foreground">
              Alamat utama
            </span>
          )}
        </header>

        <p className="text-sm font-medium text-foreground">
          {address.recipientName}
          <span className="mx-1.5 text-muted-foreground">·</span>
          <span className="font-normal tabular-nums text-muted-foreground">
            {address.phone}
          </span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {address.fullAddress}
        </p>
        <p className="text-sm text-muted-foreground">
          {address.city}, {address.province} {address.postalCode}
        </p>
      </div>

      {(onEdit || onDelete) && (
        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(address.id)}
              disabled={isDeleting}
              className="h-9 rounded-lg px-3 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(address)}
              className="h-9 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
            >
              Ubah
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
