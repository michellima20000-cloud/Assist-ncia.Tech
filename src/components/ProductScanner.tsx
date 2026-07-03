import React, { useState, useEffect, useRef } from "react";
import {
  Camera, Barcode, QrCode, Search, Plus, Minus, X, Info, Package, Check, AlertTriangle, RefreshCw
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Produto } from "../types";

interface ProductScannerProps {
  onClose: () => void;
  onProductScanned?: (product: Produto) => void;
  mode?: "view" | "select";
}

export default function ProductScanner({ onClose, onProductScanned, mode = "view" }: ProductScannerProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "device">("camera");
  const [products, setProducts] = useState<Produto[]>([]);
  const [scannedProduct, setScannedProduct] = useState<Produto | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  
  // Camera scanning states
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Stock modifying states
  const [updatingStock, setUpdatingStock] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const qrRegionId = "html5-qrcode-video-stream";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);

  // Fetch products on mount to match barcodes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/produtos");
        if (res.ok) {
          const data = await res.json();
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar produtos para escaneamento:", err);
      }
    };
    fetchProducts();
  }, []);

  // Handle auto-focus for Device tab
  useEffect(() => {
    if (activeTab === "device" && deviceInputRef.current) {
      deviceInputRef.current.focus();
    }
  }, [activeTab]);

  // Handle html5-qrcode initialization and teardown
  useEffect(() => {
    let isMounted = true;

    // Check camera permission and start scanning
    const startCamera = async () => {
      if (activeTab !== "camera") return;
      
      try {
        setCameraPermission("pending");
        setCameraError(null);

        // Stop any running camera instances first
        await stopCamera();

        if (!isMounted) return;

        // Instantiating html5-qrcode
        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        try {
          // Attempt using back camera (environment) first
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              if (isMounted) {
                handleCodeDetected(decodedText);
              }
            },
            () => {}
          );
        } catch (envErr) {
          console.warn("Could not start camera with environment facingMode, trying user/default camera:", envErr);
          if (!isMounted) return;
          
          // Fallback to user facingMode (such as webcam on a PC or laptop)
          await html5QrCode.start(
            { facingMode: "user" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              if (isMounted) {
                handleCodeDetected(decodedText);
              }
            },
            () => {}
          );
        }

        if (isMounted) {
          setCameraPermission("granted");
          setScannerActive(true);
        }
      } catch (err: any) {
        console.error("Erro ao iniciar leitor de câmera:", err);
        if (isMounted) {
          setCameraPermission("denied");
          setCameraError(
            "Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou digite o código manualmente na aba ao lado."
          );
        }
      }
    };

    // Small delay to ensure container element is rendered
    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [activeTab]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
          console.log("Câmera do scanner finalizada com sucesso.");
        } catch (err) {
          console.error("Erro ao finalizar câmera do scanner:", err);
        }
      }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  // Look up scanned code in existing products
  const handleCodeDetected = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // First try matching barcode, then try matching product ID directly, and finally try custom code if present
    const found = products.find(
      (p: any) => 
        p.barcode?.toLowerCase() === trimmed.toLowerCase() || 
        p.id.toLowerCase() === trimmed.toLowerCase() ||
        p.code?.toLowerCase() === trimmed.toLowerCase()
    );

    if (found) {
      setScannedProduct(found);
      setNotFoundCode(null);
      setScanMessage(`Produto "${found.name}" detectado com sucesso!`);
      setTimeout(() => setScanMessage(null), 3000);

      // In select mode, if parent provided callback, automatically trigger it
      if (mode === "select" && onProductScanned) {
        onProductScanned(found);
        onClose();
      }
    } else {
      setScannedProduct(null);
      setNotFoundCode(trimmed);
    }
  };

  // Handle manual code submit or physical device input Enter
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeDetected(manualCode.trim());
      setManualCode("");
    }
  };

  // Quick adjust stock via backend
  const handleAdjustStock = async (amount: number) => {
    if (!scannedProduct) return;
    setUpdatingStock(true);
    
    try {
      const newStock = Math.max(0, scannedProduct.stock + amount);
      const res = await fetch(`/api/produtos/${scannedProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock })
      });

      if (res.ok) {
        const updated = await res.json();
        setScannedProduct(updated);
        // Update product in local lists
        setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        alert("Erro ao atualizar estoque.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStock(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-w-4xl w-full mx-auto max-h-[90vh]">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-[#1E88E5]" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Scanner de QR Code & Código de Barras</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Consulte, altere estoque ou adicione peças rapidamente</p>
          </div>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/50 p-1 shrink-0 border-b border-slate-100">
        <button
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "camera"
              ? "bg-white text-[#1E88E5] shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <Camera className="w-4 h-4" />
          Usar Câmera (Celular/PC)
        </button>
        <button
          onClick={() => setActiveTab("device")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "device"
              ? "bg-white text-[#1E88E5] shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <Barcode className="w-4 h-4" />
          Leitor Físico / Digitar
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5 min-h-0">
        
        {/* Left Side: Scanner / Inputs Area */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden min-h-[300px]">
          
          {/* CAMERA TAB */}
          {activeTab === "camera" && (
            <div className="space-y-3 h-full flex flex-col justify-between">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-700">Leitor Óptico Ativo</p>
                <p className="text-[10px] text-slate-500">Posicione o código de barras ou QR Code frente à câmera</p>
              </div>

              {/* QR Container Frame */}
              <div className="relative mx-auto my-3 w-56 h-56 rounded-2xl overflow-hidden border-2 border-[#1E88E5]/50 bg-black flex items-center justify-center shadow-inner">
                <div id={qrRegionId} className="w-full h-full object-cover" />
                
                {/* Laser Overlay Animation */}
                {scannerActive && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-bounce" />
                )}
                
                {cameraPermission === "pending" && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-3 text-center">
                    <RefreshCw className="w-8 h-8 text-[#1E88E5] animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Acessando Câmera...</span>
                  </div>
                )}

                {cameraPermission === "denied" && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider mb-1">Câmera Bloqueada</span>
                    <p className="text-[9px] text-slate-400">Permissão não concedida ou bloqueada pelo iframe. Por favor, utilize a aba Leitor Físico / Digitar ao lado para buscar manualmente!</p>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-400 font-semibold">
                Dica: Ative a rotação de tela do celular e posicione de forma estável.
              </div>
            </div>
          )}

          {/* DEVICE TAB */}
          {activeTab === "device" && (
            <div className="space-y-4 text-center h-full flex flex-col justify-center p-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 text-[#1E88E5] flex items-center justify-center">
                <Barcode className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Conectar Leitor Físico / Digitar Código</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Leitores de código USB ou Bluetooth funcionam como teclados. Deixe o campo abaixo focado e realize a leitura física.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-2 max-w-sm mx-auto w-full">
                <input
                  ref={deviceInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Aponte o leitor de dispositivo ou digite..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E88E5]"
                />
                <button
                  type="submit"
                  className="w-full bg-[#1E88E5] hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                >
                  Consultar Código
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Results & Actions */}
        <div className="flex flex-col justify-between border border-slate-150 rounded-2xl p-5 min-h-[300px]">
          
          {scanMessage && (
            <div className="mb-3 p-2 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg text-center flex items-center justify-center gap-1.5 animate-bounce">
              <Check className="w-3.5 h-3.5" />
              <span>{scanMessage}</span>
            </div>
          )}

          {scannedProduct ? (
            <div className="space-y-4 h-full flex flex-col justify-between">
              
              {/* Product Info Block */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-[#1E88E5]/10 text-[#1E88E5] rounded-xl shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Identificado
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-800 mt-1 leading-tight">
                      {scannedProduct.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {scannedProduct.description || "Sem descrição cadastrada."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 border-y border-slate-100 py-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preço de Venda</span>
                    <p className="text-sm font-black text-slate-800 mt-0.5 font-mono">R$ {scannedProduct.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código de Barras</span>
                    <p className="text-xs font-bold text-slate-600 mt-0.5 font-mono">{scannedProduct.barcode || (scannedProduct as any).code || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Posição</span>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5 font-mono">Prateleira: {scannedProduct.position}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Estoque</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] mt-1 ${
                      scannedProduct.stock <= scannedProduct.minStockAlert
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-emerald-50 text-emerald-700"
                    }`}>
                      Qtd: {scannedProduct.stock} {scannedProduct.stock <= scannedProduct.minStockAlert && "(BAIXO)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code display - printable & scanable! */}
              {(scannedProduct.barcode || (scannedProduct as any).code) && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-[10px] font-extrabold text-slate-700 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-blue-500" />
                      QR Code do Produto
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Imprima esta etiqueta QR para colar na peça para leitura em bancada.
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-sm shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scannedProduct.barcode || (scannedProduct as any).code)}`}
                      className="w-full h-full object-contain"
                      alt="Etiqueta QR"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              {/* Action zone */}
              <div className="space-y-2">
                {mode === "view" ? (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Controle Expresso de Estoque</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAdjustStock(-1)}
                        disabled={updatingStock || scannedProduct.stock <= 0}
                        className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        Retirar 1
                      </button>
                      <button
                        onClick={() => handleAdjustStock(1)}
                        disabled={updatingStock}
                        className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar 1
                      </button>
                    </div>
                  </div>
                ) : (
                  onProductScanned && (
                    <button
                      onClick={() => {
                        onProductScanned(scannedProduct);
                        onClose();
                      }}
                      className="w-full bg-[#1E88E5] hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Selecionar e Vincular à OS
                    </button>
                  )
                )}
              </div>

            </div>
          ) : notFoundCode ? (
            <div className="space-y-4 text-center h-full flex flex-col justify-center p-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Código não encontrado</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  O código lido <strong className="font-mono text-slate-700">"{notFoundCode}"</strong> não está associado a nenhum produto cadastrado no estoque.
                </p>
              </div>
              <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Você pode vincular este código a um produto existente no painel Admin de produtos inserindo o código <span className="font-mono font-bold text-slate-700">{notFoundCode}</span> no campo "Código de Barras".
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-center h-full flex flex-col justify-center items-center py-10">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <Barcode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Aguardando Leitura</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Realize o escaneamento na aba esquerda para visualizar os dados e ações do produto.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
