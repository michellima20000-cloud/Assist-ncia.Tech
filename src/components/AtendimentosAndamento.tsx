import React, { useState, useEffect } from "react";
import { Search, Clock, ChevronRight, Phone, Edit, Trash2, Tag, ArrowLeft, Camera } from "lucide-react";
import { Atendimento, Cliente } from "../types";

interface AtendimentosAndamentoProps {
  onBack: () => void;
  onSelectAtendimento: (a: Atendimento) => void;
}

export default function AtendimentosAndamento({ onBack, onSelectAtendimento }: AtendimentosAndamentoProps) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [ats, cls] = await Promise.all([
        fetch("/api/atendimentos").then(r => r.json()),
        fetch("/api/clientes").then(r => r.json())
      ]);
      setAtendimentos(ats || []);
      setClientes(cls || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCliente = (id: string) => {
    return clientes.find(c => c.id === id) || { name: "Cliente Desconhecido", phone: "N/A" };
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

  // Filter only active ones ("na_assistencia" or "entrega")
  const activeOrders = atendimentos.filter(a => a.status === "na_assistencia" || a.status === "entrega");

  const filtered = activeOrders.filter(a => {
    const cli = getCliente(a.clienteId);
    return (
      a.controlNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.model.toLowerCase().includes(search.toLowerCase()) ||
      a.brand.toLowerCase().includes(search.toLowerCase()) ||
      cli.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sort by entrance date descending
  const sorted = [...filtered].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

  // Group by Date (YYYY-MM-DD)
  const groupOrdersByDate = () => {
    const groups: { [key: string]: Atendimento[] } = {};
    sorted.forEach(a => {
      const dateStr = a.entryDate.split("T")[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(a);
    });
    return groups;
  };

  const grouped = groupOrdersByDate();

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Aparelhos na Assistência</h2>
            <p className="text-slate-500 text-xs">Aparelhos em manutenção e prontos para entrega</p>
          </div>
        </div>
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
          placeholder="Buscar por Nº Controle, Cliente, Aparelho..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Grouped Lists */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-xs">
          Nenhum equipamento em manutenção encontrado.
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

                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelectAtendimento(a)}
                      className={`p-4 bg-white rounded-2xl border hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden ${
                        isReady ? "border-emerald-200" : "border-slate-100"
                      }`}
                    >
                      {/* Badge indicator on card top right */}
                      <span className={`absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isReady ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {isReady ? "PRONTO PARA ENTREGA" : "EM MANUTENÇÃO"}
                      </span>

                      <div className="flex gap-3">
                        {/* Device Thumbnail */}
                        {a.photoUrl ? (
                          <img src={a.photoUrl} className="w-14 h-14 object-cover rounded-xl border border-slate-100 shrink-0" alt="Equipamento" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <Camera className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="text-xs font-mono font-bold text-slate-600">{a.controlNumber}</p>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight">
                            {a.item} {a.brand} {a.model}
                          </h4>
                          <p className="text-xs font-semibold text-slate-700">Dono: {client.name}</p>
                        </div>
                      </div>

                      {/* Client Quick Phone Contact */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        <span>{client.phone}</span>
                        <Clock className="w-3.5 h-3.5 text-slate-400 ml-2" />
                        <span>Entrada: {new Date(a.entryDate).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Display items & services inside */}
                      <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Serviços adicionados</p>
                        <div className="flex flex-wrap gap-1">
                          {a.services.map((s, idx) => (
                            <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              {s.name}
                            </span>
                          ))}
                          {a.products.map((p, idx) => (
                            <span key={idx} className="text-[10px] bg-red-50 border border-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              + {p.name} (x{p.quantity})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action trigger footer */}
                      <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
                        <div className="text-xs font-bold text-[#1E88E5]">
                          Total: <span className="font-mono text-slate-800">R$ {a.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleDelete(a.id, e)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition"
                            title="Excluir OS"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <span className="flex items-center gap-0.5 text-xs text-blue-600 font-bold hover:underline">
                            Selecionar OS
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
    </div>
  );
}
