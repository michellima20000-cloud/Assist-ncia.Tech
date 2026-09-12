import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, DollarSign, RefreshCw, Printer, ShieldCheck, Sparkles, Layers, AlertTriangle, CheckCircle } from "lucide-react";
import { Atendimento, Cliente } from "../types";

interface PagamentoScreenProps {
  atendimento: Atendimento;
  notesFin: string;
  onBack: () => void;
  onPaymentSuccess: (receiptContent: string, phone: string, clientName: string) => void;
}

export default function PagamentoScreen({ atendimento, notesFin, onBack, onPaymentSuccess }: PagamentoScreenProps) {
  const [client, setClient] = useState<Cliente | null>(null);

  // Cash register states
  const [receivedAmount, setReceivedAmount] = useState(atendimento.totalAmount.toString());
  const [method, setMethod] = useState<'cash' | 'pix' | 'debit' | 'credit' | 'split'>('cash');
  const [printReceipt, setPrintReceipt] = useState(true);

  // Split payment state
  const [splitCash, setSplitCash] = useState("");
  const [splitCashGiven, setSplitCashGiven] = useState("");
  const [splitPix, setSplitPix] = useState("");
  const [splitDebit, setSplitDebit] = useState("");
  const [splitCredit, setSplitCredit] = useState("");

  const totalAmount = atendimento.totalAmount;

  // Split calculations
  const splitCashNum = Number(splitCash.replace(",", ".")) || 0;
  const splitCashGivenNum = Number(splitCashGiven.replace(",", ".")) || 0;
  const splitPixNum = Number(splitPix.replace(",", ".")) || 0;
  const splitDebitNum = Number(splitDebit.replace(",", ".")) || 0;
  const splitCreditNum = Number(splitCredit.replace(",", ".")) || 0;

  const splitTotalPaid = Number((splitCashNum + splitPixNum + splitDebitNum + splitCreditNum).toFixed(2));
  const splitRemaining = Number(Math.max(0, totalAmount - splitTotalPaid).toFixed(2));
  const splitOverpaid = Number(Math.max(0, splitTotalPaid - totalAmount).toFixed(2));
  const splitCashChange = splitCashGivenNum > splitCashNum ? Number((splitCashGivenNum - splitCashNum).toFixed(2)) : 0;

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setClient(null); // Reset client before fetching
        const res = await fetch(`/api/clientes`);
        if (res.ok) {
          const list: Cliente[] = await res.json();
          const cleanId = (val: any) => String(val || "").trim().toLowerCase();
          const target = cleanId(atendimento?.clienteId);
          const found = list.find(c => c && cleanId(c.id) === target);
          if (found) setClient(found);
        }
      } catch (err) {
        console.error("Error fetching client in PagamentoScreen:", err);
      }
    };
    fetchClient();
  }, [atendimento]);

  // Sync / Reset when method changes
  useEffect(() => {
    if (method === "cash") {
      setReceivedAmount("");
    } else if (method === "split") {
      if (!splitCash && !splitPix && !splitDebit && !splitCredit && totalAmount > 0) {
        const half = Number((totalAmount / 2).toFixed(2));
        const otherHalf = Number((totalAmount - half).toFixed(2));
        setSplitCash(half.toFixed(2));
        setSplitCashGiven(half.toFixed(2));
        setSplitPix(otherHalf.toFixed(2));
      }
    } else {
      setReceivedAmount(totalAmount.toFixed(2));
    }
  }, [method]);

  // Split helper: 50% / 50% split shortcut
  const handleSplitHalf = (methodA: 'cash' | 'pix' | 'debit' | 'credit', methodB: 'cash' | 'pix' | 'debit' | 'credit') => {
    const half = Number((totalAmount / 2).toFixed(2));
    const otherHalf = Number((totalAmount - half).toFixed(2));

    setSplitCash("");
    setSplitCashGiven("");
    setSplitPix("");
    setSplitDebit("");
    setSplitCredit("");

    const assignVal = (target: string, val: number) => {
      if (target === 'cash') {
        setSplitCash(val.toFixed(2));
        setSplitCashGiven(val.toFixed(2));
      } else if (target === 'pix') setSplitPix(val.toFixed(2));
      else if (target === 'debit') setSplitDebit(val.toFixed(2));
      else if (target === 'credit') setSplitCredit(val.toFixed(2));
    };

    assignVal(methodA, half);
    assignVal(methodB, otherHalf);
  };

  // Split helper: fill the exact remaining balance into a method
  const handleFillRemaining = (target: 'cash' | 'pix' | 'debit' | 'credit') => {
    let others = 0;
    if (target !== 'cash') others += splitCashNum;
    if (target !== 'pix') others += splitPixNum;
    if (target !== 'debit') others += splitDebitNum;
    if (target !== 'credit') others += splitCreditNum;

    const diff = Math.max(0, Number((totalAmount - others).toFixed(2)));
    if (target === 'cash') {
      setSplitCash(diff > 0 ? diff.toFixed(2) : "");
      setSplitCashGiven(diff > 0 ? diff.toFixed(2) : "");
    } else if (target === 'pix') {
      setSplitPix(diff > 0 ? diff.toFixed(2) : "");
    } else if (target === 'debit') {
      setSplitDebit(diff > 0 ? diff.toFixed(2) : "");
    } else if (target === 'credit') {
      setSplitCredit(diff > 0 ? diff.toFixed(2) : "");
    }
  };

  // Calculate change automatically
  const receivedNum = Number(receivedAmount.replace(",", ".")) || 0;
  const change = Math.max(0, receivedNum - totalAmount);

  const handleFinalize = async () => {
    if (method === "cash" && receivedNum < totalAmount) {
      alert("Valor recebido menor que o valor total do atendimento!");
      return;
    }

    if (method === "split") {
      if (Math.abs(splitTotalPaid - totalAmount) > 0.05) {
        if (splitTotalPaid < totalAmount) {
          alert(`Falta distribuir R$ ${splitRemaining.toFixed(2)} para completar o total do atendimento de R$ ${totalAmount.toFixed(2)}!`);
        } else {
          alert(`O total das fatias (R$ ${splitTotalPaid.toFixed(2)}) ultrapassa o valor total (R$ ${totalAmount.toFixed(2)})!`);
        }
        return;
      }
      if (splitCashGivenNum > 0 && splitCashGivenNum < splitCashNum) {
        alert(`O valor entregue em dinheiro (R$ ${splitCashGivenNum.toFixed(2)}) é menor que a parcela em dinheiro (R$ ${splitCashNum.toFixed(2)})!`);
        return;
      }
    }

    const splitPaymentsPayload = method === "split" ? {
      cash: splitCashNum,
      cashGiven: splitCashGivenNum || splitCashNum,
      cashChange: splitCashChange,
      pix: splitPixNum,
      debit: splitDebitNum,
      credit: splitCreditNum,
      total: splitTotalPaid
    } : null;

    const finalReceived = method === "split"
      ? Number((splitTotalPaid + splitCashChange).toFixed(2))
      : (method === "cash" ? receivedNum : totalAmount);

    const finalChange = method === "split" ? splitCashChange : (method === "cash" ? change : 0);

    const payload = {
      atendimentoId: atendimento.id,
      totalAmount,
      receivedAmount: finalReceived,
      change: finalChange,
      method: method === "split" ? "misto" : method,
      splitPayments: splitPaymentsPayload,
      notesFin
    };

    try {
      const res = await fetch("/api/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        let paymentLabel = "Em espécie";
        if (method === "pix") paymentLabel = "PIX";
        else if (method === "debit") paymentLabel = "Débito";
        else if (method === "credit") paymentLabel = "Crédito";
        else if (method === "split") {
          const parts: string[] = [];
          if (splitCashNum > 0) parts.push(`- Dinheiro: R$ ${splitCashNum.toFixed(2)}${splitCashGivenNum > splitCashNum ? ` (Entregue: R$ ${splitCashGivenNum.toFixed(2)} | Troco: R$ ${splitCashChange.toFixed(2)})` : ''}`);
          if (splitPixNum > 0) parts.push(`- PIX: R$ ${splitPixNum.toFixed(2)}`);
          if (splitDebitNum > 0) parts.push(`- Débito: R$ ${splitDebitNum.toFixed(2)}`);
          if (splitCreditNum > 0) parts.push(`- Crédito: R$ ${splitCreditNum.toFixed(2)}`);
          paymentLabel = `PAGAMENTO MISTO / DIVIDIDO:\n${parts.join("\n")}`;
        }

        // Generate exit receipt text block
        const receiptStr = `CUPOM DE SAIDA
CONTROLE: ${atendimento.controlNumber}
FINALIZADO: ${new Date().toLocaleString("pt-BR")}
CLIENTE: ${client ? client.name : "Desconhecido"}
${client?.phone ? `FONE: ${client.phone}` : ""}
${client?.cnpj ? `CNPJ: ${client.cnpj}` : (client?.cpf ? `CPF: ${client.cpf}` : "")}
------------------------
APARELHO:
${atendimento.item} ${atendimento.brand} ${atendimento.model}
------------------------
SERVICOS REALIZADOS:
${(atendimento.services || []).map(s => `- ${s.name}: R$ ${s.price.toFixed(2)}`).join("\n")}
${(atendimento.products || []).length > 0 ? `PECAS TROCADAS:\n${(atendimento.products || []).map(p => `- ${p.name} (x${p.quantity}): R$ ${(p.price * p.quantity).toFixed(2)}`).join("\n")}` : ""}
------------------------
LAUDO / OBSERVACOES SAIDA:
${notesFin || "Aparelho entregue em perfeito funcionamento."}
------------------------
TOTAL GERAL: R$ ${totalAmount.toFixed(2)}
RECEBIDO: R$ ${finalReceived.toFixed(2)}
TROCO: R$ ${finalChange.toFixed(2)}
FORMA PAGAMENTO: ${paymentLabel}
------------------------
GARANTIA: ${atendimento.garantia || "Garantia de 90 dias (3 meses)"}`;

        onPaymentSuccess(printReceipt ? receiptStr : "", client ? client.phone : "", client ? client.name : "");
      } else {
        alert("Erro ao salvar pagamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Processar Pagamento</h2>
            <p className="text-slate-500 text-xs">Selecione o método ou divida em várias formas</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
        {/* Total Bill Box */}
        <div className="bg-[#1E88E5] text-white p-5 rounded-2xl text-center space-y-1 shadow-md shadow-blue-100">
          <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Total a Pagar</span>
          <p className="text-3xl font-extrabold font-mono">R$ {totalAmount.toFixed(2)}</p>
          <p className="text-[10px] text-blue-100">OS: {atendimento.controlNumber} | {atendimento.model}</p>
        </div>

        {/* Payment Mode Selector Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {method === "split" ? "Dividido / Misto" : "Pagamento Único"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={() => setMethod('cash')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'cash'
                  ? "border-[#1E88E5] bg-blue-50/70 text-[#1E88E5] font-bold shadow-xs"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold hover:bg-slate-100"
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold">Espécie</span>
            </button>
            <button
              onClick={() => setMethod('pix')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'pix'
                  ? "border-[#1E88E5] bg-blue-50/70 text-[#1E88E5] font-bold shadow-xs"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold hover:bg-slate-100"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span className="text-[10px] font-bold">PIX</span>
            </button>
            <button
              onClick={() => setMethod('debit')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'debit'
                  ? "border-[#1E88E5] bg-blue-50/70 text-[#1E88E5] font-bold shadow-xs"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold hover:bg-slate-100"
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold">Débito</span>
            </button>
            <button
              onClick={() => setMethod('credit')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'credit'
                  ? "border-[#1E88E5] bg-blue-50/70 text-[#1E88E5] font-bold shadow-xs"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold hover:bg-slate-100"
              }`}
            >
              <CreditCard className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-bold">Crédito</span>
            </button>
            <button
              onClick={() => setMethod('split')}
              className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'split'
                  ? "border-purple-500 bg-purple-50 text-purple-700 font-bold shadow-xs"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold hover:bg-slate-100"
              }`}
            >
              <Layers className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] font-bold">Misto / Dividir</span>
            </button>
          </div>
        </div>

        {/* SPLIT / MULTI-PAYMENT CALCULATOR */}
        {method === "split" && (
          <div className="space-y-3 p-3.5 bg-purple-50/40 border border-purple-200/70 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
              <div>
                <span className="text-[11px] font-extrabold text-purple-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Divisão do Pagamento
                </span>
                <p className="text-[9px] text-purple-700 font-medium">
                  Total da OS: <strong className="font-mono font-black">R$ {totalAmount.toFixed(2)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSplitCash("");
                  setSplitCashGiven("");
                  setSplitPix("");
                  setSplitDebit("");
                  setSplitCredit("");
                }}
                className="text-[9px] font-bold text-purple-700 hover:text-purple-900 underline"
              >
                Limpar Campos
              </button>
            </div>

            {/* Quick 50/50 Division Presets */}
            <div>
              <span className="text-[9px] font-extrabold text-purple-800 uppercase tracking-wide block mb-1">
                ⚡ Atalhos Rápidos (Divisão 50% / 50%):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSplitHalf("cash", "pix")}
                  className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                >
                  💵 Dinheiro + ✨ Pix
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitHalf("cash", "debit")}
                  className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                >
                  💵 Dinheiro + 💳 Débito
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitHalf("cash", "credit")}
                  className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                >
                  💵 Dinheiro + 💳 Crédito
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitHalf("pix", "credit")}
                  className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                >
                  ✨ Pix + 💳 Cartão
                </button>
              </div>
            </div>

            {/* Input Rows for Each Payment Method */}
            <div className="space-y-2 pt-1">
              {/* 1. DINHEIRO */}
              <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase">Dinheiro / Espécie</span>
                  </div>
                  {splitRemaining > 0 && splitCashNum === 0 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining("cash")}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                    >
                      + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Valor da Parcela</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value.replace(/[^0-9.,]/g, ""))}
                      />
                    </div>
                  </div>
                  {splitCashNum > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[9px] font-bold text-amber-700 block">Entregue pelo Cliente</label>
                        {splitCashChange > 0 && (
                          <span className="text-[9px] font-black text-amber-800">
                            Troco: R$ {splitCashChange.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs font-bold text-amber-600">R$</span>
                        <input
                          type="text"
                          placeholder={splitCash || "0,00"}
                          className="w-full pl-7 pr-2 py-1 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-black text-amber-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          value={splitCashGiven}
                          onChange={(e) => setSplitCashGiven(e.target.value.replace(/[^0-9.,]/g, ""))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. PIX */}
              <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase">PIX</span>
                  </div>
                  {splitRemaining > 0 && splitPixNum === 0 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining("pix")}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                    >
                      + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={splitPix}
                    onChange={(e) => setSplitPix(e.target.value.replace(/[^0-9.,]/g, ""))}
                  />
                </div>
              </div>

              {/* 3. CARTÃO DE DÉBITO */}
              <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase">Cartão de Débito</span>
                  </div>
                  {splitRemaining > 0 && splitDebitNum === 0 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining("debit")}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                    >
                      + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={splitDebit}
                    onChange={(e) => setSplitDebit(e.target.value.replace(/[^0-9.,]/g, ""))}
                  />
                </div>
              </div>

              {/* 4. CARTÃO DE CRÉDITO */}
              <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase">Cartão de Crédito</span>
                  </div>
                  {splitRemaining > 0 && splitCreditNum === 0 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining("credit")}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                    >
                      + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={splitCredit}
                    onChange={(e) => setSplitCredit(e.target.value.replace(/[^0-9.,]/g, ""))}
                  />
                </div>
              </div>
            </div>

            {/* Split Balance Summary Box */}
            <div className="p-2.5 rounded-xl border space-y-1.5 bg-white text-xs">
              <div className="flex justify-between items-center text-slate-600 font-bold">
                <span>Total Distribuído:</span>
                <span className="font-mono text-slate-900">R$ {splitTotalPaid.toFixed(2)} de R$ {totalAmount.toFixed(2)}</span>
              </div>

              {/* Status indicator */}
              {splitRemaining === 0 && splitOverpaid === 0 && splitTotalPaid > 0 && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Total 100% preenchido e conferido!
                  </span>
                  {splitCashChange > 0 && (
                    <span className="text-amber-800 font-black">
                      Troco Dinheiro: R$ {splitCashChange.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {splitRemaining > 0 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Falta distribuir:
                  </span>
                  <span className="font-black text-amber-700 font-mono text-xs">
                    R$ {splitRemaining.toFixed(2)}
                  </span>
                </div>
              )}

              {splitOverpaid > 0 && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 font-bold text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Valor ultrapassou o total em:
                  </span>
                  <span className="font-black text-red-700 font-mono text-xs">
                    R$ {splitOverpaid.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Amount Input & Change box (when single method) */}
        {method !== "split" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Valor Recebido
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold text-xs">
                  R$
                </span>
                <input
                  type="text"
                  value={receivedAmount}
                  placeholder="0,00"
                  onChange={(e) => setReceivedAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Troco a devolver
              </label>
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-mono font-bold text-sm text-center flex items-center justify-center min-h-[42px]">
                R$ {change.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Toggle Receipt */}
        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            id="print_receipt_exit"
            checked={printReceipt}
            onChange={(e) => setPrintReceipt(e.target.checked)}
            className="w-4 h-4 text-[#1E88E5] focus:ring-[#1E88E5] border-slate-300 rounded"
          />
          <label htmlFor="print_receipt_exit" className="text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer">
            <Printer className="w-3.5 h-3.5 text-blue-500" />
            Imprimir Recibo de Saída / Garantia
          </label>
        </div>

        <button
          onClick={handleFinalize}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-emerald-50 text-xs uppercase tracking-wider disabled:opacity-50"
          disabled={method === "split" && (splitRemaining > 0 || splitOverpaid > 0)}
        >
          {method === "split" && splitRemaining > 0
            ? `FALTA DISTRIBUIR R$ ${splitRemaining.toFixed(2)}`
            : "Confirmar Recebimento & Entregar Aparelho"}
        </button>
      </div>
    </div>
  );
}
