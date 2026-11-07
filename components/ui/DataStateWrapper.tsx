import React from "react";
import LoadingSpinner from "./LoadingSpinner";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";

interface DataStateWrapperProps {
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  loadingMessage?: string;
  errorTitle?: string;
  children: React.ReactNode;
}

/**
 * DataStateWrapper component
 * Handles loading, error, and empty states in one component
 */
export default function DataStateWrapper({
  isLoading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRetry,
  loadingMessage,
  errorTitle,
  children,
}: DataStateWrapperProps) {
  if (isLoading) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} title={errorTitle} />;
  }

  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children}</>;
}
