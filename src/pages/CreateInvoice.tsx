import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { validateGstin } from "../utils/gstin";
import { toPaise, formatInr, amountInWords, roundGst, splitCgstSgst } from "../utils/money";
import { computeDueDate, PaymentTerms, formatDate } from "../utils/date";
import { CUSTOMERS, getCustomer, BUSINESS, INVOICES } from "../data/sampleData";
import { Language } from "../data/i18n";
import { Eye, FileCheck, CheckCircle2, Upload, AlertCircle, X, Printer } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export function CreateInvoice({ lang: _lang }: { lang: Language }) {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [gstin, setGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("Maharashtra");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState<PaymentTerms>("Net 30");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "Corrugated shipping cartons 5-ply", hsn: "4819", quantity: 200, rate: 45, gstRate: 18 },
  ]);
  const [billOfSupply, setBillOfSupply] = useState(false);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [uploadContent, setUploadContent] = useState("");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const customer = getCustomer(customerId);
  const customerState = customer?.state || "Maharashtra";
  const isSameState = placeOfSupply === customerState;

  // Calculate line totals in whole paise
  const lineTotals = useMemo(() => {
    return lineItems.map((item) => {
      const lineAmount = toPaise(item.rate * item.quantity);
      const gst = billOfSupply ? 0 : roundGst(lineAmount, item.gstRate);
      return { lineAmount, gst };
    });
  }, [lineItems, billOfSupply]);

  const subtotal = lineTotals.reduce((sum, t) => sum + t.lineAmount, 0); // Paise
  const totalGst = billOfSupply ? 0 : lineTotals.reduce((sum, t) => sum + t.gst, 0); // Paise
  const { cgst, sgst } = splitCgstSgst(totalGst);
  const igst = isSameState ? 0 : totalGst;
  const rawTotal = subtotal + (isSameState ? (cgst + sgst) : igst);
  const roundedTotal = Math.round(rawTotal / 100) * 100;
  const roundOff = roundedTotal - rawTotal;
  const grandTotal = roundedTotal;

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = getCustomer(id);
    if (selected) {
      setGstin(selected.gstin || "");
      setPlaceOfSupply(selected.state || "Maharashtra");
      setTerms("Net 30");
      setGstinError(selected.gstin && validateGstin(selected.gstin) ? null : (selected.gstin ? "Invalid GSTIN format" : null));
    }
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setGstin(upper);
    if (upper.length === 15) {
      setGstinError(validateGstin(upper) ? null : "Invalid GSTIN format (15 characters required)");
    } else {
      setGstinError(null);
    }
  };

  const applyExtractedData = () => {
    setCustomerId("cust-1");
    const cust = getCustomer("cust-1");
    if (cust) {
      setGstin(cust.gstin || "");
      setPlaceOfSupply(cust.state);
      setTerms("Net 30");
    }
    setLineItems([
      { id: "1", description: "Corrugated master cartons (heavy duty)", hsn: "4819", quantity: 500, rate: 42, gstRate: 18 },
      { id: "2", description: "Poly bubble wrap roll 100m", hsn: "3923", quantity: 10, rate: 650, gstRate: 18 },
    ]);
    setShowReview(false);
  };

  const handleSave = () => {
    if (!customerId) {
      alert("Please select a customer before saving.");
      return;
    }
    const newInvId = `inv-${INVOICES.length + 1}`;
    const newInvNum = `SP/24-25/0${INVOICES.length + 1}`;
    const cust = getCustomer(customerId);
    
    // Add to demo session invoices list
    INVOICES.push({
      id: newInvId,
      invoiceNumber: newInvNum,
      customerId,
      customerName: cust?.name || "Customer",
      customerCity: cust?.city || "",
      customerState: cust?.state || "",
      customerGstin: gstin || cust?.gstin || "",
      placeOfSupply,
      invoiceDate: new Date(invoiceDate),
      dueDate: computeDueDate(new Date(invoiceDate), terms),
      terms,
      lineItems: lineItems.map((li) => ({
        id: `li-${Date.now()}-${li.id}`,
        description: li.description || "Packaging Material",
        hsn: li.hsn || "4819",
        quantity: li.quantity,
        rate: toPaise(li.rate),
        gstRate: li.gstRate,
      })),
      subtotal,
      cgst: isSameState ? cgst : 0,
      sgst: isSameState ? sgst : 0,
      igst: !isSameState ? igst : 0,
      roundOff,
      total: grandTotal,
      amountPaid: 0,
      outstanding: grandTotal,
      status: "due",
      isDisputed: false,
      disputeReason: null,
      evidence: [
        {
          id: `ev-${Date.now()}`,
          date: new Date(),
          type: "invoice-sent",
          title: "Invoice created & ready",
          description: `Created for ${cust?.name}`,
          amount: grandTotal,
          channel: "email",
        },
      ],
      billOfSupply,
      pdfUrl: null,
    });

    setSaveSuccess(newInvNum);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Create invoice
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a GST invoice or Bill of Supply for your customer. All figures are in Indian rupees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors tap-target"
          >
            <Eye className="w-4 h-4 text-teal-600" />
            <span>Preview invoice</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-teal-900 dark:text-teal-200">
                Invoice {saveSuccess} created successfully!
              </p>
              <p className="text-xs text-teal-700 dark:text-teal-400">
                The record has been saved and is now visible in your Invoices list.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/invoices")}
            className="px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
          >
            View all invoices
          </button>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent tap-target"
            >
              <option value="">Select a customer</option>
              {CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city}, {c.state}) — {c.gstin}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Customer GSTIN
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              placeholder="27AABCS1234Q1ZM"
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent uppercase font-mono text-sm tap-target"
            />
            {gstinError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{gstinError}</p>
            )}
            {gstin && !gstinError && (
              <p className="mt-1 text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Valid GSTIN
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
              <option value="Maharashtra">Maharashtra (Intra-state: CGST + SGST)</option>
              <option value="Karnataka">Karnataka (Inter-state: IGST)</option>
              <option value="Delhi">Delhi (Inter-state: IGST)</option>
              <option value="Tamil Nadu">Tamil Nadu (Inter-state: IGST)</option>
              <option value="West Bengal">West Bengal (Inter-state: IGST)</option>
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
              <option value="Net 7">Net 7 (7 days)</option>
              <option value="Net 15">Net 15 (15 days)</option>
              <option value="Net 30">Net 30 (30 days)</option>
              <option value="Net 45">Net 45 (45 days)</option>
              <option value="Net 60">Net 60 (60 days)</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={billOfSupply}
                onChange={(e) => setBillOfSupply(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
              />
              <span>Bill of Supply (Composition dealer / exempt goods)</span>
            </label>
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Line items</h3>
            <button
              type="button"
              onClick={() => {
                const nextId = String(lineItems.length + 1);
                setLineItems([
                  ...lineItems,
                  { id: nextId, description: "", hsn: "4819", quantity: 1, rate: 0, gstRate: 18 },
                ]);
              }}
              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline tap-target"
            >
              + Add line item
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Description</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-24">HSN</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-24 text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-32 text-right">Rate (₹)</th>
                  {!billOfSupply && (
                    <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-28 text-right">GST %</th>
                  )}
                  <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-32 text-right">Amount</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {lineItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].description = e.target.value;
                          setLineItems(next);
                        }}
                        placeholder="Item description"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-teal-600 focus:ring-0 text-slate-900 dark:text-white px-0 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].hsn = e.target.value;
                          setLineItems(next);
                        }}
                        placeholder="HSN"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-teal-600 focus:ring-0 text-slate-900 dark:text-white px-0 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                          setLineItems(next);
                        }}
                        className="w-full text-right bg-transparent border-0 border-b border-transparent focus:border-teal-600 focus:ring-0 text-slate-900 dark:text-white px-0 text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].rate = Math.max(0, parseFloat(e.target.value) || 0);
                          setLineItems(next);
                        }}
                        className="w-full text-right bg-transparent border-0 border-b border-transparent focus:border-teal-600 focus:ring-0 text-slate-900 dark:text-white px-0 text-sm tabular-nums"
                      />
                    </td>
                    {!billOfSupply && (
                      <td className="px-4 py-2 text-right">
                        <select
                          value={item.gstRate}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].gstRate = parseInt(e.target.value);
                            setLineItems(next);
                          }}
                          className="bg-transparent border-0 border-b border-transparent focus:border-teal-600 focus:ring-0 text-slate-900 dark:text-white text-right text-sm"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-white font-medium">
                      {formatInr(toPaise(item.rate * item.quantity))}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GST & Totals Summary */}
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Subtotal</p>
              <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatInr(subtotal)}
              </p>
            </div>
            {!billOfSupply && isSameState && (
              <>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">CGST (9%)</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatInr(cgst)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">SGST (9%)</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatInr(sgst)}
                  </p>
                </div>
              </>
            )}
            {!billOfSupply && !isSameState && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">IGST (18%)</p>
                <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatInr(igst)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Round off</p>
              <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatInr(roundOff)}
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Payment due: {computeDueDate(new Date(invoiceDate), terms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-1 italic">
                {amountInWords(grandTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Grand Total</p>
              <p className="text-2xl font-bold tabular-nums text-teal-600 dark:text-teal-400">
                {formatInr(grandTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Upload a photo or CSV */}
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Upload an invoice photo or CSV
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Upload an existing physical invoice or supplier CSV to automatically extract line items and tax figures. You will review extracted values before anything is applied.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <input
                type="file"
                accept=".csv,.jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadContent(file.name);
                }}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-slate-700 dark:file:text-teal-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowReview(true)}
              disabled={!uploadContent}
              className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tap-target shrink-0"
            >
              Review extracted fields
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 tap-target"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 shadow transition-colors tap-target"
          >
            Save invoice
          </button>
        </div>
      </div>

      {/* Review Extracted Fields Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Review extracted fields
                </h3>
              </div>
              <button
                onClick={() => setShowReview(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fields detected from <strong>{uploadContent || "invoice-scan.jpg"}</strong>. Review and confirm before applying to form.
            </p>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customer</p>
                  <p className="font-medium text-slate-900 dark:text-white">Gupta Traders (Mumbai)</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  98% confidence
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">GSTIN</p>
                  <p className="font-mono text-xs font-medium text-slate-900 dark:text-white">27AAAPG1234M1Z5</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  100% confidence
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Detected items</p>
                <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <li>• Corrugated master cartons (500 pcs @ ₹42)</li>
                  <li>• Poly bubble wrap roll (10 pcs @ ₹650)</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Payment terms were not stated on upload. Defaulted to Net 30.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={applyExtractedData}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
              >
                Apply to invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF / Print Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-6">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-semibold">Tax Invoice Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded hover:bg-teal-700"
                >
                  Print / PDF
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Sheet */}
            <div className="border border-slate-300 dark:border-slate-700 p-6 rounded bg-white dark:bg-slate-800 text-xs space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{BUSINESS.name}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{BUSINESS.city}, {BUSINESS.state}</p>
                  <p className="font-mono mt-1">GSTIN: {BUSINESS.gstin}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 text-sm">
                    {billOfSupply ? "Bill of Supply" : "Tax Invoice"}
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">Date: {formatDate(new Date(invoiceDate))}</p>
                  <p className="text-slate-600 dark:text-slate-400">Terms: {terms}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">Bill To:</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{customer?.name || "Customer"}</p>
                  <p className="text-slate-600 dark:text-slate-400">{customer?.city}, {customer?.state}</p>
                  <p className="font-mono mt-1">GSTIN: {gstin || customer?.gstin || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Place of Supply:</p>
                  <p>{placeOfSupply}</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 mt-2">Due Date:</p>
                  <p>{formatDate(computeDueDate(new Date(invoiceDate), terms))}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    <th className="py-2">Description</th>
                    <th className="py-2">HSN</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="py-2">{li.description || "Packaging item"}</td>
                      <td className="py-2 font-mono">{li.hsn}</td>
                      <td className="py-2 text-right tabular-nums">{li.quantity}</td>
                      <td className="py-2 text-right tabular-nums">{formatInr(toPaise(li.rate))}</td>
                      <td className="py-2 text-right tabular-nums">{formatInr(toPaise(li.rate * li.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-300 dark:border-slate-700 pt-3 flex justify-end">
                <div className="w-56 space-y-1.5 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="tabular-nums font-medium">{formatInr(subtotal)}</span>
                  </div>
                  {!billOfSupply && isSameState && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CGST (9%):</span>
                        <span className="tabular-nums font-medium">{formatInr(cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">SGST (9%):</span>
                        <span className="tabular-nums font-medium">{formatInr(sgst)}</span>
                      </div>
                    </>
                  )}
                  {!billOfSupply && !isSameState && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">IGST (18%):</span>
                      <span className="tabular-nums font-medium">{formatInr(igst)}</span>
                    </div>
                  )}
                  {roundOff !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Round off:</span>
                      <span className="tabular-nums font-medium">{formatInr(roundOff)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1 text-sm font-bold">
                    <span>Total:</span>
                    <span className="text-teal-600 dark:text-teal-400">{formatInr(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-slate-500 dark:text-slate-400 italic">
                Amount in words: {amountInWords(grandTotal)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
