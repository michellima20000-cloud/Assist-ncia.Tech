import React, { useState, useEffect } from "react";
import { UserPlus, Search, Phone, FileText, MapPin, Edit, Trash2, X, Plus, Check, Clock, Users } from "lucide-react";
import { Cliente } from "../types";
import ClienteHistorico from "./ClienteHistorico";

interface ClientesProps {
  onSelect?: (cliente: Cliente) => void;
  isPicker?: boolean;
  onPrintReceipt?: (title: string, content: string, phone: string, clientName: string) => void;
}

const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

const formatCpf = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

export default function Clientes({ onSelect, isPicker = false, onPrintReceipt }: ClientesProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"cadastro" | "historico">("cadastro");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");

  const fetchClientes = async () => {
    try {
      const res = await fetch("/api/clientes");
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (err) {
      console.error("Erro ao buscar clientes", err);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCpf("");
    setAddress("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !cpf) {
      alert("Nome, Telefone e CPF são obrigatórios!");
      return;
    }

    const payload = { name, email, phone, cpf, address };

    try {
      const url = editingId ? `/api/clientes/${editingId}` : "/api/clientes";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        await fetchClientes();
        if (onSelect && !editingId) {
          // If in picker mode and created a new client, select immediately
          onSelect(saved);
        }
        resetForm();
      } else {
        alert("Erro ao salvar cliente.");
      }
    } catch (err) {
      console.error("Erro", err);
    }
  };

  const handleEdit = (c: Cliente) => {
    setEditingId(c.id);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setCpf(c.cpf);
    setAddress(c.address);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este cliente?")) return;
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchClientes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.cpf.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Sub-tab Selection Menu (Only visible if not picking a client for budget/OS/etc) */}
      {!isPicker && (
        <div className="flex bg-white p-1 rounded-xl border border-slate-150 shadow-sm gap-1 max-w-sm">
          <button
            type="button"
            onClick={() => setActiveSubTab("cadastro")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeSubTab === "cadastro"
                ? "bg-[#1E88E5] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Cadastros
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("historico")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeSubTab === "historico"
                ? "bg-[#1E88E5] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            Histórico & Garantia
          </button>
        </div>
      )}

      {activeSubTab === "historico" && !isPicker ? (
        <ClienteHistorico onPrintReceipt={onPrintReceipt} />
      ) : (
        <>
          {/* Title / Action Header */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isPicker ? "Selecionar Cliente" : "Cadastro de Clientes"}
              </h2>
              <p className="text-slate-500 text-xs">Total de {clientes.length} clientes ativos</p>
            </div>
            {!showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 bg-[#1E88E5] hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition"
              >
                <UserPlus className="w-4 h-4" />
                Novo Cliente
              </button>
            )}
          </div>

          {/* Form Card */}
          {showForm && (
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm animate-fade-in space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-[#1E88E5]">
                  {editingId ? "Editar Cliente" : "Cadastrar Novo Cliente"}
                </h3>
                <button type="button" onClick={resetForm} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria dos Santos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Telefone (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(11) 98888-7777"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="123.456.789-00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: cliente@email.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Rua, Número, Bairro, Cidade"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs transition"
                >
                  {editingId ? "Salvar Alterações" : "Salvar Cliente"}
                </button>
              </div>
            </form>
          )}

          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por Nome, Telefone ou CPF..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Clientes List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum cliente cadastrado ou encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition gap-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{c.name}</span>
                        {c.cpf && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            CPF: {c.cpf}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {c.email}
                          </span>
                        )}
                        {c.address && (
                          <span className="flex items-center gap-1 w-full mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="truncate max-w-sm">{c.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPicker ? (
                        <button
                          type="button"
                          onClick={() => onSelect && onSelect(c)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Selecionar
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
