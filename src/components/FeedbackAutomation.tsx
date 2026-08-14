import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, MessageSquare, Clock, Save, Trash2, X, Check, RefreshCw, 
  ToggleLeft, ToggleRight, Search, Send, Plus, Sparkles, Filter, 
  ExternalLink, Edit3, Calendar, Phone, CheckCircle2, AlertCircle
} from "lucide-react";
import { FeedbackItem, FeedbackConfig, Cliente, Atendimento } from "../types";

interface FeedbackAutomationProps {
  onBack: () => void;
}

export default function FeedbackAutomation({ onBack }: FeedbackAutomationProps) {
  const [config, setConfig] = useState<FeedbackConfig>({
    enabled: true,
    delayHours: 3,
    messageTemplate: "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇",
    readyMessageTemplate: "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!",
    entryMessageTemplate: "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!",
    googleReviewUrl: ""
  });
  
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "ready" | "pending" | "sent" | "canceled">("all");
  const [activeTemplateTab, setActiveTemplateTab] = useState<"entry" | "ready" | "feedback">("feedback");

  // Inline editing state for message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  // Reschedule state
  const [rescheduleItem, setRescheduleItem] = useState<FeedbackItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  // Manual message modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [manualClientName, setManualClientName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualOS, setManualOS] = useState("");
  const [manualItem, setManualItem] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [manualDelayHours, setManualDelayHours] = useState(0); // 0 = send immediately
  const [creatingManual, setCreatingManual] = useState(false);

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState<FeedbackItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Template textarea refs for variable insertion
  const templateTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Periodically update current time to refresh countdowns every 10s
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
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

  const fetchAuxData = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        fetch("/api/clientes"),
        fetch("/api/atendimentos")
      ]);
      if (cRes.ok) setClients(await cRes.json());
      if (aRes.ok) setAtendimentos(await aRes.json());
    } catch (err) {
      console.error("Erro ao carregar dados auxiliares:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchFeedbacks();
    fetchAuxData();
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
        setSyncNotice("Configurações e modelos de mensagens salvos com sucesso!");
        setTimeout(() => setSyncNotice(null), 4000);
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

  // Sync / Backfill OSs
  const handleSyncFinalized = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/feedbacks/sync", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        fetchFeedbacks();
        setSyncNotice(`Sincronização concluída! ${result.syncedCount || 0} novas mensagens foram adicionadas à fila de pós-venda.`);
        setTimeout(() => setSyncNotice(null), 6000);
      } else {
        alert("Erro ao sincronizar pós-venda.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setSyncing(false);
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

  const handleSaveEditedMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText: editingMessageText })
      });
      if (res.ok) {
        setEditingMessageId(null);
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleItem || !rescheduleDate) return;
    try {
      const res = await fetch(`/api/feedbacks/${rescheduleItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledTime: new Date(rescheduleDate).toISOString(),
          status: "pending"
        })
      });
      if (res.ok) {
        setRescheduleItem(null);
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    setDeletingId(targetId);
    
    // Optimistic removal from UI
    setFeedbacks(prev => prev.filter(f => f.id !== targetId));
    setItemToDelete(null);

    try {
      const res = await fetch(`/api/feedbacks/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Erro ao excluir feedback no servidor.");
        fetchFeedbacks();
      }
    } catch (err) {
      console.error(err);
      fetchFeedbacks();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendWhatsApp = (item: FeedbackItem) => {
    let cleanPhone = (item.clientePhone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      const input = prompt(`Digite o WhatsApp de ${item.clienteName} com DDD:`, "");
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
    
    // Automatically mark as sent
    handleUpdateStatus(item.id, 'sent');
  };

  const handleCreateManualFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    setCreatingManual(true);
    try {
      const delayMs = (Number(manualDelayHours) || 0) * 3600000;
      const scheduledTime = new Date(Date.now() + delayMs).toISOString();

      let text = manualMessage;
      if (!text) {
        text = config.messageTemplate || "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu atendimento. O que você achou do nosso serviço? Seu feedback é muito importante!";
        text = text
          .replace(/{cliente}/g, manualClientName)
          .replace(/{aparelho}/g, manualItem || "aparelho")
          .replace(/{marca}/g, "")
          .replace(/{modelo}/g, "")
          .replace(/{numero_os}/g, manualOS || "")
          .replace(/{valor}/g, "");
      }

      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteName: manualClientName,
          clientePhone: manualPhone,
          controlNumber: manualOS,
          item: manualItem,
          scheduledTime,
          messageText: text
        })
      });

      if (res.ok) {
        setShowManualModal(false);
        setManualClientName("");
        setManualPhone("");
        setManualOS("");
        setManualItem("");
        setManualMessage("");
        setManualDelayHours(0);
        fetchFeedbacks();
        setSyncNotice("Nova mensagem de pós-venda agendada com sucesso!");
        setTimeout(() => setSyncNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar mensagem manual.");
    } finally {
      setCreatingManual(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;

    let currentTemplate = "";
    if (activeTemplateTab === "entry") currentTemplate = config.entryMessageTemplate || "";
    else if (activeTemplateTab === "ready") currentTemplate = config.readyMessageTemplate || "";
    else currentTemplate = config.messageTemplate || "";

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const updated = currentTemplate.substring(0, start) + variable + currentTemplate.substring(end);

    if (activeTemplateTab === "entry") setConfig({ ...config, entryMessageTemplate: updated });
    else if (activeTemplateTab === "ready") setConfig({ ...config, readyMessageTemplate: updated });
    else setConfig({ ...config, messageTemplate: updated });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 50);
  };

  const getCountdownText = (scheduledTimeStr: string) => {
    const scheduled = new Date(scheduledTimeStr);
    const diffMs = scheduled.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: "Pronta para Enviar", isReady: true };
    }

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return { text: `Falta ${diffMins} min`, isReady: false };
    }

    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    return { text: `Falta ${diffHours}h ${remMins}m`, isReady: false };
  };

  // Stats
  const totalCount = feedbacks.length;
  const readyCount = feedbacks.filter(f => f.status === "pending" && new Date(f.scheduledTime).getTime() <= now.getTime()).length;
  const waitingCount = feedbacks.filter(f => f.status === "pending" && new Date(f.scheduledTime).getTime() > now.getTime()).length;
  const sentCount = feedbacks.filter(f => f.status === "sent").length;
  const canceledCount = feedbacks.filter(f => f.status === "canceled").length;

  // Filtered List
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (fb.clienteName && fb.clienteName.toLowerCase().includes(searchLower)) ||
      (fb.clientePhone && fb.clientePhone.toLowerCase().includes(searchLower)) ||
      (fb.controlNumber && fb.controlNumber.toLowerCase().includes(searchLower)) ||
      (fb.item && fb.item.toLowerCase().includes(searchLower)) ||
      (fb.model && fb.model.toLowerCase().includes(searchLower)) ||
      (fb.messageText && fb.messageText.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    const isReady = fb.status === "pending" && new Date(fb.scheduledTime).getTime() <= now.getTime();
    if (filterTab === "ready") return isReady;
    if (filterTab === "pending") return fb.status === "pending" && !isReady;
    if (filterTab === "sent") return fb.status === "sent";
    if (filterTab === "canceled") return fb.status === "canceled";
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">Automação de Pós-Venda & Feedback</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> WhatsApp
              </span>
            </div>
            <p className="text-slate-500 text-xs">
              Acompanhamento inteligente de satisfação e fidelização de clientes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Nova Mensagem
          </button>

          <button
            onClick={handleSyncFinalized}
            disabled={syncing}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            title="Importa todas as OSs e Vendas finalizadas que ainda não possuem mensagem agendada"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar OSs Finalizadas"}
          </button>

          <button
            onClick={() => {
              fetchConfig();
              fetchFeedbacks();
            }}
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 transition"
            title="Recarregar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Success Banner */}
      {syncNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div 
          onClick={() => setFilterTab("all")}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
            filterTab === "all" ? "border-blue-500 ring-2 ring-blue-100 shadow-sm" : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Geral</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{totalCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Mensagens registradas</p>
        </div>

        <div 
          onClick={() => setFilterTab("ready")}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
            filterTab === "ready" ? "border-emerald-500 ring-2 ring-emerald-100 shadow-sm" : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Prontas p/ Envio</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{readyCount}</div>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Disparar agora</p>
        </div>

        <div 
          onClick={() => setFilterTab("pending")}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
            filterTab === "pending" ? "border-amber-500 ring-2 ring-amber-100 shadow-sm" : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Aguardando</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{waitingCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Aguardando tempo</p>
        </div>

        <div 
          onClick={() => setFilterTab("sent")}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
            filterTab === "sent" ? "border-blue-500 ring-2 ring-blue-100 shadow-sm" : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Enviadas</span>
            <Check className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">{sentCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Finalizadas com sucesso</p>
        </div>

        <div 
          onClick={() => setFilterTab("canceled")}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer col-span-2 sm:col-span-1 ${
            filterTab === "canceled" ? "border-slate-400 ring-2 ring-slate-100 shadow-sm" : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Canceladas</span>
            <X className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-600 mt-2">{canceledCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Descartadas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Settings & Message Templates */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Configurações & Modelos</h2>
              <button
                type="button"
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 transition"
              >
                <span>{config.enabled ? "Automação Ativa" : "Desativada"}</span>
                {config.enabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </button>
            </div>

            {loadingConfig ? (
              <div className="py-8 text-center text-xs text-slate-400">Carregando configurações...</div>
            ) : (
              <div className="space-y-4">
                {/* Delay hours configuration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Tempo de Espera Pós-Entrega
                    </label>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      {config.delayHours} {config.delayHours === 1 ? "hora" : "horas"}
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 5, 24, 48].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setConfig({ ...config, delayHours: hours })}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition ${
                          config.delayHours === hours
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    O pós-venda será agendado automaticamente para X horas após o pagamento da OS.
                  </p>
                </div>

                {/* Template Tabs */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Modelos de Mensagem
                    </label>
                  </div>

                  <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("feedback")}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                        activeTemplateTab === "feedback" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      3. Pós-Venda
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("ready")}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                        activeTemplateTab === "ready" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      2. Pronto
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("entry")}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                        activeTemplateTab === "entry" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      1. Entrada OS
                    </button>
                  </div>

                  {/* Active Textarea */}
                  {activeTemplateTab === "feedback" && (
                    <div className="space-y-1.5">
                      <textarea
                        ref={templateTextareaRef}
                        rows={5}
                        value={config.messageTemplate}
                        onChange={(e) => setConfig({ ...config, messageTemplate: e.target.value })}
                        className="w-full p-3 border border-emerald-200 bg-emerald-50/20 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium leading-relaxed"
                        placeholder="Ex: Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo..."
                      />
                    </div>
                  )}

                  {activeTemplateTab === "ready" && (
                    <div className="space-y-1.5">
                      <textarea
                        ref={templateTextareaRef}
                        rows={5}
                        value={config.readyMessageTemplate || ""}
                        onChange={(e) => setConfig({ ...config, readyMessageTemplate: e.target.value })}
                        className="w-full p-3 border border-blue-200 bg-blue-50/20 rounded-xl text-xs outline-none focus:border-blue-500 font-medium leading-relaxed"
                        placeholder="Ex: Olá, {cliente}! Seu aparelho já está pronto para retirada..."
                      />
                    </div>
                  )}

                  {activeTemplateTab === "entry" && (
                    <div className="space-y-1.5">
                      <textarea
                        ref={templateTextareaRef}
                        rows={5}
                        value={config.entryMessageTemplate || ""}
                        onChange={(e) => setConfig({ ...config, entryMessageTemplate: e.target.value })}
                        className="w-full p-3 border border-indigo-200 bg-indigo-50/20 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium leading-relaxed"
                        placeholder="Ex: Olá, {cliente}! Recebemos seu aparelho sob a OS..."
                      />
                    </div>
                  )}

                  {/* Dynamic Variables Pill Badges */}
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Clique para Inserir Variável no Texto:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: "{cliente}", label: "Nome do Cliente" },
                        { key: "{aparelho}", label: "Aparelho" },
                        { key: "{marca}", label: "Marca" },
                        { key: "{modelo}", label: "Modelo" },
                        { key: "{numero_os}", label: "N° da OS" },
                        { key: "{valor}", label: "Valor Total" }
                      ].map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-mono font-bold transition shadow-2xs"
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingConfig ? "Salvando..." : "Salvar Configurações & Modelos"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Feedback Queue & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            {/* Queue Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Fila de Disparos de Pós-Venda</h2>
                <p className="text-[11px] text-slate-400">
                  {filteredFeedbacks.length} de {feedbacks.length} mensagens exibidas
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente, OS, fone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs for Fast Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  filterTab === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas ({totalCount})
              </button>
              <button
                onClick={() => setFilterTab("ready")}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  filterTab === "ready" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Prontas ({readyCount})
              </button>
              <button
                onClick={() => setFilterTab("pending")}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  filterTab === "pending" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Aguardando ({waitingCount})
              </button>
              <button
                onClick={() => setFilterTab("sent")}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  filterTab === "sent" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                Enviadas ({sentCount})
              </button>
              <button
                onClick={() => setFilterTab("canceled")}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  filterTab === "canceled" ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Canceladas ({canceledCount})
              </button>
            </div>

            {/* Feedback List */}
            {loadingFeedbacks ? (
              <div className="py-16 text-center text-xs text-slate-400">Carregando agendamentos...</div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8">
                <div className="w-12 h-12 bg-white text-slate-300 rounded-full flex items-center justify-center mx-auto shadow-2xs border border-slate-100">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="max-w-sm mx-auto">
                  <p className="text-xs font-bold text-slate-700">Nenhuma mensagem encontrada neste filtro</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clique em <strong>"Sincronizar OSs Finalizadas"</strong> para puxar todas as ordens de serviço entregues para a fila.
                  </p>
                  <button
                    onClick={handleSyncFinalized}
                    disabled={syncing}
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                    Sincronizar Agora
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredFeedbacks.map((fb) => {
                  const countdown = getCountdownText(fb.scheduledTime);
                  const isEditingThis = editingMessageId === fb.id;
                  
                  return (
                    <div
                      key={fb.id}
                      className={`p-4 rounded-2xl border transition flex flex-col gap-3 ${
                        fb.status === "sent"
                          ? "bg-slate-50/70 border-slate-200/70 opacity-90"
                          : fb.status === "canceled"
                          ? "bg-slate-50 border-slate-100 opacity-60"
                          : countdown.isReady
                          ? "bg-emerald-50/40 border-emerald-300 shadow-sm ring-1 ring-emerald-200/50"
                          : "bg-white border-slate-200/80 shadow-2xs"
                      }`}
                    >
                      {/* Top Line: Client & OS Details */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-800">{fb.clienteName}</span>
                            {fb.controlNumber && (
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                {fb.controlNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            {fb.item && <span>{fb.item} {fb.brand} {fb.model}</span>}
                            {fb.item && fb.clientePhone && <span>•</span>}
                            {fb.clientePhone ? (
                              <span className="font-mono font-semibold text-slate-600 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {fb.clientePhone}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-semibold text-[10px]">Sem telefone cadastrado</span>
                            )}
                          </div>
                        </div>

                        {/* Status / Timer Badge */}
                        <div className="shrink-0">
                          {fb.status === "sent" ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Enviado
                            </span>
                          ) : fb.status === "canceled" ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">
                              Cancelado
                            </span>
                          ) : countdown.isReady ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                              <Sparkles className="w-3.5 h-3.5" />
                              Pronta para Enviar
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {countdown.text}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Editable / Preformatted Message Box */}
                      {isEditingThis ? (
                        <div className="space-y-2 bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                          <textarea
                            value={editingMessageText}
                            onChange={(e) => setEditingMessageText(e.target.value)}
                            rows={4}
                            className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditedMessage(fb.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                            >
                              Salvar Texto
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-normal whitespace-pre-wrap leading-relaxed">
                          {fb.messageText}
                        </div>
                      )}

                      {/* Bottom Line: Timestamps & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px]">
                        <div className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Agendamento: {new Date(fb.scheduledTime).toLocaleString("pt-BR")}</span>
                          {fb.sentAt && (
                            <span className="text-emerald-600 ml-1 font-semibold">
                              (Enviado em {new Date(fb.sentAt).toLocaleDateString("pt-BR")})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Edit Message button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(fb.id);
                              setEditingMessageText(fb.messageText);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Editar texto da mensagem"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reschedule button */}
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleItem(fb);
                              setRescheduleDate(new Date(fb.scheduledTime).toISOString().slice(0, 16));
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Alterar data/hora"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {fb.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(fb.id, "canceled")}
                                className="px-2.5 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-semibold text-xs transition"
                                title="Cancelar agendamento"
                              >
                                Cancelar
                              </button>

                              <button
                                onClick={() => handleSendWhatsApp(fb)}
                                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
                                  countdown.isReady
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-slate-800 hover:bg-black text-white"
                                }`}
                              >
                                <Send className="w-3.5 h-3.5" />
                                Enviar WhatsApp
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(fb.id, "pending")}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                            >
                              Reagendar Envio
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setItemToDelete(fb)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Excluir mensagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: Nova Mensagem Avulsa / Manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Nova Mensagem de Pós-Venda</h3>
                <p className="text-xs text-slate-400">Envie ou agende uma mensagem direta para um cliente</p>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualFeedback} className="space-y-3.5">
              {/* Client Quick Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Selecione um Cliente ou Digite:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do Cliente"
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    className="p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp com DDD (Ex: 11999999999)"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium font-mono"
                  />
                </div>
              </div>

              {/* OS and Device optional */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">N° da OS (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ex: OS-0012"
                    value={manualOS}
                    onChange={(e) => setManualOS(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Aparelho / Produto:</label>
                  <input
                    type="text"
                    placeholder="Ex: iPhone 13 Pro"
                    value={manualItem}
                    onChange={(e) => setManualItem(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Delay hours */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Quando Disparar?</label>
                <select
                  value={manualDelayHours}
                  onChange={(e) => setManualDelayHours(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                >
                  <option value={0}>Imediatamente (Pronta para Enviar)</option>
                  <option value={1}>Daqui a 1 hora</option>
                  <option value={3}>Daqui a 3 horas</option>
                  <option value={5}>Daqui a 5 horas</option>
                  <option value={24}>Daqui a 24 horas (Amanhã)</option>
                  <option value={48}>Daqui a 48 horas (2 dias)</option>
                </select>
              </div>

              {/* Custom Message */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Texto da Mensagem (Deixe vazio para usar modelo padrão):</label>
                <textarea
                  rows={4}
                  placeholder="Se deixar em branco, o sistema preenche com o modelo de pós-venda configurado..."
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingManual}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
                >
                  {creatingManual ? "Criando..." : "Agendar Mensagem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reagendar Horário */}
      {rescheduleItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Reagendar Disparo</h3>
              <button onClick={() => setRescheduleItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Defina a nova data e horário para o envio da mensagem para <strong>{rescheduleItem.clienteName}</strong>:
              </p>

              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveReschedule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                >
                  Confirmar Novo Horário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Mensagem */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Excluir Mensagem</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setItemToDelete(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza de que deseja remover esta mensagem da fila de pós-venda para <strong>{itemToDelete.clienteName}</strong>
                {itemToDelete.controlNumber ? ` (${itemToDelete.controlNumber})` : ""}?
              </p>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 line-clamp-3 italic">
                "{itemToDelete.messageText}"
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingId === itemToDelete.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingId === itemToDelete.id ? "Excluindo..." : "Excluir Mensagem"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
