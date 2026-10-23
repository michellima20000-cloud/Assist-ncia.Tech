import React from "react";
import { Checklist } from "../types";
import PatternLock from "./PatternLock";
import DeviceDiagram from "./DeviceDiagram";

interface ChecklistPrintDocumentProps {
  checklist: Checklist | null;
  isBlank?: boolean;
  companyName?: string;
  companyPhone?: string;
  companyCnpj?: string;
}

const DEFAULT_ITEMS = [
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

export default function ChecklistPrintDocument({
  checklist,
  isBlank = false,
  companyName = "ASSISTÊNCIA TÉCNICA ESPECIALIZADA",
  companyPhone = "",
  companyCnpj = ""
}: ChecklistPrintDocumentProps) {
  const isDocBlank = isBlank || !checklist;

  const itemsToRender = DEFAULT_ITEMS.map(name => {
    if (isDocBlank) return { name, status: "" };
    const found = checklist?.items?.find(i => i.name.toLowerCase() === name.toLowerCase());
    return { name, status: found ? found.status : "" };
  });

  return (
    <div
      className="checklist-print-sheet bg-white text-black w-full max-w-[210mm] min-h-[275mm] p-4 sm:p-6 border border-black shadow-none font-sans text-xs flex flex-col justify-between"
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Optional Store Header */}
        {(companyName || companyPhone || companyCnpj) && (
          <div className="text-center border-b-2 border-black pb-1.5 mb-2.5">
            <h1 className="text-base font-black uppercase tracking-wider">{companyName}</h1>
            <p className="text-[10px] text-black font-semibold">
              {companyCnpj ? `CNPJ: ${companyCnpj}  •  ` : ""}{companyPhone ? `WhatsApp / Fone: ${companyPhone}` : ""}
            </p>
          </div>
        )}

        {/* TOP HEADER: ORÇAMENTO vs ORDEM DE SERVIÇO & CLIENT DATA + DESBLOQUEIO DE TELA */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          {/* Left Side: Checkboxes & Inputs */}
          <div className="flex-1 space-y-1.5">
            {/* Top Type Checkboxes */}
            <div className="flex items-center gap-6 mb-1">
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                <span className="w-4 h-4 border-2 border-black rounded-xs inline-flex items-center justify-center font-bold text-xs leading-none">
                  {!isDocBlank && checklist?.docType === "orcamento" ? "X" : ""}
                </span>
                ORÇAMENTO
              </label>

              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                <span className="w-4 h-4 border-2 border-black rounded-xs inline-flex items-center justify-center font-bold text-xs leading-none">
                  {!isDocBlank && checklist?.docType !== "orcamento" ? "X" : ""}
                </span>
                ORDEM DE SERVIÇO
              </label>

              {!isDocBlank && checklist?.numeroDoc && (
                <span className="text-[11px] font-mono font-bold text-black ml-auto border border-black px-1.5 py-0.2 rounded">
                  Nº {checklist.numeroDoc}
                </span>
              )}
            </div>

            {/* Nome */}
            <div className="flex items-end gap-1.5 border-b border-black pb-0.5">
              <span className="font-bold text-[11px] whitespace-nowrap">Nome:</span>
              <span className="flex-1 font-semibold text-[11px] tracking-wide">
                {!isDocBlank ? checklist?.clienteNome : ""}
              </span>
            </div>

            {/* RG/CPF & Telefone */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">RG/CPF:</span>
                <span className="flex-1 font-semibold text-[10.5px]">
                  {!isDocBlank ? checklist?.rgCpf : ""}
                </span>
              </div>
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">Telefone:</span>
                <span className="flex-1 font-semibold text-[10.5px]">
                  {!isDocBlank ? checklist?.telefone : ""}
                </span>
              </div>
            </div>

            {/* Data de Entrada & Marca/Modelo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">Data de Entrada:</span>
                <span className="flex-1 font-semibold text-[10.5px]">
                  {!isDocBlank ? (checklist?.dataEntrada ? new Date(checklist.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : "__ / __ / ____") : "___ / ___ / ______"}
                </span>
              </div>
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">Marca/Modelo:</span>
                <span className="flex-1 font-semibold text-[10.5px]">
                  {!isDocBlank ? checklist?.marcaModelo : ""}
                </span>
              </div>
            </div>

            {/* Senha, IMEI, GB */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">Senha:</span>
                <span className="flex-1 font-mono font-bold text-[10.5px]">
                  {!isDocBlank ? checklist?.senhaTexto : ""}
                </span>
              </div>
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">IMEI:</span>
                <span className="flex-1 font-mono text-[9.5px]">
                  {!isDocBlank ? checklist?.imei : ""}
                </span>
              </div>
              <div className="flex items-end gap-1 border-b border-black pb-0.5">
                <span className="font-bold text-[10.5px] whitespace-nowrap">GB:</span>
                <span className="flex-1 font-semibold text-[10.5px]">
                  {!isDocBlank ? checklist?.gbMemoria : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: DESBLOQUEIO DE TELA Box (9 circles) */}
          <div className="w-38 border-2 border-black rounded-2xl p-2 flex flex-col items-center bg-white shrink-0">
            <span className="font-black text-[9.5px] uppercase tracking-wider text-center mb-0.5 leading-tight">
              DESBLOQUEIO DE TELA
            </span>
            <PatternLock
              value={!isDocBlank && checklist?.senhaPadrao ? checklist.senhaPadrao : []}
              readOnly={true}
              size={105}
              isPrint={true}
            />
          </div>
        </div>

        {/* MAIN SECTION: LISTA DE CHECAGEM (CHECKLIST) */}
        <div className="border-2 border-black rounded-2xl overflow-hidden mb-2.5">
          {/* Header Title */}
          <div className="border-b-2 border-black py-1 px-3 text-center bg-gray-50 print:bg-transparent">
            <h2 className="font-black text-xs uppercase tracking-widest text-black">
              LISTA DE CHECAGEM (CHECKLIST)
            </h2>
          </div>

          {/* Two Columns: Left = Check items, Right = Device diagrams */}
          <div className="grid grid-cols-12 divide-x-2 divide-black">
            
            {/* Left Column: Items status */}
            <div className="col-span-6 p-2 flex flex-col justify-between">
              <div className="font-bold text-[9.5px] text-center mb-1 pb-1 border-b border-black/40">
                Os itens abaixo estão em condições de utilização?
              </div>

              <div className="space-y-0.5">
                {itemsToRender.map((it, idx) => {
                  const isSim = it.status === "sim";
                  const isNao = it.status === "nao";

                  return (
                    <div key={idx} className="flex items-center justify-between text-[9.5px] leading-tight">
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
                damageMarks={!isDocBlank && checklist?.damageMarks ? checklist.damageMarks : []}
                readOnly={true}
                isPrint={true}
              />
            </div>
          </div>
        </div>

        {/* PROBLEMA RELATADO & SERVIÇO EXECUTADO & VALOR */}
        <div className="space-y-1.5 mb-2.5">
          {/* Problema Relatado */}
          <div className="border-b border-black pb-0.5">
            <span className="font-bold text-[10.5px] block mb-0.5">Problema Relatado:</span>
            <div className="min-h-[20px] font-medium text-[10.5px] leading-snug">
              {!isDocBlank ? checklist?.problemaRelatado : ""}
            </div>
          </div>

          {/* Serviço Executado */}
          <div className="border-b border-black pb-0.5 flex items-end justify-between gap-4">
            <div className="flex-1">
              <span className="font-bold text-[10.5px] block mb-0.5">Serviço Executado / Previsto:</span>
              <div className="min-h-[20px] font-medium text-[10.5px] leading-snug">
                {!isDocBlank ? checklist?.servicoExecutado : ""}
              </div>
            </div>
            <div className="whitespace-nowrap flex items-center gap-1.5 font-bold text-xs pb-0.5">
              <span>VALOR R$:</span>
              <span className="border-b border-black min-w-[70px] text-right font-mono font-bold">
                {!isDocBlank && checklist?.valor ? `R$ ${checklist.valor.toFixed(2).replace(".", ",")}` : "_______________"}
              </span>
            </div>
          </div>
        </div>

        {/* TERMOS E CONDIÇÕES DE GARANTIA (Exact text from user image) */}
        <div className="space-y-0.5 text-[9px] leading-tight text-black border-t-2 border-black pt-1.5 mb-2">
          <p className="font-bold">
            1) REPARO REALIZADOS SÃO GARANTIDOS POR:{" "}
            <span className="font-extrabold underline">
              {!isDocBlank ? checklist?.diasGarantia || 90 : "____"}
            </span>{" "}
            DIAS
          </p>
          <p>
            2) Os telefones reparados que não forem retirados em 90 dias, após a aprovação do orçamento passarão a ser propriedade da loja, que poderá vendê-los para ressarcir-se dos custos incorridos.
          </p>
          <p>
            3) Ao deixar seu celular para reparo, retirar seu chip e cartão de memória. Não nos responsabilizamos por chip e cartão de memória.
          </p>
          <p className="font-black uppercase tracking-tight text-[8.5px] mt-0.5 pt-0.5 border-t border-black/30">
            A GARANTIA DA PEÇA TROCADA NÃO GARANTE MAU USO, QUEDAS, TRINCOS, MOLHADOS, UMIDADE, OU ABERTO POR TERCEIROS.
          </p>
        </div>
      </div>

      {/* SIGNATURE SECTION */}
      <div className="pt-1.5 border-t border-black">
        <div className="text-center italic text-[9px] text-black mb-3">
          cliente de acordo com as condições acima
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-4 border-b border-black pb-0.5">
            <span className="font-bold text-[9.5px]">Retirado em: </span>
            <span className="font-semibold text-[9.5px]">
              {!isDocBlank && checklist?.retiradoEm ? checklist.retiradoEm : "___ / ___ / ______"}
            </span>
          </div>

          <div className="col-span-8 border-b border-black pb-0.5 text-center">
            <span className="font-bold text-[9.5px] block">
              Assinatura do Cliente: __________________________________________________
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
