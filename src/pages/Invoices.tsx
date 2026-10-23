import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../utils/date";
import { formatInr } from "../utils/money";
import { INVOICES } from "../data/sampleData";
import { Language } from "../data/i18n";
import { Plus, Search, FileText, ArrowRight } from "lucide-react";

type Filter = "all" | "due" | "overdue" | "part-paid" | "paid" | "disputed";

export function Invoices({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    return {
      all: INVOICES.length,
      due: INVOICES.filter((i) => i.status === "due").length,
      overdue: INVOICES.filter((i) => i.status === "overdue").length,
      "part-paid": INVOICES.filter((i) => i.status === "part-paid").length,
      paid: INVOICES.filter((i) => i.status === "paid").length,
      disputed: INVOICES.filter((i) => i.status === "disputed").length,
    };
  }, []);

  const totalBilled = useMemo(() => INVOICES.reduce((sum, i) => sum + i.total, 0), []);
  const totalPaid = useMemo(() => INVOICES.reduce((sum, i) => sum + i.amountPaid, 0), []);
  const totalOutstanding = useMemo(() => INVOICES.reduce((sum, i) => sum + i.outstanding, 0), []);
  const totalOverdue = useMemo(
    () => INVOICES.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.outstanding, 0),
    []
  );

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

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "due", label: "Due", count: counts.due },
    { value: "overdue", label: "Overdue", count: counts.overdue },
    { value: "part-paid", label: "Part-paid", count: counts["part-paid"] },
    { value: "paid", label: "Paid", count: counts.paid },
    { value: "disputed", label: "Disputed", count: counts.disputed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Invoices Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track receivables, GST invoices, and collection statuses across all accounts.
          </p>
        </div>
        <div>
          <Link
            to="/invoices/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 shadow-sm transition-all hover:scale-[1.02] tap-target"
          >
            <Plus className="w-4 h-4" />
            <span>Create invoice</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Invoiced</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalBilled)}
          </p>
          <span className="text-[11px] text-slate-400">{INVOICES.length} invoices generated</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Collected</p>
          <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatInr(totalPaid)}
          </p>
          <span className="text-[11px] text-slate-400">Cleared in bank</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Outstanding</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalOutstanding)}
          </p>
          <span className="text-[11px] text-slate-400">Total unpaid balance</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Overdue Recovery</p>
          <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {formatInr(totalOverdue)}
          </p>
          <span className="text-[11px] text-rose-500 font-medium">{counts.overdue} invoices require action</span>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1 w-full lg:w-auto">
          {filters.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all tap-target flex items-center gap-1.5 ${
                  active
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Customer & City</th>
                  <th className="px-5 py-3.5 text-right">Invoice Total</th>
                  <th className="px-5 py-3.5 text-right">Amount Paid</th>
                  <th className="px-5 py-3.5 text-right">Outstanding</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        {inv.invoiceNumber}
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{inv.terms}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${inv.customerId}`);
                        }}
                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        {inv.customerName}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {inv.customerCity}, {inv.customerState}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-900 dark:text-white">
                      {formatInr(inv.total)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {inv.amountPaid > 0 ? formatInr(inv.amountPaid) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                      <span className={inv.outstanding > 0 && inv.status === "overdue" ? "text-rose-600 dark:text-rose-400" : ""}>
                        {formatInr(inv.outstanding)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-xs">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/invoices/${inv.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 tap-target"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
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
