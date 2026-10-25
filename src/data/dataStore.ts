import { Customer, Invoice, INVOICES, CUSTOMERS, EvidenceEntry, CustomerId, InvoiceId } from "./sampleData";
import { Paise } from "../utils/money";
import { db } from "../firebaseApp";
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from "firebase/firestore";
import { uploadInvoice, sendEmailReminder, sendWhatsAppReminder } from "../api/n8n.js";

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

export function getActiveUserId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = localStorage.getItem("cc-google-user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {}
  return "guest";
}

export function getInvoicesKey(): string {
  const uid = getActiveUserId();
  return uid === "guest" ? "cc_invoices_real_v2" : `cc_invoices_${uid}`;
}

export function getCustomersKey(): string {
  const uid = getActiveUserId();
  return uid === "guest" ? "cc_customers_real_v2" : `cc_customers_${uid}`;
}

export function getBusinessKey(): string {
  const uid = getActiveUserId();
  return uid === "guest" ? "cc_business_profile_v2" : `cc_business_profile_${uid}`;
}

export function getForecastKey(): string {
  const uid = getActiveUserId();
  return uid === "guest" ? "cc_forecast_settings_v2" : `cc_forecast_settings_${uid}`;
}

const N8N_CONFIG_KEY = "cc_n8n_config_v1";

export function cleanForFirestore(obj: any): any {
  if (obj === undefined) return "";
  if (obj === null) return "";
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "object") {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = cleanForFirestore(v === undefined ? "" : v);
    }
    return res;
  }
  return obj;
}

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
  ocrWebhookUrl: "",
  reminderWebhookUrl: "",
  apiKey: "",
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

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Cloud query timeout (using local cache)")), ms)
    ),
  ]);
}

/**
 * Cross-device Cloud Sync: Pulls user's cloud profile, invoices, and customers from Firestore.
 * Ensures the exact same data shows on both devices for the same account,
 * and different accounts see their own data without hanging if offline or blocked.
 */
