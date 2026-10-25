import { useState } from "react";
import { uploadInvoice } from "../api/n8n";

export function useInvoiceUpload(setForm) {
  const [reading, setReading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [missing, setMissing] = useState([]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || reading) return;
    setReading(true);
    setUploadError("");
    const res = await uploadInvoice(file);
    setReading(false);
    if (!res.ok) { setUploadError(res.message); return; }

    const inv = res.invoice;
    const pick = (n, o) => ((n ?? "") !== "" ? n : o ?? "");
    setForm((prev) => ({
      ...prev,
      invoiceNumber: pick(inv.invoiceNumber, prev?.invoiceNumber),
      invoiceDate:   pick(inv.invoiceDate, prev?.invoiceDate),
      dueDate:       pick(inv.dueDate, prev?.dueDate),
      sellerName:    pick(inv.vendorName, prev?.sellerName),
      sellerGstin:   pick(inv.vendorGstin, prev?.sellerGstin),
      buyerName:     pick(inv.buyerName, prev?.buyerName),
      buyerGstin:    pick(inv.buyerGstin, prev?.buyerGstin),
      buyerAddress:  pick(inv.buyerAddress, prev?.buyerAddress),
      buyerEmail:    pick(inv.buyerEmail, prev?.buyerEmail),
      buyerPhone:    pick(inv.buyerPhone, prev?.buyerPhone),
      placeOfSupply: pick(inv.placeOfSupply, prev?.placeOfSupply),
      amount:        inv.amount || prev?.amount || 0,
      currency:      pick(inv.currency, prev?.currency) || "INR",
      n8nId:         inv.n8nId,
    }));
    setMissing(
      [["buyerEmail", inv.buyerEmail], ["buyerPhone", inv.buyerPhone], ["dueDate", inv.dueDate]]
        .filter(([, v]) => (v ?? "") === "").map(([k]) => k)
    );
  }
  return { reading, uploadError, setUploadError, missing, setMissing, handleFile };
}
