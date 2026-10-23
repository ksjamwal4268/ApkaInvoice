import React from "react";
import { Sparkles } from "lucide-react";

export function DemoBanner(): React.JSX.Element {
  return (
    <div className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 text-teal-900 dark:text-teal-200 text-xs">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
        <span className="font-medium">
          <strong>Interactive Demo</strong> — Sharma Packaging, Pune. Sample MSME data.
        </span>
      </div>
      <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold hidden sm:inline">
        Simulated UPI & GST Invoicing
      </span>
    </div>
  );
}
