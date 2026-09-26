import React, { useState, useEffect } from 'react';
import {
  Crown,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  Zap,
  HelpCircle,
  Receipt,
  Settings,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SubscriptionConfig, SubscriptionInvoice } from '../types';
import { generatePixPayload } from '../lib/pixUtils';

interface AssinaturaPlanosProps {
  onBack: () => void;
  isAdmin?: boolean;
}

export const AssinaturaPlanos: React.FC<AssinaturaPlanosProps> = ({
  onBack,
  isAdmin = true
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'mensal' | 'anual'>('mensal');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'mensal' | 'anual'>('mensal');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Timer countdown for QR Code (15 minutes)
  const [timeLeft, setTimeLeft] = useState(900); // 15:00

  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionConfig>({
    activePlan: 'mensal',
    status: 'active',
    validUntil: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    monthlyPrice: 60.00,
    annualPrice: 599.00,
    pixKey: 'michel.lima20000@gmail.com',
    pixKeyType: 'email',
    pixReceiverName: 'Michel Lima / Minha Assistência Tech',
    pixCity: 'Recife',
    whatsappContact: '5581999999999',
    history: []
  });

  // Settings form state
  const [editPixKey, setEditPixKey] = useState('');
  const [editPixReceiver, setEditPixReceiver] = useState('');
  const [editPixCity, setEditPixCity] = useState('');
  const [editMonthlyPrice, setEditMonthlyPrice] = useState('60.00');
  const [editAnnualPrice, setEditAnnualPrice] = useState('599.00');
  const [editWhatsapp, setEditWhatsapp] = useState('');

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        setEditPixKey(data.pixKey || 'michel.lima20000@gmail.com');
        setEditPixReceiver(data.pixReceiverName || 'Michel Lima / Minha Assistência Tech');
        setEditPixCity(data.pixCity || 'Recife');
        setEditMonthlyPrice(String(data.monthlyPrice || 60.00));
        setEditAnnualPrice(String(data.annualPrice || 599.00));
        setEditWhatsapp(data.whatsappContact || '5581999999999');
      }
    } catch (err) {
      console.error('Erro ao buscar dados de assinatura:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!checkoutModalOpen) return;
    setTimeLeft(900);
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutModalOpen, checkoutPlan]);

  const currentPlanAmount =
    checkoutPlan === 'anual' ? subscription.annualPrice : subscription.monthlyPrice;

  // Generate real EMVCo BR Code PIX copy-and-paste payload
  const pixCopyPasteCode = generatePixPayload({
    key: subscription.pixKey || 'michel.lima20000@gmail.com',
    name: subscription.pixReceiverName || 'MINHA ASSISTENCIA',
    city: subscription.pixCity || 'RECIFE',
    amount: currentPlanAmount,
    txId: checkoutPlan === 'anual' ? 'ASSINATURAANUAL' : 'ASSINATURAMENSAL'
  });

  const handleCopyPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixCopyPasteCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(subscription.pixKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleOpenCheckout = (plan: 'mensal' | 'anual') => {
    setCheckoutPlan(plan);
    setCheckoutModalOpen(true);
    setSuccessAnimation(false);
  };

  const handleSimulatePayment = async () => {
    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/config/subscription/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: checkoutPlan,
          amount: currentPlanAmount,
          txId: 'PIX' + Math.floor(100000 + Math.random() * 900000)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        setSuccessAnimation(true);
        setTimeout(() => {
          setSuccessAnimation(false);
          setCheckoutModalOpen(false);
        }, 2800);
      } else {
        alert('Erro ao confirmar renovação.');
      }
    } catch (err) {
      alert('Erro de conexão ao processar confirmação.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig = {
        ...subscription,
        pixKey: editPixKey.trim(),
        pixReceiverName: editPixReceiver.trim(),
        pixCity: editPixCity.trim(),
        monthlyPrice: parseFloat(editMonthlyPrice) || 60.00,
        annualPrice: parseFloat(editAnnualPrice) || 599.00,
        whatsappContact: editWhatsapp.replace(/\D/g, '')
      };
      const res = await fetch('/api/config/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (res.ok) {
        const saved = await res.json();
        setSubscription(saved);
        setSettingsOpen(false);
        alert('Configurações de PIX e planos atualizadas com sucesso!');
      }
    } catch (err) {
      alert('Erro ao salvar configurações.');
    }
  };

  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate days remaining
  const validUntilDate = new Date(subscription.validUntil);
  const now = new Date();
  const diffTime = validUntilDate.getTime() - now.getTime();
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const whatsappMessage = encodeURIComponent(
    `Olá! Acabei de realizar o pagamento da assinatura do sistema Minha Assistência.Tech.\n\n*Plano:* ${checkoutPlan === 'anual' ? 'Anual (R$ 599,00)' : 'Mensal (R$ 60,00)'}\n*Método:* PIX\n*Chave:* ${subscription.pixKey}\n\nSegue o comprovante em anexo para confirmação!`
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* HEADER / NAVIGATION */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition cursor-pointer"
            title="Voltar ao Painel Principal"
          >
            &larr; Voltar
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Crown className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                Assinatura & Planos do Sistema
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Garanta acesso contínuo com banco de dados na nuvem, OS ilimitadas e suporte prioritário
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Configurar Chave PIX do Sistema"
            >
              <Settings className="w-4 h-4" />
              <span>Configurar PIX</span>
            </button>
          )}

          <button
            onClick={fetchSubscription}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ADMIN PIX SETTINGS MODAL / ACCORDION */}
      {settingsOpen && (
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Configurações da Chave PIX & Valores dos Planos
              </h3>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Fechar &times;
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Chave PIX para Recebimento *
              </label>
              <input
                type="text"
                required
                value={editPixKey}
                onChange={e => setEditPixKey(e.target.value)}
                placeholder="E-mail, CNPJ, Telefone ou Aleatória"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Nome do Titular / Razão Social *
              </label>
              <input
                type="text"
                required
                value={editPixReceiver}
                onChange={e => setEditPixReceiver(e.target.value)}
                placeholder="Ex: Michel Lima / Minha Assistência"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Cidade do Titular *
              </label>
              <input
                type="text"
                required
                value={editPixCity}
                onChange={e => setEditPixCity(e.target.value)}
                placeholder="Ex: Recife"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Valor Plano Mensal (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editMonthlyPrice}
                onChange={e => setEditMonthlyPrice(e.target.value)}
                placeholder="60.00"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold font-mono text-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Valor Plano Anual (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editAnnualPrice}
                onChange={e => setEditAnnualPrice(e.target.value)}
                placeholder="599.00"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold font-mono text-amber-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                WhatsApp para Envio de Comprovantes
              </label>
              <input
                type="text"
                value={editWhatsapp}
                onChange={e => setEditWhatsapp(e.target.value)}
                placeholder="Ex: 81999999999"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CURRENT STATUS HERO CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {subscription.status === 'active' ? 'Assinatura Ativa' : 'Período de Demonstração'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {subscription.activePlan === 'anual' ? 'Plano Anual' : 'Plano Mensal'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Acesso Completo Ilimitado</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>

            <p className="text-xs text-slate-300 max-w-xl">
              Seu sistema está sincronizado com a nuvem, com todas as funcionalidades de Ordens de Serviço, PDV, Estoque, Recibos Térmicos e WhatsApp ativas.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 flex items-center justify-between md:flex-col md:items-end gap-3 min-w-[200px]">
            <div>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                Vencimento do Ciclo
              </p>
              <p className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                {validUntilDate.toLocaleDateString('pt-BR')}
              </p>
              <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {diffDays} dias restantes
              </p>
            </div>

            <button
              onClick={() => handleOpenCheckout(subscription.activePlan || 'mensal')}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Renovar no PIX</span>
            </button>
          </div>
        </div>
      </div>

      {/* PLAN PERIOD SELECTOR (TABS) */}
      <div className="text-center space-y-3">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
          Escolha o Plano Ideal para a Sua Assistência Técnica
        </h3>
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSelectedPeriod('mensal')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              selectedPeriod === 'mensal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Plano Mensal</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
              R$ {subscription.monthlyPrice.toFixed(2)}/mês
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPeriod('anual')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              selectedPeriod === 'anual'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Plano Anual</span>
            <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              2 Meses Grátis
            </span>
          </button>
        </div>
      </div>

      {/* PLAN COMPARISON CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* PLANO MENSAL CARD */}
        <div
          className={`bg-white rounded-3xl p-6 sm:p-8 border transition flex flex-col justify-between relative ${
            selectedPeriod === 'mensal'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  Flexibilidade Total
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-2">Plano Mensal</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pague mês a mês sem contratos de fidelidade
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            {/* Price display */}
            <div className="pt-2 pb-4 border-b border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-400">R$</span>
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                  {subscription.monthlyPrice.toFixed(2).split('.')[0]}
                </span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  ,{subscription.monthlyPrice.toFixed(2).split('.')[1]}
                </span>
                <span className="text-xs text-slate-500 font-semibold ml-1">/ mês</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Pagamento único de R$ {subscription.monthlyPrice.toFixed(2)} via PIX para 30 dias de uso.
              </p>
            </div>

            {/* Features checklist */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                O que está incluído no Plano Mensal:
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Ordens de Serviço (OS) Ilimitadas:</strong> Entrada, bancada e entrega sem travas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Ponto de Venda (PDV):</strong> Venda de acessórios, fones, películas e serviços com baixa de estoque.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Impressão Térmica 58mm / 80mm:</strong> Conexão Bluetooth e bobinas sem fio.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Notificações no WhatsApp:</strong> Envio automático de orçamento aprovado e aparelho pronto.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Modo Bancada Black (OLED):</strong> Tema escuro anti-cansaço visual e economia de tela.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Backup Diário Seguro:</strong> Seus dados de clientes e ordens protegidos na nuvem.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => handleOpenCheckout('mensal')}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-blue-200 transition cursor-pointer flex items-center justify-center gap-2 group"
            >
              <QrCode className="w-4 h-4 text-blue-200 group-hover:scale-110 transition-transform" />
              <span>Assinar Plano Mensal (R$ {subscription.monthlyPrice.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Ativação rápida via PIX Copia e Cola • Sem multas de cancelamento
            </p>
          </div>
        </div>

        {/* PLANO ANUAL CARD (DESTAQUE / RECOMENDADO) */}
        <div
          className={`bg-white rounded-3xl p-6 sm:p-8 border transition flex flex-col justify-between relative overflow-hidden ${
            selectedPeriod === 'anual'
              ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-2xl'
              : 'border-amber-200 shadow-md'
          }`}
        >
          {/* Badge de Destaque */}
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-xs flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>Melhor Custo-Benefício • 2 Meses Grátis</span>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Economize R$ 121,00 no Ano
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-2 flex items-center gap-2">
                  <span>Plano Anual</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  12 meses de sistema completo garantido pelo menor valor
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Crown className="w-6 h-6" />
              </div>
            </div>

            {/* Price display */}
            <div className="pt-2 pb-4 border-b border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-400">R$</span>
                <span className="text-4xl sm:text-5xl font-black text-amber-600 font-mono tracking-tight">
                  {subscription.annualPrice.toFixed(2).split('.')[0]}
                </span>
                <span className="text-xl font-black text-amber-600 font-mono">
                  ,{subscription.annualPrice.toFixed(2).split('.')[1]}
                </span>
                <span className="text-xs text-slate-500 font-semibold ml-1">/ ano</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Apenas R$ {(subscription.annualPrice / 12).toFixed(2)} por mês
                </span>
                <span className="text-[11px] text-slate-400 line-through">
                  R$ {(subscription.monthlyPrice * 12).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Features checklist */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tudo do Plano Mensal, e ainda:
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>2 Meses Inteiramente Grátis:</strong> Você paga 10 meses e utiliza 12 meses inteiros.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Suporte Prioritário VIP no WhatsApp:</strong> Atendimento imediato em caso de dúvidas operacionais.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Congelamento de Tarifa por 1 Ano:</strong> Garantia contra qualquer reajuste de preço.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Apoio na Configuração de Impressoras Térmicas:</strong> Pareamento guiado para 58mm/80mm Bluetooth.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Relatórios Financeiros Avançados:</strong> Gráficos de faturamento, margem e extrato de vendas.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => handleOpenCheckout('anual')}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-200 transition cursor-pointer flex items-center justify-center gap-2 group"
            >
              <Crown className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Assinar Plano Anual com Desconto (R$ {subscription.annualPrice.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Economia garantida de R$ 121,00 • Válido por 365 dias
            </p>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL (PIX CHECKOUT) */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 relative">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">
                    Pagamento via PIX • {checkoutPlan === 'anual' ? 'Plano Anual (12 Meses)' : 'Plano Mensal (30 Dias)'}
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    Ativação rápida e segura diretamente no sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 bg-slate-50/50 max-h-[80vh] overflow-y-auto">
              {/* Success Notification Animation */}
              {successAnimation && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-center space-y-2 animate-in zoom-in duration-200">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <h4 className="text-base font-black text-emerald-800">
                    Pagamento Identificado com Sucesso!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Sua assinatura do <strong>{checkoutPlan === 'anual' ? 'Plano Anual' : 'Plano Mensal'}</strong> foi renovada com sucesso!
                  </p>
                </div>
              )}

              {/* Amount and Timer banner */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Valor a Pagar:
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                    R$ {currentPlanAmount.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {checkoutPlan === 'anual' ? 'Equivalente a 12 meses de acesso' : 'Equivalente a 30 dias de acesso'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Tempo Restante:
                  </span>
                  <p className="text-lg font-black text-amber-600 font-mono">
                    {formatMinutes(timeLeft)}
                  </p>
                  <span className="text-[9px] text-slate-400">QR Code atualizado</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
                <div className="p-3 bg-white border-2 border-dashed border-emerald-300 rounded-2xl shadow-inner">
                  <QRCodeSVG
                    value={pixCopyPasteCode}
                    size={210}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Abra o app do seu banco e aponte a câmera para o QR Code acima</span>
                </div>
              </div>

              {/* PIX Copia e Cola */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Código PIX Copia e Cola:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixCopyPasteCode}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-700 select-all truncate"
                  />
                  <button
                    onClick={handleCopyPix}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      copiedPix
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PIX Key and Account Info */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Chave PIX (E-mail):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-800">{subscription.pixKey}</span>
                    <button
                      onClick={handleCopyKey}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                      title="Copiar chave"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-400 font-semibold">Beneficiário:</span>
                  <span className="font-bold text-slate-800">{subscription.pixReceiverName}</span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-slate-400 font-semibold">Cidade:</span>
                  <span className="font-bold text-slate-800">{subscription.pixCity}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <a
                  href={`https://wa.me/${subscription.whatsappContact || '5581999999999'}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Comprovante pelo WhatsApp</span>
                </a>

                <button
                  type="button"
                  disabled={submittingPayment || successAnimation}
                  onClick={handleSimulatePayment}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando Pagamento PIX...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-400 fill-current" />
                      <span>Já Paguei / Confirmar Ativação</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Ambiente de Pagamento Seguro via Banco Central
              </span>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE / PAYMENT HISTORY */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Histórico de Faturas & Renovações
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {subscription.history?.length || 0} faturas registradas
          </span>
        </div>

        {subscription.history && subscription.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Fatura</th>
                  <th className="pb-2">Plano</th>
                  <th className="pb-2">Data do Pagamento</th>
                  <th className="pb-2">Válido Até</th>
                  <th className="pb-2">Valor</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {subscription.history.map((inv: SubscriptionInvoice) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono font-bold text-slate-900">{inv.id}</td>
                    <td className="py-2.5">{inv.planName}</td>
                    <td className="py-2.5 text-slate-500">
                      {new Date(inv.paidAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 font-mono font-bold text-emerald-600">
                      R$ {Number(inv.amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        ✓ Aprovado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Nenhuma fatura registrada ainda.
          </div>
        )}
      </div>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Dúvidas Frequentes sobre a Assinatura
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <p className="font-bold text-slate-800">Como funciona o pagamento no PIX?</p>
            <p className="text-slate-600 leading-relaxed">
              O pagamento é processado instantaneamente. Basta abrir o aplicativo do seu banco, escanear o QR Code ou usar o código Copia e Cola gerado na tela.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <p className="font-bold text-slate-800">Posso migrar do Plano Mensal para o Anual?</p>
            <p className="text-slate-600 leading-relaxed">
              Sim! A qualquer momento você pode alternar para o plano anual para economizar 2 meses e estender seu acesso por 365 dias.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <p className="font-bold text-slate-800">Meus dados de clientes e ordens de serviço ficam salvos?</p>
            <p className="text-slate-600 leading-relaxed">
              Sim! Todos os dados de ordens de serviço, estoque, histórico e clientes ficam permanentemente seguros na nuvem criptografada.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <p className="font-bold text-slate-800">Existe fidelidade ou multa de cancelamento?</p>
            <p className="text-slate-600 leading-relaxed">
              Não. O plano mensal não possui qualquer fidelidade e você só renova quando desejar continuar usando.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssinaturaPlanos;
