import { useState, useMemo } from "react";
import { Shell } from "../components/Shell";
import { Money } from "../components/Money";
import { validateGstin } from "../utils/gstin";
import { toPaise, formatInr, amountInWords, roundGst, splitCgstSgst } from "../utils/money";
import { computeDueDate, PaymentTerms } from "../utils/date";
import { CUSTOMERS, getCustomer } from "../data/sampleData";
import { Language } from "../data/i18n;

interface LineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export function CreateInvoice({ lang }: { lang: Language }): JSX.Element {
  const [customerId, setCustomerId] = useState("");
  const [gstin, setGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("Maharashtra");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState<PaymentTerms>("Net 30");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18 },
  ]);
  const [roundOff, setRoundOff] = useState(0);
  const [billOfSupply, setBillOfSupply] = useState(false);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [uploadContent, setUploadContent] = useState("");

  const customer = getCustomer(customerId);
  const customerState = customer?.state || "Maharashtra";
  const isSameState = placeOfSupply === customerState;

  const lineTotals = useMemo(() => {
    return lineItems.map((item) => {
      const lineAmount = item.rate * item.quantity;
      const gst = roundGst(toPaise(lineAmount), item.gstRate);
      return { lineAmount, gst };
    });
  }, [lineItems]);

  const subtotal = lineTotals.reduce((sum, t) => sum + t.lineAmount, 0);
  const totalGst = lineTotals.reduce((sum, t) => sum + t.gst, 0);
  const { cgst, sgst } = splitCgstSgst(totalGst);
  const igst = isSameState ? 0 : totalGst;
  const grandTotal = subtotal + totalGst + roundOff;

  return (
    <Shell lang={lang} onLangChange={() => {}} dark={false} onToggleDark={() => {}}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Create invoice
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a GST invoice for your customer. All figures are in Indian rupees.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
              >
                <option value="">Select a customer</option>
                {CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => {
                  setGstin(e.target.value.toUpperCase());
                  setGstinError(null);
                }}
                placeholder="27AABCS1234Q1ZM"
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent uppercase tap-target"
              />
              {gstinError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{gstinError}</p>
              )}
              {gstin && !gstinError && (
                <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">
                  Valid GSTIN
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Place of supply
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Delhi">Delhi</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="West Bengal">West Bengal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Invoice date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Payment terms
              </label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value as PaymentTerms)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
              >
                <option value="Net 15">Net 15 (15 days)</option>
                <option value="Net 30">Net 30 (30 days)</option>
                <option value="Net 45">Net 45 (45 days)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billOfSupply}
                  onChange={(e) => setBillOfSupply(e.target.checked)}
                  className="rounded border-slate-600 text-teal-600 focus:ring-teal-600"
                />
                Bill of Supply (composition dealer)
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Line items</h3>
              <button
                onClick={() => {
                  const nextId = String(lineItems.length + 1);
                  setLineItems([
                    ...lineItems,
                    { id: nextId, description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18 },
                  ]);
                }}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline tap-target"
              >
                + Add line item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Description</th>
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">HSN</th>
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Rate</th>
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">GST %</th>
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <input
                          value={item.description}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].description = e.target.value;
                            setLineItems(next);
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          value={item.hsn}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].hsn = e.target.value;
                            setLineItems(next);
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].quantity = parseInt(e.target.value) || 1;
                            setLineItems(next);
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].rate = parseFloat(e.target.value) || 0;
                            setLineItems(next);
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <select
                          value={item.gstRate}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].gstRate = parseInt(e.target.value);
                            setLineItems(next);
                          }}
                          className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white text-right"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-white font-medium">
                        {formatInr(item.rate * item.quantity)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="text-red-600 dark:text-red-400 hover:underline tap-target"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GST summary */}
          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Subtotal</p>
                <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(subtotal)}</p>
              </div>
              {!billOfSupply && isSameState && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">CGST</p>
                  <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(cgst)}</p>
                </div>
              )}
              {!billOfSupply && isSameState && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SGST</p>
                  <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(sgst)}</p>
                </div>
              )}
              {!billOfSupply && !isSameState && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">IGST</p>
                  <p className="text-sm tabular-nums text-slate-900 dark:text-white">{formatInr(igst)}</p>
                </div>
              )}
            </div>
            <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-lg font-bold text-slate-900 dark:text-white">Total (incl. GST)</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{formatInr(grandTotal)}</p>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
              {amountInWords(toPaise(grandTotal))}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Due date: {computeDueDate(new Date(invoiceDate), terms).toLocaleDateString("en-IN")}
            </p>
          </div>

          {/* Upload */}
          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
              Upload a photo or CSV
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Upload an invoice photo or CSV to auto-fill the form. You'll review uncertain fields before saving.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".csv,.jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadContent(file.name);
                  }}
                  className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 dark:file:bg-teal-700 dark:hover:file:bg-teal-600"
                />
              </div>
              <button
                onClick={() => setShowReview(true)}
                disabled={!uploadContent}
                className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed tap-target"
              >
                Review extracted fields
              </button>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => alert("Invoice saved (demo). This would create an invoice record and show it in the Invoices list.")}
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 tap-target"
            >
              Save invoice
            </button>
          </div>
        </div>
      </Shell>
  );
}