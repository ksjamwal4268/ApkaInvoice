import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { formatDate } from "../utils/date";
import { formatInr, amountInWords } from "../utils/money";
import { Language } from "../data/i18n";
import {
  Printer,
  AlertOctagon,
  FileWarning,
  ArrowLeft,
  Building2,
  Edit,
  Zap,
  MessageSquare,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { sendReminderViaN8n } from "../data/dataStore";

export function InvoiceDetail({ lang: _lang }: { lang: Language }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, customers, businessProfile, addInvoiceEvidence, saveInvoice } = useDataStore();

  const [n8nSending, setN8nSending] = useState(false);
  const [n8nSuccess, setN8nSuccess] = useState<string | null>(null);

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

  const handleSendN8nReminder = async () => {
    if (!customer) return;
    setN8nSending(true);
    setN8nSuccess(null);

    const senderPhone = businessProfile.phone || "+91 98000 00000";
    const senderUpi = businessProfile.upi || `${senderPhone}@upi`;
    const message = `Dear ${customer.name}, gentle reminder that payment of ${formatInr(invoice.outstanding)} for invoice ${invoice.invoiceNumber} is pending. Please remit directly to ${senderPhone} (PhonePe/Google Pay/Paytm) or UPI: ${senderUpi}. Thank you - ${businessProfile.name}`;

    try {
      const res = await sendReminderViaN8n({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        sender: {
          name: businessProfile.name,
          email: businessProfile.email || "accounts@business.com",
          phone: senderPhone,
          location: `${businessProfile.city || ""}, ${businessProfile.state || ""}`.trim(),
          gstin: businessProfile.gstin,
          upi: senderUpi,
        },
        buyer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          gstin: customer.gstin,
        },
        amountDuePaise: invoice.outstanding,
        amountDueFormatted: formatInr(invoice.outstanding),
        dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
        daysOverdue: Math.max(0, Math.round((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000)),
        stage: "Direct invoice reminder",
        reminderMessage: message,
        language: "en",
        paymentDetails: {
          upi: senderUpi,
          bankName: "Direct Mobile Payment",
          bankAccount: senderPhone,
          ifsc: "UPI-DIRECT",
        },
      });

      addInvoiceEvidence(invoice.id, {
        id: `ev-${Date.now()}`,
        date: new Date(),
        type: "reminder",
        title: "Automated Reminder Sent",
        description: `Dispatched to ${customer.name} via ${res.channel}`,
        amount: invoice.outstanding,
        channel: "whatsapp",
      });

      setN8nSuccess("Dispatched reminder to buyer!");
      setTimeout(() => setN8nSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setN8nSending(false);
    }
  };

  const senderPhone = businessProfile.phone || "+91 98000 00000";
  const senderUpi = businessProfile.upi || `${senderPhone}@upi`;
  const phoneClean = customer?.phone?.replace(/\D/g, "") || "919876543210";
  const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
    `Hello ${customer?.name || "Customer"}, payment of ${formatInr(invoice.outstanding)} for invoice ${invoice.invoiceNumber} is due. Please remit directly to ${senderPhone} (PhonePe/Google Pay/Paytm) or UPI: ${senderUpi}. Thanks, ${businessProfile.name}.`
  )}`;

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
      setN8nSuccess(`Payment received! Invoice marked as Completed.`);
    } else {
      const isPastDue = new Date(invoice.dueDate).getTime() < Date.now();
      const updated = {
        ...invoice,
        status: isPastDue ? ("overdue" as const) : ("due" as const),
        amountPaid: 0,
        outstanding: invoice.total,
      };
      saveInvoice(updated);
      setN8nSuccess(`Invoice reopened as Pending.`);
    }
    setTimeout(() => setN8nSuccess(null), 4000);
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

          {/* Send Reminder Button (if unpaid) */}
          {invoice.outstanding > 0 && !invoice.isDisputed && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSendN8nReminder}
                disabled={n8nSending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-xs tap-target"
              >
                {n8nSending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{n8nSending ? "Sending..." : "Send Automated Reminder"}</span>
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 bg-[#25D366] text-white rounded-xl text-xs font-semibold hover:opacity-90 shadow-2xs tap-target"
                title="Send WhatsApp payment reminder"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          )}

          {invoice.status === "overdue" && invoice.outstanding > 0 && (
            <Link
              to={`/demand-letter?invoice=${invoice.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors tap-target"
            >
              <FileWarning className="w-4 h-4" />
              <span>Demand Letter</span>
            </Link>
          )}

          {!invoice.isDisputed && invoice.outstanding > 0 && (
            <Link
              to={`/dispute/${invoice.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Log dispute</span>
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {n8nSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{n8nSuccess}</span>
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Invoice date</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {formatDate(invoice.invoiceDate)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Due date</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment terms</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {invoice.terms}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Place of supply</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {invoice.placeOfSupply}
          </p>
        </div>
      </div>

      {/* Financials & GST Breakdown */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
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

      {/* Line Items Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Line Items ({invoice.lineItems.length})
          </h2>
          <Link
            to={`/invoices/${invoice.id}/edit`}
            className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Items</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right font-mono">HSN</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">GST %</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {invoice.lineItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{item.hsn}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatInr(item.rate)}</td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.gstRate}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                    {formatInr(item.rate * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Timeline */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Invoice & Payment Audit Timeline
        </h2>
        <Timeline entries={invoice.evidence} />
      </div>
    </div>
  );
}
