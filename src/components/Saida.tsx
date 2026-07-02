import React, { useState, useEffect } from "react";
import { ArrowLeft, Play, Phone, FileText, Printer, Check, MessageSquare, CreditCard, Camera } from "lucide-react";
import { Atendimento, Cliente } from "../types";

interface SaidaProps {
  atendimento: Atendimento;
  onBack: () => void;
  onGoToPayment: (at: Atendimento, notesFin: string) => void;
  onPrintIntakeReceipt: (at: Atendimento) => void;
}

export default function Saida({ atendimento, onBack, onGoToPayment, onPrintIntakeReceipt }: SaidaProps) {
  const [client, setClient] = useState<Cliente | null>(null);
  const [notesFin, setNotesFin] = useState(atendimento.notesFin || "");

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

  // Calculate permanência (elapsed time)
  const entryDate = new Date(atendimento.entryDate);
  const now = new Date();
  const diffMs = now.getTime() - entryDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let durationString = "";
  if (diffDays > 0) {
    durationString = `${diffDays} dia(s) e ${diffHours % 24} hora(s)`;
  } else if (diffHours > 0) {
    durationString = `${diffHours} hora(s)`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    durationString = `${diffMinutes} minuto(s)`;
  }

  const handleSendWhatsApp = () => {
    if (!client) return;
    const cleanPhone = client.phone.replace(/\D/g, "");
    const text = `Olá ${client.name}! O seu aparelho (${atendimento.item} ${atendimento.brand} ${atendimento.model}) sob OS número ${atendimento.controlNumber} já está PRONTO para retirada em nossa assistência!
Valor total do serviço: R$ ${atendimento.totalAmount.toFixed(2)}. Estamos te aguardando!`;
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handlePrintEntryCopy = () => {
    onPrintIntakeReceipt(atendimento);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Finalizar & Entregar Equipamento</h2>
            <p className="text-slate-500 text-xs">Revisão de serviços realizados antes do checkout</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        {/* Core details */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ordem de Serviço</span>
            <p className="font-mono text-sm font-bold text-slate-800">{atendimento.controlNumber}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Permanência</span>
            <p className="text-xs font-semibold text-[#1E88E5]">{durationString}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Equipamento</span>
            <p className="text-xs font-bold text-slate-800">{atendimento.item} {atendimento.brand} {atendimento.model}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Data de Entrada</span>
            <p className="text-xs text-slate-600 font-mono">{entryDate.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Client details block */}
        {client && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cliente</span>
            <p className="text-xs font-bold text-slate-800">{client.name}</p>
            <p className="text-[11px] text-slate-600 font-mono">WhatsApp: {client.phone}</p>
          </div>
        )}

        {/* Services & items list review */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Serviços e Peças Aplicadas</span>
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 text-xs">
            {atendimento.services.map((s, idx) => (
              <div key={idx} className="p-2.5 flex justify-between bg-slate-50/50">
                <span className="font-semibold text-slate-700">{s.name}</span>
                <span className="font-mono font-bold text-slate-800">R$ {s.price.toFixed(2)}</span>
              </div>
            ))}
            {atendimento.products.map((p, idx) => (
              <div key={idx} className="p-2.5 flex justify-between bg-red-50/20">
                <span className="font-semibold text-red-900">{p.name} (x{p.quantity})</span>
                <span className="font-mono font-bold text-red-800">R$ {(p.price * p.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="p-3 flex justify-between bg-[#1E88E5]/5 font-bold text-sm text-[#1E88E5]">
              <span>VALOR TOTAL DO ATENDIMENTO:</span>
              <span className="font-mono">R$ {atendimento.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Closing notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Observações Finais / Laudo Técnico de Saída</label>
          <textarea
            value={notesFin}
            onChange={(e) => setNotesFin(e.target.value)}
            placeholder="Ex: Trocado frontal, testado touch, tudo 100%. Garantia de 90 dias na tela..."
            rows={2.5}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Bottom Actions Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            onClick={handlePrintEntryCopy}
            className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            2ª Via Recibo Entrada
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-50"
          >
            <MessageSquare className="w-4 h-4" />
            Enviar WhatsApp: Pronto
          </button>

          <button
            onClick={() => onGoToPayment(atendimento, notesFin)}
            className="py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-50"
          >
            <CreditCard className="w-4 h-4" />
            Ir para Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}
