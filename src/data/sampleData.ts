/**
 * Sample data for ApkaInvoice - Sharma Packaging, Pune.
 * All data is demo data for hackathon purposes only.
 * Money stored as whole paise integers.
 */

import { Paise, toPaise } from "../utils/money";
import { PaymentTerms } from "../utils/date";

export const BUSINESS = {
  name: "",
  city: "",
  state: "",
  stateCode: "",
  gstin: "",
  address: "",
  email: "",
  phone: "",
  bankName: "",
  bankAccount: "",
  ifsc: "",
  upi: "",
} as const;

export type CustomerId = string;
export type InvoiceId = string;

export interface Customer {
  id: CustomerId;
  name: string;
  city: string;
  state: string;
  address?: string;
  gstin: string | null;
  pan: string | null;
  email: string;
  phone: string;
  isChronicallyLate: boolean;
  grade: "A" | "B" | "C";
  paymentCategory?: "green" | "yellow" | "red";
  gradeReasons: string[];
}

export function getCustomerCategory(c: { paymentCategory?: "green" | "yellow" | "red"; grade?: string }): "green" | "yellow" | "red" {
  if (c.paymentCategory === "green" || c.paymentCategory === "yellow" || c.paymentCategory === "red") {
    return c.paymentCategory;
  }
  if (c.grade === "A") return "green";
  if (c.grade === "C") return "red";
  return "yellow";
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: Paise;
  gstRate: number;
}

export interface Invoice {
  id: InvoiceId;
  invoiceNumber: string;
  customerId: CustomerId;
  customerName: string;
  customerCity: string;
  customerState: string;
  customerGstin: string | null;
  placeOfSupply: string;
  invoiceDate: Date;
  dueDate: Date;
  terms: PaymentTerms;
  lineItems: InvoiceLineItem[];
  subtotal: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  roundOff: Paise;
  total: Paise;
  amountPaid: Paise;
  outstanding: Paise;
  status: "ready" | "paid" | "overdue" | "part-paid" | "due" | "disputed";
  isDisputed: boolean;
  disputeReason: string | null;
  evidence: EvidenceEntry[];
  billOfSupply: boolean;
  pdfUrl: string | null;
  lastReminderSentAt?: string | null;
  currency?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  rawExtraction?: any;
  sellerName?: string;
  sellerGstin?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerAddress?: string;
  sellerCity?: string;
  sellerState?: string;
}

export interface EvidenceEntry {
  id: string;
  date: Date;
  type: "invoice-sent" | "reminder" | "promise" | "payment" | "dispute";
  title: string;
  description: string;
  amount?: Paise;
  channel: "email" | "whatsapp" | "phone" | "in-person" | "letter";
}

export const CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Gupta Traders",
    city: "Mumbai",
    state: "Maharashtra",
    gstin: "27AAAPG1234M1Z5",
    pan: "AAAPG1234M",
    email: "orders@guptatraders.in",
    phone: "+91 98234 56780",
    isChronicallyLate: true,
    grade: "C",
    gradeReasons: [
      "Pays an average of 22 days late",
      "3 invoices overdue in the last 12 months",
      "Often disputes invoices after delivery",
    ],
  },
  {
    id: "cust-2",
    name: "Mehta Enterprises",
    city: "Pune",
    state: "Maharashtra",
    gstin: "27AAXPM5678P1Z2",
    pan: "AAXPM5678P",
    email: "accounts@mehtaenterprises.in",
    phone: "+91 98234 56781",
    isChronicallyLate: false,
    grade: "B",
    gradeReasons: [
      "Usually pays within 5 days of due date",
      "One invoice under dispute (₹85,000)",
      "Good history on other invoices",
    ],
  },
  {
    id: "cust-3",
    name: "Rao & Sons",
    city: "Bangalore",
    state: "Karnataka",
    gstin: "29ABXPR9012K1Z3",
    pan: "ABXPR9012K",
    email: "purchase@raosons.in",
    phone: "+91 98456 78901",
    isChronicallyLate: false,
    grade: "A",
    gradeReasons: [
      "Pays on time or early",
      "No disputes in 12 months",
      "Long-term customer (3 years)",
    ],
  },
  {
    id: "cust-4",
    name: "Delhi Distributors",
    city: "Delhi",
    state: "Delhi",
    gstin: "07AABCD3456F1Z8",
    pan: "AABCD3456F",
    email: "billing@delhidistributors.in",
    phone: "+91 98765 43211",
    isChronicallyLate: false,
    grade: "A",
    gradeReasons: [
      "Pays within 3 days of due date",
      "No disputes",
      "Regular monthly orders",
    ],
  },
  {
    id: "cust-5",
    name: "Chennai Suppliers",
    city: "Chennai",
    state: "Tamil Nadu",
    gstin: "33AAACC7890L1Z4",
    pan: "AAACC7890L",
    email: "accounts@chennaisuppliers.in",
    phone: "+91 98456 78902",
    isChronicallyLate: false,
    grade: "B",
    gradeReasons: [
      "Pays about 7 days late on average",
      "No disputes",
      "Reliable but slow",
    ],
  },
  {
    id: "cust-6",
    name: "Kolkata Traders",
    city: "Kolkata",
    state: "West Bengal",
    gstin: "19AABCK1122R1Z1",
    pan: "AABCK1122R",
    email: "orders@kolkatatraders.in",
    phone: "+91 98345 67890",
    isChronicallyLate: false,
    grade: "A",
    gradeReasons: [
      "Pays on time",
      "No disputes",
      "Good communication",
    ],
  },
];

