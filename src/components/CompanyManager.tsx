import React, { useState, useEffect } from "react";
import {
  Building2, Plus, Users, Shield, ArrowRight, RefreshCw, CheckCircle2,
  Search, ExternalLink, Edit3, Trash2, X, Store, Check, AlertCircle, Eye
} from "lucide-react";
import { Company, User } from "../types";

interface CompanyManagerProps {
  currentUser: User;
  activeCompanyId: string;
  onSelectCompany: (company: Company) => void;
  onClose?: () => void;
}

export default function CompanyManager({
  currentUser,
  activeCompanyId,
  onSelectCompany,
  onClose
}: CompanyManagerProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"companies" | "users">("companies");

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formName, setFormName] = useState("");
  const [formOwnerEmail, setFormOwnerEmail] = useState("");
  const [formOwnerName, setFormOwnerName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      const [resComp, resUsers] = await Promise.all([
        fetch("/api/system/companies"),
        fetch("/api/system/users")
      ]);

      if (resComp.ok) {
        const compData = await resComp.json();
        setCompanies(Array.isArray(compData) ? compData : []);
      }
      if (resUsers.ok) {
        const userData = await resUsers.json();
        setAllUsers(Array.isArray(userData) ? userData : []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do sistema:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormName("");
    setFormOwnerEmail("");
    setFormOwnerName("");
    setFormPhone("");
    setFormCnpj("");
    setFormAddress("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setFormName(comp.name);
    setFormOwnerEmail(comp.ownerEmail || "");
    setFormOwnerName(comp.ownerName || "");
    setFormPhone(comp.phone || "");
    setFormCnpj(comp.cnpj || "");
    setFormAddress(comp.address || "");
    setIsModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedbackMsg({ type: "error", text: "O nome da loja/assistência é obrigatório." });
      return;
    }

    setSaving(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        name: formName.trim(),
        ownerEmail: formOwnerEmail.trim().toLowerCase(),
        ownerName: formOwnerName.trim(),
        phone: formPhone.trim(),
        cnpj: formCnpj.trim(),
        address: formAddress.trim()
      };

      let res: Response;
      if (editingCompany) {
        res = await fetch(`/api/system/companies/${editingCompany.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/system/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Erro ao salvar loja.");
      }

      setFeedbackMsg({
        type: "success",
        text: editingCompany ? "Loja atualizada com sucesso!" : "Nova loja criada com banco de dados isolado!"
      });
      setIsModalOpen(false);
      await fetchSystemData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Falha na comunicação com o servidor." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (comp: Company) => {
    if (comp.id === "comp-principal") {
      alert("A empresa principal do sistema não pode ser excluída.");
      return;
    }
    const conf = window.confirm(`Atenção: Tem certeza que deseja excluir a loja "${comp.name}"? Essa ação removerá o acesso dos seus usuários.`);
    if (!conf) return;

    try {
      const res = await fetch(`/api/system/companies/${comp.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSystemData();
      } else {
        const err = await res.json();
        alert(err.error || "Não foi possível excluir.");
      }
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const filteredCompanies = companies.filter(c =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.ownerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.ownerName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.companyName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-lg border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SuperAdmin Master
                </span>
                <span className="text-xs text-slate-400">Ambiente Multi-Empresas</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                Administração Geral do Sistema
              </h1>
              <p className="text-sm text-slate-300 mt-0.5">
                Gerencie todas as lojas, assistências técnicas e usuários cadastrados com isolamento total de dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSystemData}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-sm font-medium border border-slate-700 flex items-center gap-2 transition"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-450 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Assistência / Loja</span>
            </button>
          </div>
        </div>

        {/* Global summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-xs text-slate-400 font-medium">Lojas Cadastradas</p>
            <p className="text-xl font-bold text-white mt-0.5">{companies.length}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-xs text-slate-400 font-medium">Usuários do Sistema</p>
            <p className="text-xl font-bold text-white mt-0.5">{allUsers.length}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-xs text-slate-400 font-medium">Sua Conta de Acesso</p>
            <p className="text-xs font-semibold text-amber-300 truncate mt-1">{currentUser.email}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <p className="text-xs text-slate-400 font-medium">Loja Ativa no Momento</p>
            <p className="text-xs font-bold text-blue-300 truncate mt-1">
              {companies.find(c => c.id === activeCompanyId)?.name || "Minha Assistência Principal"}
            </p>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          feedbackMsg.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="ml-auto p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === "companies"
                ? "bg-[#1E88E5] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Lojas & Assistências ({companies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === "users"
                ? "bg-[#1E88E5] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Todos Usuários ({allUsers.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Tab Content: Companies */}
      {activeTab === "companies" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((comp) => {
            const isActive = comp.id === activeCompanyId;
            return (
              <div
                key={comp.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
                  isActive
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                    : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600"
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {comp.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          ID: {comp.id}
                        </p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Ativa
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Responsável:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {comp.ownerName || comp.ownerEmail || "Não atribuído"}
                      </span>
                    </div>
                    {comp.ownerEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">E-mail de Login:</span>
                        <span className="font-mono text-slate-700 truncate max-w-[180px]">
                          {comp.ownerEmail}
                        </span>
                      </div>
                    )}
                    {comp.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Telefone:</span>
                        <span className="text-slate-700">{comp.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cadastrada em:</span>
                      <span className="text-slate-600">
                        {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString("pt-BR") : "Início"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(comp)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar informações"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {comp.id !== "comp-principal" && (
                      <button
                        onClick={() => handleDeleteCompany(comp)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Excluir Loja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectCompany(comp)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-900 hover:bg-blue-600 text-white shadow-sm"
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Loja Selecionada</span>
                      </>
                    ) : (
                      <>
                        <span>Acessar Loja</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredCompanies.length === 0 && !loading && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">Nenhuma loja encontrada</p>
              <p className="text-sm text-slate-400 mt-1">Crie uma nova loja para começar o isolamento de dados.</p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nova Loja
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: All Users */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nome do Usuário</th>
                  <th className="py-3.5 px-4">E-mail de Acesso</th>
                  <th className="py-3.5 px-4">Perfil / Nível</th>
                  <th className="py-3.5 px-4">Loja Vinculada</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSuperAdmin = u.role === "superadmin" || u.email === "michel.lima20000@gmail.com";
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {u.name || "Sem Nome"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        {isSuperAdmin ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs inline-flex items-center gap-1 border border-amber-200">
                            👑 Administrador do Sistema
                          </span>
                        ) : isAdmin ? (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-full text-xs inline-flex items-center gap-1 border border-blue-200">
                            🏢 Administrador da Loja
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full text-xs inline-flex items-center gap-1">
                            👷 Funcionário
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium">
                          {u.companyName || companies.find(c => c.id === u.companyId)?.name || "Assistência Principal"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          ID: {u.companyId || "comp-principal"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {u.companyId && (
                          <button
                            onClick={() => {
                              const foundComp = companies.find(c => c.id === u.companyId);
                              if (foundComp) onSelectCompany(foundComp);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                          >
                            <span>Ir para Loja</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Company */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg">
                  {editingCompany ? "Editar Assistência / Loja" : "Cadastrar Nova Assistência Técnica"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome da Assistência / Loja *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TecnoSmart Celulares, Loja Centro, etc."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    E-mail do Administrador da Loja
                  </label>
                  <input
                    type="email"
                    placeholder="admin.loja@gmail.com"
                    value={formOwnerEmail}
                    onChange={(e) => setFormOwnerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Quando este e-mail fizer login, ele cairá direto nesta loja com perfil de Administrador.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Roberto Silva"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    CNPJ / CPF
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={formCnpj}
                    onChange={(e) => setFormCnpj(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Endereço / Cidade
                </label>
                <input
                  type="text"
                  placeholder="Rua das Flores, 123 - Centro"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                ℹ️ <strong>Isolamento Automático:</strong> Esta nova loja receberá seu catálogo padrão pré-instalado (marcas, modelos e serviços) e seu próprio sequencial de Ordens de Serviço (iniciando em OS-0001), totalmente separado das demais lojas.
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingCompany ? "Salvar Alterações" : "Criar Loja"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
