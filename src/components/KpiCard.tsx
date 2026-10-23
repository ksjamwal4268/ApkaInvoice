import React from "react";
import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  highlight?: boolean;
  icon?: LucideIcon;
  subtitle?: string;
}

export function KpiCard({
  label,
  value,
  change,
  changeType,
  highlight = false,
  icon: Icon,
  subtitle,
}: KpiCardProps): React.JSX.Element {
  return (
    <div
      className={`group relative rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? "bg-linear-to-br from-teal-500/10 via-white to-white dark:from-teal-950/40 dark:via-slate-800 dark:to-slate-800 border-teal-500/30 dark:border-teal-700/50"
          : "bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={`p-2.5 rounded-xl transition-colors ${
              highlight
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-600 dark:group-hover:bg-teal-950/40 dark:group-hover:text-teal-300"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || change) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </span>
          )}
          {change && (
            <span
              className={`font-semibold shrink-0 ml-auto px-1.5 py-0.5 rounded text-[11px] ${
                changeType === "positive"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : changeType === "negative"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
