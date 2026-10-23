import { useState } from "react";
import { Shell } from "../components/Shell";
import { Money } from "../components/Money";
import { matchBankStatement } from "../utils/csv";
import { formatInr } from "../utils/money";
import { INVOICES } from "../data/sampleData";
import { Language } from "../data/i18n;

const SAMPLE_CSV = `date,description,amount
2024-10-02,UPI payment from Kolkata Traders,14160
2024-10-05,NEFT credit from Chennai Suppliers,10000
2024-10-22,NEFT credit from Delhi Distributors,23010
2024-10-25,RTGS from Rao & Sons (TDS deducted),46728
2024-10-28,Unknown credit - please review,50000`;

export function Payments({ lang }: { lang: Language }): JSX.Element {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [result, setResult] = useState<any>(null);

  const handleUpload = () => {
    const res = matchBankStatement({
      csvText,
      invoices: INVOICES.map((i) => ({
        id: i.id,
        amount: i.total,
        dueDate: i.dueDate,
        customerName: i.customerName,
      })),
    });
    setResult(res);
  };

  return (
    <Shell lang={lang} onLangChange={() => {}} dark={false} onToggleDark={() => {}}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Payments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload your bank statement CSV to match payments to invoices.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Bank statement CSV
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent font-mono text-xs"
                placeholder="date,description,amount
2024-10-02,UPI payment from Kolkata Traders,14160"
              />
            </div>
            <button
              onClick={handleUpload}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 tap-target"
            >
              Match payments
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total credits</p>
                <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(result.summary.totalCredits)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Matched</p>
                <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(result.summary.totalMatched)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unmatched</p>
                <p className="text-sm tabular-nums text-red-600 dark:text-red-400 font-medium">{result.summary.unmatchedCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">TDS review</p>
                <p className="text-sm tabular-nums text-amber-600 dark:text-amber-400 font-medium">{result.summary.tdsCount}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Matched payments</h2>
              <div className="space-y-3">
                {result.matches.map((m: any) => (
                  <div key={m.invoiceId} className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">Invoice {m.invoiceId}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        m.status === "fully-paid" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300" :
                        "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Matched amount</span>
                      <span className="tabular-nums text-slate-900 dark:text-white font-medium">{formatInr(m.matchedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{m.bankRows.length} bank row(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.needsReview.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Needs review</h2>
                <div className="space-y-3">
                  {result.needsReview.map((row: any) => (
                    <div key={row.rowIndex} className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{row.description}</span>
                        {row.tdsPercent && (
                          <span className="text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded">
                            TDS {row.tdsPercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{row.reviewReason}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{row.date}</span>
                        <span className="tabular-nums">{formatInr(row.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}