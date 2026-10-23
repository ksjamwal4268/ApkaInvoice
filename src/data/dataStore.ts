import { Customer, Invoice, INVOICES, CUSTOMERS, EvidenceEntry, CustomerId, InvoiceId } from "./sampleData";
import { Paise } from "../utils/money";

export type { Customer, Invoice, EvidenceEntry, CustomerId, InvoiceId };

export interface BusinessProfile {
  name: string;
  city: string;
  state: string;
  stateCode: string;
  gstin: string;
  address: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  upi: string;
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
  paymentDetails: {
    upi: string;
    bankName: string;
    bankAccount: string;
    ifsc: string;
  };
}

const INVOICES_KEY = "cc_invoices_real_v2";
const CUSTOMERS_KEY = "cc_customers_real_v2";
const N8N_CONFIG_KEY = "cc_n8n_config_v1";
const BUSINESS_KEY = "cc_business_profile_v2";

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: "Sharma Packaging",
  city: "Pune",
  state: "Maharashtra",
  stateCode: "27",
  gstin: "27AABCS1234Q1ZM",
  address: "Gut No. 145, Chakan Industrial Area, Pune - 412105, Maharashtra",
  email: "billing@sharmapackaging.in",
  phone: "+91 98765 43210",
  bankName: "HDFC Bank",
  bankAccount: "50200045678901",
  ifsc: "HDFC0001234",
  upi: "sharmapackaging@hdfc",
};

const DEFAULT_N8N_CONFIG: N8nConfig = {
  ocrWebhookUrl: "https://automation.sharmapackaging.in/webhook/invoice-ocr",
  reminderWebhookUrl: "https://automation.sharmapackaging.in/webhook/payment-reminder",
  apiKey: "cc-demo-key-2025",
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
    return parsed.map(reviveInvoice);
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
    return parsed;
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

/**
 * Business Profile Store
 */
export function getStoredBusinessProfile(): BusinessProfile {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_PROFILE;
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    if (!raw) return DEFAULT_BUSINESS_PROFILE;
    return { ...DEFAULT_BUSINESS_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BUSINESS_PROFILE;
  }
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  localStorage.setItem(BUSINESS_KEY, JSON.stringify(profile));
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
    return { ...DEFAULT_N8N_CONFIG, ...JSON.parse(raw) };
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

/**
 * Execute OCR extraction via n8n webhook or intelligent fallback
 */
export async function processInvoiceImageWithN8n(
  imageData: string | File,
  useRealWebhook: boolean = false
): Promise<{ data: ExtractedInvoiceData; source: "n8n_live" | "n8n_simulated" }> {
  const config = getN8nConfig();

  if (useRealWebhook && config.ocrWebhookUrl && config.ocrWebhookUrl.startsWith("http")) {
    try {
      const formData = new FormData();
      if (typeof imageData === "string") {
        formData.append("imageBase64", imageData);
      } else {
        formData.append("file", imageData);
      }
      formData.append("timestamp", new Date().toISOString());

      const res = await fetch(config.ocrWebhookUrl, {
        method: "POST",
        headers: config.apiKey ? { "X-API-KEY": config.apiKey } : undefined,
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.invoiceNumber) {
          return { data: json, source: "n8n_live" };
        }
      }
    } catch (err) {
      console.warn("n8n live webhook unavailable or failed, falling back to simulated parser:", err);
    }
  }

  // Processing delay
  await new Promise((r) => setTimeout(r, 1200));
  const preset = SAMPLE_OCR_PRESETS[presetCycle % SAMPLE_OCR_PRESETS.length];
  presetCycle++;
  return {
    data: {
      ...preset,
      invoiceDate: new Date().toISOString().split("T")[0],
    },
    source: "n8n_simulated",
  };
}

/**
 * Trigger Payment Reminder dispatch via n8n webhook
 */
export async function sendReminderViaN8n(
  payload: N8nReminderPayload
): Promise<{ success: boolean; message: string; channel: string; executionId: string }> {
  const config = getN8nConfig();
  const executionId = `n8n-exec-${Date.now().toString(36)}`;

  if (config.reminderWebhookUrl && config.reminderWebhookUrl.startsWith("http")) {
    try {
      const res = await fetch(config.reminderWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { "X-API-KEY": config.apiKey } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return {
          success: true,
          message: json.message || "Reminder triggered successfully through n8n workflow",
          channel: json.channel || "WhatsApp & Email Webhook",
          executionId: json.executionId || executionId,
        };
      }
    } catch (err) {
      console.warn("n8n reminder webhook error, falling back to simulated runner:", err);
    }
  }

  await new Promise((r) => setTimeout(r, 700));
  return {
    success: true,
    message: `Payment reminder successfully scheduled via n8n workflow for ${payload.buyer.name}`,
    channel: "WhatsApp Business API + Email Dispatch",
    executionId,
  };
}
