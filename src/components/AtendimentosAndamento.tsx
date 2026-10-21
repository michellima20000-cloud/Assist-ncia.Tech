import React, { useState, useEffect } from "react";
import { Search, Clock, ChevronRight, Phone, Edit, Trash2, Tag, ArrowLeft, Camera, FileText, Smartphone, Check } from "lucide-react";
import { Atendimento, Cliente } from "../types";
import ChecklistPrintModal from "./ChecklistPrintModal";

interface AtendimentosAndamentoProps {
  onBack: () => void;
  onSelectAtendimento: (a: Atendimento) => void;
  flowMode?: "atendimento" | "saida";
}

export default function AtendimentosAndamento({ onBack, onSelectAtendimento, flowMode }: AtendimentosAndamentoProps) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"todos" | "na_loja" | "entrega" | "orcamento">("todos");
  const [modalPrintAtendimento, setModalPrintAtendimento] = useState<Atendimento | null>(null);

  const fetchData = async () => {
    try {
      const ats = await fetch("/api/atendimentos").then(r => r.json()).catch(err => {
        console.error("Error fetching atendimentos", err);
        return [];
      });
      const cls = await fetch("/api/clientes").then(r => r.json()).catch(err => {
        console.error("Error fetching clientes", err);
        return [];
      });
      setAtendimentos(Array.isArray(ats) ? ats : []);
      setClientes(Array.isArray(cls) ? cls : []);
    } catch (err) {
      console.error(err);
      setAtendimentos([]);
      setClientes([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCliente = (id: string): Cliente => {
    const cleanId = (val: any) => String(val || "").trim().toLowerCase();
    const target = cleanId(id);
    return (clientes || []).find(c => c && cleanId(c.id) === target) || { id: "unknown", name: "Cliente Desconhecido", phone: "N/A", email: "", cpf: "", address: "" };
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente excluir este atendimento?")) return;
    try {
      const res = await fetch(`/api/atendimentos/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to safely convert any entryDate representation
  const getEntryDateStr = (entryDate: any): string => {
    if (!entryDate) return new Date().toISOString();
    if (typeof entryDate === "string") return entryDate;
    if (entryDate && typeof entryDate.toDate === "function") {
      try {
        return entryDate.toDate().toISOString();
      } catch (e) {}
    }
    if (entryDate && typeof entryDate._seconds === "number") {
      return new Date(entryDate._seconds * 1000).toISOString();
    }
    if (entryDate && typeof entryDate.seconds === "number") {
      return new Date(entryDate.seconds * 1000).toISOString();
    }
    if (entryDate instanceof Date) {
      return entryDate.toISOString();
    }
    const parsedTime = Number(entryDate);
    if (!isNaN(parsedTime) && parsedTime > 0) {
      return new Date(parsedTime).toISOString();
    }
    return String(entryDate);
  };

  // Counts for pills
  const emLojaCount = atendimentos.filter(a => a.status === "na_assistencia" && a.ficarNaAssistencia !== false).length;
  const prontosCount = atendimentos.filter(a => a.status === "entrega").length;
  const orcamentosCount = atendimentos.filter(a => a.tipoDocumento === "orcamento" || a.ficarNaAssistencia === false).length;

  // Filter only active ones depending on flowMode and filterType safely
  const activeOrders = (atendimentos || []).filter(a => {
    if (!a) return false;
    if (filterType === "na_loja") {
      return a.status === "na_assistencia" && a.ficarNaAssistencia !== false;
    }
    if (filterType === "entrega") {
      return a.status === "entrega";
    }
    if (filterType === "orcamento") {
      return a.tipoDocumento === "orcamento" || a.ficarNaAssistencia === false;
    }
    if (flowMode === "atendimento") {
      return a.status === "na_assistencia" || a.tipoDocumento === "orcamento";
    }
    if (flowMode === "saida") {
      return a.status === "entrega";
    }
    return a.status === "na_assistencia" || a.status === "entrega" || a.tipoDocumento === "orcamento";
  });

  const filtered = activeOrders.filter(a => {
    if (!a) return false;
    const cli = getCliente(a.clienteId);
    const searchLower = (search || "").toLowerCase();
    return (
      (a.controlNumber || "").toLowerCase().includes(searchLower) ||
      (a.model || "").toLowerCase().includes(searchLower) ||
      (a.brand || "").toLowerCase().includes(searchLower) ||
      ((cli?.name || "")).toLowerCase().includes(searchLower)
    );
  });

  // Sort by entrance date descending safely
  const sorted = [...filtered].sort((a, b) => {
    const dateStrA = getEntryDateStr(a?.entryDate);
    const dateStrB = getEntryDateStr(b?.entryDate);
    const timeA = new Date(dateStrA).getTime();
    const timeB = new Date(dateStrB).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  // Group by Date (YYYY-MM-DD) safely
  const groupOrdersByDate = () => {
    const groups: { [key: string]: Atendimento[] } = {};
    sorted.forEach(a => {
      if (!a) return;
      const entryDateStr = getEntryDateStr(a.entryDate);
      const dateStr = entryDateStr.includes("T") ? entryDateStr.split("T")[0] : entryDateStr;
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(a);
    });
    return groups;
  };

  const grouped = groupOrdersByDate();

  const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return "Data não informada";
    let d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {flowMode === "atendimento" ? "Atendimentos em Andamento (Bancada)" : "Equipamentos Registrados & Orçamentos"}
            </h2>
            <p className="text-slate-500 text-xs">
              Aparelhos na assistência, prontos para entrega e orçamentos com vistoria
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterType("todos")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterType === "todos"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todos ({atendimentos.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType("na_loja")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterType === "na_loja"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Na Assistência ({emLojaCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterType("entrega")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterType === "entrega"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Prontos p/ Retirada ({prontosCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterType("orcamento")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterType === "orcamento"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Orçamentos / Leva Agora ({orcamentosCount})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por Nº Controle, Cliente, Aparelho, Defeito..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Grouped Lists */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-xs">
          Nenhum equipamento encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).map(dateKey => (
            <div key={dateKey} className="space-y-2">
              <h3 className="text-xs font-bold text-[#1E88E5] uppercase tracking-wider pl-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#1E88E5] rounded-full inline-block"></span>
                <span>{formatDateHeader(dateKey)}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[dateKey].map(a => {
                  const client = getCliente(a.clienteId);
                  const isReady = a.status === "entrega";
                  const isOrcamento = a.tipoDocumento === "orcamento";
                  const naoFicou = a.ficarNaAssistencia === false;

                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelectAtendimento(a)}
                      className={`p-4 bg-white rounded-2xl border hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden ${
                        isReady 
                          ? "border-emerald-200" 
                          : naoFicou 
                          ? "border-amber-200 bg-amber-50/10" 
                          : "border-slate-100"
                      }`}
                    >
                      {/* Badge indicator on card top right */}
                      <div className="absolute top-3 right-3 flex items-center gap-1">
                        {isOrcamento && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Orçamento
                          </span>
                        )}
                        {naoFicou && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            Leva Agora
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isReady 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : (a.detailedStatus === "Aguardando aprovação do cliente" || a.detailedStatus === "Aguardando peça(s)")
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : (a.detailedStatus === "Sem conserto" || a.detailedStatus === "Reprovado pelo cliente")
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {a.detailedStatus || (isReady ? "PRONTO PARA ENTREGA" : "EM MANUTENÇÃO")}
                        </span>
                      </div>

                      <div className="flex gap-3">
                        {/* Device Thumbnail */}
                        {a.photoUrl ? (
                          <img src={a.photoUrl} className="w-14 h-14 object-cover rounded-xl border border-slate-100 shrink-0" alt="Equipamento" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <Camera className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <div className="space-y-1 pr-14">
                          <p className="text-xs font-mono font-bold text-slate-600">{a.controlNumber}</p>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight">
                            {a.item || ""} {a.brand || ""} {a.model || ""}
                          </h4>
                          <p className="text-xs font-semibold text-slate-700">Dono: {client?.name || "Cliente Desconhecido"}</p>
                        </div>
                      </div>

                      {/* Client Quick Phone Contact & Checklist badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          <span>{client?.phone || "N/A"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {a.assinaturaCliente && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Assinado
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(() => {
                              const dateStr = getEntryDateStr(a.entryDate);
                              const d = new Date(dateStr);
                              return isNaN(d.getTime())
                                ? "N/A"
                                : d.toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Defect preview */}
                      {a.defeito && (
                        <div className="p-2 bg-slate-50/80 rounded-xl text-[11px] text-slate-600 line-clamp-1">
                          <strong className="text-slate-800">Defeito:</strong> {a.defeito}
                        </div>
                      )}

                      {/* Display items & services inside */}
                      <div className="p-2 bg-slate-50 rounded-xl space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {(a.services || []).map((s, idx) => (
                            <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                              {s.name}
                            </span>
                          ))}
                          {(a.products || []).map((p, idx) => (
                            <span key={idx} className="text-[10px] bg-red-50 border border-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                              + {p.name} (x{p.quantity})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action trigger footer */}
                      <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
                        <div className="text-xs font-bold text-[#1E88E5]">
                          Total: <span className="font-mono text-slate-800">R$ {(Number(a.totalAmount) || 0).toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalPrintAtendimento(a);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            title="Ver e Imprimir Ficha A4"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ficha A4</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(a.id, e)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition"
                            title="Excluir OS"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <span className="flex items-center gap-0.5 text-xs text-blue-600 font-bold hover:underline ml-1">
                            Abrir
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist & Ficha A4 Print Modal */}
      {modalPrintAtendimento && (
        <ChecklistPrintModal
          isOpen={!!modalPrintAtendimento}
          onClose={() => setModalPrintAtendimento(null)}
          atendimento={modalPrintAtendimento}
          cliente={getCliente(modalPrintAtendimento.clienteId)}
          onPrintThermal={() => {}}
        />
      )}
    </div>
  );
}
