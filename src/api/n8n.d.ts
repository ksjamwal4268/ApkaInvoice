export interface UploadedInvoiceFields {
  n8nId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  vendorName: string;
  vendorGstin: string;
  buyerName: string;
  buyerGstin: string;
  buyerAddress: string;
  buyerEmail: string;
  buyerPhone: string;
  placeOfSupply: string;
  amount: number;
  currency: string;
}

export interface UploadInvoiceResult {
  ok: boolean;
  message?: string;
  error?: string;
  invoice?: UploadedInvoiceFields;
  fields?: UploadedInvoiceFields;
}

export function uploadInvoice(file: File | Blob): Promise<UploadInvoiceResult>;

export interface SendEmailReminderParams {
  invoiceNumber: string;
  recipientEmail?: string;
  email?: string;
  recipientName?: string;
  buyerName?: string;
  subject?: string;
  message?: string;
  amount?: number | string;
  amountText?: string;
  dueDate?: string;
  sender?: { name?: string; email?: string };
  senderName?: string;
  senderEmail?: string;
  gmailToken?: string;
}

export interface SendEmailReminderResult {
  ok: boolean;
  needEmail?: boolean;
  error?: string;
  message?: string;
}

export function sendEmailReminder(params: SendEmailReminderParams): Promise<SendEmailReminderResult>;

export function normalizePhone(p: string): string;

export interface SendWhatsAppReminderParams {
  invoiceNumber: string;
  recipientPhone?: string;
  phone?: string;
  recipientName?: string;
  buyerName?: string;
  amount?: number | string;
  amountText?: string;
  dueDate?: string;
  sender?: { name?: string };
  senderName?: string;
  message?: string;
}

export interface SendWhatsAppReminderResult {
  ok: boolean;
  needPhone?: boolean;
  fallbackUrl?: string;
  fallbackLink?: string;
  error?: string;
  message?: string;
}

export function sendWhatsAppReminder(params: SendWhatsAppReminderParams): Promise<SendWhatsAppReminderResult>;
