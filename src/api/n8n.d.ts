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
  error?: string;
  fields?: UploadedInvoiceFields;
}

export function uploadInvoice(file: File | Blob): Promise<UploadInvoiceResult>;

export interface SendEmailReminderParams {
  invoiceNumber: string;
  email: string;
  buyerName?: string;
  amountText?: string;
  dueDate?: string;
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
  phone: string;
  buyerName?: string;
  amountText?: string;
  dueDate?: string;
  senderName?: string;
}

export interface SendWhatsAppReminderResult {
  ok: boolean;
  needPhone?: boolean;
  fallbackLink?: string;
  error?: string;
  message?: string;
}

export function sendWhatsAppReminder(params: SendWhatsAppReminderParams): Promise<SendWhatsAppReminderResult>;