export async function syncUserDataFromCloud(uid: string): Promise<void> {
  if (!uid || uid === "guest") return;

  try {
    // 1. Sync Business Profile (ensuring phone and email are preserved for returning users)
    const profileRef = doc(db, "users", uid, "profile", "business");
    const pSnap = await withTimeout(getDoc(profileRef), 8000).catch(() => null);
    const cloudProfile = pSnap && pSnap.exists() ? (pSnap.data() as BusinessProfile) : null;

    // Check root user document for saved phone/email/businessName
    const userRef = doc(db, "users", uid);
    const uSnap = await withTimeout(getDoc(userRef), 8000).catch(() => null);
    const uData = uSnap && uSnap.exists() ? uSnap.data() : null;

    const localProf = getStoredBusinessProfile();
    const effectivePhone = cloudProfile?.phone || uData?.phone || localProf.phone || "";
    const effectiveEmail = cloudProfile?.email || uData?.email || localProf.email || "";
    const effectiveName =
      (cloudProfile?.name && cloudProfile.name !== "OG Enterprises" ? cloudProfile.name : "") ||
      uData?.businessName ||
      localProf.name ||
      "";
    const effectiveContact =
      cloudProfile?.contactPerson || uData?.name || localProf.contactPerson || "";

    const mergedProfile: BusinessProfile = {
      ...localProf,
      ...(cloudProfile || {}),
      phone: effectivePhone,
      email: effectiveEmail,
      name: effectiveName,
      contactPerson: effectiveContact,
      isOnboarded: Boolean(
        cloudProfile?.isOnboarded ||
        (effectivePhone && effectiveEmail)
      ),
    };

    localStorage.setItem(`cc_business_profile_${uid}`, JSON.stringify(mergedProfile));

    if (effectivePhone || effectiveEmail || effectiveName) {
      await setDoc(profileRef, cleanForFirestore(mergedProfile), { merge: true }).catch(() => {});
      await setDoc(
        userRef,
        {
          phone: effectivePhone,
          email: effectiveEmail,
          businessName: effectiveName,
          name: effectiveContact,
        },
        { merge: true }
      ).catch(() => {});
    }

    // 2. Sync Invoices from Cloud (merge cloudList and localInvs so data from all devices is preserved)
    const invRef = doc(db, "users", uid, "data", "invoices");
    const invSnap = await withTimeout(getDoc(invRef), 8000).catch(() => null);
    let cloudList: Invoice[] = [];
    if (invSnap && invSnap.exists()) {
      const invData = invSnap.data();
      if (Array.isArray(invData?.items)) {
        cloudList = invData.items.map(reviveInvoice);
      }
    }

    try {
      const colRef = collection(db, "users", uid, "invoices");
      const colSnap = await withTimeout(getDocs(colRef), 6000);
      if (!colSnap.empty) {
        colSnap.forEach((d) => {
          const item = d.data() as any;
          if (item) {
            const docId = item.id || d.id;
            const exists = cloudList.some(
              (ci) => ci.id === docId || (item.invoiceNumber && ci.invoiceNumber === item.invoiceNumber)
            );
            if (!exists) {
              cloudList.unshift(reviveInvoice({ id: docId, ...item }));
            }
          }
        });
      }
    } catch (e) {
      // ignore
    }

    const localInvs = getStoredInvoices();
    const mergedInvs = [...cloudList];
    localInvs.forEach((li) => {
      const exists = mergedInvs.some(
        (ci) => ci.id === li.id || (li.invoiceNumber && ci.invoiceNumber === li.invoiceNumber)
      );
      if (!exists) {
        mergedInvs.push(li);
      }
    });

    if (mergedInvs.length > 0) {
      localStorage.setItem(`cc_invoices_${uid}`, JSON.stringify(mergedInvs));
      await setDoc(invRef, cleanForFirestore({ items: mergedInvs }), { merge: true }).catch(() => {});
    }

    // 3. Sync Customers
    const custRef = doc(db, "users", uid, "data", "customers");
    const custSnap = await withTimeout(getDoc(custRef), 8000).catch(() => null);
    let custCloudList: Customer[] = [];
    if (custSnap && custSnap.exists()) {
      const custData = custSnap.data();
      if (Array.isArray(custData?.items)) {
        custCloudList = custData.items;
      }
    }

    try {
      const custColRef = collection(db, "users", uid, "customers");
      const custColSnap = await withTimeout(getDocs(custColRef), 6000);
      if (!custColSnap.empty) {
        custColSnap.forEach((d) => {
          const item = d.data() as any;
          if (item) {
            const docId = item.id || d.id;
            const exists = custCloudList.some(
              (c) =>
                c.id === docId ||
                (item.name && (c.name ?? "").toLowerCase() === (item.name ?? "").toLowerCase())
            );
            if (!exists) {
              custCloudList.unshift({ id: docId, ...item });
            }
          }
        });
      }
    } catch (e) {
      // ignore
    }

    const localCusts = getStoredCustomers();
    const mergedCusts = [...custCloudList];
    localCusts.forEach((lc) => {
      const exists = mergedCusts.some(
        (cc) =>
          cc.id === lc.id ||
          (lc.name && (cc.name ?? "").toLowerCase() === (lc.name ?? "").toLowerCase())
      );
      if (!exists) {
        mergedCusts.push(lc);
      }
    });

    if (mergedCusts.length > 0) {
      localStorage.setItem(`cc_customers_${uid}`, JSON.stringify(mergedCusts));
      await setDoc(custRef, cleanForFirestore({ items: mergedCusts }), { merge: true }).catch(() => {});
    }

    dispatchStoreChange();
  } catch (err) {
    console.warn("Cloud sync notice (operating in local fallback):", err);
  }
}

/**
 * Real Data Invoices: Scoped to active account. Starts with 0 fake data.
 */
