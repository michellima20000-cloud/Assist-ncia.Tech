import React, { useState, useEffect } from "react";
import {
  Printer, LogOut, ShieldAlert, CheckCircle, Clock, PlusCircle, Hammer, ArrowRight,
  Calendar, FileText, UserCheck, ShieldCheck, RefreshCw, Barcode, HelpCircle, QrCode,
  ShoppingBag, MessageSquare
} from "lucide-react";
import { User, Atendimento, DashboardStats } from "./types";

// Component imports
import Login from "./components/Login";
import Entrada from "./components/Entrada";
import AtendimentosAndamento from "./components/AtendimentosAndamento";
import Saida from "./components/Saida";
import PagamentoScreen from "./components/PagamentoScreen";
import AdminPanel from "./components/AdminPanel";
import Agendamentos from "./components/Agendamentos";
import Clientes from "./components/Clientes";
import PrinterConfig from "./components/PrinterConfig";
import ReceiptModal from "./components/ReceiptModal";
import ProductScanner from "./components/ProductScanner";
import Vendas from "./components/Vendas";
import FeedbackAutomation from "./components/FeedbackAutomation";

type ActiveTab =
  | "dashboard"
  | "entrada"
  | "atendimento"
  | "saida"
  | "agendar"
  | "orcamento"
  | "clientes"
  | "revisao"
  | "admin"
  | "printer"
  | "vendas"
  | "feedback";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [atendimentoFlowMode, setAtendimentoFlowMode] = useState<"atendimento" | "saida">("atendimento");
  const [stats, setStats] = useState<DashboardStats>({
    naAssistenciaCount: 0,
    entregaCount: 0,
    financials: { cash: 0, card: 0, pending: 0, expenses: 0, totalCollected: 0 }
  });

  // Selected Order for Saida / Payment flows
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [tempNotesFin, setTempNotesFin] = useState("");

  // Receipt Modal simulator states
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTitle, setReceiptTitle] = useState("");
  const [receiptContent, setReceiptContent] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const [receiptClientName, setReceiptClientName] = useState("");

  // Product QR & Barcode scanner states
  const [globalScannerOpen, setGlobalScannerOpen] = useState(false);
  const [publicOSLoading, setPublicOSLoading] = useState(false);

  // Load public OS tracking if present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const osParam = params.get("os") || params.get("control");
    if (osParam) {
      setPublicOSLoading(true);
      Promise.all([
        fetch("/api/atendimentos").then(res => res.json()).catch(() => []),
        fetch("/api/clientes").then(res => res.json()).catch(() => [])
      ])
        .then(([ats, cls]) => {
          if (Array.isArray(ats)) {
            const found = ats.find((a: any) => a.controlNumber === osParam || a.id === osParam);
            if (found) {
              const cleanId = (val: any) => String(val || "").trim().toLowerCase();
              const target = cleanId(found.clienteId);
              const clientObj = Array.isArray(cls) ? cls.find((c: any) => c && cleanId(c.id) === target) : null;
              const clientName = clientObj ? clientObj.name : "Consumidor Final";
              const clientPhone = clientObj ? clientObj.phone : "";

              const recStr = `ORDEM DE SERVIÇO
CONTROLE: ${found.controlNumber}
CLIENTE: ${clientName}
FONE: ${clientPhone}
APARELHO: ${found.item} ${found.brand} ${found.model}
DEFEITO: ${found.defeito || "Avaliação técnica"}
DATA: ${new Date(found.entryDate).toLocaleString("pt-BR")}
SERVICOS REALIZADOS:
${(found.services || []).map((s: any) => `- ${s.name}: R$ ${s.price.toFixed(2)}`).join("\n")}
TOTAL GERAL: R$ ${found.totalAmount.toFixed(2)}`;

              triggerReceiptPreview(
                "Acompanhamento de Ordem de Serviço",
                recStr,
                clientPhone,
                clientName
              );
            } else {
              alert("Ordem de serviço não encontrada.");
            }
          }
          setPublicOSLoading(false);
        })
        .catch(err => {
          console.error("Error in public tracking lookup:", err);
          setPublicOSLoading(false);
        });
    }
  }, []);

  // Load user session on start
  useEffect(() => {
    const savedUser = localStorage.getItem("user_session");
    const savedToken = localStorage.getItem("user_token");
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && typeof parsedUser === "object" && parsedUser.id) {
          setCurrentUser(parsedUser);
          setToken(savedToken);
        } else {
          // If the parsed object is invalid, clean it up
          localStorage.removeItem("user_session");
          localStorage.removeItem("user_token");
        }
      } catch (err) {
        console.error("Failed to parse user session", err);
        localStorage.removeItem("user_session");
        localStorage.removeItem("user_token");
      }
    }
  }, []);

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local format
      const offset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/stats?today=${todayStr}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do painel", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStats();
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: User, userToken: string) => {
    setCurrentUser(user);
    setToken(userToken);
    localStorage.setItem("user_session", JSON.stringify(user));
    localStorage.setItem("user_token", userToken);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem("user_session");
    localStorage.removeItem("user_token");
    setActiveTab("dashboard");
  };

  // Build and display daily summary ESC/POS ticket
  const handlePrintDailySummary = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const offset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/reports?type=daily&date=${todayStr}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const { summary, closedOrders } = data;

        const summaryText = `FECHAMENTO DO DIA (TÉRMICO)
DATA: ${new Date().toLocaleDateString("pt-BR")}
HORA: ${new Date().toLocaleTimeString("pt-BR")}
------------------------
ORDENS ENTREGUES HOJE:
${closedOrders.length === 0 ? "Nenhuma OS encerrada hoje." : closedOrders.map((o: any) => `- ${o.controlNumber}: R$ ${o.totalAmount.toFixed(2)}`).join("\n")}
------------------------
RESUMO DO CAIXA:
(+) EM ESPÉCIE: R$ ${summary.cash.toFixed(2)}
(+) EM CARTÃO:  R$ ${summary.card.toFixed(2)}
------------------------
TOTAL ARRECADADO: R$ ${summary.revenue.toFixed(2)}
(-) DESPESAS:     R$ ${summary.expense.toFixed(2)}
------------------------
SALDO DE HOJE:    R$ ${summary.balance.toFixed(2)}
------------------------
ASSINATURA RESPONSÁVEL:

________________________`;

        setReceiptTitle("Resumo Financeiro Diário");
        setReceiptContent(summaryText);
        setReceiptOpen(true);
      }
    } catch (err) {
      console.error("Erro ao imprimir fechamento", err);
    }
  };

  // Callback helper for receipt modals triggered from other panels
  const triggerReceiptPreview = (title: string, content: string, phone: string = "", clientName: string = "") => {
    setReceiptTitle(title);
    setReceiptContent(content);
    setReceiptPhone(phone);
    setReceiptClientName(clientName);
    setReceiptOpen(true);
  };

  const params = new URLSearchParams(window.location.search);
  const hasOsParam = params.has("os") || params.has("control");

  if (!currentUser) {
    if (hasOsParam) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 p-4 justify-center items-center">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-white">Minha Assistência</h1>
            <p className="text-xs text-slate-400">Portal do Cliente • Acompanhamento Online</p>
            <div className="py-2">
              <p className="text-xs text-[#1E88E5] font-bold">Carregando Ordem de Serviço Nº {params.get("os") || params.get("control")}</p>
            </div>
            <button
              onClick={() => {
                window.location.search = "";
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider transition"
            >
              Ir para Tela de Login
            </button>
          </div>

          <ReceiptModal
            isOpen={receiptOpen}
            onClose={() => {
              setReceiptOpen(false);
              window.location.search = "";
            }}
            title={receiptTitle}
            content={receiptContent}
            phone={receiptPhone}
            clientName={receiptClientName}
          />
        </div>
      );
    }
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === "admin";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* HEADER SECTION */}
      <header className="bg-[#1E88E5] text-white shadow-md select-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-white border border-white/20">
              M
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">Minha Assistência</h1>
              <p className="text-[10px] text-blue-100 font-semibold uppercase tracking-wider">Módulos Conectados</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-none">{currentUser.name}</p>
              <span className="text-[9px] bg-white/15 px-1.5 py-0.5 rounded-full text-blue-50 font-bold uppercase tracking-wider inline-block mt-1">
                {isAdmin ? "Administrador" : "Funcionário"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setGlobalScannerOpen(true)}
                className="p-2 hover:bg-white/10 active:bg-white/15 rounded-xl text-white transition flex items-center justify-center gap-1.5"
                title="Leitor de QR & Código de Barras"
              >
                <QrCode className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-extrabold hidden md:inline text-amber-300">LEITOR DE PEÇAS</span>
              </button>
              <button
                onClick={handlePrintDailySummary}
                className="p-2 hover:bg-white/10 active:bg-white/15 rounded-xl text-white transition flex items-center justify-center"
                title="Imprimir Resumo do Dia"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-600/30 active:bg-red-600/40 rounded-xl text-red-100 transition flex items-center justify-center"
                title="Sair do Sistema"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Realtime Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Na Assistência</p>
                  <p className="text-xl font-black text-slate-800">{stats?.naAssistenciaCount ?? 0}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Prontos / Entregas</p>
                  <p className="text-xl font-black text-slate-800">{stats?.entregaCount ?? 0}</p>
                </div>
              </div>

              {/* Financial counters ONLY visible to admin */}
              {isAdmin ? (
                <>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Faturamento Diário</p>
                      <p className="text-lg font-black text-emerald-600 font-mono">R$ {(stats?.financials?.totalCollected ?? 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Despesas Diárias</p>
                      <p className="text-lg font-black text-red-600 font-mono">R$ {(stats?.financials?.expenses ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-2 bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#1E88E5]" />
                  <p className="text-xs text-blue-900 font-medium">
                    Olá, <strong>{currentUser.name}</strong>! O seu nível de funcionário permite entrada de novos atendimentos, acompanhamento técnico e agendamentos. Valores consolidados ocultos.
                  </p>
                </div>
              )}
            </div>

            {/* BIG ACTION GRID */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Atalhos de Acesso Rápido</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* ENTRADA (verde) */}
                <button
                  onClick={() => setActiveTab("entrada")}
                  className="p-5 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-emerald-800">ENTRADA</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Registrar novo celular</p>
                  </div>
                </button>

                {/* ATENDIMENTO (azul) */}
                <button
                  onClick={() => {
                    setAtendimentoFlowMode("atendimento");
                    setActiveTab("atendimento");
                  }}
                  className="p-5 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-blue-100 text-[#1E88E5] rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Hammer className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-blue-800">ATENDIMENTO</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Aparelhos na bancada</p>
                  </div>
                </button>

                {/* SAÍDA (vermelho) */}
                <button
                  onClick={() => {
                    setAtendimentoFlowMode("saida");
                    setActiveTab("atendimento");
                  }}
                  className="p-5 bg-white border border-slate-100 hover:border-red-200 hover:bg-red-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-red-800">SAÍDA</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Finalizar & Entregar</p>
                  </div>
                </button>

                {/* VENDAS (índigo) */}
                <button
                  onClick={() => setActiveTab("vendas")}
                  className="p-5 bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-indigo-800">VENDAS</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Power bank, fones, carregadores...</p>
                  </div>
                </button>

                {/* AGENDAR (roxo) */}
                <button
                  onClick={() => setActiveTab("agendar")}
                  className="p-5 bg-white border border-slate-100 hover:border-purple-200 hover:bg-purple-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-purple-800">AGENDAR</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Agendar serviços</p>
                  </div>
                </button>

                {/* ORÇAMENTO (azul escuro) */}
                <button
                  onClick={() => setActiveTab("entrada")} // Budgets are initialized as low status entry orders
                  className="p-5 bg-white border border-slate-100 hover:border-slate-300 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-800">ORÇAMENTO</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Gerar Orçamento Rápido</p>
                  </div>
                </button>

                {/* CLIENTES (vermelho) */}
                <button
                  onClick={() => setActiveTab("clientes")}
                  className="p-5 bg-white border border-slate-100 hover:border-rose-200 hover:bg-rose-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-rose-800">CLIENTES</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Cadastrar Clientes</p>
                  </div>
                </button>

                {/* REVISÃO PROGRAMADA (laranja) */}
                <button
                  onClick={() => setActiveTab("agendar")}
                  className="p-5 bg-white border border-slate-100 hover:border-orange-200 hover:bg-orange-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-orange-800">REVISÃO</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Revisões Programadas</p>
                  </div>
                </button>

                {/* PÓS-VENDA & MARKETING (teal/emerald) */}
                <button
                  onClick={() => setActiveTab("feedback")}
                  className="p-5 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-emerald-800">PÓS-VENDA</span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Feedback via WhatsApp</p>
                  </div>
                </button>

                {/* ADMIN OR IMPRESSORA SELECTOR */}
                {isAdmin ? (
                  <button
                    onClick={() => setActiveTab("admin")}
                    className="p-5 bg-white border border-slate-100 hover:border-[#1E88E5] hover:bg-blue-50/10 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                  >
                    <div className="w-12 h-12 bg-blue-100 text-[#1E88E5] rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-blue-900">ADMIN</span>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Painel do Dono</p>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab("printer")}
                    className="p-5 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3 transition group"
                  >
                    <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-700">IMPRESSORA</span>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Termica Bluetooth</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Helper Cards */}
            <div className="p-4 bg-[#1E88E5]/5 border border-blue-100/50 rounded-2xl flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-[#1E88E5] shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Precisa de ajuda ou deseja parear sua impressora?</p>
                <p className="text-slate-600 mt-1">
                  Acesse as configurações de impressora clicando no ícone do cabeçalho ou no botão correspondente para testar bobinas térmicas de 58mm via Web Bluetooth.
                </p>
                <button
                  onClick={() => setActiveTab("printer")}
                  className="text-[#1E88E5] font-bold mt-2 hover:underline inline-block"
                >
                  Ir para configuração de impressora &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ENTRADA FORM TABS */}
        {activeTab === "entrada" && (
          <Entrada
            onBack={() => setActiveTab("dashboard")}
            onSaveSuccess={(receipt, phone, clientName) => {
              if (receipt) {
                triggerReceiptPreview("Recibo de Entrada OS", receipt, phone, clientName);
              } else {
                alert("Ordem de serviço registrada com sucesso!");
              }
              setActiveTab("dashboard");
            }}
          />
        )}

        {/* ATENDIMENTOS EM ANDAMENTO */}
        {activeTab === "atendimento" && (
          <AtendimentosAndamento
            onBack={() => setActiveTab("dashboard")}
            flowMode={atendimentoFlowMode}
            onSelectAtendimento={(a) => {
              setSelectedAtendimento(a);
              setActiveTab("saida");
            }}
          />
        )}

        {/* SAIDA DETAILS */}
        {activeTab === "saida" && selectedAtendimento && (
          <Saida
            atendimento={selectedAtendimento}
            flowMode={atendimentoFlowMode}
            onBack={() => setActiveTab("atendimento")}
            onUpdateAtendimento={(updated) => {
              setSelectedAtendimento(updated);
            }}
            onGoToPayment={(at, notes) => {
              setSelectedAtendimento(at);
              setTempNotesFin(notes);
              setActiveTab("pagamento");
            }}
            onPrintIntakeReceipt={(at, hideValues, client?: any) => {
              const recStr = `${hideValues ? "2A VIA RECIBO ENTRADA (SEM VALOR)" : "2A VIA RECIBO ENTRADA"}
CONTROLE: ${at.controlNumber}
DATA: ${new Date(at.entryDate).toLocaleString("pt-BR")}
CLIENTE: ${client ? client.name : "Consumidor Final"}
FONE: ${client ? client.phone : ""}
CPF: ${client ? client.cpf || "" : ""}
------------------------
EQUIPAMENTO:
${at.item} ${at.brand} ${at.model}
${at.imei ? `IMEI: ${at.imei}` : ""}
${at.numeroSerie ? `SÉRIE: ${at.numeroSerie}` : ""}
------------------------
DEFEITO: ${at.defeito || "Não informado"}
ESTADO / OBS: ${at.observations || "Nenhuma"}
------------------------
SERVICOS ESTIMADOS:
${(at.services || []).map(s => hideValues ? `- ${s.name}` : `- ${s.name}: R$ ${s.price.toFixed(2)}`).join("\n")}
${at.products && (at.products || []).length > 0 ? `PECAS:\n${(at.products || []).map(p => `- ${p.name} (x${p.quantity})${hideValues ? "" : `: R$ ${(p.price * p.quantity).toFixed(2)}`}`).join("\n")}` : ""}
------------------------
${hideValues ? "" : `TOTAL ESTIMADO: R$ ${at.totalAmount.toFixed(2)}\n------------------------`}
ASSINATURA DO CLIENTE:

________________________
TERMO: Autorizo o diagnóstico.`;
              triggerReceiptPreview(
                hideValues ? "Reimpressão OS Sem Valor" : "Reimpressão OS Entrada",
                recStr,
                client ? client.phone : "",
                client ? client.name : ""
              );
            }}
          />
        )}

        {/* PAGAMENTO */}
        {activeTab === "pagamento" && selectedAtendimento && (
          <PagamentoScreen
            atendimento={selectedAtendimento}
            notesFin={tempNotesFin}
            onBack={() => setActiveTab("saida")}
            onPaymentSuccess={(receipt, phone, clientName) => {
              if (receipt) {
                triggerReceiptPreview("Recibo de Saída / Garantia", receipt, phone, clientName);
              } else {
                alert("Pagamento processado e OS finalizada!");
              }
              setSelectedAtendimento(null);
              setTempNotesFin("");
              setActiveTab("dashboard");
            }}
          />
        )}

        {/* AGENDAR */}
        {activeTab === "agendar" && (
          <Agendamentos onBack={() => setActiveTab("dashboard")} />
        )}

        {/* CLIENTES CATALOG */}
        {activeTab === "clientes" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <button onClick={() => setActiveTab("dashboard")} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500">
                &larr; Voltar
              </button>
              <h2 className="text-base font-bold text-slate-800">Diretório de Clientes</h2>
            </div>
            <Clientes onPrintReceipt={triggerReceiptPreview} />
          </div>
        )}

        {/* CONFIGURAR IMPRESSORA */}
        {activeTab === "printer" && (
          <PrinterConfig onBack={() => setActiveTab("dashboard")} />
        )}

        {/* ADMIN MANAGEMENT */}
        {activeTab === "admin" && isAdmin && (
          <AdminPanel
            onBack={() => setActiveTab("dashboard")}
            onPrintReceipt={(content) => triggerReceiptPreview("Cupom de Relatório", content)}
          />
        )}

        {/* DIRECT PRODUCT SALES */}
        {activeTab === "vendas" && (
          <Vendas
            onBack={() => setActiveTab("dashboard")}
            onSaleSuccess={(receipt, phone, clientName) => {
              triggerReceiptPreview("Recibo de Venda", receipt, phone, clientName);
              setActiveTab("dashboard");
            }}
          />
        )}

        {/* FEEDBACK & CUSTOMER RELATIONSHIP MANAGEMENT */}
        {activeTab === "feedback" && (
          <FeedbackAutomation onBack={() => setActiveTab("dashboard")} />
        )}
      </main>

      {/* FOOTER METADATA */}
      <footer className="bg-white border-t border-slate-100 py-4 text-center text-[10px] text-slate-400 font-sans mt-10">
        <p>Minha Assistência v1.2.0 • Sistema Completo para Celulares e Eletrônicos</p>
        <p className="mt-1 text-slate-300">Terminal de Vendas Conectado • Cloud Sync Ativo</p>
      </footer>

      {/* COMPACT FLOATING RECEIPTS DIALOG */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title={receiptTitle}
        content={receiptContent}
        phone={receiptPhone}
        clientName={receiptClientName}
      />

      {/* GLOBAL PRODUCT SCANNER OVERLAY */}
      {globalScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl">
            <ProductScanner
              onClose={() => setGlobalScannerOpen(false)}
              mode="view"
            />
          </div>
        </div>
      )}
    </div>
  );
}
