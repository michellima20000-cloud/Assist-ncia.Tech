import React, { useState, useEffect } from "react";
import {
  ShoppingBag, Search, Plus, Minus, Trash2, X, CreditCard, DollarSign,
  User, CheckCircle, AlertTriangle, QrCode, ArrowLeft, RefreshCw, Sparkles, Receipt,
  Package, ShieldCheck, Clock, FileText, Layers
} from "lucide-react";
import { Produto, Cliente, VendaItem, Venda } from "../types";
import ProductScanner from "./ProductScanner";
import ExtratoVendasReport from "./ExtratoVendasReport";

interface VendasProps {
  onBack: () => void;
  onSaleSuccess: (receiptContent: string, phone: string, clientName: string) => void;
}

interface CartItem {
  product: Produto;
  quantity: number;
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
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

const formatCnpj = (value: string) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 14);
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

const formatDoc = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length > 11) {
    return formatCnpj(cleaned);
  }
  return formatCpf(cleaned);
};

export default function Vendas({ onBack, onSaleSuccess }: VendasProps) {
  const [products, setProducts] = useState<Produto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Produto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  // Venda Rapida / Cliente Avulso states
  const [clientInputMode, setClientInputMode] = useState<"manual" | "search">("manual");
  const [customClientName, setCustomClientName] = useState("");
  const [customClientPhone, setCustomClientPhone] = useState("");
  const [customClientCpf, setCustomClientCpf] = useState("");

  // Observations & Guarantee
  const [observations, setObservations] = useState("");
  const [garantia, setGarantia] = useState("Garantia de 90 dias (3 meses)");
  
  // Cart & Sale State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(""); // in R$ / % (blank starts at zero)
  const [discountType, setDiscountType] = useState<"value" | "percent">("value");
  const [method, setMethod] = useState<"cash" | "debit" | "credit" | "pix" | "split">("cash");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split payment state (ex: metade dinheiro, metade pix/cartão)
  const [splitCash, setSplitCash] = useState("");
  const [splitCashGiven, setSplitCashGiven] = useState(""); // Valor em cédula entregue pelo cliente
  const [splitPix, setSplitPix] = useState("");
  const [splitDebit, setSplitDebit] = useState("");
  const [splitCredit, setSplitCredit] = useState("");

  // Scanner Modal
  const [scannerOpen, setScannerOpen] = useState(false);

  // Extrato de Vendas Modal
  const [extratoOpen, setExtratoOpen] = useState(false);
  const [vendasList, setVendasList] = useState<Venda[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

  const fetchVendas = async () => {
    setLoadingVendas(true);
    try {
      const res = await fetch("/api/vendas");
      if (res.ok) {
        const data = await res.json();
        setVendasList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao buscar vendas:", err);
    } finally {
      setLoadingVendas(false);
    }
  };

  const handleOpenExtrato = () => {
    fetchVendas();
    setExtratoOpen(true);
  };

  // Load products and clients
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, cliRes] = await Promise.all([
          fetch("/api/produtos"),
          fetch("/api/clientes")
        ]);

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          // Sort products by position or name
          const sortedProds = (prodData || []).sort((a: Produto, b: Produto) => (a.position || 0) - (b.position || 0));
          setProducts(sortedProds);
          setFilteredProducts(sortedProds);
        }

        if (cliRes.ok) {
          const cliData = await cliRes.json();
          setClientes(cliData || []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados de vendas:", err);
      }
    };
    fetchData();
  }, []);

  // Filter products based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        p => p.name.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query) ||
             p.barcode?.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  // Filter clients based on search query
  useEffect(() => {
    const query = clienteSearch.toLowerCase().trim();
    if (!query) {
      setFilteredClientes([]);
    } else {
      const filtered = clientes.filter(
        c => c.name.toLowerCase().includes(query) || 
             c.phone.includes(query) || 
             c.cpf?.includes(query) ||
             c.cnpj?.includes(query)
      );
      setFilteredClientes(filtered);
    }
  }, [clienteSearch, clientes]);

  const handleAddProduct = (product: Produto) => {
    setError(null);
    if (product.stock <= 0) {
      setError("Produto sem estoque disponível!");
      return;
    }

    if (product.warranty) {
      setGarantia(product.warranty);
      if (!observations) {
        setObservations(product.warranty);
      }
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(`Estoque máximo atingido para ${product.name}! Disponível: ${product.stock}`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setError(null);
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) {
            setError(`Estoque máximo atingido! Disponível: ${item.product.stock}`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleSetExactQuantity = (productId: string, exactQty: number) => {
    setError(null);
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          if (exactQty <= 0) return null;
          if (exactQty > item.product.stock) {
            setError(`Estoque máximo atingido! Disponível: ${item.product.stock}`);
            return { ...item, quantity: item.product.stock };
          }
          return { ...item, quantity: exactQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handlePlusClick = (productId: string, currentQty: number, productName: string, maxStock: number) => {
    setError(null);
    const input = prompt(`Digite a quantidade desejada para "${productName}":`, (currentQty + 1).toString());
    if (input === null) return; // User cancelled prompt

    const trimmed = input.trim();
    if (trimmed === "") {
      handleUpdateQuantity(productId, 1);
      return;
    }

    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (parsed > maxStock) {
        setError(`Estoque máximo atingido! Disponível: ${maxStock}`);
        handleSetExactQuantity(productId, maxStock);
      } else {
        handleSetExactQuantity(productId, parsed);
      }
    } else {
      setError("Quantidade inválida informada.");
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalCost = cart.reduce((acc, item) => acc + ((item.product.cost || 0) * item.quantity), 0);
  
  const discountNum = Number(discount) || 0;
  const calculatedDiscount = discountType === "value" 
    ? discountNum 
    : (subtotal * discountNum) / 100;
  
  const totalAmount = Math.max(0, subtotal - calculatedDiscount);
  const estimatedProfit = Math.max(0, totalAmount - totalCost);

  const receivedNum = Number(receivedAmount.replace(",", ".")) || 0;
  const change = Math.max(0, receivedNum - totalAmount);

  // Split payment calculations
  const splitCashNum = Number(splitCash.replace(",", ".")) || 0;
  const splitCashGivenNum = Number(splitCashGiven.replace(",", ".")) || 0;
  const splitPixNum = Number(splitPix.replace(",", ".")) || 0;
  const splitDebitNum = Number(splitDebit.replace(",", ".")) || 0;
  const splitCreditNum = Number(splitCredit.replace(",", ".")) || 0;

  const splitTotalPaid = Number((splitCashNum + splitPixNum + splitDebitNum + splitCreditNum).toFixed(2));
  const splitRemaining = Number(Math.max(0, totalAmount - splitTotalPaid).toFixed(2));
  const splitOverpaid = Number(Math.max(0, splitTotalPaid - totalAmount).toFixed(2));
  const splitCashChange = splitCashGivenNum > splitCashNum ? Number((splitCashGivenNum - splitCashNum).toFixed(2)) : 0;

  // Split helper: 50% / 50% split shortcut
  const handleSplitHalf = (methodA: 'cash' | 'pix' | 'debit' | 'credit', methodB: 'cash' | 'pix' | 'debit' | 'credit') => {
    const half = Number((totalAmount / 2).toFixed(2));
    const otherHalf = Number((totalAmount - half).toFixed(2));

    setSplitCash("");
    setSplitCashGiven("");
    setSplitPix("");
    setSplitDebit("");
    setSplitCredit("");

    const assignVal = (target: string, val: number) => {
      if (target === 'cash') {
        setSplitCash(val.toFixed(2));
        setSplitCashGiven(val.toFixed(2));
      } else if (target === 'pix') setSplitPix(val.toFixed(2));
      else if (target === 'debit') setSplitDebit(val.toFixed(2));
      else if (target === 'credit') setSplitCredit(val.toFixed(2));
    };

    assignVal(methodA, half);
    assignVal(methodB, otherHalf);
  };

  // Split helper: fill the exact remaining balance into a method
  const handleFillRemaining = (target: 'cash' | 'pix' | 'debit' | 'credit') => {
    let others = 0;
    if (target !== 'cash') others += splitCashNum;
    if (target !== 'pix') others += splitPixNum;
    if (target !== 'debit') others += splitDebitNum;
    if (target !== 'credit') others += splitCreditNum;

    const diff = Math.max(0, Number((totalAmount - others).toFixed(2)));
    if (target === 'cash') {
      setSplitCash(diff > 0 ? diff.toFixed(2) : "");
      setSplitCashGiven(diff > 0 ? diff.toFixed(2) : "");
    } else if (target === 'pix') {
      setSplitPix(diff > 0 ? diff.toFixed(2) : "");
    } else if (target === 'debit') {
      setSplitDebit(diff > 0 ? diff.toFixed(2) : "");
    } else if (target === 'credit') {
      setSplitCredit(diff > 0 ? diff.toFixed(2) : "");
    }
  };

  // Reset received amount to "" only when method changes to cash, or auto-set for card/pix
  useEffect(() => {
    if (method === "cash") {
      setReceivedAmount("");
    } else if (method === "split") {
      // Auto-suggest 50/50 Dinheiro e PIX if fields are currently empty
      if (!splitCash && !splitPix && !splitDebit && !splitCredit && totalAmount > 0) {
        const half = Number((totalAmount / 2).toFixed(2));
        const otherHalf = Number((totalAmount - half).toFixed(2));
        setSplitCash(half.toFixed(2));
        setSplitCashGiven(half.toFixed(2));
        setSplitPix(otherHalf.toFixed(2));
      }
    } else {
      setReceivedAmount(totalAmount.toFixed(2));
    }
  }, [method]);

  // If method is not cash and not split, keep it synced with totalAmount changes
  useEffect(() => {
    if (method !== "cash" && method !== "split") {
      setReceivedAmount(totalAmount.toFixed(2));
    }
  }, [totalAmount]);

  // Handler for scanner detection
  const handleProductScanned = (scanned: Produto) => {
    handleAddProduct(scanned);
    setScannerOpen(false);
  };

  // Submit sale to backend
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      setError("Adicione pelo menos um produto ao carrinho!");
      return;
    }

    if (method === "cash" && receivedNum < totalAmount) {
      setError("Valor recebido em dinheiro é menor do que o total da venda!");
      return;
    }

    if (method === "split") {
      if (Math.abs(splitTotalPaid - totalAmount) > 0.05) {
        if (splitTotalPaid < totalAmount) {
          setError(`Falta distribuir R$ ${splitRemaining.toFixed(2)} para completar o total da venda de R$ ${totalAmount.toFixed(2)}!`);
        } else {
          setError(`O total das fatias (R$ ${splitTotalPaid.toFixed(2)}) ultrapassa o valor da venda (R$ ${totalAmount.toFixed(2)})!`);
        }
        return;
      }
      if (splitCashGivenNum > 0 && splitCashGivenNum < splitCashNum) {
        setError(`O valor entregue em dinheiro (R$ ${splitCashGivenNum.toFixed(2)}) é menor do que a parcela em dinheiro (R$ ${splitCashNum.toFixed(2)})!`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    const itemsPayload: VendaItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      cost: item.product.cost
    }));

    const savedUser = localStorage.getItem("user_session");
    const currentUser = savedUser ? JSON.parse(savedUser) : null;

    const finalClientName = selectedCliente?.name || customClientName || "Consumidor Final";
    const finalClientPhone = selectedCliente?.phone || customClientPhone || "";
    const cleanDoc = (customClientCpf || "").replace(/\D/g, "");
    const finalClientCpf = selectedCliente?.cpf || (cleanDoc.length <= 11 ? customClientCpf : "");
    const finalClientCnpj = selectedCliente?.cnpj || (cleanDoc.length > 11 ? customClientCpf : "");

    const splitPaymentsPayload = method === "split" ? {
      cash: splitCashNum,
      cashGiven: splitCashGivenNum || splitCashNum,
      cashChange: splitCashChange,
      pix: splitPixNum,
      debit: splitDebitNum,
      credit: splitCreditNum,
      total: splitTotalPaid
    } : null;

    const finalReceived = method === "split" 
      ? Number((splitTotalPaid + splitCashChange).toFixed(2))
      : (method === "cash" ? receivedNum : totalAmount);

    const finalChange = method === "split" ? splitCashChange : (method === "cash" ? change : 0);

    const payload = {
      clienteId: selectedCliente?.id || null,
      clienteName: finalClientName,
      items: itemsPayload,
      totalAmount,
      receivedAmount: finalReceived,
      change: finalChange,
      method: method === "split" ? "misto" : method,
      splitPayments: splitPaymentsPayload,
      sellerId: currentUser?.id || null,
      sellerName: currentUser?.name || "Balcão",
      observations: observations,
      garantia: garantia || "Garantia de 90 dias (3 meses)"
    };

    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        // Fallback to result or constructed payload in case nested venda is not present
        const venda = result.venda || result || {};
        const finalVenda = {
          id: venda.id || venda.vendaId || "vend-" + Date.now(),
          date: venda.date || new Date().toISOString(),
          sellerName: venda.sellerName || payload.sellerName,
          clienteName: venda.clienteName || payload.clienteName,
          items: venda.items || payload.items || [],
          method: venda.method || payload.method,
          receivedAmount: typeof venda.receivedAmount === 'number' ? venda.receivedAmount : payload.receivedAmount,
          change: typeof venda.change === 'number' ? venda.change : payload.change,
          observations: venda.observations || payload.observations || ""
        };

        const clientDocLine = finalClientCnpj ? `CNPJ: ${finalClientCnpj}` : (finalClientCpf ? `CPF: ${finalClientCpf}` : "");

        let paymentLabel = "Dinheiro";
        if (finalVenda.method === "pix") paymentLabel = "PIX";
        else if (finalVenda.method === "debit") paymentLabel = "Cartão de Débito";
        else if (finalVenda.method === "credit") paymentLabel = "Cartão de Crédito";
        else if (finalVenda.method === "split" || finalVenda.method === "misto") {
          const parts: string[] = [];
          if (splitCashNum > 0) parts.push(`- Dinheiro: R$ ${splitCashNum.toFixed(2)}${splitCashGivenNum > splitCashNum ? ` (Entregue: R$ ${splitCashGivenNum.toFixed(2)} | Troco: R$ ${splitCashChange.toFixed(2)})` : ''}`);
          if (splitPixNum > 0) parts.push(`- PIX: R$ ${splitPixNum.toFixed(2)}`);
          if (splitDebitNum > 0) parts.push(`- Débito: R$ ${splitDebitNum.toFixed(2)}`);
          if (splitCreditNum > 0) parts.push(`- Crédito: R$ ${splitCreditNum.toFixed(2)}`);
          paymentLabel = `PAGAMENTO MISTO / DIVIDIDO:\n${parts.join("\n")}`;
        }

        // Generate ESC/POS Thermal Receipt Layout
        const receiptText = `CUPOM DE VENDA DIRETA
================================
MINHA ASSISTÊNCIA
CONECTADA • TECNOLOGIA & ACESSÓRIOS
================================
DATA: ${new Date(finalVenda.date).toLocaleString("pt-BR")}
VENDA: ${finalVenda.id}
VENDEDOR: ${finalVenda.sellerName}
CLIENTE: ${finalVenda.clienteName}
${finalClientPhone ? `FONE: ${finalClientPhone}` : ""}
${clientDocLine ? `${clientDocLine}` : ""}
--------------------------------
ITENS VENDIDOS:
${finalVenda.items.map((it: any) => `${it.name.substring(0, 20).padEnd(20)} x${it.quantity} R$ ${(it.price * it.quantity).toFixed(2)}`).join("\n")}
--------------------------------
SUBTOTAL:       R$ ${subtotal.toFixed(2)}
DESCONTO:       R$ ${calculatedDiscount.toFixed(2)}
TOTAL GERAL:    R$ ${totalAmount.toFixed(2)}
FORMA DE PGTO:  ${paymentLabel}
VALOR RECEBIDO: R$ ${finalVenda.receivedAmount.toFixed(2)}
TROCO REGISTRADO: R$ ${finalVenda.change.toFixed(2)}
--------------------------------
GARANTIA: ${garantia || "Garantia de 90 dias (3 meses)"}
================================
${finalVenda.observations ? `OBS: ${finalVenda.observations}
================================` : ""}
Obrigado pela preferência!
Volte sempre!`;

        onSaleSuccess(receiptText, finalClientPhone, finalClientName);
      } else {
        let errMsg = "Erro ao registrar a venda.";
        try {
          const errData = await res.json();
          errMsg = errData.message || errData.error || errMsg;
        } catch (_) {
          // If the response is not valid JSON (e.g. HTML error), keep default message
        }
        setError(errMsg);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar venda: ${err?.message || err || "Erro de conexão com o servidor"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 border border-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#1E88E5]" />
              <h2 className="text-lg font-black text-slate-800">Módulo de Vendas Diretas</h2>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Venda de acessórios, fones, carregadores e películas no balcão</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenExtrato}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#162a5b] border border-blue-200 font-extrabold text-xs tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            title="Ver Extrato Detalhado de Vendas"
          >
            <Clock className="w-4 h-4 text-[#1E88E5]" />
            <span>EXTRATO DE VENDAS</span>
          </button>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>CÓDIGO DE BARRAS</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* SALES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PRODUCT SELECTION & CLIENT MATCH (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* CLIENT SELECTOR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                Identificar Cliente (Opcional)
              </h3>
              {!selectedCliente && (
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setClientInputMode("manual")}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                      clientInputMode === "manual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Venda Rápida
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientInputMode("search")}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                      clientInputMode === "search" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Buscar Cadastro
                  </button>
                </div>
              )}
            </div>

            {selectedCliente ? (
              <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    {selectedCliente.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{selectedCliente.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">{selectedCliente.phone}</p>
                      {selectedCliente.cnpj ? (
                        <span className="text-[9px] text-blue-700 font-bold font-mono bg-blue-100/60 px-1.5 py-0.2 rounded">CNPJ: {selectedCliente.cnpj}</span>
                      ) : selectedCliente.cpf ? (
                        <span className="text-[9px] text-slate-500 font-mono">CPF: {selectedCliente.cpf}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCliente(null);
                    setClientInputMode("manual");
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : clientInputMode === "manual" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Nome do Cliente (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Michel / Empresa Ltda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#1E88E5] transition"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Telefone / WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    placeholder="(DD) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#1E88E5] transition font-mono"
                    value={customClientPhone}
                    onChange={(e) => setCustomClientPhone(formatPhoneNumber(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">CPF ou CNPJ (Opcional)</label>
                  <input
                    type="text"
                    placeholder="CPF ou CNPJ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#1E88E5] transition font-mono"
                    value={customClientCpf}
                    onChange={(e) => setCustomClientCpf(formatDoc(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="relative pt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente por nome, telefone, CPF ou CNPJ..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E88E5] transition font-medium"
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                />

                {showClienteDropdown && filteredClientes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {filteredClientes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs transition flex items-center justify-between"
                        onClick={() => {
                          setSelectedCliente(c);
                          setClienteSearch("");
                          setShowClienteDropdown(false);
                        }}
                      >
                        <div>
                          <p className="font-extrabold text-slate-800">{c.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">{c.phone}</span>
                            {c.cnpj ? (
                              <span className="text-[9px] text-blue-700 font-bold font-mono">CNPJ: {c.cnpj}</span>
                            ) : c.cpf ? (
                              <span className="text-[9px] text-slate-400 font-mono">CPF: {c.cpf}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-[#1E88E5] px-1.5 py-0.5 rounded-full font-bold">Selecionar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRODUCT DIRECT SELECTION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Produtos do Catálogo
              </h3>

              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por nome ou código..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E88E5] transition font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* PRODUCT CARD LIST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-400">
                  <p className="text-xs font-bold">Nenhum produto cadastrado ou encontrado.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Crie produtos no painel de administração para vendê-los aqui.</p>
                </div>
              ) : (
                filteredProducts.map(p => {
                  const inCartQty = cart.find(item => item.product.id === p.id)?.quantity || 0;
                  const isOutOfStock = p.stock <= 0;
                  const hasReachedMax = inCartQty >= p.stock;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      disabled={isOutOfStock}
                      className={`p-3 text-left border rounded-xl flex items-start gap-3 transition ${
                        isOutOfStock 
                          ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                          : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm"
                      }`}
                    >
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-12 h-12 rounded-lg object-cover border border-slate-150 shrink-0 shadow-sm" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full min-h-[48px]">
                        <div className="w-full">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-extrabold text-slate-800 line-clamp-1">{p.name}</span>
                            {inCartQty > 0 && (
                              <span className="text-[10px] bg-blue-100 text-[#1E88E5] px-1.5 py-0.5 rounded-full font-black shrink-0">
                                x{inCartQty}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 leading-tight">{p.description || "Sem descrição"}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.cost !== undefined && p.cost > 0 && (
                              <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                Custo: R$ {p.cost.toFixed(2)}
                              </span>
                            )}
                            {p.cost !== undefined && p.cost > 0 && p.price > p.cost && (
                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                                Lucro: R$ {(p.price - p.cost).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-slate-50">
                          <span className="text-xs font-black text-emerald-600 font-mono">
                            R$ {p.price.toFixed(2)}
                          </span>

                          <div className="text-right">
                            <span className={`text-[9px] font-bold ${
                              p.stock <= p.minStockAlert ? "text-amber-500" : "text-slate-400"
                            }`}>
                              Estoque: {p.stock} un
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SHOPPING CART & TOTALS & CHECKOUT (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              Carrinho de Compras
            </h3>

            {/* CART ITEMS CONTAINER */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[180px] max-h-[260px] pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold">Carrinho vazio</p>
                  <p className="text-[10px]">Selecione os produtos para iniciar o fechamento</p>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 truncate">{item.product.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-[10px] text-[#1E88E5] font-black font-mono">
                          R$ {item.product.price.toFixed(2)} / un
                        </span>
                        {item.product.cost !== undefined && item.product.cost > 0 && (
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            (Custo: R$ {item.product.cost.toFixed(2)})
                          </span>
                        )}
                        {item.product.cost !== undefined && item.product.cost > 0 && item.product.price > item.product.cost && (
                          <span className="text-[9px] font-bold text-emerald-600 font-mono">
                            (Lucro: R$ {(item.product.price - item.product.cost).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="p-1 hover:bg-slate-100 active:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                        title="Diminuir 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={item.product.stock}
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            handleSetExactQuantity(item.product.id, 0);
                            return;
                          }
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed)) {
                            handleSetExactQuantity(item.product.id, parsed);
                          }
                        }}
                        onBlur={() => {
                          if (!item.quantity || item.quantity <= 0) {
                            handleSetExactQuantity(item.product.id, 1);
                          }
                        }}
                        className="w-12 text-center font-black text-slate-800 text-xs font-mono bg-slate-50 border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Clique para digitar a quantidade desejada"
                      />

                      <button
                        type="button"
                        onClick={() => handlePlusClick(item.product.id, item.quantity, item.product.name, item.product.stock)}
                        className="p-1 hover:bg-slate-100 active:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                        title="Adicionar / Digitar quantidade via prompt"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right font-black text-slate-700 font-mono shrink-0 min-w-[70px]">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* GARANTIA & OBSERVAÇÕES */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                {/* Garantia do Produto / Venda */}
                <div>
                  <label className="text-[10px] font-extrabold text-[#1E88E5] uppercase tracking-wide block mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Garantia do Produto / Venda</span>
                  </label>
                  <input
                    type="text"
                    value={garantia}
                    onChange={(e) => setGarantia(e.target.value)}
                    placeholder="Ex: Garantia de 30 dias..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      "Garantia de 90 dias (3 meses)",
                      "Garantia de 30 dias",
                      "Garantia de 6 meses",
                      "Garantia de 1 ano",
                      "Sem garantia"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGarantia(preset)}
                        className={`px-2.5 py-1 text-[10px] rounded-lg font-bold border transition cursor-pointer ${
                          garantia === preset
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observações da Venda */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Observações da Venda (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Termos de troca ou observações gerais..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#1E88E5] transition"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      "Sem direito a troca por mau uso",
                      "Troca somente com nota fiscal",
                      "Película de vidro sem garantia de queda"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setObservations(prev => prev ? `${prev} - ${preset}` : preset)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-[10px] text-slate-600 hover:text-[#1E88E5] rounded-lg font-bold border border-slate-200/60 transition cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DISCOUNT & PAYMENT CONTROLS */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-4">
                {/* Discount Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Tipo de Desconto</label>
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType("value");
                          setDiscount("");
                        }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                          discountType === "value" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Valor (R$)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType("percent");
                          setDiscount("");
                        }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                          discountType === "percent" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Porcentagem (%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Desconto</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={discount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setDiscount("");
                        } else {
                          setDiscount(Math.max(0, Number(val) || 0).toString());
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Method selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Forma de Pagamento</label>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {method === "split" ? "Dividido / Misto" : "Único"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMethod("cash")}
                      className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold transition text-center flex flex-col items-center gap-1 ${
                        method === "cash" 
                          ? "border-[#1E88E5] bg-blue-50 text-[#1E88E5] shadow-sm" 
                          : "border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      DINHEIRO
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("pix")}
                      className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold transition text-center flex flex-col items-center gap-1 ${
                        method === "pix" 
                          ? "border-[#1E88E5] bg-blue-50 text-[#1E88E5] shadow-sm" 
                          : "border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                      PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("debit")}
                      className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold transition text-center flex flex-col items-center gap-1 ${
                        method === "debit" 
                          ? "border-[#1E88E5] bg-blue-50 text-[#1E88E5] shadow-sm" 
                          : "border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      DÉBITO
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("credit")}
                      className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold transition text-center flex flex-col items-center gap-1 ${
                        method === "credit" 
                          ? "border-[#1E88E5] bg-blue-50 text-[#1E88E5] shadow-sm" 
                          : "border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      CRÉDITO
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("split")}
                      className={`col-span-2 sm:col-span-1 py-2 px-1 rounded-xl border text-[10px] font-extrabold transition text-center flex flex-col items-center gap-1 ${
                        method === "split" 
                          ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" 
                          : "border-slate-100 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      MISTO / DIVIDIR
                    </button>
                  </div>
                </div>

                {/* SPLIT / MULTI-PAYMENT CALCULATOR */}
                {method === "split" && (
                  <div className="space-y-3 p-3.5 bg-purple-50/40 border border-purple-200/70 rounded-2xl">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                      <div>
                        <span className="text-[11px] font-extrabold text-purple-900 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          Divisão do Pagamento
                        </span>
                        <p className="text-[9px] text-purple-700 font-medium">
                          Total da venda: <strong className="font-mono font-black">R$ {totalAmount.toFixed(2)}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitCash("");
                          setSplitCashGiven("");
                          setSplitPix("");
                          setSplitDebit("");
                          setSplitCredit("");
                        }}
                        className="text-[9px] font-bold text-purple-700 hover:text-purple-900 underline"
                      >
                        Limpar Campos
                      </button>
                    </div>

                    {/* Quick 50/50 Division Presets */}
                    <div>
                      <span className="text-[9px] font-extrabold text-purple-800 uppercase tracking-wide block mb-1">
                        ⚡ Atalhos Rápidos (Divisão 50% / 50%):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSplitHalf("cash", "pix")}
                          className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                        >
                          💵 Dinheiro + ✨ Pix
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSplitHalf("cash", "debit")}
                          className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                        >
                          💵 Dinheiro + 💳 Débito
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSplitHalf("cash", "credit")}
                          className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                        >
                          💵 Dinheiro + 💳 Crédito
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSplitHalf("pix", "credit")}
                          className="px-2 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-900 transition flex items-center justify-center gap-1 text-center shadow-xs"
                        >
                          ✨ Pix + 💳 Cartão
                        </button>
                      </div>
                    </div>

                    {/* Input Rows for Each Payment Method */}
                    <div className="space-y-2 pt-1">
                      {/* 1. DINHEIRO */}
                      <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-extrabold text-slate-700 uppercase">Dinheiro</span>
                          </div>
                          {splitRemaining > 0 && splitCashNum === 0 && (
                            <button
                              type="button"
                              onClick={() => handleFillRemaining("cash")}
                              className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Valor da Parcela</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                              <input
                                type="text"
                                placeholder="0,00"
                                className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                value={splitCash}
                                onChange={(e) => setSplitCash(e.target.value.replace(/[^0-9.,]/g, ""))}
                              />
                            </div>
                          </div>
                          {splitCashNum > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[9px] font-bold text-amber-700 block">Entregue pelo Cliente</label>
                                {splitCashChange > 0 && (
                                  <span className="text-[9px] font-black text-amber-800">
                                    Troco: R$ {splitCashChange.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-xs font-bold text-amber-600">R$</span>
                                <input
                                  type="text"
                                  placeholder={splitCash || "0,00"}
                                  className="w-full pl-7 pr-2 py-1 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-black text-amber-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  value={splitCashGiven}
                                  onChange={(e) => setSplitCashGiven(e.target.value.replace(/[^0-9.,]/g, ""))}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. PIX */}
                      <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-extrabold text-slate-700 uppercase">PIX</span>
                          </div>
                          {splitRemaining > 0 && splitPixNum === 0 && (
                            <button
                              type="button"
                              onClick={() => handleFillRemaining("pix")}
                              className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="text"
                            placeholder="0,00"
                            className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            value={splitPix}
                            onChange={(e) => setSplitPix(e.target.value.replace(/[^0-9.,]/g, ""))}
                          />
                        </div>
                      </div>

                      {/* 3. CARTÃO DE DÉBITO */}
                      <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[10px] font-extrabold text-slate-700 uppercase">Cartão de Débito</span>
                          </div>
                          {splitRemaining > 0 && splitDebitNum === 0 && (
                            <button
                              type="button"
                              onClick={() => handleFillRemaining("debit")}
                              className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="text"
                            placeholder="0,00"
                            className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            value={splitDebit}
                            onChange={(e) => setSplitDebit(e.target.value.replace(/[^0-9.,]/g, ""))}
                          />
                        </div>
                      </div>

                      {/* 4. CARTÃO DE CRÉDITO */}
                      <div className="p-2.5 bg-white border border-purple-100 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-[10px] font-extrabold text-slate-700 uppercase">Cartão de Crédito</span>
                          </div>
                          {splitRemaining > 0 && splitCreditNum === 0 && (
                            <button
                              type="button"
                              onClick={() => handleFillRemaining("credit")}
                              className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              + Preencher Restante (R$ {splitRemaining.toFixed(2)})
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="text"
                            placeholder="0,00"
                            className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            value={splitCredit}
                            onChange={(e) => setSplitCredit(e.target.value.replace(/[^0-9.,]/g, ""))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Split Balance Summary Box */}
                    <div className="p-2.5 rounded-xl border space-y-1.5 bg-white text-xs">
                      <div className="flex justify-between items-center text-slate-600 font-bold">
                        <span>Total Distribuído:</span>
                        <span className="font-mono text-slate-900">R$ {splitTotalPaid.toFixed(2)} de R$ {totalAmount.toFixed(2)}</span>
                      </div>

                      {/* Status indicator */}
                      {splitRemaining === 0 && splitOverpaid === 0 && splitTotalPaid > 0 && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-[10px] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Total 100% preenchido e conferido!
                          </span>
                          {splitCashChange > 0 && (
                            <span className="text-amber-800 font-black">
                              Troco Dinheiro: R$ {splitCashChange.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}

                      {splitRemaining > 0 && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold text-[10px] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Falta distribuir:
                          </span>
                          <span className="font-black text-amber-700 font-mono text-xs">
                            R$ {splitRemaining.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {splitOverpaid > 0 && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 font-bold text-[10px] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            Valor ultrapassou o total em:
                          </span>
                          <span className="font-black text-red-700 font-mono text-xs">
                            R$ {splitOverpaid.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* If cash, show received calculation */}
                {method === "cash" && (
                  <div className="space-y-2 p-3 bg-amber-50/50 border border-amber-100/30 rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wide block mb-1">Valor Recebido</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-amber-700">R$</span>
                          <input
                            type="text"
                            placeholder="0,00"
                            className="w-full pl-7 pr-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                          />
                        </div>
                      </div>

                      <div className="text-right flex flex-col justify-center">
                        <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wide">Troco a Devolver</span>
                        <p className="text-base font-black text-amber-700 font-mono">
                          R$ {change.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Payment Helpers */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-amber-100/30">
                      <button
                        type="button"
                        onClick={() => setReceivedAmount(totalAmount.toFixed(2))}
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-[9px] font-extrabold rounded text-amber-900 transition"
                      >
                        Troco Zero
                      </button>
                      {[10, 20, 50, 100, 200].map(val => {
                        if (val >= totalAmount) {
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setReceivedAmount(val.toFixed(2))}
                              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200/60 text-[9px] font-extrabold rounded text-slate-700 transition"
                            >
                              R$ {val}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {/* MATH RESULTS SUMMARY */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Subtotal</span>
                    <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between text-red-500 font-semibold">
                      <span>Desconto</span>
                      <span className="font-mono">- R$ {calculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 font-black text-sm pt-2 border-t border-slate-100 mt-2">
                    <span>Total da Venda</span>
                    <span className="font-mono text-emerald-600">R$ {totalAmount.toFixed(2)}</span>
                  </div>
                  {totalCost > 0 && (
                    <div className="flex justify-between text-blue-600 font-bold border-t border-dashed border-slate-250 pt-1.5 mt-1.5">
                      <span>Lucro Estimado</span>
                      <span className="font-mono">R$ {estimatedProfit.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleFinalizeSale}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      PROCESSANDO...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      FINALIZAR & GERAR RECIBO
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REUSABLE SCANNER MODAL OVERLAY */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl">
            <ProductScanner
              onClose={() => setScannerOpen(false)}
              mode="select"
              onProductScanned={handleProductScanned}
            />
          </div>
        </div>
      )}

      {/* EXTRATO DE VENDAS MODAL OVERLAY */}
      {extratoOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-slate-50 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#1E88E5] rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">Extrato Detalhado de Vendas</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Linhas cronológicas com horário exato, itens, pagamentos e totais</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchVendas}
                  disabled={loadingVendas}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingVendas ? "animate-spin text-blue-600" : ""}`} />
                </button>
                <button
                  onClick={() => setExtratoOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <ExtratoVendasReport
                vendas={vendasList}
                closedOrders={[]}
                reportType="daily"
                reportDate={new Date().toISOString().split("T")[0]}
                reportStartDate={new Date().toISOString().split("T")[0]}
                reportEndDate={new Date().toISOString().split("T")[0]}
                onPrintReceipt={(content) => onSaleSuccess(content, "", "")}
                onRefresh={fetchVendas}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
