import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, PenTool,
  RotateCcw, Sparkles, Smartphone, Check, FileText, ChevronDown,
  ChevronUp, Info, HelpCircle, Maximize2, X, Eye, Printer, LayoutGrid
} from "lucide-react";
import { ChecklistData, AvariasDiagram } from "../types";

export interface ChecklistInspectionProps {
  tipoDocumento: "os" | "orcamento";
  onChangeTipoDocumento: (tipo: "os" | "orcamento") => void;
  ficarNaAssistencia: boolean;
  onChangeFicarNaAssistencia: (ficar: boolean) => void;
  storageGb: string;
  onChangeStorageGb: (gb: string) => void;
  senhaDesbloqueio: string;
  onChangeSenhaDesbloqueio: (senha: string) => void;
  padraoDesbloqueio: string;
  onChangePadraoDesbloqueio: (padrao: string) => void;
  checklist: ChecklistData;
  onChangeChecklist: (data: ChecklistData) => void;
  avarias: AvariasDiagram;
  onChangeAvarias: (data: AvariasDiagram) => void;
  assinaturaCliente?: string;
  onChangeAssinaturaCliente: (dataUrl: string) => void;
  termoAceito: boolean;
  onChangeTermoAceito: (aceito: boolean) => void;
  garantiaDias?: string;
  onChangeGarantiaDias?: (dias: string) => void;
  readOnly?: boolean;
  onOpenPreview?: () => void;
}

const CHECKLIST_ITEMS = [
  { key: "telaDisplay", label: "Tela de Display (Imagem/Manchas)", icon: "📺" },
  { key: "touchScreen", label: "Touch Screen (Sensibilidade ao toque)", icon: "👆" },
  { key: "teclas", label: "Teclas (Power e Volume)", icon: "🔘" },
  { key: "sensores", label: "Sensores de Proximidade / Luminosidade", icon: "👁️" },
  { key: "bluetooth", label: "Bluetooth", icon: "📶" },
  { key: "wifi", label: "Wi-Fi (Conexão e alcance)", icon: "🌐" },
  { key: "ligacoes", label: "Ligações (Alto-falante, Viva-Voz e Mic)", icon: "📞" },
  { key: "cameras", label: "Câmeras (Frontal e Traseira)", icon: "📷" },
  { key: "carregamento", label: "Conector de Carga / Carregamento", icon: "⚡" },
  { key: "biometriaFaceId", label: "Biometria / Face ID / Touch ID", icon: "🔒" },
  { key: "tampaTraseira", label: "Tampa Traseira e Carcaça", icon: "🛡️" },
];

const STORAGE_OPTIONS = ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];

