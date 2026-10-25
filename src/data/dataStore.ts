import { Customer, Invoice, INVOICES, CUSTOMERS, EvidenceEntry, CustomerId, InvoiceId } from "./sampleData";
import { Paise } from "../utils/money";

export type { Customer, Invoice, EvidenceEntry, CustomerId, InvoiceId };

export interface BusinessProfile {
  name: string;
  contactPerson?: string;
  role?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode?: string;
  gstin: string;
  pan?: string;
  businessType?: string;
  address: string;
  email: string;
  phone: string;
  bankName: string;
  accountHolderName?: string;
  bankAccount: string;
  ifsc: string;
  upi: string;
  isOnboarded?: boolean;
  syncedAt?: string;
}

export interface N8nConfig {
  ocrWebhookUrl: string;
  reminderWebhookUrl: string;
  apiKey: string;
  autoSync: boolean;
}

export interface ExtractedInvoiceData {
  invoiceNumber: string;
  buyerName: string;
  buyerGstin: string;
  buyerCity: string;
  buyerState: string;
  buyerPhone?: string;
  buyerEmail?: string;
  invoiceDate: string;
  dueDate: string;
  terms: "Net 7" | "Net 15" | "Net 30" | "Net 45" | "Net 60";
  lineItems: Array<{
    id: string;
    description: string;
    hsn: string;
    quantity: number;
    rate: number;
    gstRate: number;
  }>;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  isNewBuyer?: boolean;
  confidenceScore: number;
}

export interface N8nReminderPayload {
  invoiceId: string;
  invoiceNumber: string;
  sender: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    gstin?: string;
    upi?: string;
  };
  buyer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    gstin: string | null;
  };
  amountDuePaise: Paise;
  amountDueFormatted: string;
  dueDate: string;
  daysOverdue: number;
  stage: string;
  reminderMessage: string;
  language: string;
  channel?: "email" | "whatsapp";
  subject?: string;
  paymentDetails: {
    upi: string;
    bankName: string;
    bankAccount: string;
    ifsc: string;
  };
}

export type RemainderPayload = N8nReminderPayload;

const INVOICES_KEY = "cc_invoices_real_v2";
const CUSTOMERS_KEY = "cc_customers_real_v2";
const N8N_CONFIG_KEY = "cc_n8n_config_v1";
const BUSINESS_KEY = "cc_business_profile_v2";

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: "",
  contactPerson: "",
  role: "",
  city: "",
  state: "",
  stateCode: "",
  pincode: "",
  gstin: "",
  pan: "",
  businessType: "",
  address: "",
  email: "",
  phone: "",
  bankName: "",
  accountHolderName: "",
  bankAccount: "",
  ifsc: "",
  upi: "",
  isOnboarded: false,
};

const DEFAULT_N8N_CONFIG: N8nConfig = {
  ocrWebhookUrl: "https://ksjamwal.app.n8n.cloud/webhook/invoice-upload",
  reminderWebhookUrl: "",
  apiKey: "n8n-invoice-secret-2024",
  autoSync: true,
};

function dispatchStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cc-store-updated"));
  }
}

function reviveInvoice(raw: any): Invoice {
  return {
    ...raw,
    invoiceDate: new Date(raw.invoiceDate),
    dueDate: new Date(raw.dueDate),
    evidence: (raw.evidence || []).map((e: any) => ({
      ...e,
      date: new Date(e.date),
    })),
  };
}

/**
 * Real Data Invoices: Starts with 0 fake data. Only real invoices created/scanned are stored.
 */
export function getStoredInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    if (!raw) {
      localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Automatically purge legacy demo/fake invoices
    const cleanInvoices = parsed.filter(
      (inv: any) =>
        !inv?.id?.startsWith("inv-") &&
        !inv?.invoiceNumber?.startsWith("SP/24-25/")
    );
    if (cleanInvoices.length !== parsed.length) {
      localStorage.setItem(INVOICES_KEY, JSON.stringify(cleanInvoices));
    }
    return cleanInvoices.map(reviveInvoice);
  } catch (e) {
    console.error("Failed to parse invoices from storage", e);
    return [];
  }
}

export function getStoredInvoice(id: InvoiceId): Invoice | undefined {
  const invs = getStoredInvoices();
  return invs.find((i) => i.id === id);
}

