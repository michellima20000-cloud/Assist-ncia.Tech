import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag, ArrowLeft, Search, Filter, Printer, FileSpreadsheet, Send,
  CheckCircle2, AlertTriangle, Package, RefreshCw, Plus, Check, X,
  ExternalLink, Copy, CheckCheck, TrendingUp, DollarSign, Layers,
  ChevronDown, ChevronUp, Sparkles, HelpCircle, Phone, Clock, ArrowDownToLine
} from "lucide-react";
import { Produto, Venda, Atendimento, Despesa } from "../types";

interface ListaReposicaoProps {
  onBack: () => void;
  onPrintReceipt?: (content: string) => void;
  initialView?: 'sold' | 'select' | 'shopping_list' | 'low_stock' | 'flagged' | 'all';
}

type PeriodFilter = 'today' | '7days' | 'month' | '30days' | 'all' | 'custom';
type StatusFilter = 'sold_only' | 'flagged' | 'need_buy' | 'low_stock' | 'out_of_stock' | 'all_catalog';

export default function ListaReposicao({ onBack, onPrintReceipt, initialView = 'sold' }: ListaReposicaoProps) {
  const [products, setProducts] = useState<Produto[]>([]);
  const [sales, setSales] = useState<Venda[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Status Filter initialization based on initialView prop
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (initialView === 'select') return 'all_catalog';
    if (initialView === 'shopping_list') return 'need_buy';
    if (initialView === 'low_stock') return 'low_stock';
    if (initialView === 'flagged') return 'flagged';
    return 'sold_only'; // Default for "REPOSIÇÃO" dashboard button (O que vendi)
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

  // Custom adjusted quantities for purchase (id -> quantity to order)
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  
  // UI states
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingItems, setReceivingItems] = useState(false);
  const [recordExpenseOnReceive, setRecordExpenseOnReceive] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringProduct, setConfiguringProduct] = useState<Produto | null>(null);
  const [configForm, setConfigForm] = useState({
    autoRestock: true,
    minStockAlert: 5,
    targetStock: 10,
    cost: 0,
    supplier: "",
    supplierPhone: ""
  });

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resVendas, resAtend] = await Promise.all([
        fetch("/api/produtos"),
        fetch("/api/vendas"),
        fetch("/api/atendimentos")
      ]);

      if (resProd.ok) {
        const prodData = await resProd.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
      if (resVendas.ok) {
        const vendData = await resVendas.json();
        setSales(Array.isArray(vendData) ? vendData : []);
      }
      if (resAtend.ok) {
        const atendData = await resAtend.json();
        setAtendimentos(Array.isArray(atendData) ? atendData : []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados para lista de compras", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute date range according to periodFilter
  const dateRange = useMemo(() => {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (periodFilter === 'today') {
      // today start to end
    } else if (periodFilter === '7days') {
      start.setDate(now.getDate() - 7);
    } else if (periodFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodFilter === '30days') {
      start.setDate(now.getDate() - 30);
    } else if (periodFilter === 'all') {
      start = new Date(2020, 0, 1);
    } else if (periodFilter === 'custom') {
      start = new Date(startDate + "T00:00:00");
      end.setTime(new Date(endDate + "T23:59:59").getTime());
    }

    return { start, end };
  }, [periodFilter, startDate, endDate]);

  // Calculate sold units per product in the selected period
  const salesStatsMap = useMemo(() => {
    const map = new Map<string, { quantitySold: number; revenue: number; ordersCount: number }>();

    // 1. Direct Sales
    sales.forEach(v => {
      if (!v.date) return;
      const vDate = new Date(v.date);
      if (vDate < dateRange.start || vDate > dateRange.end) return;

      (v.items || []).forEach(item => {
        const pId = item.productId;
        if (!pId) return;
        const current = map.get(pId) || { quantitySold: 0, revenue: 0, ordersCount: 0 };
        current.quantitySold += Number(item.quantity) || 0;
        current.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        current.ordersCount += 1;
        map.set(pId, current);
      });
    });

    // 2. Service Orders (only finalized or closed)
    atendimentos.forEach(a => {
      if (a.status !== "finalizado") return;
      const aDate = new Date(a.exitDate || a.entryDate);
      if (aDate < dateRange.start || aDate > dateRange.end) return;

      (a.products || []).forEach(item => {
        const pId = item.productId;
        if (!pId) return;
        const current = map.get(pId) || { quantitySold: 0, revenue: 0, ordersCount: 0 };
        current.quantitySold += Number(item.quantity) || 0;
        current.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        current.ordersCount += 1;
        map.set(pId, current);
      });
    });

    return map;
  }, [sales, atendimentos, dateRange]);

  // List of unique suppliers from products
  const availableSuppliers = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => {
      if (p.supplier && p.supplier.trim()) {
        s.add(p.supplier.trim());
      }
    });
    return Array.from(s).sort();
  }, [products]);

  // Process and compute item details for replenishment
  const computedItems = useMemo(() => {
    return products.map(p => {
      const stats = salesStatsMap.get(p.id) || { quantitySold: 0, revenue: 0, ordersCount: 0 };
      const currentStock = Number(p.stock) || 0;
      const minStock = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? Number(p.minStockAlert) : 5;
      const targetStock = p.targetStock ? Number(p.targetStock) : (minStock + 5);
      const isAutoRestock = p.autoRestock === true;
      const unitCost = Number(p.cost) || 0;
      const unitPrice = Number(p.price) || 0;

      // Smart recommended buy calculation:
      let recommendedBuy = 0;
      if (stats.quantitySold > 0) {
        recommendedBuy = stats.quantitySold;
      }
      if (isAutoRestock) {
        if (currentStock <= minStock) {
          const deficit = Math.max(0, targetStock - currentStock);
          recommendedBuy = Math.max(deficit, stats.quantitySold, recommendedBuy);
          if (recommendedBuy === 0 && currentStock <= minStock) {
            recommendedBuy = Math.max(1, minStock - currentStock);
          }
        }
      }

      // If user overrode quantity in customQuantities
      const buyQty = customQuantities[p.id] !== undefined ? customQuantities[p.id] : recommendedBuy;
      const totalEstimatedCost = buyQty * unitCost;

      const isOutOfStock = currentStock === 0;
      const isLowStock = currentStock > 0 && currentStock <= minStock;
      const hasSales = stats.quantitySold > 0;
      const needsReplenishment = isAutoRestock && (buyQty > 0 || isOutOfStock || isLowStock);

      return {
        product: p,
        quantitySold: stats.quantitySold,
        salesRevenue: stats.revenue,
        currentStock,
        minStock,
        targetStock,
        isAutoRestock,
        unitCost,
        unitPrice,
        recommendedBuy,
        buyQty,
        totalEstimatedCost,
        isOutOfStock,
        isLowStock,
        hasSales,
        needsReplenishment
      };
    });
  }, [products, salesStatsMap, customQuantities]);

  // Filter items
  const filteredItems = useMemo(() => {
    return computedItems.filter(item => {
      const p = item.product;
      
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (p.name || "").toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || "").toLowerCase().includes(q);
        const matchesSupplier = (p.supplier || "").toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode && !matchesSupplier) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all") {
        if ((p.supplier || "").trim() !== selectedSupplier) return false;
      }

      // Status filter
      if (statusFilter === 'sold_only') {
        return item.hasSales;
      }
      if (statusFilter === 'flagged') {
        return item.isAutoRestock;
      }
      if (statusFilter === 'need_buy') {
        return item.buyQty > 0 && (item.isAutoRestock || item.hasSales || item.isLowStock || item.isOutOfStock);
      }
      if (statusFilter === 'low_stock') {
        return item.isLowStock || item.isOutOfStock;
      }
      if (statusFilter === 'out_of_stock') {
        return item.isOutOfStock;
      }
      if (statusFilter === 'all_catalog') {
        return true;
      }

      return true;
    }).sort((a, b) => {
      // Sort priority: Sold items first if in sold tab, out of stock first if in low stock tab
      if (statusFilter === 'sold_only') {
        if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      }
      if (a.isOutOfStock && !b.isOutOfStock) return -1;
      if (!a.isOutOfStock && b.isOutOfStock) return 1;
      if (a.isLowStock && !b.isLowStock) return -1;
      if (!a.isLowStock && b.isLowStock) return 1;
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      return a.product.name.localeCompare(b.product.name);
    });
  }, [computedItems, searchQuery, selectedSupplier, statusFilter]);

  // Overall Statistics for Replenishment
  const replenishmentStats = useMemo(() => {
    const soldItems = computedItems.filter(i => i.quantitySold > 0);
    const flaggedItems = computedItems.filter(i => i.isAutoRestock);
    const toBuyItems = computedItems.filter(i => i.buyQty > 0 && (i.isAutoRestock || i.hasSales || i.isLowStock || i.isOutOfStock));
    const totalUnitsToBuy = toBuyItems.reduce((acc, i) => acc + i.buyQty, 0);
    const totalEstimatedBudget = toBuyItems.reduce((acc, i) => acc + i.totalEstimatedCost, 0);
    const totalSoldUnitsInPeriod = computedItems.reduce((acc, i) => acc + i.quantitySold, 0);
    const totalSoldRevenue = computedItems.reduce((acc, i) => acc + i.salesRevenue, 0);
    const outOfStockFlagged = products.filter(p => Number(p.stock) === 0).length;
    const lowStockFlagged = products.filter(p => {
      const s = Number(p.stock) || 0;
      const min = p.minStockAlert !== undefined && p.minStockAlert !== null ? Number(p.minStockAlert) : 5;
      return s > 0 && s <= min;
    }).length;

    return {
      soldCount: soldItems.length,
      flaggedCount: flaggedItems.length,
      toBuyCount: toBuyItems.length,
      totalUnitsToBuy,
      totalEstimatedBudget,
      totalSoldUnitsInPeriod,
      totalSoldRevenue,
      outOfStockFlagged,
      lowStockFlagged
    };
  }, [computedItems, products]);

  // Toggle Auto Restock Flag for a product
  const handleToggleAutoRestock = async (product: Produto, currentFlag: boolean) => {
    setSavingProductId(product.id);
    const updatedProd: Produto = {
      ...product,
      autoRestock: !currentFlag
    };

    try {
      const res = await fetch(`/api/produtos/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProd)
      });

      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === product.id ? updatedProd : p));
      } else {
        // Fallback POST /api/produtos if PUT not handled
        const resPost = await fetch(`/api/produtos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedProd)
        });
        if (resPost.ok) {
          setProducts(prev => prev.map(p => p.id === product.id ? updatedProd : p));
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar sinalização de reposição", err);
    } finally {
      setSavingProductId(null);
    }
  };

  // Quick flag all low stock items
  const handleFlagAllLowStock = async () => {
    const unflaggedLow = products.filter(p => !p.autoRestock && (Number(p.stock) || 0) <= ((p.minStockAlert !== undefined && p.minStockAlert !== null) ? Number(p.minStockAlert) : 5));
    if (unflaggedLow.length === 0) {
      alert("Todos os produtos com estoque baixo já estão sinalizados para reposição!");
      return;
    }

    if (!window.confirm(`Deseja sinalizar ${unflaggedLow.length} produto(s) com estoque baixo para reposição automática?`)) return;

    for (const p of unflaggedLow) {
      const updated = { ...p, autoRestock: true };
      await fetch(`/api/produtos/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      }).catch(console.error);
    }
    fetchData();
  };

  // Quick flag all sold items
  const handleFlagAllSold = async () => {
    const unflaggedSold = computedItems.filter(i => i.quantitySold > 0 && !i.isAutoRestock);
    if (unflaggedSold.length === 0) {
      alert("Todos os produtos com vendas já estão sinalizados para reposição!");
      return;
    }

    if (!window.confirm(`Deseja sinalizar ${unflaggedSold.length} produto(s) vendidos para reposição automática?`)) return;

    for (const item of unflaggedSold) {
      const updated = { ...item.product, autoRestock: true };
      await fetch(`/api/produtos/${item.product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      }).catch(console.error);
    }
    alert(`✅ ${unflaggedSold.length} produtos vendidos foram sinalizados para reposição!`);
    fetchData();
  };

  // Quick toggle all catalog items
  const handleToggleAllCatalog = async (flag: boolean) => {
    const targets = products.filter(p => !!p.autoRestock !== flag);
    if (targets.length === 0) {
      alert(flag ? "Todos os produtos já estão sinalizados!" : "Nenhum produto está sinalizado.");
      return;
    }

    if (!window.confirm(`Deseja ${flag ? "marcar TODOS" : "desmarcar TODOS"} os ${targets.length} produtos para reposição automática?`)) {
      return;
    }

    for (const p of targets) {
      const updated = { ...p, autoRestock: flag };
      await fetch(`/api/produtos/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      }).catch(console.error);
    }
    alert(`✅ ${targets.length} produtos atualizados com sucesso!`);
    fetchData();
  };

  // Open config modal for product
  const handleOpenConfig = (product: Produto) => {
    setConfiguringProduct(product);
    setConfigForm({
      autoRestock: product.autoRestock !== false,
      minStockAlert: (product.minStockAlert !== undefined && product.minStockAlert !== null) ? product.minStockAlert : 5,
      targetStock: product.targetStock || ((product.minStockAlert || 5) + 5),
      cost: product.cost || 0,
      supplier: product.supplier || "",
      supplierPhone: product.supplierPhone || ""
    });
    setShowConfigModal(true);
  };

  // Save product config modal
  const handleSaveProductConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringProduct) return;

    const updated: Produto = {
      ...configuringProduct,
      autoRestock: configForm.autoRestock,
      minStockAlert: Number(configForm.minStockAlert),
      targetStock: Number(configForm.targetStock),
      cost: Number(configForm.cost),
      supplier: configForm.supplier.trim(),
      supplierPhone: configForm.supplierPhone.trim()
    };

    setSavingProductId(configuringProduct.id);
    try {
      const res = await fetch(`/api/produtos/${configuringProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === configuringProduct.id ? updated : p));
        setShowConfigModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProductId(null);
    }
  };

  // Adjust buy quantity on the fly
  const handleQuantityChange = (productId: string, val: number) => {
    const sanitized = Math.max(0, val);
    setCustomQuantities(prev => ({
      ...prev,
      [productId]: sanitized
    }));
  };

  // Generate WhatsApp Order Message
  const generateWhatsAppMessage = () => {
    const itemsToOrder = computedItems.filter(i => i.buyQty > 0 && (i.isAutoRestock || statusFilter === 'sold_only' || statusFilter === 'need_buy' || i.hasSales));
    if (itemsToOrder.length === 0) return "Nenhum item com quantidade para compra.";

    const nowStr = new Date().toLocaleDateString("pt-BR");
    let text = `📦 *PEDIDO DE REPOSIÇÃO / COMPRAS*\n`;
    text += `📅 *Data:* ${nowStr}\n`;
    text += `🏪 *Minha Assistência.Tech*\n`;
    text += `--------------------------------\n\n`;

    itemsToOrder.forEach((item, idx) => {
      const p = item.product;
      const barcodeStr = p.barcode ? ` (Cód: ${p.barcode})` : "";
      text += `${idx + 1}. *${item.buyQty}x* ${p.name}${barcodeStr}\n`;
      if (item.unitCost > 0) {
        text += `   ↳ Custo unit: R$ ${item.unitCost.toFixed(2)} | Subtotal: R$ ${item.totalEstimatedCost.toFixed(2)}\n`;
      }
    });

    text += `\n--------------------------------\n`;
    text += `📊 *Total de Itens Diferentes:* ${itemsToOrder.length}\n`;
    text += `📦 *Total de Peças/Unidades:* ${replenishmentStats.totalUnitsToBuy} un\n`;
    if (replenishmentStats.totalEstimatedBudget > 0) {
      text += `💰 *Orçamento Estimado:* R$ ${replenishmentStats.totalEstimatedBudget.toFixed(2)}\n`;
    }
    text += `\n_Favor confirmar disponibilidade e prazo de entrega. Obrigado!_`;

    return text;
  };

  // Copy WhatsApp Message
  const handleCopyWhatsApp = () => {
    const msg = generateWhatsAppMessage();
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const itemsToExport = computedItems.filter(i => i.buyQty > 0 && (i.isAutoRestock || statusFilter === 'sold_only' || statusFilter === 'need_buy' || i.hasSales));
    if (itemsToExport.length === 0) {
      alert("Nenhum item com quantidade a comprar selecionado.");
      return;
    }

    let csv = "data:text/csv;charset=utf-8,";
    csv += "Produto;Codigo de Barras;Fornecedor;Estoque Atual;Estoque Minimo;Qtd Vendida no Periodo;Qtd a Comprar;Preco Custo (R$);Custo Total (R$);Preco Venda (R$)\n";

    itemsToExport.forEach(i => {
      const p = i.product;
      csv += `"${p.name}";"${p.barcode || ""}";"${p.supplier || ""}";${i.currentStock};${i.minStock};${i.quantitySold};${i.buyQty};${i.unitCost.toFixed(2)};${i.totalEstimatedCost.toFixed(2)};${i.unitPrice.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lista_compras_reposicao_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Thermal Shopping List
  const handlePrintShoppingList = () => {
    const itemsToPrint = computedItems.filter(i => i.buyQty > 0 && (i.isAutoRestock || statusFilter === 'sold_only' || statusFilter === 'need_buy' || i.hasSales));
    if (itemsToPrint.length === 0) {
      alert("Nenhum item na lista para comprar!");
      return;
    }

    const printStr = `LISTA DE COMPRAS & REPOSIÇÃO
DATA: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}
PERÍODO BASE: ${periodFilter === "today" ? "Vendas de Hoje" : periodFilter === "7days" ? "Últimos 7 dias" : periodFilter === "month" ? "Mês Atual" : "Histórico"}
--------------------------------
ITENS PARA COMPRAR:
${itemsToPrint.map((i, idx) => {
  const p = i.product;
  const barcode = p.barcode ? ` [${p.barcode}]` : "";
  return `${idx + 1}. [ ] ${i.buyQty}x ${p.name}${barcode}\n   Estoque: ${i.currentStock} un | Vendido: ${i.quantitySold} un\n   Custo Unit: R$ ${i.unitCost.toFixed(2)} | Sub: R$ ${i.totalEstimatedCost.toFixed(2)}`;
}).join("\n--------------------------------\n")}
--------------------------------
RESUMO DO PEDIDO:
- Variedades de Itens: ${itemsToPrint.length}
- Total de Peças: ${replenishmentStats.totalUnitsToBuy} un
- Custo Total Estimado: R$ ${replenishmentStats.totalEstimatedBudget.toFixed(2)}
--------------------------------
ASSINATURA RESPONSÁVEL:

________________________________
Minha Assistência.Tech`;

    if (onPrintReceipt) {
      onPrintReceipt(printStr);
    } else {
      alert("Conteúdo pronto para impressão:\n\n" + printStr);
    }
  };

  // Receive / Check-in Goods into Stock
  const handleConfirmReceiveStock = async () => {
    const itemsToReceive = computedItems.filter(i => i.buyQty > 0 && (i.isAutoRestock || statusFilter === 'sold_only' || statusFilter === 'need_buy' || i.hasSales));
    if (itemsToReceive.length === 0) return;

    setReceivingItems(true);
    let totalExpenseAmount = 0;
    const receivedSummaryList: string[] = [];

    try {
      // 1. Update stock for each product
      for (const item of itemsToReceive) {
        const p = item.product;
        const newStock = item.currentStock + item.buyQty;
        totalExpenseAmount += item.totalEstimatedCost;
        receivedSummaryList.push(`${item.buyQty}x ${p.name}`);

        const updatedProd: Produto = {
          ...p,
          stock: newStock
        };

        await fetch(`/api/produtos/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedProd)
        }).catch(console.error);
      }

      // 2. Optionally record an Expense in Despesas
      if (recordExpenseOnReceive && totalExpenseAmount > 0) {
        const newExpense: Despesa = {
          id: "desp-" + Date.now(),
          description: `Reposição de Estoque (${itemsToReceive.length} itens: ${receivedSummaryList.slice(0, 3).join(", ")}${receivedSummaryList.length > 3 ? "..." : ""})`,
          amount: totalExpenseAmount,
          date: new Date().toISOString()
        };

        await fetch("/api/despesas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newExpense)
        }).catch(console.error);
      }

      // Reset custom quantities
      setCustomQuantities({});
      setShowReceiveModal(false);
      alert(`✅ Entrada de mercadorias confirmada com sucesso!\n\n${itemsToReceive.length} produtos tiveram seus estoques aumentados no sistema.${recordExpenseOnReceive ? `\nDespesa de R$ ${totalExpenseAmount.toFixed(2)} lançada automaticamente no caixa.` : ""}`);
      fetchData();
    } catch (err) {
      console.error("Erro ao registrar entrada de estoque", err);
      alert("Erro ao salvar entrada de mercadorias.");
    } finally {
      setReceivingItems(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-2xl text-slate-500 transition"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800">Lista de Compras & Reposição Inteligente</h2>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                  Automática
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo baseado no histórico de vendas e nas peças sinalizadas para reposição
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyWhatsApp}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs ${
              copiedWhatsApp
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
            }`}
            title="Copiar lista formatada para enviar via WhatsApp para o fornecedor"
          >
            {copiedWhatsApp ? <CheckCheck className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>{copiedWhatsApp ? "Copiado p/ WhatsApp!" : "WhatsApp Pedido"}</span>
          </button>

          <button
            onClick={handlePrintShoppingList}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Imprimir Cupom Térmico / Bobina com a Lista de Compras"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir Térmica</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            title="Exportar Planilha Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button
            onClick={() => setShowReceiveModal(true)}
            disabled={replenishmentStats.toBuyCount === 0}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            title="Dar entrada rápida nos itens comprados no estoque"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Receber Mercadoria</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Card 1: Itens a Comprar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Itens p/ Repor</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2 font-mono">
            {replenishmentStats.toBuyCount} <span className="text-xs font-normal text-slate-400">produtos</span>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-bold mt-1">
            <span>{replenishmentStats.flaggedCount} sinalizados no total</span>
          </div>
        </div>

        {/* Card 2: Total Peças a Comprar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Peças / Unidades</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2 font-mono">
            {replenishmentStats.totalUnitsToBuy} <span className="text-xs font-normal text-slate-400">unidades</span>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1">
            <span>Vendas no período: {replenishmentStats.totalSoldUnitsInPeriod} un</span>
          </div>
        </div>

        {/* Card 3: Orçamento Estimado */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Custo Estimado</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2 font-mono">
            R$ {replenishmentStats.totalEstimatedBudget.toFixed(2)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold mt-1">
            <span>Investimento para repor</span>
          </div>
        </div>

        {/* Card 4: Itens Críticos */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Críticos / Baixos</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2 font-mono">
            {replenishmentStats.outOfStockFlagged + replenishmentStats.lowStockFlagged} <span className="text-xs font-normal text-slate-400">críticos</span>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-bold mt-1">
            <span>{replenishmentStats.outOfStockFlagged} esgotados (0 un)</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        {/* Row 1: Period selector & Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Período de Vendas:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  periodFilter === 'today' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriodFilter('7days')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  periodFilter === '7days' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  periodFilter === 'month' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Este Mês
              </button>
              <button
                onClick={() => setPeriodFilter('30days')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  periodFilter === '30days' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  periodFilter === 'all' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Histórico Todo
              </button>
              <button
                onClick={() => setPeriodFilter('custom')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  periodFilter === 'custom' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Datas
              </button>
            </div>
          </div>

          {/* Quick Helper Button */}
          <button
            onClick={handleFlagAllLowStock}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Sinalizar Todos com Baixo Estoque</span>
          </button>
        </div>

        {/* Custom date range inputs if selected */}
        {periodFilter === 'custom' && (
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
            <span className="font-bold text-slate-700">Intervalo Personalizado:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">De:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">Até:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs outline-none"
              />
            </div>
          </div>
        )}

        {/* Row 2: Status Category Tabs */}
        <div className="flex p-1 bg-slate-100/90 rounded-2xl gap-1 overflow-x-auto">
          {/* Tab 1: O Que Vendi */}
          <button
            onClick={() => setStatusFilter('sold_only')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'sold_only'
                ? "bg-white text-blue-800 shadow-sm ring-1 ring-blue-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>O Que Vendi</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              statusFilter === 'sold_only' ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {replenishmentStats.soldCount}
            </span>
          </button>

          {/* Tab 2: Lista de Compras Pronta */}
          <button
            onClick={() => setStatusFilter('need_buy')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'need_buy'
                ? "bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lista de Compras</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              statusFilter === 'need_buy' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {replenishmentStats.toBuyCount}
            </span>
          </button>

          {/* Tab 3: Selecionar Produtos (Catálogo) */}
          <button
            onClick={() => setStatusFilter('all_catalog')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'all_catalog'
                ? "bg-white text-indigo-900 shadow-sm ring-1 ring-indigo-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Selecionar Produtos (Catálogo)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              statusFilter === 'all_catalog' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {products.length}
            </span>
          </button>

          {/* Tab 4: Estoque Baixo / Crítico */}
          <button
            onClick={() => setStatusFilter('low_stock')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'low_stock'
                ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Estoque Baixo</span>
            {(replenishmentStats.outOfStockFlagged + replenishmentStats.lowStockFlagged) > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                statusFilter === 'low_stock' ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
              }`}>
                {replenishmentStats.outOfStockFlagged + replenishmentStats.lowStockFlagged}
              </span>
            )}
          </button>

          {/* Tab 5: Sinalizados para Reposição */}
          <button
            onClick={() => setStatusFilter('flagged')}
            className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'flagged'
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Sinalizados ({replenishmentStats.flaggedCount})</span>
          </button>
        </div>

        {/* Contextual Guidance & Quick Action Banner */}
        {statusFilter === 'sold_only' && (
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="font-black text-blue-950">Visualizando: Itens Vendidos no Período ({replenishmentStats.soldCount} produtos)</p>
                <p className="text-[11px] text-blue-700">Tudo o que saiu nas Vendas e Ordens de Serviço. As quantidades sugeridas repõem exatamente o que foi vendido.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFlagAllSold}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sinalizar Todos os Vendidos p/ Reposição</span>
              </button>
            </div>
          </div>
        )}

        {statusFilter === 'all_catalog' && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="font-black text-indigo-950">Visualizando: Catálogo Completo ({products.length} produtos)</p>
                <p className="text-[11px] text-indigo-700">Ative ou desative a chave "Sinalizar Reposição" nos produtos que você quer manter na rotina de compras.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleToggleAllCatalog(true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl shadow-xs transition"
              >
                Marcar Todos
              </button>
              <button
                onClick={handleFlagAllLowStock}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-xl shadow-xs transition"
              >
                Marcar Só Estoque Baixo
              </button>
              <button
                onClick={() => handleToggleAllCatalog(false)}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-xl transition"
              >
                Desmarcar Todos
              </button>
            </div>
          </div>
        )}

        {statusFilter === 'need_buy' && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="font-black text-emerald-950">Visualizando: Pedido Consolidado de Compras ({replenishmentStats.toBuyCount} produtos • {replenishmentStats.totalUnitsToBuy} peças)</p>
                <p className="text-[11px] text-emerald-700">Total estimado: <strong>R$ {replenishmentStats.totalEstimatedBudget.toFixed(2)}</strong>. Envie por WhatsApp, imprima na bobina térmica ou receba no estoque.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Pedido</span>
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Search Bar & Supplier filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome do produto, código de barras ou fornecedor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-blue-400 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {availableSuppliers.length > 0 ? (
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Todos os Fornecedores</option>
              {availableSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center text-[11px] text-slate-400 italic px-2">
              Dica: você pode definir fornecedores no cadastro de cada produto.
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT LIST / REPLENISHMENT TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">
              Produtos & Peças ({filteredItems.length} exibidos)
            </h3>
            <p className="text-[11px] text-slate-400">
              {statusFilter === 'all_catalog'
                ? "Ative a chave 'Reposição' para incluir produtos na rotina automatizada de compras."
                : "Ajuste a quantidade recomendada diretamente no campo caso queira alterar o pedido."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Legenda:</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-lg">Esgotado (0)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg">Estoque Baixo</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg">Estoque OK</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Carregando lista de reposição e vendas...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800">Nenhum produto encontrado neste filtro</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {statusFilter === 'flagged'
                ? "Nenhum produto está atualmente sinalizado para reposição automática. Alterne para 'Catálogo Geral' para marcar quais produtos você deseja repor conforme forem vendidos!"
                : "Tente alterar os filtros de busca ou período acima."}
            </p>
            {statusFilter === 'flagged' && (
              <button
                onClick={() => setStatusFilter('all_catalog')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Abrir Catálogo Geral e Sinalizar Itens
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-100">
                  <th className="py-3 px-4 text-center w-24">Sinalizar Reposição</th>
                  <th className="py-3 px-4">Produto / Peça</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-center">Vendido no Período</th>
                  <th className="py-3 px-4 text-center">Qtd a Comprar</th>
                  <th className="py-3 px-4 text-right">Custo Unit.</th>
                  <th className="py-3 px-4 text-right">Custo Total</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredItems.map(item => {
                  const p = item.product;
                  const isFlagged = item.isAutoRestock;
                  const isSaving = savingProductId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition ${
                        item.buyQty > 0 && isFlagged ? "bg-indigo-50/20" : ""
                      }`}
                    >
                      {/* Toggle Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleToggleAutoRestock(p, isFlagged)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isFlagged ? "bg-indigo-600" : "bg-slate-200"
                          } ${isSaving ? "opacity-50" : ""}`}
                          title={isFlagged ? "Sinalizado para reposição automática. Clique para desativar." : "Clique para sinalizar este produto para reposição."}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isFlagged ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Product Name & Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 font-bold">
                              📦
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-800 text-xs truncate">{p.name}</p>
                              {isFlagged && (
                                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-indigo-100">
                                  REPOR
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                              {p.barcode && <span>Cód: {p.barcode}</span>}
                              {p.supplier && <span className="text-slate-500 font-sans font-semibold">🏢 {p.supplier}</span>}
                              {p.warranty && <span className="text-blue-600 font-sans font-medium">🛡️ {p.warranty}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          item.isOutOfStock ? "bg-red-100 text-red-700 border border-red-200" :
                          item.isLowStock ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {item.currentStock} un
                        </span>
                        <span className="block text-[9px] text-slate-400 font-sans mt-0.5">
                          mín: {item.minStock} | alvo: {item.targetStock}
                        </span>
                      </td>

                      {/* Units Sold in Period */}
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                          item.quantitySold > 0 ? "bg-blue-50 text-blue-700 border border-blue-100" : "text-slate-400"
                        }`}>
                          {item.quantitySold} {item.quantitySold === 1 ? 'un' : 'un'}
                        </span>
                        {item.salesRevenue > 0 && (
                          <span className="block text-[9px] text-emerald-600 font-sans font-bold mt-0.5">
                            R$ {item.salesRevenue.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Recommended / Buy Quantity (Editable) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, item.buyQty - 1)}
                            className="w-6 h-6 bg-white hover:bg-slate-200 rounded-lg text-slate-700 font-black text-xs flex items-center justify-center transition"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.buyQty}
                            onChange={e => handleQuantityChange(p.id, parseInt(e.target.value) || 0)}
                            className="w-12 text-center bg-transparent font-mono font-black text-xs text-slate-800 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, item.buyQty + 1)}
                            className="w-6 h-6 bg-white hover:bg-slate-200 rounded-lg text-slate-700 font-black text-xs flex items-center justify-center transition"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        R$ {item.unitCost.toFixed(2)}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                        <span className={item.buyQty > 0 ? "text-emerald-700 font-bold" : "text-slate-400"}>
                          R$ {item.totalEstimatedCost.toFixed(2)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenConfig(p)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            title="Configurar limites de reposição e fornecedor"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>

                          {p.supplierPhone && (
                            <a
                              href={`https://wa.me/55${p.supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de pedir cotação/reposição de ${item.buyQty > 0 ? item.buyQty : 1}x ${p.name}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                              title={`Chamar fornecedor no WhatsApp (${p.supplierPhone})`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CONFIGURAÇÃO DE REPOSIÇÃO DO PRODUTO */}
      {showConfigModal && configuringProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Parâmetros de Reposição</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{configuringProduct.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductConfig} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-indigo-950 text-xs">Reposição Automática</p>
                  <p className="text-[10px] text-indigo-700">Incluir na lista de compras quando vendido</p>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.autoRestock}
                  onChange={e => setConfigForm({ ...configForm, autoRestock: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Alerta Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={configForm.minStockAlert}
                    onChange={e => setConfigForm({ ...configForm, minStockAlert: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none"
                  />
                  <span className="text-[9px] text-slate-400">Avisa quando chegar neste nível</span>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Estoque Alvo / Ideal</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={configForm.targetStock}
                    onChange={e => setConfigForm({ ...configForm, targetStock: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none"
                  />
                  <span className="text-[9px] text-slate-400">Quantidade ideal na loja</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={configForm.cost}
                  onChange={e => setConfigForm({ ...configForm, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Nome Fornecedor</label>
                  <input
                    type="text"
                    value={configForm.supplier}
                    onChange={e => setConfigForm({ ...configForm, supplier: e.target.value })}
                    placeholder="Distribuidora Tech"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">WhatsApp Fornecedor</label>
                  <input
                    type="text"
                    value={configForm.supplierPhone}
                    onChange={e => setConfigForm({ ...configForm, supplierPhone: e.target.value })}
                    placeholder="11999999999"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProductId === configuringProduct.id}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Salvar Parâmetros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEBIMENTO DE MERCADORIA / ATUALIZAÇÃO EM LOTE */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Confirmar Recebimento de Mercadorias</h3>
                  <p className="text-[11px] text-slate-400">Entrada de produtos comprados no estoque</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Você está prestes a somar as quantidades abaixo diretamente no saldo de estoque do sistema:
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                {computedItems
                  .filter(i => i.buyQty > 0 && (i.isAutoRestock || statusFilter === 'sold_only' || statusFilter === 'need_buy' || i.hasSales))
                  .map(i => (
                    <div key={i.product.id} className="flex justify-between items-center pt-1.5 first:pt-0">
                      <div>
                        <p className="font-bold text-slate-800">{i.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Estoque atual: {i.currentStock} un ➔ Novo estoque: <strong>{i.currentStock + i.buyQty} un</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-indigo-600 font-mono">+{i.buyQty} un</span>
                        <p className="text-[10px] text-slate-500 font-mono">R$ {i.totalEstimatedCost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-2xl font-mono">
                <span className="font-bold text-emerald-950 text-xs font-sans">Valor Total da Compra:</span>
                <span className="text-sm font-black text-emerald-700">R$ {replenishmentStats.totalEstimatedBudget.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/60 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  id="record_expense_toggle"
                  checked={recordExpenseOnReceive}
                  onChange={e => setRecordExpenseOnReceive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="record_expense_toggle" className="font-semibold text-slate-700 cursor-pointer text-xs">
                  Lançar despesa de R$ {replenishmentStats.totalEstimatedBudget.toFixed(2)} automaticamente no caixa (Compra de Peças)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={receivingItems}
                  onClick={handleConfirmReceiveStock}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {receivingItems ? "Atualizando Estoque..." : "Confirmar Entrada no Estoque"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
