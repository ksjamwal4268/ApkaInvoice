import React from "react";

type Status = "paid" | "overdue" | "part-paid" | "due" | "disputed";

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  paid: { label: "Paid", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300" },
  "part-paid": { label: "Part-paid", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" },
  due: { label: "Due", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200" },
  disputed: { label: "Disputed", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200" },
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}