export function getStoredInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getInvoicesKey();
    let raw = localStorage.getItem(key);
    const uid = getActiveUserId();

    // Migrate from legacy un-scoped key if first time logging in
    if (!raw && uid !== "guest") {
      const legacyRaw = localStorage.getItem("cc_invoices_real_v2");
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(key, legacyRaw);
      }
    }

    if (!raw) {
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Only filter out legacy hardcoded sample invoices (inv-001 through inv-010) — NEVER clear or overwrite real user invoices
    const cleanInvoices = parsed.filter(
      (inv: any) =>
        !/^inv-00[1-9]$|^inv-010$/.test(inv?.id ?? "") &&
        !inv?.invoiceNumber?.startsWith("SP/24-25/")
    );
    if (cleanInvoices.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(cleanInvoices));
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
  const key = getInvoicesKey();
  localStorage.setItem(key, JSON.stringify(invs));
  dispatchStoreChange();

  const uid = getActiveUserId();
  if (uid && uid !== "guest") {
    try {
      // Rule: Use addDoc to save invoice into your own database. Replace undefined with "" before saving.
      const cleaned = cleanForFirestore(invoice);
      const invoicesCol = collection(db, "users", uid, "invoices");
      addDoc(invoicesCol, cleaned).catch((err) =>
        console.warn("Cloud invoices addDoc notice:", err)
      );

      // Keep aggregate array updated so multi-device sync hydrates instantly
      setDoc(
        doc(db, "users", uid, "data", "invoices"),
        cleanForFirestore({ items: invs }),
        { merge: true }
      ).catch((err) => console.warn("Cloud invoices sync warning:", err));
    } catch (e) {
      console.warn("Cloud invoices sync warning:", e);
    }
  }
}

export function deleteInvoice(id: InvoiceId): void {
  const invs = getStoredInvoices();
  const filtered = invs.filter((i) => i.id !== id);
  const key = getInvoicesKey();
  localStorage.setItem(key, JSON.stringify(filtered));
  dispatchStoreChange();

  const uid = getActiveUserId();
  if (uid && uid !== "guest") {
    try {
      setDoc(doc(db, "users", uid, "data", "invoices"), cleanForFirestore({ items: filtered }), { merge: true }).catch((err) =>
        console.warn("Cloud invoices sync warning:", err)
      );
    } catch (e) {
      console.warn("Cloud invoices sync warning:", e);
    }
  }
}

export function addInvoiceEvidence(invoiceId: InvoiceId, entry: EvidenceEntry): void {
  const invs = getStoredInvoices();
  const inv = invs.find((i) => i.id === invoiceId);
  if (inv) {
    if (!inv.evidence) inv.evidence = [];
    inv.evidence.unshift(entry);
    const key = getInvoicesKey();
    localStorage.setItem(key, JSON.stringify(invs));
    dispatchStoreChange();

    const uid = getActiveUserId();
    if (uid && uid !== "guest") {
      try {
        setDoc(doc(db, "users", uid, "data", "invoices"), cleanForFirestore({ items: invs }), { merge: true }).catch(() => {});
      } catch {}
    }
  }
}

/**
 * Real Data Customers: Scoped to active account. Starts with 0 fake buyers.
 */
export function getStoredCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getCustomersKey();
    let raw = localStorage.getItem(key);
    const uid = getActiveUserId();

    if (!raw && uid !== "guest") {
      const legacyRaw = localStorage.getItem("cc_customers_real_v2");
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(key, legacyRaw);
      }
    }

    if (!raw) {
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleanCustomers = parsed.filter(
      (c: any) =>
        !/^cust-[1-9]$|^cust-10$/.test(c?.id ?? "") &&
        c?.name !== "Gupta Traders" &&
        c?.name !== "Shree Ganesh Textiles"
    );
    if (cleanCustomers.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(cleanCustomers));
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
  const key = getCustomersKey();
  localStorage.setItem(key, JSON.stringify(custs));
  dispatchStoreChange();

  const uid = getActiveUserId();
  if (uid && uid !== "guest") {
    try {
      const cleaned = cleanForFirestore(customer);
      const custCol = collection(db, "users", uid, "customers");
      addDoc(custCol, cleaned).catch(() => {});
      setDoc(doc(db, "users", uid, "data", "customers"), cleanForFirestore({ items: custs }), { merge: true }).catch((err) =>
        console.warn("Cloud customers sync warning:", err)
      );
    } catch (e) {
      console.warn("Cloud customers sync warning:", e);
    }
  }
}

export function deleteCustomer(id: CustomerId): void {
  const custs = getStoredCustomers();
  const filtered = custs.filter((c) => c.id !== id);
  const key = getCustomersKey();
  localStorage.setItem(key, JSON.stringify(filtered));
  dispatchStoreChange();

  const uid = getActiveUserId();
  if (uid && uid !== "guest") {
    try {
      setDoc(doc(db, "users", uid, "data", "customers"), cleanForFirestore({ items: filtered }), { merge: true }).catch((err) =>
        console.warn("Cloud customers sync warning:", err)
      );
    } catch (e) {
      console.warn("Cloud customers sync warning:", e);
    }
  }
}

