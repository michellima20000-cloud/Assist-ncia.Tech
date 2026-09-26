import React, { useState, useEffect } from "react";
import {
  CreditCard, Shield, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  Copy, Check, RefreshCw, Send, Edit3, Plus, UserPlus, Users, Building2,
  Calendar, DollarSign, ArrowRight, Zap, Sparkles, X, ChevronRight, MessageCircle,
  HelpCircle, Lock, ShieldCheck, CheckCheck
} from "lucide-react";
import { User, Company, SubscriptionInfo } from "../types";

interface SubscriptionManagerProps {
  currentUser: User;
  isSuperAdmin: boolean;
  activeCompanyId: string;
  onOpenEmployeeManager?: () => void;
  onSwitchCompany?: (comp: Company) => void;
  onClose?: () => void;
}

export default function SubscriptionManager({
  currentUser,
  isSuperAdmin,
  activeCompanyId,
  onOpenEmployeeManager,
  onSwitchCompany,
  onClose
}: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [settings, setSettings] = useState<{ pixKey: string; whatsappSupport: string }>({
    pixKey: "michel.lima20000@gmail.com",
    whatsappSupport: "5511999999999"
  });

  // Current tenant single subscription (for store admin)
  const [currentSub, setCurrentSub] = useState<SubscriptionInfo | null>(null);

  // Filters & Search (for SuperAdmin)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "past_due" | "suspended">("all");
  const [copiedKey, setCopiedKey] = useState(false);

  // Edit Subscription Modal (SuperAdmin)
  const [editingSub, setEditingSub] = useState<SubscriptionInfo | null>(null);
  const [editForm, setEditForm] = useState({
    plan: "mensal_2",
    status: "active",
    expiresAt: "",
    maxAccounts: 2,
    maxEmployees: 1,
    customPrice: "",
    notes: ""
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Settings Modal (PIX Key & WhatsApp)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ pixKey: "", whatsappSupport: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  // Feedback toast
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const res = await fetch("/api/system/subscriptions");
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions || []);
          setPlans(data.plans || []);
          setSummary(data.summary || null);
          if (data.settings) {
            setSettings(data.settings);
            setSettingsForm({
              pixKey: data.settings.pixKey || "michel.lima20000@gmail.com",
              whatsappSupport: data.settings.whatsappSupport || "5511999999999"
            });
          }
        }
      } else {
        const res = await fetch("/api/subscription/current", {
          headers: {
            "x-company-id": activeCompanyId
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentSub(data.subscription || null);
          setPlans(data.plans || []);
          if (data.pixKey) {
            setSettings(prev => ({
              ...prev,
              pixKey: data.pixKey,
              whatsappSupport: data.whatsappSupport || prev.whatsappSupport
            }));
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar assinaturas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isSuperAdmin, activeCompanyId]);

  const handleCopyPix = (keyToCopy: string) => {
    navigator.clipboard.writeText(keyToCopy);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleOpenEditModal = (sub: SubscriptionInfo) => {
    setEditingSub(sub);
    setEditForm({
      plan: sub.planId,
      status: sub.status,
      expiresAt: sub.expiresAt ? sub.expiresAt.substring(0, 10) : "",
      maxAccounts: sub.maxAccounts,
      maxEmployees: sub.maxEmployees,
      customPrice: String(sub.price || ""),
      notes: sub.notes || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        plan: editForm.plan,
        status: editForm.status,
        maxAccounts: Number(editForm.maxAccounts),
        maxEmployees: Number(editForm.maxEmployees),
        notes: editForm.notes
      };

      if (editForm.expiresAt) {
        // preserve end of day
        payload.expiresAt = new Date(`${editForm.expiresAt}T23:59:59.000Z`).toISOString();
      }

      if (editForm.customPrice && !isNaN(Number(editForm.customPrice))) {
        payload.customPrice = Number(editForm.customPrice);
      }

      const res = await fetch(`/api/system/subscriptions/${editingSub.companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFeedback({ type: "success", message: `Assinatura de "${editingSub.companyName}" atualizada com sucesso!` });
        setIsEditModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Falha ao salvar assinatura." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro de conexão." });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleQuickRenew = async (sub: SubscriptionInfo, period: "monthly" | "annual") => {
    const label = period === "annual" ? "+1 Ano" : "+30 Dias";
    if (!window.confirm(`Deseja prorrogar a assinatura de "${sub.companyName}" por ${label}?`)) return;

    try {
      const res = await fetch(`/api/system/subscriptions/${sub.companyId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period })
      });

      if (res.ok) {
        setFeedback({ type: "success", message: `Assinatura renovada por ${label} com sucesso!` });
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao renovar.");
      }
    } catch (err: any) {
      alert("Erro ao renovar: " + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/subscription/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings({ pixKey: updated.pixKey, whatsappSupport: updated.whatsappSupport });
        setIsSettingsModalOpen(false);
        setFeedback({ type: "success", message: "Chave PIX e dados de suporte atualizados com sucesso!" });
      } else {
        alert("Erro ao salvar dados.");
      }
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendWhatsAppReminder = (sub: SubscriptionInfo) => {
    const phoneClean = (sub.phone || "").replace(/\D/g, "");
    if (!phoneClean) {
      alert("Esta loja não possui número de telefone/WhatsApp cadastrado.");
      return;
    }

    const expDateStr = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("pt-BR") : "em breve";
    const valorStr = sub.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    let statusText = "";
    if (sub.isExpired) {
      statusText = `sua assinatura está VENCIDA desde ${expDateStr}`;
    } else if (sub.daysRemaining <= 5) {
      statusText = `sua assinatura vence em ${sub.daysRemaining} dias (${expDateStr})`;
    } else {
      statusText = `sua assinatura tem vencimento previsto para ${expDateStr}`;
    }

    const message = `Olá, ${sub.ownerName || "Administrador"} da ${sub.companyName}! Tudo bem?\n\nPassando para informar que ${statusText} no valor de R$ ${valorStr} referente ao plano: *${sub.planName}*.\n\nPara renovar seu acesso e manter o login da sua loja e do seu funcionário ativos sem interrupções, você pode realizar a transferência via PIX:\n\n*Chave PIX:* ${settings.pixKey}\n*Valor:* R$ ${valorStr}\n\nApós o pagamento, por gentileza envie o comprovante por aqui. Muito obrigado pela parceria! 🚀`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${phoneClean.replace(/^55/, "")}?text=${encoded}`, "_blank");
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch =
      (s.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.ownerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.ownerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === "active") return s.status === "active";
    if (statusFilter === "trial") return s.status === "trial";
    if (statusFilter === "past_due") return s.status === "past_due";
    if (statusFilter === "suspended") return s.status === "suspended";
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold shadow-md transition ${
          feedback.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCheck className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 text-slate-950">
              <CreditCard className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {isSuperAdmin ? "Painel Master de Assinaturas" : "Minha Assinatura & Plano"}
                </span>
                <span className="text-xs text-slate-400">
                  {isSuperAdmin ? "Gestão de Cobranças & Lojas" : "Recursos & Limites da Loja"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                {isSuperAdmin ? "Controle Geral de Assinaturas" : "Plano & Equipe da Sua Assistência"}
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl mt-1">
                {isSuperAdmin
                  ? "Monitore o status de pagamento de cada loja cadastrada, gerencie limites de funcionários, planos mensais e anuais com desconto."
                  : "Acompanhe a vigência do seu plano, limites de usuários cadastrados e faça upgrades com desconto anual."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {isSuperAdmin ? (
              <>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition border border-white/10"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Configurar Chave PIX</span>
                </button>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </>
            ) : (
              onOpenEmployeeManager && (
                <button
                  onClick={onOpenEmployeeManager}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Gerenciar Funcionário</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* METRICS BAR (SUPERADMIN ONLY) */}
        {isSuperAdmin && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-indigo-900/60">
            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-indigo-800/40">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">MRR Recorrente</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
                R$ {summary.totalMRR?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Faturamento est. / mês</p>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-indigo-800/40">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Lojas Ativas</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {summary.activeCount} <span className="text-xs font-normal text-slate-400">/ {summary.totalCompanies}</span>
              </p>
              <p className="text-[10px] text-emerald-400 mt-0.5">Planos pagos ativos</p>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-indigo-800/40">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Período de Testes</p>
              <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{summary.trialCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Trial 7 dias grátis</p>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-indigo-800/40">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Vencidas / Cobrança</p>
              <p className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5">{summary.pastDueCount}</p>
              <p className="text-[10px] text-rose-300/80 mt-0.5">Atrasadas para cobrar</p>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-indigo-800/40">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Lojas Suspensas</p>
              <p className="text-xl sm:text-2xl font-black text-slate-400 mt-0.5">{summary.suspendedCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Bloqueadas</p>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-indigo-800/40">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Usuários Totais</p>
              <p className="text-xl sm:text-2xl font-black text-blue-400 mt-0.5">{summary.totalUsers}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Admins + Funcionários</p>
            </div>
          </div>
        )}
      </div>

      {/* STORE ADMIN VIEW (CARD DA ASSINATURA DA SUA PRÓPRIA LOJA) */}
      {!isSuperAdmin && currentSub && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  currentSub.status === "active" ? "bg-emerald-600 shadow-emerald-500/20" :
                  currentSub.status === "trial" ? "bg-indigo-600 shadow-indigo-500/20" :
                  currentSub.status === "past_due" ? "bg-rose-600 shadow-rose-500/20" : "bg-slate-700"
                }`}>
                  {currentSub.status === "active" ? <CheckCircle2 className="w-8 h-8" /> :
                   currentSub.status === "trial" ? <Sparkles className="w-8 h-8" /> :
                   <AlertTriangle className="w-8 h-8" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{currentSub.companyName}</h2>
                    <span className={`px-2.5 py-0.5 text-xs font-black uppercase rounded-full ${
                      currentSub.status === "active" ? "bg-emerald-100 text-emerald-800" :
                      currentSub.status === "trial" ? "bg-indigo-100 text-indigo-800" :
                      currentSub.status === "past_due" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-800"
                    }`}>
                      {currentSub.status === "active" ? "Plano Ativo" :
                       currentSub.status === "trial" ? "Período de Testes" :
                       currentSub.status === "past_due" ? "Vencido / Renove Já" : "Suspenso"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Plano Vigente: <strong className="text-slate-800">{currentSub.planName}</strong>
                  </p>
                </div>
              </div>

              {/* Price Tag */}
              <div className="text-left md:text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Valor do Plano</p>
                <p className="text-2xl font-black text-slate-900 font-mono">
                  {currentSub.price === 0 ? "Grátis (Teste)" : `R$ ${currentSub.price.toFixed(2)}`}
                  <span className="text-xs font-normal text-slate-500"> / {currentSub.period === "annual" ? "ano" : "mês"}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vencimento: <strong>{currentSub.expiresAt ? new Date(currentSub.expiresAt).toLocaleDateString("pt-BR") : "N/A"}</strong>
                  {currentSub.daysRemaining >= 0 ? (
                    <span className="text-emerald-600 font-bold ml-1.5">({currentSub.daysRemaining} dias restantes)</span>
                  ) : (
                    <span className="text-rose-600 font-bold ml-1.5">(Venceu há {Math.abs(currentSub.daysRemaining)} dias)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quota & Funcionário info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Account Quota Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Limite de Contas da Loja</h3>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-mono">
                    {currentSub.currentUsersCount} / {currentSub.maxAccounts} usuários
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      currentSub.currentUsersCount >= currentSub.maxAccounts ? "bg-amber-500" : "bg-indigo-600"
                    }`}
                    style={{
                      width: `${Math.min(100, (currentSub.currentUsersCount / currentSub.maxAccounts) * 100)}%`
                    }}
                  />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentSub.maxAccounts >= 2 ? (
                    <span>
                      Seu plano permite <strong>1 Administrador + 1 Funcionário</strong> dedicado. Você tem autonomia total para cadastrar ou trocar seu funcionário diretamente pelo sistema!
                    </span>
                  ) : (
                    <span>
                      Seu plano atual permite apenas <strong>1 usuário (Administrador)</strong>. Para liberar o cadastro de <strong>1 funcionário</strong>, faça o upgrade para o <em>Plano de 2 Contas</em> abaixo!
                    </span>
                  )}
                </p>

                {onOpenEmployeeManager && (
                  <button
                    onClick={onOpenEmployeeManager}
                    className="mt-3.5 w-full py-2 px-3 bg-white hover:bg-slate-100 text-indigo-900 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition shadow-2xs"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>Cadastrar / Gerenciar Funcionário da Loja</span>
                  </button>
                )}
              </div>

              {/* PIX Quick Pay Box */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 rounded-2xl p-5 border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm text-indigo-950">Renovação Imediata via PIX</h3>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    Liberação Rápida
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  Transfira o valor da sua mensalidade ou anuidade para a chave PIX oficial do sistema:
                </p>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-indigo-200 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={settings.pixKey}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyPix(settings.pixKey)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>

                <a
                  href={`https://wa.me/${settings.whatsappSupport.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Olá! Segue o comprovante de renovação da loja ${currentSub.companyName} (${currentSub.planName}) via PIX.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Comprovante no WhatsApp do Administrador</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPERADMIN VIEW: LIST OF ALL REGISTERED COMPANIES & SUBSCRIPTIONS */}
      {isSuperAdmin && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas ({subscriptions.length})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "active" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Ativas ({subscriptions.filter(s => s.status === "active").length})
              </button>
              <button
                onClick={() => setStatusFilter("trial")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "trial" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Em Teste ({subscriptions.filter(s => s.status === "trial").length})
              </button>
              <button
                onClick={() => setStatusFilter("past_due")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "past_due" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Vencidas / Cobrar ({subscriptions.filter(s => s.status === "past_due").length})
              </button>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por loja, e-mail ou tel..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Subscriptions Table / Cards */}
          <div className="space-y-3">
            {filteredSubscriptions.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">Nenhuma loja encontrada</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou crie uma nova assistência.</p>
              </div>
            ) : (
              filteredSubscriptions.map(sub => {
                const isSelectedStore = sub.companyId === activeCompanyId;
                return (
                  <div
                    key={sub.companyId}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
                      isSelectedStore ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          sub.status === "active" ? "bg-emerald-100 text-emerald-700" :
                          sub.status === "trial" ? "bg-indigo-100 text-indigo-700" :
                          sub.status === "past_due" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          <Building2 className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-slate-900 text-sm">{sub.companyName}</h3>
                            {isSelectedStore && (
                              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                                Em Uso
                              </span>
                            )}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              sub.status === "active" ? "bg-emerald-100 text-emerald-800" :
                              sub.status === "trial" ? "bg-indigo-100 text-indigo-800" :
                              sub.status === "past_due" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-800"
                            }`}>
                              {sub.status === "active" ? "Ativo" :
                               sub.status === "trial" ? "Teste (7d)" :
                               sub.status === "past_due" ? "Vencido" : "Suspenso"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            {sub.ownerName && <span>Resp: <strong className="text-slate-700">{sub.ownerName}</strong></span>}
                            {sub.ownerEmail && <span>E-mail: <strong className="text-slate-700">{sub.ownerEmail}</strong></span>}
                            {sub.phone && <span>WhatsApp: <strong className="text-slate-700">{sub.phone}</strong></span>}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Plan & Limits */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 px-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Plano</p>
                          <p className="font-black text-slate-800">{sub.planName}</p>
                          <p className="text-[11px] text-indigo-700 font-bold font-mono">
                            {sub.price === 0 ? "Grátis" : `R$ ${sub.price.toFixed(2)}`}
                            <span className="text-[10px] text-slate-400 font-normal"> / {sub.period === "annual" ? "ano" : "mês"}</span>
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Contas / Equipe</p>
                          <p className="font-black text-slate-800">
                            {sub.currentUsersCount} / {sub.maxAccounts} usuários
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {sub.maxEmployees > 0 ? "1 Funcionário liberado" : "Sem funcionário"}
                          </p>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimento</p>
                          <p className="font-bold text-slate-800">
                            {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("pt-BR") : "Indeterminado"}
                          </p>
                          <p className={`text-[10px] font-bold ${
                            sub.daysRemaining < 0 ? "text-rose-600" : sub.daysRemaining <= 5 ? "text-amber-600" : "text-emerald-600"
                          }`}>
                            {sub.daysRemaining < 0 ? `Vencido há ${Math.abs(sub.daysRemaining)}d` : `Restam ${sub.daysRemaining} dias`}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* WhatsApp Cobrança */}
                        {sub.phone && (
                          <button
                            onClick={() => handleSendWhatsAppReminder(sub)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1 transition"
                            title="Cobrar via WhatsApp com Chave PIX"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span className="hidden sm:inline">Cobrar WhatsApp</span>
                          </button>
                        )}

                        {/* Quick Renew +30d */}
                        <button
                          onClick={() => handleQuickRenew(sub, "monthly")}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition"
                          title="Prorrogar por mais 30 dias"
                        >
                          +30 Dias
                        </button>

                        {/* Quick Renew +1 Year */}
                        <button
                          onClick={() => handleQuickRenew(sub, "annual")}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition"
                          title="Prorrogar por 1 ano"
                        >
                          +1 Ano
                        </button>

                        {/* Edit Plan / Config */}
                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                          title="Editar Assinatura e Limites"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Switch Active Store */}
                        {onSwitchCompany && (
                          <button
                            onClick={() => onSwitchCompany({ id: sub.companyId, name: sub.companyName, createdAt: sub.createdAt })}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition"
                            title="Acessar painel desta loja"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PRICING & PLANS SHOWCASE (VISÍVEL PARA TODOS OS USUÁRIOS) */}
      <div className="space-y-4 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            Tabela Oficial de Planos
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Planos Mensais e Anuais com Super Desconto
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Adicione funcionários, automatize ordens de serviço, gerencie estoques e controle todo o caixa da assistência.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* PLANO 1: MENSAL 1 CONTA */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-slate-300 shadow-sm flex flex-col justify-between transition-all group">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                  Individual
                </span>
                <span className="text-xs font-bold text-slate-400">1 Conta</span>
              </div>
              <h3 className="text-base font-black text-slate-900">Plano Mensal (1 Conta)</h3>
              <p className="text-xs text-slate-500 mt-1">Acesso completo para o técnico / administrador individual.</p>

              <div className="my-5">
                <span className="text-3xl font-black text-slate-900 font-mono">R$ 60,00</span>
                <span className="text-xs text-slate-400"> / mês</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>1 Administrador</strong> geral</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ordens de Serviço ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Impressão de Recibos & QR Code</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Estoque & Peças com leitor de barras</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Sem login para funcionário</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleCopyPix(settings.pixKey)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar PIX (R$ 60,00)</span>
              </button>
            </div>
          </div>

          {/* PLANO 2: MENSAL 2 CONTAS (COM FUNCIONÁRIO) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-indigo-500 shadow-md flex flex-col justify-between transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
              Com Funcionário
            </div>

            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">
                  Equipe Completa
                </span>
                <span className="text-xs font-bold text-indigo-600 mr-16">2 Contas</span>
              </div>
              <h3 className="text-base font-black text-slate-900">Plano Mensal (2 Contas)</h3>
              <p className="text-xs text-slate-500 mt-1">O dono pode cadastrar 1 funcionário por conta própria!</p>

              <div className="my-5">
                <span className="text-3xl font-black text-indigo-600 font-mono">R$ 90,00</span>
                <span className="text-xs text-slate-400"> / mês</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>1 Administrador + 1 Funcionário</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>Autonomia total:</strong> O admin adiciona e troca o funcionário</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Acesso do funcionário a OS e Peças</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Caixa e relatórios protegidos p/ admin</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>WhatsApp Pós-Venda Automático</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleCopyPix(settings.pixKey)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar PIX (R$ 90,00)</span>
              </button>
            </div>
          </div>

          {/* PLANO 3: ANUAL 1 CONTA COM DESCONTO */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-slate-300 shadow-sm flex flex-col justify-between transition-all group">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-black">
                  18% OFF ANUAL
                </span>
                <span className="text-xs font-bold text-slate-400">1 Conta</span>
              </div>
              <h3 className="text-base font-black text-slate-900">Plano Anual (1 Conta)</h3>
              <p className="text-xs text-slate-500 mt-1">Economia de R$ 132,00 por ano no plano individual.</p>

              <div className="my-5">
                <span className="text-3xl font-black text-emerald-600 font-mono">R$ 588,00</span>
                <span className="text-xs text-slate-400"> / ano</span>
                <p className="text-[11px] text-emerald-700 font-bold mt-1">
                  Equivalente a apenas R$ 49,00 / mês
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>1 Administrador</strong> geral</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>2 meses grátis</strong> de economia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sem reajustes durante 12 meses</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Suporte prioritário via WhatsApp</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleCopyPix(settings.pixKey)}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-emerald-200"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar PIX (R$ 588,00)</span>
              </button>
            </div>
          </div>

          {/* PLANO 4: ANUAL 2 CONTAS (SUPER DESCONTO) */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-white rounded-3xl p-6 border-2 border-amber-400 shadow-md flex flex-col justify-between transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
              SUPER DESCONTO 🔥
            </div>

            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-amber-400/30 text-amber-900 rounded-xl text-xs font-black">
                  MAIS POPULAR
                </span>
                <span className="text-xs font-bold text-amber-800 mr-24">2 Contas</span>
              </div>
              <h3 className="text-base font-black text-slate-900">Plano Anual (2 Contas)</h3>
              <p className="text-xs text-slate-600 mt-1">1 Administrador + 1 Funcionário pelo menor preço anual!</p>

              <div className="my-5">
                <span className="text-3xl font-black text-slate-950 font-mono">R$ 888,00</span>
                <span className="text-xs text-slate-500"> / ano</span>
                <p className="text-[11px] text-amber-800 font-black mt-1">
                  Equivalente a apenas R$ 74,00 / mês (Economize R$ 192/ano)
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 border-t border-amber-200/50 pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span><strong>1 Administrador + 1 Funcionário</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span><strong>Autonomia total</strong> de gerência de equipe</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Economia de quase R$ 200 no ano</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Todos os recursos liberados</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleCopyPix(settings.pixKey)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar PIX (R$ 888,00)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT SUBSCRIPTION MODAL (SUPERADMIN ONLY) */}
      {isEditModalOpen && editingSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Editar Assinatura da Loja</h3>
                <p className="text-[11px] text-slate-500">{editingSub.companyName}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plano Escolhido</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const cfg = plans.find(p => p.id === chosen);
                    setEditForm({
                      ...editForm,
                      plan: chosen,
                      maxAccounts: cfg ? cfg.maxAccounts : editForm.maxAccounts,
                      maxEmployees: cfg ? cfg.maxEmployees : editForm.maxEmployees,
                      customPrice: cfg ? String(cfg.price) : editForm.customPrice
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                >
                  <option value="mensal_1">Plano Mensal (1 Conta) - R$ 60,00/mês</option>
                  <option value="mensal_2">Plano Mensal (2 Contas) - R$ 90,00/mês (1 Admin + 1 Func)</option>
                  <option value="anual_1">Plano Anual (1 Conta) - R$ 588,00/ano (18% OFF)</option>
                  <option value="anual_2">Plano Anual (2 Contas) - R$ 888,00/ano (Super Desconto)</option>
                  <option value="trial">Período de Testes (7 dias) - R$ 0,00</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status da Assinatura</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="active">Ativo (Pago)</option>
                    <option value="trial">Em Teste (Trial)</option>
                    <option value="past_due">Vencido / Atrasado</option>
                    <option value="suspended">Suspenso (Bloqueado)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={editForm.expiresAt}
                    onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Máx. Contas</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editForm.maxAccounts}
                    onChange={(e) => setEditForm({ ...editForm, maxAccounts: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Máx. Funcionários</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editForm.maxEmployees}
                    onChange={(e) => setEditForm({ ...editForm, maxEmployees: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Cobrado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.customPrice}
                    onChange={(e) => setEditForm({ ...editForm, customPrice: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Ex: Pagamento confirmado via PIX comprovante #1234"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL: PIX KEY & WHATSAPP SUPPORT (SUPERADMIN) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900">Configurações de Pagamento & PIX</h3>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chave PIX Oficial para Recebimento</label>
                <input
                  type="text"
                  required
                  value={settingsForm.pixKey}
                  onChange={(e) => setSettingsForm({ ...settingsForm, pixKey: e.target.value })}
                  placeholder="Ex: michel.lima20000@gmail.com ou chave aleatória"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Esta chave será exibida para todos os administradores de lojas realizarem os pagamentos.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp para Envio de Comprovantes</label>
                <input
                  type="text"
                  required
                  value={settingsForm.whatsappSupport}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsappSupport: e.target.value })}
                  placeholder="Ex: 5511999999999"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Inclua o DDI (55) e DDD. Ex: 5511999999999
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
