import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { formatDate, toISODateString, daysBetween } from "../utils/date";
import { formatInr, amountInWords } from "../utils/money";
import { Language } from "../data/i18n";
import {
  Printer,
  AlertOctagon,
  ArrowLeft,
  Building2,
  Edit,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { GlowingEffect } from "../components/ui/glowing-effect";

export function InvoiceDetail({ lang: _lang }: { lang: Language }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, customers, businessProfile, saveInvoice } = useDataStore();

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const invoice = invoices.find((inv) => inv.id === id);
  const customer = customers.find((c) => c.id === invoice?.customerId);

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invoice not found</h2>
        <button
          onClick={() => navigate("/invoices")}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const handleToggleCompleted = () => {
    const isCompleted = invoice.status === "paid" || invoice.outstanding === 0;
    if (!isCompleted) {
      const updated = {
        ...invoice,
        status: "paid" as const,
        amountPaid: invoice.total,
        outstanding: 0,
        evidence: [
          ...(invoice.evidence || []),
          {
            id: `ev-${Date.now()}`,
            date: new Date(),
            type: "payment" as const,
            title: "Payment Received (Completed)",
            description: `Full payment of ${formatInr(invoice.total)} received.`,
            amount: invoice.total,
            channel: "phone" as const,
          },
        ],
      };
      saveInvoice(updated);
      setToastNotice(`Payment received! Invoice marked as Completed.`);
    } else {
      const isPastDue = new Date(invoice.dueDate).getTime() < Date.now();
      const updated = {
        ...invoice,
        status: isPastDue ? ("overdue" as const) : ("due" as const),
        amountPaid: 0,
        outstanding: invoice.total,
      };
      saveInvoice(updated);
      setToastNotice(`Invoice reopened as Pending.`);
    }
    setTimeout(() => setToastNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Back Link */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate("/invoices")}
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Invoices</span>
        </button>
      </div>

      {/* Invoice Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {invoice.invoiceNumber || <span className="text-slate-400 font-normal italic">— (No Number)</span>}
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Received Tick Toggle Button */}
          <button
            type="button"
            onClick={handleToggleCompleted}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs tap-target ${
              invoice.status === "paid" || invoice.outstanding === 0
                ? "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600"
                : "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {invoice.status === "paid" || invoice.outstanding === 0
                ? "Payment Completed ✓"
                : "Mark Payment Received"}
            </span>
          </button>

          {/* Edit Invoice Button */}
          <Link
            to={`/invoices/${invoice.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors tap-target"
          >
            <Edit className="w-4 h-4 text-teal-600" />
            <span>Edit Invoice</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastNotice}</span>
        </div>
      )}

      {invoice.isDisputed && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
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

      {/* Invoice Meta Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Invoice date", val: formatDate(invoice.invoiceDate) },
          { label: "Due date", val: formatDate(invoice.dueDate) },
          { label: "Payment terms", val: invoice.terms },
          { label: "Place of supply", val: invoice.placeOfSupply },
        ].map((item, idx) => (
          <div key={idx} className="relative rounded-2xl border border-slate-200/80 bg-white p-1.5 md:rounded-3xl md:p-2 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
            />
            <div className="relative rounded-xl p-3.5 sm:p-4 bg-white">
              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seller & Buyer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seller / Issued By (Your Business) */}
        <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
          <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
          <div className="relative rounded-xl p-4 sm:p-5 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Seller / Issued By
              </span>
              <Link to="/profile" className="text-xs text-teal-600 hover:underline font-semibold">
                Edit Profile
              </Link>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {invoice.sellerName || businessProfile.name || "Your Business Name"}
            </h3>
            <div className="text-xs text-slate-600 space-y-0.5 font-medium">
              {(invoice.sellerCity || businessProfile.city || invoice.sellerState || businessProfile.state) && (
                <p>{invoice.sellerCity || businessProfile.city}{invoice.sellerCity && invoice.sellerState ? ', ' : ''}{invoice.sellerState || businessProfile.state}</p>
              )}
              {(invoice.sellerGstin || businessProfile.gstin) && (
                <p>GSTIN: <span className="font-mono font-semibold">{invoice.sellerGstin || businessProfile.gstin}</span></p>
              )}
              {(invoice.sellerPhone || businessProfile.phone) && (
                <p>Phone: {invoice.sellerPhone || businessProfile.phone}</p>
              )}
              {(invoice.sellerEmail || businessProfile.email) && (
                <p>Email: {invoice.sellerEmail || businessProfile.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Buyer / Billed To */}
        <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
          <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
          <div className="relative rounded-xl p-4 sm:p-5 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Billed To (Buyer)
              </span>
              <Link to={`/customers/${invoice.customerId}`} className="text-xs text-teal-600 hover:underline font-semibold">
                Customer View
              </Link>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {invoice.customerName}
            </h3>
            <div className="text-xs text-slate-600 space-y-0.5 font-medium">
              <p>{invoice.customerCity}, {invoice.customerState}</p>
              {invoice.customerGstin && (
                <p>GSTIN: <span className="font-mono font-semibold">{invoice.customerGstin}</span></p>
              )}
              {(invoice.payerPhone || customer?.phone) && (
                <p>Phone: {invoice.payerPhone || customer?.phone}</p>
              )}
              {(invoice.payerEmail || customer?.email) && (
                <p>Email: {invoice.payerEmail || customer?.email}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Financials & GST Breakdown */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative rounded-xl p-5 md:p-6 bg-white">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Financials & Tax Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Subtotal</p>
            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
              {formatInr(invoice.subtotal)}
            </p>
          </div>
          {invoice.cgst > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">CGST (9%)</p>
              <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatInr(invoice.cgst)}
              </p>
            </div>
          )}
          {invoice.sgst > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SGST (9%)</p>
              <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {formatInr(invoice.sgst)}
              </p>
            </div>
          )}
          {invoice.igst > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">IGST (18%)</p>
              <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
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
                Remaining: <strong className="text-rose-600 dark:text-rose-400 tabular-nums">{formatInr(invoice.outstanding)}</strong>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Invoice Amount
            </span>
            <p className="text-2xl font-extrabold tabular-nums text-teal-600 dark:text-teal-400">
              {formatInr(invoice.total)}
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Line Items Table */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative rounded-xl overflow-hidden bg-white border border-slate-100">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Line Items ({invoice.lineItems.length})
            </h2>
            <Link
              to={`/invoices/${invoice.id}/edit`}
              className="text-xs text-teal-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Items</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right font-mono">HSN</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">GST %</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.lineItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{item.hsn}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatInr(item.rate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.gstRate}%</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                      {formatInr(item.rate * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attached Bill Photo or Document */}
      {invoice.pdfUrl && (
        <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
          />
          <div className="relative rounded-xl p-5 md:p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <span>Attached Bill Photo / Original Document</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Verified File
              </span>
            </div>

            {invoice.pdfUrl.startsWith("data:image") ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={invoice.pdfUrl}
                  alt={`Bill photo for ${invoice.invoiceNumber}`}
                  className="max-h-64 object-contain rounded-lg border border-slate-200 shadow-sm"
                />
                <div className="text-xs space-y-2">
                  <p className="font-bold text-slate-900">Uploaded Bill Photo (JPG/PNG)</p>
                  <p className="text-slate-500">
                    Extracted and verified. This paper photo is attached to invoice {invoice.invoiceNumber} and preserved for payment chasing.
                  </p>
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-2xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>View Full Photo</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>{invoice.pdfUrl}</span>
                </div>
                <span className="text-[11px] text-teal-600 font-semibold">Attached</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence Timeline */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-2 md:rounded-3xl md:p-3 shadow-xs">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative rounded-xl p-5 md:p-6 bg-white">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Invoice & Payment Audit Timeline
          </h2>
          <Timeline entries={invoice.evidence} />
        </div>
      </div>
    </div>
  );
}
