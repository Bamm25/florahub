import React from "react";

// Tipe elemen input formulir
type FormFieldType = "text" | "number" | "email" | "textarea" | "select" | "date";

// Antarmuka properti komponen FormField
interface FormFieldProps {
  label: string;
  name: string;
  type?: FormFieldType;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
}

// Komponen input formulir reusable dengan label dan pesan kesalahan
export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  placeholder,
  options,
  rows = 3,
  min,
  max,
  step,
  disabled = false,
}: FormFieldProps) {
  const inputClasses = `input-field ${error ? "border-error" : ""}`;

  // Render elemen input sesuai tipe yang ditentukan
  const renderInput = () => {
    // Render textarea untuk input teks multibaris
    if (type === "textarea") {
      return (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`${inputClasses} resize-none`}
          disabled={disabled}
        />
      );
    }

    // Render dropdown pilihan jika tipe select
    if (type === "select" && options) {
      return (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          disabled={disabled}
        >
          <option value="">Pilih {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    // Render elemen input standar
    return (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClasses}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    );
  };

  // Render bidang formulir beserta label dan pesan error
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {renderInput()}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
