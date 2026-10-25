import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation, useSearchParams, Link } from "react-router-dom";
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
  MapPin,
  AlertTriangle,
  Edit,
} from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import { useAuth } from "../utils/auth";
import { InvoiceCameraModal } from "../components/InvoiceCameraModal";
import { CustomerModal } from "../components/CustomerModal";
import { ExtractedInvoiceData, getStoredBusinessProfile } from "../data/dataStore";
import { useInvoiceUpload } from "../hooks/useInvoiceUpload";
import { Customer, getCustomerCategory } from "../data/sampleData";
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
  const [searchParams] = useSearchParams();
  const { id: routeInvoiceId } = useParams<{ id?: string }>();
  const isEditing = Boolean(propEditMode || routeInvoiceId);

  const { invoices, customers, businessProfile, saveInvoice, saveCustomer, saveBusinessProfile } = useDataStore();
  const { user, signInWithGoogle, loading: authLoading } = useAuth();

  // User / Sender Profile details (auto-filled from Profile)
  const currentProfile = useMemo(() => {
    const stored = getStoredBusinessProfile();
    return { ...stored, ...(businessProfile || {}) };
  }, [businessProfile]);

  const [senderBusinessName, setSenderBusinessName] = useState(
    currentProfile.name || businessProfile?.name || user?.name || ""
  );
  const [senderPhone, setSenderPhone] = useState(currentProfile.phone || "");
  const [senderEmail, setSenderEmail] = useState(currentProfile.email || "");
  const [senderGstin, setSenderGstin] = useState(currentProfile.gstin || "");
  const [senderAddress, setSenderAddress] = useState(currentProfile.address || "");
  const [senderCity, setSenderCity] = useState(currentProfile.city || "");
  const [senderState, setSenderState] = useState(currentProfile.state || "");

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(currentProfile.state || "");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState<PaymentTerms>("Net 30");

  // Buyer contact details
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18 },
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

  // Sync sender info from business profile whenever it updates or loads
  useEffect(() => {
    const prof = getStoredBusinessProfile();
    const effective = { ...prof, ...(businessProfile || {}) };
    if (effective) {
      if (effective.name) setSenderBusinessName(effective.name);
      if (effective.phone) setSenderPhone(effective.phone);
      if (effective.email) setSenderEmail(effective.email);
      if (effective.gstin) setSenderGstin(effective.gstin);
      if (effective.address) setSenderAddress(effective.address);
      if (effective.city) setSenderCity(effective.city);
      if (effective.state) {
        setSenderState(effective.state);
        setPlaceOfSupply((prev) => prev || effective.state);
      }
    }
  }, [businessProfile]);

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
          setBuyerPhone(cust.phone || existing.payerPhone || "");
          setBuyerEmail(cust.email || existing.payerEmail || "");
        } else {
          setBuyerPhone(existing.payerPhone || "");
          setBuyerEmail(existing.payerEmail || "");
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
      setInvoiceNumber((prev) => (prev ? prev : ""));
      const custParam = searchParams.get("customer");
      if (custParam) {
        handleCustomerChange(custParam);
      }
    }
  }, [isEditing, routeInvoiceId, invoices, customers, searchParams, businessProfile.state]);

  // Callback from Camera / OCR modal
  const handleApplyExtractedData = useCallback(
    (data: any, imagePreviewUrl?: string) => {
      if (imagePreviewUrl) {
        setScannedImagePreview(imagePreviewUrl);
      }
      setOcrBadge(`Auto-Extracted from Invoice Document`);

      const bName = (data?.payer_name ?? data?.buyerName ?? "").trim();
      const bGstin = (data?.payer_gstin ?? data?.buyerGstin ?? "").trim().toUpperCase();
      const bEmail = (data?.payer_email ?? data?.buyerEmail ?? "").trim();
      const bPhone = (data?.payer_phone ?? data?.buyerPhone ?? "").trim();
      const bAddress = (data?.payer_address ?? data?.buyerAddress ?? "").trim();

      let matchedCustomer = customers.find(
        (c) =>
          Boolean(c && (c.name ?? "").toLowerCase() === (bName ?? "").toLowerCase()) ||
          Boolean(bGstin && c && (c.gstin ?? "").toUpperCase() === bGstin)
      );

      if (!matchedCustomer && bName) {
        const newCust: Customer = {
          id: `cust-${Date.now().toString(36)}`,
          name: bName,
          city: bAddress ? (bAddress.split(",")[0] ?? "").trim() : (data?.buyerCity || ""),
          state: data?.buyerState || "",
          address: bAddress,
          gstin: bGstin || null,
          pan: bGstin && bGstin.length >= 12 ? bGstin.substring(2, 12) : null,
          email: bEmail || "",
          phone: bPhone || "",
          isChronicallyLate: false,
          grade: "A",
          gradeReasons: ["Registered via Invoice Document Scanner"],
        };
        saveCustomer(newCust);
        matchedCustomer = newCust;
      }

      if (matchedCustomer) {
        let updatedCust = false;
        const copyCust = { ...matchedCustomer };
        if (bEmail && copyCust.email !== bEmail) {
          copyCust.email = bEmail;
          updatedCust = true;
        }
        if (bPhone && copyCust.phone !== bPhone) {
          copyCust.phone = bPhone;
          updatedCust = true;
        }
        if (bGstin && copyCust.gstin !== bGstin) {
          copyCust.gstin = bGstin;
          updatedCust = true;
        }
        if (updatedCust) {
          saveCustomer(copyCust);
          matchedCustomer = copyCust;
        }

        setCustomerId(matchedCustomer.id);
        setGstin(bGstin || matchedCustomer.gstin || "");
        setPlaceOfSupply(matchedCustomer.state || (bAddress ? (bAddress.split(",").slice(-2)[0] ?? "").trim() : ""));
        setBuyerPhone(bPhone || matchedCustomer.phone || "");
        setBuyerEmail(bEmail || matchedCustomer.email || "");
      }

      const invNum = (data?.invoice_number ?? data?.invoiceNumber ?? "").trim();
      // Ensure never putting a GSTIN into invoice number
      const isGstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(invNum);
      if (invNum && !isGstinPattern) {
        setInvoiceNumber(invNum);
      } else if (data?.id) {
        setInvoiceNumber(`INV-${data.id}`);
      }

      const invDate = (data?.invoice_date ?? data?.invoiceDate ?? "").trim();
      if (invDate) {
        setInvoiceDate(invDate);
      }

      const dueDate = (data?.due_date ?? data?.dueDate ?? "").trim();
      if (dueDate && invDate) {
        const d1 = new Date(invDate);
        const d2 = new Date(dueDate);
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 15) setTerms("Net 15");
        else if (diffDays <= 30) setTerms("Net 30");
        else setTerms("Net 45");
      }

      const rawAmount = data?.amount !== undefined ? data.amount : data?.grandTotal;
      if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
        const amt = Number(rawAmount) || 0;
        if (amt > 0) {
          const baseRate = Math.round(amt * 0.82);
          setLineItems([
            {
              id: "1",
              description: `Goods / Services from ${(data?.vendor_name ?? "").trim() || "Vendor"}`,
              hsn: "9983",
              quantity: 1,
              rate: baseRate,
              gstRate: 18,
            },
          ]);
        }
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
  const effectiveSenderState = senderState || businessProfile.state || "";
  const customerState = customer?.state || effectiveSenderState;
  const isSameState = Boolean(
    effectiveSenderState && placeOfSupply && effectiveSenderState.trim().toLowerCase() === placeOfSupply.trim().toLowerCase()
  );

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

  const handleCustomerChange = useCallback((id: string) => {
    setCustomerId(id);
    const selected = customers.find(
      (c) => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase())
    );
    if (selected) {
      setGstin(selected.gstin || "");
      if (selected.state) {
        const found = INDIAN_STATES.find(
          (s) => s.state.toLowerCase() === selected.state.toLowerCase()
        );
        setPlaceOfSupply(found ? found.state : selected.state);
      }
      setBuyerPhone(selected.phone || "");
      setBuyerEmail(selected.email || "");
      setGstinError(
        selected.gstin && validateGstin(selected.gstin)
          ? null
          : selected.gstin
          ? "Invalid GSTIN format"
          : null
      );
    } else {
      setGstin("");
      setBuyerPhone("");
      setBuyerEmail("");
      setGstinError(null);
    }
  }, [customers]);

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);
    if (upper.length === 15) {
      setGstinError(validateGstin(upper) ? null : "Invalid GSTIN format (15 characters required)");
    } else {
      setGstinError(null);
    }
  };

  // Upload setForm adapter conforming to useInvoiceUpload hook
  const handleUploadSetForm = (updater: any) => {
    const prevObj = {
      invoiceNumber,
      invoiceDate,
      dueDate: "",
      sellerName: senderBusinessName,
      sellerGstin: senderGstin,
      buyerName: "",
      buyerGstin: gstin,
      buyerAddress: "",
      buyerEmail,
      buyerPhone,
      placeOfSupply,
      amount: 0,
      currency: "INR",
      n8nId: "",
    };
    const next = typeof updater === "function" ? updater(prevObj) : updater;

    // Rule: Never put a GSTIN in the invoice number
    const extractedInvNum = (next.invoiceNumber ?? "").trim();
    const isGstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(extractedInvNum);
    if (extractedInvNum && !isGstinPattern) {
      setInvoiceNumber(extractedInvNum);
    }

    if (next.invoiceDate) setInvoiceDate(next.invoiceDate);

    // Rule: Place of Supply comes only from inv.placeOfSupply. Never derive it from the seller address or GSTIN.
    if (next.placeOfSupply) {
      setPlaceOfSupply(next.placeOfSupply);
    }

    if (next.sellerName) setSenderBusinessName(next.sellerName);
    if (next.sellerGstin) setSenderGstin(next.sellerGstin);

    if (next.buyerName) {
      const bName = (next.buyerName ?? "").trim();
      const bGstin = (next.buyerGstin ?? "").trim().toUpperCase();
      const bEmail = (next.buyerEmail ?? "").trim();
      const bPhone = (next.buyerPhone ?? "").trim();
      const bAddress = (next.buyerAddress ?? "").trim();

      let matchedCustomer = customers.find(
        (c) =>
          Boolean(c && (c.name ?? "").toLowerCase() === (bName ?? "").toLowerCase()) ||
          Boolean(bGstin && c && (c.gstin ?? "").toUpperCase() === bGstin)
      );

      if (!matchedCustomer && bName) {
        const newCust: Customer = {
          id: `cust-${Date.now().toString(36)}`,
          name: bName,
          city: bAddress ? (bAddress.split(",")[0] ?? "").trim() : "",
          state: next.placeOfSupply || "",
          address: bAddress,
          gstin: bGstin || null,
          pan: bGstin && bGstin.length >= 12 ? bGstin.substring(2, 12) : null,
          email: bEmail || "",
          phone: bPhone || "",
          isChronicallyLate: false,
          grade: "A",
          gradeReasons: ["Registered via Invoice Document Scanner"],
        };
        saveCustomer(newCust);
        matchedCustomer = newCust;
      }

      if (matchedCustomer) {
        setCustomerId(matchedCustomer.id);
        setGstin(bGstin || matchedCustomer.gstin || "");
        setBuyerPhone(bPhone || matchedCustomer.phone || "");
        setBuyerEmail(bEmail || matchedCustomer.email || "");
      }
    } else {
      if (next.buyerGstin) setGstin(next.buyerGstin);
      if (next.buyerPhone) setBuyerPhone(next.buyerPhone);
      if (next.buyerEmail) setBuyerEmail(next.buyerEmail);
    }

    if (next.dueDate && next.invoiceDate) {
      const d1 = new Date(next.invoiceDate);
      const d2 = new Date(next.dueDate);
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 15) setTerms("Net 15");
      else if (diffDays <= 30) setTerms("Net 30");
      else setTerms("Net 45");
    }

    if (next.amount) {
      const amt = Number(next.amount) || 0;
      if (amt > 0) {
        const baseRate = Math.round(amt * 0.82);
        setLineItems([
          {
            id: "1",
            description: `Goods / Services from ${(next.sellerName ?? "").trim() || "Vendor"}`,
            hsn: "9983",
            quantity: 1,
            rate: Math.round(baseRate / 100),
            gstRate: 18,
          },
        ]);
      }
    }

    setOcrBadge("Auto-Extracted from Invoice Document");
  };

  const { reading, uploadError, setUploadError, missing, setMissing, handleFile } = useInvoiceUpload(handleUploadSetForm);

  const handleSaveBuyerModal = (newBuyer: Customer) => {
    saveCustomer(newBuyer);
    setCustomerId(newBuyer.id);
    setGstin(newBuyer.gstin || "");
    setPlaceOfSupply(newBuyer.state || "");
    setBuyerPhone(newBuyer.phone || "");
    setBuyerEmail(newBuyer.email || "");
  };

  const handleSave = () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!customerId) {
      alert("Please select or add a buyer before saving.");
      return;
    }

    const cleanEmail = (buyerEmail ?? "").trim();
    const cleanPhone = (buyerPhone ?? "").trim();
    const cleanGstin = (gstin ?? "").trim().toUpperCase();

    const selectedCust = customers.find((c) => c.id === customerId);
    if (selectedCust) {
      const updatedCust: Customer = {
        ...selectedCust,
        email: cleanEmail || selectedCust.email || "",
        phone: cleanPhone || selectedCust.phone || "",
        gstin: cleanGstin || selectedCust.gstin || null,
        state: placeOfSupply || selectedCust.state || "",
      };
      saveCustomer(updatedCust);
    }

    const invId = isEditing && routeInvoiceId ? routeInvoiceId : `inv-${Date.now().toString(36)}`;
    const finalNumber = invoiceNumber.trim();

    const existingInv = isEditing && routeInvoiceId ? invoices.find((i) => i.id === routeInvoiceId) : null;

    const finalSellerName = senderBusinessName.trim() || businessProfile.name || user?.name || "My Business";

    const newInvoice = {
      id: invId,
      invoiceNumber: finalNumber,
      customerId,
      customerName: selectedCust?.name || "Customer",
      customerCity: selectedCust?.city || "",
      customerState: selectedCust?.state || "",
      customerGstin: cleanGstin || selectedCust?.gstin || "",
      placeOfSupply,
      sellerName: finalSellerName,
      sellerGstin: senderGstin.trim() || businessProfile.gstin || "",
      sellerPhone: senderPhone.trim() || businessProfile.phone || "",
      sellerEmail: senderEmail.trim() || businessProfile.email || "",
      sellerAddress: senderAddress.trim() || businessProfile.address || "",
      sellerCity: senderCity.trim() || businessProfile.city || "",
      sellerState: senderState.trim() || businessProfile.state || "",
      payerName: selectedCust?.name || "Customer",
      payerEmail: cleanEmail || selectedCust?.email || "",
      payerPhone: cleanPhone || selectedCust?.phone || "",
      invoiceDate: new Date(invoiceDate),
      dueDate: computeDueDate(new Date(invoiceDate), terms),
      terms,
      lineItems: lineItems.map((li) => ({
        id: `li-${Date.now()}-${li.id}`,
        description: li.description || "Goods / Service",
        hsn: li.hsn || "",
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

    // Sync business name and sender profile so it stays permanently synced
    if (finalSellerName && finalSellerName !== businessProfile.name) {
      saveBusinessProfile({
        ...businessProfile,
        name: finalSellerName,
        phone: senderPhone.trim() || businessProfile.phone || "",
        email: senderEmail.trim() || businessProfile.email || "",
        gstin: senderGstin.trim() || businessProfile.gstin || "",
        address: senderAddress.trim() || businessProfile.address || "",
        city: senderCity.trim() || businessProfile.city || "",
        state: senderState.trim() || businessProfile.state || "",
      });
    }

    setSaveSuccess(finalNumber);

    setTimeout(() => {
      navigate(`/invoices/${invId}`);
    }, 1200);
  };

  if (!user && !authLoading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to add invoices</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Login or sign up with your Google account to create, auto-calculate GST, and track your invoices.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-3.5 px-5 rounded-2xl font-semibold bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center gap-3 transition-all hover:shadow-md cursor-pointer text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google Account</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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

              <label className="upload-btn flex items-center gap-2 px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer">
                {reading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span>Reading invoice… (up to 90s)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-teal-600" />
                    <span>Upload invoice photo / PDF</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  hidden
                  disabled={reading}
                  onChange={handleFile}
                />
              </label>
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

      {uploadError && (
        <div className="error p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between text-xs font-semibold">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError("")} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

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
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Your Sender Details (Auto-Filled from Profile)
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Synced with Profile Identity
              </span>
              <Link
                to="/profile"
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold inline-flex items-center gap-1"
                title="Edit your details in Profile"
              >
                <Edit className="w-3 h-3" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Your Business / Sender Name
              </label>
              <input
                type="text"
                value={senderBusinessName}
                onChange={(e) => setSenderBusinessName(e.target.value)}
                placeholder="Business Name"
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-teal-600" />
                Your WhatsApp / Phone Number *
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-teal-600" />
                Your Billing / From Email *
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="billing@yourbusiness.in"
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your GSTIN
              </label>
              <input
                type="text"
                value={senderGstin}
                onChange={(e) => setSenderGstin(e.target.value.toUpperCase())}
                placeholder="27AABCS1234Q1ZM"
                className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {(senderAddress || senderCity) && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Registered Address: <strong>{senderAddress ? `${senderAddress}, ` : ""}{senderCity}, {senderState}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Section 2: Buyer (Recipient) Details */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Buyer / Recipient Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Buyer Selector with + New Buyer Button */}
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Buyer Company Name *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-bold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Buyer</span>
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                value={buyerPhone ?? ""}
                onChange={(e) => {
                  setBuyerPhone(e.target.value);
                  if (missing.includes("buyerPhone")) {
                    setMissing((prev) => prev.filter((m) => m !== "buyerPhone"));
                  }
                }}
                placeholder={missing.includes("buyerPhone") ? "Buyer phone (please check)" : "+91 98234 56780"}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  missing.includes("buyerPhone")
                    ? "field-missing border-amber-400 bg-amber-50/40 ring-1 ring-amber-400"
                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                }`}
              />
              {missing.includes("buyerPhone") && (
                <p className="mt-1 text-[11px] text-amber-600 font-semibold">Please check/enter buyer phone</p>
              )}
            </div>

            {/* Buyer Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 text-slate-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-teal-600" />
                Buyer Billing Email *
              </label>
              <input
                type="email"
                value={buyerEmail ?? ""}
                onChange={(e) => {
                  setBuyerEmail(e.target.value);
                  if (missing.includes("buyerEmail")) {
                    setMissing((prev) => prev.filter((m) => m !== "buyerEmail"));
                  }
                }}
                placeholder={missing.includes("buyerEmail") ? "Buyer email (please check)" : "accounts@buyer.in"}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  missing.includes("buyerEmail")
                    ? "field-missing border-amber-400 bg-amber-50/40 ring-1 ring-amber-400"
                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                }`}
              />
              {missing.includes("buyerEmail") && (
                <p className="mt-1 text-[11px] text-amber-600 font-semibold">Please check/enter buyer email</p>
              )}
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
                <option value="">Select Place of Supply</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} ({s.code}) {customerState && s.state === customerState ? "• Intra-state (CGST+SGST)" : customerState ? "• Inter-state (IGST)" : ""}
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
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
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

          {/* Auto-Extracted Buyer Profile Card */}
          {customer && (
            <div className="mt-4 p-4 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/50 dark:bg-teal-950/20 space-y-2.5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-200/60 dark:border-teal-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    Auto-Extracted Buyer Profile: <strong>{customer.name}</strong>
                  </span>
                  {(() => {
                    const cat = getCustomerCategory(customer);
                    if (cat === "green") {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          🟢 Green Client (&lt; 7 Days)
                        </span>
                      );
                    }
                    if (cat === "yellow") {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                          🟡 Yellow Client (&gt; 7 Days)
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                        🔴 Red Client (&gt; 30 Days)
                      </span>
                    );
                  })()}
                </div>

                <Link
                  to={`/customers/${customer.id}`}
                  className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                >
                  View Buyer Profile &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400">Phone:</span>{" "}
                  <strong>{customer.phone || "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>{" "}
                  <strong>{customer.email || "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Location:</span>{" "}
                  <strong>{customer.city}, {customer.state}</strong>
                </div>
              </div>

              {customer.isChronicallyLate && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Warning: This buyer is flagged with chronic payment delay habits.</span>
                </div>
              )}
            </div>
          )}
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
                  { id: nextId, description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18 },
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
                        placeholder="e.g. 9983"
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
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-base text-slate-900 dark:text-white">Tax Invoice Preview</span>
              <button
                type="button"
                onClick={() => setShowPdfPreview(false)}
                className="p-1.5 rounded-lg text-sm text-slate-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs space-y-3 font-mono text-slate-800 dark:text-slate-200">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{senderBusinessName || businessProfile.name}</p>
                  <p>{senderCity || businessProfile.city}, {senderState || businessProfile.state}</p>
                  <p>GSTIN: {senderGstin || businessProfile.gstin}</p>
                  <p>Phone: {senderPhone || businessProfile.phone} • Email: {senderEmail || businessProfile.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">{invoiceNumber ? `INVOICE #${invoiceNumber}` : "INVOICE"}</p>
                  <p>Date: {invoiceDate}</p>
                  <p>Terms: {terms}</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-600 dark:text-slate-400">BILLED TO:</p>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{customer?.name || "Customer"}</p>
                <p>Phone: {buyerPhone || customer?.phone || "—"} • Email: {buyerEmail || customer?.email || "—"}</p>
                <p>GSTIN: {gstin || "Unregistered"}</p>
                <p>Place of Supply: {placeOfSupply}</p>
              </div>
              <div className="border-t border-b border-slate-200 dark:border-slate-700 py-2 space-y-1">
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
                <p className="text-base text-teal-600 dark:text-teal-400">Total: {formatInr(grandTotal)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPdfPreview(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
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
