import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { formatInr, amountInWords } from "../utils/money";
import { Language } from "../data/i18n";
import { Printer, ArrowLeft, ShieldAlert, Building2 } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";

export function DemandLetter({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { invoices, businessProfile } = useDataStore();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    searchParams.get("invoice") || null
  );

  useEffect(() => {
    const inv = searchParams.get("invoice");
    if (inv) setSelectedInvoiceId(inv);
  }, [searchParams]);

  const overdueInvoices = invoices.filter(
    (i) => i.status === "overdue" && i.outstanding > 0 && !i.isDisputed
  );

  const invoice = selectedInvoiceId
    ? invoices.find((i) => i.id === selectedInvoiceId)
    : overdueInvoices[0] || null;

  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 7);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate("/reminders")}
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Reminders Ladder</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Commercial Payment Demand Letter
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate and print a formal payment demand notice for delinquent accounts (Stage 4).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedInvoiceId || ""}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">Select an overdue invoice</option>
            {overdueInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customerName} ({formatInr(inv.outstanding)})
              </option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-sm transition-colors tap-target"
          >
            <Printer className="w-4 h-4" />
            <span>Print Letter</span>
          </button>
        </div>
      </div>

      {/* Formal Letter Sheet */}
      {invoice ? (
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-8 sm:p-12 shadow-md space-y-6 text-sm text-slate-800 dark:text-slate-200">
          {/* Letterhead */}
          <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {businessProfile.name}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {businessProfile.address}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              GSTIN: {businessProfile.gstin} • Phone: {businessProfile.phone} • Email: {businessProfile.email}
            </p>
          </div>

          {/* Letter Meta */}
          <div className="flex justify-between items-start text-xs text-slate-600 dark:text-slate-400">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Ref: DEMAND/{invoice.invoiceNumber.replace(/\//g, "-")}</p>
              <p className="mt-1">Date: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                Formal Demand Notice
              </span>
            </div>
          </div>

          {/* Addressee */}
          <div className="text-xs leading-relaxed">
            <p className="text-slate-500">To,</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{invoice.customerName}</p>
            <p>{invoice.customerCity}, {invoice.customerState}</p>
            {invoice.customerGstin && <p className="font-mono mt-0.5">GSTIN: {invoice.customerGstin}</p>}
          </div>

          {/* Subject */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-750 font-semibold text-xs border border-slate-200 dark:border-slate-700">
            Subject: Formal Commercial Demand for Immediate Payment of Unsettled Dues — Invoice {invoice.invoiceNumber}
          </div>

          {/* Body */}
          <div className="space-y-3 leading-relaxed text-xs">
            <p>Dear {invoice.customerName},</p>
            <p>
              We are writing to bring to your urgent attention the outstanding balance on invoice{" "}
              <strong>{invoice.invoiceNumber}</strong> dated {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}, which became due on{" "}
              <strong>{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</strong>.
            </p>
            <p>
              Despite previous reminders, the total amount of{" "}
              <strong className="text-rose-600 dark:text-rose-400 text-sm">
                {formatInr(invoice.outstanding)} ({amountInWords(invoice.outstanding)})
              </strong>{" "}
              remains unpaid on your account.
            </p>
            <p>
              Please arrange payment of the full outstanding balance by{" "}
              <strong>{deadlineDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>{" "}
              (within 7 business days) to ensure continuation of commercial credit terms and pending shipments.
            </p>

            {/* Settlement Banking Details */}
            <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-1.5 text-xs text-teal-950 dark:text-teal-200">
              <p className="font-bold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>Bank Settlement Account Details:</span>
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <p>Beneficiary: <strong>{businessProfile.name}</strong></p>
                <p>Bank: <strong>{businessProfile.bankName}</strong></p>
                <p>Account No: <strong>{businessProfile.bankAccount}</strong></p>
                <p>IFSC Code: <strong>{businessProfile.ifsc}</strong></p>
              </div>
            </div>
          </div>

          {/* Signoff */}
          <div className="pt-6 flex justify-between items-end border-t border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <p className="text-slate-500">Authorized Signatory,</p>
              <p className="font-bold text-slate-900 dark:text-white mt-1">Accounts & Commercial Department</p>
              <p className="text-slate-600 dark:text-slate-400">{businessProfile.name}</p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span>System generated on {new Date().toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          {/* Statutory Guardrail Box */}
          <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Notice Disclaimer:</strong> This document is a formal commercial demand for payment under mutual business terms and does not constitute a legal summons or statutory GST notice.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No overdue invoices available for demand letter generation.</p>
        </div>
      )}
    </div>
  );
}