/**
 * Business Profile Store: Scoped to active account and synced to cloud.
 */
export function getStoredBusinessProfile(): BusinessProfile {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_PROFILE;
  try {
    const key = getBusinessKey();
    let raw = localStorage.getItem(key);
    const uid = getActiveUserId();

    if (!raw && uid !== "guest") {
      const legacyRaw = localStorage.getItem("cc_business_profile_v2");
      if (legacyRaw) {
        try {
          const legParsed = JSON.parse(legacyRaw);
          if (legParsed && legParsed.name !== "OG Enterprises" && legParsed.name !== "Sharma Packaging") {
            raw = legacyRaw;
            localStorage.setItem(key, legacyRaw);
          }
        } catch {}
      }
    }

    if (!raw) return DEFAULT_BUSINESS_PROFILE;
    const parsed = JSON.parse(raw);
    // Discard legacy demo / fake Sharma Packaging or fake auto-generated OG Enterprises
    if (
      parsed.name === "Sharma Packaging" ||
      parsed.email === "billing@sharmapackaging.in" ||
      parsed.upi === "sharmapackaging@hdfc"
    ) {
      localStorage.removeItem(key);
      return DEFAULT_BUSINESS_PROFILE;
    }
    if (parsed.name === "OG Enterprises") {
      parsed.name = "";
      localStorage.setItem(key, JSON.stringify(parsed));
    }
    return { ...DEFAULT_BUSINESS_PROFILE, ...parsed };
  } catch {
    return DEFAULT_BUSINESS_PROFILE;
  }
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  const key = getBusinessKey();
  localStorage.setItem(key, JSON.stringify(profile));
  dispatchStoreChange();

  const uid = getActiveUserId();
  if (uid && uid !== "guest") {
    try {
      const cleaned = cleanForFirestore(profile);
      setDoc(doc(db, "users", uid, "profile", "business"), cleaned, { merge: true }).catch((err) =>
        console.warn("Cloud profile sync warning:", err)
      );
      // Also persist at user root level so email and phone are permanently attached to this Google UID
      setDoc(doc(db, "users", uid), {
        email: profile.email || "",
        phone: profile.phone || "",
        businessName: profile.name || "",
        contactPerson: profile.contactPerson || "",
        isOnboarded: Boolean(profile.phone && profile.email),
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn("Cloud profile sync warning:", e);
    }
  }
}

export interface ForecastSettings {
  startingBalance: number; // in INR
  monthlyRent: number; // in INR
  monthlyPayroll: number; // in INR
  weeklyVendors: number; // in INR
}

export const DEFAULT_FORECAST_SETTINGS: ForecastSettings = {
  startingBalance: 0,
  monthlyRent: 0,
  monthlyPayroll: 0,
  weeklyVendors: 0,
};

export function getStoredForecastSettings(): ForecastSettings {
  if (typeof window === "undefined") return DEFAULT_FORECAST_SETTINGS;
  try {
    const raw = localStorage.getItem(getForecastKey());
    if (!raw) return DEFAULT_FORECAST_SETTINGS;
    return { ...DEFAULT_FORECAST_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FORECAST_SETTINGS;
  }
}

export function saveForecastSettings(settings: ForecastSettings): void {
  localStorage.setItem(getForecastKey(), JSON.stringify(settings));
  dispatchStoreChange();
}

/**
 * Wipe all fake / demo data completely so user starts fresh with real data only
 */
export function clearAllData(): void {
  localStorage.setItem(getInvoicesKey(), JSON.stringify([]));
  localStorage.setItem(getCustomersKey(), JSON.stringify([]));
  // Clean up legacy keys
  localStorage.removeItem("cc_invoices_store_v1");
  localStorage.removeItem("cc_customers_store_v1");
  dispatchStoreChange();
}

/**
 * Load sample data if ever explicitly requested
 */
export function loadSampleData(): void {
  localStorage.setItem(getInvoicesKey(), JSON.stringify(INVOICES));
  localStorage.setItem(getCustomersKey(), JSON.stringify(CUSTOMERS));
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
  place_of_supply?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  raw_text?: string | null;
}

/**
 * Upload photo or PDF invoice to Cloud AI webhook via src/api/n8n.js
 */
export async function uploadInvoiceToN8n(
  file: File | Blob
): Promise<N8nUploadedInvoice> {
  const res = await uploadInvoice(file);
  if (!res.ok || !res.fields) {
    throw new Error(res.error || "Could not read this invoice. Please upload a clear photo or PDF.");
  }
  const f = res.fields;
  return {
    id: f.n8nId,
    status: "ready",
    invoice_number: f.invoiceNumber,
    invoice_date: f.invoiceDate,
    due_date: f.dueDate,
    vendor_name: f.vendorName,
    vendor_gstin: f.vendorGstin,
    payer_name: f.buyerName,
    payer_gstin: f.buyerGstin,
    payer_address: f.buyerAddress,
    payer_email: f.buyerEmail,
    payer_phone: f.buyerPhone,
    place_of_supply: f.placeOfSupply,
    amount: f.amount,
    currency: f.currency,
  };
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
    if (payerEmail && customer.email !== payerEmail) {
      customer.email = payerEmail;
      updatedCust = true;
    }
    if (payerPhone && customer.phone !== payerPhone) {
      customer.phone = payerPhone;
      updatedCust = true;
    }
    if (payerGstin && customer.gstin !== payerGstin) {
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
    placeOfSupply: (extracted?.place_of_supply ?? "").trim() || customer.state || "",
    payerName: customer.name || payerName,
    payerEmail: payerEmail || customer.email || "",
    payerPhone: payerPhone || customer.phone || "",
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
 * Trigger Payment Reminder dispatch via src/api/n8n.js
 */
export async function sendReminderViaN8n(
  payload: N8nReminderPayload
): Promise<{ success: boolean; message: string; channel: string; executionId: string; liveSent?: boolean; fallbackLink?: string }> {
  const executionId = `n8n-exec-${Date.now().toString(36)}`;
  const channel = payload.channel || "email";

  if (channel === "email") {
    const res = await sendEmailReminder({
      invoiceNumber: payload.invoiceNumber || "",
      email: payload.buyer.email || "",
      buyerName: payload.buyer.name || "",
      amountText: payload.amountDueFormatted || "",
      dueDate: payload.dueDate || "",
      senderName: payload.sender?.name || "ApkaInvoice",
      senderEmail: payload.sender?.email || "",
    });
    return {
      success: res.ok,
      liveSent: res.ok,
      message: res.message || res.error || (res.ok ? "Email reminder sent" : "Failed to send email reminder"),
      channel: "Email Workflow",
      executionId,
    };
  } else {
    const res = await sendWhatsAppReminder({
      invoiceNumber: payload.invoiceNumber || "",
      phone: payload.buyer.phone || "",
      buyerName: payload.buyer.name || "",
      amountText: payload.amountDueFormatted || "",
      dueDate: payload.dueDate || "",
      senderName: payload.sender?.name || "ApkaInvoice",
    });
    return {
      success: res.ok,
      liveSent: res.ok,
      fallbackLink: res.fallbackLink,
      message: res.message || res.error || "WhatsApp reminder prepared",
      channel: "WhatsApp Workflow",
      executionId,
    };
  }
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
 * Dedicated email reminder dispatcher via src/api/n8n.js
 */
export async function sendInvoiceReminderEmail(
  payload: InvoiceReminderEmailPayload
): Promise<InvoiceReminderEmailResponse> {
  const res = await sendEmailReminder({
    invoiceNumber: (payload.invoice_number ?? ""),
    email: (payload.recipient_email ?? "").trim(),
    buyerName: (payload.recipient_name ?? ""),
    amountText: (payload.amount ?? ""),
    dueDate: (payload.due_date ?? ""),
    senderName: (payload.sender?.name ?? "ApkaInvoice"),
    senderEmail: (payload.sender?.email ?? ""),
    gmailToken: payload.sender_gmail_token,
  });

  if (res.ok) {
    return {
      ok: true,
      status: "reminder_sent",
      sent_from: payload.sender_gmail_token ? "business_gmail" : "shared_sender",
      message: res.message || `Email sent to ${payload.recipient_email}`,
    };
  }

  if (res.needEmail) {
    return {
      ok: false,
      status: "missing_email",
      message: res.error || "Please enter the customer's email.",
    };
  }

  return {
    ok: false,
    status: "error",
    message: res.error || "Email could not be sent. Please try again.",
  };
}

