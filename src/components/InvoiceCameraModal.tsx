import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  X,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Smartphone,
  Info,
} from "lucide-react";
import {
  saveN8nExtractedInvoice,
  N8nUploadedInvoice,
} from "../data/dataStore";
import { uploadInvoice } from "../api/n8n.js";
import { Invoice } from "../data/sampleData";
import { useAuth } from "../utils/auth";

export type TabType = "all" | "photo" | "pdf" | "camera" | "review";

interface InvoiceCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | Blob | null;
  initialTab?: TabType;
  onApplyExtractedData?: (data: any, imagePreviewUrl?: string) => void;
  onInvoiceStored?: (invoice: Invoice) => void;
}

export function InvoiceCameraModal({
  isOpen,
  onClose,
  initialFile,
  initialTab,
  onApplyExtractedData,
  onInvoiceStored,
}: InvoiceCameraModalProps): React.JSX.Element | null {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Loading, Extraction & Result States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSeconds, setUploadSeconds] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string>("Reading invoice…");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | Blob | null>(null);
  const [extractedInvoice, setExtractedInvoice] = useState<N8nUploadedInvoice | null>(null);
  const [storedInvoice, setStoredInvoice] = useState<Invoice | null>(null);

  // Controlled form fields mapped strictly from endpoint keys
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editBuyerName, setEditBuyerName] = useState("");
  const [editBuyerGstin, setEditBuyerGstin] = useState("");
  const [editBuyerAddress, setEditBuyerAddress] = useState("");
  const [editBuyerEmail, setEditBuyerEmail] = useState("");
  const [editBuyerPhone, setEditBuyerPhone] = useState("");
  const [editPlaceOfSupply, setEditPlaceOfSupply] = useState("");
  const [editSellerName, setEditSellerName] = useState("");
  const [editSellerGstin, setEditSellerGstin] = useState("");
  const [editAmount, setEditAmount] = useState<number | string>("");
  const [editCurrency, setEditCurrency] = useState("INR");

  const isBuyerEmailMissing = !(editBuyerEmail ?? "").trim();
  const isBuyerPhoneMissing = !(editBuyerPhone ?? "").trim();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const universalInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  // Timer for loading state (up to 90s)
  useEffect(() => {
    if (isUploading) {
      setUploadSeconds(0);
      timerRef.current = setInterval(() => {
        setUploadSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setUploadSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUploading]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera access unavailable. Please choose a photo or file instead.");
    }
  };

  const handleReset = () => {
    setCapturedPreview(null);
    setFileName("");
    setExtractedInvoice(null);
    setStoredInvoice(null);
    setEditInvoiceNumber("");
    setEditInvoiceDate("");
    setEditDueDate("");
    setEditBuyerName("");
    setEditBuyerGstin("");
    setEditBuyerAddress("");
    setEditBuyerEmail("");
    setEditBuyerPhone("");
    setEditPlaceOfSupply("");
    setEditSellerName("");
    setEditSellerGstin("");
    setEditAmount("");
    setEditCurrency("INR");
    setUploadError(null);
    setIsUploading(false);
    setActiveTab(initialTab || "all");
  };

  const handleApplyInvoice = (inv: N8nUploadedInvoice, previewUrl?: string) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    setExtractedInvoice(inv);
    const saved = saveN8nExtractedInvoice(
      inv,
      previewUrl || capturedPreview || fileName,
      inv.id ? String(inv.id) : storedInvoice?.id
    );
    setStoredInvoice(saved);
    onInvoiceStored?.(saved);
    onApplyExtractedData?.(inv, previewUrl || capturedPreview || fileName);
  };

  /**
   * Main upload execution:
   * Endpoint: POST https://ksjamwal.app.n8n.cloud/webhook/invoice-upload
   * Body: multipart/form-data. File in field named "data".
   * 90s timeout. One request per click.
   */
  const processFile = async (file: File | Blob, isCameraCapture: boolean = false) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    // Rule 7: One request per click (disable button while uploading)
    if (isUploading) return;

    // Check ~10 MB file limit
    if (file && (file as any).size && (file as any).size > 10 * 1024 * 1024) {
      setUploadError("Could not read this invoice. Please upload a clear photo or PDF.");
      setActiveTab("review");
      return;
    }

    const isFileInstance = file instanceof File;
    const name = isFileInstance ? (file?.name ?? "") : (isCameraCapture ? "camera-capture.jpg" : "invoice-document.jpg");
    const mimeType = ((file?.type ?? "") as string).toLowerCase();
    const isImage = mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(name ?? "") || isCameraCapture;

    setFileName(name);
    setLastUploadedFile(file);
    setUploadError(null);
    setExtractedInvoice(null);
    setStoredInvoice(null);
    setIsUploading(true);
    // Rule 7: Show "Reading invoice…" while waiting
    setProcessingStatus("Reading invoice…");
    setActiveTab("review");
    stopCamera();

    // Immediately read image data URL for preview
    if (isImage && isFileInstance) {
      const previewDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      setCapturedPreview(previewDataUrl);
    } else if (!isImage) {
      setCapturedPreview(null);
    }

    try {
      const result = await uploadInvoice(file);

      // Rule 2: Fill form fields AFTER the response arrives (set state from response)
      // Rule 5: Guard every string call: (value ?? "").toLowerCase(), (value ?? "").trim()
      if (result && result.ok && result.fields) {
        const fields = result.fields;
        const invPayload: N8nUploadedInvoice = {
          id: fields.n8nId,
          status: "ready",
          invoice_number: fields.invoiceNumber,
          invoice_date: fields.invoiceDate,
          due_date: fields.dueDate,
          vendor_name: fields.vendorName,
          vendor_gstin: fields.vendorGstin,
          payer_name: fields.buyerName,
          payer_gstin: fields.buyerGstin,
          payer_address: fields.buyerAddress,
          payer_email: fields.buyerEmail,
          payer_phone: fields.buyerPhone,
          place_of_supply: fields.placeOfSupply,
          amount: fields.amount,
          currency: fields.currency,
        };
        setExtractedInvoice(invPayload);

        // Rule 1 & Rule 6: Never put a GSTIN into the invoice number field.
        // If invoice_number is "", show an empty field and let user type (or use "INV-" + id)
        const respInvNum = (fields.invoiceNumber ?? "").trim();
        const isGstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(respInvNum);
        if (respInvNum && !isGstinPattern) {
          setEditInvoiceNumber(respInvNum);
        } else if (!editInvoiceNumber.trim()) {
          setEditInvoiceNumber(fields.n8nId ? `INV-${fields.n8nId}` : "");
        }

        // Rule 1 & 3: Only overwrite if response value is non-empty; keep what user typed otherwise
        const respInvDate = (fields.invoiceDate ?? "").trim();
        if (respInvDate) {
          setEditInvoiceDate(respInvDate);
        }

        const respDueDate = (fields.dueDate ?? "").trim();
        if (respDueDate) {
          setEditDueDate(respDueDate);
        }

        const respBuyerName = (fields.buyerName ?? "").trim();
        if (respBuyerName) {
          setEditBuyerName(respBuyerName);
        }

        const respBuyerGstin = (fields.buyerGstin ?? "").trim().toUpperCase();
        if (respBuyerGstin) {
          setEditBuyerGstin(respBuyerGstin);
        }

        const respBuyerAddress = (fields.buyerAddress ?? "").trim();
        if (respBuyerAddress) {
          setEditBuyerAddress(respBuyerAddress);
        }

        const respBuyerEmail = (fields.buyerEmail ?? "").trim();
        if (respBuyerEmail) {
          setEditBuyerEmail(respBuyerEmail);
        }

        const respBuyerPhone = (fields.buyerPhone ?? "").trim();
        if (respBuyerPhone) {
          setEditBuyerPhone(respBuyerPhone);
        }

        const respPos = (fields.placeOfSupply ?? "").trim();
        if (respPos) {
          setEditPlaceOfSupply(respPos);
        }

        const respSellerName = (fields.vendorName ?? "").trim();
        if (respSellerName) {
          setEditSellerName(respSellerName);
        }

        const respSellerGstin = (fields.vendorGstin ?? "").trim().toUpperCase();
        if (respSellerGstin) {
          setEditSellerGstin(respSellerGstin);
        }

        const rawAmt = (fields as any).amount !== undefined ? (fields as any).amount : ((fields as any).total !== undefined ? (fields as any).total : (fields as any).grand_total);
        if (rawAmt !== undefined && rawAmt !== null && String(rawAmt).trim() !== "") {
          const parsed = typeof rawAmt === "number" ? (isNaN(rawAmt) ? 0 : rawAmt) : parseFloat(String(rawAmt).replace(/[^0-9.-]/g, ""));
          if (!isNaN(parsed) && parsed > 0) {
            setEditAmount(parsed);
          }
        }

        const respCurrency = (fields.currency ?? "").trim();
        if (respCurrency) {
          setEditCurrency(respCurrency);
        }

        setActiveTab("review");
        return;
      }

      // Rule 8: On non-200 / timeout show: "Could not read this invoice. Please upload a clear photo or PDF."
      throw new Error(result?.error || "Could not read this invoice. Please upload a clear photo or PDF.");
    } catch (err: any) {
      console.error("Invoice extraction failed:", err);
      // Rule 8: Exactly show this error string
      setUploadError(err?.message || "Could not read this invoice. Please upload a clear photo or PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialFile) {
        processFile(initialFile);
      } else if (initialTab) {
        setActiveTab(initialTab);
        if (initialTab === "camera") {
          startCamera();
        }
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, initialFile, initialTab]);

  const handleSaveEditedInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedInvoice) return;

    const emailClean = (editBuyerEmail ?? "").trim();
    const phoneClean = (editBuyerPhone ?? "").trim();

    // Rule 4: If payer_email or payer_phone is "", highlight the field and ask user to enter it before saving (reminders need them)
    if (!emailClean || !phoneClean) {
      const missingList: string[] = [];
      if (!emailClean) missingList.push("Buyer Email");
      if (!phoneClean) missingList.push("Buyer Phone");
      const confirmSave = window.confirm(
        `Please enter ${missingList.join(" and ")} before saving (reminders need them).\n\nDo you want to enter them now? Click Cancel to enter them, or OK to save anyway.`
      );
      if (!confirmSave) {
        return;
      }
    }

    const invoiceId = extractedInvoice.id ? String(extractedInvoice.id) : storedInvoice?.id || `inv-${Date.now().toString(36)}`;
    const finalInvoiceNumber = (editInvoiceNumber ?? "").trim() || (extractedInvoice.id ? `INV-${extractedInvoice.id}` : "");

    // Rule 9: When saving and when sending reminders, send the edited values the user confirmed:
    // recipient_email = Buyer Email, recipient_phone = Buyer Phone
    const updatedInv: N8nUploadedInvoice = {
      id: invoiceId,
      status: "ready",
      invoice_number: finalInvoiceNumber,
      invoice_date: (editInvoiceDate ?? "").trim(),
      due_date: (editDueDate ?? "").trim(),
      payer_name: (editBuyerName ?? "").trim() || "Customer",
      payer_gstin: (editBuyerGstin ?? "").trim().toUpperCase(),
      payer_address: (editBuyerAddress ?? "").trim(),
      payer_email: emailClean,
      payer_phone: phoneClean,
      place_of_supply: (editPlaceOfSupply ?? "").trim(),
      vendor_name: (editSellerName ?? "").trim(),
      vendor_gstin: (editSellerGstin ?? "").trim().toUpperCase(),
      amount: editAmount !== "" ? (typeof editAmount === "number" ? editAmount : parseFloat(String(editAmount).replace(/[^0-9.-]/g, "")) || 0) : 0,
      currency: (editCurrency ?? "").trim() || "INR",
    };

    handleApplyInvoice(updatedInv, capturedPreview || fileName);
    onClose();
    navigate("/invoices");
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const previewUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPreview(previewUrl);
      processFile(blob, true);
    }, "image/jpeg", 0.9);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-750">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Upload Invoice
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Photos & PDFs
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload a bill photo (JPG, PNG) or PDF document to extract invoice details automatically.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Friendly Format Pills Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Supported Documents:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                📄 PDF Bills (.PDF)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                📷 Photos (JPG, PNG, WEBP)
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs - Exactly 2 options */}
          {activeTab !== "review" && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-750 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("all");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab !== "camera"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>1. Upload PDF or Image</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("camera");
                  startCamera();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "camera"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>2. Camera</span>
              </button>
            </div>
          )}

          {/* 1. UPLOAD PDF OR IMAGE VIEW */}
          {activeTab !== "camera" && activeTab !== "review" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && photoInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all group ${
                isDragOver
                  ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/30"
                  : "border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20 hover:border-teal-500 hover:bg-teal-50/20"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Upload PDF or Image
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Click to browse or drag & drop your PDF invoice or bill photo (JPG, PNG, WEBP).
              </p>
              <button
                type="button"
                disabled={isUploading}
                className="mt-5 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-2 pointer-events-none"
              >
                <Upload className="w-4 h-4" />
                <span>Choose PDF or Image</span>
              </button>
            </div>
          )}

          {/* 4. LIVE CAMERA VIEW */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-4/3 sm:aspect-16/9 bg-slate-950 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-8 border-2 border-dashed border-teal-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="text-[10px] font-mono text-teal-300 bg-slate-900/60 px-2 py-0.5 rounded w-fit backdrop-blur-xs">
                        ALIGN INVOICE
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">{cameraError || "Opening camera..."}</p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Upload Photo Instead
                      </button>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Upload PDF Instead
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={captureSnapshot}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all tap-target cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & Read Invoice</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Inputs - All accept="image/*,application/pdf" */}
          {/* Photos/Images (accept="image/*,application/pdf") */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processFile(file);
                e.target.value = "";
              }
            }}
          />

          {/* Mobile Camera Capture */}
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processFile(file, true);
                e.target.value = "";
              }
            }}
          />

          {/* PDF Only */}
          <input
            ref={pdfInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processFile(file);
                e.target.value = "";
              }
            }}
          />

          {/* Universal (Photo or PDF) */}
          <input
            ref={universalInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processFile(file);
                e.target.value = "";
              }
            }}
          />

          {/* 5. REVIEW & EXTRACTION RESULT VIEW */}
          {activeTab === "review" && (
            <div className="space-y-4">
              {/* LOADING STATE - 90 SECONDS TIMEOUT */}
              {isUploading && (
                <div className="p-8 sm:p-10 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full border-4 border-teal-600 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Reading invoice…
                    </h3>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
                      {processingStatus}
                    </p>
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-teal-600 h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, Math.max(5, (uploadSeconds / 90) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Elapsed: {uploadSeconds}s / 90s timeout. Processing invoice details…
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR STATE */}
              {!isUploading && uploadError && (
                <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      Upload Unsuccessful
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md mx-auto font-medium">
                      {uploadError}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        photoInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 cursor-pointer shadow-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload Another Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        pdfInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-750 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Upload PDF Document</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SUCCESS READY STATE: SHOW EXTRACTED VALUES SO USER CAN CHECK & EDIT THEM BEFORE SAVING */}
              {!isUploading && extractedInvoice && (
                <div className="p-6 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-teal-200/60 dark:border-teal-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-3" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Invoice Extracted Successfully
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500 text-white">
                            Status: Ready
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Review or adjust extracted values below, then save to dataset.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Preview if Photo */}
                  {capturedPreview && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <img
                        src={capturedPreview}
                        alt="Uploaded invoice preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600 shadow-2xs"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{fileName}</p>
                        <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">Photo parsed & verified</p>
                      </div>
                    </div>
                  )}

                  {/* Notice: Always ask for payer's email and phone if missing */}
                  {(isBuyerEmailMissing || isBuyerPhoneMissing) ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Missing contact details for payment reminders</p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          Please enter the buyer's {isBuyerEmailMissing && isBuyerPhoneMissing ? "email and phone" : isBuyerEmailMissing ? "email address" : "phone number"} before saving. Automated reminders need them.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs">
                      <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Check & Edit Extracted Values</p>
                        <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-0.5">
                          All fields are editable. Review values below and save when ready.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Review / Verification Form with controlled editable fields */}
                  <form onSubmit={handleSaveEditedInvoice} className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
                      {/* Section 1: Invoice Details */}
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                          1. Invoice Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Invoice Number */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Invoice Number
                            </label>
                            <input
                              type="text"
                              value={editInvoiceNumber}
                              onChange={(e) => setEditInvoiceNumber(e.target.value)}
                              placeholder="e.g. GST-3525-26"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Invoice Date */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Invoice Date
                            </label>
                            <input
                              type="date"
                              value={editInvoiceDate}
                              onChange={(e) => setEditInvoiceDate(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Due Date */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Amount */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold font-mono text-teal-600 dark:text-teal-400 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Currency */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Currency
                            </label>
                            <input
                              type="text"
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                              placeholder="INR"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Place of Supply */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Place of Supply
                            </label>
                            <input
                              type="text"
                              value={editPlaceOfSupply}
                              onChange={(e) => setEditPlaceOfSupply(e.target.value)}
                              placeholder="e.g. Kerala (32)"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Buyer / Payer Details */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                          2. Buyer Details (Payer)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Buyer Name */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Buyer Name
                            </label>
                            <input
                              type="text"
                              value={editBuyerName}
                              onChange={(e) => setEditBuyerName(e.target.value)}
                              placeholder="e.g. Shiv Engineering"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Buyer GSTIN */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Buyer GSTIN
                            </label>
                            <input
                              type="text"
                              value={editBuyerGstin}
                              onChange={(e) => setEditBuyerGstin(e.target.value.toUpperCase())}
                              placeholder="e.g. 32AABBA7890B1ZB"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Buyer Email - Highlighted if empty */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                Buyer Email
                              </label>
                              {isBuyerEmailMissing && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Required for reminders
                                </span>
                              )}
                            </div>
                            <input
                              type="email"
                              value={editBuyerEmail}
                              onChange={(e) => setEditBuyerEmail(e.target.value)}
                              placeholder="e.g. accounts@shiveng.in"
                              className={`w-full px-3 py-1.5 rounded-lg border font-medium text-slate-900 dark:text-white outline-none transition-all ${
                                isBuyerEmailMissing
                                  ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 focus:border-amber-500 ring-2 ring-amber-300/40"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500"
                              }`}
                            />
                            {isBuyerEmailMissing && (
                              <p className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                Please enter buyer email before saving
                              </p>
                            )}
                          </div>

                          {/* Buyer Phone - Highlighted if empty */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                Buyer Phone (WhatsApp)
                              </label>
                              {isBuyerPhoneMissing && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Required for reminders
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={editBuyerPhone}
                              onChange={(e) => setEditBuyerPhone(e.target.value)}
                              placeholder="e.g. 9878789878"
                              className={`w-full px-3 py-1.5 rounded-lg border font-medium text-slate-900 dark:text-white outline-none transition-all ${
                                isBuyerPhoneMissing
                                  ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 focus:border-amber-500 ring-2 ring-amber-300/40"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500"
                              }`}
                            />
                            {isBuyerPhoneMissing && (
                              <p className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                Please enter buyer phone before saving
                              </p>
                            )}
                          </div>

                          {/* Buyer Address */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Buyer Address
                            </label>
                            <input
                              type="text"
                              value={editBuyerAddress}
                              onChange={(e) => setEditBuyerAddress(e.target.value)}
                              placeholder="e.g. Sumel Business Park 7, Kochi, Kerala - 380023"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Seller / Vendor Details */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                          3. Seller Details (Vendor)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Seller Name */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Seller Name
                            </label>
                            <input
                              type="text"
                              value={editSellerName}
                              onChange={(e) => setEditSellerName(e.target.value)}
                              placeholder="e.g. Gujarat Freight Tools"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>

                          {/* Seller GSTIN */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Seller GSTIN
                            </label>
                            <input
                              type="text"
                              value={editSellerGstin}
                              onChange={(e) => setEditSellerGstin(e.target.value.toUpperCase())}
                              placeholder="e.g. 27CORPP3939N1ZQ"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:bg-white focus:border-teal-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Upload Another
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 stroke-3" />
                        <span>Save & View in Invoices Dataset</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
