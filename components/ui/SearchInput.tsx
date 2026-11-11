import React from "react";
import { Search } from "lucide-react";

// Antarmuka properti bidang input pencarian
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Komponen input pencarian reusable dilengkapi dengan ikon pencarian
export default function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  className = "",
}: SearchInputProps) {
  // Render bidang teks pencarian dengan posisi ikon absolut
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-10 w-full"
      />
    </div>
  );
}
