import React from "react";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  Dot,
} from "recharts";
import { formatInr } from "../utils/money";
import { formatWeekLabel } from "../utils/date";

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

export function ForecastChart({
  weeks,
  shortfallWeekIndex,
  height = 300,
}: ForecastChartProps): React.JSX.Element {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No forecast data</p>
      </div>
    );
  }

  // Closing balance series - highlighted red at shortfall week
  const closingData = weeks.map((w, i) => ({
    ...w,
    fill: shortfallWeekIndex === i ? "#dc2626" : "#0f766b",
  }));

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="h-[{height}px] w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={closingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: "#64748b" }}
              interval={0}
            />
            <YAxis
              tickFormatter={(val: number) => `₹${Math.abs(val).toLocaleString()}`}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Label value="Closing balance" position="insideLeft" offset={-8} />
            <Line
              type="monotone"
              dataKey="closing"
              stroke="#0f766b"
              strokeWidth={2}
              dot={false}
            >
              {weeks.map((_, i) => (
                shortfallWeekIndex === i ? (
                  <Dot key={i} fill="#dc2626" stroke="#b91c1c" strokeWidth={2} r={4} />
                ) : null
              ))}
            </Line>
            <Area
              type="monotone"
              dataKey="closing"
              fill="#0f766b"
              fillOpacity={0.1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}