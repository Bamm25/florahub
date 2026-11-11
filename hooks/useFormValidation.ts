import { useState, useCallback, FormEvent } from "react";

// Tipe pemetaan fungsi aturan validasi per bidang formulir
type ValidationRule<T> = {
  [K in keyof T]?: (value: T[K]) => string | undefined;
};

// Interface nilai kembalian untuk hook useFormValidation
interface UseFormValidationReturn<T> {
  formData: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFormData: (data: T) => void;
  validate: (rules: ValidationRule<T>) => boolean;
  handleSubmit: (onSubmit: (data: T) => Promise<void>) => (e: FormEvent) => Promise<void>;
  reset: (initialData?: T) => void;
  setError: (field: keyof T, message: string) => void;
  clearErrors: () => void;
}

// Hook kustom untuk pengelolaan state formulir dan penanganan validasi
export function useFormValidation<T extends Record<string, unknown>>(
  initialData: T
): UseFormValidationReturn<T> {
  const [formData, setFormDataState] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormDataState((prev) => ({ ...prev, [field]: value }));
    // Hapus pesan kesalahan saat nilai bidang formulir berubah
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  const setFormData = useCallback((data: T) => {
    setFormDataState(data);
    setErrors({});
  }, []);

  const validate = useCallback(
    (rules: ValidationRule<T>): boolean => {
      const newErrors: Record<string, string> = {};

      for (const field in rules) {
        const rule = rules[field];
        if (rule) {
          const error = rule(formData[field]);
          if (error) {
            newErrors[field] = error;
          }
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData]
  );

  const handleSubmit = useCallback(
    (onSubmit: (data: T) => Promise<void>) => {
      return async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
          await onSubmit(formData);
        } catch (err) {
          setErrors({
            submit: err instanceof Error ? err.message : "Terjadi kesalahan",
          });
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    [formData]
  );

  const reset = useCallback(
    (data?: T) => {
      setFormDataState(data || initialData);
      setErrors({});
      setIsSubmitting(false);
    },
    [initialData]
  );

  const setError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    isSubmitting,
    setField,
    setFormData,
    validate,
    handleSubmit,
    reset,
    setError,
    clearErrors,
  };
}
