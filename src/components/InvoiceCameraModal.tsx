import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  FileText,
  Building2,
  Check,
  CheckCircle2,
  Phone,
  Mail,
  Send,
  ExternalLink,
} from "lucide-react";
import {
  ExtractedInvoiceData,
  processInvoiceImageWithN8n,
  storeExtractedInvoice,
  saveCustomer,
  getStoredCustomers,
} from "../data/dataStore";
import { Invoice } from "../data/sampleData";
import { formatInr } from "../utils/money";

interface InvoiceCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedData?: (data: ExtractedInvoiceData, imagePreviewUrl?: string) => void;
  onInvoiceStored?: (invoice: Invoice) => void;
}

export function InvoiceCameraModal({
  isOpen,
  onClose,
  onApplyExtractedData,
  onInvoiceStored,
}: InvoiceCameraModalProps): React.JSX.Element | null {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"camera" | "upload" | "review">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isPdf, setIsPdf] = useState(false);
  const [payerPhone, setPayerPhone] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [ocrSource, setOcrSource] = useState<"n8n_live" | "ocr_tesseract" | "n8n_simulated">("n8n_simulated");
  const [buyerSaved, setBuyerSaved] = useState(false);
  const [storedInvoice, setStoredInvoice] = useState<Invoice | null>(null);
  const [ocrEngineMode, setOcrEngineMode] = useState<"auto" | "browser" | "n8n">("auto");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Camera start failed, switching to upload mode:", err);
      setCameraError(
        "Camera stream not accessible or permission denied. You can use the photo/file upload option below."
      );
      setCameraActive(false);
    }
  };

  // Initialize camera when modal opens in camera mode
  useEffect(() => {
    if (isOpen && mode === "camera" && !capturedImage && !storedInvoice) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, capturedImage, storedInvoice]);

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      stopCamera();
      setCapturedImage(dataUrl);
      setIsPdf(false);
      setFileName("camera-capture.jpg");
      runOcrPipeline(dataUrl, "camera-capture.jpg");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isFilePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setIsPdf(isFilePdf);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
      stopCamera();
      runOcrPipeline(result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const runOcrPipeline = async (imageData: string, customFileName?: string) => {
    setIsProcessing(true);
    setMode("review");
    setBuyerSaved(false);
    setStoredInvoice(null);

    try {
      setProcessingStep(ocrEngineMode === "browser" ? "Initializing Neural OCR..." : "Scanning bill via Document AI...");
      const res = await processInvoiceImageWithN8n(imageData, true, {
        payerEmail: payerEmail.trim() || undefined,
        payerPhone: payerPhone.trim() || undefined,
        fileName: customFileName || fileName,
        ocrEngine: ocrEngineMode,
        onProgress: (step: string) => setProcessingStep(step),
      });

      setExtractedData(res.data);
      setOcrSource(res.source);
    } catch (err) {
      console.error("OCR extraction error", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveBuyerToMaster = () => {
    if (!extractedData) return;
    const existingCusts = getStoredCustomers();
    const existing = existingCusts.find(
      (c) =>
        c.name.toLowerCase() === extractedData.buyerName.toLowerCase() ||
        (c.gstin && c.gstin === extractedData.buyerGstin)
    );

    if (existing) {
      setBuyerSaved(true);
      return;
    }

    const newCust = {
      id: `cust-${Date.now().toString(36)}`,
      name: extractedData.buyerName,
      city: extractedData.buyerCity || "Pune",
      state: extractedData.buyerState || "Maharashtra",
      gstin: extractedData.buyerGstin || null,
      pan: extractedData.buyerGstin && extractedData.buyerGstin.length >= 12 ? extractedData.buyerGstin.substring(2, 12) : null,
      email: extractedData.buyerEmail || `orders@${extractedData.buyerName.toLowerCase().replace(/[^a-z0-9]/g, "")}.in`,
      phone: extractedData.buyerPhone || "+91 98000 00000",
      isChronicallyLate: false,
      grade: "A" as const,
      gradeReasons: ["Registered via n8n OCR Scanner"],
    };

    saveCustomer(newCust);
    setBuyerSaved(true);
  };

  const handleDirectStore = () => {
    if (!extractedData) return;
    const invoice = storeExtractedInvoice(extractedData, capturedImage || undefined);
    setStoredInvoice(invoice);
    onInvoiceStored?.(invoice);
  };

  const handleApply = () => {
    if (extractedData) {
      if (onApplyExtractedData) {
        onApplyExtractedData(extractedData, capturedImage || undefined);
        onClose();
      } else {
        navigate("/invoices/create");
        onClose();
      }
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setStoredInvoice(null);
    setMode("camera");
    setBuyerSaved(false);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-linear-to-r from-teal-50 via-slate-50 to-white dark:from-teal-950/40 dark:via-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Upload & Extract Invoice
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  n8n OCR Workflow
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snap physical bill with camera or upload a PDF/Image to automatically extract and store into your system
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {mode !== "review" && (
            <div className="space-y-3">
              {/* Mode switch */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("camera");
                      setCapturedImage(null);
                      startCamera();
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      mode === "camera"
                        ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    Live Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setMode("upload");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      mode === "upload"
                        ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload PDF / Photo
                  </button>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 pl-1.5 font-medium">Engine:</span>
                  <button
                    type="button"
                    onClick={() => setOcrEngineMode("browser")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      ocrEngineMode === "browser"
                        ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                    }`}
                    title="Runs directly in browser using Neural OCR (Zero 500 network errors)"
                  >
                    Neural OCR (Local)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcrEngineMode("auto")}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      ocrEngineMode === "auto"
                        ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                    }`}
                    title="Tries n8n cloud webhook with automatic local fallback"
                  >
                    Auto (n8n Cloud)
                  </button>
                </div>
              </div>

              {/* Optional Payer details for automation */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Buyer WhatsApp / Phone (Optional for reminder automation)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Buyer Email (Optional for invoice dispatch)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="accounts@buyer.in"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Camera Mode */}
          {mode === "camera" && !capturedImage && (
            <div className="space-y-4">
              <div className="relative aspect-4/3 sm:aspect-16/9 bg-slate-950 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Overlay Guide */}
                    <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-teal-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between items-center text-[11px] font-mono text-teal-300 bg-slate-900/60 px-2.5 py-1 rounded w-fit backdrop-blur-xs">
                        <span>ALIGN INVOICE INSIDE FRAME</span>
                      </div>
                      <div className="text-center text-xs text-white/90 drop-shadow-md">
                        Hold steady for crisp text & GSTIN detection
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">
                      {cameraError || "Requesting camera stream..."}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
                    >
                      Use PDF / File Picker Instead
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-extrabold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all tap-target"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-white bg-teal-400 animate-pulse" />
                    <span>Capture & Extract via n8n</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold"
                    title="Upload PDF or photo"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Upload Mode */}
          {mode === "upload" && !capturedImage && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 hover:bg-teal-50/20 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to browse PDF or image invoice
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports PDF, JPG, PNG, or WEBP invoices
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
              >
                Choose PDF or Image File
              </button>
            </div>
          )}

          {/* Hidden File Input with camera capture attribute for mobile */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* VIEW: Processing & Review Mode */}
          {mode === "review" && (
            <div className="space-y-4">
              {isProcessing ? (
                <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      n8n Document AI Extraction Pipeline
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
                      {processingStep}
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full w-3/4 animate-pulse" />
                  </div>
                </div>
              ) : storedInvoice ? (
                /* SUCCESS STORED STATE */
                <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
                      Invoice Stored Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                      Invoice <strong>{storedInvoice.invoiceNumber}</strong> for <strong>{storedInvoice.customerName}</strong> ({formatInr(storedInvoice.total)}) has been saved into your system ledger.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/40 max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Number:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{storedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buyer:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{storedInvoice.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Amount:</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{formatInr(storedInvoice.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(storedInvoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate("/reminders");
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all tap-target"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reminder via Workflow</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate("/invoices");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-semibold text-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View in Invoices</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-2 py-1"
                    >
                      Scan Another
                    </button>
                  </div>
                </div>
              ) : extractedData ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left: Captured Thumbnail */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 relative aspect-3/4 sm:aspect-auto sm:max-h-80 flex items-center justify-center">
                      {isPdf ? (
                        <div className="p-8 text-center text-white space-y-2">
                          <FileText className="w-16 h-16 text-rose-500 mx-auto" />
                          <p className="font-bold text-sm truncate max-w-[200px]">{fileName}</p>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                            PDF Document
                          </span>
                        </div>
                      ) : capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Captured invoice"
                          className="w-full h-full object-contain max-h-80"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-400">No preview</div>
                      )}
                      <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-teal-300 font-mono border border-teal-500/30">
                        {ocrSource === "n8n_live" ? "Live n8n Webhook" : ocrSource === "ocr_tesseract" ? "Neural Vision OCR" : "Document AI Parser"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Confidence: {extractedData.confidenceScore}%</span>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-teal-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Re-upload
                      </button>
                    </div>
                  </div>

                  {/* Right: Extracted Fields Review */}
                  <div className="md:col-span-7 space-y-3 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {extractedData.invoiceNumber || "INV-001"}
                        </span>
                        <span className="text-slate-500 font-mono">
                          Date: {extractedData.invoiceDate} • Due: {extractedData.dueDate}
                        </span>
                      </div>

                      {/* Buyer Details */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Buyer: {extractedData.buyerName}
                          </span>
                          {extractedData.buyerGstin && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {extractedData.buyerGstin}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          {extractedData.buyerCity}, {extractedData.buyerState} • {extractedData.buyerPhone || payerPhone}
                        </p>

                        {!buyerSaved ? (
                          <button
                            type="button"
                            onClick={handleSaveBuyerToMaster}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                          >
                            <Building2 className="w-3 h-3" />
                            <span>Save to Customer Directory</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                            <Check className="w-3 h-3" />
                            <span>Saved in Customers</span>
                          </span>
                        )}
                      </div>

                      {/* Line items preview */}
                      <div className="mt-3 space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Items Detected ({extractedData.lineItems.length}):
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1 bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700 text-xs">
                          {extractedData.lineItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-750 last:border-0"
                            >
                              <div className="truncate pr-2">
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {item.description}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  HSN {item.hsn} • {item.quantity} units @ ₹{item.rate} ({item.gstRate}% GST)
                                </p>
                              </div>
                              <span className="font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                                {formatInr(item.quantity * item.rate * 100)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="mt-3 pt-2 border-t border-teal-200/80 dark:border-teal-800/80 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Extracted Total:
                        </span>
                        <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                          {formatInr(extractedData.grandTotal * 100)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleApply}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                      >
                        <span>Edit in Full Form</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleDirectStore}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] tap-target"
                      >
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>Store Invoice in System</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
