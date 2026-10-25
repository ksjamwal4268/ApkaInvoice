// src/api/n8n.js — the only file that talks to n8n
const BASE = "https://ksjamwal.app.n8n.cloud/webhook";
const s = (v) => (v === null || v === undefined ? "" : String(v));

async function post(path, body, timeoutMs, isForm = false) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      body: isForm ? body : JSON.stringify(body),
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      signal: ctrl.signal,
    });
    let data = {};
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e.name === "AbortError" ? "timeout" : s(e.message) } };
  } finally {
    clearTimeout(t);
  }
}

// 1) UPLOAD: photo or PDF -> extracted fields (does NOT save to your DB)
export async function uploadInvoice(file) {
  const fd = new FormData();
  fd.append("data", file); // do not set Content-Type manually
  const r = await post("invoice-upload", fd, 90000, true);
  if (!r.ok || r.data.status !== "ready") {
    return { ok: false, error: "Could not read this invoice right now. Please try again or upload a clearer photo/PDF." };
  }
  const d = r.data;
  const pos = s(d.place_of_supply);
  const posCode = s(d.place_of_supply_code);
  return {
    ok: true,
    fields: {
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
      amount: Number(d.amount) || 0,
      currency: s(d.currency) || "INR",
    },
  };
}

// 2) EMAIL REMINDER
export async function sendEmailReminder({ invoiceNumber, email, buyerName, amountText, dueDate, senderName, senderEmail, gmailToken }) {
  if (!s(email).includes("@")) return { ok: false, needEmail: true, error: "Please enter the customer's email." };
  const body = {
    invoice_number: s(invoiceNumber),
    recipient_email: s(email).trim(),
    recipient_name: s(buyerName),
    subject: `Payment reminder: invoice ${s(invoiceNumber)}`,
    message: `Hello ${s(buyerName) || "there"},\n\nThis is a reminder that invoice ${s(invoiceNumber)} for ${s(amountText)} is due${dueDate ? " on " + s(dueDate) : ""}.\n\nThank you,\n${s(senderName)}`,
    sender: { name: s(senderName), email: s(senderEmail) },
  };
  if (gmailToken) body.sender_gmail_token = gmailToken;
  const r = await post("invoice-reminder-email", body, 30000);
  if (r.ok && r.data.status === "reminder_sent") return { ok: true, message: `Email sent to ${body.recipient_email}` };
  if (r.status === 422 || r.status === 404) return { ok: false, needEmail: true, error: "Please check the customer's email." };
  return { ok: false, error: "Email could not be sent. Please try again." };
}

// 3) WHATSAPP REMINDER (API first, wa.me fallback)
export function normalizePhone(p) {
  let d = s(p).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d;
}

export async function sendWhatsAppReminder({ invoiceNumber, phone, buyerName, amountText, dueDate, senderName }) {
  const to = normalizePhone(phone);
  if (to.length < 11) return { ok: false, needPhone: true, error: "Please enter the customer's phone number." };
  const text = `Hello ${s(buyerName) || "there"}, this is a reminder from ${s(senderName)} that invoice ${s(invoiceNumber)} for ${s(amountText)} is due${dueDate ? " on " + s(dueDate) : ""}. Please arrange payment. Thank you.`;
  const waLink = `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
  const r = await post("invoice-reminder-whatsapp", {
    invoice_number: s(invoiceNumber),
    recipient_phone: to,
    recipient_name: s(buyerName),
    sender: { name: s(senderName) },
    amount: s(amountText),
    due_date: s(dueDate),
  }, 20000);
  if (r.ok && r.data.status === "reminder_sent") return { ok: true, message: "WhatsApp reminder sent" };
  return { ok: false, fallbackLink: waLink, error: "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself." };
}

