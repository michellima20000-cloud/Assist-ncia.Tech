import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Printer,
  ArrowLeft,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Smartphone,
  Save,
  RotateCcw,
  FileText,
  User,
  Trash2,
  Eye,
  ArrowRight,
  ShieldAlert,
  Clock
} from "lucide-react";
import { Checklist, ChecklistItemStatus, DamageMark, Cliente, Marca } from "../types";
import PatternLock from "./PatternLock";
import DeviceDiagram from "./DeviceDiagram";
import ChecklistPrintModal from "./ChecklistPrintModal";

interface ChecklistScreenProps {
  onBack: () => void;
  onNavigateToEntrada?: (initialData?: any) => void;
  companyName?: string;
  companyPhone?: string;
  companyCnpj?: string;
}

const DEFAULT_ITEMS = [
  "Tela de Display",
  "Touch Screen",
  "Teclas",
  "Sensores de proximidade",
  "Bluetooth",
  "Wi-fi",
  "Ligações",
  "Microfone / Áudio",
  "Câmera Frontal",
  "Câmera Traseira",
  "Conector de Carga",
  "Bateria / Carcaça"
];

export default function ChecklistScreen({
  onBack,
  onNavigateToEntrada,
  companyName,
  companyPhone,
  companyCnpj
}: ChecklistScreenProps) {
  const [viewMode, setViewMode] = useState<"form" | "history">("form");
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "ordem_servico" | "orcamento">("all");

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printChecklist, setPrintChecklist] = useState<Checklist | null>(null);
  const [isBlankPrint, setIsBlankPrint] = useState(false);

  // Form State
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [docType, setDocType] = useState<"ordem_servico" | "orcamento">("ordem_servico");
  const [numeroDoc, setNumeroDoc] = useState("");
  const [dataEntrada, setDataEntrada] = useState(() => new Date().toISOString().split("T")[0]);

  // Client info
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [rgCpf, setRgCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  // Device info
  const [marcaModelo, setMarcaModelo] = useState("");
  const [senhaTexto, setSenhaTexto] = useState("");
  const [senhaPadrao, setSenhaPadrao] = useState<number[]>([]);
  const [imei, setImei] = useState("");
  const [gbMemoria, setGbMemoria] = useState("");
  const [cor, setCor] = useState("");

  // Items status
  const [items, setItems] = useState<ChecklistItemStatus[]>(() =>
    DEFAULT_ITEMS.map(name => ({ name, status: "nt" }))
  );

  // Damages
  const [damageMarks, setDamageMarks] = useState<DamageMark[]>([]);
  const [avariasDescricao, setAvariasDescricao] = useState("");

  // Problems & Values
  const [problemaRelatado, setProblemaRelatado] = useState("");
  const [servicoExecutado, setServicoExecutado] = useState("");
  const [valor, setValor] = useState<string>("");
  const [diasGarantia, setDiasGarantia] = useState<number>(90);
  const [retiradoEm, setRetiradoEm] = useState("");

  // Success / notification message
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  // Load initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [chkRes, cliRes, marRes] = await Promise.all([
        fetch("/api/checklists").then(r => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/clientes").then(r => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/marcas").then(r => (r.ok ? r.json() : [])).catch(() => [])
      ]);
      setChecklists(chkRes);
      setClientes(cliRes);
      setMarcas(marRes);

      if (!numeroDoc && !currentId) {
        const nextNum = (chkRes?.length || 0) + 1;
        setNumeroDoc(`CK-${String(nextNum).padStart(4, "0")}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset form to blank new checklist
  const handleNewChecklist = () => {
    setCurrentId(null);
    setDocType("ordem_servico");
    const nextNum = (checklists.length || 0) + 1;
    setNumeroDoc(`CK-${String(nextNum).padStart(4, "0")}`);
    setDataEntrada(new Date().toISOString().split("T")[0]);
    setClienteId("");
    setClienteNome("");
    setRgCpf("");
    setTelefone("");
    setMarcaModelo("");
    setSenhaTexto("");
    setSenhaPadrao([]);
    setImei("");
    setGbMemoria("");
    setCor("");
    setItems(DEFAULT_ITEMS.map(name => ({ name, status: "nt" })));
    setDamageMarks([]);
    setAvariasDescricao("");
    setProblemaRelatado("");
    setServicoExecutado("");
    setValor("");
    setDiasGarantia(90);
    setRetiradoEm("");
    setViewMode("form");
  };

  // Populate form with existing checklist
  const handleEditChecklist = (item: Checklist) => {
    setCurrentId(item.id);
    setDocType(item.docType || "ordem_servico");
    setNumeroDoc(item.numeroDoc || "");
    setDataEntrada(item.dataEntrada || new Date().toISOString().split("T")[0]);
    setClienteId(item.clienteId || "");
    setClienteNome(item.clienteNome || "");
    setRgCpf(item.rgCpf || "");
    setTelefone(item.telefone || "");
    setMarcaModelo(item.marcaModelo || "");
    setSenhaTexto(item.senhaTexto || "");
    setSenhaPadrao(Array.isArray(item.senhaPadrao) ? item.senhaPadrao : []);
    setImei(item.imei || "");
    setGbMemoria(item.gbMemoria || "");
    setCor(item.cor || "");

    // Merge items ensuring all default items exist
    const mergedItems: ChecklistItemStatus[] = DEFAULT_ITEMS.map(name => {
      const found = item.items?.find(i => i.name.toLowerCase() === name.toLowerCase());
      return found || { name, status: "nt" };
    });
    setItems(mergedItems);

    setDamageMarks(Array.isArray(item.damageMarks) ? item.damageMarks : []);
    setAvariasDescricao(item.avariasDescricao || "");
    setProblemaRelatado(item.problemaRelatado || "");
    setServicoExecutado(item.servicoExecutado || "");
    setValor(item.valor ? String(item.valor) : "");
    setDiasGarantia(item.diasGarantia || 90);
    setRetiradoEm(item.retiradoEm || "");
    setViewMode("form");
  };

  // Quick mark all checklist items as OK ("sim")
  const handleMarkAllSim = () => {
    setItems(prev => prev.map(item => ({ ...item, status: "sim" })));
  };

  // Change single item status
  const handleSetItemStatus = (name: string, status: "sim" | "nao" | "nt") => {
    setItems(prev =>
      prev.map(i => (i.name.toLowerCase() === name.toLowerCase() ? { ...i, status } : i))
    );
  };

  // Quick select existing client
  const handleSelectClient = (c: Cliente) => {
    setClienteId(c.id);
    setClienteNome(c.name);
    setTelefone(c.phone || "");
    setRgCpf(c.cpf || c.cnpj || "");
    setClientSearchOpen(false);
  };

  // Build checklist object
  const buildCurrentChecklist = (): Checklist => {
    return {
      id: currentId || "chk-" + Date.now(),
      docType,
      numeroDoc: numeroDoc.trim() || "CK-0001",
      dataEntrada,
      clienteId,
      clienteNome: clienteNome.trim() || "Cliente Balcão",
      rgCpf: rgCpf.trim(),
      telefone: telefone.trim(),
      marcaModelo: marcaModelo.trim(),
      senhaTexto: senhaTexto.trim(),
      senhaPadrao,
      imei: imei.trim(),
      gbMemoria: gbMemoria.trim(),
      cor: cor.trim(),
      items,
      damageMarks,
      avariasDescricao: avariasDescricao.trim(),
      problemaRelatado: problemaRelatado.trim(),
      servicoExecutado: servicoExecutado.trim(),
      valor: valor ? parseFloat(valor) : 0,
      diasGarantia: diasGarantia || 90,
      retiradoEm: retiradoEm.trim(),
      status: "aberto",
      createdAt: new Date().toISOString()
    };
  };

  // Save checklist
  const handleSave = async (andPrint = false) => {
    if (!clienteNome.trim()) {
      alert("Por favor, preencha o Nome do Cliente.");
      return;
    }

    const payload = buildCurrentChecklist();

    try {
      setLoading(true);
      const url = currentId ? `/api/checklists/${currentId}` : "/api/checklists";
      const method = currentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao salvar checklist");

      const savedData = await res.json();
      setCurrentId(savedData.id);
      await fetchData();

      setSaveSuccessMessage("Checklist salvo com sucesso!");
      setTimeout(() => setSaveSuccessMessage(""), 3500);

      if (andPrint) {
        setPrintChecklist(savedData);
        setIsBlankPrint(false);
        setPrintModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao salvar checklist");
    } finally {
      setLoading(false);
    }
  };

  // Delete checklist
  const handleDeleteChecklist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este checklist?")) return;

    try {
      setLoading(true);
      await fetch(`/api/checklists/${id}`, { method: "DELETE" });
      await fetchData();
      if (currentId === id) {
        handleNewChecklist();
      }
    } finally {
      setLoading(false);
    }
  };

  // Convert checklist to official OS (Ordem de Serviço)
  const handleCreateOS = () => {
    if (onNavigateToEntrada) {
      onNavigateToEntrada({
        clienteNome,
        clienteTelefone: telefone,
        clienteCpf: rgCpf,
        item: "Smartphone",
        brand: marcaModelo.split(" ")[0] || "Outros",
        model: marcaModelo,
        password: senhaTexto || (senhaPadrao.length ? `Padrão: ${senhaPadrao.map(p => p + 1).join("-")}` : ""),
        imei,
        reportedDefect: problemaRelatado || "Entrada com Checklist",
        value: valor ? parseFloat(valor) : 0
      });
    } else {
      alert("Para gerar O.S., acesse o botão 'ENTRADA' no Dashboard principal.");
    }
  };

  // Trigger blank print
  const handlePrintBlank = () => {
    setIsBlankPrint(true);
    setPrintChecklist(null);
    setPrintModalOpen(true);
  };

  // Filtered history
  const filteredChecklists = checklists.filter(item => {
    if (filterType !== "all" && item.docType !== filterType) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.clienteNome?.toLowerCase().includes(term) ||
      item.marcaModelo?.toLowerCase().includes(term) ||
      item.numeroDoc?.toLowerCase().includes(term) ||
      item.telefone?.includes(term) ||
      item.imei?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition flex items-center justify-center cursor-pointer"
            title="Voltar ao Início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-11 h-11 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
              Checklist de Entrada
              <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-full border border-purple-200">
                Aparelhos & Avarias
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Checklist completo de inspeção física, desbloqueio de tela e termos de garantia
            </p>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrintBlank}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer border border-slate-200"
            title="Imprimir folha de checklist limpa para preenchimento à mão"
          >
            <Printer className="w-4 h-4 text-purple-600" />
            Imprimir em Branco (Manual)
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === "form" ? "history" : "form")}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer border border-purple-200"
          >
            <Clock className="w-4 h-4" />
            {viewMode === "form" ? `Histórico (${checklists.length})` : "Novo / Editar"}
          </button>

          {viewMode === "history" && (
            <button
              type="button"
              onClick={handleNewChecklist}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Checklist
            </button>
          )}
        </div>
      </div>

      {/* Success alert */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage("")}
            className="text-xs text-emerald-700 hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE: HISTORY                                                        */}
      {/* ========================================================================= */}
      {viewMode === "history" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por cliente, aparelho, IMEI..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterType === "all" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Todos ({checklists.length})
              </button>
              <button
                onClick={() => setFilterType("ordem_servico")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterType === "ordem_servico" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Ordem de Serviço
              </button>
              <button
                onClick={() => setFilterType("orcamento")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterType === "orcamento" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Orçamento
              </button>
            </div>
          </div>

          {filteredChecklists.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ClipboardCheck className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
              <p className="font-semibold text-sm">Nenhum checklist encontrado</p>
              <p className="text-xs">Crie um novo checklist para registrar a entrada de aparelhos.</p>
              <button
                onClick={handleNewChecklist}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Checklist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChecklists.map(chk => (
                <div
                  key={chk.id}
                  onClick={() => handleEditChecklist(chk)}
                  className="p-4 bg-slate-50/70 hover:bg-purple-50/20 border border-slate-200 hover:border-purple-300 rounded-2xl transition cursor-pointer flex flex-col justify-between group shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        {chk.numeroDoc || "CK-S/N"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {chk.docType === "orcamento" ? "Orçamento" : "Ordem de Serviço"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-purple-900 transition">
                        {chk.clienteNome}
                      </h4>
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1 mt-0.5">
                        <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                        {chk.marcaModelo || "Modelo não informado"}
                        {chk.gbMemoria ? ` (${chk.gbMemoria})` : ""}
                      </p>
                    </div>

                    {chk.problemaRelatado && (
                      <p className="text-xs text-slate-500 line-clamp-2 italic bg-white p-2 rounded-lg border border-slate-100">
                        &quot;{chk.problemaRelatado}&quot;
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                      <span>Data: {chk.dataEntrada ? new Date(chk.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : "Hoje"}</span>
                      {chk.damageMarks?.length ? (
                        <span className="text-red-600 font-semibold">• {chk.damageMarks.length} avaria(s)</span>
                      ) : null}
                      {chk.valor ? (
                        <span className="ml-auto font-bold text-emerald-700">
                          R$ {chk.valor.toFixed(2).replace(".", ",")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setPrintChecklist(chk);
                        setIsBlankPrint(false);
                        setPrintModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-purple-700 bg-white hover:bg-purple-50 rounded-lg border border-slate-200 transition flex items-center gap-1.5"
                      title="Imprimir Checklist"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-600" />
                      Imprimir
                    </button>

                    <button
                      type="button"
                      onClick={e => handleDeleteChecklist(chk.id, e)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE: FORM (NEW / EDIT)                                              */}
      {/* ========================================================================= */}
      {viewMode === "form" && (
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSave(false);
          }}
          className="space-y-6"
        >
          {/* Section 1: Document Type & Header Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Tipo de Registro:
                </span>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                  <input
                    type="radio"
                    name="docType"
                    checked={docType === "ordem_servico"}
                    onChange={() => setDocType("ordem_servico")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  ORDEM DE SERVIÇO
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                  <input
                    type="radio"
                    name="docType"
                    checked={docType === "orcamento"}
                    onChange={() => setDocType("orcamento")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  ORÇAMENTO
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Nº:</span>
                  <input
                    type="text"
                    value={numeroDoc}
                    onChange={e => setNumeroDoc(e.target.value)}
                    placeholder="CK-0001"
                    className="w-28 px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-purple-800 focus:outline-purple-600"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Entrada:</span>
                  <input
                    type="date"
                    value={dataEntrada}
                    onChange={e => setDataEntrada(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-purple-600"
                  />
                </div>
              </div>
            </div>

            {/* Grid 1: Cliente & Aparelho + Desbloqueio de Tela */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (8 cols): Cliente & Aparelho Data */}
              <div className="lg:col-span-8 space-y-4">
                {/* Cliente Info Box */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      Dados do Cliente
                    </label>

                    {/* Quick Pick from registered clients */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setClientSearchOpen(!clientSearchOpen)}
                        className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Buscar Cliente Cadastrado
                      </button>

                      {clientSearchOpen && (
                        <div className="absolute right-0 top-6 z-20 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1 max-h-56 overflow-y-auto">
                          <p className="text-[10px] font-bold text-slate-400 px-2 py-1">Selecione para preencher:</p>
                          {clientes.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              className="w-full text-left p-2 hover:bg-purple-50 rounded-lg text-xs transition"
                            >
                              <div className="font-bold text-slate-800">{c.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {c.phone || "Sem fone"} {c.cpf ? `• ${c.cpf}` : ""}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome do Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteNome}
                        onChange={e => setClienteNome(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        RG / CPF
                      </label>
                      <input
                        type="text"
                        value={rgCpf}
                        onChange={e => setRgCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={telefone}
                        onChange={e => setTelefone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Aparelho Info Box */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                    Dados do Aparelho
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Marca / Modelo
                      </label>
                      <input
                        type="text"
                        value={marcaModelo}
                        onChange={e => setMarcaModelo(e.target.value)}
                        placeholder="Ex: iPhone 13 Pro ou Galaxy S22"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Memória (GB)
                      </label>
                      <input
                        type="text"
                        value={gbMemoria}
                        onChange={e => setGbMemoria(e.target.value)}
                        placeholder="Ex: 128GB"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Cor do Aparelho
                      </label>
                      <input
                        type="text"
                        value={cor}
                        onChange={e => setCor(e.target.value)}
                        placeholder="Ex: Preto, Azul..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Senha Numérica / PIN (opcional)
                      </label>
                      <input
                        type="text"
                        value={senhaTexto}
                        onChange={e => setSenhaTexto(e.target.value)}
                        placeholder="Ex: 123456 ou Sem senha"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        IMEI do Celular (opcional)
                      </label>
                      <input
                        type="text"
                        value={imei}
                        onChange={e => setImei(e.target.value)}
                        placeholder="358000000000000"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols): DESBLOQUEIO DE TELA Box (9 Circles / Pattern Lock) */}
              <div className="lg:col-span-4 bg-purple-50/40 border-2 border-purple-200 rounded-2xl p-4 flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="font-black text-xs uppercase tracking-wider text-purple-900 block">
                    DESBLOQUEIO DE TELA
                  </span>
                  <span className="text-[10px] text-purple-600 font-medium">
                    Ligue os pontos para desenhar o padrão
                  </span>
                </div>

                <PatternLock
                  value={senhaPadrao}
                  onChange={setSenhaPadrao}
                  size={150}
                />
              </div>

            </div>
          </div>

          {/* Section 2: LISTA DE CHECAGEM (CHECKLIST) & MAPA DE AVARIAS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-purple-600" />
                  LISTA DE CHECAGEM (CHECKLIST)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Os itens abaixo estão em condições de utilização?
                </p>
              </div>

              <button
                type="button"
                onClick={handleMarkAllSim}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Marca Sim para todos os itens rapidamente"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Marcar Todos como Sim (OK)
              </button>
            </div>

            {/* Two Main Columns: Checklist Items VS Device Diagram */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left: 12 Inspection Items */}
              <div className="lg:col-span-6 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(item => {
                    const isSim = item.status === "sim";
                    const isNao = item.status === "nao";
                    const isNt = item.status === "nt";

                    return (
                      <div
                        key={item.name}
                        className={`p-2.5 rounded-xl border transition flex flex-col justify-between ${
                          isSim
                            ? "bg-emerald-50/40 border-emerald-200"
                            : isNao
                            ? "bg-red-50/50 border-red-200"
                            : "bg-slate-50/60 border-slate-200"
                        }`}
                      >
                        <span className="font-bold text-xs text-slate-800 mb-1.5">
                          {item.name}
                        </span>

                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetItemStatus(item.name, "sim")}
                            className={`py-1 px-1 rounded-lg text-[11px] font-bold transition text-center cursor-pointer ${
                              isSim
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            Sim
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetItemStatus(item.name, "nao")}
                            className={`py-1 px-1 rounded-lg text-[11px] font-bold transition text-center cursor-pointer ${
                              isNao
                                ? "bg-red-600 text-white shadow-xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            Não
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetItemStatus(item.name, "nt")}
                            className={`py-1 px-1 rounded-lg text-[11px] font-bold transition text-center cursor-pointer ${
                              isNt
                                ? "bg-slate-700 text-white shadow-xs"
                                : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            N/T
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Interactive Device Diagram for damage marking */}
              <div className="lg:col-span-6 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
                <DeviceDiagram
                  damageMarks={damageMarks}
                  onChange={setDamageMarks}
                />

                <div className="w-full mt-4 pt-3 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Descrição Complementar de Avarias (opcional)
                  </label>
                  <input
                    type="text"
                    value={avariasDescricao}
                    onChange={e => setAvariasDescricao(e.target.value)}
                    placeholder="Ex: Trinca na quina superior, tampa traseira com arranhões de bolso..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-purple-600"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Problema Relatado, Serviço Previsto e Valores */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Problema Relatado pelo Cliente
                </label>
                <textarea
                  rows={3}
                  value={problemaRelatado}
                  onChange={e => setProblemaRelatado(e.target.value)}
                  placeholder="Descreva o que o cliente reclamou (ex: Não carrega, tela apagou após queda...)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Serviço Executado / Previsto
                </label>
                <textarea
                  rows={3}
                  value={servicoExecutado}
                  onChange={e => setServicoExecutado(e.target.value)}
                  placeholder="Ex: Troca de frontal completa + limpeza do conector de carga..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor R$
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600 text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Garantia (Dias)
                </label>
                <input
                  type="number"
                  value={diasGarantia}
                  onChange={e => setDiasGarantia(parseInt(e.target.value) || 0)}
                  placeholder="90"
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Previsão de Retirada (opcional)
                </label>
                <input
                  type="date"
                  value={retiradoEm}
                  onChange={e => setRetiradoEm(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-purple-600"
                />
              </div>
            </div>

            {/* Terms Preview Box (Exact text from image) */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs text-amber-950">
              <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Termos Legais e Condições de Garantia (Impressos na Folha)
              </span>
              <p className="text-[11px] leading-relaxed">
                1) REPAROS REALIZADOS SÃO GARANTIDOS POR: <strong>{diasGarantia || 90} DIAS</strong>.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-700">
                2) Os telefones reparados que não forem retirados em 90 dias, após a aprovação do orçamento passarão a ser propriedade da loja, que poderá vendê-los para ressarcir-se dos custos incorridos.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-700">
                3) Ao deixar seu celular para reparo, retirar seu chip e cartão de memória. Não nos responsabilizamos por chip e cartão de memória.
              </p>
              <p className="text-[11px] font-black uppercase text-amber-900 pt-1">
                A GARANTIA DA PEÇA TROCADA NÃO GARANTE MAU USO, QUEDAS, TRINCOS, MOLHADOS, UMIDADE, OU ABERTO POR TERCEIROS.
              </p>
            </div>
          </div>

          {/* Action Bar Footer */}
          <div className="sticky bottom-4 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChecklist}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar Campos
              </button>

              <button
                type="button"
                onClick={handleCreateOS}
                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1.5 transition cursor-pointer"
                title="Levar esses dados direto para a tela de Entrada para criar a O.S."
              >
                <ArrowRight className="w-4 h-4" />
                Transformar em O.S. (Entrada)
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setPrintChecklist(buildCurrentChecklist());
                  setIsBlankPrint(false);
                  setPrintModalOpen(true);
                }}
                className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl border border-purple-200 flex items-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Visualizar Impressão
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? "Salvando..." : "Salvar Checklist"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Print Modal Dialog */}
      <ChecklistPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        checklist={printChecklist}
        isBlankMode={isBlankPrint}
        companyName={companyName}
        companyPhone={companyPhone}
        companyCnpj={companyCnpj}
      />
    </div>
  );
}
