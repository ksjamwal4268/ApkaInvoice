import { useParams } from "react-router-dom";
import { Money } from "../components/Money";
import { formatDate } from "../utils/date";
import { formatInr } from "../utils/money";
import { getCustomer, getInvoicesForCustomer, CUSTOMERS } from "../data/sampleData";
import { Language } from "../data/i18n";

export function CustomerPage({ lang }: { lang: Language }) {
  const { id } = useParams();
  const customer = getCustomer(id || "");
  const invoices = customer ? getInvoicesForCustomer(customer.id) : [];

  if (!customer) {
    return (
              <div className="text-center py-20">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">Customer not found</h2>
        </div>
    );
  }

  const totalOwed = invoices.reduce((sum, inv) => sum + inv.outstanding, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  const avgDaysLate = customer.isChronicallyLate ? 22 : customer.grade === "B" ? 7 : 1;

  return (
          <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {customer.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {customer.city}, {customer.state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              customer.grade === "A" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400" :
              customer.grade === "B" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400" :
              "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
            }`}>
              Grade {customer.grade}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total owed</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{formatInr(totalOwed)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average days late</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{avgDaysLate}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue invoices</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{overdueCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Payment behaviour</h2>
          <p className="text-slate-700 dark:text-slate-300 mb-4">{customer.gradeReasons[0]}</p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {customer.gradeReasons.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-teal-600 dark:text-teal-400">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Invoice history</h2>
          {invoices.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No invoices for this customer.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Invoice</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Outstanding</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Due date</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInr(inv.total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInr(inv.outstanding)}</td>
                    <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
  );
}