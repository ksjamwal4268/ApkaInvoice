import { useParams } from "react-router-dom";
import { Shell } from "../components/Shell";
import { StatusBadge } from "../components/StatusBadge";
import { Money } from "../components/Money";
import { Timeline } from "../components/Timeline";
import { formatDate } from "../utils/date";
import { formatInr, amountInWords } from "../utils/money";
import { getInvoice } from "../data/sampleData";
import { Language } from "../data/i18n;

export function InvoiceDetail({ lang }: { lang: Language }): JSX.Element {
  const { id } = useParams();
  const invoice = getInvoice(id || "");

  if (!invoice) {
    return (
      <Shell lang={lang} onLangChange={() => {}} dark={false} onToggleDark={() => {}}>
        <div className="text-center py-20">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">Invoice not found</h2>
        </div>
      </Shell>
    );
  }

  return (
    <Shell lang={lang} onLangChange={() => {}} dark={false} onToggleDark={() => {}}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {invoice.customerName} — {invoice.customerCity}, {invoice.customerState}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.status} />
            <button
              onClick={() => alert("Export record feature would download a PDF/CSV record of this invoice.")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
            >
              📄 Export record
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Invoice date</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Due date</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(invoice.dueDate)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Terms</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{invoice.terms}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Subtotal</p>
              <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(invoice.subtotal)}</p>
            </div>
            {invoice.cgst > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">CGST</p>
                <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(invoice.cgst)}</p>
              </div>
            )}
            {invoice.sgst > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SGST</p>
                <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(invoice.sgst)}</p>
              </div>
            )}
            {invoice.igst > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">IGST</p>
                <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(invoice.igst)}</p>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex items-end justify-between gap-2 mb-2">
              <p className="text-lg font-bold text-slate-900 dark:text-white">Total</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{formatInr(invoice.total)}</p>
            </div>
            <div className="flex items-end justify-between gap-2 mb-1">
              <p className="text-sm text-slate-500 dark:text-slate-400">Amount paid</p>
              <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(invoice.amountPaid)}</p>
            </div>
            <div className="flex items-end justify-between gap-2 mb-1">
              <p className="text-sm text-slate-500 dark:text-slate-400">Outstanding</p>
              <p className="text-sm font-medium tabular-nums text-red-600 dark:text-red-400">
                {formatInr(invoice.outstanding)}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic">
              {amountInWords(invoice.total)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Line items</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Description</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">HSN</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Rate</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">GST %</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="group">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.hsn}</td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">{formatInr(item.rate)}</td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.gstRate}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white font-medium">
                    {formatInr(item.rate * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Evidence timeline</h2>
          <Timeline entries={invoice.evidence} />
        </div>
      </div>
    </Shell>
  );
}