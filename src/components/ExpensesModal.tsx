import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Trash2, Calendar, DollarSign, Tag, TrendingDown, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Despesa } from '../types';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseSaved?: () => void;
  initialTodayTotal?: number;
}

const QUICK_PRESETS = [
  { label: '🔄 Devolução de Fone', desc: 'Devolução / Troca de Fone de Ouvido' },
  { label: '📦 Devolução de Mercadoria', desc: 'Devolução de Mercadoria / Capa / Acessório' },
  { label: '💸 Sangria de Caixa', desc: 'Sangria de Caixa / Retirada' },
  { label: '📱 Compra de Módulo / Tela', desc: 'Compra de Peça: Módulo Frontal' },
  { label: '🔋 Bateria / Conector', desc: 'Compra de Peça: Bateria / Conector Carga' },
  { label: '🛠️ Insumos / Cola / Fita', desc: 'Insumos de Bancada (Cola B7000 / Fita)' },
  { label: '💡 Contas / Aluguel', desc: 'Despesa Fixa: Água / Luz / Internet' }
];

export const ExpensesModal: React.FC<ExpensesModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
  initialTodayTotal = 0
}) => {
  const [expenses, setExpenses] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('today');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE'));

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/despesas');
      if (res.ok) {
        const data = await res.json();
        const list: Despesa[] = Array.isArray(data) ? data : [];
        list.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        setExpenses(list);
      }
    } catch (err) {
      console.error('Erro ao buscar despesas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExpenses();
      setDate(new Date().toLocaleDateString('sv-SE'));
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('sv-SE');

  const isTodayDate = (dateVal?: string) => {
    if (!dateVal) return false;
    const str = String(dateVal).trim();
    return str === todayStr || str.substring(0, 10) === todayStr;
  };

  const todayExpenses = expenses.filter(e => isTodayDate(e.date));
  const todayTotal = todayExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const allTotal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const displayedExpenses = filterMode === 'today' ? todayExpenses : expenses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = description.trim();
    const numAmount = parseFloat(amount.replace(',', '.'));

    if (!cleanDesc) {
      setFeedbackMsg({ type: 'error', text: 'Informe a descrição ou motivo da saída.' });
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Informe um valor válido maior que zero.' });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: cleanDesc,
          amount: numAmount,
          date: date || todayStr
        })
      });

      if (res.ok) {
        setDescription('');
        setAmount('');
        setFeedbackMsg({ type: 'success', text: `Saída de R$ ${numAmount.toFixed(2)} lançada com sucesso!` });
        await fetchExpenses();
        if (onExpenseSaved) {
          onExpenseSaved();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedbackMsg({ type: 'error', text: errData.error || 'Erro ao lançar despesa no sistema.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro de comunicação ao salvar saída.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, desc: string, amt: number) => {
    if (!window.confirm(`Tem certeza que deseja remover a saída "${desc}" no valor de R$ ${(Number(amt) || 0).toFixed(2)}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/despesas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        setFeedbackMsg({ type: 'success', text: 'Despesa removida com sucesso.' });
        if (onExpenseSaved) {
          onExpenseSaved();
        }
      } else {
        alert('Erro ao excluir despesa.');
      }
    } catch (err) {
      alert('Erro de conexão ao excluir despesa.');
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '--/--/----';
    const clean = String(dateStr).trim();
    if (clean.includes('-') && clean.length >= 10) {
      const parts = clean.substring(0, 10).split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    try {
      return new Date(clean).toLocaleDateString('pt-BR');
    } catch {
      return clean;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">
                Lançar Despesas & Saídas de Caixa
              </h2>
              <p className="text-[11px] text-red-100 font-medium">
                Controle diário de sangrias, compras de peças, estornos e custos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-red-100 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Saídas Hoje ({todayExpenses.length})
              </span>
              <p className="text-xl sm:text-2xl font-black text-red-600 font-mono mt-1">
                R$ {todayTotal.toFixed(2)}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1">
                ✓ Sincronizado no caixa
              </span>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Geral Registrado ({expenses.length})
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-1">
                R$ {allTotal.toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-1">
                Histórico completo
              </span>
            </div>
          </div>

          {/* Feedback Message */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Atalhos Rápidos de Lançamento:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDescription(preset.desc)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expense Input Form */}
          <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-red-600" />
              Registrar Nova Saída de Caixa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Description */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Descrição / Motivo da Saída *
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Devolução de Fone / Módulo Moto G53"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Valor (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-red-600 font-bold text-xs sm:text-sm pointer-events-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-red-600 text-xs sm:text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Data
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-200 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Lançando...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Lançar Saída no Caixa</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* List of Registered Expenses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMode('today')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterMode === 'today'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Saídas de Hoje ({todayExpenses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todas ({expenses.length})
                </button>
              </div>

              <button
                type="button"
                onClick={fetchExpenses}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
                title="Atualizar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-[11px] font-medium">Atualizar</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                <span>Carregando despesas...</span>
              </div>
            ) : displayedExpenses.length === 0 ? (
              <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                <TrendingDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">
                  {filterMode === 'today' ? 'Nenhuma despesa lançada hoje.' : 'Nenhuma despesa cadastrada.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Utilize o formulário acima para registrar custos, compras ou estornos.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {displayedExpenses.map((exp) => {
                  const numAmt = Number(exp.amount) || 0;
                  const isToday = isTodayDate(exp.date);
                  return (
                    <div
                      key={exp.id}
                      className="p-3 bg-white hover:bg-red-50/30 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                            {exp.description}
                          </p>
                          {isToday && (
                            <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded-full uppercase shrink-0">
                              Hoje
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatDateDisplay(exp.date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs sm:text-sm font-black font-mono text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                          - R$ {numAmt.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id, exp.description, numAmt)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Excluir saída"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            💡 As saídas abatem diretamente do faturamento líquido no Fechamento de Caixa.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
