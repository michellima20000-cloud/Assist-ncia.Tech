import React, { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2, ArrowLeft, Search, CheckCircle } from "lucide-react";
import { Agendamento, Cliente } from "../types";
import Clientes from "./Clientes";

interface AgendamentosProps {
  onBack: () => void;
}

export default function Agendamentos({ onBack }: AgendamentosProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form States
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(false);

  const fetchAgendamentos = async () => {
    try {
      const res = await fetch("/api/agendamentos");
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch("/api/clientes");
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
    fetchClientes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (!date || !time || !service) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      clienteId: selectedCliente.id,
      date,
      time,
      service,
      notes
    };

    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchAgendamentos();
        setShowAddForm(false);
        setSelectedCliente(null);
        setDate("");
        setTime("");
        setService("");
        setNotes("");
      } else {
        alert("Erro ao criar agendamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este agendamento?")) return;
    try {
      const res = await fetch(`/api/agendamentos/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAgendamentos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getClienteName = (id: string) => {
    const found = clientes.find(c => c.id === id);
    return found ? found.name : "Cliente desconhecido";
  };

  const getClientePhone = (id: string) => {
    const found = clientes.find(c => c.id === id);
    return found ? found.phone : "";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Agenda de Serviços</h2>
            <p className="text-slate-500 text-xs">Agende manutenções programadas</p>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-purple-700">Reservar Novo Horário</h3>
          
          <div className="space-y-3">
            {/* Cliente Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Cliente *</label>
              {selectedCliente ? (
                <div className="p-2.5 bg-purple-50/50 border border-purple-100 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{selectedCliente.name}</span>
                    <span className="text-slate-500 ml-2">({selectedCliente.phone})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCliente(null)}
                    className="text-xs text-red-500 hover:underline font-semibold"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowClientPicker(true)}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 transition"
                  >
                    Clique para selecionar ou cadastrar cliente...
                  </button>

                  {showClientPicker && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative">
                        <button
                          type="button"
                          onClick={() => setShowClientPicker(false)}
                          className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <div className="mt-2">
                          <Clientes
                            isPicker={true}
                            onSelect={(c) => {
                              setSelectedCliente(c);
                              setShowClientPicker(false);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Horário *</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Serviço Pretendido *</label>
              <input
                type="text"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="Ex: Troca de conector, reparo na placa"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Observações Internas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Avisou que quer vir de manhã"
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition"
            >
              Confirmar Agendamento
            </button>
          </div>
        </form>
      )}

      {/* Grid of Schedules */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        {agendamentos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhum agendamento futuro encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agendamentos.map((ag) => (
              <div key={ag.id} className="p-3 bg-purple-50/20 border border-purple-50 rounded-xl flex items-start justify-between gap-3 hover:border-purple-200 transition">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>{ag.date.split('-').reverse().join('/')}</span>
                    <Clock className="w-3.5 h-3.5 text-purple-600 ml-1.5" />
                    <span>{ag.time}</span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">{getClienteName(ag.clienteId)}</p>
                    <p className="text-[10px] text-slate-500">{getClientePhone(ag.clienteId)}</p>
                  </div>

                  <div className="p-1.5 bg-white/80 border border-purple-100/50 rounded-lg text-[11px]">
                    <p className="font-semibold text-purple-900">Serviço: {ag.service}</p>
                    {ag.notes && <p className="text-slate-600 mt-0.5 font-sans">Obs: {ag.notes}</p>}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(ag.id)}
                  className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Quick helper helper
import { X } from "lucide-react";
