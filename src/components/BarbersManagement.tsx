import React, { useState, useEffect, useRef } from "react";
import {
  Users, UserPlus, RefreshCw, Settings, Sparkles, Check, X, AlertTriangle,
  Calendar, CreditCard, Shield, Edit, Trash2, ChevronDown, CheckCircle2,
  XCircle, Clock, Upload, FileText,
  DollarSign, Smartphone, ExternalLink, HelpCircle, Eye, Search, Filter, Copy, QrCode
} from "lucide-react";
import { User, PixConfig, PixSubscriptionRequest } from "../types";
import SubscriptionPlansModal from "./SubscriptionPlansModal";
import { compressImage } from "../lib/imageCompressor";

interface BarbersManagementProps {
  currentUser?: User | null;
  onRefreshUsers?: () => void;
}

export default function BarbersManagement({
  currentUser,
  onRefreshUsers
}: BarbersManagementProps) {
  const [barbers, setBarbers] = useState<User[]>([]);
  const [pixRequests, setPixRequests] = useState<PixSubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "pending_pix" | "expired">("all");

  // Modals
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showConfigPixModal, setShowConfigPixModal] = useState(false);
  const [showNewBarberModal, setShowNewBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<User | null>(null);
  const [validatingBarber, setValidatingBarber] = useState<User | null>(null);
  const [previewComprovante, setPreviewComprovante] = useState<string | null>(null);

  // Quick message feedback
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [barbersRes, requestsRes] = await Promise.all([
        fetch("/api/barbers"),
        fetch("/api/pix/requests")
      ]);

      if (barbersRes.ok) {
        const barbersData = await barbersRes.json();
        setBarbers(barbersData);
      }
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setPixRequests(requestsData);
      }
      if (onRefreshUsers) {
        onRefreshUsers();
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      showNotification("Erro ao carregar lista de barbeiros", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Action: Expire Barber
  const handleExpireBarber = async (barberId: string, barberName: string) => {
    if (!window.confirm(`Tem certeza que deseja marcar a conta de "${barberName}" como EXPIRADA?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/barbers/${barberId}/expire`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao expirar conta");
      showNotification(`Conta de ${barberName} expirada com sucesso.`);
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Quick Action: Extend or grant 15 days free trial
  const handleExtendTrial = async (barberId: string, barberName: string) => {
    try {
      const res = await fetch(`/api/barbers/${barberId}/extend-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 15 })
      });
      if (!res.ok) throw new Error("Erro ao estender período de teste");
      showNotification(`Período de teste de 15 dias concedido para ${barberName}!`);
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Quick Action: Change Role directly
  const handleChangeRole = async (barberId: string, newRole: any) => {
    try {
      const res = await fetch(`/api/barbers/${barberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error("Erro ao alterar cargo");
      showNotification("Cargo atualizado!");
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Quick Action: Add Extra Account (+1)
  const handleAddExtraAccount = async (barber: User) => {
    const currentExtras = barber.extraAccounts || 0;
    const newExtras = currentExtras + 1;
    try {
      const res = await fetch(`/api/barbers/${barber.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraAccounts: newExtras })
      });
      if (!res.ok) throw new Error("Erro ao adicionar conta extra");
      showNotification(`Conta extra adicionada para ${barber.name} (Total: ${newExtras})!`);
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Quick Action: Delete Barber
  const handleDeleteBarber = async (barberId: string, barberName: string) => {
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir a conta do técnico "${barberName}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/barbers/${barberId}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao excluir conta");
      }
      showNotification(`Conta de ${barberName} excluída.`);
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Filter Barbers
  const filteredBarbers = barbers.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase());

    const isExp =
      b.subscriptionStatus === "expired" ||
      (b.expiresAt && new Date(b.expiresAt).getTime() < Date.now());

    if (statusFilter === "active") {
      return matchesSearch && !isExp && b.subscriptionStatus === "active";
    }
    if (statusFilter === "trial") {
      return matchesSearch && !isExp && b.subscriptionStatus === "trial";
    }
    if (statusFilter === "pending_pix") {
      return matchesSearch && b.subscriptionStatus === "pending_pix";
    }
    if (statusFilter === "expired") {
      return matchesSearch && isExp;
    }
    return matchesSearch;
  });

  const pendingRequestsCount = pixRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in text-white pb-12">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs font-bold transition-all ${
            notification.type === "success"
              ? "bg-emerald-950 border-emerald-500/50 text-emerald-200"
              : "bg-red-950 border-red-500/50 text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER SECTION - EXACTLY MATCHING SCREENSHOT 2 */}
      <div className="bg-[#101319] border border-[#1f2533] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            GESTÃO DE USUÁRIOS & TÉCNICOS (ASSISTÊNCIA TÉCNICA)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cadastre novos técnicos e atendentes, aprove comprovantes Pix e gerencie as permissões e assinaturas da assistência.
          </p>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* ORANGE GLOWING BUTTON FOR NEW TECHNICIAN / ACCOUNT */}
          <button
            type="button"
            onClick={() => setShowNewBarberModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ NOVO TÉCNICO / CONTA</span>
          </button>

          {/* REFRESH BUTTON */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2.5 bg-[#171b24] hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition border border-[#262c38] flex items-center gap-1.5 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">ATUALIZAR</span>
          </button>

          {/* CONFIG PIX BUTTON */}
          <button
            type="button"
            onClick={() => setShowConfigPixModal(true)}
            className="px-3.5 py-2.5 bg-[#171b24] hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-xs rounded-xl transition border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>CONFIGURAR CHAVE PIX</span>
          </button>

          {/* VIEW PLANS BUTTON */}
          <button
            type="button"
            onClick={() => setShowPlansModal(true)}
            className="px-3.5 py-2.5 bg-[#171b24] hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs rounded-xl transition border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>TABELA DE PLANOS (PIX)</span>
          </button>
        </div>
      </div>

      {/* PENDING PIX REQUESTS BANNER (IF ANY) */}
      {pendingRequestsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-[#181d26] to-emerald-500/20 border border-amber-500/40 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {pendingRequestsCount} Comprovante(s) Pix Aguardando Validação!
              </h3>
              <p className="text-xs text-slate-300">
                Técnicos enviaram o comprovante de pagamento e estão aguardando a liberação da conta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter("pending_pix")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider transition shadow-md cursor-pointer"
          >
            Ver Solicitações Pendentes
          </button>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#11141b] border border-[#202633] p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 bg-[#171b24] border border-[#282f3f] rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              statusFilter === "all"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Todos ({barbers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Ativos ({barbers.filter(b => b.subscriptionStatus === "active" && (!b.expiresAt || new Date(b.expiresAt).getTime() >= Date.now())).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("trial")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              statusFilter === "trial"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Em Teste ({barbers.filter(b => b.subscriptionStatus === "trial" && (!b.expiresAt || new Date(b.expiresAt).getTime() >= Date.now())).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending_pix")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              statusFilter === "pending_pix"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pendentes Pix ({pendingRequestsCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("expired")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              statusFilter === "expired"
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Expirados ({barbers.filter(b => b.subscriptionStatus === "expired" || (b.expiresAt && new Date(b.expiresAt).getTime() < Date.now())).length})
          </button>
        </div>
      </div>

      {/* TECHNICIANS LIST - CARDS CLONED FROM SCREENSHOT 2 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
            <span>Carregando dados dos técnicos e assinaturas...</span>
          </div>
        ) : filteredBarbers.length === 0 ? (
          <div className="text-center py-12 bg-[#101319] border border-[#1f2533] rounded-3xl p-6">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Nenhum técnico ou usuário encontrado</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? "Tente buscar com outros termos." : "Clique em '+ NOVO TÉCNICO / CONTA' para começar."}
            </p>
          </div>
        ) : (
          filteredBarbers.map((barber) => {
            const isExpired =
              barber.subscriptionStatus === "expired" ||
              (barber.expiresAt && new Date(barber.expiresAt).getTime() < Date.now());

            const isPendingPix = barber.subscriptionStatus === "pending_pix";
            const isTrial = barber.subscriptionStatus === "trial";

            let trialDaysLeft = 0;
            if (barber.expiresAt) {
              const diff = new Date(barber.expiresAt).getTime() - Date.now();
              trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            }

            // Initials for avatar
            const initials = barber.name
              ? barber.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()
              : "T";

            // Format expiration date nicely
            let formattedExp = "Sem data";
            if (barber.expiresAt) {
              const [y, m, d] = barber.expiresAt.split("-");
              if (y && m && d) {
                formattedExp = `${d}/${m}/${y}`;
              } else {
                formattedExp = new Date(barber.expiresAt).toLocaleDateString("pt-BR");
              }
            }

            return (
              <div
                key={barber.id}
                className="bg-[#12151c] border border-[#202633] hover:border-slate-700 transition-all rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl"
              >
                {/* LEFT SIDE: AVATAR + USER INFO + PLAN BADGES */}
                <div className="flex items-start sm:items-center gap-4">
                  {/* AVATAR PILL / SQUARE WITH INITIALS */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                    {initials}
                  </div>

                  {/* USER DETAILS */}
                  <div className="space-y-1.5">
                    {/* NAME + ROLE BADGE */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                        {barber.name}
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                        {barber.role === "tecnico" || barber.role === "barbeiro" ? "TÉCNICO" : barber.role?.toUpperCase() || "TÉCNICO"}
                      </span>
                      {isPendingPix && (
                        <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] rounded-md uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Aguardando Validação Pix
                        </span>
                      )}
                      {isTrial && !isExpired && (
                        <span className="px-2.5 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-[10px] rounded-md uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Teste Grátis ({trialDaysLeft}d restantes)
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-2.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-300 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                          Expirado
                        </span>
                      )}
                      {!isExpired && !isPendingPix && !isTrial && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                          Ativo
                        </span>
                      )}
                    </div>

                    {/* EMAIL */}
                    <div className="text-xs text-slate-400 font-medium">
                      {barber.email}
                    </div>

                    {/* PLAN BADGES & EXPIRATION */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-slate-400 font-semibold text-[11px]">PLANO:</span>

                      {/* PLAN NAME BADGE */}
                      <span className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-extrabold text-[10px] rounded-md uppercase">
                        {barber.planName || "ESSENCIAL (1 CONTA)"}
                      </span>

                      {/* EXTRAS BADGE */}
                      <span className="px-2.5 py-0.5 bg-[#1a1f29] border border-slate-700 text-slate-300 font-bold text-[10px] rounded-md uppercase">
                        {barber.extraAccounts || 0} EXTRAS
                      </span>

                      {/* CAPACITY & EXPIRY */}
                      <span
                        className={`text-[11px] font-bold ${
                          isExpired
                            ? "text-red-400"
                            : isPendingPix
                            ? "text-amber-400"
                            : isTrial
                            ? "text-cyan-400"
                            : "text-emerald-400"
                        }`}
                      >
                        (Capacidade: {(barber.planCapacity || 1) + (barber.extraAccounts || 0)} contas) ({isTrial ? "Fim do teste: " : "Expira: "}
                        {formattedExp})
                      </span>
                    </div>

                    {/* COMPROVANTE QUICK VIEW (IF PRESENT) */}
                    {barber.comprovanteUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewComprovante(barber.comprovanteUrl || null)}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Comprovante Pix Anexado
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE: ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#202633]">
                  {/* ESTENDER TESTE (+15 DIAS) */}
                  <button
                    type="button"
                    onClick={() => handleExtendTrial(barber.id, barber.name)}
                    className="px-3.5 py-2 bg-transparent hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 font-extrabold text-xs rounded-xl border border-cyan-500/40 transition flex items-center gap-1.5 cursor-pointer"
                    title="Estender ou conceder +15 dias de teste grátis"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+15D TESTE</span>
                  </button>

                  {/* + CONTAS EXTRAS BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleAddExtraAccount(barber)}
                    className="px-3.5 py-2 bg-transparent hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 font-extrabold text-xs rounded-xl border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer"
                    title="Adicionar mais 1 conta extra para este técnico"
                  >
                    <span>+ CONTAS EXTRAS ({barber.extraAccounts || 0})</span>
                  </button>

                  {/* VALIDAR PIX BUTTON */}
                  <button
                    type="button"
                    onClick={() => setValidatingBarber(barber)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>VALIDAR PIX</span>
                  </button>

                  {/* EXPIRAR BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleExpireBarber(barber.id, barber.name)}
                    className="px-3.5 py-2 bg-transparent hover:bg-red-500/10 text-red-400 hover:text-red-300 font-extrabold text-xs rounded-xl border border-red-500/40 transition flex items-center gap-1.5 cursor-pointer"
                    title="Expirar conta imediatamente"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                    <span>EXPIRAR</span>
                  </button>

                  {/* ROLE SELECTOR DROPDOWN */}
                  <div className="relative">
                    <select
                      value={barber.role === "barbeiro" ? "tecnico" : (barber.role || "tecnico")}
                      onChange={(e) => handleChangeRole(barber.id, e.target.value)}
                      className="appearance-none bg-[#191e29] border border-slate-700 hover:border-slate-500 text-slate-200 font-extrabold text-xs py-2 pl-3 pr-8 rounded-xl outline-none cursor-pointer uppercase transition"
                    >
                      <option value="tecnico">TÉCNICO</option>
                      <option value="admin">ADMIN</option>
                      <option value="gerente">GERENTE</option>
                      <option value="employee">ATENDENTE</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* EDIT BUTTON */}
                  <button
                    type="button"
                    onClick={() => setEditingBarber(barber)}
                    className="p-2 bg-[#191e29] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
                    title="Editar informações e dias da assinatura"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* DELETE BUTTON (TRASH) */}
                  <button
                    type="button"
                    onClick={() => handleDeleteBarber(barber.id, barber.name)}
                    className="p-2 bg-[#191e29] hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-xl transition border border-slate-700 hover:border-red-500/50 cursor-pointer"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: TABELA DE PLANOS (SCREENSHOT 1) */}
      <SubscriptionPlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentUserEmail={currentUser?.email}
        currentUserName={currentUser?.name}
        onRequestSubmitted={() => {
          setShowPlansModal(false);
          loadData();
          showNotification("Comprovante enviado! Aguardando validação do administrador.");
        }}
      />

      {/* MODAL 2: CONFIGURAR PIX & ÁUDIO */}
      {showConfigPixModal && (
        <PixConfigModal
          isOpen={showConfigPixModal}
          onClose={() => setShowConfigPixModal(false)}
          onSaved={() => {
            setShowConfigPixModal(false);
            showNotification("Configurações de Pix e Áudio salvas com sucesso!");
          }}
        />
      )}

      {/* MODAL 3: NOVO BARBEIRO */}
      {showNewBarberModal && (
        <NewBarberModal
          isOpen={showNewBarberModal}
          onClose={() => setShowNewBarberModal(false)}
          onCreated={() => {
            setShowNewBarberModal(false);
            loadData();
            showNotification("Novo barbeiro cadastrado com sucesso!");
          }}
        />
      )}

      {/* MODAL 4: EDITAR BARBEIRO & ASSINATURA */}
      {editingBarber && (
        <EditBarberModal
          isOpen={!!editingBarber}
          barber={editingBarber}
          onClose={() => setEditingBarber(null)}
          onUpdated={() => {
            setEditingBarber(null);
            loadData();
            showNotification("Conta do barbeiro atualizada!");
          }}
        />
      )}

      {/* MODAL 5: VALIDAR PIX MODAL */}
      {validatingBarber && (
        <ValidatePixModal
          isOpen={!!validatingBarber}
          barber={validatingBarber}
          onClose={() => setValidatingBarber(null)}
          onValidated={() => {
            setValidatingBarber(null);
            loadData();
            showNotification(`Pix validado e conta ativada para ${validatingBarber.name}!`);
          }}
        />
      )}

      {/* MODAL 6: PREVIEW DE COMPROVANTE */}
      {previewComprovante && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12151c] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black">Comprovante de Pagamento Pix</h3>
              <button
                type="button"
                onClick={() => setPreviewComprovante(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-slate-700 rounded-2xl overflow-hidden bg-black/50 p-2 flex items-center justify-center">
              <img
                src={previewComprovante}
                alt="Comprovante"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewComprovante(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODAL: CONFIGURAR CHAVE & FORMATO DO PIX DO ADMINISTRADOR
// -------------------------------------------------------------
function PixConfigModal({
  isOpen,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<"cpf" | "cnpj" | "phone" | "email" | "random">("email");
  const [pixFormat, setPixFormat] = useState<"standard" | "qr_emv" | "simple">("standard");
  const [receiverName, setReceiverName] = useState("");
  const [receiverCity, setReceiverCity] = useState("São Paulo");
  const [receiverBank, setReceiverBank] = useState("");
  const [planEssencialPrice, setPlanEssencialPrice] = useState(250);
  const [planProfissionalPrice, setPlanProfissionalPrice] = useState(390);
  const [trialDays, setTrialDays] = useState(15);
  const [instructionText, setInstructionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [testCopied, setTestCopied] = useState(false);

  useEffect(() => {
    fetch("/api/pix/config")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPixKey(data.pixKey || "");
          setPixKeyType(data.pixKeyType || "email");
          setPixFormat(data.pixFormat || "standard");
          setReceiverName(data.receiverName || "");
          setReceiverCity(data.receiverCity || "São Paulo");
          setReceiverBank(data.receiverBank || "");
          setPlanEssencialPrice(data.planEssencialPrice || 250);
          setPlanProfissionalPrice(data.planProfissionalPrice || 390);
          setTrialDays(data.trialDays || 15);
          setInstructionText(data.instructionText || "");
        }
      })
      .catch((e) => console.error("Erro config pix:", e));
  }, []);

  const handleTestCopy = () => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setTestCopied(true);
    setTimeout(() => setTestCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/pix/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixKey,
          pixKeyType,
          pixFormat,
          receiverName,
          receiverCity,
          receiverBank,
          planEssencialPrice,
          planProfissionalPrice,
          trialDays,
          instructionText
        })
      });
      if (!res.ok) throw new Error("Erro ao salvar dados de Pix");
      onSaved();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Build live preview QR code URL using standard public QR API
  const previewPayload = pixKey || "chave-pix-exemplo";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(previewPayload)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#101319] border border-[#232938] text-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-[#141822]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <QrCode className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-white">
                  Cadastrar & Configurar Formato do Pix
                </h3>
                <p className="text-xs text-slate-400">
                  Defina a chave Pix, formato de recebimento e regras de assinatura com 15 dias de teste grátis.
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: CONFIGURATION FIELDS */}
            <div className="lg:col-span-7 space-y-4">
              {/* FORMATO DO PIX SECTION */}
              <div className="bg-[#161a23] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    1. Formato do Pix & Padrão de Integração
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPixFormat("standard")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pixFormat === "standard"
                        ? "border-emerald-500 bg-emerald-950/40 text-white"
                        : "border-slate-800 bg-[#101319] text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="font-black text-[11px] text-white">Padrão Completo</span>
                    <span className="text-[9px] leading-tight text-slate-400">QR Code + Chave Copia e Cola</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPixFormat("qr_emv")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pixFormat === "qr_emv"
                        ? "border-emerald-500 bg-emerald-950/40 text-white"
                        : "border-slate-800 bg-[#101319] text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="font-black text-[11px] text-white">QR Code EMV</span>
                    <span className="text-[9px] leading-tight text-slate-400">Copia e Cola Direto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPixFormat("simple")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pixFormat === "simple"
                        ? "border-emerald-500 bg-emerald-950/40 text-white"
                        : "border-slate-800 bg-[#101319] text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="font-black text-[11px] text-white">Chave Direta</span>
                    <span className="text-[9px] leading-tight text-slate-400">Apenas Chave Pix</span>
                  </button>
                </div>
              </div>

              {/* DADOS DA CHAVE PIX */}
              <div className="bg-[#161a23] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  2. Chave Pix & Dados do Beneficiário
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Tipo da Chave Pix *</label>
                    <select
                      value={pixKeyType}
                      onChange={(e: any) => setPixKeyType(e.target.value)}
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                    >
                      <option value="email">E-mail</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="phone">Celular / Telefone</option>
                      <option value="random">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Chave Pix Cadastrada *</label>
                    <input
                      type="text"
                      required
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder={
                        pixKeyType === "email"
                          ? "exemplo@gmail.com"
                          : pixKeyType === "cpf"
                          ? "000.000.000-00"
                          : pixKeyType === "cnpj"
                          ? "00.000.000/0001-00"
                          : pixKeyType === "phone"
                          ? "(11) 99999-9999"
                          : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      }
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Nome do Titular / Beneficiário *</label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Ex: Michel Lima"
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Cidade do Titular (BACEN) *</label>
                    <input
                      type="text"
                      required
                      value={receiverCity}
                      onChange={(e) => setReceiverCity(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Banco / Instituição Financeira</label>
                  <input
                    type="text"
                    value={receiverBank}
                    onChange={(e) => setReceiverBank(e.target.value)}
                    placeholder="Ex: Banco Inter / Nubank"
                    className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* REGRAS DE PREÇO & TESTE GRATUITO */}
              <div className="bg-[#161a23] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  3. Valores dos Planos & Período de Teste Gratuito
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Teste Grátis (Dias)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-cyan-400 mt-1 block">Padrão: 15 dias</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Plano Essencial (R$)</label>
                    <input
                      type="number"
                      min="10"
                      value={planEssencialPrice}
                      onChange={(e) => setPlanEssencialPrice(Number(e.target.value))}
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">1 Conta de Técnico</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Plano Profissional (R$)</label>
                    <input
                      type="number"
                      min="10"
                      value={planProfissionalPrice}
                      onChange={(e) => setPlanProfissionalPrice(Number(e.target.value))}
                      className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">3 Contas de Técnicos</span>
                  </div>
                </div>
              </div>

              {/* INSTRUÇÕES AO ASSINANTE */}
              <div className="bg-[#161a23] p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">
                  4. Mensagem / Instruções de Pagamento aos Assinantes
                </label>
                <textarea
                  rows={2}
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  placeholder="Faça o Pix no valor exato do plano e envie seu comprovante abaixo para ativação imediata da sua conta."
                  className="w-full p-2.5 bg-[#101319] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE SIMULATOR / PREVIEW */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-2 bg-gradient-to-b from-[#181d26] to-[#11141c] p-5 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-extrabold text-white text-xs uppercase tracking-wider">
                      Prévia em Tempo Real
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-300 font-mono">
                    {pixFormat.toUpperCase()}
                  </span>
                </div>

                {/* QR CODE BOX */}
                <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center max-w-[200px] mx-auto shadow-md">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Pix"
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                  <span className="text-[10px] text-slate-900 font-black mt-1">
                    PIX INSTANTÂNEO
                  </span>
                </div>

                {/* DETAILS CARD */}
                <div className="bg-[#101319] p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Beneficiário:</span>
                    <span className="text-white font-bold">{receiverName || "Michel Lima"}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Cidade:</span>
                    <span className="text-white font-bold">{receiverCity || "São Paulo"}</span>
                  </div>

                  {receiverBank && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">Banco:</span>
                      <span className="text-indigo-400 font-bold">{receiverBank}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Tipo:</span>
                    <span className="text-emerald-400 font-bold uppercase">{pixKeyType}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-slate-400 font-medium">Período Grátis:</span>
                    <span className="text-cyan-400 font-bold">{trialDays} dias inclusos</span>
                  </div>
                </div>

                {/* COPY KEY BUTTON */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Chave Pix (Copia e Cola):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixKey || "Nenhuma chave cadastrada"}
                      className="w-full p-2 bg-[#101319] border border-slate-800 rounded-xl text-white text-[11px] font-mono outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={handleTestCopy}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer transition shrink-0 flex items-center gap-1 text-[11px]"
                    >
                      {testCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Testar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS FOOTER */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving ? "Salvando no Firebase..." : "Salvar Configurações Pix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODAL: NOVO BARBEIRO / CONTA
// -------------------------------------------------------------
function NewBarberModal({
  isOpen,
  onClose,
  onCreated
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("tecnico");
  const [plan, setPlan] = useState("essencial");
  const [planCapacity, setPlanCapacity] = useState(1);
  const [extraAccounts, setExtraAccounts] = useState(0);
  const [daysPaid, setDaysPaid] = useState(15);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const planName =
        plan === "profissional"
          ? "PROFISSIONAL (3 CONTAS)"
          : plan === "extra"
          ? "TÉCNICO EXTRA"
          : "ESSENCIAL (1 CONTA)";

      const isTrial = Number(daysPaid) <= 15;

      const res = await fetch("/api/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          password: password || "123456",
          phone: phone.trim(),
          role,
          plan,
          planName,
          planCapacity: plan === "profissional" ? 3 : planCapacity,
          extraAccounts: Number(extraAccounts),
          daysPaid: Number(daysPaid),
          subscriptionStatus: isTrial ? "trial" : "active"
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao cadastrar técnico");
      }
      onCreated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#101319] border border-[#232938] text-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Cadastrar Novo Técnico / Conta
            </h3>
            <p className="text-xs text-slate-400">
              Crie a conta do técnico ou atendente e defina o plano e período de validade
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Nome do Técnico / Atendente *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: TÉCNICO CARLOS SILVA"
              className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">E-mail de Login *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tecnico@assistencia.com"
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Senha de Acesso</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Cargo no Sistema</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
              >
                <option value="tecnico">TÉCNICO</option>
                <option value="admin">ADMIN</option>
                <option value="gerente">GERENTE</option>
                <option value="employee">ATENDENTE</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Plano de Assinatura</label>
              <select
                value={plan}
                onChange={(e) => {
                  setPlan(e.target.value);
                  if (e.target.value === "profissional") setPlanCapacity(3);
                  else setPlanCapacity(1);
                }}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 font-bold text-emerald-400"
              >
                <option value="essencial">ESSENCIAL (1 CONTA) - R$ 250/ano ou R$ 60/mês</option>
                <option value="profissional">PROFISSIONAL (3 CONTAS) - R$ 390/ano</option>
                <option value="extra">TÉCNICO EXTRA (+1 CONTA) - R$ 99/ano</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Dias Pagos / Validade</label>
              <select
                value={daysPaid}
                onChange={(e) => setDaysPaid(Number(e.target.value))}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
              >
                <option value={15}>Teste Grátis (15 Dias)</option>
                <option value={365}>1 Ano (365 Dias - Plano Anual)</option>
                <option value={30}>1 Mês (30 Dias - Plano Mensal)</option>
                <option value={60}>2 Meses (60 Dias)</option>
                <option value={180}>6 Meses (180 Dias)</option>
                <option value={7}>Teste Rápido (7 Dias)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Contas Extras Adicionais</label>
              <input
                type="number"
                min="0"
                value={extraAccounts}
                onChange={(e) => setExtraAccounts(Number(e.target.value))}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
            >
              {saving ? "Cadastrando..." : "Cadastrar Técnico"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODAL: EDITAR TÉCNICO & ASSINATURA (DIAS PAGOS, ETC.)
// -------------------------------------------------------------
function EditBarberModal({
  isOpen,
  barber,
  onClose,
  onUpdated
}: {
  isOpen: boolean;
  barber: User;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(barber.name || "");
  const [email, setEmail] = useState(barber.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(barber.phone || "");
  const [role, setRole] = useState(barber.role === "barbeiro" ? "tecnico" : (barber.role || "tecnico"));
  const [plan, setPlan] = useState(barber.plan || "essencial");
  const [planCapacity, setPlanCapacity] = useState(barber.planCapacity || 1);
  const [extraAccounts, setExtraAccounts] = useState(barber.extraAccounts || 0);
  const [subscriptionStatus, setSubscriptionStatus] = useState(barber.subscriptionStatus || "active");
  const [expiresAt, setExpiresAt] = useState(barber.expiresAt || "2026-10-01");
  const [daysPaid, setDaysPaid] = useState(barber.daysPaid || 365);
  const [paymentNotes, setPaymentNotes] = useState(barber.paymentNotes || "");
  const [saving, setSaving] = useState(false);

  // Helper to add days directly
  const addDaysToExpiration = (days: number) => {
    let base = new Date();
    if (expiresAt) {
      const cur = new Date(expiresAt);
      if (cur.getTime() > Date.now()) base = cur;
    }
    base.setDate(base.getDate() + days);
    setExpiresAt(base.toISOString().split("T")[0]);
    setDaysPaid((prev) => prev + days);
    setSubscriptionStatus("active");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const planName =
        plan === "profissional"
          ? "PROFISSIONAL (3 CONTAS)"
          : plan === "extra"
          ? "TÉCNICO EXTRA"
          : "ESSENCIAL (1 CONTA)";

      const payload: any = {
        name: name.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        plan,
        planName,
        planCapacity: Number(planCapacity),
        extraAccounts: Number(extraAccounts),
        subscriptionStatus,
        expiresAt,
        daysPaid: Number(daysPaid),
        paymentNotes: paymentNotes.trim()
      };
      if (password) {
        payload.password = password;
      }

      const res = await fetch(`/api/barbers/${barber.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao atualizar técnico");
      onUpdated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#101319] border border-[#232938] text-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-400" />
              Editar Técnico & Assinatura
            </h3>
            <p className="text-xs text-slate-400">
              Ajuste dados cadastrais, plano, dias pagos e expiração
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Nome do Técnico / Atendente *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">E-mail *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Nova Senha (opcional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Manter atual"
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Cargo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
              >
                <option value="tecnico">TÉCNICO</option>
                <option value="admin">ADMIN</option>
                <option value="gerente">GERENTE</option>
                <option value="employee">ATENDENTE</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Status Assinatura</label>
              <select
                value={subscriptionStatus}
                onChange={(e: any) => setSubscriptionStatus(e.target.value)}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 font-bold"
              >
                <option value="active">Ativo ✅</option>
                <option value="pending_pix">Pendente Pix ⏳</option>
                <option value="expired">Expirado ❌</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Contas Extras</label>
              <input
                type="number"
                min="0"
                value={extraAccounts}
                onChange={(e) => setExtraAccounts(Number(e.target.value))}
                className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* EXPIRATION & DAYS CONTROL */}
          <div className="bg-[#171b24] p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Data de Expiração & Dias Pagos
              </span>
              <span className="font-mono text-emerald-400 font-bold text-xs">{daysPaid} dias</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Expira em:</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full p-2 bg-[#101319] border border-slate-700 rounded-xl text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Dias Pagos no Total:</label>
                <input
                  type="number"
                  value={daysPaid}
                  onChange={(e) => setDaysPaid(Number(e.target.value))}
                  className="w-full p-2 bg-[#101319] border border-slate-700 rounded-xl text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* QUICK EXTEND BUTTONS */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Estender rápido:</span>
              <button
                type="button"
                onClick={() => addDaysToExpiration(30)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
              >
                +30 Dias (1 Mês)
              </button>
              <button
                type="button"
                onClick={() => addDaysToExpiration(365)}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/30 cursor-pointer"
              >
                +1 Ano (365 Dias)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Notas do Administrador</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Ex: Pix confirmado no Nubank às 15:30"
              className="w-full p-2 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODAL: VALIDAR PIX (CONFIRMAR PAGAMENTO E ATIVAR CONTA)
// -------------------------------------------------------------
function ValidatePixModal({
  isOpen,
  barber,
  onClose,
  onValidated
}: {
  isOpen: boolean;
  barber: User;
  onClose: () => void;
  onValidated: () => void;
}) {
  const [daysToAdd, setDaysToAdd] = useState(365);
  const [amount, setAmount] = useState(barber.plan === "profissional" ? 390 : 250);
  const [saving, setSaving] = useState(false);

  const handleConfirmValidation = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/barbers/${barber.id}/validate-pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: Number(daysToAdd),
          amount: Number(amount)
        })
      });
      if (!res.ok) throw new Error("Erro ao validar Pix");
      onValidated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#101319] border border-[#232938] text-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Validar Pagamento Pix</h3>
              <p className="text-xs text-slate-400">Ativa a conta e estende a validade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#171b24] p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Técnico / Conta:</span>
            <span className="font-bold text-white">{barber.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">E-mail:</span>
            <span className="font-bold text-white">{barber.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Plano Atual:</span>
            <span className="font-bold text-emerald-400">{barber.planName || "ESSENCIAL"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status Atual:</span>
            <span className="font-bold text-amber-400">
              {barber.subscriptionStatus === "pending_pix"
                ? "Aguardando Validação"
                : barber.subscriptionStatus === "expired"
                ? "Expirado"
                : "Ativo"}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">
              Período de Ativação / Dias a Adicionar:
            </label>
            <select
              value={daysToAdd}
              onChange={(e) => {
                const d = Number(e.target.value);
                setDaysToAdd(d);
                if (d === 365) setAmount(barber.plan === "profissional" ? 390 : 250);
                else if (d === 30) setAmount(barber.plan === "profissional" ? 119 : 60);
              }}
              className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 font-bold"
            >
              <option value={365}>+ 365 Dias (1 Ano - Plano Anual à Vista)</option>
              <option value={30}>+ 30 Dias (1 Mês - Plano Mensal)</option>
              <option value={60}>+ 60 Dias (2 Meses)</option>
              <option value={180}>+ 180 Dias (6 Meses)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">
              Valor Confirmado do Pagamento (R$):
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2.5 bg-[#171b24] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 font-mono font-bold"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmValidation}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{saving ? "Validando..." : "Confirmar & Ativar Conta"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
