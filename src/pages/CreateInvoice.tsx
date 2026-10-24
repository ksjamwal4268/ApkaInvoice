import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { validateGstin } from "../utils/gstin";
import { toPaise, formatInr, amountInWords, roundGst, splitCgstSgst } from "../utils/money";
import { computeDueDate, PaymentTerms, toISODateString } from "../utils/date";
import { Language } from "../data/i18n";
import {
  Eye,
  CheckCircle2,
  Upload,
  X,
  Camera,
  Building2,
  Plus,
  ArrowLeft,
  Sparkles,
  FileText,
  Phone,
  Mail,
  User,
  ShieldCheck,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import { CustomerModal } from "../components/CustomerModal";
import { ExtractedInvoiceData, processInvoiceImageWithN8n } from "../data/dataStore";
import { Customer } from "../data/sampleData";
import { INDIAN_STATES } from "../utils/gstin";

interface LineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

interface CreateInvoiceProps {
  lang?: Language;
  isEditMode?: boolean;
}

export function CreateInvoice({ lang: _lang, isEditMode: propEditMode }: CreateInvoiceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeInvoiceId } = useParams<{ id?: string }>();
  const isEditing = Boolean(propEditMode || routeInvoiceId);

  const { invoices, customers, businessProfile, saveInvoice, saveCustomer } = useDataStore();

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(businessProfile.state || "Maharashtra");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState<PaymentTerms>("Net 30");

  // User / Sender contact details
  const [senderPhone, setSenderPhone] = useState(businessProfile.phone || "");
  const [senderEmail, setSenderEmail] = useState(businessProfile.email || "");

  // Buyer contact details
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "Standard commercial goods / packaging cartons", hsn: "4819", quantity: 100, rate: 45, gstRate: 18 },
  ]);
  const [billOfSupply, setBillOfSupply] = useState(false);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);
  const [ocrBadge, setOcrBadge] = useState<string | null>(null);
  const [isUploadingDirect, setIsUploadingDirect] = useState(false);

  // Modals state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync sender info from business profile
  useEffect(() => {
    if (!senderPhone && businessProfile.phone) setSenderPhone(businessProfile.phone);
    if (!senderEmail && businessProfile.email) setSenderEmail(businessProfile.email);
  }, [businessProfile, senderEmail, senderPhone]);

  // Load existing invoice if in edit mode
  useEffect(() => {
    if (isEditing && routeInvoiceId) {
      const existing = invoices.find((i) => i.id === routeInvoiceId);
      if (existing) {
        setInvoiceNumber(existing.invoiceNumber);
        setCustomerId(existing.customerId);
        setGstin(existing.customerGstin || "");
        setPlaceOfSupply(existing.placeOfSupply);
        setInvoiceDate(toISODateString(existing.invoiceDate));
        setTerms(existing.terms);
        setBillOfSupply(existing.billOfSupply);

        const cust = customers.find((c) => c.id === existing.customerId);
        if (cust) {
          setBuyerPhone(cust.phone || "");
          setBuyerEmail(cust.email || "");
        }

        setLineItems(
          existing.lineItems.map((li: any, idx: number) => ({
            id: String(idx + 1),
            description: li.description,
            hsn: li.hsn,
            quantity: li.quantity,
            rate: li.rate / 100,
            gstRate: li.gstRate,
          }))
        );
      }
    } else {
      setInvoiceNumber((prev) => (prev ? prev : `INV-24-25/${String(invoices.length + 1).padStart(3, "0")}`));
    }
  }, [isEditing, routeInvoiceId, invoices, customers]);

  // Callback from Camera / OCR modal
  const handleApplyExtractedData = useCallback(
    (data: ExtractedInvoiceData, imagePreviewUrl?: string) => {
      if (imagePreviewUrl) {
        setScannedImagePreview(imagePreviewUrl);
      }
      setOcrBadge(`Auto-Extracted from Invoice Document (${data.confidenceScore}% confidence)`);

      const bName = (data?.buyerName ?? "").trim();
      const bGstin = (data?.buyerGstin ?? "").trim().toUpperCase();
      let matchedCustomer = customers.find(
        (c) =>
          Boolean(c && (c.name ?? "").toLowerCase() === (bName ?? "").toLowerCase()) ||
          Boolean(bGstin && c && (c.gstin ?? "").toUpperCase() === bGstin)
      );

      if (!matchedCustomer && data.buyerName) {
        const newCust: Customer = {
          id: `cust-${Date.now().toString(36)}`,
          name: data.buyerName,
          city: data.buyerCity || "Pune",
          state: data.buyerState || "Maharashtra",
          gstin: data.buyerGstin || null,
          pan: data.buyerGstin && data.buyerGstin.length >= 12 ? data.buyerGstin.substring(2, 12) : null,
          email: data.buyerEmail || `accounts@${(data.buyerName ?? "buyer").toLowerCase().replace(/[^a-z0-9]/g, "") || "buyer"}.in`,
          phone: data.buyerPhone || "+91 98000 00000",
          isChronicallyLate: false,
          grade: "A",
          gradeReasons: ["Registered via Invoice Document Scanner"],
        };
        saveCustomer(newCust);
        matchedCustomer = newCust;
      }

      if (matchedCustomer) {
        setCustomerId(matchedCustomer.id);
        setGstin(data.buyerGstin || matchedCustomer.gstin || "");
        setPlaceOfSupply(data.buyerState || matchedCustomer.state || "Maharashtra");
        setBuyerPhone(data.buyerPhone || matchedCustomer.phone || "");
        setBuyerEmail(data.buyerEmail || matchedCustomer.email || "");
      }

      if (data.invoiceNumber) {
        setInvoiceNumber(data.invoiceNumber);
      }
      if (data.terms) {
        setTerms(data.terms as PaymentTerms);
      }
      if (data.invoiceDate) {
        setInvoiceDate(data.invoiceDate);
      }

      if (data.lineItems && data.lineItems.length > 0) {
        setLineItems(
          data.lineItems.map((item, idx) => ({
            id: String(idx + 1),
            description: item.description,
            hsn: item.hsn,
            quantity: item.quantity,
            rate: item.rate,
            gstRate: item.gstRate,
          }))
        );
      }
    },
    [customers, saveCustomer]
  );

  // Listen for prefilled invoice data from navigation
  useEffect(() => {
    const locState = location.state as { prefill?: ExtractedInvoiceData; imagePreview?: string } | undefined;
    if (locState?.prefill) {
      handleApplyExtractedData(locState.prefill, locState.imagePreview);
    }
  }, [location.state, handleApplyExtractedData]);

  const customer = customers.find((c) => c.id === customerId);
  const customerState = customer?.state || businessProfile.state || "Maharashtra";
  const isSameState = placeOfSupply === customerState;

  // Calculate line totals in whole paise
  const lineTotals = useMemo(() => {
    return lineItems.map((item) => {
      const lineAmount = toPaise(item.rate * item.quantity);
      const gst = billOfSupply ? 0 : roundGst(lineAmount, item.gstRate);
      return { lineAmount, gst };
    });
  }, [lineItems, billOfSupply]);

  const subtotal = lineTotals.reduce((sum, t) => sum + t.lineAmount, 0);
  const totalGst = billOfSupply ? 0 : lineTotals.reduce((sum, t) => sum + t.gst, 0);
  const { cgst, sgst } = splitCgstSgst(totalGst);
  const igst = isSameState ? 0 : totalGst;
  const rawTotal = subtotal + (isSameState ? cgst + sgst : igst);
  const roundedTotal = Math.round(rawTotal / 100) * 100;
  const roundOff = roundedTotal - rawTotal;
  const grandTotal = roundedTotal;

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setGstin(selected.gstin || "");
      setPlaceOfSupply(selected.state || "Maharashtra");
      setBuyerPhone(selected.phone || "");
      setBuyerEmail(selected.email || "");
      setGstinError(
        selected.gstin && validateGstin(selected.gstin)
          ? null
          : selected.gstin
          ? "Invalid GSTIN format"
          : null
      );
    }
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);
    if (upper.length === 15) {
      setGstinError(validateGstin(upper) ? null : "Invalid GSTIN format (15 characters required)");
    } else {
      setGstinError(null);
    }
  };

  // Direct file upload from the page
  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDirect(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setScannedImagePreview(base64);
      try {
        const res = await processInvoiceImageWithN8n(base64, true);
        handleApplyExtractedData(res.data, base64);
      } catch (err) {
        console.error("Direct file extraction error:", err);
      } finally {
        setIsUploadingDirect(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBuyerModal = (newBuyer: Customer) => {
    saveCustomer(newBuyer);
    setCustomerId(newBuyer.id);
    setGstin(newBuyer.gstin || "");
    setPlaceOfSupply(newBuyer.state || "Maharashtra");
    setBuyerPhone(newBuyer.phone || "");
    setBuyerEmail(newBuyer.email || "");
  };

  const handleSave = () => {
    if (!customerId) {
      alert("Please select or add a buyer before saving.");
      return;
    }

    const selectedCust = customers.find((c) => c.id === customerId);
    const invId = isEditing && routeInvoiceId ? routeInvoiceId : `inv-${Date.now().toString(36)}`;
    const finalNumber = invoiceNumber.trim() || `INV-24-25/${String(invoices.length + 1).padStart(3, "0")}`;

    const existingInv = isEditing && routeInvoiceId ? invoices.find((i) => i.id === routeInvoiceId) : null;

    const newInvoice = {
      id: invId,
      invoiceNumber: finalNumber,
      customerId,
      customerName: selectedCust?.name || "Customer",
      customerCity: selectedCust?.city || "",
      customerState: selectedCust?.state || "",
      customerGstin: gstin || selectedCust?.gstin || "",
      placeOfSupply,
      invoiceDate: new Date(invoiceDate),
      dueDate: computeDueDate(new Date(invoiceDate), terms),
      terms,
      lineItems: lineItems.map((li) => ({
        id: `li-${Date.now()}-${li.id}`,
        description: li.description || "Goods / Service",
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
      amountPaid: existingInv ? existingInv.amountPaid : 0,
      outstanding: existingInv ? Math.max(0, grandTotal - existingInv.amountPaid) : grandTotal,
      status: existingInv ? existingInv.status : ("due" as const),
      isDisputed: existingInv ? existingInv.isDisputed : false,
      disputeReason: existingInv ? existingInv.disputeReason : null,
      evidence: existingInv
        ? [
            {
              id: `ev-${Date.now()}`,
              date: new Date(),
              type: "invoice-sent" as const,
              title: "Invoice updated",
              description: `Modified by ${senderEmail || "user"}. Total: ${formatInr(grandTotal)}`,
              amount: grandTotal,
              channel: "email" as const,
            },
            ...existingInv.evidence,
          ]
        : [
            {
              id: `ev-${Date.now()}`,
              date: new Date(),
              type: "invoice-sent" as const,
              title: scannedImagePreview ? "Extracted from physical bill" : "Invoice created",
              description: `Generated for ${selectedCust?.name} by ${senderEmail || businessProfile.name}`,
              amount: grandTotal,
              channel: "whatsapp" as const,
            },
          ],
      billOfSupply,
      pdfUrl: null,
    };

    saveInvoice(newInvoice);
    setSaveSuccess(finalNumber);

    setTimeout(() => {
      navigate(`/invoices/${invId}`);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isEditing && (
              <Link
                to={`/invoices/${routeInvoiceId}`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:text-white inline-flex items-center gap-1 mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Link>
            )}
            <h1 className="text-2xl font-bold text-slate-900 text-slate-900">
              {isEditing ? `Edit Invoice ${invoiceNumber}` : "New Invoice"}
            </h1>
          </div>
          <p className="text-sm text-slate-500 text-slate-500">
            {isEditing
              ? "Modify invoice items, buyer terms, or tax classification."
              : "Create a tax invoice manually, or upload / scan a bill to auto-fill."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all tap-target"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingDirect}
                className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 border-slate-600 bg-white bg-slate-50 text-slate-700 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 hover:bg-slate-50 transition-all shadow-xs"
              >
                {isUploadingDirect ? (
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-teal-600" />
                )}
                <span>{isUploadingDirect ? "Extracting..." : "Upload Photo or PDF"}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 border-slate-200 rounded-xl text-xs font-semibold text-slate-700 text-slate-200 hover:bg-slate-50 hover:bg-slate-800 transition-colors tap-target"
          >
            <Eye className="w-4 h-4 text-teal-600" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Hidden file input for direct bill upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleDirectFileUpload}
      />

      {/* OCR Extraction Alert Banner */}
      {ocrBadge && (
        <div className="p-3.5 rounded-xl bg-teal-50 bg-teal-50 border border-teal-200 border-teal-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-teal-950 text-teal-200">{ocrBadge}</span>
              <p className="text-teal-700 text-teal-400 text-[11px]">
                Fields and line items have been auto-populated into the form below. Review or adjust any value as needed.
              </p>
            </div>
          </div>
          {scannedImagePreview && (
            <button
              type="button"
              onClick={() => window.open(scannedImagePreview, "_blank")}
              className="text-[11px] font-semibold text-teal-700 text-teal-300 hover:underline shrink-0"
            >
              View Uploaded File
            </button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 bg-emerald-950/40 border border-emerald-200 border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900 text-emerald-200">
                Invoice {saveSuccess} saved successfully!
              </p>
              <p className="text-xs text-emerald-700 text-emerald-400">
                Opening invoice record and payment timeline...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Invoice Form Card */}
      <div className="rounded-2xl border border-slate-200 border-slate-200 bg-white bg-slate-50 p-5 sm:p-7 shadow-xs space-y-6">
        {/* Section 1: Logged-in Sender Details (Your Details) */}
        <div className="p-4 rounded-xl bg-slate-50 bg-slate-50 border border-slate-200 border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600" />
              Your Sender Details (Logged-in User Account)
            </h2>
            <span className="text-[11px] text-teal-700 text-teal-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Messages & emails will dispatch from this contact
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 text-slate-500 mb-1">
                Your Business / Sender Name
              </label>
              <p className="text-sm font-bold text-slate-900 text-slate-900 px-3 py-2 bg-white bg-slate-900 rounded-lg border border-slate-200 border-slate-200">
                {businessProfile.name}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 text-slate-500 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-teal-600" />
                Your WhatsApp / Phone Number *
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 text-slate-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-teal-600" />
                Your Billing / From Email *
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="billing@yourbusiness.in"
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Buyer (Recipient) Details */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-slate-500 mb-3 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            Buyer / Recipient Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Buyer Selector with + New Buyer Button */}
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 text-slate-500">
                  Buyer Company Name *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-teal-600 text-teal-400 hover:text-teal-700 font-bold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Buyer</span>
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">-- Select or Add a Buyer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}, {c.state}) — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Buyer Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-teal-600" />
                Buyer WhatsApp / Phone *
              </label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+91 98234 56780"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Buyer Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-teal-600" />
                Buyer Billing Email *
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="accounts@buyer.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-24-25/001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 text-sm font-mono font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Buyer GSTIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1">
                Buyer GSTIN (15 Digits)
              </label>
              <input
                type="text"
                value={gstin}
                maxLength={15}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="27AABCS1234Q1ZM"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase focus:outline-none focus:ring-2 ${
                  gstinError
                    ? "border-rose-500 bg-rose-50/20 focus:ring-rose-500"
                    : "border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 focus:ring-teal-500"
                }`}
              />
              {gstinError ? (
                <p className="mt-1 text-[11px] text-rose-500">{gstinError}</p>
              ) : gstin.length === 15 ? (
                <p className="mt-1 text-[11px] text-emerald-600 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid GSTIN
                </p>
              ) : null}
            </div>

            {/* Place of Supply */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1">
                Place of Supply
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} ({s.code}) {s.state === customerState ? "• Intra-state (CGST+SGST)" : "• Inter-state (IGST)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1">
                Payment Terms (Credit Window)
              </label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value as PaymentTerms)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 border-slate-600 bg-white bg-slate-900 text-slate-900 text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Net 7">Net 7 (7 Days)</option>
                <option value="Net 15">Net 15 (15 Days)</option>
                <option value="Net 30">Net 30 (30 Days)</option>
                <option value="Net 45">Net 45 (45 Days)</option>
                <option value="Net 60">Net 60 (60 Days)</option>
              </select>
            </div>

            {/* Bill of Supply Option */}
            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 text-slate-500">
                <input
                  type="checkbox"
                  checked={billOfSupply}
                  onChange={(e) => setBillOfSupply(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Bill of Supply (Zero Tax / Exempt)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Line Items */}
        <div className="pt-4 border-t border-slate-200 border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Line Items & Products
            </h2>
            <button
              type="button"
              onClick={() => {
                const nextId = String(lineItems.length + 1);
                setLineItems([
                  ...lineItems,
                  { id: nextId, description: "", hsn: "4819", quantity: 100, rate: 25, gstRate: 18 },
                ]);
              }}
              className="text-xs font-bold text-teal-600 text-teal-400 hover:text-teal-700 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 border-slate-200 bg-slate-50 bg-slate-50 text-xs font-bold text-slate-600 text-slate-500">
                  <th className="px-4 py-3">Description</th>
                  <th className="px-3 py-3 w-28 font-mono">HSN</th>
                  <th className="px-3 py-3 w-24 text-right">Qty</th>
                  <th className="px-3 py-3 w-28 text-right">Rate (₹)</th>
                  {!billOfSupply && (
                    <th className="px-3 py-3 w-24 text-right">GST %</th>
                  )}
                  <th className="px-4 py-3 w-32 text-right">Amount (₹)</th>
                  <th className="px-3 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 divide-slate-700">
                {lineItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 hover:bg-slate-750/30">
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].description = e.target.value;
                          setLineItems(next);
                        }}
                        placeholder="Item description (e.g. Master Cartons)"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 text-slate-900 text-slate-900 px-0 text-sm font-medium"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].hsn = e.target.value;
                          setLineItems(next);
                        }}
                        placeholder="4819"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 text-slate-900 text-slate-900 px-0 text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                          setLineItems(next);
                        }}
                        className="w-full text-right bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 text-slate-900 text-slate-900 px-0 text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
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
                        className="w-full text-right bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 text-slate-900 text-slate-900 px-0 text-sm tabular-nums font-medium"
                      />
                    </td>
                    {!billOfSupply && (
                      <td className="px-3 py-2.5 text-right">
                        <select
                          value={item.gstRate}
                          onChange={(e) => {
                            const next = [...lineItems];
                            next[idx].gstRate = parseInt(e.target.value);
                            setLineItems(next);
                          }}
                          className="bg-transparent border-0 border-b border-transparent focus:border-teal-500 focus:ring-0 text-slate-900 text-slate-900 text-right text-xs font-semibold"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900 text-slate-900">
                      {formatInr(toPaise(item.rate * item.quantity))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Tax Summary & Grand Total */}
        <div className="pt-4 border-t border-slate-200 border-slate-200 bg-slate-50/70 bg-slate-50/40 p-5 rounded-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200 border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500 text-slate-500">Taxable Subtotal</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 text-slate-900 mt-0.5">
                {formatInr(subtotal)}
              </p>
            </div>
            {!billOfSupply && isSameState && (
              <>
                <div>
                  <p className="text-xs font-medium text-slate-500 text-slate-500">CGST (9%)</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900 text-slate-900 mt-0.5">
                    {formatInr(cgst)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 text-slate-500">SGST (9%)</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900 text-slate-900 mt-0.5">
                    {formatInr(sgst)}
                  </p>
                </div>
              </>
            )}
            {!billOfSupply && !isSameState && (
              <div>
                <p className="text-xs font-medium text-slate-500 text-slate-500">IGST (18%)</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 text-slate-900 mt-0.5">
                  {formatInr(igst)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-500 text-slate-500">Round Off</p>
              <p className="text-lg font-bold tabular-nums text-slate-500 mt-0.5">
                {roundOff === 0 ? "₹0.00" : `${roundOff > 0 ? "+" : ""}${formatInr(roundOff)}`}
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-slate-500 text-slate-500">
                Amount in Words:
              </span>
              <p className="text-xs font-semibold text-slate-700 text-slate-500 italic mt-0.5">
                {amountInWords(grandTotal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 text-slate-500 uppercase tracking-wider">
                Grand Total Payable
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-teal-600 text-teal-400 tabular-nums">
                {formatInr(grandTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {isEditing ? "Update & Save Invoice" : "Create & Record Invoice"}
          </button>
        </div>
      </div>

      {/* Camera & OCR Modal */}
      <InvoiceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onApplyExtractedData={handleApplyExtractedData}
        onInvoiceStored={() => {
          setIsCameraModalOpen(false);
          navigate("/invoices");
        }}
      />

      {/* Customer / Buyer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveBuyerModal}
      />

      {/* Invoice PDF Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white bg-slate-50 rounded-2xl p-6 shadow-2xl border border-slate-200 border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 border-slate-200">
              <span className="font-bold text-base text-slate-900 text-slate-900">Tax Invoice Preview</span>
              <button
                type="button"
                onClick={() => setShowPdfPreview(false)}
                className="p-1.5 rounded-lg text-sm text-slate-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 bg-slate-850 text-xs space-y-3 font-mono">
              <div className="flex justify-between border-b pb-2">
                <div>
                  <p className="font-bold text-sm">{businessProfile.name}</p>
                  <p>{businessProfile.city}, {businessProfile.state}</p>
                  <p>GSTIN: {businessProfile.gstin}</p>
                  <p>Phone: {senderPhone || businessProfile.phone} • Email: {senderEmail || businessProfile.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">INVOICE #{invoiceNumber}</p>
                  <p>Date: {invoiceDate}</p>
                  <p>Terms: {terms}</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-600">BILLED TO:</p>
                <p className="font-bold text-sm">{customer?.name || "Customer"}</p>
                <p>Phone: {buyerPhone || customer?.phone || "—"} • Email: {buyerEmail || customer?.email || "—"}</p>
                <p>GSTIN: {gstin || "Unregistered"}</p>
                <p>Place of Supply: {placeOfSupply}</p>
              </div>
              <div className="border-t border-b py-2 space-y-1">
                {lineItems.map((li, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{li.description} ({li.quantity} x ₹{li.rate})</span>
                    <span>{formatInr(toPaise(li.quantity * li.rate))}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5 text-right font-bold">
                <p>Subtotal: {formatInr(subtotal)}</p>
                {isSameState ? (
                  <>
                    <p>CGST (9%): {formatInr(cgst)}</p>
                    <p>SGST (9%): {formatInr(sgst)}</p>
                  </>
                ) : (
                  <p>IGST (18%): {formatInr(igst)}</p>
                )}
                <p className="text-base text-teal-600">Total: {formatInr(grandTotal)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPdfPreview(false)}
                className="px-4 py-2 bg-slate-200 bg-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
