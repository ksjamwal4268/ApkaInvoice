import React from "react";

interface KpiCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  highlight?: boolean;
}

export function KpiCard({
  label,
  value,
  change,
  changeType,
  highlight = false,
}: KpiCardProps): React.JSX.Element {
  const changeColor =
    changeType === "negative"
      ? "text-red-600 dark:text-red-400"
      : changeType === "positive"
      ? "text-teal-600 dark:text-teal-400"
      : "text-slate-500 dark:text-slate-400";

  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        highlight
          ? "bg-teal-600/10 border-teal-600/30"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sentence-case">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        {change && (
          <span className={changeColor} className="text-xs font-medium">
            {change}
          </span>
        )}
      </div>
    </div>
  );
}