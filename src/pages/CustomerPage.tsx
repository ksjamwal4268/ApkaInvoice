import { useParams, useNavigate, Link } from "react-router-dom";
import { formatDate } from "../utils/date";
import { formatInr } from "../utils/money";
import { getCustomer, getInvoicesForCustomer } from "../data/sampleData";
import { Language } from "../data/i18n";
import { StatusBadge } from "../components/StatusBadge";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";

export function CustomerPage({ lang: _lang }: { lang: Language }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = getCustomer(id || "");
  const invoices = customer ? getInvoicesForCustomer(customer.id) : [];

  if (!customer) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Customer not found</h2>
        <button
          onClick={() => navigate("/customers")}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm"
        >
          Back to customers
        </button>
      </div>
    );
  }

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOwed = invoices.reduce((sum, inv) => sum + inv.outstanding, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue" && inv.outstanding > 0).length;
  const avgDaysLate = customer.isChronicallyLate ? 22 : customer.grade === "B" ? 7 : 1;

  const phoneClean = customer.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
    `Hello ${customer.name}, greetings from Sharma Packaging. Regarding your account balance of ${formatInr(
      totalOwed
    )}, please let us know when we can expect settlement.`
  )}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate("/customers")}
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </button>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-extrabold text-base flex items-center justify-center shrink-0">
              {customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {customer.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    customer.grade === "A"
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                      : customer.grade === "B"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                  }`}
                >
                  Grade {customer.grade} Client
                </span>
                {customer.isChronicallyLate && (
                  <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 rounded">
                    Chronically Late
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>{customer.city}, {customer.state}</span>
                <span>•</span>
                <span className="font-mono">GSTIN: {customer.gstin || "Unregistered"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold hover:opacity-90 shadow-2xs tap-target"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-650 tap-target"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Grade Explanation */}
        {customer.gradeReasons && customer.gradeReasons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              Discipline Analysis:
            </span>
            <span>{customer.gradeReasons.join(" • ")}</span>
          </div>
        )}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Billed</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatInr(totalBilled)}
          </p>
          <span className="text-[11px] text-slate-400">{invoices.length} invoices generated</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Cleared</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatInr(totalPaid)}
          </p>
          <span className="text-[11px] text-slate-400">Received via bank</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Balance Owed</p>
          <p className={`text-xl font-bold tabular-nums mt-1 ${totalOwed > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
            {formatInr(totalOwed)}
          </p>
          <span className="text-[11px] text-slate-400">{overdueCount} overdue bills</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Payment Delay</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {avgDaysLate} Days
          </p>
          <span className="text-[11px] text-slate-400">Past due date average</span>
        </div>
      </div>

      {/* Customer Invoices Ledger */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Customer Invoices & Billing History ({invoices.length})
          </h2>
          <Link
            to="/invoices/create"
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
          >
            + Create New Invoice
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Invoice Date</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-right">Total Amount</th>
                <th className="px-5 py-3.5 text-right">Amount Paid</th>
                <th className="px-5 py-3.5 text-right">Outstanding</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                >
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-slate-900 dark:text-white">
                    {formatInr(inv.total)}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {inv.amountPaid > 0 ? formatInr(inv.amountPaid) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums font-bold">
                    <span className={inv.outstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}>
                      {formatInr(inv.outstanding)}
                    </span>
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
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                    >
                      <span>View</span>
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
