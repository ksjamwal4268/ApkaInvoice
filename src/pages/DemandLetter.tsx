import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Money } from "../components/Money";
import { formatInr } from "../utils/money";
import { INVOICES } from "../data/sampleData";
import { Language } from "../data/i18n";

export function DemandLetter({ lang }: { lang: Language }) {
  const [searchParams] = useSearchParams();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(searchParams.get("invoice") || null);

  useEffect(() => {
    const inv = searchParams.get("invoice");
    if (inv) setSelectedInvoiceId(inv);
  }, [searchParams]);
  const invoice = selectedInvoiceId ? INVOICES.find((i) => i.id === selectedInvoiceId) : null;

  return (
          <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Payment demand letter
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate a payment demand letter for an overdue invoice. This is a payment request only — not a legal notice or GST notice.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Select invoice
              </label>
              <select
                value={selectedInvoiceId || ""}
                onChange={(e) => setSelectedInvoiceId(e.target.value || null)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
              >
                <option value="">Select an overdue invoice</option>
                {INVOICES.filter((i) => i.status === "overdue" && i.outstanding > 0 && !i.isDisputed).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — {i.customerName} ({formatInr(i.outstanding)})
                  </option>
                ))}
              </select>
            </div>
            <button
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 tap-target"
              onClick={() => window.print()}
              disabled={!invoice}
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {invoice && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-sm max-w-2xl">
            <div className="text-center mb-8">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sharma Packaging
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gut No. 145, Chakan Industrial Area, Pune - 412105, Maharashtra
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GSTIN: 27AABCS1234Q1ZM | Email: billing@sharmapackaging.in
              </p>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    Payment Demand Letter
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ref: {invoice.invoiceNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 mb-4">
              To,<br />
              <span className="font-medium">{invoice.customerName}</span><br />
              {invoice.customerCity}, {invoice.customerState}
            </p>

            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Subject: Payment demand for outstanding invoice {invoice.invoiceNumber}
            </p>

            <p className="text-slate-700 dark:text-slate-300 mb-6">
              Dear Sir/Madam,
            </p>

            <p className="text-slate-700 dark:text-slate-300 mb-4">
              We refer to invoice <strong>{invoice.invoiceNumber}</strong> dated{" "}
              {invoice.invoiceDate.toLocaleDateString("en-IN")} for an amount of{" "}
              <strong>{formatInr(invoice.total)}</strong>. As per our records, an amount of{" "}
              <strong className="text-red-600 dark:text-red-400">
                {formatInr(invoice.outstanding)}
              </strong>{" "}
              remains outstanding as of today.
            </p>

            <p className="text-slate-700 dark:text-slate-300 mb-6">
              We request you to release the payment by{" "}
              <strong className="text-red-600 dark:text-red-400">
                {new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-IN")}
              </strong>
              . Kindly treat this as a formal payment reminder.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Payment details:
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Account name: Sharma Packaging<br />
                Bank: HDFC Bank<br />
                Account: 50200045678901<br />
                IFSC: HDFC0001234<br />
                UPI: sharmapackaging@hdfc
              </p>
            </div>

            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              ⚠️ This is a payment request only. It is not a legal notice or a GST notice.
            </p>

            <p className="text-slate-700 dark:text-slate-300 mb-8">
              Thank you for your prompt attention to this matter.
            </p>

            <div className="flex justify-end">
              <p className="text-slate-700 dark:text-slate-300">
                For Sharma Packaging<br />
                <span className="font-medium">Accounts Department</span>
              </p>
            </div>
          </div>
        )}
      </div>
  );
}