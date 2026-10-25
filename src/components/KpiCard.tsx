import React from "react";
import { type LucideIcon } from "lucide-react";
import { GlowingEffect } from "./ui/glowing-effect";

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
    <div className="relative h-full rounded-2xl border border-slate-200/80 bg-white p-1.5 md:rounded-3xl md:p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
      />
      <div
        className={`relative flex h-full flex-col justify-between rounded-xl p-4 md:p-5 ${
          highlight
            ? "bg-linear-to-br from-teal-500/10 via-white to-white border border-teal-500/20"
            : "bg-white border border-slate-100"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {value}
            </p>
          </div>

          {Icon && (
            <div
              className={`p-2.5 rounded-xl transition-colors ${
                highlight
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-600"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>

        {(subtitle || change) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {subtitle && (
              <span className="text-slate-500 truncate">
                {subtitle}
              </span>
            )}
            {change && (
              <span
                className={`font-semibold shrink-0 ml-auto px-1.5 py-0.5 rounded text-[11px] ${
                  changeType === "positive"
                    ? "bg-emerald-50 text-emerald-700"
                    : changeType === "negative"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {change}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
