import { useParams, useNavigate } from "react-router-dom";
import { formatDate } from "../utils/date";
import { formatInr } from "../utils/money";
import { getInvoice } from "../data/sampleData";
import { Language } from "../data/i18n;

export function Dispute({ lang }: { lang: Language }): JSX.Element {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoice(invoiceId || "");

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Invoice not found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The invoice you are trying to dispute does not exist.
          </p>
        </div>
      </div>
    );
  }

  const [submitted, setSubmitted] = useState(false);
  const [disputeType, setDisputeType] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeType) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-lg">
        {!submitted ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Invoice dispute
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Invoice <strong>{invoice.invoiceNumber}</strong> —{" "}
                {formatInr(invoice.total)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Select the reason that best describes your issue.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mb-6">
                <button
                  type="button"
                  onClick={() => setDisputeType("wrong-invoice")}
                  className={`w-full py-3 rounded-lg border text-left transition-colors tap-target ${
                    disputeType === "wrong-invoice"
                      ? "bg-teal-600/10 border-teal-600 text-teal-700 dark:text-teal-400"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="font-medium">Wrong invoice</span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    The invoice details are incorrect
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisputeType("already-paid")}
                  className={`w-full py-3 rounded-lg border text-left transition-colors tap-target ${
                    disputeType === "already-paid"
                      ? "bg-teal-600/10 border-teal-600 text-teal-700 dark:text-teal-400"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="font-medium">Already paid</span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    I have already made this payment
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisputeType("other")}
                  className={`w-full py-3 rounded-lg border text-left transition-colors tap-target ${
                    disputeType === "other"
                      ? "bg-teal-600/10 border-teal-600 text-teal-700 dark:text-teal-400"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="font-medium">Other</span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    Some other issue
                  </span>
                </button>
              </div>

              {disputeType && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Add a note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Tell us more about the issue..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
                  />
                </div>
              )}

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={!disputeType}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-colors tap-target ${
                    disputeType ? "bg-teal-600 text-white" : "bg-slate-300 dark:bg-slate-600 text-slate-500"
                  }`}
                >
                  Submit dispute
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                Submitting this dispute will pause reminders for this invoice until resolved.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-teal-600 dark:text-teal-400 text-xl">✓</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Dispute submitted
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Your dispute for invoice {invoice.invoiceNumber} has been recorded.
              Reminders for this invoice are now paused.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 tap-target"
            >
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}