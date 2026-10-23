import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { formatDate } from "../utils/date";
import { formatInr, amountInWords } from "../utils/money";
import { getInvoice } from "../data/sampleData";
import { Language } from "../data/i18n";
import { Printer, AlertOctagon, FileWarning, ArrowLeft, Building2 } from "lucide-react";

export function InvoiceDetail({ lang: _lang }: { lang: Language }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoice(id || "");

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Invoice not found</h2>
        <button
          onClick={() => navigate("/invoices")}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate("/invoices")}
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Invoices</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            <Link
              to={`/customers/${invoice.customerId}`}
              className="font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              {invoice.customerName}
            </Link>{" "}
            — {invoice.customerCity}, {invoice.customerState}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "overdue" && invoice.outstanding > 0 && (
            <Link
              to={`/demand-letter?invoice=${invoice.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors tap-target"
            >
              <FileWarning className="w-4 h-4" />
              <span>Demand Letter</span>
            </Link>
          )}

          {!invoice.isDisputed && invoice.outstanding > 0 && (
            <Link
              to={`/dispute/${invoice.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Log dispute</span>
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {invoice.isDisputed && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Invoice Disputed — Reminders Paused
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Reason: {invoice.disputeReason || "Payment terms under discussion"}. Excluded from cash forecast inflows until resolved.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Invoice date</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {formatDate(invoice.invoiceDate)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Due date</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment terms</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {invoice.terms}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Place of supply</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {invoice.placeOfSupply}
          </p>
        </div>
      </div>

      {/* Financials & GST Breakdown */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Financials & Tax Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Subtotal</p>
            <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
              {formatInr(invoice.subtotal)}
            </p>
          </div>
          {invoice.cgst > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">CGST (9%)</p>
              <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatInr(invoice.cgst)}
              </p>
            </div>
          )}
          {invoice.sgst > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SGST (9%)</p>
              <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatInr(invoice.sgst)}
              </p>
            </div>
          )}
          {invoice.igst > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">IGST (18%)</p>
              <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatInr(invoice.igst)}
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Amount in words: {amountInWords(invoice.total)}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Paid: <strong className="text-slate-900 dark:text-white tabular-nums">{formatInr(invoice.amountPaid)}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Remaining: <strong className="text-red-600 dark:text-red-400 tabular-nums">{formatInr(invoice.outstanding)}</strong>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoice Amount</span>
            <p className="text-2xl font-bold tabular-nums text-teal-600 dark:text-teal-400">
              {formatInr(invoice.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">HSN</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">GST %</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{item.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{item.hsn}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatInr(item.rate)}</td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.gstRate}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatInr(item.rate * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Timeline */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Invoice & Payment Timeline
        </h2>
        <Timeline entries={invoice.evidence} />
      </div>
    </div>
  );
}
