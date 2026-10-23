/**
 * GSTIN validation for Indian GST numbers.
 * Format: 15 characters - 2 state code + 10 PAN + 1 entity code + 1 default 'Z' + 1 checksum
 */

export interface GstinValidationResult {
  valid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
}

export interface IndianState {
  state: string;
  code: string;
}

export const STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

export const INDIAN_STATES: IndianState[] = Object.entries(STATE_CODES)
  .map(([code, state]) => ({ state, code }))
  .sort((a, b) => a.state.localeCompare(b.state));

// GSTIN checksum based on the GST portal algorithm (Fibonacci weights)
function computeGstinChecksum(gstin: string): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const len = chars.length;
  let sum = 0;
  let factor = 2;
  for (let i = 0; i < 14; i++) {
    const code = chars.indexOf(gstin[i]);
    const product = factor * code;
    sum += Math.floor(product / len) + (product % len);
    factor = factor === 2 ? 1 : 2;
  }
  const checkDigit = (len - (sum % len)) % len;
  return chars[checkDigit];
}

export function validateGstin(gstin: string): GstinValidationResult {
  if (!gstin) {
    return { valid: false, error: "GSTIN is required" };
  }

  const cleaned = gstin.trim().toUpperCase();

  if (cleaned.length !== 15) {
    return {
      valid: false,
      error: "GSTIN must be 15 characters long",
    };
  }

  // Check format: 2 digits + 10 alphanumeric + 1 alphanumeric + 'Z' + 1 alphanumeric
  const gstinRegex = /^[0-9]{2}[A-Z0-9]{13}$/;
  if (!gstinRegex.test(cleaned)) {
    return {
      valid: false,
      error: "GSTIN format is invalid (expected 15 characters)",
    };
  }

  // Position 14 (index 13) must be 'Z'
  if (cleaned[13] !== "Z") {
    return {
      valid: false,
      error: "GSTIN must have 'Z' as the 14th character",
    };
  }

  // Validate checksum
  const expectedChecksum = computeGstinChecksum(cleaned);
  if (cleaned[14] !== expectedChecksum) {
    return {
      valid: false,
      error: "GSTIN checksum is invalid",
    };
  }

  const stateCode = cleaned.substring(0, 2);
  const stateName = STATE_CODES[stateCode];

  return {
    valid: true,
    stateCode,
    stateName,
  };
}

/** Check if two GSTINs are in the same state (for CGST+SGST vs IGST) */
export function sameState(gstinA: string, gstinB: string): boolean {
  return gstinA.substring(0, 2) === gstinB.substring(0, 2);
}