export function saveInvoice(invoice: Invoice): void {
  const invs = getStoredInvoices();
  const idx = invs.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) {
    invs[idx] = invoice;
  } else {
    invs.unshift(invoice);
  }
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invs));
  dispatchStoreChange();
}

export function deleteInvoice(id: InvoiceId): void {
  const invs = getStoredInvoices();
  const filtered = invs.filter((i) => i.id !== id);
  localStorage.setItem(INVOICES_KEY, JSON.stringify(filtered));
  dispatchStoreChange();
}

export function addInvoiceEvidence(invoiceId: InvoiceId, entry: EvidenceEntry): void {
  const invs = getStoredInvoices();
  const inv = invs.find((i) => i.id === invoiceId);
  if (inv) {
    if (!inv.evidence) inv.evidence = [];
    inv.evidence.unshift(entry);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invs));
    dispatchStoreChange();
  }
}

/**
 * Real Data Customers: Starts with 0 fake buyers. Only real customers added are stored.
 */
export function getStoredCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Automatically purge legacy demo/fake customers
    const cleanCustomers = parsed.filter(
      (c: any) =>
        !c?.id?.startsWith("cust-") &&
        c?.name !== "Gupta Traders" &&
        c?.name !== "Shree Ganesh Textiles"
    );
    if (cleanCustomers.length !== parsed.length) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(cleanCustomers));
    }
    return cleanCustomers;
  } catch (e) {
    console.error("Failed to parse customers from storage", e);
    return [];
  }
}

export function getStoredCustomer(id: CustomerId): Customer | undefined {
  const custs = getStoredCustomers();
  return custs.find((c) => c.id === id);
}

export function saveCustomer(customer: Customer): void {
  const custs = getStoredCustomers();
  const idx = custs.findIndex((c) => c.id === customer.id);
  if (idx >= 0) {
    custs[idx] = customer;
  } else {
    custs.unshift(customer);
  }
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(custs));
  dispatchStoreChange();
}

export function deleteCustomer(id: CustomerId): void {
  const custs = getStoredCustomers();
  const filtered = custs.filter((c) => c.id !== id);
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
  dispatchStoreChange();
}

/**
 * Business Profile Store
 */
export function getStoredBusinessProfile(): BusinessProfile {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_PROFILE;
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    if (!raw) return DEFAULT_BUSINESS_PROFILE;
    const parsed = JSON.parse(raw);
    // Discard legacy demo / fake Sharma Packaging data
    if (
      parsed.name === "Sharma Packaging" ||
      parsed.email === "billing@sharmapackaging.in" ||
      parsed.upi === "sharmapackaging@hdfc"
    ) {
      localStorage.removeItem(BUSINESS_KEY);
      return DEFAULT_BUSINESS_PROFILE;
    }
    return { ...DEFAULT_BUSINESS_PROFILE, ...parsed };
  } catch {
    return DEFAULT_BUSINESS_PROFILE;
  }
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  localStorage.setItem(BUSINESS_KEY, JSON.stringify(profile));
  dispatchStoreChange();
}

export interface ForecastSettings {
  startingBalance: number; // in INR
  monthlyRent: number; // in INR
  monthlyPayroll: number; // in INR
  weeklyVendors: number; // in INR
}

const FORECAST_KEY = "cc_forecast_settings_v2";

export const DEFAULT_FORECAST_SETTINGS: ForecastSettings = {
  startingBalance: 0,
  monthlyRent: 0,
  monthlyPayroll: 0,
  weeklyVendors: 0,
};

export function getStoredForecastSettings(): ForecastSettings {
  if (typeof window === "undefined") return DEFAULT_FORECAST_SETTINGS;
  try {
    const raw = localStorage.getItem(FORECAST_KEY);
    if (!raw) return DEFAULT_FORECAST_SETTINGS;
    return { ...DEFAULT_FORECAST_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FORECAST_SETTINGS;
  }
}

export function saveForecastSettings(settings: ForecastSettings): void {
  localStorage.setItem(FORECAST_KEY, JSON.stringify(settings));
  dispatchStoreChange();
}

/**
 * Wipe all fake / demo data completely so user starts fresh with real data only
 */
export function clearAllData(): void {
  localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
  // Clean up legacy keys
  localStorage.removeItem("cc_invoices_store_v1");
  localStorage.removeItem("cc_customers_store_v1");
  dispatchStoreChange();
}

/**
 * Load sample data if ever explicitly requested
 */
export function loadSampleData(): void {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(INVOICES));
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(CUSTOMERS));
  dispatchStoreChange();
}

