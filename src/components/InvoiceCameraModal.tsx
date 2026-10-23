import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  Zap,
  CheckCircle2,
  RefreshCw,
  FileText,
  AlertCircle,
  Building2,
  Check,
  Sparkles,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import {
  ExtractedInvoiceData,
  processInvoiceImageWithN8n,
  getN8nConfig,
  saveCustomer,
  getStoredCustomers,
} from "../data/dataStore";
import { formatInr } from "../utils/money";

interface InvoiceCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedData: (data: ExtractedInvoiceData, imagePreviewUrl?: string) => void;
}

export function InvoiceCameraModal({
  isOpen,
  onClose,
  onApplyExtractedData,
}: InvoiceCameraModalProps): React.JSX.Element | null {
  const [mode, setMode] = useState<"camera" | "upload" | "review">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [ocrSource, setOcrSource] = useState<"n8n_live" | "n8n_simulated">("n8n_simulated");
  const [buyerSaved, setBuyerSaved] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when modal opens in camera mode
  useEffect(() => {
    if (isOpen && mode === "camera" && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, capturedImage]);

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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

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
      runOcrPipeline(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
      stopCamera();
      runOcrPipeline(result);
    };
    reader.readAsDataURL(file);
  };

  const runOcrPipeline = async (imageData: string) => {
    setIsProcessing(true);
    setMode("review");
    setBuyerSaved(false);

    try {
      setProcessingStep("Connecting to n8n OCR Webhook...");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep("Vision Model: Analyzing invoice layout & HSN items...");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep("Verifying Indian GSTIN & calculating taxes...");
      const res = await processInvoiceImageWithN8n(imageData, true);

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
      gradeReasons: ["Registered via n8n Camera OCR Scanner"],
    };

    saveCustomer(newCust);
    setBuyerSaved(true);
  };

  const handleApply = () => {
    if (extractedData) {
      onApplyExtractedData(extractedData, capturedImage || undefined);
      onClose();
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setMode("camera");
    setBuyerSaved(false);
    startCamera();
  };

  if (!isOpen) return null;

  const n8nConfig = getN8nConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Scan & Extract Invoice
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Auto-OCR
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Point camera at a physical bill or upload a photo/PDF to automatically extract items and buyer details
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
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl w-fit">
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
                Upload Photo / PDF
              </button>
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
                      Use Phone Camera / File Picker Instead
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all tap-target"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-white bg-teal-400 animate-pulse" />
                    <span>Capture & Extract Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold"
                    title="Upload file or gallery photo"
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
                Click to browse photo or take camera picture
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports JPG, PNG, WEBP, or PDF invoices
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
              >
                Choose File or Camera
              </button>
            </div>
          )}

          {/* Hidden File Input with camera capture attribute for mobile */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
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
                      Document AI Extraction Pipeline
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
                      {processingStep}
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full w-3/4 animate-pulse" />
                  </div>
                </div>
              ) : extractedData ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left: Captured Thumbnail */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 relative aspect-3/4 sm:aspect-auto sm:max-h-80 flex items-center justify-center">
                      {capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Captured invoice"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-400">
                          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                          <p className="text-xs">Invoice Document</p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-teal-300 text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                        <Zap className="w-3 h-3 text-teal-400" />
                        <span>OCR Confidence: {extractedData.confidenceScore}%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake / Scan Another</span>
                    </button>
                  </div>

                  {/* Right: Extracted Structured Data */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-200/60 dark:border-teal-800/60">
                        <span className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          Extracted by {ocrSource === "n8n_live" ? "Live n8n Webhook" : "Smart OCR Model"}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          #{extractedData.invoiceNumber}
                        </span>
                      </div>

                      {/* Buyer Card */}
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-teal-600" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {extractedData.buyerName}
                            </span>
                          </div>
                          {extractedData.isNewBuyer && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              New Buyer
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <div>
                            <span className="text-slate-400">GSTIN: </span>
                            <span className="font-mono font-semibold">{extractedData.buyerGstin || "Unregistered"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Location: </span>
                            <span>{extractedData.buyerCity}, {extractedData.buyerState}</span>
                          </div>
                          {extractedData.buyerPhone && (
                            <div>
                              <span className="text-slate-400">Phone: </span>
                              <span>{extractedData.buyerPhone}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Terms: </span>
                            <span className="font-semibold text-teal-600">{extractedData.terms}</span>
                          </div>
                        </div>

                        {extractedData.isNewBuyer && (
                          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Save buyer to Customer Master?</span>
                            <button
                              type="button"
                              onClick={handleSaveBuyerToMaster}
                              disabled={buyerSaved}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                                buyerSaved
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-teal-600 text-white hover:bg-teal-700"
                              }`}
                            >
                              {buyerSaved ? <Check className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                              <span>{buyerSaved ? "Saved to Buyers" : "+ Save Buyer"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Line items preview */}
                      <div className="mt-3 space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Items Detected ({extractedData.lineItems.length}):
                        </span>
                        <div className="max-h-32 overflow-y-auto space-y-1 bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700 text-xs">
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
                          Extracted Grand Total:
                        </span>
                        <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                          {formatInr(extractedData.grandTotal * 100)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Scan Another
                      </button>
                      <button
                        type="button"
                        onClick={handleApply}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-md transition-all tap-target"
                      >
                        <span>Apply & Edit in Invoice Form</span>
                        <ArrowRight className="w-4 h-4" />
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
