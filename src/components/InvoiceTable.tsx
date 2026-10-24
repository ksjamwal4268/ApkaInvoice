import React from "react";
import { StatusBadge } from "./StatusBadge";
import { Money } from "./Money";
import { formatDate } from "../utils/date";
import { Check, CheckCircle2 } from "lucide-react";

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  status: "paid" | "overdue" | "part-paid" | "due" | "disputed";
  total: number;
  outstanding: number;
  dueDate: Date;
}

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function InvoiceTable({
  invoices,
  selectedId,
  onSelect,
}: InvoiceTableProps): React.JSX.Element {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No invoices found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-300">
              <th className="px-4 py-3 text-center w-28">Select</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {invoices.map((inv) => {
              const isSelected = selectedId === inv.id;
              return (
                <tr
                  key={inv.id}
                  onClick={() => onSelect?.(inv.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100/60 dark:hover:bg-teal-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(inv.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                        isSelected
                          ? "bg-teal-600 text-white shadow-xs"
                          : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-teal-500 hover:text-teal-600"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber || (
                          <span className="text-slate-400 font-normal italic">
                            — (No Number)
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                          Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                    {inv.customerName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">
                    <Money paise={inv.total} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                    <Money paise={inv.outstanding} />
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
