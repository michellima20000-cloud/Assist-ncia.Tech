import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, DollarSign, RefreshCw, Printer, ShieldCheck, Sparkles } from "lucide-react";
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
  const [method, setMethod] = useState<'cash' | 'debit' | 'credit' | 'pix'>('cash');
  const [printReceipt, setPrintReceipt] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clientes`);
        if (res.ok) {
          const list: Cliente[] = await res.json();
          const found = list.find(c => c.id === atendimento.clienteId);
          if (found) setClient(found);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClient();
  }, [atendimento]);

  // Sync receivedAmount for card or pix methods to avoid manual calculation by user
  useEffect(() => {
    if (method !== 'cash') {
      setReceivedAmount(atendimento.totalAmount.toString());
    }
  }, [method, atendimento.totalAmount]);

  // Calculate change automatically
  const totalAmount = atendimento.totalAmount;
  const receivedNum = Number(receivedAmount) || 0;
  const change = Math.max(0, receivedNum - totalAmount);

  const handleFinalize = async () => {
    if (receivedNum < totalAmount) {
      alert("Valor recebido menor que o valor total do atendimento!");
      return;
    }

    const payload = {
      atendimentoId: atendimento.id,
      totalAmount,
      receivedAmount: receivedNum,
      change,
      method,
      notesFin
    };

    try {
      const res = await fetch("/api/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        
        // Generate exit receipt text block
        const receiptStr = `CUPOM DE SAIDA
CONTROLE: ${atendimento.controlNumber}
FINALIZADO: ${new Date().toLocaleString("pt-BR")}
CLIENTE: ${client ? client.name : "Desconhecido"}
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
RECEBIDO: R$ ${receivedNum.toFixed(2)}
TROCO: R$ ${change.toFixed(2)}
FORMA PAGAMENTO: ${method === "cash" ? "Em espécie" : method === "pix" ? "Pix" : method === "debit" ? "Debito" : "Credito"}
------------------------
GARANTIA DE 90 DIAS PARA MAO DE OBRA E PECAS SUBSTITUIDAS.`;

        onPaymentSuccess(printReceipt ? receiptStr : "", client ? client.phone : "", client ? client.name : "");
      } else {
        alert("Erro ao salvar pagamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Processar Pagamento</h2>
            <p className="text-slate-500 text-xs">Selecione o método e registre o troco</p>
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
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Forma de Pagamento
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setMethod('cash')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'cash'
                  ? "border-[#1E88E5] bg-blue-50/50 text-[#1E88E5] font-bold"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold"
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px]">Espécie</span>
            </button>
            <button
              onClick={() => setMethod('pix')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'pix'
                  ? "border-[#1E88E5] bg-blue-50/50 text-[#1E88E5] font-bold"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold"
              }`}
            >
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span className="text-[10px]">Pix</span>
            </button>
            <button
              onClick={() => setMethod('debit')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'debit'
                  ? "border-[#1E88E5] bg-blue-50/50 text-[#1E88E5] font-bold"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold"
              }`}
            >
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <span className="text-[10px]">Débito</span>
            </button>
            <button
              onClick={() => setMethod('credit')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                method === 'credit'
                  ? "border-[#1E88E5] bg-blue-50/50 text-[#1E88E5] font-bold"
                  : "border-slate-100 bg-slate-50 text-slate-600 font-semibold"
              }`}
            >
              <CreditCard className="w-5 h-5 text-orange-500" />
              <span className="text-[10px]">Crédito</span>
            </button>
          </div>
        </div>

        {/* Amount Input & Change box */}
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
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
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
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-emerald-50 text-xs uppercase tracking-wider"
        >
          Confirmar Recebimento & Entregar Aparelho
        </button>
      </div>
    </div>
  );
}
