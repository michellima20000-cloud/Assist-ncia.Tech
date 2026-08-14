import React, { useState, useEffect } from "react";
import { 
  Search, Calendar, ShoppingBag, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, 
  User, Phone, DollarSign, Clock, FileText, ArrowRight, Package, Wrench, RefreshCw, BadgePercent,
  Printer, Pencil, Check, X, CheckCircle, Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { Cliente, Atendimento, Venda } from "../types";

interface CombinedClient {
  id: string; // client id or 'unregistered-name'
  name: string;
  phone: string;
  cpf?: string;
  cnpj?: string;
  isRegistered: boolean;
  atendimentosCount: number;
  vendasCount: number;
  totalSpent: number;
}

interface ClienteHistoricoProps {
  onPrintReceipt?: (title: string, content: string, phone: string, clientName: string) => void;
}

export default function ClienteHistorico({ onPrintReceipt }: ClienteHistoricoProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Guarantee editing state
  const [editingWarrantyItemId, setEditingWarrantyItemId] = useState<string | null>(null);
  const [editingWarrantyVal, setEditingWarrantyVal] = useState<string>("");
  const [isSavingWarranty, setIsSavingWarranty] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; text: string } | null>(null);

  const handleStartEditWarranty = (item: any) => {
    setEditingWarrantyItemId(item.id);
    const current = item.raw.garantia || item.raw.warranty || "Garantia de 90 dias (3 meses)";
    setEditingWarrantyVal(current);
  };

  const handleCancelEditWarranty = () => {
    setEditingWarrantyItemId(null);
    setEditingWarrantyVal("");
  };

  const handleSaveWarranty = async (item: any) => {
    const val = editingWarrantyVal.trim();
    if (!val) return;

    setIsSavingWarranty(true);
    try {
      if (item.type === "atendimento") {
        const res = await fetch(`/api/atendimentos/${item.raw.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ garantia: val }),
        });
        if (res.ok) {
          setAtendimentos((prev) =>
            prev.map((a) => (a.id === item.raw.id ? { ...a, garantia: val } : a))
          );
        }
      } else {
        const res = await fetch(`/api/vendas/${item.raw.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ garantia: val }),
        });
        if (res.ok) {
          setVendas((prev) =>
            prev.map((v) => (v.id === item.raw.id ? { ...v, garantia: val } : v))
          );
        }
      }
      setFeedbackMsg({ id: item.id, text: "Garantia atualizada com sucesso!" });
      setTimeout(() => setFeedbackMsg(null), 3500);
      setEditingWarrantyItemId(null);
    } catch (error) {
      console.error("Erro ao salvar garantia:", error);
    } finally {
      setIsSavingWarranty(false);
    }
  };

  const handlePrintVenda = (v: Venda, client: CombinedClient) => {
    const finalClientPhone = client.phone || "";
    const clientDocLine = client.cnpj ? `CNPJ: ${client.cnpj}` : (client.cpf ? `CPF: ${client.cpf}` : "");
    
    const recStr = `CUPOM DE VENDA DIRETA
================================
MINHA ASSISTÊNCIA
CONECTADA • TECNOLOGIA & ACESSÓRIOS
================================
DATA: ${new Date(v.date).toLocaleString("pt-BR")}
VENDA: ${v.id}
VENDEDOR: ${v.sellerName || "Balcão"}
CLIENTE: ${client.name}
${finalClientPhone ? `FONE: ${finalClientPhone}` : ""}
${clientDocLine ? `${clientDocLine}` : ""}
--------------------------------
ITENS VENDIDOS:
${(v.items || []).map((it: any) => `${it.name.substring(0, 20).padEnd(20)} x${it.quantity} R$ ${(it.price * it.quantity).toFixed(2)}`).join("\n")}
--------------------------------
TOTAL GERAL:    R$ ${v.totalAmount.toFixed(2)}
FORMA DE PGTO:  ${
      v.method === "cash" ? "Dinheiro" : 
      v.method === "pix" ? "PIX" : 
      v.method === "debit" ? "Cartão de Débito" : "Cartão de Crédito"
    }
VALOR RECEBIDO: R$ ${(v.receivedAmount || v.totalAmount).toFixed(2)}
TROCO REGISTRADO: R$ ${(v.change || 0).toFixed(2)}
================================
GARANTIA: ${v.garantia || "Garantia de 90 dias (3 meses)"}
${v.observations ? `OBS: ${v.observations}\n================================` : "================================"}
Obrigado pela preferência!
Volte sempre!`;

    if (onPrintReceipt) {
      onPrintReceipt("Recibo de Venda", recStr, finalClientPhone, client.name);
    }
  };

  const handlePrintAtendimento = (at: Atendimento, client: CombinedClient) => {
    const finalClientPhone = client.phone || "";
    const clientDocLine = client.cnpj ? `CNPJ: ${client.cnpj}` : (client.cpf ? `CPF: ${client.cpf}` : "");
    
    if (at.status === "finalizado") {
      const recStr = `CUPOM DE SAIDA
CONTROLE: ${at.controlNumber}
FINALIZADO: ${at.exitDate ? new Date(at.exitDate).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}
CLIENTE: ${client.name}
${finalClientPhone ? `FONE: ${finalClientPhone}` : ""}
${clientDocLine ? `${clientDocLine}` : ""}
------------------------
APARELHO:
${at.item} ${at.brand} ${at.model}
${at.imei ? `IMEI: ${at.imei}` : ""}
------------------------
SERVICOS REALIZADOS:
${(at.services || []).map(s => `- ${s.name}: R$ ${Number(s.price).toFixed(2)}`).join("\n")}
${at.products && at.products.length > 0 ? `PECAS TROCADAS:\n${at.products.map(p => `- ${p.name} (x${p.quantity}): R$ ${(Number(p.price) * Number(p.quantity)).toFixed(2)}`).join("\n")}` : ""}
------------------------
LAUDO / OBSERVACOES SAIDA:
${at.notesFin || at.observations || "Aparelho entregue em perfeito funcionamento."}
------------------------
TOTAL GERAL: R$ ${at.totalAmount.toFixed(2)}
RECEBIDO: R$ ${at.totalAmount.toFixed(2)}
TROCO: R$ 0,00
------------------------
GARANTIA: ${at.garantia || "Garantia de 90 dias (3 meses)"}`;

      if (onPrintReceipt) {
        onPrintReceipt("Recibo de Saída / Garantia", recStr, finalClientPhone, client.name);
      }
    } else {
      const recStr = `2A VIA RECIBO ENTRADA
CONTROLE: ${at.controlNumber}
DATA: ${new Date(at.entryDate).toLocaleString("pt-BR")}
CLIENTE: ${client.name}
FONE: ${finalClientPhone}
${clientDocLine ? `${clientDocLine}` : ""}
------------------------
EQUIPAMENTO:
${at.item} ${at.brand} ${at.model}
${at.imei ? `IMEI: ${at.imei}` : ""}
${at.numeroSerie ? `SÉRIE: ${at.numeroSerie}` : ""}
------------------------
DEFEITO: ${at.defeito || "Não informado"}
ESTADO / OBS: ${at.observations || "Nenhuma"}
GARANTIA: ${at.garantia || "Garantia de 90 dias (3 meses)"}
------------------------
SERVICOS ESTIMADOS:
${(at.services || []).map(s => `- ${s.name}: R$ ${Number(s.price).toFixed(2)}`).join("\n")}
${at.products && at.products.length > 0 ? `PECAS:\n${at.products.map(p => `- ${p.name} (x${p.quantity}): R$ ${(Number(p.price) * Number(p.quantity)).toFixed(2)}`).join("\n")}` : ""}
------------------------
TOTAL ESTIMADO: R$ ${at.totalAmount.toFixed(2)}
------------------------
ASSINATURA DO CLIENTE:

________________________
TERMO: Autorizo o diagnóstico.`;

      if (onPrintReceipt) {
        onPrintReceipt("Recibo de Entrada OS", recStr, finalClientPhone, client.name);
      }
    }
  };

  // Fetch all data needed
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resClientes, resAtendimentos, resVendas] = await Promise.all([
        fetch("/api/clientes").then(r => r.ok ? r.json() : []),
        fetch("/api/atendimentos").then(r => r.ok ? r.json() : []),
        fetch("/api/vendas").then(r => r.ok ? r.json() : [])
      ]);
      setClientes(resClientes);
      setAtendimentos(resAtendimentos);
      setVendas(resVendas);
    } catch (err) {
      console.error("Erro ao carregar dados do histórico:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build combined list of clients (registered + unregistered names from sales/OS)
  const getCombinedClients = (): CombinedClient[] => {
    const map = new Map<string, CombinedClient>();

    // 1. Add all registered clients
    clientes.forEach(c => {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        cpf: c.cpf,
        cnpj: c.cnpj,
        isRegistered: true,
        atendimentosCount: 0,
        vendasCount: 0,
        totalSpent: 0
      });
    });

    // 2. Count atendimentos & add unregistered names if any
    atendimentos.forEach(at => {
      if (at.clienteId && map.has(at.clienteId)) {
        const entry = map.get(at.clienteId)!;
        entry.atendimentosCount += 1;
        entry.totalSpent += at.totalAmount || 0;
      }
    });

    // 3. Count sales & add unregistered names from vendas
    vendas.forEach(v => {
      if (v.clienteId && map.has(v.clienteId)) {
        const entry = map.get(v.clienteId)!;
        entry.vendasCount += 1;
        entry.totalSpent += v.totalAmount || 0;
      } else if (v.clienteName && v.clienteName !== "Consumidor Final") {
        // Unregistered client name
        const key = `unregistered-${v.clienteName.toLowerCase().trim()}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: v.clienteName,
            phone: "", // Will try to fill if phone recorded in payload
            isRegistered: false,
            atendimentosCount: 0,
            vendasCount: 0,
            totalSpent: 0
          });
        }
        const entry = map.get(key)!;
        entry.vendasCount += 1;
        entry.totalSpent += v.totalAmount || 0;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  };

  const combined = getCombinedClients();

  // Filter combined list
  const filtered = combined.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    (c.cpf && c.cpf.includes(searchQuery)) ||
    (c.cnpj && c.cnpj.includes(searchQuery))
  );

  const selectedClient = combined.find(c => c.id === selectedClientId);

  // Get chronological history of activities (Atendimentos & Vendas) for selected client
  const getClientHistory = (client: CombinedClient) => {
    const historyList: any[] = [];

    // Filter atendimentos
    atendimentos.forEach(at => {
      const matchRegistered = client.isRegistered && at.clienteId === client.id;
      if (matchRegistered) {
        historyList.push({
          type: "atendimento",
          date: at.exitDate || at.entryDate,
          id: at.id,
          title: `Ordem de Serviço #${at.controlNumber}`,
          subtitle: `${at.brand} ${at.model} (${at.item})`,
          value: at.totalAmount,
          status: at.status,
          raw: at
        });
      }
    });

    // Filter vendas
    vendas.forEach(v => {
      const matchRegistered = client.isRegistered && v.clienteId === client.id;
      const matchUnregistered = !client.isRegistered && v.clienteName && v.clienteName.toLowerCase().trim() === client.name.toLowerCase().trim();
      
      if (matchRegistered || matchUnregistered) {
        historyList.push({
          type: "venda",
          date: v.date,
          id: v.id,
          title: `Venda Direta`,
          subtitle: v.items.map(it => `${it.quantity}x ${it.name}`).join(", "),
          value: v.totalAmount,
          status: "finalizado",
          raw: v
        });
      }
    });

    // Sort by date descending
    return historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Helper to compute warranty status dynamically from customer warranty text
  const getWarrantyInfo = (dateString: string, type: "atendimento" | "venda", customWarrantyStr?: string) => {
    const baseDate = new Date(dateString);
    if (isNaN(baseDate.getTime())) return null;

    const expirationDate = new Date(baseDate);
    let daysOfWarranty = 90;
    const wLower = (customWarrantyStr || "").toLowerCase().trim();

    if (wLower.includes("sem garantia") || wLower === "0") {
      return {
        status: "none",
        text: "Sem garantia",
        daysLeft: 0,
        expDate: null
      };
    }

    if (wLower.includes("1 ano") || wLower.includes("12 meses") || wLower.includes("365")) {
      daysOfWarranty = 365;
    } else if (wLower.includes("6 meses") || wLower.includes("180")) {
      daysOfWarranty = 180;
    } else if (wLower.includes("3 meses") || wLower.includes("90")) {
      daysOfWarranty = 90;
    } else if (wLower.includes("60")) {
      daysOfWarranty = 60;
    } else if (wLower.includes("30")) {
      daysOfWarranty = 30;
    } else if (wLower.includes("15")) {
      daysOfWarranty = 15;
    } else {
      const match = wLower.match(/(\d+)/);
      if (match) {
        daysOfWarranty = parseInt(match[1], 10);
      }
    }

    expirationDate.setDate(expirationDate.getDate() + daysOfWarranty);

    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const displayTitle = customWarrantyStr && customWarrantyStr.trim() ? customWarrantyStr : `Garantia de ${daysOfWarranty} dias`;

    if (diffDays > 0) {
      return {
        status: "active",
        text: `${displayTitle} (restam ${diffDays} dias)`,
        daysLeft: diffDays,
        expDate: expirationDate.toLocaleDateString("pt-BR")
      };
    } else {
      return {
        status: "expired",
        text: `${displayTitle} (Expirou em ${expirationDate.toLocaleDateString("pt-BR")})`,
        daysLeft: diffDays,
        expDate: expirationDate.toLocaleDateString("pt-BR")
      };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: CLIENT LIST & SEARCH (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Clientes</h3>
            <button 
              onClick={fetchData}
              className="p-1 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-50 transition"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome ou telefone do cliente..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#1E88E5] transition font-medium"
            />
          </div>
        </div>

        {/* Client Selector List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span>Carregando histórico...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum cliente com histórico encontrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((c) => {
                const isSelected = selectedClientId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className={`w-full p-3.5 text-left flex items-center justify-between transition gap-3 border-l-4 ${
                      isSelected 
                        ? "bg-blue-50/50 border-[#1E88E5]" 
                        : "bg-white border-transparent hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[140px]">{c.name}</span>
                        {c.isRegistered ? (
                          <span className="text-[8px] bg-blue-50 text-[#1E88E5] font-black px-1 rounded uppercase tracking-wider shrink-0">
                            Cadastrado
                          </span>
                        ) : (
                          <span className="text-[8px] bg-amber-50 text-amber-600 font-black px-1 rounded uppercase tracking-wider shrink-0">
                            Avulso
                          </span>
                        )}
                      </div>
                      
                      {c.phone && (
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">{c.phone}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black text-slate-700">R$ {c.totalSpent.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        {c.atendimentosCount} OS • {c.vendasCount} Compras
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: TIMELINE & DETAILS (7 Cols) */}
      <div className="lg:col-span-7">
        {!selectedClient ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 space-y-3 min-h-[350px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shadow-inner">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-xs">Consulte um Histórico Completo</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Selecione um cliente ao lado para ver a linha do tempo de ordens de serviço, compras rápidas de balcão e status de garantias.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Client Summary Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E88E5] text-white rounded-xl flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{selectedClient.name}</h4>
                    {selectedClient.phone && (
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{selectedClient.phone}</p>
                    )}
                    {selectedClient.cnpj ? (
                      <p className="text-[9px] text-blue-700 font-mono font-bold mt-0.5">CNPJ: {selectedClient.cnpj}</p>
                    ) : selectedClient.cpf ? (
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">CPF: {selectedClient.cpf}</p>
                    ) : null}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                    Fidelidade ativa
                  </span>
                </div>
              </div>

              {/* Quick stats badges */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-50 text-center">
                <div className="p-2 bg-slate-50/50 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Gasto</p>
                  <p className="text-xs font-black text-[#1E88E5] font-mono mt-0.5">R$ {selectedClient.totalSpent.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-slate-50/50 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ordens de Serviço</p>
                  <p className="text-xs font-black text-slate-800 font-mono mt-0.5">{selectedClient.atendimentosCount}</p>
                </div>
                <div className="p-2 bg-slate-50/50 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Vendas Rápidas</p>
                  <p className="text-xs font-black text-slate-800 font-mono mt-0.5">{selectedClient.vendasCount}</p>
                </div>
              </div>
            </div>

            {/* Timeline Events List */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pl-1">Linha do Tempo</h4>
              
              {getClientHistory(selectedClient).length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-150 text-center text-slate-400 text-xs">
                  Nenhum registro de atendimento ou venda associado a este cliente.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-4">
                  {getClientHistory(selectedClient).map((item, idx) => {
                    const isExpanded = !!expandedItems[item.id];
                    const isService = item.type === "atendimento";
                    
                    // Compute warranty info
                    const warranty = getWarrantyInfo(item.date, item.type, item.raw.garantia || item.raw.warranty || item.raw.observations);

                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline node icon */}
                        <div className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm text-white text-[10px] ${
                          isService ? "bg-blue-500" : "bg-indigo-500"
                        }`}>
                          {isService ? <Wrench className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                        </div>

                        {/* Event Card */}
                        <div className="bg-white border border-slate-100 hover:border-slate-200 shadow-sm rounded-xl overflow-hidden transition">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="w-full p-3.5 text-left flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                  {new Date(item.date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(item.date).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <p className="font-extrabold text-slate-800 text-xs mt-1 leading-tight">{item.title}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{item.subtitle}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-xs font-black text-slate-800 font-mono">R$ {item.value.toFixed(2)}</p>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                                  item.status === 'finalizado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {item.status === 'finalizado' ? 'Finalizado' : 'Em andamento'}
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </button>

                          {/* Expanded content details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-slate-50 bg-slate-50/30 text-xs space-y-3.5 animate-fade-in">
                              
                              {/* Warranty Section */}
                              {warranty && (
                                <div className="space-y-2">
                                  {editingWarrantyItemId === item.id ? (
                                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 shadow-xs">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                                          <span className="font-extrabold text-xs text-blue-950">Alterar Prazo / Termo de Garantia</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={handleCancelEditWarranty}
                                          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/60 transition cursor-pointer"
                                          title="Cancelar"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                                          Descrição da Garantia
                                        </label>
                                        <input
                                          type="text"
                                          value={editingWarrantyVal}
                                          onChange={(e) => setEditingWarrantyVal(e.target.value)}
                                          placeholder="Ex: Garantia de 90 dias (3 meses)..."
                                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E88E5] transition"
                                        />
                                      </div>

                                      {/* Presets */}
                                      <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                          Prazos Pré-definidos:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {[
                                            "Garantia de 90 dias (3 meses)",
                                            "Garantia de 30 dias",
                                            "Garantia de 60 dias",
                                            "Garantia de 6 meses",
                                            "Garantia de 1 ano",
                                            "Sem garantia"
                                          ].map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              onClick={() => setEditingWarrantyVal(preset)}
                                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                                editingWarrantyVal === preset
                                                  ? "bg-[#1E88E5] text-white border-[#1E88E5] shadow-xs"
                                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                              }`}
                                            >
                                              {preset}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex items-center justify-end gap-2 pt-1">
                                        <button
                                          type="button"
                                          onClick={handleCancelEditWarranty}
                                          disabled={isSavingWarranty}
                                          className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveWarranty(item)}
                                          disabled={isSavingWarranty || !editingWarrantyVal.trim()}
                                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-lg transition shadow-xs cursor-pointer"
                                        >
                                          {isSavingWarranty ? (
                                            <>
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              <span>Salvando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Salvar Garantia</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${
                                      warranty.status === "active" 
                                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                                        : warranty.status === "expired"
                                        ? "bg-slate-50 border-slate-200 text-slate-500"
                                        : "bg-blue-50/50 border-blue-100 text-blue-800"
                                    }`}>
                                      <div className="flex items-start gap-3 min-w-0 flex-1">
                                        {warranty.status === "active" ? (
                                          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        ) : warranty.status === "expired" ? (
                                          <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        ) : (
                                          <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-extrabold text-xs">Garantia & Termos de Troca</p>
                                            {warranty.status === "active" && (
                                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100/80 text-emerald-700 rounded-full">
                                                Ativa
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] mt-0.5 font-medium leading-relaxed">{warranty.text}</p>
                                          {warranty.expDate && (
                                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Prazo final: {warranty.expDate}</p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Edit button */}
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditWarranty(item)}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                                        title="Alterar garantia ou corrigir prazo"
                                      >
                                        <Pencil className="w-3 h-3 text-blue-600" />
                                        <span>Editar</span>
                                      </button>
                                    </div>
                                  )}

                                  {feedbackMsg && feedbackMsg.id === item.id && (
                                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1.5 animate-fade-in">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>{feedbackMsg.text}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Item list detail */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Itens Relacionados</p>
                                <div className="bg-white border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-sm">
                                  {isService ? (
                                    <>
                                      {/* Services listed */}
                                      {(item.raw.services || []).map((s: any, sIdx: number) => (
                                        <div key={sIdx} className="p-2.5 flex justify-between items-center text-[11px] font-medium text-slate-700">
                                          <div className="flex items-center gap-2">
                                            <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                            <span>{s.name}</span>
                                          </div>
                                          <span className="font-mono font-bold text-slate-800">R$ {Number(s.price).toFixed(2)}</span>
                                        </div>
                                      ))}
                                      {/* Products listed */}
                                      {(item.raw.products || []).map((p: any, pIdx: number) => (
                                        <div key={pIdx} className="p-2.5 flex justify-between items-center text-[11px] font-medium text-slate-700">
                                          <div className="flex items-center gap-2">
                                            <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                            <span>{p.name} <span className="text-[9px] text-slate-400 font-bold">x{p.quantity}</span></span>
                                          </div>
                                          <span className="font-mono font-bold text-slate-800">R$ {(Number(p.price) * Number(p.quantity)).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    // Sale items
                                    (item.raw.items || []).map((it: any, itIdx: number) => (
                                      <div key={itIdx} className="p-2.5 flex justify-between items-center text-[11px] font-medium text-slate-700">
                                        <div className="flex items-center gap-2">
                                          <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span>{it.name} <span className="text-[9px] text-slate-400 font-bold font-mono">x{it.quantity}</span></span>
                                        </div>
                                        <span className="font-mono font-bold text-slate-800">R$ {(Number(it.price) * Number(it.quantity)).toFixed(2)}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Metadata list */}
                              <div className="grid grid-cols-2 gap-3 pt-1 text-[10px] text-slate-400 font-medium">
                                <div>
                                  <span className="block text-slate-400">ID da Transação:</span>
                                  <span className="font-mono text-slate-700">{item.id}</span>
                                </div>
                                {isService && item.raw.observations && (
                                  <div className="col-span-2">
                                    <span className="block text-slate-400">Observações de Entrada:</span>
                                    <span className="text-slate-600 block bg-slate-50 p-2 border border-slate-100 rounded-lg font-medium italic mt-1 leading-normal">
                                      "{item.raw.observations}"
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Print Receipt Action */}
                              <div className="flex justify-end pt-3 border-t border-slate-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isService) {
                                      handlePrintAtendimento(item.raw, selectedClient);
                                    } else {
                                      handlePrintVenda(item.raw, selectedClient);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition shadow-sm hover:shadow active:scale-95 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                                  Emitir / Imprimir Recibo
                                </button>
                              </div>
                              
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
