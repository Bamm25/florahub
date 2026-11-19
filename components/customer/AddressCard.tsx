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
  onSetDefault?: (addressId: string) => void;
  isDeleting?: boolean;
  isSettingDefault?: boolean;
}

// Kartu alamat pengiriman dengan badge utama dan tombol aksi independen
export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting = false,
  isSettingDefault = false,
}: AddressCardProps) {
  return (
    <article
      className={`@container flex h-full flex-col rounded-2xl border bg-card transition-colors ${
        address.isDefault ? "border-foreground/40" : "border-border"
      }`}
    >
      <div className="flex-1 px-5 py-5">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {address.label}
          </h2>
          {address.isDefault && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Utama
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
          {address.city}, {address.province}{" "}
          <span className="tabular-nums">{address.postalCode}</span>
        </p>
      </div>

      {(onEdit || onDelete || (!address.isDefault && onSetDefault)) && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div>
            {!address.isDefault && onSetDefault && (
              <button
                type="button"
                onClick={() => onSetDefault(address.id)}
                disabled={isSettingDefault || isDeleting}
                className="min-h-10 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSettingDefault ? (
                  "Menyimpan..."
                ) : (
                  <>
                    Jadikan Utama
                    <span className="sr-only"> alamat {address.label}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(address.id)}
                disabled={isDeleting || isSettingDefault}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? (
                  "Menghapus..."
                ) : (
                  <>
                    Hapus
                    <span className="sr-only"> alamat {address.label}</span>
                  </>
                )}
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(address)}
                className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
              >
                Ubah
                <span className="sr-only"> alamat {address.label}</span>
              </button>
            )}
          </div>
        </footer>
      )}
    </article>
  );
}
