import React, { useEffect, useState } from "react";
import { Checklist } from "../types";
import PatternLock from "./PatternLock";
import DeviceDiagram from "./DeviceDiagram";
import { Printer, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import { generateChecklistPDF } from "../lib/checklistPdfGenerator";

interface StandalonePrintChecklistProps {
  checklistId: string;
  onBack: () => void;
  companyName?: string;
  companyPhone?: string;
  companyCnpj?: string;
}

export default function StandalonePrintChecklist({
  checklistId,
  onBack,
  companyName = "ASSISTÊNCIA TÉCNICA ESPECIALIZADA",
  companyPhone = "",
  companyCnpj = ""
}: StandalonePrintChecklistProps) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(checklistId !== "blank");
  const isBlank = checklistId === "blank" || !checklist;

  useEffect(() => {
    if (checklistId === "blank") {
      setLoading(false);
      return;
    }

    try {
      const stored = sessionStorage.getItem("active_print_checklist");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          setChecklist(parsed);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    fetch(`/api/checklists/${checklistId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setChecklist(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [checklistId]);

  // Auto trigger print after render
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (_) {}
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = generateChecklistPDF(checklist, isBlank, companyName, companyPhone, companyCnpj);
    const fileName = isBlank
      ? "checklist-manual-balcao.pdf"
      : `checklist-${checklist?.numeroDoc || "entrada"}.pdf`;
    doc.save(fileName);
  };

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
    const found = checklist?.items?.find(i => i.name.toLowerCase() === name.toLowerCase());
    return { name, status: found ? found.status : "" };
  });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-black font-sans">
      {/* Top action bar (Screen only, hidden on print) */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white p-3.5 shadow-md flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Sistema
        </button>

        <div className="text-center hidden sm:block">
          <span className="font-bold text-xs">
            {isBlank ? "Checklist de Entrada em Branco (Balcão)" : `Checklist #${checklist?.numeroDoc || "Entrada"}`}
          </span>
          <p className="text-[10px] text-slate-400">Modo de Impressão Direta A4</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition border border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-400" />
            Baixar PDF
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Agora
          </button>
        </div>
      </div>

      {/* Main Printable Sheet */}
      <div className="p-4 sm:p-8 flex justify-center print:p-0">
        <div
          className="bg-white text-black w-full max-w-[210mm] min-h-[280mm] p-6 sm:p-8 border border-slate-300 print:border-none print:p-2 shadow-lg print:shadow-none text-xs flex flex-col justify-between"
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
                      {!isBlank && checklist?.docType === "orcamento" ? "X" : ""}
                    </span>
                    ORÇAMENTO
                  </label>

                  <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider cursor-default">
                    <span className="w-5 h-5 border-2 border-black rounded-xs inline-flex items-center justify-center font-bold text-sm">
                      {!isBlank && checklist?.docType !== "orcamento" ? "X" : ""}
                    </span>
                    ORDEM DE SERVIÇO
                  </label>

                  {!isBlank && checklist?.numeroDoc && (
                    <span className="text-xs font-mono font-bold text-slate-700 ml-auto border border-black px-2 py-0.5 rounded">
                      Nº {checklist.numeroDoc}
                    </span>
                  )}
                </div>

                {/* Nome */}
                <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                  <span className="font-bold text-[11px] whitespace-nowrap">Nome:</span>
                  <span className="flex-1 font-semibold text-[11px] tracking-wide">
                    {!isBlank ? checklist?.clienteNome : ""}
                  </span>
                </div>

                {/* RG/CPF & Telefone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">RG/CPF:</span>
                    <span className="flex-1 font-semibold text-[11px]">
                      {!isBlank ? checklist?.rgCpf : ""}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">Telefone:</span>
                    <span className="flex-1 font-semibold text-[11px]">
                      {!isBlank ? checklist?.telefone : ""}
                    </span>
                  </div>
                </div>

                {/* Data de Entrada & Marca/Modelo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">Data de Entrada:</span>
                    <span className="flex-1 font-semibold text-[11px]">
                      {!isBlank ? (checklist?.dataEntrada ? new Date(checklist.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : "__ / __ / ____") : "___ / ___ / ______"}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">Marca/Modelo:</span>
                    <span className="flex-1 font-semibold text-[11px]">
                      {!isBlank ? checklist?.marcaModelo : ""}
                    </span>
                  </div>
                </div>

                {/* Senha, IMEI, GB */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-end gap-1 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">Senha:</span>
                    <span className="flex-1 font-mono font-bold text-[11px]">
                      {!isBlank ? checklist?.senhaTexto : ""}
                    </span>
                  </div>
                  <div className="flex items-end gap-1 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">IMEI:</span>
                    <span className="flex-1 font-mono text-[10px]">
                      {!isBlank ? checklist?.imei : ""}
                    </span>
                  </div>
                  <div className="flex items-end gap-1 border-b border-black pb-0.5">
                    <span className="font-bold text-[11px] whitespace-nowrap">GB:</span>
                    <span className="flex-1 font-semibold text-[11px]">
                      {!isBlank ? checklist?.gbMemoria : ""}
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
                  value={!isBlank && checklist?.senhaPadrao ? checklist.senhaPadrao : []}
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
                    damageMarks={!isBlank && checklist?.damageMarks ? checklist.damageMarks : []}
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
                  {!isBlank ? checklist?.problemaRelatado : ""}
                </div>
              </div>

              {/* Serviço Executado */}
              <div className="border-b border-black pb-1 flex items-end justify-between gap-4">
                <div className="flex-1">
                  <span className="font-bold text-[11px] block mb-0.5">Serviço Executado / Previsto:</span>
                  <div className="min-h-[22px] font-medium text-[11px] leading-snug">
                    {!isBlank ? checklist?.servicoExecutado : ""}
                  </div>
                </div>
                <div className="whitespace-nowrap flex items-center gap-1.5 font-bold text-xs pb-0.5">
                  <span>VALOR R$:</span>
                  <span className="border-b border-black min-w-[70px] text-right font-mono font-bold">
                    {!isBlank && checklist?.valor ? `R$ ${checklist.valor.toFixed(2).replace(".", ",")}` : "_______________"}
                  </span>
                </div>
              </div>
            </div>

            {/* TERMOS E CONDIÇÕES DE GARANTIA */}
            <div className="space-y-1 text-[9.5px] leading-tight text-gray-900 border-t border-black pt-2 mb-3">
              <p className="font-bold">
                1) REPARO REALIZADOS SÃO GARANTIDOS POR:{" "}
                <span className="font-extrabold underline">
                  {!isBlank ? checklist?.diasGarantia || 90 : "____"}
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
                  {!isBlank && checklist?.retiradoEm ? checklist.retiradoEm : "___ / ___ / ______"}
                </span>
              </div>

              <div className="col-span-8 border-b border-black pb-1 text-center">
                <span className="font-bold text-[10px] block">
                  Assinatura do Cliente: __________________________________________________
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        @media print {
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