export function computeLineGst(rate: Paise, qty: number, gstRate: number) {
  const lineAmount = rate * qty;
  const gst = Math.round((lineAmount * gstRate) / 100);
  return { lineAmount, gst };
}

export const INVOICES: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "SP/24-25/001",
    customerId: "cust-3",
    customerName: "Rao & Sons",
    customerCity: "Bangalore",
    customerState: "Karnataka",
    customerGstin: "29ABXPR9012K1Z3",
    placeOfSupply: "Karnataka",
    invoiceDate: new Date("2024-09-01"),
    dueDate: new Date("2024-09-15"),
    terms: "Net 15",
    lineItems: [
      {
        id: "li-1",
        description: "Corrugated boxes - 5kg (100 pcs)",
        hsn: "4819",
        quantity: 100,
        rate: toPaise(85),
        gstRate: 18,
      },
      {
        id: "li-2",
        description: "Corrugated boxes - 10kg (50 pcs)",
        hsn: "4819",
        quantity: 50,
        rate: toPaise(145),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(15750),
    cgst: 0,
    sgst: 0,
    igst: toPaise(2835),
    roundOff: 0,
    total: toPaise(18585),
    amountPaid: toPaise(18585),
    outstanding: 0,
    status: "paid",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-1",
        date: new Date("2024-09-01"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email and WhatsApp",
        amount: toPaise(18585),
        channel: "email",
      },
      {
        id: "ev-2",
        date: new Date("2024-09-12"),
        type: "payment",
        title: "Payment received",
        description: "NEFT credit - full amount",
        amount: toPaise(18585),
        channel: "in-person",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-2",
    invoiceNumber: "SP/24-25/002",
    customerId: "cust-1",
    customerName: "Gupta Traders",
    customerCity: "Mumbai",
    customerState: "Maharashtra",
    customerGstin: "27AAAPG1234M1Z5",
    placeOfSupply: "Maharashtra",
    invoiceDate: new Date("2024-09-05"),
    dueDate: new Date("2024-09-20"),
    terms: "Net 15",
    lineItems: [
      {
        id: "li-3",
        description: "Kraft paper rolls (500 kg)",
        hsn: "4804",
        quantity: 500,
        rate: toPaise(45),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(22500),
    cgst: toPaise(2025),
    sgst: toPaise(2025),
    igst: 0,
    roundOff: 0,
    total: toPaise(26550),
    amountPaid: 0,
    outstanding: toPaise(26550),
    status: "overdue",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-3",
        date: new Date("2024-09-05"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via WhatsApp",
        amount: toPaise(26550),
        channel: "whatsapp",
      },
      {
        id: "ev-4",
        date: new Date("2024-09-22"),
        type: "reminder",
        title: "Friendly reminder sent",
        description: "Payment due 2 days ago",
        channel: "whatsapp",
      },
      {
        id: "ev-5",
        date: new Date("2024-09-28"),
        type: "promise",
        title: "Payment promised",
        description: "Customer promised to pay by Oct 5",
        channel: "phone",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-3",
    invoiceNumber: "SP/24-25/003",
    customerId: "cust-2",
    customerName: "Mehta Enterprises",
    customerCity: "Pune",
    customerState: "Maharashtra",
    customerGstin: "27AAXPM5678P1Z2",
    placeOfSupply: "Maharashtra",
    invoiceDate: new Date("2024-09-10"),
    dueDate: new Date("2024-09-25"),
    terms: "Net 15",
    lineItems: [
      {
        id: "li-4",
        description: "Printed boxes with logo (200 pcs)",
        hsn: "4819",
        quantity: 200,
        rate: toPaise(120),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(24000),
    cgst: toPaise(2160),
    sgst: toPaise(2160),
    igst: 0,
    roundOff: 0,
    total: toPaise(28320),
    amountPaid: 0,
    outstanding: toPaise(28320),
    status: "disputed",
    isDisputed: true,
    disputeReason: "Customer claims wrong quantity delivered",
    evidence: [
      {
        id: "ev-6",
        date: new Date("2024-09-10"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(28320),
        channel: "email",
      },
      {
        id: "ev-7",
        date: new Date("2024-09-28"),
        type: "dispute",
        title: "Dispute raised",
        description: "Customer claims 20 boxes were damaged",
        channel: "email",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-4",
    invoiceNumber: "SP/24-25/004",
    customerId: "cust-4",
    customerName: "Delhi Distributors",
    customerCity: "Delhi",
    customerState: "Delhi",
    customerGstin: "07AABCD3456F1Z8",
    placeOfSupply: "Delhi",
    invoiceDate: new Date("2024-09-12"),
    dueDate: new Date("2024-10-12"),
    terms: "Net 30",
    lineItems: [
      {
        id: "li-5",
        description: "Industrial packaging tape (200 rolls)",
        hsn: "4819",
        quantity: 200,
        rate: toPaise(60),
        gstRate: 18,
      },
      {
        id: "li-6",
        description: "Stretch film (50 kg)",
        hsn: "3923",
        quantity: 50,
        rate: toPaise(180),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(21000),
    cgst: 0,
    sgst: 0,
    igst: toPaise(3780),
    roundOff: 0,
    total: toPaise(24780),
    amountPaid: 0,
    outstanding: toPaise(24780),
    status: "due",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-8",
        date: new Date("2024-09-12"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(24780),
        channel: "email",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-5",
    invoiceNumber: "SP/24-25/005",
    customerId: "cust-5",
    customerName: "Chennai Suppliers",
    customerCity: "Chennai",
    customerState: "Tamil Nadu",
    customerGstin: "33AAACC7890L1Z4",
    placeOfSupply: "Tamil Nadu",
    invoiceDate: new Date("2024-09-15"),
    dueDate: new Date("2024-10-15"),
    terms: "Net 30",
    lineItems: [
      {
        id: "li-7",
        description: "Carton boxes - medium (300 pcs)",
        hsn: "4819",
        quantity: 300,
        rate: toPaise(95),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(28500),
    cgst: 0,
    sgst: 0,
    igst: toPaise(5130),
    roundOff: 0,
    total: toPaise(33630),
    amountPaid: toPaise(10000),
    outstanding: toPaise(23630),
    status: "part-paid",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-9",
        date: new Date("2024-09-15"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(33630),
        channel: "email",
      },
      {
        id: "ev-10",
        date: new Date("2024-10-05"),
        type: "payment",
        title: "Partial payment received",
        description: "NEFT credit ₹10,000",
        amount: toPaise(10000),
        channel: "in-person",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-6",
    invoiceNumber: "SP/24-25/006",
    customerId: "cust-6",
    customerName: "Kolkata Traders",
    customerCity: "Kolkata",
    customerState: "West Bengal",
    customerGstin: "19AABCK1122R1Z1",
    placeOfSupply: "West Bengal",
    invoiceDate: new Date("2024-09-18"),
    dueDate: new Date("2024-10-18"),
    terms: "Net 30",
    lineItems: [
      {
        id: "li-8",
        description: "Poly bags - 1kg (1000 pcs)",
        hsn: "3923",
        quantity: 1000,
        rate: toPaise(12),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(12000),
    cgst: 0,
    sgst: 0,
    igst: toPaise(2160),
    roundOff: 0,
    total: toPaise(14160),
    amountPaid: toPaise(14160),
    outstanding: 0,
    status: "paid",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-11",
        date: new Date("2024-09-18"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via WhatsApp",
        amount: toPaise(14160),
        channel: "whatsapp",
      },
      {
        id: "ev-12",
        date: new Date("2024-10-02"),
        type: "payment",
        title: "Payment received",
        description: "UPI payment",
        amount: toPaise(14160),
        channel: "in-person",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-7",
    invoiceNumber: "SP/24-25/007",
    customerId: "cust-1",
    customerName: "Gupta Traders",
    customerCity: "Mumbai",
    customerState: "Maharashtra",
    customerGstin: "27AAAPG1234M1Z5",
    placeOfSupply: "Maharashtra",
    invoiceDate: new Date("2024-09-20"),
    dueDate: new Date("2024-10-20"),
    terms: "Net 30",
    lineItems: [
      {
        id: "li-9",
        description: "HDPE sacks (500 pcs)",
        hsn: "6305",
        quantity: 500,
        rate: toPaise(25),
        gstRate: 12,
      },
    ],
    subtotal: toPaise(12500),
    cgst: toPaise(750),
    sgst: toPaise(750),
    igst: 0,
    roundOff: 0,
    total: toPaise(14000),
    amountPaid: 0,
    outstanding: toPaise(14000),
    status: "overdue",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-13",
        date: new Date("2024-09-20"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via WhatsApp",
        amount: toPaise(14000),
        channel: "whatsapp",
      },
      {
        id: "ev-14",
        date: new Date("2024-10-25"),
        type: "reminder",
        title: "Firm reminder sent",
        description: "Payment overdue by 5 days",
        channel: "phone",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-8",
    invoiceNumber: "SP/24-25/008",
    customerId: "cust-3",
    customerName: "Rao & Sons",
    customerCity: "Bangalore",
    customerState: "Karnataka",
    customerGstin: "29ABXPR9012K1Z3",
    placeOfSupply: "Karnataka",
    invoiceDate: new Date("2024-09-22"),
    dueDate: new Date("2024-11-06"),
    terms: "Net 45",
    lineItems: [
      {
        id: "li-10",
        description: "Multi-layer boxes (400 pcs)",
        hsn: "4819",
        quantity: 400,
        rate: toPaise(110),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(44000),
    cgst: 0,
    sgst: 0,
    igst: toPaise(7920),
    roundOff: 0,
    total: toPaise(51920),
    amountPaid: 0,
    outstanding: toPaise(51920),
    status: "due",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-15",
        date: new Date("2024-09-22"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(51920),
        channel: "email",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-9",
    invoiceNumber: "SP/24-25/009",
    customerId: "cust-4",
    customerName: "Delhi Distributors",
    customerCity: "Delhi",
    customerState: "Delhi",
    customerGstin: "07AABCD3456F1Z8",
    placeOfSupply: "Delhi",
    invoiceDate: new Date("2024-09-25"),
    dueDate: new Date("2024-10-25"),
    terms: "Net 30",
    lineItems: [
      {
        id: "li-11",
        description: "Gum tape rolls (300 pcs)",
        hsn: "4819",
        quantity: 300,
        rate: toPaise(40),
        gstRate: 18,
      },
      {
        id: "li-12",
        description: "Corner protectors (500 pcs)",
        hsn: "4819",
        quantity: 500,
        rate: toPaise(15),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(19500),
    cgst: 0,
    sgst: 0,
    igst: toPaise(3510),
    roundOff: 0,
    total: toPaise(23010),
    amountPaid: toPaise(23010),
    outstanding: 0,
    status: "paid",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-16",
        date: new Date("2024-09-25"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(23010),
        channel: "email",
      },
      {
        id: "ev-17",
        date: new Date("2024-10-22"),
        type: "payment",
        title: "Payment received",
        description: "NEFT credit",
        amount: toPaise(23010),
        channel: "in-person",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-10",
    invoiceNumber: "SP/24-25/010",
    customerId: "cust-2",
    customerName: "Mehta Enterprises",
    customerCity: "Pune",
    customerState: "Maharashtra",
    customerGstin: "27AAXPM5678P1Z2",
    placeOfSupply: "Maharashtra",
    invoiceDate: new Date("2024-09-28"),
    dueDate: new Date("2024-11-12"),
    terms: "Net 45",
    lineItems: [
      {
        id: "li-13",
        description: "Printed cartons with logo (500 pcs)",
        hsn: "4819",
        quantity: 500,
        rate: toPaise(130),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(65000),
    cgst: toPaise(5850),
    sgst: toPaise(5850),
    igst: 0,
    roundOff: 0,
    total: toPaise(76700),
    amountPaid: 0,
    outstanding: toPaise(76700),
    status: "due",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-18",
        date: new Date("2024-09-28"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(76700),
        channel: "email",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-11",
    invoiceNumber: "SP/24-25/011",
    customerId: "cust-5",
    customerName: "Chennai Suppliers",
    customerCity: "Chennai",
    customerState: "Tamil Nadu",
    customerGstin: "33AAACC7890L1Z4",
    placeOfSupply: "Tamil Nadu",
    invoiceDate: new Date("2024-10-01"),
    dueDate: new Date("2024-11-15"),
    terms: "Net 45",
    lineItems: [
      {
        id: "li-14",
        description: "Kraft sheets (200 kg)",
        hsn: "4804",
        quantity: 200,
        rate: toPaise(55),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(11000),
    cgst: 0,
    sgst: 0,
    igst: toPaise(1980),
    roundOff: 0,
    total: toPaise(12980),
    amountPaid: 0,
    outstanding: toPaise(12980),
    status: "due",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-19",
        date: new Date("2024-10-01"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via email",
        amount: toPaise(12980),
        channel: "email",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
  {
    id: "inv-12",
    invoiceNumber: "SP/24-25/012",
    customerId: "cust-1",
    customerName: "Gupta Traders",
    customerCity: "Mumbai",
    customerState: "Maharashtra",
    customerGstin: "27AAAPG1234M1Z5",
    placeOfSupply: "Maharashtra",
    invoiceDate: new Date("2024-10-03"),
    dueDate: new Date("2024-10-18"),
    terms: "Net 15",
    lineItems: [
      {
        id: "li-15",
        description: "Small cartons (100 pcs)",
        hsn: "4819",
        quantity: 100,
        rate: toPaise(75),
        gstRate: 18,
      },
    ],
    subtotal: toPaise(7500),
    cgst: toPaise(675),
    sgst: toPaise(675),
    igst: 0,
    roundOff: 0,
    total: toPaise(8850),
    amountPaid: 0,
    outstanding: toPaise(8850),
    status: "overdue",
    isDisputed: false,
    disputeReason: null,
    evidence: [
      {
        id: "ev-20",
        date: new Date("2024-10-03"),
        type: "invoice-sent",
        title: "Invoice sent",
        description: "Sent via WhatsApp",
        amount: toPaise(8850),
        channel: "whatsapp",
      },
    ],
    billOfSupply: false,
    pdfUrl: null,
  },
];

export function getCustomer(id: CustomerId): Customer | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}

export function getInvoice(id: InvoiceId): Invoice | undefined {
  return INVOICES.find((inv) => inv.id === id);
}

export function getInvoicesForCustomer(customerId: CustomerId): Invoice[] {
  return INVOICES.filter((inv) => inv.customerId === customerId);
}

export function totalOutstanding(): Paise {
  return INVOICES.reduce((sum, inv) => {
    if (inv.status === "disputed") return sum;
    return sum + inv.outstanding;
  }, 0);
}

export function totalOverdue(today: Date = new Date()): Paise {
  return INVOICES.reduce((sum, inv) => {
    if (inv.status === "disputed") return sum;
    if (inv.status === "paid") return sum;
    if (inv.dueDate < today && inv.outstanding > 0) {
      return sum + inv.outstanding;
    }
    return sum;
  }, 0);
}
