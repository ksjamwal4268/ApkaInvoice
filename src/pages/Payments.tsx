import { useState } from "react";
import { matchBankStatement, type CsvParseResult } from "../utils/csv";
import { formatInr } from "../utils/money";
import { INVOICES, getInvoice } from "../data/sampleData";
import { Language } from "../data/i18n";
import { CheckCircle2, AlertTriangle, FileSpreadsheet, Link2, Check } from "lucide-react";

import { useDataStore } from "../hooks/useDataStore";

const SAMPLE_CSV = `date,description,amount
2024-10-02,UPI payment from buyer,14160
2024-10-05,NEFT credit from corporate client,10000
2024-10-22,NEFT credit settlement,23010
2024-10-25,RTGS credit (TDS deducted 2%),46728`;

export function Payments({ lang: _lang }: { lang: Language }) {
  const { invoices } = useDataStore();
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [manualLinks, setManualLinks] = useState<Record<number, string>>({});
  const [acceptedTds, setAcceptedTds] = useState<Record<number, boolean>>({});

  const handleUpload = () => {
    const res = matchBankStatement({
      csvText,
      invoices: invoices.map((i) => ({
        id: i.id,
        amount: i.total,
        dueDate: i.dueDate,
        customerName: i.customerName,
      })),
    });
    setResult(res);
  };

  const handleManualMatch = (rowIndex: number) => {
    const invId = manualLinks[rowIndex];
    if (!invId || !result) return;
    const inv = getInvoice(invId);
    if (!inv) return;

    const row = result.rows.find((r) => r.rowIndex === rowIndex);
    if (!row) return;

    const updatedRow = {
      ...row,
      matched: true,
      matchType: "partial" as const,
      matchedInvoiceId: invId,
      needsReview: false,
    };

    const updatedMatches = [...result.matches];
    const existingIndex = updatedMatches.findIndex((m) => m.invoiceId === invId);
    let existing = existingIndex >= 0 ? { ...updatedMatches[existingIndex] } : null;

    if (!existing) {
      existing = {
        invoiceId: invId,
        invoiceAmount: inv.total,
        matchedAmount: 0,
        bankRows: [],
        status: "part-paid",
      };
      updatedMatches.push(existing);
    } else {
      updatedMatches[existingIndex] = existing;
    }

    const newMatchedAmount = existing.matchedAmount + row.amount;
    existing.bankRows = [...existing.bankRows, updatedRow];
    existing.matchedAmount = newMatchedAmount;
    existing.status = newMatchedAmount >= existing.invoiceAmount ? "fully-paid" : "part-paid";

    const updatedUnmatched = result.unmatchedCredits.filter((r) => r.rowIndex !== rowIndex);
    const updatedReview = result.needsReview.filter((r) => r.rowIndex !== rowIndex);

    setResult({
      ...result,
      matches: updatedMatches,
      unmatchedCredits: updatedUnmatched,
      needsReview: updatedReview,
      summary: {
        ...result.summary,
        unmatchedCount: updatedUnmatched.length,
        totalMatched: result.summary.totalMatched + row.amount,
      },
    });
  };

  const handleAcceptTds = (rowIndex: number) => {
    setAcceptedTds((prev) => ({ ...prev, [rowIndex]: true }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Payments
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload bank statement CSV to automatically match payments to invoices, detect TDS deductions, and handle part payments.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Bank statement CSV input
            </label>
            <button
              onClick={() => setCsvText(SAMPLE_CSV)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
            >
              Reset to sample statement
            </button>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent font-mono text-xs leading-relaxed"
            placeholder="date,description,amount&#10;2024-10-02,UPI payment from Kolkata Traders,14160"
          />
          <div className="flex justify-end pt-2">
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-xs transition-colors tap-target"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Match payments to invoices</span>
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Credits</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {formatInr(result.summary.totalCredits)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Auto-Matched</p>
              <p className="text-lg font-bold tabular-nums text-teal-600 dark:text-teal-400 mt-1">
                {formatInr(result.summary.totalMatched)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unmatched Credits</p>
              <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
                {result.summary.unmatchedCount}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">TDS Reviews</p>
              <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                {result.summary.tdsCount}
              </p>
            </div>
          </div>

          {/* Matched Payments List */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Matched Invoices ({result.matches.length})
              </h2>
            </div>
            <div className="space-y-3">
              {result.matches.map((m) => {
                const inv = getInvoice(m.invoiceId);
                return (
                  <div
                    key={m.invoiceId}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {inv?.invoiceNumber || `Invoice ${m.invoiceId}`}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                          • {inv?.customerName}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          m.status === "fully-paid"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {m.status === "fully-paid" ? "Fully Settled" : "Partially Paid"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Invoice Total: </span>
                        <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                          {formatInr(m.invoiceAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Credit Matched: </span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                          {formatInr(m.matchedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Statement Rows: </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {m.bankRows.length} entry
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TDS Review Section */}
          {result.needsReview.filter((r) => r.matchType === "tds").length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  TDS Deduction Review (Section 194C / 194J)
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                The bank credit is exactly 1%, 2%, or 10% lower than the invoice value, characteristic of corporate TDS withholding. Accept to record TDS certificate requirement.
              </p>
              <div className="space-y-3">
                {result.needsReview
                  .filter((r) => r.matchType === "tds")
                  .map((row) => {
                    const isAccepted = acceptedTds[row.rowIndex];
                    return (
                      <div
                        key={row.rowIndex}
                        className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {row.description}
                            </span>
                            <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded">
                              TDS {row.tdsPercent}% detected
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                              {formatInr(row.amount)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                              on {row.date}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{row.reviewReason}</p>
                        <div className="mt-3 flex justify-end">
                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                              <Check className="w-4 h-4" /> TDS Accepted & Form 16A requested
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAcceptTds(row.rowIndex)}
                              className="px-3.5 py-1.5 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors tap-target"
                            >
                              Accept TDS & Mark Invoice Settled
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Unmatched Bank Credits */}
          {result.unmatchedCredits.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-5 h-5 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Unmatched Bank Credits ({result.unmatchedCredits.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                These deposits could not be matched automatically by exact sum or customer reference. You can manually link them to any open invoice.
              </p>
              <div className="space-y-3">
                {result.unmatchedCredits.map((row) => (
                  <div
                    key={row.rowIndex}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{row.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Date: {row.date} • Amount: <strong className="text-slate-900 dark:text-white tabular-nums">{formatInr(row.amount)}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={manualLinks[row.rowIndex] || ""}
                        onChange={(e) =>
                          setManualLinks((prev) => ({ ...prev, [row.rowIndex]: e.target.value }))
                        }
                        className="text-xs px-2.5 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white tap-target"
                      >
                        <option value="">Select invoice to link...</option>
                        {INVOICES.filter((i) => i.outstanding > 0).map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} - {inv.customerName} ({formatInr(inv.outstanding)})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleManualMatch(row.rowIndex)}
                        disabled={!manualLinks[row.rowIndex]}
                        className="px-3 py-2 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tap-target shrink-0"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
