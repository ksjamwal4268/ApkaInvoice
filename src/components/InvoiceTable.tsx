import React from "react";
import { StatusBadge } from "./StatusBadge";
import { Money } from "./Money";
import { formatDate } from "../utils/date";

interface InvoiceRow {
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
  onSelect?: (id: string) => void;
}

export function InvoiceTable({
  invoices,
  onSelect,
}: InvoiceTableProps): React.JSX.Element {
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No invoices found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Invoice
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Customer
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Total
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Outstanding
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Due date
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={() => onSelect?.(inv.id)}
              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
            >
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900 dark:text-white">
                  {inv.invoiceNumber || <span className="text-slate-400 font-normal italic">— (No Number)</span>}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {inv.customerName}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">
                <Money paise={inv.total} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                <Money paise={inv.outstanding} />
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {formatDate(inv.dueDate)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}