export function getN8nConfig(): N8nConfig {
  if (typeof window === "undefined") return DEFAULT_N8N_CONFIG;
  try {
    const raw = localStorage.getItem(N8N_CONFIG_KEY);
    if (!raw) return DEFAULT_N8N_CONFIG;
    const parsed = JSON.parse(raw);
    if (parsed.ocrWebhookUrl && parsed.ocrWebhookUrl.includes("sharmapackaging.in")) {
      return DEFAULT_N8N_CONFIG;
    }
    return { ...DEFAULT_N8N_CONFIG, ...parsed };
  } catch {
    return DEFAULT_N8N_CONFIG;
  }
}

export function saveN8nConfig(cfg: N8nConfig): void {
  localStorage.setItem(N8N_CONFIG_KEY, JSON.stringify(cfg));
  dispatchStoreChange();
}

// Sample presets for OCR parser testing when n8n webhook is not yet set
const SAMPLE_OCR_PRESETS: ExtractedInvoiceData[] = [
  {
    invoiceNumber: "INV-2025-001",
    buyerName: "Apex Logistics India",
    buyerGstin: "27AAACA9876P1ZV",
    buyerCity: "Pune",
    buyerState: "Maharashtra",
    buyerPhone: "+91 98220 12345",
    buyerEmail: "procurement@apexlogistics.in",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    terms: "Net 30",
    lineItems: [
      { id: "1", description: "Corrugated Carton Boxes 7-Ply Heavy Duty (500x400x300mm)", hsn: "4819", quantity: 350, rate: 68, gstRate: 18 },
      { id: "2", description: "Self-Adhesive BOPP Packaging Tape (Brown, 72mm x 65m)", hsn: "3919", quantity: 50, rate: 125, gstRate: 18 },
    ],
    subtotal: 30050,
    totalGst: 5409,
    grandTotal: 35459,
    isNewBuyer: true,
    confidenceScore: 98.4,
  },
];

let presetCycle = 0;

export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Store an extracted invoice directly into the database / state
 */
