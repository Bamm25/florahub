import { Check } from "lucide-react";

const GRID_COLS_CLASS: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

interface TrackingProgressTrackProps {
  steps: readonly string[];
  activeStepIndex: number;
  isCompletedAll?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Horizontal step progress indicator paired with dark editorial headers.
 */
export default function TrackingProgressTrack({
  steps,
  activeStepIndex,
  isCompletedAll = false,
  ariaLabel = "Tahap pengiriman",
  className = "",
}: TrackingProgressTrackProps) {
  const gridColsClass = GRID_COLS_CLASS[steps.length] ?? "grid-cols-3";
  const lastIndex = steps.length - 1;

  return (
    <ol
      aria-label={ariaLabel}
      className={`mt-6 grid ${gridColsClass} gap-3 border-t border-white/10 pt-5 ${className}`.trim()}
    >
      {steps.map((label, idx) => {
        const isCompleted = isCompletedAll ? idx < lastIndex : idx < activeStepIndex;
        const isCurrent = isCompletedAll ? idx === lastIndex : idx === activeStepIndex;
        const isDoneCircle = isCompleted || (isCompletedAll && idx === lastIndex);

        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors ${
                  isCompleted || isCurrent
                    ? "border-kicker bg-kicker text-surface-dark"
                    : "border-white/20 bg-white/5 text-white/45"
                }`}
              >
                {isDoneCircle ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              {idx < lastIndex && (
                <span
                  aria-hidden="true"
                  className={`hidden h-px flex-1 sm:block ${
                    isCompleted || isCompletedAll ? "bg-kicker" : "bg-white/15"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                isCurrent
                  ? "text-kicker"
                  : isCompleted
                    ? "text-white/90"
                    : "text-white/45"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
