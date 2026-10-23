import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Money } from "../components/Money";
import { formatDate } from "../utils/date";
import { INVOICES } from "../data/sampleData";
import { Language } from "../data/i18n";
import { Plus, Search, FileText } from "lucide-react";

type Filter = "all" | "due" | "overdue" | "part-paid" | "paid" | "disputed";

export function Invoices({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return INVOICES.filter((inv) => {
      if (filter !== "all" && inv.status !== filter) return false;
      if (
        search &&
        !inv.customerName.toLowerCase().includes(search.toLowerCase()) &&
        !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track all invoices, overdue aging, and payment collection status.
          </p>
        </div>
        <div>
          <Link
            to="/invoices/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 shadow-xs transition-colors tap-target"
          >
            <Plus className="w-4 h-4" />
            <span>Create invoice</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 w-full lg:w-auto">
          {filters.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors tap-target ${
                  active
                    ? "bg-teal-600 text-white font-semibold"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No invoices found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-3.5">Invoice</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                  <th className="px-4 py-3.5 text-right">Outstanding</th>
                  <th className="px-4 py-3.5">Due date</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors group"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${inv.customerId}`);
                        }}
                        className="hover:underline hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        {inv.customerName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">
                      <Money paise={inv.total} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                      <Money paise={inv.outstanding} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
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
        )}
      </div>
    </div>
  );
}