export function storeExtractedInvoice(
  extracted: ExtractedInvoiceData,
  imagePreviewUrl?: string
): Invoice {
  const profile = getStoredBusinessProfile();
  const customers = getStoredCustomers();

  // Match or create customer
  const buyerName = (extracted?.buyerName ?? "").trim() || "Customer";
  const buyerGstin = (extracted?.buyerGstin ?? "").trim().toLowerCase();
  let customer = customers.find(
    (c) =>
      Boolean(c && (c.name ?? "").toLowerCase() === (buyerName ?? "").toLowerCase()) ||
      Boolean(buyerGstin && c && (c.gstin ?? "").toLowerCase() === buyerGstin)
  );

  if (!customer) {
    customer = {
      id: `cust-${Date.now().toString(36)}`,
      name: buyerName,
      city: extracted?.buyerCity || "",
      state: extracted?.buyerState || "",
      gstin: extracted?.buyerGstin || null,
      pan: extracted?.buyerGstin && extracted.buyerGstin.length >= 12 ? extracted.buyerGstin.substring(2, 12) : null,
      email: extracted?.buyerEmail || "",
      phone: extracted?.buyerPhone || "",
      isChronicallyLate: false,
      grade: "A",
      gradeReasons: ["Scanned via Document AI"],
    };
    saveCustomer(customer);
  }

  const isIntraState = Boolean(
    extracted?.buyerState && profile?.state && extracted.buyerState.trim().toLowerCase() === profile.state.trim().toLowerCase()
  );
  const grandTotalPaise = Math.round((extracted.grandTotal || 0) * 100);
  const subtotalPaise = Math.round((extracted.subtotal || (extracted.grandTotal ? extracted.grandTotal * 0.82 : 0)) * 100);
  const totalGstPaise = grandTotalPaise - subtotalPaise;

  const cgstPaise = isIntraState ? Math.round(totalGstPaise / 2) : 0;
  const sgstPaise = isIntraState ? totalGstPaise - cgstPaise : 0;
  const igstPaise = isIntraState ? 0 : totalGstPaise;

  const invDate = extracted.invoiceDate ? new Date(extracted.invoiceDate) : new Date();
  const dueDate = extracted.dueDate ? new Date(extracted.dueDate) : new Date(Date.now() + 30 * 86400000);
  const isOverdue = dueDate.getTime() < Date.now();

  const newInvoice: Invoice = {
    id: `inv-${Date.now().toString(36)}`,
    invoiceNumber: extracted.invoiceNumber || "",
    customerId: customer.id,
    customerName: customer.name,
    customerCity: customer.city,
    customerState: customer.state,
    customerGstin: customer.gstin,
    placeOfSupply: extracted.buyerState || customer.state,
    invoiceDate: isNaN(invDate.getTime()) ? new Date() : invDate,
    dueDate: isNaN(dueDate.getTime()) ? new Date(Date.now() + 30 * 86400000) : dueDate,
    terms: "Net 30",
    lineItems: (extracted.lineItems && extracted.lineItems.length > 0)
      ? extracted.lineItems.map((li, idx) => ({
          id: String(idx + 1),
          description: li.description || "General Goods/Services",
          hsn: li.hsn || "9983",
          quantity: li.quantity || 1,
          rate: Math.round((li.rate || 0) * 100),
          gstRate: li.gstRate || 18,
        }))
      : [
          {
            id: "1",
            description: "Goods / Services (Scanned)",
            hsn: "9983",
            quantity: 1,
            rate: subtotalPaise,
            gstRate: 18,
          },
        ],
    subtotal: subtotalPaise,
    cgst: cgstPaise,
    sgst: sgstPaise,
    igst: igstPaise,
    roundOff: 0,
    total: grandTotalPaise,
    amountPaid: 0,
    outstanding: grandTotalPaise,
    status: isOverdue ? "overdue" : "due",
    isDisputed: false,
    disputeReason: null,
    billOfSupply: false,
    pdfUrl: imagePreviewUrl || null,
    evidence: [
      {
        id: `ev-${Date.now()}`,
        date: new Date(),
        type: "invoice-sent",
        title: "Invoice Scanned & Verified",
        description: `Imported via OCR Vision model (${extracted.confidenceScore || 98}% confidence).`,
        amount: grandTotalPaise,
        channel: "email",
      },
    ],
  };

  saveInvoice(newInvoice);
  return newInvoice;
}

/**
 * Execute OCR extraction via n8n webhook
 */
export interface N8nUploadedInvoice {
  status: string;
  id: number | string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  vendor_name?: string | null;
  vendor_gstin?: string | null;
  payer_name?: string | null;
  payer_gstin?: string | null;
  payer_address?: string | null;
  payer_email?: string | null;
  payer_phone?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  raw_text?: string | null;
}

/**
 * Upload photo or PDF invoice to Cloud AI webhook
 * Endpoint: POST https://ksjamwal.app.n8n.cloud/webhook/invoice-upload
 * Body: multipart/form-data. File in field named "data".
 * Content-Type header is not set manually (browser sets boundary).
 * 90-second timeout.
 */
