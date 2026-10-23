import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatInr } from "../utils/money";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

interface ForecastChartProps {
  weeks: Array<{
    weekLabel: string;
    opening: number;
    inflow: number;
    outflow: number;
    closing: number;
  }>;
  shortfallWeekIndex: number | null;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const isShortfall = data.closing < 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
        <span className="font-semibold text-slate-900 dark:text-white">
          Week of {data.weekLabel}
        </span>
        {isShortfall && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
            <AlertCircle className="w-3 h-3" /> Shortfall
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Opening balance</span>
          <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
            {formatInr(data.opening)}
          </span>
        </div>
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Inflow
          </span>
          <span className="tabular-nums font-semibold">
            +{formatInr(data.inflow)}
          </span>
        </div>
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Outflow
          </span>
          <span className="tabular-nums font-semibold">
            -{formatInr(data.outflow)}
          </span>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="font-semibold text-slate-900 dark:text-white">Closing Balance</span>
          <span
            className={`tabular-nums font-bold text-sm ${
              isShortfall
                ? "text-rose-600 dark:text-rose-400"
                : "text-teal-600 dark:text-teal-400"
            }`}
          >
            {formatInr(data.closing)}
          </span>
        </div>
      </div>
    </div>
  );
};

export function ForecastChart({
  weeks,
  shortfallWeekIndex: _shortfallWeekIndex,
  height = 320,
}: ForecastChartProps): React.JSX.Element {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No forecast data available</p>
      </div>
    );
  }

  // Format tick labels as Indian currency abbreviations (₹25L, ₹10L, ₹0)
  const formatYAxis = (val: number) => {
    const rupees = Math.round(val / 100);
    const abs = Math.abs(rupees);
    const sign = rupees < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}k`;
    return `${sign}₹${abs}`;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={weeks} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />

          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Deficit baseline */}
          <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.7} />

          <Area
            type="monotone"
            dataKey="closing"
            stroke="#0d9488"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
            dot={{ r: 4, strokeWidth: 2, stroke: "#0d9488", fill: "#fff" }}
            activeDot={{ r: 6, stroke: "#0d9488", strokeWidth: 2, fill: "#0d9488" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
