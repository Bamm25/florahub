# Supplier & Admin Development Guide

**Reference Implementation:** Florist Role  
**Generated:** 2026-11-07  
**For:** FloraHub Platform - Supplier and Admin Role Development

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Component Library](#component-library)
4. [Code Templates](#code-templates)
5. [Development Checklist](#development-checklist)
6. [Common Patterns](#common-patterns)
7. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
8. [Quality Gates](#quality-gates)

---

## Quick Start

### What This Guide Is

This is your **copy-paste reference** for building Supplier and Admin features. Every pattern here is proven, tested, and used in production Florist code.

### The Golden Rule

**Before writing ANY new page/component, find the equivalent Florist pattern and copy its structure.**

### File Organization

```
src/
├── app/
│   ├── supplier/              # Supplier role pages
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   └── inventory/
│   │
│   └── admin/                 # Admin role pages
│       ├── layout.tsx
│       ├── dashboard/
│       ├── users/
│       ├── orders/
│       └── settings/
│
├── components/
│   ├── ui/                    # Shared UI components (copy from Florist)
│   ├── forms/                 # Form components
│   ├── data/                  # Data display components
│   ├── supplier/              # Supplier-specific components
│   └── admin/                 # Admin-specific components
│
├── hooks/
│   ├── useDataFetching.ts
│   ├── useFormValidation.ts
│   └── usePagination.ts
│
├── lib/
│   ├── api/
│   │   ├── supplier.ts
│   │   └── admin.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
│
└── types/
    ├── supplier.ts
    └── admin.ts
```

---

## Architecture Overview

### The Florist Pattern Stack

Every CRUD page in Florist follows this architecture:

```
Page Component (150-250 lines)
├── State Management
│   ├── Data loading (data, isLoading, error)
│   ├── Filters (search, status)
│   └── Modal (isOpen, mode, selectedItem)
│
├── Data Fetching (useEffect)
│   └── Parallel fetching with Promise.all
│
├── Filtered Data (computed)
│   └── Client-side filtering
│
├── CRUD Handlers
│   ├── handleCreate
│   ├── handleEdit
│   └── handleDelete
│
└── Render
    ├── Header + Action Buttons
    ├── Stats Cards (StatCard)
    ├── Filters (SearchInput + selects)
    ├── DataStateWrapper
    │   └── Table/Grid
    └── Modal
        └── Form
```

### Component Hierarchy

```
DataStateWrapper (handles all states)
├── Loading → Shows spinner
├── Error → Shows error with retry
├── Empty → Shows empty state with CTA
└── Success → Renders children
    └── DataTable
        ├── Table headers
        ├── Table rows
        │   ├── StatusBadge
        │   └── ActionButtons
        └── Pagination (if needed)
```

---

## Component Library

### 1. DataStateWrapper

**Purpose:** Unified loading/error/empty state handling  
**Copy from:** Florist inline pattern (needs extraction)  
**Usage:** Wrap ALL data displays

**Create this file first:**

```tsx
// components/ui/DataStateWrapper.tsx
import { AlertTriangle } from "lucide-react";

interface DataStateWrapperProps {
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DataStateWrapper({
  isLoading,
  error,
  isEmpty,
  emptyIcon: Icon,
  emptyTitle,
  emptyDescription,
  onRetry,
  children
}: DataStateWrapperProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary" />
        <span className="sr-only">Memuat...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card-elevated p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-error mx-auto" />
        <div>
          <h3 className="font-semibold text-lg text-error">Terjadi Kesalahan</h3>
          <p className="text-muted-foreground text-sm mt-1">{error}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary">
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="card-elevated p-8 text-center space-y-4">
        <Icon className="w-16 h-16 text-muted-foreground mx-auto" />
        <div>
          <h3 className="font-semibold text-lg">{emptyTitle}</h3>
          {emptyDescription && (
            <p className="text-muted-foreground text-sm mt-1">
              {emptyDescription}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Success - render children
  return <>{children}</>;
}
```

**Usage:**

```tsx
<DataStateWrapper
  isLoading={isLoading}
  error={error}
  isEmpty={products.length === 0}
  emptyIcon={Package}
  emptyTitle="Belum ada produk"
  emptyDescription="Klik tombol di atas untuk menambah produk"
  onRetry={fetchProducts}
>
  <ProductTable products={products} />
</DataStateWrapper>
```

---

### 2. Modal

**Purpose:** Consistent modal dialogs  
**Copy from:** Florist inline pattern  
**Usage:** All forms, confirmations, detail views

```tsx
// components/ui/Modal.tsx
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  children
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl"
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`card-elevated w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container-low transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

---

### 3. FormField

**Purpose:** Consistent form input styling and validation  
**Copy from:** Florist inline pattern  
**Usage:** All forms

```tsx
// components/forms/FormField.tsx
interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "number" | "email" | "password" | "textarea" | "select";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  disabled?: boolean;
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required,
  placeholder,
  options,
  rows = 4,
  disabled
}: FormFieldProps) {
  const baseClasses = "input-field";
  const errorClasses = error ? "border-error focus:border-error" : "";
  const inputClasses = `${baseClasses} ${errorClasses}`;

  return (
    <div className="space-y-1">
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>

      {/* Input */}
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      ) : type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          <option value="">Pilih {label}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}

      {/* Error Message */}
      {error && (
        <p id={`${name}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

---

### 4. StatusBadge

**Purpose:** Color-coded status indicators  
**Copy from:** Florist inline pattern  
**Usage:** All status displays

```tsx
// components/ui/StatusBadge.tsx
type StatusVariant = "inventory" | "shipment" | "order" | "product" | "user";

interface StatusBadgeProps {
  status: string;
  variant: StatusVariant;
  size?: "sm" | "md";
}

const statusConfig = {
  inventory: {
    LOW_STOCK: { label: "Stok Menipis", color: "warning" },
    NORMAL: { label: "Normal", color: "success" },
    OUT_OF_STOCK: { label: "Habis", color: "error" }
  },
  shipment: {
    PENDING: { label: "Pending", color: "warning" },
    PROCESSING: { label: "Diproses", color: "info" },
    SHIPPED: { label: "Dikirim", color: "primary" },
    DELIVERED: { label: "Terkirim", color: "success" },
    CANCELLED: { label: "Dibatalkan", color: "error" }
  },
  order: {
    PENDING: { label: "Menunggu", color: "warning" },
    CONFIRMED: { label: "Dikonfirmasi", color: "info" },
    PROCESSING: { label: "Diproses", color: "info" },
    COMPLETED: { label: "Selesai", color: "success" },
    CANCELLED: { label: "Dibatalkan", color: "error" }
  },
  product: {
    ACTIVE: { label: "Aktif", color: "success" },
    INACTIVE: { label: "Nonaktif", color: "muted" },
    OUT_OF_STOCK: { label: "Habis", color: "error" },
    FEATURED: { label: "Unggulan", color: "primary" }
  },
  user: {
    ACTIVE: { label: "Aktif", color: "success" },
    INACTIVE: { label: "Nonaktif", color: "muted" },
    SUSPENDED: { label: "Ditangguhkan", color: "error" }
  }
} as const;

const colorClasses = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  info: "bg-info/10 text-info border-info/20",
  primary: "bg-primary/10 text-primary border-primary/20",
  muted: "bg-muted/10 text-muted-foreground border-muted/20"
};

export function StatusBadge({ status, variant, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[variant]?.[status];
  
  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/10 text-muted-foreground border border-muted/20">
        {status}
      </span>
    );
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${sizeClasses} ${colorClasses[config.color]}`}
    >
      {config.label}
    </span>
  );
}
```

---

### 5. StatCard

**Purpose:** Dashboard metric cards  
**Copy from:** Florist inline pattern  
**Usage:** Dashboard summaries

```tsx
// components/ui/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: "primary" | "success" | "warning" | "error" | "info";
  trend?: {
    direction: "up" | "down";
    value: number;
  };
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "primary",
  trend,
  onClick
}: StatCardProps) {
  const colorClasses = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    info: "text-info"
  };

  return (
    <div
      className={`card-elevated p-4 space-y-2 ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }`}
      onClick={onClick}
    >
      {/* Label with Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${colorClasses[color]}`} />}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.direction === "up" ? "text-success" : "text-error"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className={`text-2xl font-semibold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
```

---

### 6. SearchInput

**Purpose:** Consistent search UI  
**Copy from:** Florist inline pattern  
**Usage:** All list pages

```tsx
// components/ui/SearchInput.tsx
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  className = ""
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-10"
      />
    </div>
  );
}
```

---

### 7. ActionButtons

**Purpose:** Consistent table action buttons  
**Copy from:** Florist inline pattern  
**Usage:** Table action columns

```tsx
// components/ui/ActionButtons.tsx
import { Eye, Pencil, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: "sm" | "md";
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  size = "md"
}: ActionButtonsProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const padding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <div className="flex items-center gap-2">
      {onView && (
        <button
          onClick={onView}
          className={`${padding} rounded-lg text-info bg-info/5 hover:bg-info/10 transition`}
          title="Lihat Detail"
        >
          <Eye className={iconSize} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className={`${padding} rounded-lg text-primary bg-primary/5 hover:bg-primary/10 transition`}
          title="Edit"
        >
          <Pencil className={iconSize} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className={`${padding} rounded-lg text-error bg-error/5 hover:bg-error/10 transition`}
          title="Hapus"
        >
          <Trash2 className={iconSize} />
        </button>
      )}
    </div>
  );
}
```

---

## Code Templates

### Template 1: List Page with CRUD

**Copy this template for:** Supplier Products, Admin Users, Supplier Orders

```tsx
// app/supplier/products/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Package, Plus } from "lucide-react";

// UI Components
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { StatCard } from "@/components/ui/StatCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";

// Role-specific components
import { ProductTable } from "@/components/supplier/ProductTable";
import { ProductModal } from "@/components/supplier/ProductModal";

// Types
import type { Product } from "@/types/supplier";

export default function SupplierProductsPage() {
  // ===== STATE MANAGEMENT =====
  
  // Data loading state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ===== DATA FETCHING =====

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/supplier/products");
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Gagal memuat produk");
      }

      setProducts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat produk");
      console.error("Fetch products error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== COMPUTED DATA =====

  // Client-side filtering
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats calculation
  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === "ACTIVE").length,
    inactive: products.filter((p) => p.status === "INACTIVE").length,
    lowStock: products.filter((p) => p.stock < 10).length
  };

  // ===== CRUD HANDLERS =====

  const handleCreate = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Hapus produk "${product.name}"?`)) return;

    try {
      const res = await fetch(`/api/supplier/products/${product.id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Gagal menghapus produk");
      }

      await fetchProducts(); // Refresh list
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus produk");
      console.error("Delete product error:", err);
    }
  };

  const handleModalSubmit = async () => {
    setIsModalOpen(false);
    await fetchProducts(); // Refresh after create/update
  };

  // ===== RENDER =====

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Produk</h1>
          <p className="text-muted-foreground text-sm">
            Kelola katalog produk Anda
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Produk" value={stats.total} icon={Package} />
        <StatCard
          label="Produk Aktif"
          value={stats.active}
          icon={Package}
          color="success"
        />
        <StatCard
          label="Produk Nonaktif"
          value={stats.inactive}
          icon={Package}
          color="muted"
        />
        <StatCard
          label="Stok Menipis"
          value={stats.lowStock}
          icon={Package}
          color="warning"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari produk..."
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-full md:w-48"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>

      {/* Data Table with State Wrapper */}
      <DataStateWrapper
        isLoading={isLoading}
        error={error}
        isEmpty={filteredProducts.length === 0}
        emptyIcon={Package}
        emptyTitle={
          searchQuery || statusFilter !== "ALL"
            ? "Tidak ada produk yang sesuai"
            : "Belum ada produk"
        }
        emptyDescription={
          searchQuery || statusFilter !== "ALL"
            ? "Coba ubah filter pencarian Anda"
            : "Klik tombol di atas untuk menambah produk pertama"
        }
        onRetry={fetchProducts}
      >
        <ProductTable
          products={filteredProducts}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </DataStateWrapper>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === "create" ? "Tambah Produk" : "Edit Produk"}
          subtitle={
            modalMode === "edit" ? `Edit: ${selectedProduct?.name}` : undefined
          }
        >
          <ProductModal
            mode={modalMode}
            product={selectedProduct}
            onSubmit={handleModalSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
```

---

### Template 2: Modal Form Component

**Copy this template for:** All CRUD forms

```tsx
// components/supplier/ProductModal.tsx
import { useState } from "react";
import { FormField } from "@/components/forms/FormField";
import type { Product } from "@/types/supplier";

interface ProductModalProps {
  mode: "create" | "edit";
  product?: Product | null;
  onSubmit: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  image: string;
}

export function ProductModal({
  mode,
  product,
  onSubmit,
  onCancel
}: ProductModalProps) {
  // ===== STATE =====

  const [formData, setFormData] = useState<FormData>({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price?.toString() || "",
    stock: product?.stock?.toString() || "",
    categoryId: product?.categoryId || "",
    image: product?.image || ""
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== VALIDATION =====

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      errors.name = "Nama produk wajib diisi";
    }

    if (!formData.categoryId) {
      errors.categoryId = "Kategori wajib dipilih";
    }

    if (!formData.image.trim()) {
      errors.image = "URL gambar wajib diisi";
    }

    // Numeric validation with NaN check
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      errors.price = "Harga harus berupa angka lebih dari 0";
    }

    const stock = parseInt(formData.stock);
    if (!formData.stock || isNaN(stock) || stock < 0) {
      errors.stock = "Stok harus berupa angka tidak negatif";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== HANDLERS =====

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error on change
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against race conditions
    if (isSubmitting) return;

    // Validate first
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const url =
        mode === "create"
          ? "/api/supplier/products"
          : `/api/supplier/products/${product?.id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock)
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Gagal menyimpan produk");
      }

      onSubmit(); // Notify parent of success
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan produk");
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RENDER =====

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Nama Produk"
        name="name"
        value={formData.name}
        onChange={(value) => updateField("name", value)}
        error={formErrors.name}
        required
        placeholder="Contoh: Mawar Merah Holland"
      />

      <FormField
        label="Deskripsi"
        name="description"
        type="textarea"
        value={formData.description}
        onChange={(value) => updateField("description", value)}
        error={formErrors.description}
        rows={4}
        placeholder="Deskripsi detail produk..."
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Harga"
          name="price"
          type="number"
          value={formData.price}
          onChange={(value) => updateField("price", value)}
          error={formErrors.price}
          required
          placeholder="150000"
        />

        <FormField
          label="Stok"
          name="stock"
          type="number"
          value={formData.stock}
          onChange={(value) => updateField("stock", value)}
          error={formErrors.stock}
          required
          placeholder="100"
        />
      </div>

      <FormField
        label="Kategori"
        name="categoryId"
        type="select"
        value={formData.categoryId}
        onChange={(value) => updateField("categoryId", value)}
        error={formErrors.categoryId}
        required
        options={[
          { value: "cat1", label: "Bunga Potong" },
          { value: "cat2", label: "Tanaman Hias" }
        ]}
      />

      <FormField
        label="URL Gambar"
        name="image"
        value={formData.image}
        onChange={(value) => updateField("image", value)}
        error={formErrors.image}
        required
        placeholder="https://example.com/image.jpg"
      />

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Menyimpan..."
            : mode === "create"
            ? "Tambah"
            : "Simpan"}
        </button>
      </div>
    </form>
  );
}
```

---

### Template 3: Data Table Component

**Copy this template for:** All list displays

```tsx
// components/supplier/ProductTable.tsx
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { formatRupiah } from "@/lib/utils/formatters";
import type { Product } from "@/types/supplier";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductTable({
  products,
  onEdit,
  onDelete
}: ProductTableProps) {
  // Guard against non-array
  if (!Array.isArray(products)) {
    return null;
  }

  return (
    <div className="card-elevated overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-container-low">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Produk</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Kategori</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Harga</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Stok</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-surface-container-low/40 transition"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image || "/placeholder.jpg"}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.jpg";
                    }}
                  />
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-xs">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm">{product.category?.name || "N/A"}</p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="font-medium">{formatRupiah(product.price)}</p>
              </td>
              <td className="px-4 py-3 text-center">
                <p
                  className={`font-medium ${
                    product.stock < 10 ? "text-warning" : ""
                  }`}
                >
                  {product.stock}
                </p>
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={product.status} variant="product" />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <ActionButtons
                    onEdit={() => onEdit(product)}
                    onDelete={() => onDelete(product)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Template 4: Formatting Utilities

**Copy this file exactly:**

```tsx
// lib/utils/formatters.ts

/**
 * Format number to Indonesian Rupiah currency
 * @example formatRupiah(150000) → "Rp 150.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format date to Indonesian locale (day month year)
 * @example formatDate(new Date()) → "7 Nov 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/**
 * Format datetime to Indonesian locale with time
 * @example formatDateTime(new Date()) → "7 Nov 2026, 13:00"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Format relative time (minutes/hours/days ago)
 * @example formatRelativeTime(new Date(Date.now() - 3600000)) → "1 jam yang lalu"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  if (days < 7) return `${days} hari yang lalu`;
  
  return formatDate(d);
}

/**
 * Format file size to human-readable string
 * @example formatFileSize(1536) → "1.5 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
```

---

## Development Checklist

### Before Starting a Feature

- [ ] Find equivalent Florist page/component
- [ ] Review pattern in this guide
- [ ] Identify reusable components needed
- [ ] Check if custom hooks can be extracted
- [ ] Set up types in `types/supplier.ts` or `types/admin.ts`

### While Coding

**Component Structure:**
- [ ] Use `DataStateWrapper` for all data displays
- [ ] Use `Modal` for all forms/dialogs
- [ ] Use `FormField` for all form inputs
- [ ] Use `StatusBadge` for all status displays
- [ ] Use `StatCard` for dashboard metrics
- [ ] Use `ActionButtons` for table actions

**Code Safety:**
- [ ] Add `Array.isArray()` guard before `.map()`, `.filter()`, `.reduce()`
- [ ] Add `if (isSubmitting) return;` at start of submit handlers
- [ ] Check `isNaN()` after all `parseFloat()` / `parseInt()`
- [ ] Use optional chaining (`?.`) for nested object access
- [ ] Provide fallback values for nullable data (`|| 'N/A'`)

**Styling:**
- [ ] Use theme tokens (`primary`, `success`, `error`, `warning`, `info`, `muted-foreground`)
- [ ] NEVER use hardcoded Tailwind colors (`emerald-500`, `red-600`, etc.)
- [ ] Use semantic classes (`btn-primary`, `btn-secondary`, `input-field`, `card-elevated`)

**API Integration:**
- [ ] Use correct role-based endpoints (`/api/supplier/*` or `/api/admin/*`)
- [ ] NEVER use Customer endpoints (`/api/products`, `/api/orders`)
- [ ] Handle errors with user notifications, not just `console.error()`
- [ ] Set error state for all fetch failures

**Validation:**
- [ ] Separate validation function (`validateForm()`)
- [ ] Field-level error messages
- [ ] Clear errors on field change
- [ ] Check both empty AND invalid values (NaN, negative, etc.)

### Before Committing

**File Organization:**
- [ ] File under 300 lines (extract if longer)
- [ ] Clear separation: state → fetch → computed → handlers → render
- [ ] No business logic in JSX
- [ ] Extract repeated JSX into components

**Type Safety:**
- [ ] No `any` types (use Prisma-generated types or proper interfaces)
- [ ] All props have interfaces
- [ ] All API responses typed

**Code Quality:**
- [ ] No duplication (extract to shared components/utils)
- [ ] Consistent naming (`handleX`, `fetchX`, `validateX`)
- [ ] Clear variable names (no `data`, `temp`, `val`)
- [ ] Comments for complex logic only

### Before Pull Request

- [ ] Test create/edit/delete flows
- [ ] Test empty states
- [ ] Test error states (kill API server)
- [ ] Test loading states
- [ ] Test filter/search functionality
- [ ] Test validation (submit invalid data)
- [ ] Check browser console for errors
- [ ] Check Network tab for correct API endpoints
- [ ] Mobile responsive (test at 375px width)
- [ ] Verify follows Florist patterns

---

## Common Patterns

### Pattern 1: Parallel Data Fetching

**When:** Dashboard pages loading multiple metrics  
**From:** Florist harvest-plans page

```tsx
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch simultaneously
      const [ordersRes, productsRes, statsRes] = await Promise.all([
        fetch("/api/supplier/orders?status=PENDING"),
        fetch("/api/supplier/products?status=ACTIVE"),
        fetch("/api/supplier/dashboard/stats")
      ]);

      const [ordersData, productsData, statsData] = await Promise.all([
        ordersRes.json(),
        productsRes.json(),
        statsRes.json()
      ]);

      setOrders(ordersData.data || []);
      setProducts(productsData.data || []);
      setStats(statsData.data || {});
    } catch (err) {
      setError("Gagal memuat data dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  fetchDashboardData();
}, []);
```

---

### Pattern 2: Client-Side Filtering

**When:** Filter list by search + dropdown filters  
**From:** All Florist pages

```tsx
// State
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("ALL");
const [categoryFilter, setcategoryFilter] = useState("ALL");

// Computed filtered data
const filteredProducts = products.filter((product) => {
  // Search match
  const matchesSearch =
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase());

  // Status filter
  const matchesStatus = statusFilter === "ALL" || product.status === statusFilter;

  // Category filter
  const matchesCategory =
    categoryFilter === "ALL" || product.categoryId === categoryFilter;

  return matchesSearch && matchesStatus && matchesCategory;
});
```

---

### Pattern 3: Form State Management

**When:** Any form with validation  
**From:** All Florist modals

```tsx
// State
const [formData, setFormData] = useState<FormData>({ ...initialValues });
const [formErrors, setFormErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);

// Update helper
const updateField = (field: keyof FormData, value: string) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
  
  // Clear error when user types
  if (formErrors[field]) {
    setFormErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }
};

// Validation
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  
  // Add validation rules
  if (!formData.name.trim()) {
    errors.name = "Nama wajib diisi";
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

// Submit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return; // Race condition guard
  if (!validateForm()) return; // Validation guard
  
  setIsSubmitting(true);
  try {
    // API call
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Pattern 4: Optimistic Refetch

**When:** After CUD operations  
**From:** All Florist pages

```tsx
const handleCreate = async (data: CreateDTO) => {
  try {
    const res = await fetch("/api/supplier/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    // Optimistically refetch to show updated list
    await fetchProducts();
    
    // Close modal
    setIsModalOpen(false);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Gagal membuat produk");
  }
};
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Hardcoded Colors

```tsx
// ❌ WRONG
<div className="border-2 border-emerald-500 bg-emerald-50">
  <CheckCircle2 className="text-emerald-600" />
</div>

// ✅ CORRECT
<div className="border-2 border-primary bg-primary/10">
  <CheckCircle2 className="text-primary" />
</div>
```

**Why:** Breaks design system. If brand colors change, you'd need to find/replace hundreds of instances.

---

### ❌ Anti-Pattern 2: Missing Array Guards

```tsx
// ❌ WRONG
{categories.map((cat) => (
  <option key={cat.id} value={cat.id}>{cat.name}</option>
))}

// ✅ CORRECT
{Array.isArray(categories) && categories.map((cat) => (
  <option key={cat.id} value={cat.id}>{cat.name}</option>
))}
```

**Why:** Runtime crash if `categories` is `null`/`undefined`.

---

### ❌ Anti-Pattern 3: Missing Race Condition Guards

```tsx
// ❌ WRONG
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  // User can double-click before setIsSubmitting takes effect
};

// ✅ CORRECT
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return; // Guard at start
  setIsSubmitting(true);
};
```

**Why:** Prevents duplicate API requests from spam-clicking.

---

### ❌ Anti-Pattern 4: Unsafe Number Parsing

```tsx
// ❌ WRONG
if (parseFloat(formData.price) <= 0) {
  errors.price = "Harga harus lebih dari 0";
}
// parseFloat("abc") returns NaN, and NaN <= 0 is false!

// ✅ CORRECT
const price = parseFloat(formData.price);
if (isNaN(price) || price <= 0) {
  errors.price = "Harga harus berupa angka lebih dari 0";
}
```

**Why:** Invalid input passes validation without NaN check.

---

### ❌ Anti-Pattern 5: Wrong API Endpoints

```tsx
// ❌ WRONG - Using Customer endpoint from Supplier code
await fetch("/api/products", { method: "POST" });

// ✅ CORRECT - Use role-specific endpoint
await fetch("/api/supplier/products", { method: "POST" });
```

**Why:** **CRITICAL BUG** - Will 404 because backend route doesn't exist.

---

### ❌ Anti-Pattern 6: Silent Error Handling

```tsx
// ❌ WRONG
} catch (err) {
  console.error("Failed:", err);
  // User sees nothing!
}

// ✅ CORRECT
} catch (err) {
  console.error("Failed:", err);
  setError("Gagal memuat data");
  // Or: toast.error("Gagal memuat data");
}
```

**Why:** Users need feedback when operations fail.

---

### ❌ Anti-Pattern 7: Unsafe Nested Access

```tsx
// ❌ WRONG
{product.category.name}
// Crashes if category is null

// ✅ CORRECT
{product.category?.name || "Tanpa Kategori"}
// Or: {product?.category?.name ?? "N/A"}
```

**Why:** Runtime crash if any property in chain is null.

---

### ❌ Anti-Pattern 8: 'any' Types

```tsx
// ❌ WRONG
const whereClause: any = {};
const updateData: any = {};

// ✅ CORRECT
import { Prisma } from "@prisma/client";
const whereClause: Prisma.ProductWhereInput = {};
const updateData: Prisma.ProductUpdateInput = {};
```

**Why:** Loses type safety. Bugs that could be caught at compile-time become runtime errors.

---

## Quality Gates

### Gate 1: Component Extraction (Before PR)

**Rule:** If a pattern appears 3+ times, extract it to a component.

**Check:**
```bash
# Search for duplicated patterns
git diff main --name-only | xargs grep -l "className=\"card-elevated p-6"
```

**Action:** Extract to reusable component.

---

### Gate 2: Type Safety (Before PR)

**Rule:** Zero `any` types allowed.

**Check:**
```bash
# Find all 'any' usage
git diff main | grep "any"
```

**Action:** Replace with proper types (Prisma-generated or interfaces).

---

### Gate 3: Design System Compliance (Before PR)

**Rule:** No hardcoded Tailwind colors.

**Check:**
```bash
# Find hardcoded colors
git diff main | grep -E "(emerald|red|blue|green|yellow|gray)-[0-9]"
```

**Action:** Replace with theme tokens.

---

### Gate 4: API Endpoint Validation (Before PR)

**Rule:** All API calls use correct role endpoints.

**Check:**
```bash
# Find potential wrong endpoints
git diff main | grep -E "fetch\(['\"]\/api\/(products|orders|users)"
```

**Action:** Add role prefix: `/api/supplier/*` or `/api/admin/*`.

---

### Gate 5: Error Handling (Before PR)

**Rule:** All fetch calls have error state handling.

**Check:**
- Every `fetch()` must be in a try-catch
- Every catch block must set error state OR show toast
- No silent `console.error()` without user notification

---

### Gate 6: Validation (Before PR)

**Rule:** All forms have validation functions.

**Check:**
- `validateForm()` function exists
- `isNaN()` check after number parsing
- Required fields checked
- Form errors displayed to user

---

## Final Checklist

### Pre-Development

- [ ] Read this guide completely
- [ ] Review equivalent Florist page
- [ ] Set up component library (DataStateWrapper, Modal, FormField, etc.)
- [ ] Set up utilities (formatters.ts)

### During Development

- [ ] Follow Florist patterns exactly
- [ ] Use templates from this guide
- [ ] Add guards (array, race condition, null safety)
- [ ] Use theme tokens only
- [ ] Handle all errors with user notifications

### Pre-Commit

- [ ] Run all quality gates
- [ ] Test all CRUD operations
- [ ] Test empty/loading/error states
- [ ] Mobile responsive check
- [ ] No console errors

### Pre-PR

- [ ] File under 300 lines
- [ ] Zero `any` types
- [ ] No hardcoded colors
- [ ] Correct API endpoints
- [ ] Follows Florist patterns
- [ ] All gates passed

---

**Remember:** When in doubt, copy Florist. Every pattern in this guide is battle-tested in production.

**Questions?** Check `docs/CODE_QUALITY_AUDIT_CUSTOMER_VS_FLORIST.md` for detailed analysis and examples.

---

**Generated:** 2026-11-07  
**Version:** 1.0  
**Maintainer:** FloraHub Development Team
