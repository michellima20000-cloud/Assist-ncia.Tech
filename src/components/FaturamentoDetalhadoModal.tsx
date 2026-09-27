import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  ShoppingBag,
  Wrench,
  Search,
  Printer,
  RefreshCw,
  DollarSign,
  CreditCard,
  QrCode,
  Calendar,
  Clock,
  ArrowUpRight,
  TrendingUp,
  User,
  Phone,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Package,
  Layers,
  ExternalLink
} from 'lucide-react';
import { Venda, Atendimento, Cliente, Pagamento } from '../types';

interface FaturamentoDetalhadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt?: (title: string, content: string) => void;
  onNavigateToAdminReports?: () => void;
}

interface UnifiedTransaction {
  id: string;
  type: 'venda' | 'os';
  timestamp: string;
  dateObj: Date;
  timeFormatted: string;
  totalAmount: number;
  paymentMethod: string;
  paymentLabel: string;
  clientName: string;
  clientPhone?: string;
  controlNumber?: string;
  title: string;
  subtitle: string;
  itemsList: Array<{ name: string; quantity: number; price: number }>;
  notes?: string;
  rawVenda?: Venda;
  rawAtendimento?: Atendimento;
}

export const FaturamentoDetalhadoModal: React.FC<FaturamentoDetalhadoModalProps> = ({
  isOpen,
  onClose,
  onPrintReceipt,
  onNavigateToAdminReports
}) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vendas' | 'os'>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [closedOrders, setClosedOrders] = useState<Atendimento[]>([]);
  const [payments, setPayments] = useState<Pagamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const offset = new Date().getTimezoneOffset();

      const [resReport, resClientes] = await Promise.all([
        fetch(`/api/reports?type=daily&date=${todayStr}&offset=${offset}`),
        fetch('/api/clientes')
      ]);

      if (resReport.ok) {
        const data = await resReport.json();
        setVendas(Array.isArray(data.vendas) ? data.vendas : []);
        setClosedOrders(Array.isArray(data.closedOrders) ? data.closedOrders : []);
        setPayments(Array.isArray(data.payments) ? data.payments : []);
        setSummaryData(data.summary || null);
      }

      if (resClientes.ok) {
        const cliData = await resClientes.json();
        setClientes(Array.isArray(cliData) ? cliData : []);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhamento de faturamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDailyData();
      setSearchTerm('');
      setFilterType('all');
      setExpandedItems({});
    }
  }, [isOpen]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach(c => map.set(c.id, c));
    return map;
  }, [clientes]);

  const formatPaymentLabel = (method?: string): string => {
    switch (method?.toLowerCase()) {
      case 'pix':
        return 'PIX';
      case 'cash':
        return 'Dinheiro';
      case 'debit':
        return 'Débito';
      case 'credit':
        return 'Crédito';
      case 'misto':
      case 'split':
        return 'Misto';
      default:
        return method ? method.toUpperCase() : 'Não informado';
    }
  };

  // Build unified transactions list
  const transactions: UnifiedTransaction[] = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    // Map payments to OS if available
    const osPaymentMap = new Map<string, Pagamento>();
    payments.forEach(p => {
      if (p.atendimentoId) {
        osPaymentMap.set(p.atendimentoId, p);
      }
    });

    // 1. Process Vendas de Balcão
    vendas.forEach(v => {
      const dateObj = v.date ? new Date(v.date) : new Date();
      const timeFormatted = isNaN(dateObj.getTime())
        ? '--:--'
        : `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

      const itemsList = (v.items || []).map(item => ({
        name: item.name || 'Produto',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0
      }));

      list.push({
        id: `venda-${v.id}`,
        type: 'venda',
        timestamp: v.date,
        dateObj,
        timeFormatted,
        totalAmount: Number(v.totalAmount) || 0,
        paymentMethod: v.method,
        paymentLabel: formatPaymentLabel(v.method),
        clientName: v.clienteName || 'Consumidor Final',
        title: `Venda de Balcão #${v.id.substring(v.id.length - 4)}`,
        subtitle: `${itemsList.length} ${itemsList.length === 1 ? 'item' : 'itens'} • Vendedor: ${v.sellerName || 'Balcão'}`,
        itemsList,
        notes: v.observations,
        rawVenda: v
      });
    });

    // 2. Process Completed Service Orders (OS)
    closedOrders.forEach(os => {
      const dateStr = os.exitDate || os.entryDate || '';
      const dateObj = dateStr ? new Date(dateStr) : new Date();
      const timeFormatted = isNaN(dateObj.getTime())
        ? '--:--'
        : `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

      const client = os.clienteId ? clientMap.get(os.clienteId) : null;
      const clientName = client?.name || 'Cliente';
      const clientPhone = client?.phone || '';

      const matchedPay = osPaymentMap.get(os.id);
      const paymentMethod = matchedPay?.method || 'Dinheiro';

      const itemsList: Array<{ name: string; quantity: number; price: number }> = [];
      (os.services || []).forEach(s => {
        itemsList.push({
          name: `Serviço: ${s.name}`,
          quantity: 1,
          price: Number(s.price) || 0
        });
      });
      (os.products || []).forEach(p => {
        itemsList.push({
          name: `Peça: ${p.name}`,
          quantity: Number(p.quantity) || 1,
          price: Number(p.price) || 0
        });
      });

      list.push({
        id: `os-${os.id}`,
        type: 'os',
        timestamp: dateStr,
        dateObj,
        timeFormatted,
        totalAmount: Number(os.totalAmount) || 0,
        paymentMethod,
        paymentLabel: formatPaymentLabel(paymentMethod),
        clientName,
        clientPhone,
        controlNumber: os.controlNumber,
        title: `Ordem de Serviço ${os.controlNumber || ''}`,
        subtitle: `${os.item} ${os.brand} ${os.model}`.trim() || 'Aparelho',
        itemsList,
        notes: os.notesFin,
        rawAtendimento: os
      });
    });

    // Sort descending by time (most recent first)
    list.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    return list;
  }, [vendas, closedOrders, payments, clientMap]);

  // Totals calculations
  const totalFaturado = useMemo(() => {
    return transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  }, [transactions]);

  const totalVendas = useMemo(() => {
    return transactions.filter(t => t.type === 'venda').reduce((acc, t) => acc + t.totalAmount, 0);
  }, [transactions]);

  const countVendas = useMemo(() => {
    return transactions.filter(t => t.type === 'venda').length;
  }, [transactions]);

  const totalOS = useMemo(() => {
    return transactions.filter(t => t.type === 'os').reduce((acc, t) => acc + t.totalAmount, 0);
  }, [transactions]);

  const countOS = useMemo(() => {
    return transactions.filter(t => t.type === 'os').length;
  }, [transactions]);

  // Breakdown by payment method
  const paymentTotals = useMemo(() => {
    const totals: Record<string, number> = {
      cash: 0,
      pix: 0,
      debit: 0,
      credit: 0,
      other: 0
    };

    payments.forEach(p => {
      const amt = Number(p.totalAmount) || 0;
      if (p.splitPayments) {
        totals.cash += Number(p.splitPayments.cash) || 0;
        totals.pix += Number(p.splitPayments.pix) || 0;
        totals.debit += Number(p.splitPayments.debit) || 0;
        totals.credit += Number(p.splitPayments.credit) || 0;
      } else {
        const m = (p.method || 'cash').toLowerCase();
        if (m === 'cash' || m === 'dinheiro') totals.cash += amt;
        else if (m === 'pix') totals.pix += amt;
        else if (m === 'debit' || m === 'debito') totals.debit += amt;
        else if (m === 'credit' || m === 'credito') totals.credit += amt;
        else totals.other += amt;
      }
    });

    return totals;
  }, [payments]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (!searchTerm) return true;

      const q = searchTerm.toLowerCase();
      const matchClient = t.clientName.toLowerCase().includes(q);
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchSubtitle = t.subtitle.toLowerCase().includes(q);
      const matchOS = t.controlNumber ? t.controlNumber.toLowerCase().includes(q) : false;
      const matchMethod = t.paymentLabel.toLowerCase().includes(q);
      const matchItems = t.itemsList.some(i => i.name.toLowerCase().includes(q));

      return matchClient || matchTitle || matchSubtitle || matchOS || matchMethod || matchItems;
    });
  }, [transactions, filterType, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Print single transaction receipt
  const handlePrintTransaction = (t: UnifiedTransaction) => {
    if (!onPrintReceipt) return;

    if (t.type === 'venda' && t.rawVenda) {
      const v = t.rawVenda;
      const receiptStr = `CUPOM DE VENDA
VENDA: #${v.id.substring(v.id.length - 6)}
DATA/HORA: ${new Date(v.date).toLocaleString('pt-BR')}
CLIENTE: ${v.clienteName || 'Consumidor Final'}
VENDEDOR: ${v.sellerName || 'Balcão'}
--------------------------------
ITENS VENDIDOS:
${(v.items || []).map(i => `- ${i.name} (x${i.quantity}): R$ ${(i.price * i.quantity).toFixed(2)}`).join('\n')}
--------------------------------
FORMA PAGAMENTO: ${formatPaymentLabel(v.method)}
TOTAL PAGO: R$ ${Number(v.totalAmount).toFixed(2)}
--------------------------------
${v.observations ? `OBS: ${v.observations}\n--------------------------------\n` : ''}Obrigado pela preferência!`;

      onPrintReceipt(`Cupom da Venda #${v.id.substring(v.id.length - 4)}`, receiptStr);
    } else if (t.type === 'os' && t.rawAtendimento) {
      const os = t.rawAtendimento;
      const receiptStr = `CUPOM DE SAIDA - ORDEM DE SERVICO
CONTROLE: ${os.controlNumber}
FINALIZADO: ${new Date(os.exitDate || os.entryDate).toLocaleString('pt-BR')}
CLIENTE: ${t.clientName}
${t.clientPhone ? `FONE: ${t.clientPhone}\n` : ''}--------------------------------
APARELHO: ${os.item} ${os.brand} ${os.model}
--------------------------------
SERVICOS REALIZADOS:
${(os.services || []).map(s => `- ${s.name}: R$ ${Number(s.price).toFixed(2)}`).join('\n')}
${(os.products || []).length > 0 ? `PECAS TROCADAS:\n${(os.products || []).map(p => `- ${p.name} (x${p.quantity}): R$ ${(Number(p.price) * Number(p.quantity)).toFixed(2)}`).join('\n')}\n` : ''}--------------------------------
TOTAL PAGO: R$ ${Number(os.totalAmount).toFixed(2)}
FORMA DE PAGAMENTO: ${t.paymentLabel}
--------------------------------
GARANTIA: ${os.garantia || 'Garantia de 90 dias (3 meses)'}`;

      onPrintReceipt(`Comprovante ${os.controlNumber}`, receiptStr);
    }
  };

  // Print full daily summary
  const handlePrintDailySummary = () => {
    if (!onPrintReceipt) return;

    const todayBR = new Date().toLocaleDateString('pt-BR');
    const nowTimeBR = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let summaryStr = `RELATORIO DE FECHAMENTO DIARIO
DATA: ${todayBR} as ${nowTimeBR}
================================
FATURAMENTO TOTAL: R$ ${totalFaturado.toFixed(2)}
--------------------------------
RESUMO POR CATEGORIA:
- Vendas Balcão (${countVendas}): R$ ${totalVendas.toFixed(2)}
- Ordens de Serviço (${countOS}): R$ ${totalOS.toFixed(2)}
--------------------------------
POR FORMA DE PAGAMENTO:
- Dinheiro: R$ ${paymentTotals.cash.toFixed(2)}
- PIX: R$ ${paymentTotals.pix.toFixed(2)}
- Cartão Débito: R$ ${paymentTotals.debit.toFixed(2)}
- Cartão Crédito: R$ ${paymentTotals.credit.toFixed(2)}
================================
DETALHAMENTO DOS LANCAMENTOS:
`;

    transactions.forEach((t, idx) => {
      summaryStr += `\n[${t.timeFormatted}] ${t.type === 'venda' ? 'VENDA' : t.controlNumber || 'OS'} - R$ ${t.totalAmount.toFixed(2)} (${t.paymentLabel})
  Cliente: ${t.clientName}
  ${t.subtitle}
  Itens: ${t.itemsList.map(i => `${i.name} (x${i.quantity})`).join(', ')}
`;
    });

    summaryStr += `\n================================
Emitido via Minha Assistência.Tech`;

    onPrintReceipt(`Fechamento do Dia ${todayBR}`, summaryStr);
  };

  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Detalhamento do Faturamento Diário
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 uppercase tracking-wide">
                  Hoje
                </span>
              </div>
              <p className="text-xs text-slate-500 capitalize truncate">
                {todayFormatted}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDailySummary}
              title="Imprimir extrato do dia"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Imprimir Fechamento
            </button>

            <button
              onClick={fetchDailyData}
              disabled={loading}
              title="Atualizar lançamentos"
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

        {/* SUMMARY METRICS BAR */}
        <div className="bg-slate-100/70 border-b border-slate-200/80 p-4 sm:p-5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Total Faturado */}
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Faturado Hoje
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  R$ {totalFaturado.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {transactions.length} transações finalizadas
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Vendas Diretas de Balcão */}
            <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Vendas de Balcão
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-600 font-mono">
                  R$ {totalVendas.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {countVendas} {countVendas === 1 ? 'venda registrada' : 'vendas registradas'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            {/* Ordens de Serviço */}
            <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ordens de Serviço (OS)
                </span>
                <span className="text-lg sm:text-xl font-black text-purple-600 font-mono">
                  R$ {totalOS.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {countOS} {countOS === 1 ? 'aparelho entregue' : 'aparelhos entregues'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Formas de pagamento chips */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-600 font-medium scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Recebimentos:
            </span>
            <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Dinheiro:</span>
              <strong className="text-slate-800 font-mono">R$ {paymentTotals.cash.toFixed(2)}</strong>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>PIX:</span>
              <strong className="text-slate-800 font-mono">R$ {paymentTotals.pix.toFixed(2)}</strong>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Débito:</span>
              <strong className="text-slate-800 font-mono">R$ {paymentTotals.debit.toFixed(2)}</strong>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Crédito:</span>
              <strong className="text-slate-800 font-mono">R$ {paymentTotals.credit.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* CONTROLS (TABS & SEARCH) */}
        <div className="bg-white px-6 py-3 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filterType === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('vendas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filterType === 'vendas'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Vendas Balcão ({countVendas})
            </button>
            <button
              onClick={() => setFilterType('os')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filterType === 'os'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Ordens de Serviço ({countOS})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, OS, produto..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Carregando detalhes do faturamento...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <Package className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Nenhum lançamento encontrado</p>
              <p className="text-xs text-slate-400 max-w-sm">
                {searchTerm
                  ? 'Nenhum resultado corresponde à sua pesquisa. Tente buscar por outro termo.'
                  : 'Nenhuma venda ou ordem de serviço foi finalizada hoje ainda.'}
              </p>
            </div>
          ) : (
            filteredTransactions.map(t => {
              const isExpanded = !!expandedItems[t.id];

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition overflow-hidden"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left: icon, title, client */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          t.type === 'venda'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}
                      >
                        {t.type === 'venda' ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : (
                          <Wrench className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 tracking-tight">
                            {t.title}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              t.type === 'venda'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {t.type === 'venda' ? 'Venda Balcão' : 'Ordem de Serviço'}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Clock className="w-3 h-3" />
                            {t.timeFormatted}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-600 mt-0.5 truncate">
                          {t.subtitle}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Cliente: <strong className="text-slate-700">{t.clientName}</strong>
                          </span>
                          {t.clientPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {t.clientPhone}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {t.paymentLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: amount and actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          Valor Pago
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-600 font-mono">
                          R$ {t.totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePrintTransaction(t)}
                          title="Imprimir comprovante"
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleExpand(t.id)}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              Ocultar <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Detalhes <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable items breakdown */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 animate-fade-in text-xs space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Itens discriminados / Composição do valor:
                      </p>

                      <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                        {t.itemsList.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="font-medium text-slate-700">
                              {item.name}
                              {item.quantity > 1 && (
                                <span className="text-slate-400 font-normal ml-1">
                                  (x{item.quantity})
                                </span>
                              )}
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {t.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-2">
                          <strong>Observações:</strong> {t.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="text-slate-500 text-center sm:text-left">
            Exibindo <strong>{filteredTransactions.length}</strong> de <strong>{transactions.length}</strong> transações do dia de hoje.
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToAdminReports && (
              <button
                onClick={onNavigateToAdminReports}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition cursor-pointer"
              >
                Abrir Relatórios Completos <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

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
export default FaturamentoDetalhadoModal;
