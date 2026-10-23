/**
 * Money utilities for ApkaInvoice.
 * All money is stored as whole paise (integers) to avoid floating point errors.
 * GST is rounded per line, never via AI or approximate arithmetic.
 */

export type Paise = number;

/** Convert rupees (with decimals) to whole paise integer */
export function toPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** Convert paise integer to rupees (decimal) */
export function fromPaise(paise: Paise): number {
  return paise / 100;
}

/** Zero paise */
export const ZERO: Paise = 0;

/** Add two paise amounts */
export function add(...amounts: Paise[]): Paise {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/** Subtract b from a (paise) */
export function subtract(a: Paise, b: Paise): Paise {
  return a - b;
}

/** Multiply paise by a factor, rounding to whole paise */
export function multiply(paise: Paise, factor: number): Paise {
  return Math.round(paise * factor);
}

/** Divide paise by a divisor, rounding to whole paise */
export function divide(paise: Paise, divisor: number): Paise {
  return Math.round(paise / divisor);
}

/** Format paise as Indian rupee string: ₹1,41,600 */
export function formatInr(paise: Paise): string {
  const rupees = Math.abs(fromPaise(paise));
  const sign = paise < 0 ? "-" : "";
  const formatted = formatIndianNumber(rupees);
  return `${sign}₹${formatted}`;
}

/** Format a number using Indian grouping: 1,41,600 (lakhs/crores) */
function formatIndianNumber(num: number): string {
  const n = Math.floor(num);
  if (n < 1000) return String(n);
  const last3 = n % 1000;
  const rest = Math.floor(n / 1000);
  const restStr = formatIndianLakhs(rest);
  return `${restStr},${String(last3).padStart(3, "0")}`;
}

function formatIndianLakhs(num: number): string {
  if (num < 100) return String(num);
  const last2 = num % 100;
  const rest = Math.floor(num / 100);
  return `${rest},${String(last2).padStart(2, "0")}`;
}

/** Format paise as rupees with no symbol: 1,41,600 */
export function formatNumber(paise: Paise): string {
  const rupees = Math.abs(fromPaise(paise));
  const sign = paise < 0 ? "-" : "";
  return `${sign}${formatIndianNumber(rupees)}`;
}

/** Format paise as "₹1,41,600.00" with decimals */
export function formatInrDecimals(paise: Paise): string {
  const rupees = Math.abs(fromPaise(paise));
  const sign = paise < 0 ? "-" : "";
  const formatted = formatIndianNumber(Math.floor(rupees));
  const decimals = String(Math.round((rupees % 1) * 100)).padStart(2, "0");
  return `${sign}₹${formatted}.${decimals}`;
}

/** Round GST per line: amount * rate / 100, rounded to whole paise */
export function roundGst(amountPaise: Paise, gstRatePercent: number): Paise {
  return Math.round((amountPaise * gstRatePercent) / 100);
}

/** Split GST into CGST + SGST (same state) - each half of total GST */
export function splitCgstSgst(totalGstPaise: Paise): { cgst: Paise; sgst: Paise } {
  const cgst = Math.floor(totalGstPaise / 2);
  const sgst = totalGstPaise - cgst;
  return { cgst, sgst };
}

/** Convert total amount (incl GST) to words in Indian numbering (lakhs/crores) */
export function amountInWords(paise: Paise): string {
  const rupees = Math.floor(fromPaise(paise));
  const paisePart = paise % 100;
  if (rupees === 0) {
    return paisePart === 0 ? "zero rupees" : `${paisePart} paise`;
  }
  const rupeesWords = numberToWords(rupees);
  const rupeesLabel = rupees === 1 ? "rupee" : "rupees";
  if (paisePart === 0) return `${rupeesWords} ${rupeesLabel}`;
  return `${rupeesWords} ${rupeesLabel} and ${numberToWords(paisePart)} paise`;
}

const UNITS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
const TEENS = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function numberToWords(n: number): string {
  if (n === 0) return "";
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const ten = TENS[Math.floor(n / 10)];
    const unit = n % 10;
    return unit ? `${ten} ${UNITS[unit]}` : ten;
  }
  if (n < 1000) {
    const hundred = UNITS[Math.floor(n / 100)];
    const rest = n % 100;
    return rest ? `${hundred} hundred and ${numberToWords(rest)}` : `${hundred} hundred`;
  }
  if (n < 100000) {
    const thousand = Math.floor(n / 1000);
    const rest = n % 1000;
    return rest ? `${numberToWords(thousand)} thousand and ${numberToWords(rest)}` : `${numberToWords(thousand)} thousand`;
  }
  if (n < 10000000) {
    const lakh = Math.floor(n / 100000);
    const rest = n % 100000;
    return rest ? `${numberToWords(lakh)} lakh and ${numberToWords(rest)}` : `${numberToWords(lakh)} lakh`;
  }
  const crore = Math.floor(n / 10000000);
  const rest = n % 10000000;
  return rest ? `${numberToWords(crore)} crore and ${numberToWords(rest)}` : `${numberToWords(crore)} crore`;
}