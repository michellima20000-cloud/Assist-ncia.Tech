import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
  Phone,
  User,
  ArrowRight,
  PlusCircle,
  ExternalLink,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Hammer,
  DollarSign,
  Layers,
  History
} from 'lucide-react';
import { Atendimento, Cliente } from '../types';

interface AparelhosStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'na_assistencia' | 'entrega';
  onSelectAtendimento: (a: Atendimento, mode: 'atendimento' | 'saida') => void;
  onNewEntrada: () => void;
  onOpenFullAtendimentoScreen: (mode: 'atendimento' | 'saida') => void;
}

export const AparelhosStatusModal: React.FC<AparelhosStatusModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'na_assistencia',
  onSelectAtendimento,
  onNewEntrada,
  onOpenFullAtendimentoScreen
}) => {
  const [activeTab, setActiveTab] = useState<'na_assistencia' | 'entrega' | 'recent'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearch('');
      fetchData();
    }
  }, [isOpen, initialTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAt, resCli] = await Promise.all([
        fetch('/api/atendimentos'),
        fetch('/api/clientes')
      ]);

      if (resAt.ok) {
        const data = await resAt.json();
        setAtendimentos(Array.isArray(data) ? data : []);
      }
      if (resCli.ok) {
        const cliData = await resCli.json();
        setClientes(Array.isArray(cliData) ? cliData : []);
      }
    } catch (err) {
      console.error('Erro ao carregar aparelhos para o modal:', err);
    } finally {
      setLoading(false);
    }
  };

  const clientMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach(c => map.set(c.id, c));
    return map;
  }, [clientes]);

  // Filter lists by status
  const naAssistenciaList = useMemo(() => {
    return atendimentos.filter(a => a.status === 'na_assistencia');
  }, [atendimentos]);

  const entregaList = useMemo(() => {
    return atendimentos.filter(a => a.status === 'entrega');
  }, [atendimentos]);

  const recentList = useMemo(() => {
    // Last 15 finalized orders
    return atendimentos
      .filter(a => a.status === 'finalizado')
      .slice(0, 15);
  }, [atendimentos]);

  const currentList = useMemo(() => {
    if (activeTab === 'na_assistencia') return naAssistenciaList;
    if (activeTab === 'entrega') return entregaList;
    return recentList;
  }, [activeTab, naAssistenciaList, entregaList, recentList]);

  const filteredList = useMemo(() => {
    if (!search.trim()) return currentList;
    const q = search.toLowerCase().trim();

    return currentList.filter(a => {
      const client = a.clienteId ? clientMap.get(a.clienteId) : null;
      const clientName = (client?.name || '').toLowerCase();
      const clientPhone = (client?.phone || '').toLowerCase();
      const control = (a.controlNumber || '').toLowerCase();
      const item = (a.item || '').toLowerCase();
      const brand = (a.brand || '').toLowerCase();
      const model = (a.model || '').toLowerCase();
      const defeito = (a.defeito || '').toLowerCase();
      const detailed = (a.detailedStatus || '').toLowerCase();

      return (
        control.includes(q) ||
        clientName.includes(q) ||
        clientPhone.includes(q) ||
        item.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        defeito.includes(q) ||
        detailed.includes(q)
      );
    });
  }, [currentList, search, clientMap]);

  if (!isOpen) return null;

  const formatDateStr = (dateVal?: any): string => {
    if (!dateVal) return 'Data não informada';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                activeTab === 'na_assistencia'
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : activeTab === 'entrega'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              {activeTab === 'na_assistencia' ? (
                <Clock className="w-6 h-6" />
              ) : activeTab === 'entrega' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <History className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {activeTab === 'na_assistencia'
                    ? 'Aparelhos Na Assistência (Bancada)'
                    : activeTab === 'entrega'
                    ? 'Aparelhos Prontos para Entrega'
                    : 'Aparelhos Entregues Recentemente'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeTab === 'na_assistencia'
                      ? 'bg-amber-100 text-amber-800'
                      : activeTab === 'entrega'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {currentList.length} {currentList.length === 1 ? 'aparelho' : 'aparelhos'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {activeTab === 'na_assistencia'
                  ? 'Equipamentos atualmente em diagnóstico, orçamento ou manutenção na bancada'
                  : activeTab === 'entrega'
                  ? 'Equipamentos com serviço finalizado, prontos para pagamento e entrega ao cliente'
                  : 'Histórico dos últimos equipamentos que foram finalizados e retirados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              title="Atualizar lista"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              title="Fechar"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS & SEARCH BAR */}
        <div className="bg-white px-6 py-3 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('na_assistencia')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'na_assistencia'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Na Assistência ({naAssistenciaList.length})
            </button>

            <button
              onClick={() => setActiveTab('entrega')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'entrega'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Prontos / Entregas ({entregaList.length})
            </button>

            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'recent'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Finalizados Recentes
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por OS, cliente, modelo..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LIST CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Carregando aparelhos...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center max-w-lg mx-auto">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                  activeTab === 'na_assistencia'
                    ? 'bg-amber-50 text-amber-500'
                    : activeTab === 'entrega'
                    ? 'bg-emerald-50 text-emerald-500'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {activeTab === 'na_assistencia' ? (
                  <Clock className="w-7 h-7" />
                ) : activeTab === 'entrega' ? (
                  <CheckCircle className="w-7 h-7" />
                ) : (
                  <Smartphone className="w-7 h-7" />
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {search
                  ? 'Nenhum aparelho encontrado para essa busca'
                  : activeTab === 'na_assistencia'
                  ? 'Bancada Livre: Nenhum aparelho em manutenção no momento'
                  : activeTab === 'entrega'
                  ? 'Nenhum aparelho aguardando retirada'
                  : 'Nenhum aparelho finalizado encontrado'}
              </h3>

              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {search
                  ? 'Verifique se o número da OS ou nome do cliente está correto.'
                  : activeTab === 'na_assistencia'
                  ? 'Todos os serviços anteriores foram finalizados. Você pode registrar a entrada de um novo celular a qualquer momento!'
                  : activeTab === 'entrega'
                  ? 'Todos os aparelhos consertados já foram entregues aos clientes e baixados no caixa.'
                  : 'Nenhum histórico recente disponível.'}
              </p>

              {activeTab === 'na_assistencia' && (
                <button
                  onClick={() => {
                    onClose();
                    onNewEntrada();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Cadastrar Nova Entrada de Celular
                </button>
              )}
            </div>
          ) : (
            filteredList.map(a => {
              const client = a.clienteId ? clientMap.get(a.clienteId) : null;
              const clientName = client?.name || 'Cliente Desconhecido';
              const clientPhone = client?.phone || '';
              const isReady = a.status === 'entrega';
              const isFinal = a.status === 'finalizado';

              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Device & Client Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Thumbnail or Icon */}
                    {a.photoUrl ? (
                      <img
                        src={a.photoUrl}
                        alt="Aparelho"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isReady
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : isFinal
                            ? 'bg-slate-100 text-slate-500 border border-slate-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}
                      >
                        <Smartphone className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {a.controlNumber || 'OS'}
                        </span>

                        <h4 className="text-sm font-black text-slate-900 leading-snug">
                          {a.item || ''} {a.brand || ''} {a.model || ''}
                        </h4>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFinal
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.detailedStatus || (isReady ? 'Pronto para Retirada' : isFinal ? 'Entregue' : 'Em Manutenção')}
                        </span>
                      </div>

                      {/* Client Info */}
                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {clientName}
                        </span>

                        {clientPhone && (
                          <a
                            href={`https://wa.me/55${clientPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline"
                            title="Conversar no WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {clientPhone}
                          </a>
                        )}

                        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          Entrada: {formatDateStr(a.entryDate)}
                        </span>
                      </div>

                      {/* Defect / Problem reported */}
                      {a.defeito && (
                        <p className="text-xs text-slate-500">
                          <strong className="text-slate-700">Defeito:</strong> {a.defeito}
                        </p>
                      )}

                      {/* Services & Products Chips */}
                      {((a.services && a.services.length > 0) || (a.products && a.products.length > 0)) && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {(a.services || []).map((s, idx) => (
                            <span
                              key={`srv-${idx}`}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              🛠️ {s.name}
                            </span>
                          ))}
                          {(a.products || []).map((p, idx) => (
                            <span
                              key={`prod-${idx}`}
                              className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              📦 {p.name} (x{p.quantity})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Value & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Valor Total
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                        R$ {(Number(a.totalAmount) || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const mode = isReady ? 'saida' : 'atendimento';
                          onSelectAtendimento(a, mode);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                          isReady
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#1E88E5] hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isReady ? 'Finalizar Entrega' : 'Abrir OS'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="text-slate-500 text-center sm:text-left">
            Exibindo <strong>{filteredList.length}</strong> de <strong>{currentList.length}</strong> aparelhos em {activeTab === 'na_assistencia' ? 'manutenção' : activeTab === 'entrega' ? 'prontos para entrega' : 'histórico'}.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenFullAtendimentoScreen(activeTab === 'entrega' ? 'saida' : 'atendimento');
              }}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition cursor-pointer"
            >
              Abrir Tela Completa de Atendimentos <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default AparelhosStatusModal;