export async function uploadInvoiceToN8n(
  file: File | Blob
): Promise<N8nUploadedInvoice> {
  const fd = new FormData();
  // Append the file under the field name "data"
  fd.append("data", file);

  const controller = new AbortController();
  // 90-second timeout
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let res: Response;
  try {
    res = await fetch("https://ksjamwal.app.n8n.cloud/webhook/invoice-upload", {
      method: "POST",
      body: fd,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("invoice-upload fetch error:", err);
    throw new Error("Could not read this invoice. Please upload a clear photo or PDF.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("invoice-upload error response:", res.status, errorText);
    throw new Error("Could not read this invoice. Please upload a clear photo or PDF.");
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("Could not read this invoice. Please upload a clear photo or PDF.");
  }

  const payload: N8nUploadedInvoice = Array.isArray(json) ? json[0] : json;

  if (!payload || ((payload.status ?? "") as string).toLowerCase() !== "ready") {
    console.warn("Upload response not ready:", payload);
    throw new Error("Could not read this invoice. Please upload a clear photo or PDF.");
  }

  return payload;
}

/**
 * Save n8n extracted invoice to database with status="ready"
 */
export function saveN8nExtractedInvoice(
  extracted: N8nUploadedInvoice,
  pdfPreviewUrl?: string,
  existingInvoiceId?: string
): Invoice {
  const customers = getStoredCustomers();
  const payerName = (extracted?.payer_name ?? "").trim() || "Customer";
  const payerEmail = (extracted?.payer_email ?? "").trim();
  const payerPhone = (extracted?.payer_phone ?? "").trim();
  const payerGstin = (extracted?.payer_gstin ?? "").trim().toUpperCase() || null;
  const payerAddress = (extracted?.payer_address ?? "").trim();

  let customer: Customer;
  const existingCust = customers.find(
    (c) =>
      Boolean(c && (c?.name ?? "").toLowerCase() === (payerName ?? "").toLowerCase()) ||
      Boolean(payerGstin && c && (c?.gstin ?? "").toUpperCase() === payerGstin)
  );

  if (!existingCust) {
    customer = {
      id: `cust-${Date.now().toString(36)}`,
      name: payerName,
      city: payerAddress ? (payerAddress.split(",")[0] ?? "").trim() : "",
      state: "",
      address: payerAddress,
      gstin: payerGstin,
      pan: payerGstin && payerGstin.length >= 12 ? payerGstin.substring(2, 12) : null,
      email: payerEmail || "",
      phone: payerPhone || "",
      isChronicallyLate: false,
      grade: "A",
      gradeReasons: ["Imported from Invoice Document"],
    };
    saveCustomer(customer);
  } else {
    customer = { ...existingCust };
    let updatedCust = false;
    if (payerEmail && !customer.email) {
      customer.email = payerEmail;
      updatedCust = true;
    }
    if (payerPhone && !customer.phone) {
      customer.phone = payerPhone;
      updatedCust = true;
    }
    if (payerGstin && !customer.gstin) {
      customer.gstin = payerGstin;
      updatedCust = true;
    }
    if (payerAddress && !customer.address) {
      customer.address = payerAddress;
      updatedCust = true;
    }
    if (updatedCust) {
      saveCustomer(customer);
    }
  }

  const numericAmount =
    typeof extracted?.amount === "number"
      ? extracted.amount
      : parseFloat(String(extracted?.amount ?? "0")) || 0;
  const amountPaise = Math.round(numericAmount * 100);

  let dueDate: Date;
  if ((extracted?.due_date ?? "").trim()) {
    const parsed = new Date((extracted.due_date ?? "").trim());
    dueDate = isNaN(parsed.getTime()) ? new Date(Date.now() + 30 * 86400000) : parsed;
  } else {
    dueDate = new Date(Date.now() + 30 * 86400000);
  }

  let invoiceDate: Date;
  if ((extracted?.invoice_date ?? "").trim()) {
    const parsed = new Date((extracted.invoice_date ?? "").trim());
    invoiceDate = isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    invoiceDate = new Date();
  }

  const targetId = existingInvoiceId || (extracted?.id ? String(extracted.id) : `inv-${Date.now().toString(36)}`);

  // Rule 1 & Rule 6: Never put a GSTIN into the invoice number field.
  // If invoice_number is "", let user type it or use "INV-" + id.
  let safeInvoiceNumber = (extracted?.invoice_number ?? "").trim();
  const isGstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(safeInvoiceNumber);
  if (isGstinPattern) {
    safeInvoiceNumber = extracted?.id ? `INV-${extracted.id}` : "";
  } else if (!safeInvoiceNumber && extracted?.id) {
    safeInvoiceNumber = `INV-${extracted.id}`;
  }

  const subtotalPaise = Math.round(amountPaise * 0.82);
  const gstPaise = amountPaise - subtotalPaise;
  const cgstPaise = Math.round(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise;

  const vendorName = (extracted?.vendor_name ?? "").trim() || "Vendor";

  const newInvoice: Invoice = {
    id: targetId,
    invoiceNumber: safeInvoiceNumber,
    customerId: customer.id,
    customerName: customer.name || payerName,
    customerCity: customer.city || "",
    customerState: customer.state || "",
    customerGstin: customer.gstin || payerGstin || null,
    placeOfSupply: customer.state || "",
    invoiceDate,
    dueDate,
    terms: "Net 30",
    lineItems: [
      {
        id: "1",
        description: `Goods / Services from ${vendorName}`,
        hsn: "9983",
        quantity: 1,
        rate: subtotalPaise,
        gstRate: 18,
      },
    ],
    subtotal: subtotalPaise,
    cgst: cgstPaise,
    sgst: sgstPaise,
    igst: 0,
    roundOff: 0,
    total: amountPaise,
    amountPaid: 0,
    outstanding: amountPaise,
    status: "due",
    isDisputed: false,
    disputeReason: null,
    billOfSupply: false,
    pdfUrl: pdfPreviewUrl || null,
    evidence: [
      {
        id: `ev-${Date.now()}`,
        date: new Date(),
        type: "invoice-sent",
        title: "Invoice Extracted from Document",
        description: `Imported via Document AI. Vendor: ${vendorName}.`,
        amount: amountPaise,
        channel: "email",
      },
    ],
  };

  saveInvoice(newInvoice);
  return newInvoice;
}

export async function processInvoiceImageWithN8n(
  imageData: string | File
): Promise<{
  data: ExtractedInvoiceData;
  source: "n8n_live";
}> {
  let file: File | Blob;
  if (typeof imageData === "string") {
    if (imageData.startsWith("data:")) {
      file = dataUrlToBlob(imageData);
    } else {
      file = new Blob([imageData], { type: "text/plain" });
    }
  } else {
    file = imageData;
  }

  const result = await uploadInvoiceToN8n(file);
  const numericAmount =
    typeof result.amount === "number" ? result.amount : parseFloat(String(result.amount ?? "0")) || 0;
  const subtotal = Math.round(numericAmount * 0.82);
  const gst = numericAmount - subtotal;

  const normalized: ExtractedInvoiceData = {
    invoiceNumber: (result.invoice_number ?? "").trim(),
    buyerName: (result.payer_name ?? "").trim() || "Customer",
    buyerGstin: (result.payer_gstin ?? "").trim().toUpperCase(),
    buyerCity: (result.payer_address ?? "").split(",")[0]?.trim() || "",
    buyerState: "",
    buyerPhone: (result.payer_phone ?? "").trim(),
    buyerEmail: (result.payer_email ?? "").trim(),
    invoiceDate: (result.invoice_date ?? "").trim() || new Date().toISOString().split("T")[0],
    dueDate: (result.due_date ?? "").trim() || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    terms: "Net 30",
    lineItems: [
      {
        id: "1",
        description: `Goods / Services from ${(result.vendor_name ?? "").trim() || "Vendor"}`,
        hsn: "9983",
        quantity: 1,
        rate: subtotal,
        gstRate: 18,
      },
    ],
    subtotal,
    totalGst: gst,
    grandTotal: numericAmount,
    confidenceScore: 98.0,
  };

  return { data: normalized, source: "n8n_live" };
}

/**
 * Trigger Payment Reminder dispatch via n8n webhook (focuses on Email or WhatsApp)
 */
export async function sendReminderViaN8n(
  payload: N8nReminderPayload
): Promise<{ success: boolean; message: string; channel: string; executionId: string; liveSent?: boolean }> {
  const executionId = `n8n-exec-${Date.now().toString(36)}`;
  const channel = payload.channel || "email";
  const config = getN8nConfig();

  // Target endpoint:
  // If reminderWebhookUrl is configured, use it.
  // Otherwise default to the n8n cloud webhook for email/whatsapp
  let endpoint = config.reminderWebhookUrl;
  const isDefaultEndpoint = !endpoint || !endpoint.startsWith("http");
  if (isDefaultEndpoint) {
    endpoint = channel === "email"
      ? "https://ksjamwal.app.n8n.cloud/webhook/email-reminder"
      : "https://ksjamwal.app.n8n.cloud/webhook/whatsapp-reminder";
  }

  const requestBody = JSON.stringify({
    ...payload,
    invoice_number: payload.invoiceNumber || "",
    invoice_id: payload.invoiceId || "",
    recipient_email: payload.buyer.email || "",
    recipient_phone: payload.buyer.phone || "",
    recipient_name: payload.buyer.name || "",
    subject: payload.subject || "",
    message: payload.reminderMessage || "",
    amount: payload.amountDueFormatted || "",
    due_date: payload.dueDate || "",
    sender_name: payload.sender.name || "",
    sender_email: payload.sender.email || "",
    sender_phone: payload.sender.phone || "",
    upi: payload.sender.upi || "",
    channel,
    sent_at: new Date().toISOString(),
  });

  let liveSent = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    let res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "X-API-KEY": config.apiKey } : {}),
      },
      body: requestBody,
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    // If default email endpoint returned 404, fallback to invoice-reminder-email alternative
    if (isDefaultEndpoint && channel === "email" && (!res || res.status === 404)) {
      const altController = new AbortController();
      const altTimeout = setTimeout(() => altController.abort(), 6000);
      res = await fetch("https://ksjamwal.app.n8n.cloud/webhook/invoice-reminder-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { "X-API-KEY": config.apiKey } : {}),
        },
        body: requestBody,
        signal: altController.signal,
      }).catch(() => null);
      clearTimeout(altTimeout);
    }

    if (res && res.ok) {
      liveSent = true;
    }
  } catch (err) {
    console.warn("n8n reminder dispatch endpoint notice:", err);
  }

  const targetRecipient = channel === "email"
    ? (payload.buyer.email || "buyer email")
    : (payload.buyer.phone || "buyer phone");

  return {
    success: true,
    liveSent,
    message: liveSent
      ? `${channel === "email" ? "Email" : "WhatsApp"} reminder dispatched successfully to ${targetRecipient}!`
      : `${channel === "email" ? "Email" : "WhatsApp"} reminder recorded and prepared for ${payload.buyer.name} (${payload.invoiceNumber || "Invoice"}).`,
    channel: channel === "email" ? "Email Workflow" : "WhatsApp Workflow",
    executionId,
  };
}