export default function ChecklistInspection({
  tipoDocumento,
  onChangeTipoDocumento,
  ficarNaAssistencia,
  onChangeFicarNaAssistencia,
  storageGb,
  onChangeStorageGb,
  senhaDesbloqueio,
  onChangeSenhaDesbloqueio,
  padraoDesbloqueio,
  onChangePadraoDesbloqueio,
  checklist,
  onChangeChecklist,
  avarias,
  onChangeAvarias,
  assinaturaCliente,
  onChangeAssinaturaCliente,
  termoAceito,
  onChangeTermoAceito,
  garantiaDias = "90",
  onChangeGarantiaDias,
  readOnly = false,
  onOpenPreview
}: ChecklistInspectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"todos" | "checklist" | "avarias" | "desbloqueio" | "assinatura">("todos");
  
  // Fullscreen Signature Modal
  const [fullscreenSignatureOpen, setFullscreenSignatureOpen] = useState(false);

  // In-line Signature Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingModal, setIsDrawingModal] = useState(false);

  // Pattern Lock (3x3 grid) - Nodes 1 to 9
  const patternPoints = padraoDesbloqueio
    ? padraoDesbloqueio.split("-").map(n => parseInt(n, 10)).filter(n => !isNaN(n))
    : [];

  const handleNodeClick = (nodeNum: number) => {
    if (readOnly) return;
    if (patternPoints.includes(nodeNum)) {
      // Remove this point and following
      const newPoints = patternPoints.filter(p => p !== nodeNum);
      onChangePadraoDesbloqueio(newPoints.join("-"));
    } else {
      const newPoints = [...patternPoints, nodeNum];
      onChangePadraoDesbloqueio(newPoints.join("-"));
    }
  };

  const clearPattern = () => {
    if (readOnly) return;
    onChangePadraoDesbloqueio("");
  };

  // Checklist Item Toggle
  const handleItemValueChange = (key: string, val: "sim" | "nao" | "nao_testado") => {
    if (readOnly) return;
    onChangeChecklist({
      ...checklist,
      [key]: val
    });
  };

  const markAllSim = () => {
    if (readOnly) return;
    const updated: ChecklistData = {};
    CHECKLIST_ITEMS.forEach(item => {
      updated[item.key] = "sim";
    });
    onChangeChecklist({ ...checklist, ...updated });
  };

  const markAllNaoTestado = () => {
    if (readOnly) return;
    const updated: ChecklistData = {};
    CHECKLIST_ITEMS.forEach(item => {
      updated[item.key] = "nao_testado";
    });
    onChangeChecklist({ ...checklist, ...updated });
  };

  // Avarias toggle
  const toggleAvaria = (part: "lado1" | "lado2" | "frente" | "traseira" | "superior" | "inferior") => {
    if (readOnly) return;
    onChangeAvarias({
      ...avarias,
      [part]: !avarias[part]
    });
  };

  // Canvas drawing handlers (In-line)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (assinaturaCliente) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = assinaturaCliente;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [assinaturaCliente, activeTab, isExpanded]);

  // Modal Canvas handler
  useEffect(() => {
    if (!fullscreenSignatureOpen) return;
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (assinaturaCliente) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = assinaturaCliente;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [fullscreenSignatureOpen, assinaturaCliente]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, targetCanvas: HTMLCanvasElement) => {
    const rect = targetCanvas.getBoundingClientRect();
    const scaleX = targetCanvas.width / rect.width;
    const scaleY = targetCanvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChangeAssinaturaCliente(dataUrl);
  };

  const clearSignature = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const modalCanvas = modalCanvasRef.current;
    if (modalCanvas) {
      const mctx = modalCanvas.getContext("2d");
      if (mctx) mctx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
    }
    onChangeAssinaturaCliente("");
  };

  // Modal drawing handlers
  const startDrawingModal = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    setIsDrawingModal(true);
  };

  const drawModal = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingModal) return;
    e.preventDefault();
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingModal = () => {
    if (!isDrawingModal) return;
    setIsDrawingModal(false);
  };

  const handleConfirmModalSignature = () => {
    const canvas = modalCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      onChangeAssinaturaCliente(dataUrl);
    }
    setFullscreenSignatureOpen(false);
  };

  // Count items inspected
  const totalItems = CHECKLIST_ITEMS.length;
  const simCount = CHECKLIST_ITEMS.filter(i => checklist[i.key] === "sim").length;
  const naoCount = CHECKLIST_ITEMS.filter(i => checklist[i.key] === "nao").length;
  const avariasCount = [
    avarias.lado1, avarias.lado2, avarias.frente,
    avarias.traseira, avarias.superior, avarias.inferior
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Top Banner / Accordion Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 cursor-pointer select-none flex-1"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-black">
            <Smartphone className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-wide">
                Checklist de Entrada & Vistoria Técnica
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                Modelo Oficial
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Estado inicial do aparelho, avarias estéticas, bloqueio de tela e assinatura do cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onOpenPreview && (
            <button
              type="button"
              onClick={onOpenPreview}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Ver Ficha A4</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg border border-emerald-500/30">
              {simCount} OK
            </span>
            {naoCount > 0 && (
              <span className="px-2 py-1 bg-rose-500/20 text-rose-300 font-bold rounded-lg border border-rose-500/30">
                {naoCount} C/ Defeito
              </span>
            )}
            {avariasCount > 0 && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-lg border border-amber-500/30">
                {avariasCount} Avarias
              </span>
            )}
            {assinaturaCliente && (
              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 font-bold rounded-lg border border-indigo-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" /> Assinado
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* 1. DOCUMENT TYPE SELECTOR & STAY STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TIPO: ORÇAMENTO vs ORDEM DE SERVIÇO */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Tipo de Registro
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeTipoDocumento("os")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                    tipoDocumento === "os"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm">ORDEM DE SERVIÇO</span>
                    <input
                      type="radio"
                      name="tipoDoc"
                      checked={tipoDocumento === "os"}
                      onChange={() => {}}
                      className="accent-white"
                    />
                  </div>
                  <span className={`text-[11px] ${tipoDocumento === "os" ? "text-blue-100" : "text-slate-500"}`}>
                    Aparelho para conserto/manutenção
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTipoDocumento("orcamento")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                    tipoDocumento === "orcamento"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm">ORÇAMENTO</span>
                    <input
                      type="radio"
                      name="tipoDoc"
                      checked={tipoDocumento === "orcamento"}
                      onChange={() => {}}
                      className="accent-white"
                    />
                  </div>
                  <span className={`text-[11px] ${tipoDocumento === "orcamento" ? "text-indigo-100" : "text-slate-500"}`}>
                    Avaliação prévia / Laudo técnico
                  </span>
                </button>
              </div>
            </div>

            {/* APARELHO FICA NA LOJA OU NÃO */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                Custódia do Celular (Aparelho fica ou leva?)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeFicarNaAssistencia(true);
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                    ficarNaAssistencia
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm">FICA NA LOJA</span>
                    <span className="text-xs">📥</span>
                  </div>
                  <span className={`text-[11px] ${ficarNaAssistencia ? "text-emerald-100" : "text-slate-500"}`}>
                    Deixou para execução ou bancada
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeFicarNaAssistencia(false);
                    onChangeTipoDocumento("orcamento");
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                    !ficarNaAssistencia
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm">NÃO FICA (LEVA AGORA)</span>
                    <span className="text-xs">🚶</span>
                  </div>
                  <span className={`text-[11px] ${!ficarNaAssistencia ? "text-amber-100" : "text-slate-500"}`}>
                    Fez vistoria/orçamento e levou o celular
                  </span>
                </button>
              </div>
            </div>
          </div>

          {!ficarNaAssistencia && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Orçamento Sem Retenção:</strong> O cliente fará o checklist das condições de entrada para assinar a ficha e levar o celular. O registro ficará salvo no sistema com laudo inicial.
                </span>
              </div>
              {onOpenPreview && (
                <button
                  type="button"
                  onClick={onOpenPreview}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs whitespace-nowrap shadow-xs transition"
                >
                  Gerar Documento P/ Assinar
                </button>
              )}
            </div>
          )}

          {/* 2. SUB-TABS NAV */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("todos")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
                activeTab === "todos"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Visão Completa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("checklist")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
                activeTab === "checklist"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>📋</span> Lista de Checagem ({simCount}/{totalItems} OK)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("avarias")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
                activeTab === "avarias"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🔍</span> Diagrama de Avarias ({avariasCount} marcadas)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("desbloqueio")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
                activeTab === "desbloqueio"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🔢</span> Senha & Padrão 3x3
              {(senhaDesbloqueio || padraoDesbloqueio) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("assinatura")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
                activeTab === "assinatura"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>✍️</span> Termo & Assinatura
              {assinaturaCliente && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            </button>
          </div>

          {/* SECTION A: LISTA DE CHECAGEM (CHECKLIST) */}
          {(activeTab === "todos" || activeTab === "checklist") && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs">
                <div className="text-slate-700">
                  <span className="font-bold text-blue-900">Lista de Checagem: </span>
                  Os itens abaixo estão em condições de utilização no momento da entrada?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={markAllSim}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Marcar Todos Sim (OK)
                  </button>
                  <button
                    type="button"
                    onClick={markAllNaoTestado}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition"
                  >
                    Não Testado
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {CHECKLIST_ITEMS.map((item) => {
                  const currentVal = checklist[item.key] || "nao_testado";
                  return (
                    <div
                      key={item.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                        currentVal === "sim"
                          ? "bg-emerald-50/50 border-emerald-300"
                          : currentVal === "nao"
                          ? "bg-rose-50/60 border-rose-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleItemValueChange(item.key, "sim")}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            currentVal === "sim"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
                          }`}
                        >
                          <Check className="w-3 h-3" /> Sim
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemValueChange(item.key, "nao")}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            currentVal === "nao"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                          }`}
                        >
                          <XCircle className="w-3 h-3" /> Não
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemValueChange(item.key, "nao_testado")}
                          title="Não testado no momento"
                          className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                            currentVal === "nao_testado"
                              ? "bg-slate-300 text-slate-800"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          N/T
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informação adicional de capacidade */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Armazenamento Interno (GB)
                  </span>
                  <p className="text-[11px] text-slate-500">Capacidade do aparelho informada pelo cliente</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STORAGE_OPTIONS.map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => onChangeStorageGb(gb)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        storageGb === gb
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {gb}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={storageGb}
                    onChange={(e) => onChangeStorageGb(e.target.value)}
                    placeholder="Outro GB..."
                    className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: DIAGRAMA DE AVARIAS & DESBLOQUEIO 3X3 */}
          {(activeTab === "todos" || activeTab === "avarias" || activeTab === "desbloqueio") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-200">
              {/* Visual Smartphone Diagram (Assinale com X os locais com avarias) */}
              <div className="lg:col-span-7 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-inner border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Diagrama de Avarias (Toque para Marcar "X")
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Assinale com <strong>"X"</strong> trincos, arranhões, amassados ou peças ausentes
                      </p>
                    </div>
                    {avariasCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {avariasCount} marcada(s)
                      </span>
                    )}
                  </div>

                  {/* Diagram Layout identical to the user's uploaded paper */}
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 py-3">
                    {/* Lateral Esquerda (LADO 1) */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">LADO 1</span>
                      <button
                        type="button"
                        onClick={() => toggleAvaria("lado1")}
                        className={`w-6 sm:w-7 h-32 rounded-md border-2 transition relative flex items-center justify-center ${
                          avarias.lado1
                            ? "bg-rose-500/40 border-rose-500 text-rose-400 shadow-md shadow-rose-900/50 scale-105"
                            : "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-600"
                        }`}
                      >
                        <span className="absolute -left-1 top-4 w-1 h-3 bg-slate-600 rounded-l"></span>
                        <span className="absolute -left-1 top-9 w-1 h-5 bg-slate-600 rounded-l"></span>
                        {avarias.lado1 ? (
                          <span className="text-base font-black text-rose-400">✖</span>
                        ) : (
                          <span className="text-[8px] text-slate-500 font-mono">OK</span>
                        )}
                      </button>
                      <span className="text-[9px] text-slate-400 font-medium">Lat. Esq.</span>
                    </div>

                    {/* Lateral Direita (LADO 2) */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">LADO 2</span>
                      <button
                        type="button"
                        onClick={() => toggleAvaria("lado2")}
                        className={`w-6 sm:w-7 h-32 rounded-md border-2 transition relative flex items-center justify-center ${
                          avarias.lado2
                            ? "bg-rose-500/40 border-rose-500 text-rose-400 shadow-md shadow-rose-900/50 scale-105"
                            : "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-600"
                        }`}
                      >
                        <span className="absolute -right-1 top-6 w-1 h-3 bg-slate-600 rounded-r"></span>
                        {avarias.lado2 ? (
                          <span className="text-base font-black text-rose-400">✖</span>
                        ) : (
                          <span className="text-[8px] text-slate-500 font-mono">OK</span>
                        )}
                      </button>
                      <span className="text-[9px] text-slate-400 font-medium">Lat. Dir.</span>
                    </div>

                    {/* Frente (TELA DISPLAY) */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">FRENTE</span>
                      <button
                        type="button"
                        onClick={() => toggleAvaria("frente")}
                        className={`w-24 sm:w-28 h-32 rounded-xl border-2 transition relative flex flex-col items-center justify-between p-2 ${
                          avarias.frente
                            ? "bg-rose-500/30 border-rose-500 text-rose-400 shadow-lg shadow-rose-900/50 scale-105"
                            : "bg-slate-800/90 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <div className="w-8 h-1 bg-slate-600 rounded-full"></div>
                        {avarias.frente ? (
                          <div className="text-center">
                            <span className="text-2xl font-black text-rose-400 block">✖</span>
                            <span className="text-[8px] font-extrabold uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded">
                              Avaria Tela
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-400 font-medium">
                            <span>Display / Vidro</span>
                          </div>
                        )}
                        <div className="w-6 h-1 bg-slate-700 rounded-full"></div>
                      </button>
                      <span className="text-[9px] text-slate-400 font-medium">Tela Frontal</span>
                    </div>

                    {/* Traseira (TAMPA & CÂMERA) */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">TRASEIRA</span>
                      <button
                        type="button"
                        onClick={() => toggleAvaria("traseira")}
                        className={`w-24 sm:w-28 h-32 rounded-xl border-2 transition relative flex flex-col items-center justify-between p-2 ${
                          avarias.traseira
                            ? "bg-rose-500/30 border-rose-500 text-rose-400 shadow-lg shadow-rose-900/50 scale-105"
                            : "bg-slate-800/90 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <div className="self-end w-5 h-6 bg-slate-700 border border-slate-600 rounded flex flex-col items-center justify-around py-0.5">
                          <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-500"></div>
                          <div className="w-1 h-1 rounded-full bg-amber-400/80"></div>
                        </div>

                        {avarias.traseira ? (
                          <div className="text-center">
                            <span className="text-2xl font-black text-rose-400 block">✖</span>
                            <span className="text-[8px] font-extrabold uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded">
                              Avaria Traseira
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-400 font-medium">
                            <span>Tampa / Lente</span>
                          </div>
                        )}

                        <div className="text-[8px] text-slate-500 font-mono tracking-tighter">L-TEC</div>
                      </button>
                      <span className="text-[9px] text-slate-400 font-medium">Tampa Traseira</span>
                    </div>
                  </div>

                  {/* Topo e Base (Superior / Inferior) */}
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleAvaria("superior")}
                      className={`p-2 rounded-xl border flex items-center justify-between transition ${
                        avarias.superior
                          ? "bg-rose-500/30 border-rose-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <span className="font-bold text-[11px]">SUPERIOR (Topo)</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${avarias.superior ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                        {avarias.superior ? "✖ Avaria" : "OK"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAvaria("inferior")}
                      className={`p-2 rounded-xl border flex items-center justify-between transition ${
                        avarias.inferior
                          ? "bg-rose-500/30 border-rose-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <span className="font-bold text-[11px]">INFERIOR (Base/Carga)</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${avarias.inferior ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                        {avarias.inferior ? "✖ Avaria" : "OK"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    value={avarias.observacoes || ""}
                    onChange={(e) => onChangeAvarias({ ...avarias, observacoes: e.target.value })}
                    placeholder="Obs específicas de avaria (ex: trinco canto direito, botão volume ausente)..."
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Right Side: 3x3 Pattern Lock & PIN Password (Matches top-right box from photo) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>⭕</span> DESBLOQUEIO DE TELA (3x3)
                      </h4>
                      <p className="text-[10px] text-slate-500">Toque nos círculos na sequência do desenho</p>
                    </div>
                    {patternPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={clearPattern}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Limpar
                      </button>
                    )}
                  </div>

                  {/* 3x3 Circles Matrix matching photo exactly */}
                  <div className="flex justify-center py-1">
                    <div className="p-3 bg-white border-2 border-slate-300 rounded-2xl shadow-xs">
                      <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((nodeNum) => {
                          const indexInSeq = patternPoints.indexOf(nodeNum);
                          const isSelected = indexInSeq > -1;
                          return (
                            <button
                              key={nodeNum}
                              type="button"
                              onClick={() => handleNodeClick(nodeNum)}
                              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 transition flex items-center justify-center font-black text-xs relative ${
                                isSelected
                                  ? "bg-slate-900 border-slate-900 text-white shadow-md scale-105"
                                  : "bg-slate-50 border-slate-300 hover:border-blue-400 text-slate-400 hover:scale-105"
                              }`}
                            >
                              {isSelected ? (
                                <span>{indexInSeq + 1}º</span>
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {patternPoints.length > 0 && (
                    <div className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs font-mono font-bold text-center">
                      Sequência: {patternPoints.join(" ➔ ")}
                    </div>
                  )}

                  {/* Alphanumeric Password / PIN field */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Senha / PIN Alfanumérico
                    </label>
                    <input
                      type="text"
                      value={senhaDesbloqueio}
                      onChange={(e) => onChangeSenhaDesbloqueio(e.target.value)}
                      placeholder="Ex: 123456 ou senha"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION C: TERMO & ASSINATURA DIGITAL DO CLIENTE */}
          {(activeTab === "todos" || activeTab === "assinatura") && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Termo Legal (Exact text from photo) */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Condições do Termo & Garantia (Modelo Oficial)
                  </h4>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="font-bold">Garantia:</span>
                    <input
                      type="text"
                      value={garantiaDias}
                      onChange={(e) => onChangeGarantiaDias && onChangeGarantiaDias(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center font-bold text-blue-700 outline-none"
                    />
                    <span className="font-bold">DIAS</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed font-medium">
                  <p>
                    <strong>1) REPARO REALIZADOS SÃO GARANTIDOS POR:</strong>{" "}
                    <span className="font-bold text-blue-700 underline">{garantiaDias} DIAS</span>.
                  </p>
                  <p>
                    <strong>2)</strong> Os telefones reparados que não forem retirados em 90 dias, após a aprovação do orçamento passarão a ser propriedade da loja, que poderá vendê-los para ressarcir-se dos custos incorridos.
                  </p>
                  <p>
                    <strong>3)</strong> Ao deixar seu celular para reparo, retirar seu chip e cartão de memória. Não nos responsabilizamos por chip e cartão de memória.
                  </p>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 font-bold text-[10px] sm:text-[11px]">
                    A GARANTIA DA PEÇA TROCADA NÃO GARANTE MAU USO, QUEDAS, TRINCOS, PRESSÃO, UMIDADE, OU ABERTO POR TERCEIROS.
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termoAceito}
                      onChange={(e) => onChangeTermoAceito(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                    <span className="font-extrabold text-slate-900 text-xs">
                      Cliente de acordo com as condições acima
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setFullscreenSignatureOpen(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Assinar em Tela Cheia</span>
                  </button>
                </div>
              </div>

              {/* Assinatura no Touch / Canvas */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-blue-600" />
                    Assinatura do Cliente (Dedo ou Caneta na tela)
                  </label>
                  <div className="flex items-center gap-2">
                    {assinaturaCliente && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3" /> Assinado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Limpar
                    </button>
                  </div>
                </div>

                {/* Canvas Box */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 touch-none cursor-crosshair block"
                  />
                  {!assinaturaCliente && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300">
                      <PenTool className="w-5 h-5 mb-1 opacity-40" />
                      <span className="text-xs font-medium">Toque e assine aqui</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Data: {new Date().toLocaleDateString("pt-BR")}</span>
                  <span>Documento oficial de bancada e laudo</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Signature Modal for Mobile/Tablet Counter use */}
      {fullscreenSignatureOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Assinatura do Cliente</h3>
                  <p className="text-[11px] text-slate-300">Por favor, assine com o dedo ou caneta touch no espaço abaixo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenSignatureOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="border-2 border-slate-300 rounded-2xl bg-slate-50/50 p-2 relative shadow-inner">
                <canvas
                  ref={modalCanvasRef}
                  width={700}
                  height={280}
                  onMouseDown={startDrawingModal}
                  onMouseMove={drawModal}
                  onMouseUp={stopDrawingModal}
                  onMouseLeave={stopDrawingModal}
                  onTouchStart={startDrawingModal}
                  onTouchMove={drawModal}
                  onTouchEnd={stopDrawingModal}
                  className="w-full h-56 sm:h-64 bg-white rounded-xl touch-none cursor-crosshair border border-slate-200"
                />
                <div className="absolute bottom-4 left-6 pointer-events-none text-slate-300 text-xs font-semibold">
                  Linha de Assinatura: _________________________________________________
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <strong>Declaração:</strong> Declaro que li e concordo com o checklist de vistoria e com os termos de recebimento e garantia de {garantiaDias} dias.
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const canvas = modalCanvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext("2d");
                      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar Traço
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFullscreenSignatureOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmModalSignature}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Assinatura
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
