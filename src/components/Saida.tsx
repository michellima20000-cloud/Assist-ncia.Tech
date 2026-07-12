import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Phone, 
  FileText, 
  Printer, 
  Check, 
  MessageSquare, 
  CreditCard, 
  Camera, 
  Pencil, 
  Plus, 
  Minus, 
  X, 
  Trash2, 
  ShoppingBag, 
  Lock, 
  Grid3X3, 
  Clock, 
  Activity, 
  QrCode 
} from "lucide-react";
import { Atendimento, Cliente, Servico, Produto, AtendimentoServico, AtendimentoProduto } from "../types";
import ProductScanner from "./ProductScanner";

interface SaidaProps {
  atendimento: Atendimento;
  onBack: () => void;
  onGoToPayment: (at: Atendimento, notesFin: string) => void;
  onPrintIntakeReceipt: (at: Atendimento, hideValues: boolean, clientObj?: Cliente | null) => void;
  onUpdateAtendimento?: (at: Atendimento) => void;
  flowMode?: "atendimento" | "saida";
}

const STATUS_OPTIONS = [
  "Aguardando técnico",
  "Em avaliação",
  "Aguardando aprovação do cliente",
  "Aprovado pelo cliente",
  "Reprovado pelo cliente",
  "Em manutenção",
  "Pronto para entrega",
  "Aguardando peça(s)",
  "Peça(s) na assistência",
  "Aguardando pagamento",
  "Sem conserto",
  "Não reclamado/Abandonado"
];

const DOT_COORDINATES: Record<number, { x: string; y: string }> = {
  1: { x: "16.6%", y: "16.6%" },
  2: { x: "50%", y: "16.6%" },
  3: { x: "83.3%", y: "16.6%" },
  4: { x: "16.6%", y: "50%" },
  5: { x: "50%", y: "50%" },
  6: { x: "83.3%", y: "50%" },
  7: { x: "16.6%", y: "83.3%" },
  8: { x: "50%", y: "83.3%" },
  9: { x: "83.3%", y: "83.3%" }
};

