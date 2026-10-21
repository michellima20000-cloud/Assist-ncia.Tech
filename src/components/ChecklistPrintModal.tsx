import React, { useRef, useState } from "react";
import { X, Printer, Share2, Smartphone, ShieldCheck, Check, PenTool, RotateCcw } from "lucide-react";
import { Atendimento, Cliente, ChecklistData, AvariasDiagram } from "../types";

interface ChecklistPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  atendimento: Partial<Atendimento>;
  cliente?: Cliente | null;
  onPrintThermal?: (content: string) => void;
  onUpdateSignature?: (signatureDataUrl: string) => void;
}

const CHECKLIST_ITEMS_DEF = [
  { key: "telaDisplay", label: "Tela de Display" },
  { key: "touchScreen", label: "Touch Screen" },
  { key: "teclas", label: "Teclas (Power/Vol)" },
  { key: "sensores", label: "Sensores de proximidade" },
  { key: "bluetooth", label: "Bluetooth" },
  { key: "wifi", label: "Wi-fi" },
  { key: "ligacoes", label: "Ligações (Mic/Som)" },
  { key: "cameras", label: "Câmeras (Front/Tras)" },
  { key: "carregamento", label: "Conector de Carga" },
  { key: "biometriaFaceId", label: "Biometria / Face ID" },
  { key: "tampaTraseira", label: "Tampa / Carcaça" },
];

