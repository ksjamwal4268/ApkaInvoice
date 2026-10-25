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

export async function sendEmailReminder({ invoiceNumber, recipientEmail, recipientName, subject, message, amount, dueDate, sender }) {
  const email = s(recipientEmail).trim();
  if (!email) return { ok: false, needEmail: true, message: "Please enter the buyer's email." };
  const r = await postWithTimeout(`${BASE}/invoice-reminder-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_number: s(invoiceNumber),
      recipient_email: email,
      recipient_name: s(recipientName),
      subject: s(subject),
      message: s(message),
      amount: s(amount),
      due_date: s(dueDate),
      sender: sender || {},
    }),
  }, 30000);
  if (r.ok && r.data?.status === "reminder_sent") return { ok: true, message: `Email sent to ${email}` };
  if (r.status === 404 || r.status === 422) return { ok: false, needEmail: true, message: "Please check the buyer's email." };
  return { ok: false, message: "Could not send the email. Please try again." };
}

export async function sendWhatsAppReminder({ invoiceNumber, recipientPhone, recipientName, amount, dueDate, sender, message }) {
  const phone = normalizePhone(recipientPhone);
  if (!phone) return { ok: false, message: "Please enter the buyer's phone number." };
  const r = await postWithTimeout(`${BASE}/invoice-reminder-whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_number: s(invoiceNumber),
      recipient_phone: phone,
      recipient_name: s(recipientName),
      amount: s(amount),
      due_date: s(dueDate),
      sender: sender || {},
    }),
  }, 20000);
  if (r.ok && r.data?.status === "reminder_sent") return { ok: true, message: "WhatsApp reminder sent" };
  const text = s(message) ||
    `Hello ${s(recipientName) || "there"}, this is a reminder that invoice ${s(invoiceNumber)} for ${s(amount)} is due${dueDate ? " on " + s(dueDate) : ""}. Thank you.`;
  const fallbackUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  return {
    ok: false,
    fallbackUrl,
    fallbackLink: fallbackUrl,
    message: "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself.",
    error: "Couldn't send automatically. Tap 'Open WhatsApp' to send it yourself.",
  };
}
