import React, { useState, useEffect, useRef } from "react";
import {
  Camera, X, RefreshCw, Check, AlertCircle, Sparkles, Image as ImageIcon, Zap, FlipHorizontal
} from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  currentCount: number;
  maxCount: number;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  currentCount,
  maxCount
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashAnimation, setFlashAnimation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check available video devices
  useEffect(() => {
    if (!isOpen) return;
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Start camera stream
  const startCamera = async (mode: "environment" | "user") => {
    setLoading(true);
    setError(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta captura direta de vídeo. Use a opção de arquivo/galeria.");
      }

      // Constraints optimized for speed and stability on mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // If ideal facingMode failed, try fallback with generic video
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "Não foi possível acessar a câmera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Permissão de câmera negada. Por favor, autorize o acesso à câmera nas configurações do navegador.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Nenhuma câmera foi encontrada no seu dispositivo.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "A câmera já está sendo usada por outro aplicativo ou aba.";
      }
      setError(msg);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      startCamera(facingMode);
    } else {
      // Teardown when closing
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  // Switch between front and back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Capture frame from video
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    // Max resolution 1200px to ensure ultra lightweight base64
    const maxDim = 1200;
    let targetW = width;
    let targetH = height;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((height * maxDim) / width);
        targetW = maxDim;
      } else {
        targetW = Math.round((width * maxDim) / height);
        targetH = maxDim;
      }
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front camera, unmirror the image so text isn't reversed
    if (facingMode === "user") {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, targetW, targetH);

    // Visual flash
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    setCapturedPreview(dataUrl);
  };

  // Confirm photo and save
  const handleConfirmPhoto = () => {
    if (capturedPreview) {
      onCapture(capturedPreview);
      setCapturedPreview(null);
      // If we haven't reached max count, stay open so user can snap more photos
      if (currentCount + 1 >= maxCount) {
        onClose();
      }
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPreview(null);
    if (videoRef.current && stream) {
      videoRef.current.play().catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wide text-white">Câmera do Equipamento</h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                Foto {currentCount} de {maxCount} (captura direta sem sair da tela)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasMultipleCameras && !capturedPreview && (
              <button
                type="button"
                onClick={handleToggleCamera}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold flex items-center gap-1"
                title="Trocar Câmera (Traseira / Frontal)"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Fechar Câmera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Viewfinder / Preview Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[380px] overflow-hidden">
          {/* Flash screen overlay */}
          {flashAnimation && (
            <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200 pointer-events-none opacity-80" />
          )}

          {/* Error display */}
          {error ? (
            <div className="p-6 text-center max-w-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-red-300 leading-snug">{error}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
              </button>
            </div>
          ) : capturedPreview ? (
            /* Frozen captured preview */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPreview}
                alt="Foto Capturada"
                className="max-h-[380px] max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-500/90 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                <Check className="w-3 h-3" /> Foto Capturada!
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[420px] ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 gap-2 z-20">
                  <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
                  <span className="text-xs font-bold text-slate-300">Iniciando câmera...</span>
                </div>
              )}

              {/* Viewfinder crosshairs / frame guidelines */}
              {!loading && (
                <div className="absolute inset-6 border-2 border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                    <span className="w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                  </div>
                  <div className="text-center">
                    <span className="bg-black/50 text-white/80 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                      Enquadre o aparelho ou defeito
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                    <span className="w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                  </div>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3">
          {capturedPreview ? (
            /* Confirm or Retake */
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tirar Outra
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Usar Esta Foto
              </button>
            </>
          ) : (
            /* Live Camera Controls */
            <div className="w-full flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 font-medium">
                {facingMode === "environment" ? "Câmera Traseira" : "Câmera Frontal"}
              </div>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnap}
                disabled={loading || !!error}
                className={`w-14 h-14 rounded-full border-4 border-white/80 p-1 flex items-center justify-center transition-all ${
                  loading || error
                    ? "opacity-50 cursor-not-allowed bg-slate-700"
                    : "bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
                }`}
                title="Tirar Foto"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600">
                  <Camera className="w-5 h-5" />
                </div>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-slate-400 hover:text-white font-bold transition py-2 px-3 rounded-lg hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