export default function Saida({ atendimento, onBack, onGoToPayment, onPrintIntakeReceipt, onUpdateAtendimento, flowMode }: SaidaProps) {
  const [client, setClient] = useState<Cliente | null>(null);
  const [notesFin, setNotesFin] = useState(atendimento.notesFin || "");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedbackConfig, setFeedbackConfig] = useState<any>(null);
  
  // Feedback scheduling tracking
  const [relatedFeedback, setRelatedFeedback] = useState<any>(null);
  const [isEditingFeedbackText, setIsEditingFeedbackText] = useState(false);
  const [feedbackTextVal, setFeedbackTextVal] = useState("");

  // Editable fields states
  const [isEditingObservations, setIsEditingObservations] = useState(false);
  const [obsVal, setObsVal] = useState(atendimento.observations || "");

  const [isEditingDefect, setIsEditingDefect] = useState(false);
  const [defectVal, setDefectVal] = useState(atendimento.defeito || "");

  const [isEditingSerial, setIsEditingSerial] = useState(false);
  const [serialVal, setSerialVal] = useState(atendimento.numeroSerie || "");

  const [isEditingNotesFin, setIsEditingNotesFin] = useState(false);
  const [notesFinVal, setNotesFinVal] = useState(atendimento.notesFin || "");

  const [isEditingSenha, setIsEditingSenha] = useState(false);
  const [senhaVal, setSenhaVal] = useState(atendimento.senhaDesbloqueio || "");

  const [isEditingTimestamps, setIsEditingTimestamps] = useState(false);
  const [inicioServico, setInicioServico] = useState(atendimento.inicioServico || "");
  const [fimServico, setFimServico] = useState(atendimento.fimServico || "");

  // Pattern unlock drawing state
  const [isEditingPattern, setIsEditingPattern] = useState(false);
  const [patternSeq, setPatternSeq] = useState<number[]>(
    atendimento.padraoDesbloqueio ? atendimento.padraoDesbloqueio.split(",").map(Number).filter(n => n >= 1 && n <= 9) : []
  );

  // Services and products manual edit modal
  const [showEditItemsModal, setShowEditItemsModal] = useState(false);
  const [allServices, setAllServices] = useState<Servico[]>([]);
  const [allProducts, setAllProducts] = useState<Produto[]>([]);
  const [modalServices, setModalServices] = useState<AtendimentoServico[]>([]);
  const [modalProducts, setModalProducts] = useState<AtendimentoProduto[]>([]);
  const [manualItemName, setManualItemName] = useState("");
  const [manualItemPrice, setManualItemPrice] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customPriceInputId, setCustomPriceInputId] = useState<string | null>(null);
  const [tempCustomPrice, setTempCustomPrice] = useState("");

  const [statuses, setStatuses] = useState<string[]>(STATUS_OPTIONS);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState("");

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/config/status");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStatuses(data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar status:", err);
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusInput.trim()) return;
    try {
      const res = await fetch("/api/config/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatusInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
        setNewStatusInput("");
        setIsAddingStatus(false);
      }
    } catch (err) {
      console.error("Erro ao adicionar status:", err);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clientes`);
        if (res.ok) {
          const list: Cliente[] = await res.json();
          const found = list.find(c => c.id === atendimento.clienteId);
          if (found) setClient(found);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config/feedback");
        if (res.ok) {
          const data = await res.json();
          setFeedbackConfig(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAllAssets = async () => {
      try {
        const [se, pr] = await Promise.all([
          fetch("/api/servicos").then(r => r.json()),
          fetch("/api/produtos").then(r => r.json())
        ]);
        setAllServices(se || []);
        setAllProducts(pr || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchFeedbackItem = async () => {
      try {
        const res = await fetch("/api/feedbacks");
        if (res.ok) {
          const list = await res.json();
          const found = list.find((fb: any) => fb.atendimentoId === atendimento.id);
          setRelatedFeedback(found || null);
          if (found) {
            setFeedbackTextVal(found.messageText || "");
          }
        }
      } catch (err) {
        console.error("Erro ao buscar feedback relacionado:", err);
      }
    };

    fetchClient();
    fetchConfig();
    fetchAllAssets();
    fetchFeedbackItem();
  }, [atendimento]);

  // Sync state values when backend atendimento object updates
  useEffect(() => {
    setObsVal(atendimento.observations || "");
    setDefectVal(atendimento.defeito || "");
    setSerialVal(atendimento.numeroSerie || "");
    setNotesFinVal(atendimento.notesFin || "");
    setSenhaVal(atendimento.senhaDesbloqueio || "");
    setInicioServico(atendimento.inicioServico || "");
    setFimServico(atendimento.fimServico || "");
    setPatternSeq(
      atendimento.padraoDesbloqueio ? atendimento.padraoDesbloqueio.split(",").map(Number).filter(n => n >= 1 && n <= 9) : []
    );
  }, [atendimento]);

  const getSafeDate = (dt: any): Date => {
    if (!dt) return new Date();
    if (dt instanceof Date) return dt;
    if (typeof dt === "string") {
      const parsed = new Date(dt);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    if (dt && typeof dt.toDate === "function") {
      try {
        return dt.toDate();
      } catch (e) {}
    }
    if (dt && typeof dt._seconds === "number") {
      return new Date(dt._seconds * 1000);
    }
    if (dt && typeof dt.seconds === "number") {
      return new Date(dt.seconds * 1000);
    }
    const parsedTime = Number(dt);
    if (!isNaN(parsedTime) && parsedTime > 0) {
      return new Date(parsedTime);
    }
    return new Date();
  };

  // Calculate permanência (elapsed time)
  const entryDate = getSafeDate(atendimento.entryDate);
  const now = new Date();
  const diffMs = now.getTime() - entryDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let durationString = "";
  if (diffDays > 0) {
    durationString = `${diffDays} dia(s) e ${diffHours % 24} hora(s)`;
  } else if (diffHours > 0) {
    durationString = `${diffHours} hora(s)`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    durationString = `${diffMinutes} minuto(s)`;
  }

  // Generate date & time labels
  const entryDateStr = entryDate.toLocaleDateString("pt-BR");
  const entryTimeStr = entryDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const exitDateObj = getSafeDate(atendimento.exitDate || now);
  const exitDateStr = exitDateObj.toLocaleDateString("pt-BR");
  const exitTimeStr = exitDateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const getFormattedMessage = (type: "entry" | "ready" | "feedback", customTemplate?: string, customAtendimento?: Atendimento) => {
    const activeAt = customAtendimento || atendimento;
    const clientName = client?.name || (activeAt as any).clientName || (activeAt as any).client?.name || "Cliente";
    
    let template = customTemplate;
    if (!template) {
      if (type === "entry") {
        template = feedbackConfig?.entryMessageTemplate || "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!";
      } else if (type === "ready") {
        template = feedbackConfig?.readyMessageTemplate || "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!";
      } else {
        template = feedbackConfig?.messageTemplate || "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇";
      }
    }
    
    return template
      .replace(/{cliente}/g, clientName)
      .replace(/{aparelho}/g, activeAt.item || "aparelho")
      .replace(/{marca}/g, activeAt.brand || "")
      .replace(/{modelo}/g, activeAt.model || "")
      .replace(/{numero_os}/g, activeAt.controlNumber || "")
      .replace(/{valor}/g, activeAt.totalAmount.toFixed(2));
  };

  const handleSendWhatsApp = (type: "entry" | "ready" | "feedback" = "ready", customText?: string) => {
    const clientPhone = client?.phone || (atendimento as any).clientPhone || (atendimento as any).client?.phone;
    if (!clientPhone) return;
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const text = customText || getFormattedMessage(type);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone;
    const url = `${baseUrl}?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleUpdateFeedbackStatus = async (id: string, status: "pending" | "sent" | "canceled") => {
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const resList = await fetch("/api/feedbacks");
        if (resList.ok) {
          const list = await resList.json();
          const found = list.find((fb: any) => fb.atendimentoId === atendimento.id);
          setRelatedFeedback(found || null);
          if (found) {
            setFeedbackTextVal(found.messageText || "");
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFeedbackMessage = async () => {
    if (!relatedFeedback) return;
    try {
      const res = await fetch(`/api/feedbacks/${relatedFeedback.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText: feedbackTextVal })
      });
      if (res.ok) {
        setIsEditingFeedbackText(false);
        const resList = await fetch("/api/feedbacks");
        if (resList.ok) {
          const list = await resList.json();
          const found = list.find((fb: any) => fb.atendimentoId === atendimento.id);
          setRelatedFeedback(found || null);
          if (found) {
            setFeedbackTextVal(found.messageText || "");
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to save any single field change to server
  const saveField = async (fieldName: string, value: any) => {
    try {
      const res = await fetch(`/api/atendimentos/${atendimento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: value })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onUpdateAtendimento) {
          onUpdateAtendimento(updated);
        }
      }
    } catch (err) {
      console.error("Erro ao salvar campo:", err);
    }
  };

  // Handle detailed status selection change
  const handleDetailedStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    // Map some main status keys if status triggers 'entrega'
    const parentStatus = (val === "Pronto para entrega" || val === "Aguardando pagamento") ? "entrega" : "na_assistencia";
    
    try {
      const res = await fetch(`/api/atendimentos/${atendimento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          detailedStatus: val,
          status: parentStatus
        })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onUpdateAtendimento) {
          onUpdateAtendimento(updated);
        }

        // Auto-trigger WhatsApp if marked as "Pronto para entrega"
        if (val === "Pronto para entrega" && client) {
          const cleanPhone = client.phone.replace(/\D/g, "");
          const text = getFormattedMessage(feedbackConfig?.readyMessageTemplate, updated);
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
          const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone;
          const url = `${baseUrl}?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
          window.open(url, "_blank");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pattern Grid drawing helper
  const handleDotClick = (num: number) => {
    if (!isEditingPattern) return;
    if (patternSeq.includes(num)) {
      // Remove it and subsequent ones
      const idx = patternSeq.indexOf(num);
      setPatternSeq(patternSeq.slice(0, idx));
    } else {
      setPatternSeq([...patternSeq, num]);
    }
  };

  const savePattern = async () => {
    await saveField("padraoDesbloqueio", patternSeq.join(","));
    setIsEditingPattern(false);
  };

  const clearPattern = () => {
    setPatternSeq([]);
  };

  // Calculate product totals safely
  const totalProductsPrice = (atendimento.products || []).reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  // Open & setup modal local lists safely
  const openEditItemsModal = () => {
    setModalServices([...(atendimento.services || [])]);
    setModalProducts([...(atendimento.products || [])]);
    setManualItemName("");
    setManualItemPrice("");
    setShowEditItemsModal(true);
  };

  const handleToggleService = (s: Servico) => {
    const existsIndex = modalServices.findIndex(item => item.serviceId === s.id);
    if (existsIndex > -1) {
      setModalServices(modalServices.filter(item => item.serviceId !== s.id));
    } else {
      if (s.isPriceCustom) {
        setCustomPriceInputId(s.id);
        setTempCustomPrice("");
      } else {
        setModalServices([...modalServices, { serviceId: s.id, name: s.name, price: s.price }]);
      }
    }
  };

  const handleApplyCustomPrice = (s: Servico) => {
    const price = Number(tempCustomPrice);
    if (isNaN(price) || price <= 0) {
      alert("Por favor, digite um valor válido.");
      return;
    }
    setModalServices([...modalServices, { serviceId: s.id, name: s.name, price }]);
    setCustomPriceInputId(null);
  };

  const handleToggleProduct = (p: Produto) => {
    const existsIndex = modalProducts.findIndex(item => item.productId === p.id);
    if (existsIndex > -1) {
      setModalProducts(modalProducts.filter(item => item.productId !== p.id));
    } else {
      setModalProducts([...modalProducts, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
    }
  };

  const handleUpdateProductQty = (productId: string, qty: number) => {
    if (qty < 1) return;
    setModalProducts(modalProducts.map(p => p.productId === productId ? { ...p, quantity: qty } : p));
  };

  const handleUpdateServiceField = (serviceId: string, field: string, value: any) => {
    setModalServices(modalServices.map(s => s.serviceId === serviceId ? { ...s, [field]: value } : s));
  };

  const handleUpdateProductField = (productId: string, field: string, value: any) => {
    setModalProducts(modalProducts.map(p => p.productId === productId ? { ...p, [field]: value } : p));
  };

  const handleAddManualService = () => {
    if (!manualItemName.trim()) return;
    const price = Number(manualItemPrice) || 0;
    const sId = "manual-" + Date.now();
    setModalServices([...modalServices, { serviceId: sId, name: manualItemName, price }]);
    setManualItemName("");
    setManualItemPrice("");
  };

  const handleAddManualProduct = () => {
    if (!manualItemName.trim()) return;
    const price = Number(manualItemPrice) || 0;
    const pId = "manual-" + Date.now();
    setModalProducts([...modalProducts, { productId: pId, name: manualItemName, price, quantity: 1 }]);
    setManualItemName("");
    setManualItemPrice("");
  };

  const handleScanSelectProduct = (p: Produto) => {
    const existsIndex = modalProducts.findIndex(item => item.productId === p.id);
    if (existsIndex > -1) {
      handleUpdateProductQty(p.id, modalProducts[existsIndex].quantity + 1);
    } else {
      setModalProducts([...modalProducts, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
    }
    setScannerOpen(false);
  };

  const handleSaveModalItems = async () => {
    const totalServices = modalServices.reduce((sum, s) => sum + s.price, 0);
    const totalProducts = modalProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalAmount = totalServices + totalProducts;

    try {
      const res = await fetch(`/api/atendimentos/${atendimento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: modalServices,
          products: modalProducts,
          totalAmount
        })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onUpdateAtendimento) {
          onUpdateAtendimento(updated);
        }
        setShowEditItemsModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {flowMode === "atendimento" ? "Ficha de Atendimento Técnico" : "Finalizar & Entregar Equipamento"}
            </h2>
            <p className="text-slate-500 text-xs">
              {flowMode === "atendimento" ? "Atualização técnica e laudo do aparelho na bancada" : "Revisão completa e checkout da Ordem de Serviço"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
        
        {/* Top Info Grid (Exact match to screenshot 2) */}
        <div className="grid grid-cols-2 border border-slate-200 rounded-xl overflow-hidden divide-x divide-y divide-slate-200 text-xs bg-slate-50/50">
          {/* Cell 1: Nº */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Nº</span>
            <span className="font-mono text-xs font-bold text-slate-800">{atendimento.controlNumber}</span>
          </div>
          {/* Cell 2: Permanência */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Permanência</span>
            <span className="text-xs font-bold text-[#1E88E5]">{durationString}</span>
          </div>
          {/* Cell 3: Data entrada */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Data entrada</span>
            <span className="text-xs font-semibold text-slate-700">{entryDateStr}</span>
          </div>
          {/* Cell 4: Hora entrada */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Hora entrada</span>
            <span className="text-xs font-semibold text-slate-700 font-mono">{entryTimeStr}</span>
          </div>
          {/* Cell 5: Data saída */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Data saída</span>
            <span className="text-xs font-semibold text-slate-700">{exitDateStr}</span>
          </div>
          {/* Cell 6: Hora saída */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Hora saída</span>
            <span className="text-xs font-semibold text-slate-700 font-mono">{exitTimeStr}</span>
          </div>
        </div>

        {/* Client Row (With call button) */}
        {(client || (atendimento as any).clientName || (atendimento as any).client?.name) && (
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Cliente</span>
              <p className="text-xs font-extrabold text-slate-800">
                {client?.name || (atendimento as any).clientName || (atendimento as any).client?.name || "Cliente Desconhecido"}
              </p>
              {(client?.cpf || (atendimento as any).clientCpf || (atendimento as any).client?.cpf) && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  CPF: {client?.cpf || (atendimento as any).clientCpf || (atendimento as any).client?.cpf}
                </span>
              )}
            </div>
            {(client?.phone || (atendimento as any).clientPhone || (atendimento as any).client?.phone) && (
              <a 
                href={`tel:${client?.phone || (atendimento as any).clientPhone || (atendimento as any).client?.phone}`}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition flex items-center justify-center shadow-md shadow-emerald-500/10"
                title="Ligar para cliente"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Equipment row */}
        <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Aparelho</span>
            <p className="text-xs font-extrabold text-slate-800">{atendimento.item} {atendimento.brand} {atendimento.model}</p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-2 py-1 rounded-lg">
            {atendimento.status === "entrega" ? "Pronto p/ Entrega" : atendimento.status === "finalizado" ? "Finalizado" : "Em manutenção"}
          </span>
        </div>

        {/* Inline editable: Observações */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Observações</span>
            <button 
              onClick={() => {
                if (isEditingObservations) {
                  saveField("observations", obsVal);
                }
                setIsEditingObservations(!isEditingObservations);
              }} 
              className="p-1 text-[#1E88E5] hover:bg-blue-50 rounded"
            >
              {isEditingObservations ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
          {isEditingObservations ? (
            <textarea
              value={obsVal}
              onChange={(e) => setObsVal(e.target.value)}
              className="w-full p-2 border border-blue-300 bg-white rounded-xl text-xs outline-none"
              rows={2}
            />
          ) : (
            <p className="text-xs font-bold text-slate-800 p-2 bg-slate-50/30 border border-slate-100 rounded-xl min-h-[34px]">
              {atendimento.observations || "Nenhuma observação informada."}
            </p>
          )}
        </div>

        {/* Services applied (With manual edit trigger + total) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Services Column */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Serviços</span>
              <button 
                onClick={openEditItemsModal}
                className="p-1 text-[#1E88E5] bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center border border-blue-100"
                title="Editar Serviços e Peças"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1 text-xs">
              {!(atendimento.services && atendimento.services.length > 0) ? (
                <span className="text-slate-400 italic">Nenhum serviço adicionado</span>
              ) : (
                (atendimento.services || []).map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center py-0.5">
                    <span className="font-semibold text-slate-700">{s.name}</span>
                    <span className="font-mono text-slate-500 font-medium">R$ {s.price.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Finances Quick summary */}
          <div className="space-y-3">
            {/* Total */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total</span>
              <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl font-mono text-sm font-bold text-[#1E88E5]">
                R$ {atendimento.totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Products (shopping cart button trigger) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Produto(s)</span>
                <button 
                  onClick={openEditItemsModal}
                  className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center border border-red-100"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 bg-red-50/20 border border-red-100/40 rounded-xl font-mono text-sm font-bold text-red-700 flex justify-between items-center">
                <span>R$ {totalProductsPrice.toFixed(2)}</span>
                <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-sans">
                  {(atendimento.products || []).reduce((acc, curr) => acc + curr.quantity, 0)} itens
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Photos list (horizontal slots with zoom camera view) */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Fotos de Entrada</span>
          <div className="flex flex-wrap gap-2.5">
            {/* Display up to 6 slots */}
            {Array.from({ length: 6 }).map((_, idx) => {
              const url = atendimento.photoUrls?.[idx] || (idx === 0 && atendimento.photoUrl ? atendimento.photoUrl : null);
              if (url) {
                return (
                  <a 
                    key={idx} 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 hover:opacity-90 transition block"
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Slot ${idx + 1}`} />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <span className="text-white text-[10px] font-extrabold uppercase">🔍 Ver</span>
                    </div>
                  </a>
                );
              } else {
                return (
                  <div key={idx} className="w-16 h-16 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-4 h-4 opacity-40" />
                    <span className="text-[8px] mt-1 opacity-60">Vazio</span>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Status Dropdown selector & WhatsApp Quick contact row */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status do Equipamento</span>
            {!isAddingStatus ? (
              <button
                type="button"
                onClick={() => setIsAddingStatus(true)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" /> Adicionar Status
              </button>
            ) : null}
          </div>

          {isAddingStatus ? (
            <form onSubmit={handleAddStatus} className="flex gap-2 items-center w-full bg-white p-1.5 border border-slate-200 rounded-xl">
              <input
                type="text"
                autoFocus
                placeholder="Novo status..."
                value={newStatusInput}
                onChange={(e) => setNewStatusInput(e.target.value)}
                className="flex-1 p-1 px-2 text-xs font-medium text-slate-700 outline-none bg-transparent"
              />
              <button
                type="submit"
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                title="Salvar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingStatus(false);
                  setNewStatusInput("");
                }}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <select
                  value={atendimento.detailedStatus || "Aguardando técnico"}
                  onChange={handleDetailedStatusChange}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 appearance-none pr-8 cursor-pointer"
                >
                  {statuses.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none w-3 h-3 border-r-2 border-b-2 border-slate-400 transform rotate-45"></div>
              </div>
              
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition flex items-center justify-center shadow-md shadow-emerald-500/10 shrink-0"
                title="Avisar cliente no WhatsApp"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Unlock info Section: Password + Interactive Pattern Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          
          {/* Lock password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Senha de Desbloqueio</span>
              <button 
                onClick={() => {
                  if (isEditingSenha) {
                    saveField("senhaDesbloqueio", senhaVal);
                  }
                  setIsEditingSenha(!isEditingSenha);
                }}
                className="p-1 text-[#1E88E5] hover:bg-blue-50 rounded"
              >
                {isEditingSenha ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              </button>
            </div>
            {isEditingSenha ? (
              <input
                type="text"
                value={senhaVal}
                onChange={(e) => setSenhaVal(e.target.value)}
                className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs outline-none font-semibold text-slate-800"
                placeholder="Insira a senha se houver..."
              />
            ) : (
              <p className="text-sm font-extrabold text-slate-800 p-3 bg-slate-50/50 border border-slate-100 rounded-xl min-h-[46px] flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{atendimento.senhaDesbloqueio || "Sem senha cadastrada"}</span>
              </p>
            )}
          </div>

          {/* Pattern Unlock with interactive SVG representation */}
          <div className="space-y-1.5 p-3.5 bg-slate-50/50 border border-slate-200/50 rounded-2xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Grid3X3 className="w-3.5 h-3.5 text-blue-500" />
                Padrão de Desbloqueio
              </span>
              <div className="flex gap-1.5">
                {isEditingPattern && (
                  <button 
                    onClick={clearPattern} 
                    className="text-[9px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                  >
                    Limpar
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (isEditingPattern) {
                      savePattern();
                    } else {
                      setIsEditingPattern(true);
                    }
                  }}
                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  {isEditingPattern ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 3x3 Pattern Dot Grid Container */}
            <div className="relative w-36 h-36 border border-slate-200/60 bg-white rounded-2xl p-4 shadow-inner flex items-center justify-center">
              
              {/* SVG Overlay to Draw Lines */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full">
                {patternSeq.map((dot, index) => {
                  if (index === patternSeq.length - 1) return null;
                  const nextDot = patternSeq[index + 1];
                  const p1 = DOT_COORDINATES[dot];
                  const p2 = DOT_COORDINATES[nextDot];
                  if (!p1 || !p2) return null;
                  return (
                    <line
                      key={index}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#1E88E5"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  );
                })}
              </svg>

              {/* Nine Circles */}
              <div className="grid grid-cols-3 gap-y-4 gap-x-4 w-full h-full justify-items-center items-center">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const isSelected = patternSeq.includes(num);
                  const isFirst = patternSeq[0] === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleDotClick(num)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center font-bold text-[9px] select-none ${
                        isSelected 
                          ? isFirst 
                            ? "bg-emerald-500 border-emerald-600 text-white scale-110" 
                            : "bg-[#1E88E5] border-[#1E88E5] text-white scale-110 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[9px] text-slate-400 text-center font-medium mt-1">
              {isEditingPattern 
                ? "Clique nos números em sequência para desenhar o padrão de desenho."
                : patternSeq.length > 0 
                ? `Padrão salvo: ${patternSeq.join(" ➔ ")}`
                : "Nenhum padrão cadastrado"
              }
            </p>
          </div>
        </div>

        {/* Timestamps Section: Inicio / Fim do serviço */}
        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#1E88E5]" />
              Cronograma do Serviço
            </span>
            <button 
              onClick={() => {
                if (isEditingTimestamps) {
                  saveField("inicioServico", inicioServico);
                  saveField("fimServico", fimServico);
                }
                setIsEditingTimestamps(!isEditingTimestamps);
              }}
              className="p-1 text-[#1E88E5] hover:bg-blue-50 rounded"
            >
              {isEditingTimestamps ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Inicio do serviço */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Início do serviço</span>
              {isEditingTimestamps ? (
                <input
                  type="datetime-local"
                  value={inicioServico}
                  onChange={(e) => setInicioServico(e.target.value)}
                  className="p-2 border border-blue-300 bg-white rounded-xl text-xs w-full font-mono outline-none"
                />
              ) : (
                <div className="p-2.5 bg-white border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 font-mono">
                  {inicioServico ? new Date(inicioServico).toLocaleString("pt-BR") : "Não iniciado"}
                </div>
              )}
            </div>

            {/* Fim do serviço */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Fim do serviço</span>
              {isEditingTimestamps ? (
                <input
                  type="datetime-local"
                  value={fimServico}
                  onChange={(e) => setFimServico(e.target.value)}
                  className="p-2 border border-blue-300 bg-white rounded-xl text-xs w-full font-mono outline-none"
                />
              ) : (
                <div className="p-2.5 bg-white border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 font-mono">
                  {fimServico ? new Date(fimServico).toLocaleString("pt-BR") : "Não finalizado"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Serial number */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Número de Série</span>
            <button 
              onClick={() => {
                if (isEditingSerial) {
                  saveField("numeroSerie", serialVal);
                }
                setIsEditingSerial(!isEditingSerial);
              }}
              className="p-1 text-[#1E88E5] hover:bg-blue-50 rounded"
            >
              {isEditingSerial ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
          {isEditingSerial ? (
            <input
              type="text"
              value={serialVal}
              onChange={(e) => setSerialVal(e.target.value)}
              className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs outline-none font-mono"
            />
          ) : (
            <p className="text-xs font-bold text-slate-800 p-2.5 bg-slate-50/30 border border-slate-100 rounded-xl min-h-[36px] font-mono">
              {atendimento.numeroSerie || "000000"}
            </p>
          )}
        </div>

        {/* Defeito */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Defeito</span>
            <button 
              onClick={() => {
                if (isEditingDefect) {
                  saveField("defeito", defectVal);
                }
                setIsEditingDefect(!isEditingDefect);
              }}
              className="p-1 text-[#1E88E5] hover:bg-blue-50 rounded"
            >
              {isEditingDefect ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
          {isEditingDefect ? (
            <textarea
              value={defectVal}
              onChange={(e) => setDefectVal(e.target.value)}
              className="w-full p-2 border border-blue-300 bg-white rounded-xl text-xs outline-none"
              rows={2}
            />
          ) : (
            <p className="text-xs font-bold text-slate-800 p-2.5 bg-slate-50/30 border border-slate-100 rounded-xl min-h-[36px]">
              {atendimento.defeito || "Nenhum defeito especificado."}
            </p>
          )}
        </div>

        {/* Technical closing report / Laudo técnico */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Laudo Técnico</span>
            <button 
              onClick={() => {
                if (isEditingNotesFin) {
                  saveField("notesFin", notesFinVal);
                  setNotesFin(notesFinVal);
                }
                setIsEditingNotesFin(!isEditingNotesFin);
              }}
              className="p-1 text-[#1E88E5] hover:bg-blue-50 rounded"
            >
              {isEditingNotesFin ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
          {isEditingNotesFin ? (
            <textarea
              value={notesFinVal}
              onChange={(e) => setNotesFinVal(e.target.value)}
              className="w-full p-2.5 border border-blue-300 bg-white rounded-xl text-xs outline-none"
              placeholder="Descreva a solução aplicada e detalhes adicionais de laudo..."
              rows={3}
            />
          ) : (
            <p className="text-xs font-medium text-slate-700 p-3 bg-slate-50 border border-slate-100 rounded-xl min-h-[46px] whitespace-pre-line">
              {atendimento.notesFin || "Clique no lápis para descrever as soluções técnicas, garantias aplicadas ou laudo de saída."}
            </p>
          )}
        </div>

        {/* WhatsApp & Automations Timeline Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150/50 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Central de Mensagens & WhatsApp
            </h3>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
              Automático & Manual
            </span>
          </div>

          <p className="text-[10px] text-slate-500">
            Acompanhe e envie mensagens personalizadas nas 3 etapas do atendimento:
          </p>

          <div className="space-y-4">
            {/* 1. Entrada */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-[10px]">
                  1
                </div>
                <div className="w-0.5 h-full bg-slate-100 min-h-[40px]"></div>
              </div>
              <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">Confirmação de Entrada (OS Aberta)</span>
                  <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Etapa de Entrada</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono bg-white border border-slate-100 p-2 rounded-xl whitespace-pre-wrap">
                  {getFormattedMessage("entry")}
                </p>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp("entry")}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Enviar Confirmação (Entrada)
                </button>
              </div>
            </div>

            {/* 2. Pronto */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 font-bold text-[10px]">
                  2
                </div>
                <div className="w-0.5 h-full bg-slate-100 min-h-[40px]"></div>
              </div>
              <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">Aviso de Aparelho Pronto</span>
                  {atendimento.status === "entrega" ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">Pronto p/ Retirada</span>
                  ) : (
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Aguardando Conclusão</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-mono bg-white border border-slate-100 p-2 rounded-xl whitespace-pre-wrap">
                  {getFormattedMessage("ready")}
                </p>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp("ready")}
                  className={`px-3 py-1.5 font-bold text-[10px] rounded-xl flex items-center gap-1.5 transition ${
                    atendimento.status === "entrega"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Enviar Aviso de Pronto
                </button>
              </div>
            </div>

            {/* 3. Pós-Venda */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 font-bold text-[10px]">
                  3
                </div>
              </div>
              <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">Pesquisa de Satisfação (Pós-Venda)</span>
                  {atendimento.status === "finalizado" ? (
                    relatedFeedback ? (
                      relatedFeedback.status === "sent" ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Enviado</span>
                      ) : relatedFeedback.status === "canceled" ? (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-150 px-2 py-0.5 rounded-full">Cancelado</span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">Agendado</span>
                      )
                    ) : (
                      <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Não Agendado</span>
                    )
                  ) : (
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Agenda no Pagamento</span>
                  )}
                </div>

                {atendimento.status !== "finalizado" ? (
                  <div className="space-y-1.5">
                    <div className="bg-blue-50/50 border border-blue-100/50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-blue-800 font-semibold leading-relaxed flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Será agendado automaticamente após o Pagamento
                      </p>
                      <p className="text-[9px] text-blue-600 mt-0.5">
                        Tempo de espera configurado: <strong>{feedbackConfig?.delayHours || 3} horas</strong>.
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono bg-white border border-slate-100 p-2 rounded-xl whitespace-pre-wrap">
                      {getFormattedMessage("feedback")}
                    </p>
                  </div>
                ) : relatedFeedback ? (
                  <div className="space-y-2">
                    {/* Editable custom message */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Mensagem Agendada</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingFeedbackText) {
                              handleSaveFeedbackMessage();
                            } else {
                              setIsEditingFeedbackText(true);
                            }
                          }}
                          className="text-[#1E88E5] text-[10px] font-bold hover:underline"
                        >
                          {isEditingFeedbackText ? "Salvar" : "Editar"}
                        </button>
                      </div>
                      {isEditingFeedbackText ? (
                        <textarea
                          value={feedbackTextVal}
                          onChange={(e) => setFeedbackTextVal(e.target.value)}
                          className="w-full p-2 border border-blue-300 bg-white rounded-xl text-xs outline-none font-sans"
                          rows={3}
                        />
                      ) : (
                        <p className="text-[10px] text-slate-600 font-mono bg-white border border-slate-100 p-2 rounded-xl whitespace-pre-wrap">
                          {relatedFeedback.messageText}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium bg-white p-1.5 border border-slate-100 rounded-xl">
                      <span>Agendado para: {new Date(relatedFeedback.scheduledTime).toLocaleString("pt-BR")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {relatedFeedback.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedbackStatus(relatedFeedback.id, "canceled")}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-[10px] font-bold transition"
                          >
                            Cancelar Agendamento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendWhatsApp("feedback", relatedFeedback.messageText);
                              handleUpdateFeedbackStatus(relatedFeedback.id, "sent");
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Enviar Agora
                          </button>
                        </>
                      )}

                      {relatedFeedback.status !== "pending" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateFeedbackStatus(relatedFeedback.id, "pending")}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition"
                        >
                          Reagendar Envio
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-[10px] font-medium border border-amber-100">
                    O agendamento de pós-venda está desativado ou foi removido para esta OS.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Row styled exactly like the user's screenshot */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          {flowMode === "atendimento" ? (
            /* Button 1: MARCAR COMO PRONTO */
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/atendimentos/${atendimento.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      status: "entrega",
                      detailedStatus: "Pronto para entrega",
                      notesFin
                    })
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    if (onUpdateAtendimento) {
                      onUpdateAtendimento(updated);
                    }
                    alert("Equipamento marcado como PRONTO PARA ENTREGA!");
                    // Trigger WhatsApp
                    if (client) {
                      const cleanPhone = client.phone.replace(/\D/g, "");
                      const text = `Olá ${client.name}! Seu equipamento ${atendimento.item} ${atendimento.brand} ${atendimento.model} (OS: ${atendimento.controlNumber}) está pronto para entrega! Valor total: R$ ${atendimento.totalAmount.toFixed(2)}.`;
                      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                      const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
                      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone;
                      const url = `${baseUrl}?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
                      window.open(url, "_blank");
                    }
                    onBack();
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition uppercase tracking-widest shadow-lg shadow-emerald-500/10"
            >
              <Check className="w-5 h-5 text-white" />
              CONCLUIR MANUTENÇÃO (MARCAR COMO PRONTO)
            </button>
          ) : (
            /* Button 1: PAGAMENTO */
            <button
              onClick={() => onGoToPayment(atendimento, notesFin)}
              className="w-full py-3.5 bg-[#1E88E5] hover:bg-blue-600 active:bg-blue-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition uppercase tracking-widest shadow-lg shadow-blue-500/10"
            >
              <CreditCard className="w-5 h-5 text-white" />
              PAGAMENTO
            </button>
          )}

          {/* Button 2: ENVIAR MENSAGEM: FIM DO SERVIÇO */}
          {flowMode !== "atendimento" && (
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3.5 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition uppercase tracking-widest"
            >
              <MessageSquare className="w-5 h-5 text-white" />
              ENVIAR MENSAGEM: FIM DO SERVIÇO
            </button>
          )}

          {/* Button 3: 2ª VIA RECIBO DE ENTRADA */}
          <button
            type="button"
            onClick={() => onPrintIntakeReceipt(atendimento, false, client)}
            className="w-full py-3.5 bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-black text-xs rounded-xl flex items-center justify-between px-6 transition uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-white/80" />
              2ª via RECIBO DE ENTRADA
            </span>
            <FileText className="w-5 h-5 text-white bg-slate-600/50 p-1 rounded-lg" />
          </button>

          {/* Button 4: 2ª VIA RECIBO SEM VALOR R$ */}
          <button
            type="button"
            onClick={() => onPrintIntakeReceipt(atendimento, true, client)}
            className="w-full py-3.5 bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-black text-xs rounded-xl flex items-center justify-between px-6 transition uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-white/80" />
              2ª via RECIBO SEM VALOR R$
            </span>
            <FileText className="w-5 h-5 text-white bg-slate-600/50 p-1 rounded-lg" />
          </button>
        </div>
      </div>

      {/* Services & Peças applied modal */}
      {showEditItemsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Editar Serviços e Peças</h3>
                <p className="text-[11px] text-slate-400">Adicione ou remova serviços e produtos desta OS</p>
              </div>
              <button 
                onClick={() => setShowEditItemsModal(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Selected items overview */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Itens Atuais na OS (Edite diretamente)</span>
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-slate-50/30 text-xs">
                  {modalServices.map((s, idx) => (
                    <div key={idx} className="p-3 flex flex-col gap-1.5 bg-blue-50/10">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => handleUpdateServiceField(s.serviceId, "name", e.target.value)}
                          className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Nome do Serviço"
                        />
                        <div className="relative w-24">
                          <span className="absolute left-1.5 top-1.5 text-slate-400 text-[10px] font-bold">R$</span>
                          <input
                            type="number"
                            value={s.price || ""}
                            onChange={(e) => handleUpdateServiceField(s.serviceId, "price", Number(e.target.value))}
                            className="w-full pl-6 pr-1 py-1 border border-slate-200 bg-white rounded text-xs font-bold font-mono text-center outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="0,00"
                          />
                        </div>
                        <button 
                          onClick={() => setModalServices(modalServices.filter(item => item.serviceId !== s.serviceId))}
                          className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {modalProducts.map((p, idx) => (
                    <div key={idx} className="p-3 flex flex-col gap-1.5 bg-red-50/10">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleUpdateProductField(p.productId, "name", e.target.value)}
                          className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Nome da Peça/Produto"
                        />
                        <div className="relative w-24">
                          <span className="absolute left-1.5 top-1.5 text-slate-400 text-[10px] font-bold">R$</span>
                          <input
                            type="number"
                            value={p.price || ""}
                            onChange={(e) => handleUpdateProductField(p.productId, "price", Number(e.target.value))}
                            className="w-full pl-6 pr-1 py-1 border border-slate-200 bg-white rounded text-xs font-bold font-mono text-center outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="0,00"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium">Qtd:</span>
                          <input 
                            type="number"
                            value={p.quantity}
                            onChange={(e) => handleUpdateProductField(p.productId, "quantity", Number(e.target.value))}
                            className="w-10 p-1 border border-slate-200 bg-white rounded text-center text-xs font-bold font-mono outline-none focus:ring-1 focus:ring-blue-400"
                            min={1}
                          />
                        </div>
                        <button 
                          onClick={() => setModalProducts(modalProducts.filter(item => item.productId !== p.productId))}
                          className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {modalServices.length === 0 && modalProducts.length === 0 && (
                    <p className="p-4 text-center text-slate-400 italic">Nenhum item adicionado a esta ordem.</p>
                  )}
                </div>
              </div>

              {/* Add manual section */}
              <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Novo Item / Serviço</span>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex items-center gap-1 text-[#1E88E5] hover:text-blue-700 font-extrabold text-[10px]"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#1E88E5]" />
                    Escanear Peça
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Serviço ou Peça..."
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 font-semibold"
                  />
                  <div className="relative w-20">
                    <span className="absolute left-1.5 top-2 text-slate-400 text-xs font-bold">R$</span>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={manualItemPrice}
                      onChange={(e) => setManualItemPrice(e.target.value)}
                      className="w-full pl-6 pr-1 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-center font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddManualService}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Serviço
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualProduct}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Peça
                  </button>
                </div>
              </div>

              {/* Suggested quick select lists */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sugestões Rápidas (Clique p/ preencher)</span>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {allServices.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setManualItemName(s.name);
                        setManualItemPrice(s.price > 0 ? s.price.toString() : "");
                      }}
                      className="px-2 py-1.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-[#1E88E5] rounded-xl text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <span>🛠️</span>
                      <span>{s.name}</span>
                      <span className="text-[9px] font-mono text-slate-400">({s.isPriceCustom ? "Var" : `${s.price} R$`})</span>
                    </button>
                  ))}
                  {allProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setManualItemName(p.name);
                        setManualItemPrice(p.price > 0 ? p.price.toString() : "");
                      }}
                      className="px-2 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <span>📦</span>
                      <span>{p.name}</span>
                      <span className="text-[9px] font-mono text-slate-400">({p.price} R$)</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button 
                onClick={() => setShowEditItemsModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveModalItems}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-500/10"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode / QR Scanner inside Modal */}
      {scannerOpen && (
        <ProductScanner 
          onClose={() => setScannerOpen(false)} 
          onProductScanned={handleScanSelectProduct} 
          mode="select"
        />
      )}
    </div>
  );
}
