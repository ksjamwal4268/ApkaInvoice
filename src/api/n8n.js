const BASE = "https://ksjamwal.app.n8n.cloud/webhook";
const s = (v) => (v === null || v === undefined ? "" : String(v));

async function postWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e.name === "AbortError" ? "timeout" : "network" } };
  } finally {
    clearTimeout(t);
  }
}

export function normalizePhone(p) {
  let d = s(p).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d;
}

export async function uploadInvoice(file) {
  if (!file) return { ok: false, message: "Please choose a photo or PDF." };
  const fd = new FormData();
  fd.append("data", file);
  const r = await postWithTimeout(`${BASE}/invoice-upload`, { method: "POST", body: fd }, 90000);
  console.log("n8n upload response", r.data);

  if (r.status === 422 || r.data?.error === "unreadable") {
    return { ok: false, message: "No invoice details were found. Please upload a clearer photo or PDF." };
  }
  if (!r.ok || r.data?.status !== "ready") {
    return { ok: false, message: "Could not read this invoice right now. Please try again in a minute." };
  }
  const d = r.data;
  const pos = s(d.place_of_supply);
  const posCode = s(d.place_of_supply_code);
  const rawAmt = d.amount !== undefined ? d.amount : (d.total !== undefined ? d.total : d.grand_total);
  const parsedAmt = typeof rawAmt === "number" ? (isNaN(rawAmt) ? 0 : rawAmt) : parseFloat(String(rawAmt ?? "0").replace(/[^0-9.-]/g, "")) || 0;
  const inv = {
    n8nId: s(d.id),
    invoiceNumber: s(d.invoice_number),
    invoiceDate: s(d.invoice_date),
    dueDate: s(d.due_date),
    vendorName: s(d.vendor_name),
    vendorGstin: s(d.vendor_gstin),
    buyerName: s(d.payer_name),
    buyerGstin: s(d.payer_gstin),
    buyerAddress: s(d.payer_address),
    buyerEmail: s(d.payer_email),
    buyerPhone: s(d.payer_phone),
    placeOfSupply: pos && posCode ? `${pos} (${posCode})` : pos || posCode,
    amount: parsedAmt,
    currency: s(d.currency) || "INR",
  };
  return {
    ok: true,
    invoice: inv,
    fields: inv,
  };
}

export async function sendEmailReminder(args = {}) {
  const email = s(args.recipientEmail || args.email || args.recipient_email).trim();
  if (!email || !email.includes("@")) {
    return { ok: false, needEmail: true, error: "Please enter the buyer's email.", message: "Please enter the buyer's email." };
  }

  const invoiceNumber = s(args.invoiceNumber || args.invoice_number);
  const recipientName = s(args.recipientName || args.buyerName || args.recipient_name);
  const amount = s(args.amount || args.amountText || args.total);
  const dueDate = s(args.dueDate || args.due_date);

  const senderName = s(args.sender?.name || args.senderName || "ApkaInvoice");
  const senderEmail = s(args.sender?.email || args.senderEmail);

  const subject = s(args.subject || `Payment reminder: invoice ${invoiceNumber || "(No Number)"}`);
  const message = s(args.message) || `Hello ${recipientName || "there"},\n\nThis is a payment reminder for invoice ${invoiceNumber || ""} in the amount of ${amount}${dueDate ? " due on " + dueDate : ""}.\n\nThank you,\n${senderName}`;

  const payload = {
    invoice_number: invoiceNumber,
    recipient_email: email,
    recipient_name: recipientName,
    subject,
    message,
    amount,
    due_date: dueDate,
    sender: { name: senderName, email: senderEmail },
  };

  const gmailToken = args.gmailToken || args.sender_gmail_token;
  if (gmailToken) {
    payload.sender_gmail_token = gmailToken;
  }

  console.log("n8n sendEmailReminder sending:", payload);

  const r = await postWithTimeout(`${BASE}/invoice-reminder-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 35000);

  console.log("n8n sendEmailReminder response:", r);

  if (r.ok || r.data?.status === "reminder_sent" || r.data?.status === "success" || r.data?.sent) {
    const sentFrom = r.data?.sent_from === "business_gmail" ? "business_gmail" : "shared_sender";
    const msg = r.data?.message || (sentFrom === "shared_sender" ? `Reminder sent to ${email} (via ApkaInvoice)` : `Email sent to ${email}`);
    return { ok: true, status: "reminder_sent", message: msg, error: undefined, data: r.data };
  }

  if (r.status === 422) {
    return { ok: false, needEmail: true, error: "Please check the buyer's email.", message: "Please check the buyer's email." };
  }

  if (r.status === 404) {
    return { ok: false, needEmail: false, error: "Invoice not found on reminder service. Please check details and try again.", message: "Invoice not found on reminder service." };
  }

  const errMsg = r.data?.error || r.data?.message || "Could not send the email. Please try again.";
  return { ok: false, needEmail: false, error: errMsg, message: errMsg };
}

export async function sendWhatsAppReminder(args = {}) {
  const phoneInput = args.recipientPhone || args.phone || args.recipient_phone;
  const phone = normalizePhone(phoneInput);
  if (!phone || phone.length < 10) {
    return { ok: false, needPhone: true, message: "Please enter the buyer's phone number.", error: "Please enter the buyer's phone number." };
  }

  const invoiceNumber = s(args.invoiceNumber || args.invoice_number);
  const recipientName = s(args.recipientName || args.buyerName || args.recipient_name);
  const amount = s(args.amount || args.amountText || args.total);
  const dueDate = s(args.dueDate || args.due_date);
  const senderName = s(args.sender?.name || args.senderName || "ApkaInvoice");
  const senderEmail = s(args.sender?.email || args.senderEmail);

  const text = s(args.message) ||
    `Hello ${recipientName || "there"}, this is a reminder from ${senderName} that invoice ${invoiceNumber} for ${amount} is due${dueDate ? " on " + dueDate : ""}. Thank you.`;
  const fallbackUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  const r = await postWithTimeout(`${BASE}/invoice-reminder-whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_number: invoiceNumber,
      recipient_phone: phone,
      recipient_name: recipientName,
      amount,
      due_date: dueDate,
      sender: { name: senderName, email: senderEmail },
      message: text,
    }),
  }, 20000);

  if (r.ok || r.data?.status === "reminder_sent" || r.data?.status === "success" || r.data?.sent) {
    return { ok: true, message: "WhatsApp reminder sent", fallbackUrl, fallbackLink: fallbackUrl };
  }

  return {
    ok: false,
    fallbackUrl,
    fallbackLink: fallbackUrl,
    message: "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself.",
    error: "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself.",
  };
}
