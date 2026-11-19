import React from "react";
import { Search } from "lucide-react";

// Antarmuka properti bidang input pencarian
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

// Komponen input pencarian reusable dilengkapi dengan ikon pencarian
export default function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  ariaLabel,
  className = "",
}: SearchInputProps) {
  // Render bidang teks pencarian dengan posisi ikon absolut
  return (
    <search className={`relative flex-1 block ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-10 w-full"
      />
    </search>
  );
}