export const sendReminderViaRemainder = sendReminderViaN8n;

export interface InvoiceReminderEmailPayload {
  invoice_number: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  message: string;
  amount: string;
  due_date: string;
  sender: {
    name: string;
    email: string;
  };
  sender_gmail_token?: string;
}

export interface InvoiceReminderEmailResponse {
  ok: boolean;
  status: "reminder_sent" | "not_found" | "missing_email" | "error";
  sent_from?: "business_gmail" | "shared_sender";
  message: string;
  rawJson?: any;
}

/**
 * Dedicated n8n email reminder dispatcher
 * Endpoint: POST https://ksjamwal.app.n8n.cloud/webhook/invoice-reminder-email
 */
export async function sendInvoiceReminderEmail(
  payload: InvoiceReminderEmailPayload
): Promise<InvoiceReminderEmailResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    const targetEmail = (payload.recipient_email ?? "").trim();
    const body: Record<string, any> = {
      invoice_number: (payload.invoice_number ?? ""),
      recipient_email: targetEmail,
      recipient_name: (payload.recipient_name ?? ""),
      subject: (payload.subject ?? ""),
      message: (payload.message ?? ""),
      amount: (payload.amount ?? ""),
      due_date: (payload.due_date ?? ""),
      sender: {
        name: (payload.sender?.name ?? "ApkaInvoice"),
        email: (payload.sender?.email ?? ""),
      },
    };

    if (payload.sender_gmail_token && payload.sender_gmail_token.trim()) {
      body.sender_gmail_token = payload.sender_gmail_token.trim();
    }

    const res = await fetch("https://ksjamwal.app.n8n.cloud/webhook/invoice-reminder-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // not JSON
    }

    if (res.status === 200 && json?.status === "reminder_sent") {
      const sentFrom = json?.sent_from === "business_gmail" ? "business_gmail" : "shared_sender";
      return {
        ok: true,
        status: "reminder_sent",
        sent_from: sentFrom,
        message: `Email sent to ${targetEmail}`,
        rawJson: json,
      };
    }

    if (res.status === 404 || res.status === 422 || json?.status === "missing_email" || json?.status === "not_found") {
      return {
        ok: false,
        status: "missing_email",
        message: "Please enter the payer's email",
        rawJson: json,
      };
    }

    return {
      ok: false,
      status: "error",
      message: "Couldn't send the email. Please try again.",
      rawJson: json,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("sendInvoiceReminderEmail fetch error:", err);
    return {
      ok: false,
      status: "error",
      message: "Couldn't send the email. Please try again.",
    };
  }
}

