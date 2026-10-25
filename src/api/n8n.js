// src/api/n8n.js — the only file that talks to n8n
const BASE = "https://ksjamwal.app.n8n.cloud/webhook";
const s = (v) => (v === null || v === undefined ? "" : String(v));

async function postWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    let data = {};
    try {
      data = await res.json();
    } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: { error: e.name === "AbortError" ? "timeout" : "network" },
    };
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

// ---------- UPLOAD ----------
export async function uploadInvoice(file) {
  if (!file) return { ok: false, message: "Please choose a photo or PDF." };
  const fd = new FormData();
  fd.append("data", file); // do NOT set Content-Type manually
  const r = await postWithTimeout(
    `${BASE}/invoice-upload`,
    { method: "POST", body: fd },
    90000
  );
  if (r.status === 422 || r.data?.error === "unreadable") {
    return {
      ok: false,
      message:
        "No invoice details were found. Please upload a clearer photo or PDF.",
      error:
        "No invoice details were found. Please upload a clearer photo or PDF.",
    };
  }
  if (!r.ok || r.data?.status !== "ready") {
    return {
      ok: false,
      message:
        "Could not read this invoice right now. Please try again in a minute.",
      error:
        "Could not read this invoice right now. Please try again in a minute.",
    };
  }
  const d = r.data;
  const pos = s(d.place_of_supply);
  const posCode = s(d.place_of_supply_code);
  const invoiceData = {
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
  };
  return {
    ok: true,
    invoice: invoiceData,
    fields: invoiceData,
  };
}

// ---------- EMAIL REMINDER ----------
export async function sendEmailReminder({
  invoiceNumber,
  recipientEmail,
  email,
  recipientName,
  buyerName,
  subject,
  message,
  amount,
  amountText,
  dueDate,
  sender,
  senderName,
  senderEmail,
}) {
  const targetEmail = s(recipientEmail || email).trim();
  if (!targetEmail)
    return { ok: false, needEmail: true, message: "Please enter the buyer's email.", error: "Please enter the buyer's email." };

  const finalSender = sender || {
    name: s(senderName),
    email: s(senderEmail),
  };

  const finalSubject = s(subject) || `Payment reminder: invoice ${s(invoiceNumber)}`;
  const finalMessage =
    s(message) ||
    `Hello ${s(recipientName || buyerName) || "there"},\n\nThis is a reminder that invoice ${s(invoiceNumber)} for ${s(amount || amountText)} is due${dueDate ? " on " + s(dueDate) : ""}.\n\nThank you,\n${s(finalSender.name)}`;

  const r = await postWithTimeout(
    `${BASE}/invoice-reminder-email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_number: s(invoiceNumber),
        recipient_email: targetEmail,
        recipient_name: s(recipientName || buyerName),
        subject: finalSubject,
        message: finalMessage,
        amount: s(amount || amountText),
        due_date: s(dueDate),
        sender: finalSender,
      }),
    },
    30000
  );
  if (r.ok && r.data?.status === "reminder_sent")
    return { ok: true, message: `Email sent to ${targetEmail}` };
  if (r.status === 404 || r.status === 422)
    return {
      ok: false,
      needEmail: true,
      message: "Please check the buyer's email.",
      error: "Please check the buyer's email.",
    };
  return {
    ok: false,
    message: "Could not send the email. Please try again.",
    error: "Could not send the email. Please try again.",
  };
}

// ---------- WHATSAPP REMINDER (auto, then wa.me fallback) ----------
export async function sendWhatsAppReminder({
  invoiceNumber,
  recipientPhone,
  phone,
  recipientName,
  buyerName,
  amount,
  amountText,
  dueDate,
  sender,
  senderName,
  message,
}) {
  const targetPhone = normalizePhone(recipientPhone || phone);
  if (!targetPhone)
    return { ok: false, message: "Please enter the buyer's phone number.", error: "Please enter the buyer's phone number." };

  const finalSender = sender || { name: s(senderName) };
  const targetName = s(recipientName || buyerName);
  const targetAmount = s(amount || amountText);

  const r = await postWithTimeout(
    `${BASE}/invoice-reminder-whatsapp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_number: s(invoiceNumber),
        recipient_phone: targetPhone,
        recipient_name: targetName,
        amount: targetAmount,
        due_date: s(dueDate),
        sender: finalSender,
      }),
    },
    20000
  );
  if (r.ok && r.data?.status === "reminder_sent")
    return { ok: true, message: "WhatsApp reminder sent" };

  const text =
    s(message) ||
    `Hello ${targetName || "there"}, this is a reminder that invoice ${s(
      invoiceNumber
    )} for ${targetAmount} is due${dueDate ? " on " + s(dueDate) : ""}. Thank you.`;
  const fallbackUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;

  return {
    ok: false,
    fallbackUrl,
    fallbackLink: fallbackUrl,
    message:
      "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself.",
    error:
      "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself.",
  };
}
