import { useState, useMemo } from "react";
import { Shell } from "../components/Shell";
import { StatusBadge } from "../components/StatusBadge";
import { Money } from "../components/Money";
import { EmptyState } from "../components/EmptyState";
import { formatDate } from "../utils/date";
import { INVOICES } from "../data/sampleData";
import { t, Language } from "../data/i18n;

type Filter = "all" | "due" | "overdue" | "part-paid" | "paid" | "disputed";

export function Invoices({ lang }: { lang: Language }): JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return INVOICES.filter((inv) => {
      if (filter !== "all" && inv.status !== filter) return false;
      if (search && !inv.customerName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "due", label: "Due" },
    { value: "overdue", label: "Overdue" },
    { value: "part-paid", label: "Part-paid" },
    { value: "paid", label: "Paid" },
    { value: "disputed", label: "Disputed" },
  ];

  const tableData = filtered.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    status: inv.status,
    total: inv.total,
    outstanding: inv.outstanding,
    dueDate: inv.dueDate,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Invoices
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track all invoices and their payment status.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors tap-target ${
                  active
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 w-full lg:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent pl-9 tap-target"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        {tableData.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No invoices found matching your filters.
            </p>
          </div>
        ) : (
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
              {tableData.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => (window.location.href = `/invoices/${inv.id}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
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
        )}
      </div>
    </div>
  );
}