import React from "react";

type Status = "paid" | "overdue" | "part-paid" | "due" | "disputed";

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  paid: {
    label: "Paid",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  overdue: {
    label: "Overdue",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    pulse: true,
  },
  "part-paid": {
    label: "Part-paid",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  due: {
    label: "Due",
    bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  disputed: {
    label: "Disputed",
    bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.due;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-semibold rounded-full select-none ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${config.bg} ${config.text}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      <span>{config.label}</span>
    </span>
  );
}
