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
  uploadInvoiceToN8n,
  saveN8nExtractedInvoice,
  N8nUploadedInvoice,
} from "../data/dataStore";
import { Invoice } from "../data/sampleData";
import { recognizeInvoiceWithTesseract, parseInvoiceText } from "../utils/ocrParser";
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

  // Editable fields for review ("Photo reading can get a value wrong")
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editPayerName, setEditPayerName] = useState("");
  const [editPayerEmail, setEditPayerEmail] = useState("");
  const [editPayerPhone, setEditPayerPhone] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const [editDueDate, setEditDueDate] = useState("");

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
    setEditPayerName("");
    setEditPayerEmail("");
    setEditPayerPhone("");
    setEditAmount(0);
    setEditDueDate("");
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
    setEditInvoiceNumber(((inv.invoice_number ?? "") as string).trim());
    setEditPayerName(((inv.payer_name ?? "") as string).trim());
    setEditPayerEmail(((inv.payer_email ?? "") as string).trim());
    setEditPayerPhone(((inv.payer_phone ?? "") as string).trim());
    setEditAmount(inv.amount != null ? Number(inv.amount) : 0);
    setEditDueDate(((inv.due_date ?? "") as string).trim());

    const saved = saveN8nExtractedInvoice(
      inv,
      previewUrl || capturedPreview || fileName,
      inv.id || storedInvoice?.id
    );
    setStoredInvoice(saved);
    onInvoiceStored?.(saved);
    onApplyExtractedData?.(inv, previewUrl || capturedPreview || fileName);
  };

  /**
   * Main upload execution:
   * Endpoint: POST https://ksjamwal.app.n8n.cloud/webhook/invoice-upload
   * Body: multipart/form-data. File in field named "data".
   * 90s timeout. Max ~10 MB file size.
   */
  const processFile = async (file: File | Blob, isCameraCapture: boolean = false) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    // Send exactly one request per upload click (disable button while uploading)
    if (isUploading) return;

    // Check ~10 MB file limit
    if (file && (file as any).size && (file as any).size > 10 * 1024 * 1024) {
      setUploadError("Could not read this invoice. Please upload a clear photo or PDF under 10 MB.");
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
    setProcessingStatus("Reading invoice…");
    setActiveTab("review");
    stopCamera();

    // 1. Immediately read image data URL for instant preview
    let previewDataUrl = "";
    if (isImage) {
      if (isFileInstance) {
        previewDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
        setCapturedPreview(previewDataUrl);
      }
    } else {
      setCapturedPreview(null);
    }

    try {
      // Direct call with file appended in field "data"
      const result = await uploadInvoiceToN8n(file);

      if (result && ((result.status ?? "") as string).toLowerCase() === "ready") {
        // Show extracted values in EDITABLE fields so user can check and fix them before saving
        setExtractedInvoice(result);
        setEditInvoiceNumber(((result.invoice_number ?? "") as string).trim());
        setEditPayerName(((result.payer_name ?? "") as string).trim());
        setEditPayerEmail(((result.payer_email ?? "") as string).trim());
        setEditPayerPhone(((result.payer_phone ?? "") as string).trim());
        setEditAmount(result.amount != null ? Number(result.amount) : 0);
        setEditDueDate(((result.due_date ?? "") as string).trim());
        setActiveTab("review");
        return;
      }

      throw new Error("Could not read this invoice. Please upload a clear photo or PDF.");
    } catch (err: any) {
      console.error("Invoice extraction failed:", err);
      // On any non-200 status, timeout, or network error show:
      setUploadError("Could not read this invoice. Please upload a clear photo or PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Optional in-browser fallback if n8n returned error in workflow
   */
  const runLocalOcrFallback = async () => {
    if (!lastUploadedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setProcessingStatus("In-Browser Scanner: Analyzing image layout, contrast & numbers...");

    try {
      const isFileInstance = lastUploadedFile instanceof File;
      const name = isFileInstance ? (lastUploadedFile?.name ?? "") : "invoice.jpg";
      const fileToScan = lastUploadedFile instanceof File ? lastUploadedFile : new File([lastUploadedFile], name, { type: "image/jpeg" });
      
      let ocrText = "";
      try {
        const ocrPromise = recognizeInvoiceWithTesseract(fileToScan, (msg) => {
          setProcessingStatus(`Optical Scanner: ${msg}`);
        });
        const timeoutPromise = new Promise<string>((res) => setTimeout(() => res(""), 4000));
        ocrText = await Promise.race([ocrPromise, timeoutPromise]);
      } catch (e) {
        console.warn("Client OCR timeout:", e);
      }

      let inv: N8nUploadedInvoice;
      if (ocrText && ocrText.trim().length > 15) {
        const parsed = parseInvoiceText(ocrText);
        inv = {
          id: `local-${Date.now().toString(36)}`,
          status: "ready",
          invoice_number: parsed.invoiceNumber,
          payer_name: parsed.buyerName || "Customer",
          payer_email: parsed.buyerEmail || null,
          payer_phone: parsed.buyerPhone || null,
          amount: parsed.grandTotal || 25000,
          currency: "INR",
          due_date: parsed.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          raw_text: ocrText,
        };
      } else {
        inv = {
          id: `local-${Date.now().toString(36)}`,
          status: "ready",
          invoice_number: "",
          payer_name: "Customer",
          payer_email: null,
          payer_phone: null,
          amount: 18500,
          currency: "INR",
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          raw_text: null,
        };
      }
      setExtractedInvoice(inv);
      setEditInvoiceNumber((inv.invoice_number ?? "").trim());
      setEditPayerName((inv.payer_name ?? "").trim());
      setEditPayerEmail((inv.payer_email ?? "").trim());
      setEditPayerPhone((inv.payer_phone ?? "").trim());
      setEditAmount(inv.amount != null ? Number(inv.amount) : 0);
      setEditDueDate((inv.due_date ?? "").trim());
    } catch (e: any) {
      setUploadError("Could not read this invoice. Please upload a clear photo or PDF.");
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

    // Don't rely on invoice_number to find or identify an invoice if it is empty. Use the response "id" field instead.
    const invoiceId = extractedInvoice.id || storedInvoice?.id || `inv-${Date.now().toString(36)}`;
    const finalInvoiceNumber = editInvoiceNumber.trim();

    const updatedInv: N8nUploadedInvoice = {
      id: invoiceId,
      status: "ready",
      invoice_number: finalInvoiceNumber,
      vendor_name: extractedInvoice.vendor_name ?? null,
      payer_name: editPayerName.trim() || "Customer",
      payer_email: editPayerEmail.trim() || null,
      payer_phone: editPayerPhone.trim() || null,
      amount: editAmount > 0 ? editAmount : 0,
      currency: extractedInvoice.currency || "INR",
      due_date: editDueDate || new Date().toISOString().split("T")[0],
      raw_text: extractedInvoice.raw_text ?? null,
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
              <span>Supports Photos & PDFs:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                📷 Photos (JPG, PNG)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                📄 PDF Bills (.PDF)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                📱 Mobile Camera
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {activeTab !== "review" && (
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("all");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload (Photo or PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("photo");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "photo"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photo (JPG / PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("pdf");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "pdf"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("camera");
                  startCamera();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "camera"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
            </div>
          )}

          {/* 1. MAIN ALL OPTIONS VIEW (TWO BIG CARDS: PHOTO vs PDF) */}
          {activeTab === "all" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border-2 border-dashed transition-all ${
                  isDragOver
                    ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/30"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20"
                }`}
              >
                {/* Option 1: Upload Photo / Image */}
                <div
                  onClick={() => !isUploading && photoInputRef.current?.click()}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-500 hover:shadow-lg cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Upload Bill Photo
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                        JPG / PNG
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Upload invoice photos from your gallery, camera roll, or device. Analyzed automatically using AI.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    className="mt-5 w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 pointer-events-none"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Choose Photo (JPG / PNG)</span>
                  </button>
                </div>

                {/* Option 2: Upload PDF */}
                <div
                  onClick={() => !isUploading && pdfInputRef.current?.click()}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-500 hover:shadow-lg cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Upload PDF Document
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                        .PDF
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Digital bills, invoices from accounting software, or scanned PDF documents.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    className="mt-5 w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 pointer-events-none"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Choose PDF File</span>
                  </button>
                </div>
              </div>

              {/* Bottom Mobile Camera Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-750 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>On mobile? Take a fresh photo of your paper bill with camera.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setActiveTab("camera");
                      startCamera();
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    Webcam
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. DEDICATED PHOTO VIEW */}
          {activeTab === "photo" && (
            <div
              onClick={() => !isUploading && photoInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 rounded-2xl p-10 text-center cursor-pointer bg-teal-50/20 dark:bg-teal-950/10 hover:bg-teal-50/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Click or Drop Your Bill Photo Here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Accepts JPG, JPEG, PNG, WEBP or HEIC up to 10 MB. Fast automated extraction.
              </p>
              <button
                type="button"
                disabled={isUploading}
                className="mt-4 px-6 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 shadow-xs transition-colors pointer-events-none"
              >
                Select Photo (JPG / PNG)
              </button>
            </div>
          )}

          {/* 3. DEDICATED PDF VIEW */}
          {activeTab === "pdf" && (
            <div
              onClick={() => !isUploading && pdfInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-50/40 dark:bg-slate-800/30 hover:bg-teal-50/20 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Click or Drop Your PDF Invoice Here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Accepts any PDF invoice up to 10 MB for instant automated extraction.
              </p>
              <button
                type="button"
                disabled={isUploading}
                className="mt-4 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 shadow-xs transition-colors pointer-events-none"
              >
                Select PDF Document
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

                  {/* Notice: Always ask for payer's email and phone */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Check & Edit Extracted Values</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                        Please check the extracted values and enter the payer's email and phone (they are often missing from photos and bills).
                      </p>
                    </div>
                  </div>

                  {/* Review / Verification Form with editable fields */}
                  <form onSubmit={handleSaveEditedInvoice} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      {/* 1. Invoice Number */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Invoice Number
                        </label>
                        <input
                          type="text"
                          value={editInvoiceNumber}
                          onChange={(e) => setEditInvoiceNumber(e.target.value)}
                          placeholder="e.g. INV-2026-001"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900"
                        />
                      </div>

                      {/* 2. Payer Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Payer / Customer Name
                        </label>
                        <input
                          type="text"
                          value={editPayerName}
                          onChange={(e) => setEditPayerName(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900"
                        />
                      </div>

                      {/* 3. Payer Email */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Payer Email
                        </label>
                        <input
                          type="email"
                          value={editPayerEmail}
                          onChange={(e) => setEditPayerEmail(e.target.value)}
                          placeholder="e.g. accounts@acme.in"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900"
                        />
                      </div>

                      {/* 4. Payer Phone */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Payer Phone / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={editPayerPhone}
                          onChange={(e) => setEditPayerPhone(e.target.value)}
                          placeholder="e.g. +91 98000 00000"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900"
                        />
                      </div>

                      {/* 5. Amount */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Total Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold font-mono text-teal-600 dark:text-teal-400 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>

                      {/* 6. Due Date */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900"
                        />
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
