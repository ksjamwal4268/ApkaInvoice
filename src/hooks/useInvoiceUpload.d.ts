import React from "react";

export interface InvoiceUploadResult {
  reading: boolean;
  uploadError: string;
  setUploadError: React.Dispatch<React.SetStateAction<string>>;
  missing: string[];
  setMissing: React.Dispatch<React.SetStateAction<string[]>>;
  handleFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function useInvoiceUpload(
  setForm: React.Dispatch<React.SetStateAction<any>>
): InvoiceUploadResult;

