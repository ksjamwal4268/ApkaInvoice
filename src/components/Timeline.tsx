import React from "react";
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "../utils/date";
import { Money } from "./Money";

interface EvidenceEntry {
  id: string;
  date: Date;
  type: "invoice-sent" | "reminder" | "promise" | "payment" | "dispute";
  title: string;
  description: string;
  amount?: number;
  channel: "email" | "whatsapp" | "phone" | "in-person" | "letter";
}

interface TimelineProps {
  entries: EvidenceEntry[];
}

const TYPE_ICONS: Record<string, typeof Mail> = {
  "invoice-sent": Mail,
  reminder: Clock,
  promise: Clock,
  payment: CheckCircle2,
  dispute: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  "invoice-sent": "text-teal-600 dark:text-teal-400",
  reminder: "text-slate-500 dark:text-slate-400",
  promise: "text-amber-500 dark:text-amber-400",
  payment: "text-teal-600 dark:text-teal-400",
  dispute: "text-red-500 dark:text-red-400",
};

export function Timeline({ entries }: TimelineProps): React.JSX.Element {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No evidence recorded yet.
        </p>
      </div>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="space-y-5">
        {sorted.map((entry) => {
          const Icon = TYPE_ICONS[entry.type] || Mail;
          return (
            <div key={entry.id} className="relative pl-8">
              <div className="absolute -left-[3px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
              <div className="absolute -left-[1px] top-4 h-full w-0.5 border-l border-slate-200 dark:border-slate-700" />
              <div className="flex items-center gap-3 mb-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${TYPE_COLORS[entry.type] || "text-slate-500"}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {formatDate(entry.date)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                {entry.title}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {entry.description}
              </p>
              {entry.amount && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  <Money paise={entry.amount} />
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}