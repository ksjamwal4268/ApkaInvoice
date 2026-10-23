/**
 * Bank statement CSV parsing and invoice matching for Cash Copilot.
 * Sample-data only.
 */

import { Paise } from "./money";

export interface BankRow {
  rowIndex: number;
  date: string;
  description: string;
  amount: Paise;
  type: "credit" | "debit";
  matched: boolean;
  matchType: "exact" | "partial" | "unmatched" | "tds";
  matchedInvoiceId: string | null;
  tdsPercent: number | null;
  needsReview: boolean;
  reviewReason: string | null;
}

export interface PaymentMatch {
  invoiceId: string;
  invoiceAmount: Paise;
  matchedAmount: Paise;
  bankRows: BankRow[];
  status: "fully-paid" | "part-paid" | "unmatched";
}

export interface CsvParseResult {
  rows: BankRow[];
  matches: PaymentMatch[];
  needsReview: BankRow[];
  unmatchedCredits: BankRow[];
  summary: {
    totalCredits: Paise;
    totalMatched: Paise;
    unmatchedCount: number;
    tdsCount: number;
  };
}

export function parseCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const records: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = fields[idx] || "";
    });
    records.push(record);
  }

  return records;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parsePaise(value: string): Paise {
  const cleaned = value.replace(/[₹,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function matchBankStatement({
  csvText,
  invoices,
}: {
  csvText: string;
  invoices: Array<{ id: string; amount: Paise; dueDate: Date; customerName: string }>;
}): CsvParseResult {
  const records = parseCsv(csvText);
  const rows: BankRow[] = [];
  const invoiceMap = new Map(
    invoices.map((inv) => [inv.id, { ...inv, remaining: inv.amount }])
  );

  let rowIndex = 0;
  for (const rec of records) {
    const date = rec.date || rec["Date"] || "";
    const description = rec.description || rec.Description || rec.narration || "";
    const amountRaw = rec.amount || rec.Amount || rec.amt || "0";
    const amountPaise = parsePaise(amountRaw);
    const type = amountPaise >= 0 ? "credit" : "debit";

    const row: BankRow = {
      rowIndex: rowIndex++,
      date,
      description,
      amount: Math.abs(amountPaise),
      type,
      matched: false,
      matchType: "unmatched",
      matchedInvoiceId: null,
      tdsPercent: null,
      needsReview: false,
      reviewReason: null,
    };

    rows.push(row);
  }

  const matches: PaymentMatch[] = [];
  const unmatchedCredits: BankRow[] = [];

  for (const row of rows) {
    if (row.type !== "credit") continue;

    let matchedInvoice: { id: string; remaining: Paise } | null = null;
    for (const [invId, inv] of invoiceMap.entries()) {
      if (inv.remaining > 0 && inv.amount === row.amount) {
        matchedInvoice = { id: invId, remaining: inv.remaining };
        break;
      }
    }

    if (matchedInvoice) {
      row.matched = true;
      row.matchType = "exact";
      row.matchedInvoiceId = matchedInvoice.id;
      const inv = invoiceMap.get(matchedInvoice.id)!;
      inv.remaining = inv.remaining - row.amount;

      let existing = matches.find((m) => m.invoiceId === matchedInvoice.id);
      if (!existing) {
        existing = {
          invoiceId: matchedInvoice.id,
          invoiceAmount: inv.amount,
          matchedAmount: 0,
          bankRows: [],
          status: "unmatched",
        };
        matches.push(existing);
      }
      existing.matchedAmount = existing.matchedAmount + row.amount;
      existing.bankRows.push(row);

      if (existing.matchedAmount >= existing.invoiceAmount) {
        existing.status = "fully-paid";
      } else {
        existing.status = "part-paid";
      }
    } else {
      let tdsMatch: { id: string; amount: Paise } | null = null;
      let tdsPct: number | null = null;

      for (const [invId, inv] of invoiceMap.entries()) {
        if (inv.remaining <= 0) continue;
        const ratio = row.amount / inv.amount;
        const shortfall = 1 - ratio;
        if (Math.abs(shortfall - 0.01) < 0.001) {
          tdsMatch = { id: invId, amount: inv.amount };
          tdsPct = 1;
          break;
        }
        if (Math.abs(shortfall - 0.02) < 0.001) {
          tdsMatch = { id: invId, amount: inv.amount };
          tdsPct = 2;
          break;
        }
        if (Math.abs(shortfall - 0.10) < 0.001) {
          tdsMatch = { id: invId, amount: inv.amount };
          tdsPct = 10;
          break;
        }
      }

      if (tdsMatch && tdsPct !== null) {
        row.matched = true;
        row.matchType = "tds";
        row.matchedInvoiceId = tdsMatch.id;
        row.tdsPercent = tdsPct;
        row.needsReview = true;
        row.reviewReason = `Possible TDS deduction of ${tdsPct}% on invoice ${tdsMatch.id}`;
      } else {
        row.needsReview = true;
        row.reviewReason = "Unmatched payment - please link to an invoice";
        unmatchedCredits.push(row);
      }
    }
  }

  for (const m of matches) {
    if (m.matchedAmount >= m.invoiceAmount) m.status = "fully-paid";
    else if (m.matchedAmount > 0) m.status = "part-paid";
    else m.status = "unmatched";
  }

  const needsReview = rows.filter((r) => r.needsReview);
  const totalCredits = rows
    .filter((r) => r.type === "credit")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalMatched = matches.reduce((sum, m) => sum + m.matchedAmount, 0);
  const tdsCount = needsReview.filter((r) => r.matchType === "tds").length;

  return {
    rows,
    matches,
    needsReview,
    unmatchedCredits,
    summary: {
      totalCredits,
      totalMatched,
      unmatchedCount: unmatchedCredits.length,
      tdsCount,
    },
  };
}