export default function ChecklistPrintModal({
  isOpen,
  onClose,
  atendimento,
  cliente,
  onPrintThermal,
  onUpdateSignature
}: ChecklistPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const signCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  if (!isOpen) return null;

  const isOrcamento = atendimento.tipoDocumento === "orcamento";
  const cl = atendimento.checklist || {};
  const av = atendimento.avarias || {};
  const patternPoints = atendimento.padraoDesbloqueio
    ? String(atendimento.padraoDesbloqueio).split(/[-,\s]/).map(n => parseInt(n, 10)).filter(n => !isNaN(n))
    : [];

  const handlePrintA4 = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const phone = cliente?.phone?.replace(/\D/g, "");
    if (!phone) {
      alert("Telefone do cliente não cadastrado.");
      return;
    }
    const checkSummary = CHECKLIST_ITEMS_DEF
      .map(item => `${item.label}: ${cl[item.key] === "sim" ? "✅ OK" : cl[item.key] === "nao" ? "❌ Defeito" : "⚪ N/T"}`)
      .join("\n");

    const text = `*${isOrcamento ? "FICHA DE ORÇAMENTO & VISTORIA TÉCNICA" : "COMPROVANTE DE ENTRADA & CHECKLIST"}*
L-Tec Assistência Técnica

*Nº Controle:* ${atendimento.controlNumber || "S/N"}
*Data de Entrada:* ${new Date(atendimento.entryDate || Date.now()).toLocaleDateString("pt-BR")}
*Cliente:* ${cliente?.name || "Cliente"}
*Equipamento:* ${atendimento.item || "Celular"} ${atendimento.brand || ""} ${atendimento.model || ""}
*Capacidade:* ${atendimento.storageGb || "N/I"}
*IMEI:* ${atendimento.imei || "N/I"}
*Defeito Relatado:* ${atendimento.defeito || "Avaliação de bancada"}

*LISTA DE CHECAGEM (CHECKLIST):*
${checkSummary}

*Custódia:* ${atendimento.ficarNaAssistencia ? "Aparelho na assistência técnica" : "Aparelho retirado pelo cliente (somente orçamento)"}
*Valor Total Orçado:* R$ ${(Number(atendimento.totalAmount) || 0).toFixed(2)}
*Garantia da Loja:* ${atendimento.garantia || "90 dias"}

${atendimento.assinaturaCliente ? "✅ Assinatura digital do cliente registrada no sistema." : ""}`;

    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handlePrintThermalSlip = () => {
    if (!onPrintThermal) return;
    const checkSummary = CHECKLIST_ITEMS_DEF
      .map(item => `${item.label.substring(0, 16)}: [${cl[item.key] === "sim" ? "SIM" : cl[item.key] === "nao" ? "NAO" : "NT"}]`)
      .join("\n");

    const ticket = `================================
${isOrcamento ? "  FICHA DE ORCAMENTO / LAUDO  " : " COMPROVANTE DE ENTRADA / OS  "}
================================
CONTROLE: ${atendimento.controlNumber || ""}
DATA: ${new Date(atendimento.entryDate || Date.now()).toLocaleString("pt-BR")}
CLIENTE: ${cliente?.name || ""}
FONE: ${cliente?.phone || ""}
--------------------------------
EQUIPAMENTO:
${atendimento.item || "Celular"} ${atendimento.brand || ""} ${atendimento.model || ""}
IMEI: ${atendimento.imei || "N/A"}
GB: ${atendimento.storageGb || "N/A"}
SENHA/PIN: ${atendimento.senhaDesbloqueio || "Nao inf."}
PADRAO 3X3: ${patternPoints.length > 0 ? patternPoints.join("-") : "Nenhum"}
--------------------------------
LISTA DE CHECAGEM (CHECKLIST):
${checkSummary}
--------------------------------
AVARIAS ESTETICAS:
FRENTE: ${av.frente ? "[X] AVARIA" : "[ ] OK"}
TRASEIRA: ${av.traseira ? "[X] AVARIA" : "[ ] OK"}
LATERAL ESQ: ${av.lado1 ? "[X] AVARIA" : "[ ] OK"}
LATERAL DIR: ${av.lado2 ? "[X] AVARIA" : "[ ] OK"}
${av.observacoes ? `OBS: ${av.observacoes}\n` : ""}--------------------------------
CUSTODIA: ${atendimento.ficarNaAssistencia ? "FICOU NA LOJA" : "NAO FICOU (LEVA AGORA)"}
TOTAL ESTIMADO: R$ ${(Number(atendimento.totalAmount) || 0).toFixed(2)}
GARANTIA: ${atendimento.garantia || "90 dias"}
--------------------------------
TERMO:
Garantia nao cobre mau uso, quedas,
trincos, umidade ou abertura por terceiros.
Aparelhos nao retirados em 90 dias
serao considerados abandonados.

ASSINATURA CLIENTE:
${atendimento.assinaturaCliente ? "[ASSINATURA DIGITAL REGISTRADA]" : "________________________________"}
Cliente de acordo com as condicoes.`;

    onPrintThermal(ticket);
  };

  // Quick signature drawing within print modal
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveQuickSignature = () => {
    const canvas = signCanvasRef.current;
    if (canvas && onUpdateSignature) {
      const dataUrl = canvas.toDataURL("image/png");
      onUpdateSignature(dataUrl);
      atendimento.assinaturaCliente = dataUrl;
    }
    setSigningModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Print-specific style tag ensuring pristine single-page A4 rendering */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-checklist-sheet, #printable-checklist-sheet * {
            visibility: visible !important;
          }
          #printable-checklist-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Header - Hidden in Print */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isOrcamento ? "Ficha de Orçamento & Vistoria Técnica" : "Ficha de Entrada & Checklist de O.S."}
              </h3>
              <p className="text-xs text-slate-300">
                Modelo impresso idêntico à folha física de bancada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!atendimento.assinaturaCliente && onUpdateSignature && (
              <button
                type="button"
                onClick={() => setSigningModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <PenTool className="w-3.5 h-3.5" />
                Assinar na Tela
              </button>
            )}

            <button
              onClick={handlePrintA4}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir A4 / PDF
            </button>

            {onPrintThermal && (
              <button
                onClick={handlePrintThermalSlip}
                className="hidden sm:flex px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold items-center gap-1.5 transition"
              >
                <span>🧾</span> Cupom Térmico
              </button>
            )}

            {cliente?.phone && (
              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (Styled exactly like the uploaded image) */}
        <div
          id="printable-checklist-sheet"
          ref={printAreaRef}
          className="p-4 sm:p-6 overflow-y-auto bg-white text-black font-sans leading-tight print:p-2"
        >
          <div className="border-2 border-black rounded-xl p-3 sm:p-4 space-y-3">
            {/* Top Row: Checkboxes ORÇAMENTO vs ORDEM DE SERVIÇO */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-6 text-sm sm:text-base font-black tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-black flex items-center justify-center font-black text-xs">
                    {isOrcamento ? "X" : ""}
                  </span>
                  <span>ORÇAMENTO</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-black flex items-center justify-center font-black text-xs">
                    {!isOrcamento ? "X" : ""}
                  </span>
                  <span>ORDEM DE SERVIÇO</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Nº CONTROLE</span>
                <span className="text-base font-black font-mono">{atendimento.controlNumber || "0001"}</span>
              </div>
            </div>

            {/* Client and Phone Info Box with 3x3 Pattern Lock on Right */}
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-8 space-y-1.5 text-xs font-semibold">
                <div className="flex items-baseline gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Nome:</span>
                  <span className="font-normal uppercase flex-1">{cliente?.name || "Não informado"}</span>
                </div>

                <div className="flex items-baseline gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">RG/CPF:</span>
                  <span className="font-normal flex-1">{cliente?.cpf || cliente?.cnpj || "Não informado"}</span>
                  <span className="font-bold ml-2">Fone:</span>
                  <span className="font-normal">{cliente?.phone || "Não informado"}</span>
                </div>

                <div className="flex items-baseline gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Data de Entrada:</span>
                  <span className="font-normal">
                    {new Date(atendimento.entryDate || Date.now()).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="font-bold ml-3">Marca/Modelo:</span>
                  <span className="font-normal uppercase flex-1">
                    {atendimento.brand || ""} {atendimento.model || ""}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Senha:</span>
                  <span className="font-mono font-bold">{atendimento.senhaDesbloqueio || "N/I"}</span>
                  <span className="font-bold ml-2">IMEI:</span>
                  <span className="font-mono text-[11px]">{atendimento.imei || "N/I"}</span>
                  <span className="font-bold ml-2">GB:</span>
                  <span className="font-bold">{atendimento.storageGb || "N/I"}</span>
                </div>
              </div>

              {/* 3x3 Desbloqueio Box (Matches image top-right) */}
              <div className="col-span-4 border-2 border-black rounded-xl p-2 flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-tight text-center mb-1">
                  DESBLOQUEIO DE TELA
                </span>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 p-0.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                    const idx = patternPoints.indexOf(dot);
                    const isSelected = idx > -1;
                    return (
                      <div
                        key={dot}
                        className={`w-5 h-5 rounded-full border-2 border-black flex items-center justify-center font-bold text-[9px] ${
                          isSelected ? "bg-black text-white" : "bg-white"
                        }`}
                      >
                        {isSelected ? idx + 1 : ""}
                      </div>
                    );
                  })}
                </div>
                {patternPoints.length > 0 && (
                  <span className="text-[8px] font-mono font-bold mt-1">
                    Seq: {patternPoints.join("-")}
                  </span>
                )}
              </div>
            </div>

            {/* Main Inspection Section: LISTA DE CHECAGEM (CHECKLIST) */}
            <div className="border-2 border-black rounded-xl overflow-hidden">
              <div className="bg-slate-100 border-b-2 border-black p-1.5 text-center font-black text-xs sm:text-sm tracking-wider uppercase">
                LISTA DE CHECAGEM (CHECKLIST)
              </div>

              <div className="grid grid-cols-12 divide-x-2 divide-black">
                {/* Left: Questions list */}
                <div className="col-span-7 p-2.5 space-y-1 text-xs">
                  <div className="font-bold mb-1 pb-1 border-b border-black text-[11px]">
                    Os itens abaixo estão em condições de utilização?
                  </div>

                  {CHECKLIST_ITEMS_DEF.map((item) => {
                    const val = cl[item.key] || "nao_testado";
                    return (
                      <div key={item.key} className="flex items-center justify-between py-0.5 border-b border-dotted border-slate-300">
                        <span className="font-medium text-[11px] text-slate-900">
                          {item.label} .........................
                        </span>
                        <div className="flex items-center gap-3 font-bold text-[11px]">
                          <span>( {val === "sim" ? "X" : " "} ) Sim</span>
                          <span>( {val === "nao" ? "X" : " "} ) Não</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Visual Inspection Smartphone Diagram */}
                <div className="col-span-5 p-2.5 flex flex-col justify-between">
                  <div className="text-[9px] font-black uppercase text-center mb-1">
                    assinale com "X" os locais com possíveis avarias
                  </div>

                  <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                    {/* LADO 1 */}
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold">LADO 1</span>
                      <div className={`w-3.5 h-20 border-2 border-black rounded-xs flex items-center justify-center text-[11px] font-black ${av.lado1 ? "bg-slate-200" : ""}`}>
                        {av.lado1 ? "X" : ""}
                      </div>
                    </div>

                    {/* LADO 2 */}
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold">LADO 2</span>
                      <div className={`w-3.5 h-20 border-2 border-black rounded-xs flex items-center justify-center text-[11px] font-black ${av.lado2 ? "bg-slate-200" : ""}`}>
                        {av.lado2 ? "X" : ""}
                      </div>
                    </div>

                    {/* FRENTE */}
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold">FRENTE</span>
                      <div className={`w-14 h-20 border-2 border-black rounded-md flex flex-col items-center justify-between p-1 ${av.frente ? "bg-slate-200" : ""}`}>
                        <div className="w-4 h-0.5 bg-black rounded-full"></div>
                        {av.frente ? <span className="font-black text-sm">X</span> : null}
                        <div className="w-2.5 h-0.5 bg-black rounded-full"></div>
                      </div>
                    </div>

                    {/* TRASEIRA */}
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-bold">TRASEIRA</span>
                      <div className={`w-14 h-20 border-2 border-black rounded-md flex flex-col items-center justify-between p-1 ${av.traseira ? "bg-slate-200" : ""}`}>
                        <div className="self-end w-2.5 h-3.5 border border-black rounded-xs flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                        </div>
                        {av.traseira ? <span className="font-black text-sm">X</span> : null}
                        <div className="text-[6px] font-mono">L-TEC</div>
                      </div>
                    </div>
                  </div>

                  {/* SUPERIOR & INFERIOR */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black text-center">
                    <div>
                      <div className="text-[8px] font-bold">SUPERIOR</div>
                      <div className={`h-5 border-2 border-black rounded-md flex items-center justify-center font-black text-xs ${av.superior ? "bg-slate-200" : ""}`}>
                        {av.superior ? "X" : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold">INFERIOR</div>
                      <div className={`h-5 border-2 border-black rounded-md flex items-center justify-center font-black text-xs ${av.inferior ? "bg-slate-200" : ""}`}>
                        {av.inferior ? "X" : ""}
                      </div>
                    </div>
                  </div>

                  {av.observacoes && (
                    <div className="text-[9px] italic border-t border-dotted border-black pt-1 mt-1">
                      <strong>Obs Avarias:</strong> {av.observacoes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Defeito Relatado e Serviço Executado */}
            <div className="space-y-1 text-xs">
              <div className="flex items-baseline gap-2 border-b border-dotted border-black pb-0.5">
                <span className="font-bold">Problema Relatado:</span>
                <span className="font-normal flex-1">{atendimento.defeito || "Avaliação técnica solicitada pelo cliente"}</span>
              </div>

              <div className="flex items-baseline gap-2 border-b border-dotted border-black pb-0.5">
                <span className="font-bold">Serviço Solicitado / Orçado:</span>
                <span className="font-normal flex-1">
                  {(atendimento.services || []).map(s => s.name).join(", ") || "Diagnóstico de bancada"}
                </span>
                <span className="font-bold ml-2">VALOR R$:</span>
                <span className="font-black font-mono text-sm">
                  {(Number(atendimento.totalAmount) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Terms and Conditions (Exact from photo) */}
            <div className="space-y-1 text-[9.5px] text-slate-800 leading-tight">
              <p>
                <strong>1) REPARO REALIZADOS SÃO GARANTIDOS POR:</strong>{" "}
                <span className="font-black underline">{atendimento.garantia || "90"} DIAS</span>.
              </p>
              <p>
                <strong>2)</strong> Os telefones reparados que não forem retirados em 90 dias, após a aprovação do orçamento passarão a ser propriedade da loja, que poderá vendê-los para ressarcir-se dos custos incorridos.
              </p>
              <p>
                <strong>3)</strong> Ao deixar seu celular para reparo, retirar seu chip e cartão de memória. Não nos responsabilizamos por chip e cartão de memória.
              </p>
              <p className="font-black text-center pt-0.5 tracking-tight uppercase">
                A GARANTIA DA PEÇA TROCADA NÃO GARANTE MAU USO, QUEDAS, TRINCOS, UMIDADE, OU ABERTO POR TERCEIROS.
              </p>
            </div>

            {/* Customer Agreement & Signature Area */}
            <div className="pt-2 border-t-2 border-black flex items-center justify-between gap-4">
              <div className="text-[10px] font-bold">
                Recebido em: {new Date(atendimento.entryDate || Date.now()).toLocaleDateString("pt-BR")}
                <span className="block text-[9px] font-normal text-slate-600">
                  Custódia: {atendimento.ficarNaAssistencia ? "Aparelho retido na assistência" : "Aparelho retirado (somente orçamento)"}
                </span>
                <span className="block text-[9px] text-slate-500 mt-1">
                  cliente de acordo com as condições acima
                </span>
              </div>

              <div className="flex flex-col items-center w-64 text-center">
                {atendimento.assinaturaCliente ? (
                  <img
                    src={atendimento.assinaturaCliente}
                    alt="Assinatura do Cliente"
                    className="h-12 w-auto max-w-[200px] object-contain border-b border-black"
                  />
                ) : (
                  <div className="w-full border-b border-black h-8"></div>
                )}
                <span className="text-[10px] font-bold mt-0.5">Assinatura do Clientes:</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Signature Modal if opened from print preview */}
      {signingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800">Coletar Assinatura do Cliente</h4>
              <button onClick={() => setSigningModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
              <canvas
                ref={signCanvasRef}
                width={400}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 bg-white cursor-crosshair touch-none"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const canvas = signCanvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                  }
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={saveQuickSignature}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg"
              >
                Salvar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
