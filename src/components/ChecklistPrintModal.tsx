import React, { useRef, useState } from "react";
import { Checklist, Atendimento, Cliente, ChecklistItemStatus, DamageMark } from "../types";
import PatternLock from "./PatternLock";
import DeviceDiagram from "./DeviceDiagram";
import { Printer, X, ExternalLink, Receipt, Download, CheckCircle2, FileText } from "lucide-react";
import { generateChecklistPDF } from "../lib/checklistPdfGenerator";

export interface ChecklistPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Props when called from ChecklistScreen:
  checklist?: Checklist | null;
  isBlankMode?: boolean;
  companyName?: string;
  companyPhone?: string;
  companyCnpj?: string;
  // Props when called from AtendimentosAndamento, AparelhosStatusModal, Entrada, Saida:
  atendimento?: Atendimento | any;
  cliente?: Cliente | null;
  onPrintThermal?: (content?: any) => void;
  onUpdateSignature?: (sig: any) => void | Promise<void>;
}

export default function ChecklistPrintModal({
  isOpen,
  onClose,
  checklist: checklistProp,
  isBlankMode = false,
  companyName = "ASSISTÊNCIA TÉCNICA ESPECIALIZADA",
  companyPhone = "",
  companyCnpj = "",
  atendimento,
  cliente,
  onPrintThermal,
  onUpdateSignature
}: ChecklistPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBlank = isBlankMode || (!checklistProp && !atendimento);

  // Convert atendimento into unified Checklist format if provided
  let effectiveChecklist: Checklist | null = checklistProp || null;

  if (!effectiveChecklist && atendimento) {
    let parsedPattern: number[] = [];
    if (atendimento.padraoDesbloqueio && typeof atendimento.padraoDesbloqueio === "string") {
      parsedPattern = atendimento.padraoDesbloqueio
        .split("-")
        .map((n: string) => parseInt(n, 10) - 1)
        .filter((n: number) => !isNaN(n) && n >= 0 && n <= 8);
    }

    const defaultItemKeys = [
      { key: "telaDisplay", name: "Tela de Display" },
      { key: "touchScreen", name: "Touch Screen" },
      { key: "teclas", name: "Teclas" },
      { key: "sensores", name: "Sensores de proximidade" },
      { key: "bluetooth", name: "Bluetooth" },
      { key: "wifi", name: "Wi-fi" },
      { key: "ligacoes", name: "Ligações" },
      { key: "audio", name: "Microfone / Áudio" },
      { key: "cameras", name: "Câmera Frontal" },
      { key: "cameraTraseira", name: "Câmera Traseira" },
      { key: "carregamento", name: "Conector de Carga" },
      { key: "bateria", name: "Bateria / Carcaça" }
    ];

    const mappedItems: ChecklistItemStatus[] = defaultItemKeys.map(k => {
      let st: "sim" | "nao" | "nt" = "nt";
      if (atendimento.checklistData && atendimento.checklistData[k.key]) {
        const val = atendimento.checklistData[k.key];
        if (val === "sim") st = "sim";
        else if (val === "nao") st = "nao";
        else st = "nt";
      }
      return { name: k.name, status: st };
    });

    const mappedMarks: DamageMark[] = [];
    if (atendimento.avariasDiagram) {
      const views: Array<"lado1" | "lado2" | "frente" | "traseira" | "superior" | "inferior"> = [
        "lado1", "lado2", "frente", "traseira", "superior", "inferior"
      ];
      views.forEach((v, idx) => {
        if (atendimento.avariasDiagram[v]) {
          mappedMarks.push({
            id: "m-" + idx,
            view: v,
            x: 50,
            y: 50,
            label: "Avaria"
          });
        }
      });
    }

    effectiveChecklist = {
      id: atendimento.id || "temp",
      numeroDoc: atendimento.controlNumber || "OS-0001",
      docType: atendimento.tipoDocumento === "orcamento" ? "orcamento" : "ordem_servico",
      clienteNome: cliente?.name || atendimento.clienteNome || "Cliente Balcão",
      rgCpf: cliente?.cpf || cliente?.cnpj || atendimento.rgCpf || "",
      telefone: cliente?.phone || atendimento.telefone || "",
      dataEntrada: atendimento.entryDate || new Date().toISOString().split("T")[0],
      marcaModelo: `${atendimento.brand || ""} ${atendimento.model || ""}`.trim() || atendimento.item || "",
      senhaTexto: atendimento.senhaDesbloqueio || "",
      senhaPadrao: parsedPattern,
      imei: atendimento.imei || "",
      gbMemoria: atendimento.storageGb || "",
      items: mappedItems,
      damageMarks: mappedMarks,
      avariasDescricao: atendimento.avariasDiagram?.observacoes || "",
      problemaRelatado: atendimento.defeito || "",
      servicoExecutado: atendimento.observations || "",
      valor: atendimento.totalAmount || 0,
      diasGarantia: parseInt(atendimento.garantia) || 90,
      assinaturaCliente: atendimento.assinaturaCliente || "",
      status: "aberto",
      createdAt: atendimento.entryDate || new Date().toISOString()
    };
  }

  // Handle Download PDF
  const handleDownloadPDF = () => {
    try {
      const doc = generateChecklistPDF(effectiveChecklist, isBlank, companyName, companyPhone, companyCnpj);
      const fileName = isBlank
        ? "checklist-manual-balcao.pdf"
        : `checklist-${effectiveChecklist?.numeroDoc || "entrada"}.pdf`;
      doc.save(fileName);
      setStatusNotice("PDF baixado com sucesso!");
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (e) {
      console.error("Download PDF error:", e);
    }
  };

  // Primary Print Action: Guarantees user gets the print document immediately
  const docTitle = isBlank
    ? "Checklist de Entrada em Branco (Balcão Manual)"
    : `Checklist #${effectiveChecklist?.numeroDoc || "Entrada"} - ${effectiveChecklist?.clienteNome || "Cliente"}`;

  const handlePrint = () => {
    setIsPrinting(true);
    setStatusNotice("Abrindo caixa de impressão...");

    // Store in sessionStorage so standalone print page has draft data
    try {
      if (effectiveChecklist) {
        sessionStorage.setItem("active_print_checklist", JSON.stringify(effectiveChecklist));
      }
    } catch (_) {}

    // Method 1: Open clean popup window with self-contained printable HTML
    let opened = false;
    try {
      const printWin = window.open("", "_blank", "width=850,height=950");
      if (printWin) {
        opened = true;
        printWin.document.open();
        printWin.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${docTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { size: A4 portrait; margin: 6mm 8mm; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .checklist-print-sheet {
        width: 100% !important;
        max-width: 210mm !important;
        margin: 0 auto !important;
        padding: 4mm !important;
      }
    </style>
  </head>
  <body>
    <div class="checklist-print-sheet">
      ${printAreaRef.current?.innerHTML || ""}
    </div>
    <script>
      window.onload = function() {
        window.focus();
        setTimeout(function() {
          window.print();
        }, 300);
      };
    </script>
  </body>
</html>`);
        printWin.document.close();
        printWin.focus();
        setIsPrinting(false);
        setStatusNotice("Janela de impressão aberta!");
        setTimeout(() => setStatusNotice(null), 3000);
        return;
      }
    } catch (popupErr) {
      console.warn("Popup blocked or not allowed, trying direct window.print:", popupErr);
    }

    // Method 2: Direct window.print()
    try {
      window.print();
    } catch (_) {}

    // Method 3: Download PDF as backup if window wasn't opened
    if (!opened) {
      try {
        const doc = generateChecklistPDF(effectiveChecklist, isBlank, companyName, companyPhone, companyCnpj);
        doc.save(isBlank ? "checklist-manual-balcao.pdf" : `checklist-${effectiveChecklist?.numeroDoc || "entrada"}.pdf`);
      } catch (_) {}
    }

    setIsPrinting(false);
  };

  // Dedicated URL that escapes iframe sandbox
  const standaloneUrl = `/?print_checklist=${effectiveChecklist?.id || (isBlank ? "blank" : "latest")}`;

  // Standard items from the reference photo
  const defaultItems = [
    "Tela de Display",
    "Touch Screen",
    "Teclas",
    "Sensores de proximidade",
    "Bluetooth",
    "Wi-fi",
    "Ligações",
    "Microfone / Áudio",
    "Câmera Frontal",
    "Câmera Traseira",
    "Conector de Carga",
    "Bateria / Carcaça"
  ];

  const itemsToRender = defaultItems.map(name => {
    if (isBlank) return { name, status: "" };
    const found = effectiveChecklist?.items?.find(i => i.name.toLowerCase() === name.toLowerCase());
    return { name, status: found ? found.status : "" };
  });

  return (
    <div
      id="checklist-print-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0"
    >
      {/* Container Dialog */}
      <div
        id="checklist-print-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[96vh] overflow-hidden print:max-w-none print:w-full print:h-auto print:shadow-none print:rounded-none"
      >
        {/* Top Control Bar (Screen only, hidden on print) */}
        <div
          id="checklist-print-modal-topbar"
          className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isBlank ? "Imprimir Checklist em Branco (Manual)" : `Imprimir Checklist - ${effectiveChecklist?.numeroDoc || "Entrada"}`}
              </h3>
              <p className="text-xs text-slate-400">
                {isBlank ? "Formulário pronto para preenchimento com caneta no balcão" : "Documento para assinatura do cliente e controle técnico"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Optional Thermal Receipt Print */}
            {onPrintThermal && (
              <button
                type="button"
                onClick={() => onPrintThermal()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                title="Imprimir cupom térmico (58mm/80mm)"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Cupom Térmico</span>
              </button>
            )}

            {/* Baixar PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Baixar arquivo PDF do Checklist"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Baixar PDF</span>
            </button>

            {/* Nova Aba (Real link escaping iframe sandbox) */}
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-700 shadow-xs"
              title="Abre a folha em uma aba dedicada fora do painel com impressão automática"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>Nova Aba</span>
            </a>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Imprimir documento ou salvar PDF"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? "Imprimindo..." : "Imprimir Agora"}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer ml-1"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status notification banner */}
        {statusNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs font-semibold flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-emerald-700 hover:underline text-[11px]"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Scrollable Preview Area on Screen */}
        <div
          id="checklist-print-scroll-area"
          className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible"
        >
          {/* Printable Document Sheet (Exact reproduction of uploaded reference) */}
          <div
            id="checklist-printable-sheet"
            ref={printAreaRef}
            className="bg-white text-black w-full max-w-[210mm] min-h-[280mm] p-6 sm:p-8 border border-slate-300 print:border-none print:p-3 shadow-md print:shadow-none font-sans text-xs flex flex-col justify-between"
            style={{ boxSizing: "border-box" }}
          >
            <div>
              {/* Optional Store Header */}
              {(companyName || companyPhone || companyCnpj) && (
                <div className="text-center border-b border-black pb-2 mb-3">
                  <h1 className="text-base font-black uppercase tracking-wider">{companyName}</h1>
                  <p className="text-[10px] text-gray-700 font-medium">
                    {companyCnpj ? `CNPJ: ${companyCnpj} • ` : ""}{companyPhone ? `WhatsApp / Fone: ${companyPhone}` : ""}
                  </p>
                </div>
              )}

              {/* TOP HEADER: ORÇAMENTO vs ORDEM DE SERVIÇO & CLIENT DATA + DESBLOQUEIO DE TELA */}
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Left Side: Checkboxes & Inputs */}
                <div className="flex-1 space-y-2">
                  {/* Top Type Checkboxes */}
                  <div className="flex items-center gap-8 mb-2">
                    <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider cursor-default">
                      <span className="w-5 h-5 border-2 border-black rounded-xs inline-flex items-center justify-center font-bold text-sm">
                        {!isBlank && effectiveChecklist?.docType === "orcamento" ? "X" : ""}
                      </span>
                      ORÇAMENTO
                    </label>

                    <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider cursor-default">
                      <span className="w-5 h-5 border-2 border-black rounded-xs inline-flex items-center justify-center font-bold text-sm">
                        {!isBlank && effectiveChecklist?.docType !== "orcamento" ? "X" : ""}
                      </span>
                      ORDEM DE SERVIÇO
                    </label>

                    {!isBlank && effectiveChecklist?.numeroDoc && (
                      <span className="text-xs font-mono font-bold text-slate-700 ml-auto border border-black px-2 py-0.5 rounded">
                        Nº {effectiveChecklist.numeroDoc}
                      </span>
                    )}
                  </div>

                  {/* Nome */}
                  <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">Nome:</span>
                    <span className="flex-1 font-semibold text-[11px] tracking-wide">
                      {!isBlank ? effectiveChecklist?.clienteNome : ""}
                    </span>
                  </div>

                  {/* RG/CPF & Telefone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">RG/CPF:</span>
                      <span className="flex-1 font-semibold text-[11px]">
                        {!isBlank ? effectiveChecklist?.rgCpf : ""}
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">Telefone:</span>
                      <span className="flex-1 font-semibold text-[11px]">
                        {!isBlank ? effectiveChecklist?.telefone : ""}
                      </span>
                    </div>
                  </div>

                  {/* Data de Entrada & Marca/Modelo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">Data de Entrada:</span>
                      <span className="flex-1 font-semibold text-[11px]">
                        {!isBlank ? (effectiveChecklist?.dataEntrada ? new Date(effectiveChecklist.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : "__ / __ / ____") : "___ / ___ / ______"}
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">Marca/Modelo:</span>
                      <span className="flex-1 font-semibold text-[11px]">
                        {!isBlank ? effectiveChecklist?.marcaModelo : ""}
                      </span>
                    </div>
                  </div>

                  {/* Senha, IMEI, GB */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-end gap-1 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">Senha:</span>
                      <span className="flex-1 font-mono font-bold text-[11px]">
                        {!isBlank ? effectiveChecklist?.senhaTexto : ""}
                      </span>
                    </div>
                    <div className="flex items-end gap-1 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">IMEI:</span>
                      <span className="flex-1 font-mono text-[10px]">
                        {!isBlank ? effectiveChecklist?.imei : ""}
                      </span>
                    </div>
                    <div className="flex items-end gap-1 border-b border-black pb-0.5">
                      <span className="font-bold text-[11px] whitespace-nowrap">GB:</span>
                      <span className="flex-1 font-semibold text-[11px]">
                        {!isBlank ? effectiveChecklist?.gbMemoria : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: DESBLOQUEIO DE TELA Box (9 circles) */}
                <div className="w-44 border-2 border-black rounded-2xl p-2.5 flex flex-col items-center bg-white shrink-0">
                  <span className="font-black text-[10px] uppercase tracking-wider text-center mb-1 leading-tight">
                    DESBLOQUEIO DE TELA
                  </span>
                  <PatternLock
                    value={!isBlank && effectiveChecklist?.senhaPadrao ? effectiveChecklist.senhaPadrao : []}
                    readOnly={true}
                    size={110}
                    isPrint={true}
                  />
                </div>
              </div>

              {/* MAIN SECTION: LISTA DE CHECAGEM (CHECKLIST) */}
              <div className="border-2 border-black rounded-2xl overflow-hidden mb-3">
                {/* Header Title */}
                <div className="border-b-2 border-black py-1 px-3 text-center bg-gray-100 print:bg-transparent">
                  <h2 className="font-black text-xs uppercase tracking-widest">
                    LISTA DE CHECAGEM (CHECKLIST)
                  </h2>
                </div>

                {/* Two Columns: Left = Check items, Right = Device diagrams */}
                <div className="grid grid-cols-12 divide-x-2 divide-black">
                  {/* Left Column: Items status */}
                  <div className="col-span-6 p-2 flex flex-col justify-between">
                    <div className="font-bold text-[10px] text-center mb-1.5 pb-1 border-b border-gray-300">
                      Os itens abaixo estão em condições de utilização?
                    </div>

                    <div className="space-y-1">
                      {itemsToRender.map((it, idx) => {
                        const isSim = it.status === "sim";
                        const isNao = it.status === "nao";

                        return (
                          <div key={idx} className="flex items-center justify-between text-[10px] leading-tight">
                            <span className="font-medium text-black truncate pr-1">
                              {it.name} ....................................................
                            </span>
                            <div className="flex items-center gap-2 shrink-0 font-bold">
                              <span>( {isSim ? "X" : " "} ) Sim</span>
                              <span>( {isNao ? "X" : " "} ) Não</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Device Diagrams for damage marking */}
                  <div className="col-span-6 p-2 flex flex-col items-center justify-center">
                    <DeviceDiagram
                      damageMarks={!isBlank && effectiveChecklist?.damageMarks ? effectiveChecklist.damageMarks : []}
                      readOnly={true}
                      isPrint={true}
                    />
                  </div>
                </div>
              </div>

              {/* PROBLEMA RELATADO & SERVIÇO EXECUTADO & VALOR */}
              <div className="space-y-2 mb-3">
                {/* Problema Relatado */}
                <div className="border-b border-black pb-1">
                  <span className="font-bold text-[11px] block mb-0.5">Problema Relatado:</span>
                  <div className="min-h-[22px] font-medium text-[11px] leading-snug">
                    {!isBlank ? effectiveChecklist?.problemaRelatado : ""}
                  </div>
                </div>

                {/* Serviço Executado */}
                <div className="border-b border-black pb-1 flex items-end justify-between gap-4">
                  <div className="flex-1">
                    <span className="font-bold text-[11px] block mb-0.5">Serviço Executado / Previsto:</span>
                    <div className="min-h-[22px] font-medium text-[11px] leading-snug">
                      {!isBlank ? effectiveChecklist?.servicoExecutado : ""}
                    </div>
                  </div>
                  <div className="whitespace-nowrap flex items-center gap-1.5 font-bold text-xs pb-0.5">
                    <span>VALOR R$:</span>
                    <span className="border-b border-black min-w-[70px] text-right font-mono font-bold">
                      {!isBlank && effectiveChecklist?.valor ? `R$ ${effectiveChecklist.valor.toFixed(2).replace(".", ",")}` : "_______________"}
                    </span>
                  </div>
                </div>
              </div>

              {/* TERMOS E CONDIÇÕES DE GARANTIA (Exact text from user image) */}
              <div className="space-y-1 text-[9.5px] leading-tight text-gray-900 border-t border-black pt-2 mb-3">
                <p className="font-bold">
                  1) REPARO REALIZADOS SÃO GARANTIDOS POR:{" "}
                  <span className="font-extrabold underline">
                    {!isBlank ? effectiveChecklist?.diasGarantia || 90 : "____"}
                  </span>{" "}
                  DIAS
                </p>
                <p>
                  2) Os telefones reparados que não forem retirados em 90 dias, após a aprovação do orçamento passarão a ser propriedade da loja, que poderá vendê-los para ressarcir-se dos custos incorridos.
                </p>
                <p>
                  3) Ao deixar seu celular para reparo, retirar seu chip e cartão de memória. Não nos responsabilizamos por chip e cartão de memória.
                </p>
                <p className="font-black uppercase tracking-tight text-[9px] mt-1 pt-1 border-t border-gray-300">
                  A GARANTIA DA PEÇA TROCADA NÃO GARANTE MAU USO, QUEDAS, TRINCOS, MOLHADOS, UMIDADE, OU ABERTO POR TERCEIROS.
                </p>
              </div>
            </div>

            {/* SIGNATURE SECTION */}
            <div className="pt-2 border-t border-black">
              <div className="text-center italic text-[9.5px] text-gray-700 mb-4">
                cliente de acordo com as condições acima
              </div>

              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-4 border-b border-black pb-1">
                  <span className="font-bold text-[10px]">Retirado em: </span>
                  <span className="font-semibold text-[10px]">
                    {!isBlank && effectiveChecklist?.retiradoEm ? effectiveChecklist.retiradoEm : "___ / ___ / ______"}
                  </span>
                </div>

                <div className="col-span-8 border-b border-black pb-1 text-center">
                  {effectiveChecklist?.assinaturaCliente ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={effectiveChecklist.assinaturaCliente}
                        alt="Assinatura"
                        className="h-10 max-w-[200px] object-contain mb-1"
                      />
                      <span className="text-[9px] font-bold text-gray-600 border-t border-black w-full text-center">
                        Assinatura do Cliente
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold text-[10px] block">
                      Assinatura do Cliente: __________________________________________________
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PRINT-ONLY CSS RULES */}
      <style>{`
        @media print {
          #checklist-print-modal-topbar {
            display: none !important;
          }
          #checklist-print-modal-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }
          #checklist-print-modal-container {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #checklist-print-scroll-area {
            overflow: visible !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            display: block !important;
          }
          #checklist-printable-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 2mm !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: auto !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
}
