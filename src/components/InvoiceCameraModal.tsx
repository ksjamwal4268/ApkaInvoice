import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import {
  uploadInvoiceToN8n,
  saveN8nExtractedInvoice,
  N8nUploadedInvoice,
  processInvoiceImageWithN8n,
} from "../data/dataStore";
import { Invoice } from "../data/sampleData";
import { formatInr, toPaise } from "../utils/money";

interface InvoiceCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedData?: (data: any, imagePreviewUrl?: string) => void;
  onInvoiceStored?: (invoice: Invoice) => void;
}

type ModalTab = "all" | "pdf" | "image" | "camera" | "review";

export function InvoiceCameraModal({
  isOpen,
  onClose,
  onApplyExtractedData,
  onInvoiceStored,
}: InvoiceCameraModalProps): React.JSX.Element | null {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"all" | "pdf" | "image" | "camera" | "review">("all");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Loading, Extraction & Result States
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("Uploading to n8n webhook...");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractedInvoice, setExtractedInvoice] = useState<N8nUploadedInvoice | null>(null);
  const [storedInvoice, setStoredInvoice] = useState<Invoice | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const anyInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setCameraError("Camera access unavailable. Please choose an image or PDF file instead.");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const processFile = async (file: File | Blob, isCameraCapture: boolean = false) => {
    const isFileInstance = file instanceof File;
    const name = isFileInstance ? file.name : (isCameraCapture ? "camera-capture.jpg" : "invoice.pdf");
    const mimeType = file.type || "";
    const isPdf = mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf");
    const isImage = mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name) || isCameraCapture;

    setFileName(name);
    setUploadError(null);
    setExtractedInvoice(null);
    setStoredInvoice(null);
    setIsUploading(true);
    setProcessingStatus(isPdf ? "Uploading PDF to n8n webhook..." : "Uploading image & extracting details...");
    setActiveTab("review");
    stopCamera();

    // Create thumbnail preview if image
    if (isImage) {
      if (isFileInstance) {
        const reader = new FileReader();
        reader.onload = () => setCapturedPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      setCapturedPreview(null);
    }

    try {
      // Step 1: Attempt direct upload to n8n webhook
      // POST https://ksjamwal.app.n8n.cloud/webhook/invoice-upload
      // Field name in FormData is exactly "data"
      let n8nResult: N8nUploadedInvoice | null = null;
      try {
        n8nResult = await uploadInvoiceToN8n(file);
      } catch (n8nErr) {
        console.warn("n8n direct upload error/non-ready:", n8nErr);
      }

      if (n8nResult && n8nResult.status === "ready") {
        setExtractedInvoice(n8nResult);
        const saved = saveN8nExtractedInvoice(n8nResult, name);
        setStoredInvoice(saved);
        onInvoiceStored?.(saved);
        return;
      }

      // Step 2: If image or camera capture and n8n didn't extract, use client-side Neural OCR
      if (isImage) {
        setProcessingStatus("Neural Engine: Extracting text, customer & totals from image...");
        const fileObj = isFileInstance ? file : new File([file], name, { type: "image/jpeg" });
        const ocrRes = await processInvoiceImageWithN8n(fileObj, false, {
          fileName: name,
          onProgress: (status) => setProcessingStatus(status),
        });

        if (ocrRes && ocrRes.data) {
          const grandTotal = Number(ocrRes.data.grandTotal || ocrRes.data.subtotal || 0);
          const converted: N8nUploadedInvoice = {
            status: "ready",
            invoice_number: ocrRes.data.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
            payer_name: ocrRes.data.buyerName || "Customer",
            amount: grandTotal,
            currency: "INR",
            due_date: ocrRes.data.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          };
          setExtractedInvoice(converted);
          const saved = saveN8nExtractedInvoice(converted, name);
          setStoredInvoice(saved);
          onInvoiceStored?.(saved);
          return;
        }
      }

      // If text PDF failed n8n
      if (isPdf) {
        throw new Error("Could not read this invoice. Please upload a text-based PDF.");
      } else {
        throw new Error("Could not read this invoice image. Please upload a clearer photo or a text-based PDF.");
      }
    } catch (err: any) {
      console.error("Invoice processing failed:", err);
      setUploadError(
        isPdf
          ? "Could not read this invoice. Please upload a text-based PDF."
          : "Could not read this invoice image. Please upload a clearer photo or a text-based PDF."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
      setCapturedPreview(canvas.toDataURL("image/jpeg", 0.9));
      processFile(blob, true);
    }, "image/jpeg", 0.9);
  };

  const handleReset = () => {
    setCapturedPreview(null);
    setFileName("");
    setExtractedInvoice(null);
    setStoredInvoice(null);
    setUploadError(null);
    setIsUploading(false);
    setActiveTab("all");
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Image or PDF
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload text-based PDF invoices or bill photos/images for automated extraction.
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
          {/* Requirement Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
            <div>
              <span className="font-bold">Dual Format Support: </span>
              <span>Upload text-based PDF invoices for direct n8n webhook processing, or upload image photos (JPG/PNG) for neural OCR extraction.</span>
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
                <span>All Options</span>
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
                  stopCamera();
                  setActiveTab("image");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "image"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image / Photo</span>
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

          {/* 1. ALL OPTIONS VIEW (SIDE BY SIDE CARDS) */}
          {activeTab === "all" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl border-2 border-dashed transition-all ${
                  isDragOver
                    ? "border-teal-500 bg-teal-50/30 dark:bg-teal-950/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20"
                }`}
              >
                {/* Option A: Upload PDF */}
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Upload PDF Invoice
                      <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        .pdf
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Text-based PDF invoices for automated n8n extraction.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    Select PDF File
                  </button>
                </div>

                {/* Option B: Upload Image */}
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Upload Image / Photo
                      <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        .jpg, .png
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Photos of paper bills, receipts, or screenshots.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    Select Image File
                  </button>
                </div>
              </div>

              {/* Bottom Quick Bar: Camera or Drag-and-drop */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-750 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Have a physical paper invoice in your hand?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("camera");
                    startCamera();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold hover:bg-slate-800 transition-colors"
                >
                  Open Live Camera
                </button>
              </div>
            </div>
          )}

          {/* 2. DEDICATED PDF VIEW */}
          {activeTab === "pdf" && (
            <div
              onClick={() => pdfInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 rounded-2xl p-10 text-center cursor-pointer bg-teal-50/20 dark:bg-teal-950/10 hover:bg-teal-50/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drop your text-based PDF invoice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Dispatches directly to n8n webhook (POST /webhook/invoice-upload) in multipart field "data".
              </p>
              <button
                type="button"
                className="mt-4 px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors"
              >
                Choose PDF File (.pdf)
              </button>
            </div>
          )}

          {/* 3. DEDICATED IMAGE VIEW */}
          {activeTab === "image" && (
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-sky-300 dark:border-sky-700 hover:border-sky-500 rounded-2xl p-10 text-center cursor-pointer bg-sky-50/20 dark:bg-sky-950/10 hover:bg-sky-50/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drop an invoice photo or image
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Accepts JPG, PNG, WEBP, and scans. Automatically extracts amounts and line details.
              </p>
              <button
                type="button"
                className="mt-4 px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 shadow-xs transition-colors"
              >
                Choose Image File (.jpg, .png)
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
                        onClick={() => pdfInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold"
                      >
                        Upload PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-semibold"
                      >
                        Upload Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all tap-target cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & Process</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <input
            ref={anyInputRef}
            type="file"
            accept="application/pdf,image/*,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* 5. REVIEW & EXTRACTION RESULT VIEW */}
          {activeTab === "review" && (
            <div className="space-y-4">
              {/* LOADING STATE */}
              {isUploading && (
                <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Processing Invoice
                    </h3>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
                      {processingStatus}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Extracting data for {fileName || "selected file"}... Extraction can take several seconds.
                  </p>
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
                      Extraction Failed
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md mx-auto">
                      {uploadError}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        pdfInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Upload Text-Based PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        imageInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload Clear Image</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SUCCESS READY STATE */}
              {!isUploading && extractedInvoice && storedInvoice && (
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
                          Saved in database and ready for payment reminders.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Preview if Image */}
                  {capturedPreview && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <img
                        src={capturedPreview}
                        alt="Uploaded invoice preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{fileName}</p>
                        <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">Image parsed & verified</p>
                      </div>
                    </div>
                  )}

                  {/* Extracted Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400">Invoice Number</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                        {extractedInvoice.invoice_number}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400">Payer / Customer</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {extractedInvoice.payer_name}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400">Total Amount</span>
                      <p className="font-bold text-sm text-teal-600 dark:text-teal-400 font-mono">
                        {formatInr(toPaise(extractedInvoice.amount))} ({extractedInvoice.currency || "INR"})
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400">Due Date</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {extractedInvoice.due_date}
                      </p>
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
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate("/invoices");
                      }}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      View in Invoices Dataset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
