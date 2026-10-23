import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatInr } from "../utils/money";
import { getInvoice } from "../data/sampleData";
import { Language } from "../data/i18n";
import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Receipt,
  Clock,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

export function Dispute({ lang: _lang }: { lang: Language }) {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoice(invoiceId || "");

  if (!invoice) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Invoice not found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          The invoice you are trying to dispute does not exist in the ledger.
        </p>
        <button
          onClick={() => navigate("/invoices")}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const [submitted, setSubmitted] = useState(false);
  const [disputeType, setDisputeType] = useState<string>("wrong-invoice");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeType) return;

    // Apply dispute to sample data model
    invoice.isDisputed = true;
    invoice.status = "disputed";
    invoice.disputeReason =
      disputeType === "already-paid"
        ? "Payment already made via bank"
        : disputeType === "wrong-invoice"
        ? "Goods discrepancy / rate dispute"
        : disputeType === "extension"
        ? "Credit period extension requested"
        : note || "Customer dispute raised";

    invoice.evidence.push({
      id: `ev-${Date.now()}`,
      date: new Date(),
      type: "dispute",
      title: "Dispute opened by customer",
      description: invoice.disputeReason,
      channel: "phone",
    });

    setSubmitted(true);
  };

  const reasons = [
    {
      id: "wrong-invoice",
      icon: FileQuestion,
      title: "Invoice or Goods Discrepancy",
      desc: "Rates, quantity, or delivered packing material does not match purchase order.",
    },
    {
      id: "already-paid",
      icon: Receipt,
      title: "Payment Already Transferred",
      desc: "Client claims NEFT/UPI payment has already cleared their bank account.",
    },
    {
      id: "extension",
      icon: Clock,
      title: "Credit Extension Requested",
      desc: "Client requested 15-day liquidity grace period to settle balance.",
    },
    {
      id: "other",
      icon: HelpCircle,
      title: "Other Commercial Issue",
      desc: "GST billing adjustment, credit note pending, or contract dispute.",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          to={`/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Invoice {invoice.invoiceNumber}</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xs">
        {!submitted ? (
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Log Commercial Dispute
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Invoice <strong className="text-slate-800 dark:text-slate-200">{invoice.invoiceNumber}</strong> • {invoice.customerName} (
                  <strong className="text-slate-800 dark:text-slate-200">{formatInr(invoice.outstanding)}</strong>)
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <p className="text-xs text-teal-800 dark:text-teal-300">
                Logging a dispute immediately <strong>pauses all automated WhatsApp & email reminders</strong> and excludes this balance from your 8-week cash inflow forecast.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Reason for Dispute
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {reasons.map((r) => {
                    const active = disputeType === r.id;
                    const Icon = r.icon;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setDisputeType(r.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          active
                            ? "border-teal-600 bg-teal-50/40 dark:bg-teal-950/20 shadow-xs"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            active
                              ? "bg-teal-600 text-white"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {r.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {r.desc}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                            active
                              ? "border-teal-600 bg-teal-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Notes or Reference Number
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. UTR / NEFT reference number, damaged cartons batch number..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow-xs transition-colors tap-target"
                >
                  Submit Dispute & Pause Reminders
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Dispute Logged Successfully
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Invoice <strong>{invoice.invoiceNumber}</strong> has been tagged as <strong>Disputed</strong>. Payment reminders are now paused and cash projections have been updated.
              </p>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <Link
                to={`/invoices/${invoice.id}`}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow-xs"
              >
                Return to Invoice Details
              </Link>
              <Link
                to="/forecast"
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Review Forecast Impact
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
