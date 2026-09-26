import React, { useState } from "react";
import {
  X, Sparkles, Check, ArrowRight, ShieldCheck, Zap, Users, HelpCircle,
  Clock, Scissors, Award
} from "lucide-react";
import PixCheckoutModal from "./PixCheckoutModal";

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
  onRequestSubmitted?: () => void;
}

export default function SubscriptionPlansModal({
  isOpen,
  onClose,
  currentUserEmail = "",
  currentUserName = "",
  onRequestSubmitted
}: SubscriptionPlansModalProps) {
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");
  const [selectedPlanForPix, setSelectedPlanForPix] = useState<{
    id: string;
    name: string;
    title: string;
    price: number;
    interval: "monthly" | "annual";
    capacity: number;
    description: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = (planId: "essencial" | "profissional" | "extra") => {
    let title = "";
    let price = 0;
    let capacity = 1;
    let description = "";

    if (planId === "essencial") {
      title = "PLANO ESSENCIAL";
      capacity = 1;
      price = billingInterval === "annual" ? 250.0 : 60.0;
      description = "Ordens de Serviço (OS) ilimitadas, 1 conta de técnico/atendente, controle de peças e estoque, vendas balcão e relatórios de faturamento.";
    } else if (planId === "profissional") {
      title = "PLANO PROFISSIONAL";
      capacity = 3;
      price = billingInterval === "annual" ? 390.0 : 119.0;
      description = "Ordens de Serviço (OS) ilimitadas, 3 contas de técnicos/atendentes, controle avançado de comissões por OS, estoque com alerta e painel completo.";
    } else {
      title = "TÉCNICO EXTRA";
      capacity = 1;
      price = billingInterval === "annual" ? 99.0 : 25.0;
      description = "Ordens de Serviço ilimitadas, login individual de técnico e controle de comissões por cada técnico extra adicionado.";
    }

    setSelectedPlanForPix({
      id: planId,
      name: planId,
      title,
      price,
      interval: billingInterval,
      capacity,
      description
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0e1117] border border-[#222938] text-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* TOP CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL CONTENT */}
        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
          {/* TOP GREEN BANNER - Exactly like Screenshot 1 */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-center py-2 px-4 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl">
            <span className="flex items-center gap-1.5 text-cyan-300 font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 fill-cyan-400 shrink-0" />
              15 DIAS DE TESTE GRÁTIS PARA NOVOS ASSINANTES!
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">•</span>
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              DESCONTO ANUAL EXCLUSIVO NO PIX COM ATIVAÇÃO IMEDIATA!
            </span>
          </div>

          {/* MAIN HEADING & SUBTITLE */}
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Escolha o Plano Ideal para a Sua Assistência Técnica
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Controle Ordens de Serviço (OS), técnicos, estoque de peças, vendas no balcão e faturamento sem limites. Teste 15 dias sem custo ou ative diretamente via Pix.
            </p>
          </div>

          {/* FREQUENCY TOGGLE (ANUAL VS MENSAL) */}
          <div className="flex justify-center">
            <div className="bg-[#171b24] p-1 rounded-2xl border border-slate-800 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setBillingInterval("annual")}
                className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  billingInterval === "annual"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>PLANO ANUAL</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black uppercase">
                  Super Desconto Pix 🔥
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillingInterval("monthly")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  billingInterval === "monthly"
                    ? "bg-slate-700 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>PLANO MENSAL</span>
                <span className="text-[10px] text-slate-400 font-mono">(R$ 60/mês)</span>
              </button>
            </div>
          </div>

          {/* 3 PRICING CARDS - MATCHING SCREENSHOT 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 items-stretch">
            {/* CARD 1: ESSENCIAL */}
            <div className="bg-[#12151c] rounded-3xl border border-[#232938] hover:border-slate-600 transition p-6 flex flex-col justify-between relative shadow-xl">
              <div className="space-y-4">
                {/* BADGES HEADER */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                    ESSENCIAL
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                    1 TÉCNICO
                  </span>
                </div>

                {/* TITLE */}
                <h3 className="text-xl font-black text-white">ESSENCIAL</h3>

                {/* PRICING */}
                <div>
                  {billingInterval === "annual" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                          R$ 250,00
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ANO NO PIX</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        Apenas R$ 20,83/mês <span className="underline">(57% OFF)</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Economize R$ 338,00 no ano à vista no Pix!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                          R$ 60,00
                        </span>
                        <span className="text-xs font-bold text-slate-400">/MÊS NO PIX</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        Sem carência ou fidelidade
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Renovação mensal flexível
                      </p>
                    </>
                  )}
                </div>

                {/* DESCRIPTION / BENEFITS */}
                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Ordens de Serviço (OS) ilimitadas, 1 conta de técnico/atendente, controle de peças e estoque, vendas balcão e relatórios de faturamento.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => handleSelectPlan("essencial")}
                  className="w-full py-3 bg-[#1e2330] hover:bg-slate-700 text-slate-200 hover:text-white font-extrabold text-xs rounded-2xl uppercase tracking-wider transition border border-slate-700/60 cursor-pointer shadow-md"
                >
                  SELECIONAR ESSENCIAL
                </button>
              </div>
            </div>

            {/* CARD 2: PROFISSIONAL (FEATURED / SELECIONADO) */}
            <div className="bg-[#12151c] rounded-3xl border-2 border-amber-500 hover:border-amber-400 transition p-6 flex flex-col justify-between relative shadow-2xl shadow-amber-500/10 scale-102">
              {/* TOP 'SELECIONADO' BADGE */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-lg">
                  SELECIONADO
                </span>
              </div>

              <div className="space-y-4">
                {/* BADGES HEADER */}
                <div className="flex items-center justify-between pt-1">
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-extrabold text-[10px] rounded-lg uppercase tracking-wider border border-amber-500/30">
                    POPULAR
                  </span>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-extrabold text-[10px] rounded-lg uppercase tracking-wider border border-amber-500/30">
                    3 TÉCNICOS
                  </span>
                </div>

                {/* TITLE */}
                <h3 className="text-xl font-black text-white">PROFISSIONAL</h3>

                {/* PRICING */}
                <div>
                  {billingInterval === "annual" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                          R$ 390,00
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ANO NO PIX</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        Apenas R$ 32,50/mês <span className="underline">(66% OFF)</span>
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                        Apenas R$ 10,83 por técnico/mês! <span className="text-emerald-400">(Economia R$ 774)</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                          R$ 119,00
                        </span>
                        <span className="text-xs font-bold text-slate-400">/MÊS NO PIX</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        Apenas R$ 39,66 por técnico/mês
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                        Ideal para oficinas e assistências em expansão
                      </p>
                    </>
                  )}
                </div>

                {/* DESCRIPTION / BENEFITS */}
                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Ordens de Serviço (OS) ilimitadas, 3 contas de técnicos/atendentes, controle avançado de comissões por OS, estoque com alerta e painel completo.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => handleSelectPlan("profissional")}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  PLANO SELECIONADO
                </button>
              </div>
            </div>

            {/* CARD 3: TÉCNICO EXTRA */}
            <div className="bg-[#12151c] rounded-3xl border border-[#232938] hover:border-slate-600 transition p-6 flex flex-col justify-between relative shadow-xl">
              <div className="space-y-4">
                {/* BADGES HEADER */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] rounded-lg uppercase tracking-wider border border-emerald-500/30">
                    ADICIONAL
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] rounded-lg uppercase tracking-wider border border-emerald-500/30">
                    +1 TÉCNICO
                  </span>
                </div>

                {/* TITLE */}
                <h3 className="text-xl font-black text-white">TÉCNICO EXTRA</h3>

                {/* PRICING */}
                <div>
                  {billingInterval === "annual" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                          R$ 99,00
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ANO (1 CONTA)</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        R$ 8,25/mês por técnico <span className="underline">(58% OFF)</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Economize R$ 141,00 no ano por técnico extra!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                          R$ 25,00
                        </span>
                        <span className="text-xs font-bold text-slate-400">/MÊS (1 CONTA)</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        Adicione técnicos sob demanda
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Cancele a conta extra quando desejar
                      </p>
                    </>
                  )}
                </div>

                {/* DESCRIPTION / BENEFITS */}
                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Ordens de Serviço ilimitadas, login individual de técnico e controle de comissões por cada técnico extra adicionado.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => handleSelectPlan("extra")}
                  className="w-full py-3 bg-[#1e2330] hover:bg-slate-700 text-slate-200 hover:text-white font-extrabold text-xs rounded-2xl uppercase tracking-wider transition border border-slate-700/60 cursor-pointer shadow-md"
                >
                  SELECIONAR TÉCNICO EXTRA
                </button>
              </div>
            </div>
          </div>

          {/* BENEFIT HIGHLIGHTS BOTTOM BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs text-slate-300">
            <div className="flex items-center gap-2.5 bg-[#141720] p-3 rounded-2xl border border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Garantia de ativação imediata após envio do comprovante Pix</span>
            </div>
            <div className="flex items-center gap-2.5 bg-[#141720] p-3 rounded-2xl border border-slate-800">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Acesso completo a Ordens de Serviço (OS), peças, estoque e relatórios</span>
            </div>
            <div className="flex items-center gap-2.5 bg-[#141720] p-3 rounded-2xl border border-slate-800">
              <Users className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Login individual para cada técnico e atendente da sua assistência técnica</span>
            </div>
          </div>
        </div>
      </div>

      {/* PIX CHECKOUT SUB-MODAL */}
      {selectedPlanForPix && (
        <PixCheckoutModal
          isOpen={!!selectedPlanForPix}
          onClose={() => setSelectedPlanForPix(null)}
          selectedPlan={selectedPlanForPix}
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
          onRequestSubmitted={() => {
            setSelectedPlanForPix(null);
            if (onRequestSubmitted) {
              onRequestSubmitted();
            }
          }}
        />
      )}
    </div>
  );
}
