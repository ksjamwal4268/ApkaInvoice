import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CUSTOMERS, getInvoicesForCustomer } from "../data/sampleData";
import { formatInr } from "../utils/money";
import { Language } from "../data/i18n";
import { Users, AlertTriangle, CheckCircle, Search, ArrowRight } from "lucide-react";

export function Customers({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const customersData = useMemo(() => {
    return CUSTOMERS.map((c) => {
      const invs = getInvoicesForCustomer(c.id);
      const totalOwed = invs.reduce((sum, inv) => sum + inv.outstanding, 0);
      const overdueCount = invs.filter((inv) => inv.status === "overdue" && inv.outstanding > 0).length;
      return {
        ...c,
        totalInvoices: invs.length,
        totalOwed,
        overdueCount,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    return customersData.filter((c) => {
      if (gradeFilter !== "all" && c.grade !== gradeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customersData, gradeFilter, search]);

  const totalOwedAll = customersData.reduce((sum, c) => sum + c.totalOwed, 0);
  const chronicCount = customersData.filter((c) => c.isChronicallyLate).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Customers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Payment discipline grades, overdue balances, and customer credit health.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{CUSTOMERS.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Chronically Late</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{chronicCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Money Owed</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">{formatInr(totalOwedAll)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, city, GSTIN..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto">
          {["all", "A", "B", "C"].map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors tap-target ${
                gradeFilter === grade
                  ? "bg-teal-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {grade === "all" ? "All grades" : `Grade ${grade}`}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Payment Grade</th>
                <th className="px-5 py-3.5 text-right">Invoices</th>
                <th className="px-5 py-3.5 text-right">Total Owed</th>
                <th className="px-5 py-3.5 text-right">Overdue</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-750/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {c.gstin || "Unregistered"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-xs">
                    {c.city}, {c.state}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.grade === "A"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                            : c.grade === "B"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        Grade {c.grade}
                      </span>
                      {c.isChronicallyLate && (
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                          Chronic
                        </span>
                      )}
                    </div>
                    {c.gradeReasons && c.gradeReasons[0] && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs truncate">
                        {c.gradeReasons[0]}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {c.totalInvoices}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatInr(c.totalOwed)}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {c.overdueCount > 0 ? (
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {c.overdueCount} overdue
                      </span>
                    ) : (
                      <span className="text-xs text-teal-600 dark:text-teal-400">Up to date</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${c.id}`);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 tap-target"
                    >
                      <span>Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
