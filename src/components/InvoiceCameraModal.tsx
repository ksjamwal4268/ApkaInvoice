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
} from "lucide-react";
import {
  uploadInvoiceToN8n,
  saveN8nExtractedInvoice,
  N8nUploadedInvoice,
} from "../data/dataStore";
import { Invoice } from "../data/sampleData";
import { formatInr, toPaise } from "../utils/money";

interface InvoiceCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedData?: (data: any, imagePreviewUrl?: string) => void;
  onInvoiceStored?: (invoice: Invoice) => void;
}

export function InvoiceCameraModal({
  isOpen,
  onClose,
  onApplyExtractedData,
  onInvoiceStored,
}: InvoiceCameraModalProps): React.JSX.Element | null {
  const navigate = useNavigate();

  const [mode, setMode] = useState<"upload" | "camera" | "review">("upload");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Loading, Extraction & Result States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractedInvoice, setExtractedInvoice] = useState<N8nUploadedInvoice | null>(null);
  const [storedInvoice, setStoredInvoice] = useState<Invoice | null>(null);

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
      setCameraError("Camera access unavailable. Please choose a text-based PDF file.");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadError(null);
    setExtractedInvoice(null);
    setStoredInvoice(null);
    setIsUploading(true);
    setMode("review");
    stopCamera();

    // Generate local preview if possible
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Execute n8n upload endpoint: POST https://ksjamwal.app.n8n.cloud/webhook/invoice-upload
      // Field name in FormData is exactly "data"
      const result = await uploadInvoiceToN8n(file);

      if (result && result.status === "ready") {
        setExtractedInvoice(result);

        // Save invoice_number, payer_name, amount, currency, due_date with status="ready" in database
        const saved = saveN8nExtractedInvoice(result, file.name);
        setStoredInvoice(saved);
        onInvoiceStored?.(saved);
      } else {
        throw new Error("Could not read this invoice. Please upload a text-based PDF.");
      }
    } catch (err: any) {
      console.error("n8n invoice upload failed:", err);
      setUploadError("Could not read this invoice. Please upload a text-based PDF.");
    } finally {
      setIsUploading(false);
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
      stopCamera();
      setFileName("camera-capture.jpg");
      setCapturedPreview(canvas.toDataURL("image/jpeg", 0.9));
      setUploadError(null);
      setIsUploading(true);
      setMode("review");

      try {
        const result = await uploadInvoiceToN8n(blob);
        if (result && result.status === "ready") {
          setExtractedInvoice(result);
          const saved = saveN8nExtractedInvoice(result, "camera-capture.jpg");
          setStoredInvoice(saved);
          onInvoiceStored?.(saved);
        } else {
          throw new Error("Could not read this invoice. Please upload a text-based PDF.");
        }
      } catch (err) {
        setUploadError("Could not read this invoice. Please upload a text-based PDF.");
      } finally {
        setIsUploading(false);
      }
    }, "image/jpeg", 0.9);
  };

  const handleReset = () => {
    setCapturedPreview(null);
    setFileName("");
    setExtractedInvoice(null);
    setStoredInvoice(null);
    setUploadError(null);
    setIsUploading(false);
    setMode("upload");
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
                n8n Invoice Upload
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Webhook
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload your PDF invoice to extract and save details directly into your database.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Important Requirement Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">Text-based PDF Requirement: </span>
              <span>Only text-based PDFs work with the extraction workflow. Scanned image PDFs return empty text.</span>
            </div>
          </div>

          {/* Mode Switcher */}
          {mode !== "review" && (
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode("upload");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === "upload"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Upload PDF File
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("camera");
                  startCamera();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === "camera"
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Live Camera
              </button>
            </div>
          )}

          {/* UPLOAD MODE */}
          {mode === "upload" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 hover:bg-teal-50/20 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drop your text-based PDF invoice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Dispatches directly to n8n webhook (POST /webhook/invoice-upload) in multipart/form-data field "data".
              </p>
              <button
                type="button"
                className="mt-4 px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors"
              >
                Choose PDF File
              </button>
            </div>
          )}

          {/* CAMERA MODE */}
          {mode === "camera" && (
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Use PDF File Instead
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all tap-target"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & Send to n8n</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* REVIEW & EXTRACTION RESULT VIEW */}
          {mode === "review" && (
            <div className="space-y-4">
              {/* LOADING STATE */}
              {isUploading && (
                <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Uploading to n8n Webhook
                    </h3>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
                      Extracting invoice data... Extraction can take several seconds.
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sending PDF via multipart/form-data field "data" to /webhook/invoice-upload
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

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Upload Another Text-Based PDF</span>
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
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100"
                    >
                      Upload Another
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate("/invoices");
                      }}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
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
