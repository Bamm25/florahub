import React from "react";

type FormFieldType = "text" | "number" | "email" | "textarea" | "select" | "date";

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

/**
 * FormField component
 * Reusable form field with label, input/textarea/select, and error message
 */
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

  const renderInput = () => {
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
