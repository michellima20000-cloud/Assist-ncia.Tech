import React, { useState, useEffect } from "react";
import FinancialChart from "./FinancialChart";
import WeeklySalesChart from "./WeeklySalesChart";
import {
  FileText, History, Settings, ShieldAlert, Award, ArrowLeft, Plus, Trash2, Edit, Save,
  Users, DollarSign, Tag, ListPlus, FileSpreadsheet, Printer, Search, RefreshCw, Barcode, Eye, QrCode, X,
  Camera, Image, TrendingUp, AlertTriangle, Package, PackageCheck, PackageX, Flame, ShoppingBag
} from "lucide-react";
import {
  Servico, Produto, Despesa, Convenio, Marca, Item, User, Atendimento, Cliente
} from "../types";
import { compressImage } from "../lib/imageCompressor";

interface AdminPanelProps {
  onBack: () => void;
  onPrintReceipt: (content: string) => void;
}

export default function AdminPanel({ onBack, onPrintReceipt }: AdminPanelProps) {
  const [activeMenu, setActiveMenu] = useState<'main' | 'reports' | 'history' | 'services' | 'products' | 'expenses' | 'users' | 'auxiliary'>('main');

  // Relatórios States
  const [reportType, setReportType] = useState<'daily' | 'range' | 'annual'>('daily');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportDetailed, setReportDetailed] = useState(true);
  const [reportResult, setReportResult] = useState<any>(null);
  const [reportViewTab, setReportViewTab] = useState<'finance' | 'top_sellers' | 'inventory'>('finance');
  const [topSellersSearch, setTopSellersSearch] = useState("");

  // Histórico States
  const [historySearch, setHistorySearch] = useState("");
  const [historyOrders, setHistoryOrders] = useState<Atendimento[]>([]);
  const [allClients, setAllClients] = useState<Cliente[]>([]);

  // Serviços States
  const [services, setServices] = useState<Servico[]>([]);
  const [serviceForm, setServiceForm] = useState({ id: "", name: "", description: "", price: "", position: "", isPriceCustom: false });
  const [showServiceForm, setShowServiceForm] = useState(false);

  // Produtos States
  const [products, setProducts] = useState<Produto[]>([]);
  const [productForm, setProductForm] = useState({ id: "", name: "", description: "", price: "", cost: "", stock: "", minStockAlert: "", barcode: "", position: "", imageUrl: "", warranty: "" });
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProductQR, setSelectedProductQR] = useState<Produto | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Despesas States
  const [expenses, setExpenses] = useState<Despesa[]>([]);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });

  // Users States
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [userForm, setUserForm] = useState({ id: "", name: "", email: "", role: "employee" as "admin" | "employee", password: "" });

  // Auxiliary Tables (Brands & Items & Convênios)
  const [brands, setBrands] = useState<Marca[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState("");
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [newConvenio, setNewConvenio] = useState({ name: "", discountPercent: "" });

  // Initial Fetches based on active screens
  const fetchHistory = async () => {
    try {
      const [ats, cls] = await Promise.all([
        fetch("/api/atendimentos").then(r => r.json()),
        fetch("/api/clientes").then(r => r.json())
      ]);
      setHistoryOrders(Array.isArray(ats) ? ats : []);
      setAllClients(Array.isArray(cls) ? cls : []);
    } catch (err) { console.error(err); }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/servicos");
      if (res.ok) {
        const data = await res.json();
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/produtos");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/despesas");
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchAuxiliary = async () => {
    try {
      const [br, it, co] = await Promise.all([
        fetch("/api/marcas").then(r => r.json()),
        fetch("/api/itens").then(r => r.json()),
        fetch("/api/convenios").then(r => r.json())
      ]);
      setBrands(Array.isArray(br) ? br : []);
      setItems(Array.isArray(it) ? it : []);
      setConvenios(Array.isArray(co) ? co : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchProducts();
    if (activeMenu === 'history') fetchHistory();
    if (activeMenu === 'services') fetchServices();
    if (activeMenu === 'products') fetchProducts();
    if (activeMenu === 'reports') {
      fetchProducts();
      handleGenerateReport();
    }
    if (activeMenu === 'expenses') fetchExpenses();
    if (activeMenu === 'users') fetchUsers();
    if (activeMenu === 'auxiliary') fetchAuxiliary();
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu === 'reports') {
      handleGenerateReport();
    }
  }, [reportType, reportDate, reportStartDate, reportEndDate, reportYear]);

  // Handle Generating Reports
  const handleGenerateReport = async () => {
    try {
      let queryParams = "";
      const offset = new Date().getTimezoneOffset();
      if (reportType === 'daily') {
        queryParams = `type=daily&date=${reportDate}&offset=${offset}`;
      } else if (reportType === 'range') {
        queryParams = `type=range&startDate=${reportStartDate}&endDate=${reportEndDate}&offset=${offset}`;
      } else if (reportType === 'annual') {
        queryParams = `type=range&startDate=${reportYear}-01-01&endDate=${reportYear}-12-31&offset=${offset}`;
      }

      const res = await fetch(`/api/reports?${queryParams}`);
      if (res.ok) {
        setReportResult(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Top Sellers CSV
  const handleExportTopSellersCSV = () => {
    if (!reportResult || !reportResult.topSoldProducts) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Posicao;Produto/Peca;Quantidade Vendida;Faturamento (R$);Custo Total (R$);Lucro (R$)\n";
    reportResult.topSoldProducts.forEach((item: any, idx: number) => {
      csvContent += `${idx + 1};${item.name};${item.quantitySold};${item.totalRevenue.toFixed(2)};${item.totalCost.toFixed(2)};${item.profit.toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ranking_mais_vendidos_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Top Sellers
  const handlePrintTopSellersReport = () => {
    if (!reportResult || !reportResult.topSoldProducts) return;
    const items = reportResult.topSoldProducts;
    const totalUnits = items.reduce((acc: number, i: any) => acc + i.quantitySold, 0);
    const totalRev = items.reduce((acc: number, i: any) => acc + i.totalRevenue, 0);
    const totalProf = items.reduce((acc: number, i: any) => acc + i.profit, 0);

    const printableStr = `RELATORIO - PRODUTOS MAIS VENDIDOS
GERADO: ${new Date().toLocaleString("pt-BR")}
PERIODO: ${reportType === "daily" ? reportDate : `${reportStartDate} a ${reportEndDate}`}
--------------------------------
RANKING DE VENDAS:
${items.map((i: any, idx: number) => `#${idx + 1} ${i.name}\n   Qtd Vendida: ${i.quantitySold} un | Total: R$ ${i.totalRevenue.toFixed(2)} (Lucro: R$ ${i.profit.toFixed(2)})`).join("\n")}
--------------------------------
RESUMO CONSOLIDADO:
TOTAL DE PEÇAS/PRODUTOS VENDIDOS: ${totalUnits} un
FATURAMENTO TOTAL EM PRODUTOS: R$ ${totalRev.toFixed(2)}
LUCRO BRUTO EM PRODUTOS: R$ ${totalProf.toFixed(2)}
--------------------------------
Minha Assistência.Tech`;

    onPrintReceipt(printableStr);
  };

  // Export Inventory CSV
  const handleExportInventoryCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;Produto/Peca;Codigo de Barras;Estoque Atual;Estoque Minimo;Status;Preco Custo (R$);Preco Venda (R$);Valor Total Estoque (R$)\n";
    products.forEach(p => {
      const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
      const isLow = p.stock <= minAlert;
      const isOut = p.stock === 0;
      const status = isOut ? "ESGOTADO" : isLow ? "ESTOQUE BAIXO" : "NORMAL";
      const totalVal = p.stock * p.price;
      csvContent += `${p.id};${p.name};${p.barcode || ""};${p.stock};${minAlert};${status};${(p.cost || 0).toFixed(2)};${p.price.toFixed(2)};${totalVal.toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_estoque_pecas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Inventory Report
  const handlePrintInventoryReport = () => {
    const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalCostVal = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.cost || 0)), 0);
    const totalSaleVal = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);
    const lowStock = products.filter(p => p.stock <= ((p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5));

    const printableStr = `RELATORIO COMPLETO DE ESTOQUE
GERADO EM: ${new Date().toLocaleString("pt-BR")}
--------------------------------
RESUMO DO ESTOQUE & PEÇAS:
- Total Cadastrados: ${products.length} itens
- Total Unidades em Estoque: ${totalUnits} un
- Valor em Custo: R$ ${totalCostVal.toFixed(2)}
- Valor Potencial Venda: R$ ${totalSaleVal.toFixed(2)}
- Itens em Estoque Baixo: ${lowStock.length} itens
--------------------------------
LISTA COMPLETA DE ESTOQUE:
${products.map(p => {
  const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
  const isLow = p.stock <= minAlert;
  const statusStr = isLow ? "[BAIXO/REPOR]" : "[OK]";
  return `${statusStr} ${p.name}\n   Estoque: ${p.stock} un (Mín: ${minAlert}) | Venda: R$ ${p.price.toFixed(2)} | Custo: R$ ${(p.cost || 0).toFixed(2)}`;
}).join("\n")}
--------------------------------
Minha Assistência.Tech`;

    onPrintReceipt(printableStr);
  };

  // Export Table Reports CSV
  const handleExportCSV = () => {
    if (!reportResult) return;
    const { closedOrders, summary } = reportResult;
    const pCost = summary.productCost || 0;
    const grossP = summary.grossProfit ?? (summary.revenue - pCost);
    const netP = summary.netProfit ?? (grossP - summary.expense);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ordem de Servico;Aparelho;Total;Status;Data de Entrada;Data de Saida\n";
    
    closedOrders.forEach((o: any) => {
      csvContent += `${o.controlNumber};${o.item} ${o.brand} ${o.model};${o.totalAmount};${o.status};${o.entryDate};${o.exitDate}\n`;
    });

    csvContent += `\nRESUMO FINANCEIRO CONSOLIDADO\n`;
    csvContent += `Especie;Cartao/Pix;Faturamento Bruto;Custo Mercadorias;Lucro Bruto;Despesas Operacionais;Lucro Liquido Real\n`;
    csvContent += `${summary.cash};${summary.card};${summary.revenue};${pCost};${grossP};${summary.expense};${netP}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    if (!reportResult) return;
    const { summary, closedOrders, expenses } = reportResult;
    const pCost = summary.productCost || 0;
    const grossP = summary.grossProfit ?? (summary.revenue - pCost);
    const netP = summary.netProfit ?? (grossP - summary.expense);

    const printableStr = `RELATORIO FINANCEIRO DE MOVIMENTACAO
GERADO: ${new Date().toLocaleString("pt-BR")}
PERIODO: ${reportType === "daily" ? reportDate : `${reportStartDate} a ${reportEndDate}`}
--------------------------------
RECEITAS (ENTREGAS E VENDAS):
${closedOrders.map((o: any) => `- ${o.controlNumber}: ${o.model} (R$ ${o.totalAmount.toFixed(2)})`).join("\n")}
--------------------------------
DESPESAS NO PERIODO:
${expenses.map((e: any) => `- ${e.description}: R$ ${e.amount.toFixed(2)}`).join("\n")}
--------------------------------
RESUMO DE APURAÇÃO DO CAIXA:
(+) ESPÉCIE: R$ ${summary.cash.toFixed(2)}
(+) CARTÕES/PIX: R$ ${summary.card.toFixed(2)}
--------------------------------
(=) FATURAMENTO BRUTO: R$ ${summary.revenue.toFixed(2)}
(-) CUSTO MERCADORIAS/PEÇAS: R$ ${pCost.toFixed(2)}
(=) LUCRO BRUTO DA OPERAÇÃO: R$ ${grossP.toFixed(2)}
(-) DESPESAS OPERACIONAIS: R$ ${summary.expense.toFixed(2)}
--------------------------------
(=) LUCRO LÍQUIDO REAL: R$ ${netP.toFixed(2)}`;

    onPrintReceipt(printableStr);
  };

  // Re-imprimir recibo de saída de histórico
  const handleReprintExitHistory = (at: Atendimento) => {
    const cleanId = (val: any) => String(val || "").trim().toLowerCase();
    const target = cleanId(at.clienteId);
    const cli = allClients.find(c => c && cleanId(c.id) === target) || { name: "Desconhecido" };
    const recStr = `REIMPRESSÃO CUPOM SAIDA
CONTROLE: ${at.controlNumber}
FINALIZADO: ${at.exitDate ? new Date(at.exitDate).toLocaleString("pt-BR") : "N/A"}
CLIENTE: ${cli.name}
------------------------
APARELHO:
${at.item} ${at.brand} ${at.model}
------------------------
SERVICOS REALIZADOS:
${(at.services || []).map(s => `- ${s.name}: R$ ${s.price.toFixed(2)}`).join("\n")}
${(at.products || []).length > 0 ? `PECAS TROCADAS:\n${(at.products || []).map(p => `- ${p.name} (x${p.quantity}): R$ ${(p.price * p.quantity).toFixed(2)}`).join("\n")}` : ""}
------------------------
TOTAL GERAL: R$ ${at.totalAmount.toFixed(2)}
------------------------
GARANTIA DE 90 DIAS.`;
    onPrintReceipt(recStr);
  };

  // SAVE SERVICE
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: serviceForm.name,
      description: serviceForm.description,
      price: Number(serviceForm.price) || 0,
      position: Number(serviceForm.position) || 1,
      isPriceCustom: serviceForm.isPriceCustom
    };

    try {
      const url = serviceForm.id ? `/api/servicos/${serviceForm.id}` : "/api/servicos";
      const method = serviceForm.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchServices();
        setShowServiceForm(false);
        setServiceForm({ id: "", name: "", description: "", price: "", position: "", isPriceCustom: false });
      }
    } catch (err) { console.error(err); }
  };

  // Handle Product Photo Upload / Camera Capture
  const handleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      try {
        const compressedBase64 = await compressImage(file);
        setProductForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
      } catch (err) {
        console.error("Error compressing product photo:", err);
      }
    }
  };

  // SAVE PRODUCT
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price) || 0,
      cost: Number(productForm.cost) || 0,
      stock: Number(productForm.stock) || 0,
      minStockAlert: Number(productForm.minStockAlert) || 0,
      barcode: productForm.barcode,
      position: Number(productForm.position) || 1,
      imageUrl: productForm.imageUrl || "",
      warranty: productForm.warranty || ""
    };

    try {
      const url = productForm.id ? `/api/produtos/${productForm.id}` : "/api/produtos";
      const method = productForm.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchProducts();
        setShowProductForm(false);
        setProductForm({ id: "", name: "", description: "", price: "", cost: "", stock: "", minStockAlert: "", barcode: "", position: "", imageUrl: "", warranty: "" });
      }
    } catch (err) { console.error(err); }
  };

  // SAVE EXPENSE
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;

    try {
      const res = await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseForm.description,
          amount: Number(expenseForm.amount),
          date: expenseForm.date
        })
      });
      if (res.ok) {
        fetchExpenses();
        setExpenseForm({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Remover esta despesa?")) return;
    try {
      const res = await fetch(`/api/despesas/${id}`, { method: "DELETE" });
      if (res.ok) fetchExpenses();
    } catch (err) { console.error(err); }
  };

  // SELECT EMPLOYEE FOR EDIT OR ADD NEW
  const handleSelectEmployeeChange = (id: string) => {
    setSelectedEmp(id);
    if (!id) {
      setUserForm({ id: "", name: "", email: "", role: "employee", password: "" });
      return;
    }
    const found = employees.find(e => e.id === id);
    if (found) {
      setUserForm({
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        password: "" // Keep blank unless resetting
      });
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: userForm.name,
      email: userForm.email,
      role: userForm.role
    };
    if (userForm.password) {
      payload.password = userForm.password;
    }

    try {
      const url = userForm.id ? `/api/users/${userForm.id}` : "/api/users";
      const method = userForm.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Funcionário salvo com sucesso!");
        fetchUsers();
        setSelectedEmp("");
        setUserForm({ id: "", name: "", email: "", role: "employee", password: "" });
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar funcionário.");
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteEmployee = async () => {
    if (!userForm.id) return;
    if (userForm.id === "u-1") {
      alert("O Administrador padrão não pode ser deletado.");
      return;
    }
    if (!window.confirm(`Excluir definitivamente o funcionário ${userForm.name}?`)) return;

    try {
      const res = await fetch(`/api/users/${userForm.id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Funcionário excluído.");
        fetchUsers();
        setSelectedEmp("");
        setUserForm({ id: "", name: "", email: "", role: "employee", password: "" });
      }
    } catch (error: any) { console.error(error); }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Excluir definitivamente este serviço?")) return;
    try {
      const res = await fetch(`/api/servicos/${id}`, { method: "DELETE" });
      if (res.ok) fetchServices();
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Excluir definitivamente este produto?")) return;
    try {
      const res = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
      if (res.ok) fetchProducts();
    } catch (err) { console.error(err); }
  };

  const handleClearDatabase = async () => {
    try {
      const res = await fetch("/api/admin/clear-test-data", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Sistema zerado com sucesso!");
        window.location.reload();
      } else {
        alert("Erro ao zerar o banco de dados.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão.");
    }
  };

  // AUXILIARY TABLE SAVES
  const handleAddBrand = async () => {
    if (!newBrand) return;
    const res = await fetch("/api/marcas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBrand })
    });
    if (res.ok) { setNewBrand(""); fetchAuxiliary(); }
  };

  const handleDeleteBrand = async (id: string) => {
    const res = await fetch(`/api/marcas/${id}`, { method: "DELETE" });
    if (res.ok) fetchAuxiliary();
  };

  const handleAddItem = async () => {
    if (!newItem) return;
    const res = await fetch("/api/itens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newItem })
    });
    if (res.ok) { setNewItem(""); fetchAuxiliary(); }
  };

  const handleDeleteItem = async (id: string) => {
    const res = await fetch(`/api/itens/${id}`, { method: "DELETE" });
    if (res.ok) fetchAuxiliary();
  };

  const handleAddConvenio = async () => {
    if (!newConvenio.name || !newConvenio.discountPercent) return;
    const res = await fetch("/api/convenios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newConvenio.name,
        discountPercent: Number(newConvenio.discountPercent)
      })
    });
    if (res.ok) { setNewConvenio({ name: "", discountPercent: "" }); fetchAuxiliary(); }
  };

  const handleDeleteConvenio = async (id: string) => {
    const res = await fetch(`/api/convenios/${id}`, { method: "DELETE" });
    if (res.ok) fetchAuxiliary();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Admin Panel Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Painel de Administração</h2>
            <p className="text-slate-500 text-xs">Gestão financeira, estoques, serviços e funcionários</p>
          </div>
        </div>
      </div>

      {activeMenu === 'main' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveMenu('reports')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Relatórios</span>
            </button>

            <button
              onClick={() => setActiveMenu('history')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition"
            >
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Histórico de OS</span>
            </button>

            <button
              onClick={() => setActiveMenu('services')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition"
            >
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <ListPlus className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Serviços & Preços</span>
            </button>

            <button
              onClick={() => setActiveMenu('products')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition"
            >
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <Barcode className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Produtos & Peças</span>
            </button>

            <button
              onClick={() => setActiveMenu('expenses')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition"
            >
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Despesas</span>
            </button>

            <button
              onClick={() => setActiveMenu('users')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Funcionários</span>
            </button>

            <button
              onClick={() => setActiveMenu('auxiliary')}
              className="p-5 bg-white border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition col-span-2 sm:col-span-2"
            >
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mx-auto">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700">Marcas, Itens & Convênios</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm("ATENÇÃO: Isso irá apagar DEFINITIVAMENTE todos os clientes, serviços, produtos, marcas, itens, despesas e ordens de serviço de teste, e irá zerar o contador de OS para 0001.\n\nDeseja continuar e limpar o sistema para uso real?")) {
                  if (window.confirm("Confirmação final: Tem certeza absoluta? Essa ação NÃO pode ser desfeita.")) {
                    handleClearDatabase();
                  }
                }
              }}
              className="p-5 bg-white border border-red-100 hover:border-red-200 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 transition col-span-2 sm:col-span-1"
            >
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-red-600">Zerar Sistema (Dados Reais)</span>
            </button>
          </div>
          <WeeklySalesChart />
        </div>
      )}

      {/* SUB PANELS */}

      {/* RELATÓRIOS */}
      {activeMenu === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Relatórios Inteligentes do Sistema</h3>
              <p className="text-xs text-slate-400">Acompanhe caixa, ranking de itens mais vendidos e reposição de peças</p>
            </div>
            <button onClick={() => setActiveMenu('main')} className="text-xs text-[#1E88E5] font-bold">Voltar ao Menu</button>
          </div>

          {/* Report Sub-Tabs */}
          <div className="flex p-1 bg-slate-100/80 rounded-2xl gap-1">
            <button
              onClick={() => setReportViewTab('finance')}
              className={`flex-1 py-2 px-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 ${
                reportViewTab === 'finance' ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Balanço Financeiro</span>
            </button>

            <button
              onClick={() => setReportViewTab('top_sellers')}
              className={`flex-1 py-2 px-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 ${
                reportViewTab === 'top_sellers' ? "bg-white text-amber-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Mais Vendidos ({reportResult?.topSoldProducts?.length || 0})</span>
            </button>

            <button
              onClick={() => setReportViewTab('inventory')}
              className={`flex-1 py-2 px-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 ${
                reportViewTab === 'inventory' ? "bg-white text-purple-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="w-4 h-4 text-purple-500" />
              <span>Estoque & Peças ({products.length})</span>
              {products.filter(p => p.stock <= ((p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5)).length > 0 && (
                <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {products.filter(p => p.stock <= ((p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5)).length}
                </span>
              )}
            </button>
          </div>

          {/* Period Selection Filters (Applies to Finance & Top Sellers) */}
          {reportViewTab !== 'inventory' && (
            <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Filtrar Período</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setReportType('daily')}
                      className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition text-center ${
                        reportType === 'daily' ? "bg-blue-50 border-blue-200 text-[#1E88E5]" : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Dia Único
                    </button>
                    <button
                      onClick={() => setReportType('range')}
                      className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition text-center ${
                        reportType === 'range' ? "bg-blue-50 border-blue-200 text-[#1E88E5]" : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Personalizado
                    </button>
                    <button
                      onClick={() => setReportType('annual')}
                      className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition text-center ${
                        reportType === 'annual' ? "bg-blue-50 border-blue-200 text-[#1E88E5]" : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Visão Anual
                    </button>
                  </div>
                </div>

                {reportType === 'daily' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Escolher Data</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                ) : reportType === 'range' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Data Inicial</label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Data Final</label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Escolher Ano</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold text-slate-700"
                    >
                      <option value="2026">Ano de 2026</option>
                      <option value="2025">Ano de 2025</option>
                      <option value="2024">Ano de 2024</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW TAB 1: FINANCIAL REPORT */}
          {reportViewTab === 'finance' && (
            <div className="space-y-4">
              {reportResult && (
                <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Resultado do Caixa Consolidado</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportCSV}
                        className="p-2 hover:bg-slate-100 rounded-lg text-[#1E88E5]"
                        title="Exportar Planilha Excel"
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handlePrintReport}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-700"
                        title="Imprimir Resumo Térmico"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Consolidated Financial Summary Grid */}
                  {(() => {
                    const rev = reportResult.summary.revenue || 0;
                    const pCost = reportResult.summary.productCost || 0;
                    const grossP = reportResult.summary.grossProfit ?? (rev - pCost);
                    const exp = reportResult.summary.expense || 0;
                    const netP = reportResult.summary.netProfit ?? (grossP - exp);

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-center">
                          <div className="bg-emerald-50/60 p-3 border border-emerald-100 rounded-2xl shadow-2xs">
                            <p className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wide">1. Faturamento Bruto</p>
                            <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">R$ {rev.toFixed(2)}</p>
                          </div>

                          <div className="bg-amber-50/60 p-3 border border-amber-100 rounded-2xl shadow-2xs">
                            <p className="text-[9px] text-amber-800 font-extrabold uppercase tracking-wide">2. Custo Mercadorias</p>
                            <p className="text-sm font-black text-amber-700 font-mono mt-0.5">R$ {pCost.toFixed(2)}</p>
                          </div>

                          <div className="bg-sky-50/60 p-3 border border-sky-100 rounded-2xl shadow-2xs">
                            <p className="text-[9px] text-sky-800 font-extrabold uppercase tracking-wide">3. Lucro Bruto</p>
                            <p className="text-sm font-black text-sky-700 font-mono mt-0.5">R$ {grossP.toFixed(2)}</p>
                          </div>

                          <div className="bg-red-50/60 p-3 border border-red-100 rounded-2xl shadow-2xs">
                            <p className="text-[9px] text-red-800 font-extrabold uppercase tracking-wide">4. Despesas Loja</p>
                            <p className="text-sm font-black text-red-700 font-mono mt-0.5">R$ {exp.toFixed(2)}</p>
                          </div>

                          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-2xl text-white shadow-md">
                            <p className="text-[9px] text-blue-100 font-extrabold uppercase tracking-wide">5. Lucro Líquido Real</p>
                            <p className="text-base font-black font-mono mt-0.5 text-white">R$ {netP.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">
                              <strong>Apuração Real do Período:</strong> Faturamento <span className="text-emerald-700 font-mono font-bold">(R$ {rev.toFixed(2)})</span> - Custo Mercadorias <span className="text-amber-700 font-mono font-bold">(R$ {pCost.toFixed(2)})</span> - Despesas <span className="text-red-700 font-mono font-bold">(R$ {exp.toFixed(2)})</span> = <strong className="text-blue-700 font-mono">Lucro Líquido R$ {netP.toFixed(2)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Financial Performance Graphics Chart */}
                  <FinancialChart
                    reportResult={reportResult}
                    reportType={reportType}
                    reportDate={reportDate}
                    reportStartDate={reportStartDate}
                    reportEndDate={reportEndDate}
                  />

                  {/* Deliveries detailed */}
                  {reportResult.closedOrders.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entregas no Período</p>
                      <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50 max-h-[160px] overflow-y-auto">
                        {reportResult.closedOrders.map((o: any) => (
                          <div key={o.id} className="p-2.5 flex justify-between text-xs">
                            <span>{o.controlNumber} - {o.model}</span>
                            <span className="font-bold text-slate-800">R$ {o.totalAmount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW TAB 2: TOP SELLING PRODUCTS */}
          {reportViewTab === 'top_sellers' && (
            <div className="space-y-4 animate-fade-in">
              {(() => {
                const topProducts = reportResult?.topSoldProducts || [];
                const filteredTop = topProducts.filter((p: any) =>
                  p.name.toLowerCase().includes(topSellersSearch.toLowerCase())
                );

                const totalUnitsSold = topProducts.reduce((acc: number, p: any) => acc + p.quantitySold, 0);
                const totalRevenue = topProducts.reduce((acc: number, p: any) => acc + p.totalRevenue, 0);
                const totalProfit = topProducts.reduce((acc: number, p: any) => acc + p.profit, 0);
                const championProduct = topProducts.length > 0 ? topProducts[0] : null;
                const maxQuantity = topProducts.length > 0 ? topProducts[0].quantitySold : 1;

                return (
                  <div className="space-y-4">
                    {/* Top Selling Metrics Banner */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-amber-50/80 p-3.5 border border-amber-100 rounded-2xl">
                        <p className="text-[10px] text-amber-800 font-extrabold uppercase">Itens Vendidos</p>
                        <p className="text-lg font-black text-amber-700 font-mono mt-0.5">{totalUnitsSold} <span className="text-xs font-normal text-amber-600">unidades</span></p>
                      </div>

                      <div className="bg-emerald-50/80 p-3.5 border border-emerald-100 rounded-2xl">
                        <p className="text-[10px] text-emerald-800 font-extrabold uppercase">Faturamento Produtos</p>
                        <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">R$ {totalRevenue.toFixed(2)}</p>
                      </div>

                      <div className="bg-blue-50/80 p-3.5 border border-blue-100 rounded-2xl">
                        <p className="text-[10px] text-blue-800 font-extrabold uppercase">Lucro em Peças/Produtos</p>
                        <p className="text-lg font-black text-blue-700 font-mono mt-0.5">R$ {totalProfit.toFixed(2)}</p>
                      </div>

                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3.5 rounded-2xl text-white shadow-sm flex flex-col justify-between">
                        <p className="text-[10px] text-amber-100 font-extrabold uppercase flex items-center gap-1">
                          <span>🥇 Campeão de Vendas</span>
                        </p>
                        <p className="text-xs font-extrabold truncate mt-1">
                          {championProduct ? championProduct.name : "Nenhum no período"}
                        </p>
                        {championProduct && (
                          <p className="text-[10px] text-amber-100 font-mono">{championProduct.quantitySold} unidades (R$ {championProduct.totalRevenue.toFixed(2)})</p>
                        )}
                      </div>
                    </div>

                    {/* Top Sellers Header Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={topSellersSearch}
                          onChange={(e) => setTopSellersSearch(e.target.value)}
                          placeholder="Buscar produto ou peça no ranking..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportTopSellersCSV}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                          title="Exportar Planilha"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span className="hidden sm:inline">Exportar CSV</span>
                        </button>
                        <button
                          onClick={handlePrintTopSellersReport}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                          title="Imprimir Ranking"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir Ranking</span>
                        </button>
                      </div>
                    </div>

                    {/* Top Sellers List */}
                    {filteredTop.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-xs">
                        Nenhum produto ou peça vendido neste período. Realize vendas na aba "Vendas" ou adicione peças em OS finalizadas!
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {filteredTop.map((item: any, idx: number) => {
                          const percentage = Math.round((item.quantitySold / maxQuantity) * 100);
                          const isTop1 = idx === 0;
                          const isTop2 = idx === 1;
                          const isTop3 = idx === 2;

                          return (
                            <div key={idx} className="p-3.5 bg-white border border-slate-100 hover:border-amber-200 rounded-2xl shadow-2xs space-y-2 transition">
                              <div className="flex items-center justify-between text-xs gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                    isTop1 ? "bg-amber-400 text-amber-950 ring-2 ring-amber-200" :
                                    isTop2 ? "bg-slate-200 text-slate-800" :
                                    isTop3 ? "bg-orange-200 text-orange-900" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>
                                    {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `#${idx + 1}`}
                                  </div>

                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-slate-800 text-xs truncate">{item.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      Vendido em balcão e OS
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 font-black text-xs rounded-lg border border-amber-100 font-mono">
                                    {item.quantitySold} {item.quantitySold === 1 ? 'unidade' : 'unidades'}
                                  </span>
                                  <p className="text-[10px] font-bold text-emerald-700 font-mono mt-0.5">
                                    Faturado: R$ {item.totalRevenue.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isTop1 ? "bg-amber-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${Math.max(percentage, 5)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                  <span>Custo Total: R$ {item.totalCost.toFixed(2)}</span>
                                  <span className="font-bold text-blue-600">Lucro Estimado: R$ {item.profit.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW TAB 3: INVENTORY & PARTS REPORT */}
          {reportViewTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              {(() => {
                const lowStockList = products.filter(p => {
                  const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
                  return p.stock <= minAlert;
                });
                const outOfStockList = products.filter(p => p.stock === 0);

                const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
                const totalCostVal = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.cost || 0)), 0);
                const totalSaleVal = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);
                const potentialProfit = totalSaleVal - totalCostVal;

                const filteredProducts = products.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase()));
                  const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
                  
                  if (productStockFilter === 'low') return matchesSearch && p.stock <= minAlert;
                  if (productStockFilter === 'out') return matchesSearch && p.stock === 0;
                  return matchesSearch;
                });

                return (
                  <div className="space-y-4">
                    {/* Low stock critical alert banner if any */}
                    {lowStockList.length > 0 && (
                      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-amber-100" />
                          </div>
                          <div>
                            <h4 className="font-black text-xs">ATENÇÃO: {lowStockList.length} {lowStockList.length === 1 ? 'PRODUTO COM ESTOQUE BAIXO' : 'PRODUTOS COM ESTOQUE BAIXO'}</h4>
                            <p className="text-[11px] text-amber-100">Necessário realizar reposição junto aos fornecedores para evitar falta em OS e Vendas.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setProductStockFilter('low')}
                          className="px-3.5 py-1.5 bg-white text-amber-900 font-extrabold text-xs rounded-xl hover:bg-amber-50 transition shadow-sm"
                        >
                          Filtrar Apenas Estoque Baixo
                        </button>
                      </div>
                    )}

                    {/* Inventory Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                      <div className="bg-purple-50/80 p-3 border border-purple-100 rounded-2xl text-center">
                        <p className="text-[9px] text-purple-800 font-extrabold uppercase">Total Cadastrados</p>
                        <p className="text-base font-black text-purple-700 font-mono mt-0.5">{products.length} <span className="text-[10px] font-normal">itens</span></p>
                      </div>

                      <div className="bg-blue-50/80 p-3 border border-blue-100 rounded-2xl text-center">
                        <p className="text-[9px] text-blue-800 font-extrabold uppercase">Total Unidades</p>
                        <p className="text-base font-black text-blue-700 font-mono mt-0.5">{totalUnits} <span className="text-[10px] font-normal">un</span></p>
                      </div>

                      <div className="bg-amber-50/80 p-3 border border-amber-100 rounded-2xl text-center">
                        <p className="text-[9px] text-amber-800 font-extrabold uppercase">Investimento Custo</p>
                        <p className="text-base font-black text-amber-700 font-mono mt-0.5">R$ {totalCostVal.toFixed(2)}</p>
                      </div>

                      <div className="bg-emerald-50/80 p-3 border border-emerald-100 rounded-2xl text-center">
                        <p className="text-[9px] text-emerald-800 font-extrabold uppercase">Valor Venda Total</p>
                        <p className="text-base font-black text-emerald-700 font-mono mt-0.5">R$ {totalSaleVal.toFixed(2)}</p>
                      </div>

                      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-600 to-purple-700 p-3 rounded-2xl text-white text-center shadow-sm">
                        <p className="text-[9px] text-purple-100 font-extrabold uppercase">Lucro Projetado</p>
                        <p className="text-base font-black font-mono mt-0.5">R$ {potentialProfit.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Controls & Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                          onClick={() => setProductStockFilter('all')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            productStockFilter === 'all' ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Todos ({products.length})
                        </button>
                        <button
                          onClick={() => setProductStockFilter('low')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                            productStockFilter === 'low' ? "bg-amber-500 text-white shadow-2xs" : "text-amber-700 hover:bg-amber-100/50"
                          }`}
                        >
                          ⚠️ Estoque Baixo ({lowStockList.length})
                        </button>
                        <button
                          onClick={() => setProductStockFilter('out')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            productStockFilter === 'out' ? "bg-red-600 text-white shadow-2xs" : "text-red-700 hover:bg-red-100/50"
                          }`}
                        >
                          ❌ Esgotados ({outOfStockList.length})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportInventoryCSV}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                          title="Exportar Planilha"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span className="hidden sm:inline">Exportar CSV</span>
                        </button>
                        <button
                          onClick={handlePrintInventoryReport}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                          title="Imprimir Relatório de Estoque"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir Estoque</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Buscar produto por nome ou código de barras..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    {/* Inventory Table */}
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-100">
                            <th className="p-3">Produto / Peça</th>
                            <th className="p-3 text-center">Código</th>
                            <th className="p-3 text-center">Qtd Estoque</th>
                            <th className="p-3 text-right">Preço Custo</th>
                            <th className="p-3 text-right">Preço Venda</th>
                            <th className="p-3 text-right">Total Venda</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredProducts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                                Nenhum produto encontrado para o filtro selecionado.
                              </td>
                            </tr>
                          ) : (
                            filteredProducts.map((p) => {
                              const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
                              const isLow = p.stock <= minAlert;
                              const isOut = p.stock === 0;

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                                  <td className="p-3">
                                    <div className="flex items-center gap-2.5">
                                      {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs shrink-0">
                                          📦
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-extrabold text-slate-800 text-xs">{p.name}</p>
                                        {p.warranty && <p className="text-[10px] text-blue-600 font-semibold">🛡️ {p.warranty}</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-mono text-[10px] text-slate-500">
                                    {p.barcode || "—"}
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold">
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                      isOut ? "bg-red-100 text-red-700" :
                                      isLow ? "bg-amber-100 text-amber-800 animate-pulse" :
                                      "bg-slate-100 text-slate-800"
                                    }`}>
                                      {p.stock} un
                                    </span>
                                    <span className="block text-[9px] text-slate-400 font-sans mt-0.5">(mín: {minAlert})</span>
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-500">
                                    R$ {(p.cost || 0).toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-800">
                                    R$ {p.price.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                    R$ {(p.stock * p.price).toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isOut ? (
                                      <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-full font-bold text-[9px]">
                                        ❌ ESGOTADO
                                      </span>
                                    ) : isLow ? (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[9px]">
                                        ⚠️ ESTOQUE BAIXO
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold text-[9px]">
                                        ✅ NORMAL
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO DE OS */}
      {activeMenu === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150 pb-3">
            <h3 className="font-bold text-sm text-slate-800">Histórico Completo de Ordens de Serviço</h3>
            <button onClick={() => setActiveMenu('main')} className="text-xs text-[#1E88E5] font-bold">Voltar</button>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Buscar por código OS ou nome do cliente..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {Array.isArray(historyOrders) && historyOrders.length > 0 ? (
              historyOrders
                .filter(o => {
                  if (!o) return false;
                  const searchLower = (historySearch || "").toLowerCase();
                  const cleanId = (val: any) => String(val || "").trim().toLowerCase();
                  const target = cleanId(o.clienteId);
                  const client = Array.isArray(allClients) ? allClients.find(c => c && cleanId(c.id) === target) : undefined;
                  return (
                    (o.controlNumber || "").toLowerCase().includes(searchLower) ||
                    (o.item || "").toLowerCase().includes(searchLower) ||
                    (o.brand || "").toLowerCase().includes(searchLower) ||
                    (o.model || "").toLowerCase().includes(searchLower) ||
                    (client?.name || "").toLowerCase().includes(searchLower)
                  );
                })
                .map((o) => {
                  if (!o) return null;
                  const cleanId = (val: any) => String(val || "").trim().toLowerCase();
                  const target = cleanId(o.clienteId);
                  const client = (Array.isArray(allClients) ? allClients.find(c => c && cleanId(c.id) === target) : undefined) || { name: "Cliente Desconhecido" };
                  return (
                    <div key={o.id} className="p-3 border border-slate-100 hover:border-blue-100 rounded-xl text-xs flex justify-between items-center gap-4 bg-slate-50/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{o.controlNumber || "OS"}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            o.status === 'finalizado' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                          }`}>
                            {(o.status || "").toUpperCase()}
                          </span>
                        </div>
                        <p className="font-bold text-slate-700 mt-1">{o.item || ""} {o.brand || ""} {o.model || ""}</p>
                        <p className="text-slate-500">Cliente: {client.name}</p>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-mono font-bold text-slate-800">R$ {(o.totalAmount || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">Entrada: {o.entryDate ? new Date(o.entryDate).toLocaleDateString() : "N/A"}</p>
                        </div>

                        {o.status === "finalizado" && (
                          <button
                            onClick={() => handleReprintExitHistory(o)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                            title="Reimprimir Cupom de Saída"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma ordem de serviço encontrada no histórico.</p>
            )}
          </div>
        </div>
      )}

      {/* SERVIÇOS E PREÇOS */}
      {activeMenu === 'services' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150 pb-3">
            <h3 className="font-bold text-sm text-slate-800">Catálogo de Serviços</h3>
            <button
              onClick={() => {
                setServiceForm({ id: "", name: "", description: "", price: "", position: "", isPriceCustom: false });
                setShowServiceForm(!showServiceForm);
              }}
              className="px-2.5 py-1.5 bg-blue-50 text-[#1E88E5] font-bold text-xs rounded-lg hover:bg-[#1E88E5] hover:text-white transition"
            >
              {showServiceForm ? "Ocultar Form" : "Novo Serviço"}
            </button>
          </div>

          {showServiceForm && (
            <form onSubmit={handleSaveService} className="p-4 border border-blue-100 bg-blue-50/10 rounded-2xl space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Nome do Serviço *</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Troca de Frontal"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Substituição tela de vidro"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Preço Base (R$)</label>
                  <input
                    type="number"
                    disabled={serviceForm.isPriceCustom}
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    placeholder="250"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Ordem / Posição</label>
                  <input
                    type="number"
                    value={serviceForm.position}
                    onChange={(e) => setServiceForm({ ...serviceForm, position: e.target.value })}
                    placeholder="1"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="custom_price_toggle"
                  checked={serviceForm.isPriceCustom}
                  onChange={(e) => setServiceForm({ ...serviceForm, isPriceCustom: e.target.checked, price: e.target.checked ? "0" : serviceForm.price })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="custom_price_toggle" className="font-semibold text-slate-700 cursor-pointer">
                  Valor definido na hora pelo atendente (variável)
                </label>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition">
                Salvar Serviço
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
            {services.map(s => (
              <div key={s.id} className="p-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <p className="text-slate-500">{s.description || "Sem descrição"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                    {s.isPriceCustom ? "Sob orçamento" : `R$ ${s.price}`}
                  </span>
                  <button
                    onClick={() => {
                      setServiceForm({
                        id: s.id,
                        name: s.name,
                        description: s.description,
                        price: s.price.toString(),
                        position: s.position.toString(),
                        isPriceCustom: s.isPriceCustom
                      });
                      setShowServiceForm(true);
                    }}
                    className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="p-1 hover:bg-red-50 text-red-600 rounded"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUTOS E PEÇAS */}
      {activeMenu === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-150 pb-3 gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Cadastro & Controle de Estoque</h3>
              <p className="text-xs text-slate-400">Gerencie produtos, peças de reposição e alertas de nível mínimo</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintInventoryReport}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                title="Imprimir Relatório de Estoque"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Relatório</span>
              </button>

              <button
                onClick={() => {
                  setProductForm({ id: "", name: "", description: "", price: "", cost: "", stock: "", minStockAlert: "", barcode: "", position: "", imageUrl: "", warranty: "" });
                  setShowProductForm(!showProductForm);
                }}
                className="px-3 py-1.5 bg-blue-50 text-[#1E88E5] font-bold text-xs rounded-lg hover:bg-[#1E88E5] hover:text-white transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showProductForm ? "Ocultar Form" : "Novo Produto"}</span>
              </button>
            </div>
          </div>

          {/* Low Stock Banner in Products View */}
          {(() => {
            const lowStockList = products.filter(p => p.stock <= ((p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5));
            if (lowStockList.length === 0) return null;
            return (
              <div className="bg-amber-500 text-white rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-100 shrink-0" />
                  <span>
                    <strong>Alerta de Nível Mínimo:</strong> {lowStockList.length} {lowStockList.length === 1 ? 'item' : 'itens'} com quantidade igual ou inferior ao limite mínimo de estoque.
                  </span>
                </div>
                <button
                  onClick={() => setProductStockFilter('low')}
                  className="px-2.5 py-1 bg-white text-amber-900 font-extrabold text-[11px] rounded-lg shadow-2xs hover:bg-amber-50"
                >
                  Ver Apenas Baixos
                </button>
              </div>
            );
          })()}

          {/* Filter & Search Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setProductStockFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  productStockFilter === 'all' ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setProductStockFilter('low')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  productStockFilter === 'low' ? "bg-amber-500 text-white shadow-2xs" : "text-amber-700 hover:bg-amber-100/50"
                }`}
              >
                ⚠️ Estoque Baixo ({products.filter(p => p.stock <= ((p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5)).length})
              </button>
              <button
                onClick={() => setProductStockFilter('out')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  productStockFilter === 'out' ? "bg-red-600 text-white shadow-2xs" : "text-red-700 hover:bg-red-100/50"
                }`}
              >
                ❌ Esgotados ({products.filter(p => p.stock === 0).length})
              </button>
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filtrar por nome ou código..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {showProductForm && (
            <form onSubmit={handleSaveProduct} className="p-4 border border-blue-100 bg-blue-50/10 rounded-2xl space-y-3 text-xs">
              {/* Product Photo Upload/Capture UI */}
              <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-sm flex flex-col sm:flex-row items-center gap-3.5">
                <div className="relative w-20 h-20 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {productForm.imageUrl ? (
                    <>
                      <img src={productForm.imageUrl} className="w-full h-full object-cover" alt="Prévia do produto" />
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, imageUrl: "" })}
                        className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition font-bold text-[9px]"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 p-1.5">
                      <Camera className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                      <span className="text-[9px] font-bold block leading-none">Sem Foto</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 w-full text-center sm:text-left">
                  <p className="font-bold text-slate-700 text-xs">Foto do Produto</p>
                  <p className="text-[10px] text-slate-400 leading-tight">Use a câmera do seu celular ou envie um arquivo para identificar melhor este produto.</p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {/* Camera Button */}
                    <label className="px-2.5 py-1.5 bg-blue-50 hover:bg-[#1E88E5] text-[#1E88E5] hover:text-white font-extrabold rounded-lg transition text-[9px] flex items-center gap-1 cursor-pointer shadow-sm">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tirar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleProductPhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Gallery Button */}
                    <label className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-extrabold rounded-lg transition text-[9px] flex items-center gap-1 cursor-pointer shadow-sm">
                      <Image className="w-3.5 h-3.5" />
                      <span>Galeria</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Película de Vidro"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Para tela 6.5 polegadas"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Preço Venda (R$)</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="35"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    value={productForm.cost}
                    onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                    placeholder="15"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Quantidade Estoque</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="10"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Alerta Estoque Mínimo</label>
                  <input
                    type="number"
                    value={productForm.minStockAlert}
                    onChange={(e) => setProductForm({ ...productForm, minStockAlert: e.target.value })}
                    placeholder="3"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="78900000001"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Garantia Padrão</label>
                  <input
                    type="text"
                    value={productForm.warranty}
                    onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                    placeholder="ex: Garantia de 3 meses"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition">
                Salvar Produto
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
            {products
              .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                  (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase()));
                const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
                if (productStockFilter === 'low') return matchesSearch && p.stock <= minAlert;
                if (productStockFilter === 'out') return matchesSearch && p.stock === 0;
                return matchesSearch;
              })
              .map(p => {
                const minAlert = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? p.minStockAlert : 5;
                const lowStock = p.stock <= minAlert;
                return (
                  <div key={p.id} className="p-2.5 flex justify-between items-center text-xs hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                          <span className="text-sm">📦</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-400">
                          {p.barcode && <span className="font-mono">Cód: {p.barcode}</span>}
                          {p.warranty && <span className="text-blue-600 font-semibold">🛡️ {p.warranty}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold font-mono text-slate-700">Venda: R$ {p.price}</p>
                        <p className="text-[10px] font-mono text-slate-500">Custo: R$ {p.cost || 0}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        p.stock === 0 ? "bg-red-100 text-red-700 border border-red-200" :
                        lowStock ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                        "bg-emerald-50 text-emerald-700"
                      }`}>
                        Qtd: {p.stock} {lowStock && (p.stock === 0 ? "(ESGOTADO)" : "(BAIXO)")}
                      </span>
                      <button
                        onClick={() => setSelectedProductQR(p)}
                        className="p-1 hover:bg-slate-100 text-[#1E88E5] rounded"
                        title="Ver Etiqueta QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setProductForm({
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            price: p.price.toString(),
                            cost: (p.cost !== undefined ? p.cost : 0).toString(),
                            stock: p.stock.toString(),
                            minStockAlert: p.minStockAlert.toString(),
                            barcode: p.barcode,
                            position: p.position.toString(),
                            imageUrl: p.imageUrl || "",
                            warranty: p.warranty || ""
                          });
                          setShowProductForm(true);
                        }}
                        className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* DESPESAS */}
      {activeMenu === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150 pb-3">
            <h3 className="font-bold text-sm text-slate-800">Lançamento de Despesas</h3>
            <button onClick={() => setActiveMenu('main')} className="text-xs text-[#1E88E5] font-bold">Voltar</button>
          </div>

          <form onSubmit={handleSaveExpense} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-slate-500 mb-1">Descrição do Custo</label>
              <input
                type="text"
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Ex: Conta de luz"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Valor do Custo (R$)</label>
              <input
                type="number"
                required
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="150"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="w-full">
                <label className="block text-slate-500 mb-1">Data</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <button type="submit" className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition uppercase tracking-wider text-[10px]">
                Adicionar
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
            {expenses.map(e => (
              <div key={e.id} className="p-2.5 flex justify-between items-center text-xs hover:bg-slate-50 transition">
                <div>
                  <p className="font-bold text-slate-800">{e.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{new Date(e.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-red-600">- R$ {e.amount.toFixed(2)}</span>
                  <button onClick={() => handleDeleteExpense(e.id)} className="p-1 hover:bg-red-50 text-red-500 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GESTÃO DE FUNCIONÁRIOS */}
      {activeMenu === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150 pb-3">
            <h3 className="font-bold text-sm text-slate-800">Contas de Funcionários & Níveis</h3>
            <button onClick={() => setActiveMenu('main')} className="text-xs text-[#1E88E5] font-bold">Voltar</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Escolha o Funcionário para Editar</label>
            <select
              value={selectedEmp}
              onChange={(e) => handleSelectEmployeeChange(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            >
              <option value="">-- CADASTRAR NOVO FUNCIONÁRIO --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role === 'admin' ? 'Administrador' : 'Atendente'})</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSaveEmployee} className="p-4 border border-blue-50 bg-blue-50/10 rounded-2xl space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Nome do funcionário"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="func@minhaassistencia.com"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Nível de Acesso</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as "admin" | "employee" })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                >
                  <option value="employee">Funcionário comum</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Senha {userForm.id && "(deixe em branco se não quiser alterar)"}</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={userForm.id ? "Senha inalterada" : "Digite a nova senha"}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {userForm.id && userForm.id !== "u-1" && (
                <button
                  type="button"
                  onClick={handleDeleteEmployee}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                >
                  Excluir Funcionário
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
              >
                {userForm.id ? "Salvar Edição" : "Cadastrar Funcionário"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MARCAS, ITENS E CONVÊNIOS */}
      {activeMenu === 'auxiliary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* CATEGORIAS/ITENS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800">Categorias de Aparelho</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Smart TV"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded bg-slate-50 outline-none"
              />
              <button onClick={handleAddItem} className="p-1.5 bg-blue-600 text-white rounded font-bold">Adicionar</button>
            </div>
            <div className="divide-y divide-slate-50 max-h-[180px] overflow-y-auto pr-1">
              {items.map(it => (
                <div key={it.id} className="py-1.5 flex justify-between items-center text-slate-700">
                  <span>{it.name}</span>
                  <button onClick={() => handleDeleteItem(it.id)} className="text-red-500 hover:underline">Deletar</button>
                </div>
              ))}
            </div>
          </div>

          {/* BRANDS/MARCAS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800">Marcas Suportadas</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Huawei"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded bg-slate-50 outline-none"
              />
              <button onClick={handleAddBrand} className="p-1.5 bg-blue-600 text-white rounded font-bold">Adicionar</button>
            </div>
            <div className="divide-y divide-slate-50 max-h-[180px] overflow-y-auto pr-1">
              {brands.map(b => (
                <div key={b.id} className="py-1.5 flex justify-between items-center text-slate-700">
                  <span>{b.name}</span>
                  <button onClick={() => handleDeleteBrand(b.id)} className="text-red-500 hover:underline">Deletar</button>
                </div>
              ))}
            </div>
          </div>

          {/* CONVÊNIOS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800">Convênios / Parcerias</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nome do Convênio"
                value={newConvenio.name}
                onChange={(e) => setNewConvenio({ ...newConvenio, name: e.target.value })}
                className="w-full p-1.5 border border-slate-200 rounded bg-slate-50 outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Desconto (%)"
                  value={newConvenio.discountPercent}
                  onChange={(e) => setNewConvenio({ ...newConvenio, discountPercent: e.target.value })}
                  className="w-full p-1.5 border border-slate-200 rounded bg-slate-50 outline-none"
                />
                <button onClick={handleAddConvenio} className="p-1.5 bg-blue-600 text-white rounded font-bold shrink-0">Adicionar</button>
              </div>
            </div>
            <div className="divide-y divide-slate-50 max-h-[120px] overflow-y-auto pr-1">
              {convenios.map(c => (
                <div key={c.id} className="py-1.5 flex justify-between items-center text-slate-700">
                  <span>{c.name} ({c.discountPercent}%)</span>
                  <button onClick={() => handleDeleteConvenio(c.id)} className="text-red-500 hover:underline">Deletar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT QR LABEL DIALOG */}
      {selectedProductQR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border border-slate-100 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedProductQR(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <h3 className="font-extrabold text-sm text-slate-800">Etiqueta de Código QR</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Gere e cole etiquetas em suas peças de estoque</p>
            </div>

            {/* Thermal Label Sheet Mockup */}
            <div id="thermal-label-print-area" className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col items-center text-center font-mono text-slate-800 shadow-sm border-dashed">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-sans">** ETIOUETA DE PRODUTO **</span>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1.5 font-sans leading-tight">
                {selectedProductQR.name}
              </h4>
              <p className="text-sm font-black text-[#1E88E5] mt-1 font-mono">
                R$ {selectedProductQR.price.toFixed(2)}
              </p>
              
              <div className="w-36 h-36 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center my-3 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedProductQR.barcode || selectedProductQR.id)}`}
                  className="w-full h-full object-contain"
                  alt="QR Label"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-[9px] text-slate-500 font-semibold tracking-widest font-mono">
                COD: {selectedProductQR.barcode || selectedProductQR.id}
              </div>
              <p className="text-[8px] text-slate-400 font-sans mt-1">Prateleira: {selectedProductQR.position || "N/A"}</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => {
                  const printContent = document.getElementById("thermal-label-print-area")?.innerHTML;
                  if (printContent) {
                    onPrintReceipt(
                      `<div style="font-family:monospace; text-align:center; padding:10px;">${printContent}</div>`
                    );
                    setSelectedProductQR(null);
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-blue-100"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                onClick={() => setSelectedProductQR(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
