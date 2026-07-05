import React, { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Clock, Save, Trash2, X, Check, RefreshCw, HelpCircle, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react";

interface FeedbackItem {
  id: string;
  clienteId: string;
  clienteName: string;
  clientePhone: string;
  atendimentoId: string;
  controlNumber: string;
  item: string;
  brand: string;
  model: string;
  scheduledTime: string;
  status: 'pending' | 'sent' | 'canceled';
  messageText: string;
  createdAt: string;
}

interface FeedbackConfig {
  enabled: boolean;
  delayHours: number;
  messageTemplate: string;
  readyMessageTemplate?: string;
  entryMessageTemplate?: string;
}

interface FeedbackAutomationProps {
  onBack: () => void;
}

export default function FeedbackAutomation({ onBack }: FeedbackAutomationProps) {
  const [config, setConfig] = useState<FeedbackConfig>({
    enabled: true,
    delayHours: 3,
    messageTemplate: "",
    readyMessageTemplate: "",
    entryMessageTemplate: ""
  });
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [now, setNow] = useState(new Date());

  // Periodically update current time to refresh the countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000); // every 10s
    return () => clearInterval(timer);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config/feedback");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("/api/feedbacks");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchFeedbacks();
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/config/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert("Configuração de automação de feedback salva!");
        fetchConfig();
      } else {
        alert("Erro ao salvar configuração.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'pending' | 'sent' | 'canceled') => {
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este agendamento de feedback?")) return;
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendWhatsApp = (item: FeedbackItem) => {
    let cleanPhone = (item.clientePhone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      const input = prompt("Digite o número de WhatsApp com DDD (apenas números):", "");
      if (!input) return;
      cleanPhone = input.replace(/\D/g, "");
    }

    if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(item.messageText)}`;
    window.open(url, "_blank");
    
    // Mark as sent
    handleUpdateStatus(item.id, 'sent');
  };

  const getCountdownText = (scheduledTimeStr: string) => {
    const scheduled = new Date(scheduledTimeStr);
    const diffMs = scheduled.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: "Pronto para Enviar", isReady: true };
    }

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return { text: `Falta ${diffMins} min`, isReady: false };
    }

    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    return { text: `Falta ${diffHours}h ${remMins}m`, isReady: false };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Automação de Pós-Venda & Feedback</h2>
            <p className="text-slate-500 text-xs">Agende mensagens automáticas de satisfação no WhatsApp após a entrega</p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchConfig();
            fetchFeedbacks();
          }}
          className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-100 transition"
          title="Recarregar dados"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Settings */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              Configurações
            </h3>

            {loadingConfig ? (
              <div className="py-4 text-center text-xs text-slate-400">Carregando configurações...</div>
            ) : (
              <div className="space-y-4">
                {/* Enabled Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Ativar Automação</span>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                    className="text-slate-600 hover:text-slate-800 transition"
                  >
                    {config.enabled ? (
                      <ToggleRight className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Delay hours */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    Tempo de Espera (Horas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={config.delayHours}
                    onChange={(e) => setConfig({ ...config, delayHours: Math.max(1, Number(e.target.value)) })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs outline-none focus:border-blue-400 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">Recomendado de 3 a 5 horas para dar tempo do cliente experimentar o aparelho.</p>
                </div>

                {/* OS Opening message template */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                    1. Mensagem de Abertura de OS (Entrada)
                  </label>
                  <span className="text-[10px] text-slate-400 block -mt-1">
                    Disponível no Recibo de Entrada para enviar logo que a OS é aberta
                  </span>
                  <textarea
                    rows={4}
                    value={config.entryMessageTemplate || ""}
                    onChange={(e) => setConfig({ ...config, entryMessageTemplate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs outline-none focus:border-blue-400 font-medium"
                    placeholder="Ex: Olá, {cliente}! Recebemos o seu aparelho..."
                  />
                </div>

                {/* Ready / End of Service message template */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                    2. Mensagem de Fim de Serviço (Pronto)
                  </label>
                  <span className="text-[10px] text-slate-400 block -mt-1">
                    Enviada ao clicar em "ENVIAR MENSAGEM: FIM DO SERVIÇO" ou ao marcar como Pronto
                  </span>
                  <textarea
                    rows={4}
                    value={config.readyMessageTemplate || ""}
                    onChange={(e) => setConfig({ ...config, readyMessageTemplate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs outline-none focus:border-blue-400 font-medium"
                    placeholder="Ex: Olá, {cliente}! Seu {aparelho} já está pronto..."
                  />
                </div>

                {/* Message template for Post-sale */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                    3. Mensagem de Pós-Venda (Satisfação)
                  </label>
                  <span className="text-[10px] text-slate-400 block -mt-1">
                    Agendada automaticamente após finalizar o pagamento
                  </span>
                  <textarea
                    rows={4}
                    value={config.messageTemplate}
                    onChange={(e) => setConfig({ ...config, messageTemplate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs outline-none focus:border-blue-400 font-medium"
                    placeholder="Ex: Olá, {cliente}! Tudo bem? Passando para saber..."
                  />
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Variáveis Disponíveis</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-slate-600 font-mono">
                      <span>{"{cliente}"} - Nome</span>
                      <span>{"{aparelho}"} - Item</span>
                      <span>{"{marca}"} - Marca</span>
                      <span>{"{modelo}"} - Modelo</span>
                      <span>{"{numero_os}"} - N° OS</span>
                      <span>{"{valor}"} - Valor (Template 1)</span>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingConfig ? "Salvando..." : "Salvar Configuração"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Scheduled queue */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Fila de Mensagens</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {feedbacks.length} registros
              </span>
            </div>

            {loadingFeedbacks ? (
              <div className="py-12 text-center text-xs text-slate-400">Carregando agendamentos...</div>
            ) : feedbacks.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="max-w-xs mx-auto">
                  <p className="text-xs font-bold text-slate-700">Nenhum feedback agendado</p>
                  <p className="text-[10px] text-slate-400 mt-1">Quando você finalizar e entregar um aparelho (receber pagamento), a mensagem aparecerá aqui automaticamente.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {feedbacks.map((fb) => {
                  const countdown = getCountdownText(fb.scheduledTime);
                  
                  return (
                    <div
                      key={fb.id}
                      className={`p-4 rounded-xl border transition flex flex-col gap-3 ${
                        fb.status === "sent"
                          ? "bg-emerald-50/10 border-emerald-100/50"
                          : fb.status === "canceled"
                          ? "bg-slate-50 border-slate-100 opacity-60"
                          : countdown.isReady
                          ? "bg-amber-50/10 border-amber-200/50 shadow-sm"
                          : "bg-white border-slate-100"
                      }`}
                    >
                      {/* Top line: client & OS info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">{fb.clienteName}</span>
                            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {fb.controlNumber}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {fb.item} {fb.brand} {fb.model} • Fone: {fb.clientePhone}
                          </p>
                        </div>

                        {/* Status / Timer Badge */}
                        <div>
                          {fb.status === "sent" ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Enviado
                            </span>
                          ) : fb.status === "canceled" ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                              Cancelado
                            </span>
                          ) : countdown.isReady ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-green-500 text-white rounded-full animate-pulse flex items-center gap-1 shadow-sm shadow-green-500/20">
                              <Clock className="w-3 h-3 text-white" />
                              Pronto para Enviar
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {countdown.text}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: message preview box */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 text-[11px] text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                        {fb.messageText}
                      </div>

                      {/* Bottom line: action buttons */}
                      <div className="flex justify-between items-center border-t border-slate-100/50 pt-2">
                        <span className="text-[9px] text-slate-400 font-semibold font-mono">
                          Agenda: {new Date(fb.scheduledTime).toLocaleString("pt-BR")}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {fb.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(fb.id, "canceled")}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
                                title="Cancelar agendamento"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendWhatsApp(fb)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 transition shadow-sm ${
                                  countdown.isReady
                                    ? "bg-green-600 hover:bg-green-700 text-white shadow-green-500/10"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Enviar WhatsApp
                              </button>
                            </>
                          )}
                          
                          {fb.status !== "pending" && (
                            <button
                              onClick={() => handleUpdateStatus(fb.id, "pending")}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[9px] rounded-lg transition"
                            >
                              Reagendar
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(fb.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                            title="Remover do histórico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
