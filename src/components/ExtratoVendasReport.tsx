import React, { useState, useMemo } from "react";
import {
  FileText, Printer, FileSpreadsheet, Search, Filter, Clock,
  ArrowUpDown, CheckCircle, DollarSign, CreditCard, ShoppingBag, Eye, X, Download,
  RotateCcw, AlertTriangle, HelpCircle, Layers, Calendar
} from "lucide-react";
import { Venda, Atendimento } from "../types";

export interface ExtratoRow {
  id: string;
  timestamp: string; // ISO date string
  timeFormatted: string; // HH:mm or DD/MM HH:mm
  rawDate: Date;
  itemOrService: string;
  quantity: number;
  paymentMethod: "cash" | "debit" | "credit" | "pix" | string;
  paymentMethodFormatted: string;
  unitPrice: number;
  totalValue: number;
  sourceType: "venda" | "os";
  clientName?: string;
  controlNumber?: string;
  status?: "finalizada" | "estornada" | "aberta" | string;
  estornoReason?: string;
  rawVenda?: Venda;
}

interface ExtratoVendasReportProps {
  vendas: Venda[];
  closedOrders?: Atendimento[];
  reportType: "daily" | "range" | "annual";
  reportDate: string;
  reportStartDate: string;
  reportEndDate: string;
  reportYear?: string;
  onPrintReceipt?: (content: string) => void;
  onRefresh?: () => void;
}

export const formatPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case "pix":
      return "Pix";
    case "cash":
      return "Dinheiro";
    case "debit":
      return "Cartão de Débito";
    case "credit":
      return "Cartão de Crédito";
    case "misto":
    case "split":
    case "multiple":
      return "Misto / Dividido";
    default:
      return method ? method.charAt(0).toUpperCase() + method.slice(1) : "Dinheiro";
  }
};

export default function ExtratoVendasReport({
  vendas = [],
  closedOrders = [],
  reportType,
  reportDate,
  reportStartDate,
  reportEndDate,
  reportYear,
  onPrintReceipt,
  onRefresh
}: ExtratoVendasReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "vendas" | "os">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "finalizada" | "estornada" | "aberta">("all");
  const [ignoreDateFilter, setIgnoreDateFilter] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estorno Modal State
  const [estornoModalVenda, setEstornoModalVenda] = useState<Venda | null>(null);
  const [estornoReason, setEstornoReason] = useState("Devolução de Fone / Acessório");
  const [estornoReturnStock, setEstornoReturnStock] = useState(true);
  const [estornoCreateSangria, setEstornoCreateSangria] = useState(true);
  const [estornoLoading, setEstornoLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Local state for updated vendas if modified directly
  const [localVendas, setLocalVendas] = useState<Venda[]>(vendas);

  React.useEffect(() => {
    setLocalVendas(vendas);
  }, [vendas]);

  // Build the unified timeline rows
  const rows: ExtratoRow[] = useMemo(() => {
    const list: ExtratoRow[] = [];

    // 1. Process Direct Sales (Vendas de Balcão)
    if (sourceFilter === "all" || sourceFilter === "vendas") {
      localVendas.forEach((v) => {
        const vDate = v.date ? new Date(v.date) : new Date();
        const hours = String(vDate.getHours()).padStart(2, "0");
        const minutes = String(vDate.getMinutes()).padStart(2, "0");
        const day = String(vDate.getDate()).padStart(2, "0");
        const month = String(vDate.getMonth() + 1).padStart(2, "0");

        const timeFormatted = reportType === "daily" && !ignoreDateFilter
          ? `${hours}:${minutes}` 
          : `${day}/${month} ${hours}:${minutes}`;

        (v.items || []).forEach((item, idx) => {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const totalVal = qty * price;

          list.push({
            id: `venda-${v.id}-${idx}`,
            timestamp: v.date,
            timeFormatted,
            rawDate: vDate,
            itemOrService: item.name || "Item sem descrição",
            quantity: qty,
            paymentMethod: v.method,
            paymentMethodFormatted: formatPaymentMethodLabel(v.method),
            unitPrice: price,
            totalValue: totalVal,
            sourceType: "venda",
            clientName: v.clienteName,
            status: v.status || "finalizada",
            estornoReason: v.estornoReason,
            rawVenda: v
          });
        });
      });
    }

    // 2. Process Completed Service Orders (OS)
    if (sourceFilter === "all" || sourceFilter === "os") {
      closedOrders.forEach((os) => {
        const osDate = os.exitDate ? new Date(os.exitDate) : (os.entryDate ? new Date(os.entryDate) : new Date());
        const hours = String(osDate.getHours()).padStart(2, "0");
        const minutes = String(osDate.getMinutes()).padStart(2, "0");
        const day = String(osDate.getDate()).padStart(2, "0");
        const month = String(osDate.getMonth() + 1).padStart(2, "0");

        const timeFormatted = reportType === "daily" && !ignoreDateFilter
          ? `${hours}:${minutes}` 
          : `${day}/${month} ${hours}:${minutes}`;

        // Services in OS
        (os.services || []).forEach((srv, idx) => {
          const price = Number(srv.price) || 0;
          list.push({
            id: `os-srv-${os.id}-${idx}`,
            timestamp: os.exitDate || os.entryDate,
            timeFormatted,
            rawDate: osDate,
            itemOrService: srv.name ? `${srv.name} (OS #${os.controlNumber})` : `Serviço OS #${os.controlNumber}`,
            quantity: 1,
            paymentMethod: (os as any).paymentMethod || "cash",
            paymentMethodFormatted: formatPaymentMethodLabel((os as any).paymentMethod || "cash"),
            unitPrice: price,
            totalValue: price,
            sourceType: "os",
            controlNumber: os.controlNumber,
            status: "finalizada"
          });
        });

        // Products/Parts replaced in OS
        (os.products || []).forEach((prod, idx) => {
          const qty = Number(prod.quantity) || 1;
          const price = Number(prod.price) || 0;
          const totalVal = qty * price;
          list.push({
            id: `os-prod-${os.id}-${idx}`,
            timestamp: os.exitDate || os.entryDate,
            timeFormatted,
            rawDate: osDate,
            itemOrService: `${prod.name || "Peça/Acessório"} (OS #${os.controlNumber})`,
            quantity: qty,
            paymentMethod: (os as any).paymentMethod || "cash",
            paymentMethodFormatted: formatPaymentMethodLabel((os as any).paymentMethod || "cash"),
            unitPrice: price,
            totalValue: totalVal,
            sourceType: "os",
            controlNumber: os.controlNumber,
            status: "finalizada"
          });
        });
      });
    }

    // Sort chronologically
    return list.sort((a, b) => {
      const timeA = a.rawDate.getTime();
      const timeB = b.rawDate.getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [localVendas, closedOrders, reportType, sourceFilter, sortOrder, ignoreDateFilter]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchItem = r.itemOrService.toLowerCase().includes(query);
        const matchClient = r.clientName ? r.clientName.toLowerCase().includes(query) : false;
        const matchMethod = r.paymentMethodFormatted.toLowerCase().includes(query);
        const matchTime = r.timeFormatted.includes(query);
        const matchReason = r.estornoReason ? r.estornoReason.toLowerCase().includes(query) : false;
        const matchOS = r.controlNumber ? r.controlNumber.toLowerCase().includes(query) : false;
        if (!matchItem && !matchClient && !matchMethod && !matchTime && !matchReason && !matchOS) return false;
      }

      // Method filter
      if (methodFilter !== "all") {
        if (r.paymentMethod !== methodFilter) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "finalizada" && r.status === "estornada") return false;
        if (statusFilter === "estornada" && r.status !== "estornada") return false;
        if (statusFilter === "aberta" && r.status !== "aberta") return false;
      }

      return true;
    });
  }, [rows, searchTerm, methodFilter, statusFilter]);

  // Calculations
  const activeRows = useMemo(() => {
    return filteredRows.filter(r => r.status !== "estornada");
  }, [filteredRows]);

  const estornadasCount = useMemo(() => {
    return filteredRows.filter(r => r.status === "estornada").length;
  }, [filteredRows]);

  const totalTransacted = useMemo(() => {
    return activeRows.reduce((acc, r) => acc + r.totalValue, 0);
  }, [activeRows]);

  const totalUnits = useMemo(() => {
    return activeRows.reduce((acc, r) => acc + r.quantity, 0);
  }, [activeRows]);

  const methodTotals = useMemo(() => {
    const totals: Record<string, { count: number; total: number }> = {
      pix: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      credit: { count: 0, total: 0 },
      debit: { count: 0, total: 0 }
    };

    activeRows.forEach((r) => {
      const m = r.paymentMethod || "cash";
      if (!totals[m]) totals[m] = { count: 0, total: 0 };
      totals[m].count += r.quantity;
      totals[m].total += r.totalValue;
    });

    return totals;
  }, [activeRows]);

  const periodLabel = useMemo(() => {
    if (ignoreDateFilter) {
      return "Todas as vendas gravadas (sem restrição de data)";
    }
    if (reportType === "daily") {
      const [year, month, day] = (reportDate || "").split("-");
      return day && month && year ? `${day}/${month}/${year}` : reportDate;
    }
    if (reportType === "range") {
      return `${reportStartDate} até ${reportEndDate}`;
    }
    return `Ano ${reportYear || new Date().getFullYear()}`;
  }, [reportType, reportDate, reportStartDate, reportEndDate, reportYear, ignoreDateFilter]);

  // Handle Estorno Submit
  const handleConfirmEstorno = async () => {
    if (!estornoModalVenda) return;
    setEstornoLoading(true);
    try {
      const res = await fetch(`/api/vendas/${estornoModalVenda.id}/estorno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: estornoReason || "Devolução de Mercadoria",
          returnStock: estornoReturnStock,
          createSangria: estornoCreateSangria
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local vendas
        setLocalVendas(prev => prev.map(v => v.id === estornoModalVenda.id ? { ...v, status: "estornada", estornoReason } : v));
        setActionSuccessMsg(`Venda estornada com sucesso! ${estornoCreateSangria ? "Saída de caixa (sangria/despesa) lançada com sucesso." : ""}`);
        setEstornoModalVenda(null);
        if (onRefresh) onRefresh();
        setTimeout(() => setActionSuccessMsg(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao estornar venda.");
      }
    } catch (e: any) {
      alert("Erro ao estornar venda: " + e.message);
    } finally {
      setEstornoLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Horario;Item/Servico;Qtd;Forma de Pagamento;Valor Unitario (R$);Valor Total (R$);Status;Justificativa Estorno;Origem;Cliente\n";

    filteredRows.forEach((r) => {
      csvContent += `${r.timeFormatted};"${r.itemOrService.replace(/"/g, '""')}";${r.quantity};"${r.paymentMethodFormatted}";${r.unitPrice.toFixed(2)};${r.totalValue.toFixed(2)};"${r.status === "estornada" ? "Estornada" : "Finalizada"}";"${(r.estornoReason || "").replace(/"/g, '""')}";"${r.sourceType === "venda" ? "Venda Direta" : "Ordem de Serviço"}";"${(r.clientName || "").replace(/"/g, '""')}"\n`;
    });

    csvContent += `\n;;;;Valor Total Transacionado (Líquido):;${totalTransacted.toFixed(2)};;\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_detalhado_vendas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Thermal Print Receipt
  const handlePrintThermal = () => {
    if (!onPrintReceipt) return;

    const printableStr = `RELATORIO DETALHADO DE VENDAS
(MODO EXTRATO MINUTO A MINUTO)
GERADO: ${new Date().toLocaleString("pt-BR")}
PERIODO: ${periodLabel}
================================
HORA   ITEM/SERVICO       QTD   VALOR
================================
${activeRows
  .map((r) => {
    const time = r.timeFormatted.padEnd(5);
    const name = r.itemOrService.substring(0, 18).padEnd(18);
    const qty = `x${r.quantity}`.padStart(3);
    const val = `R$ ${r.totalValue.toFixed(2)}`.padStart(9);
    const pgto = `(${r.paymentMethodFormatted})`;
    return `${time} ${name} ${qty} ${val}\n      ${pgto}`;
  })
  .join("\n")}
================================
TOTAIS POR FORMA DE PAGAMENTO:
- Pix: R$ ${(methodTotals.pix?.total || 0).toFixed(2)}
- Dinheiro: R$ ${(methodTotals.cash?.total || 0).toFixed(2)}
- Cartão Crédito: R$ ${(methodTotals.credit?.total || 0).toFixed(2)}
- Cartão Débito: R$ ${(methodTotals.debit?.total || 0).toFixed(2)}
================================
ITENS VENDIDOS: ${totalUnits} un
TOTAL TRANSACIONADO: R$ ${totalTransacted.toFixed(2)}
${estornadasCount > 0 ? `(Estornos no período: ${estornadasCount} itens)` : ""}
================================
Minha Assistência.Tech`;

    onPrintReceipt(printableStr);
  };

  // Trigger Native A4 Browser Print
  const handlePrintA4Document = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita popups para abrir a visualização de impressão.");
      return;
    }

    const rowsHtml = filteredRows
      .map(
        (r, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${r.status === 'estornada' ? '#fff1f2' : idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; ${r.status === 'estornada' ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
          <td style="padding: 10px 14px; font-weight: 700; color: #1e293b; font-size: 13px; font-family: monospace;">${r.timeFormatted}</td>
          <td style="padding: 10px 14px; color: #334155; font-size: 13px; font-weight: 500;">
            ${r.itemOrService}
            ${r.status === 'estornada' ? `<br><small style="color: #e11d48; font-weight: 700;">[ESTORNADA: ${r.estornoReason || 'Devolução'}]</small>` : ''}
          </td>
          <td style="padding: 10px 14px; text-align: center; color: #0f172a; font-weight: 700; font-size: 13px;">${r.quantity}</td>
          <td style="padding: 10px 14px; color: #334155; font-size: 13px;">${r.paymentMethodFormatted}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: ${r.status === 'estornada' ? '#e11d48' : '#0f172a'}; font-size: 13px; font-family: monospace;">
            ${r.status === 'estornada' ? '-' : ''}R$ ${r.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Detalhado de Vendas (Modo Extrato)</title>
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 24px;
          }
          .header-container {
            margin-bottom: 24px;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px 0;
            letter-spacing: -0.3px;
          }
          .subtitle {
            font-size: 13px;
            font-style: italic;
            color: #64748b;
            margin: 0;
          }
          .period-badge {
            font-size: 11px;
            font-weight: 700;
            color: #1e3a8a;
            background-color: #eff6ff;
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            margin-bottom: 28px;
          }
          th {
            background-color: #162a5b;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            text-align: left;
            padding: 12px 14px;
          }
          th.center { text-align: center; }
          th.right { text-align: right; }
          .total-container {
            text-align: right;
            margin-top: 16px;
            padding-top: 14px;
            border-top: 2px solid #0f172a;
          }
          .total-text {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .footer-note {
            margin-top: 48px;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <h1 class="title">Relatório Detalhado de Vendas (Modo Extrato)</h1>
          <p class="subtitle">Acompanhamento minuto a minuto das movimentações do caixa</p>
          <div class="period-badge">Período: ${periodLabel} • Gerado em: ${new Date().toLocaleString("pt-BR")}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 14%;">Horário</th>
              <th style="width: 44%;">Item/Serviço</th>
              <th class="center" style="width: 10%;">Qtd</th>
              <th style="width: 20%;">Forma de Pagamento</th>
              <th class="right" style="width: 12%;">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding: 24px; color: #94a3b8;">Nenhuma movimentação registrada no período selecionado.</td></tr>'}
          </tbody>
        </table>

        <div class="total-container">
          <span class="total-text">Valor Total Líquido Transacionado: R$ ${totalTransacted.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div class="footer-note">
          Sistema de Gestão & Assistência Técnica • Relatório gerado eletronicamente em ${new Date().toLocaleString("pt-BR")}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Alert banner for Caixa Audit / Estorno information */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Helpful Hint Card */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
        <HelpCircle className="w-5 h-5 text-[#1E88E5] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold">Auditoria de Vendas & Estornos do Caixa</p>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            • <strong>Venda não apareceu?</strong> Verifique se a data coincide com o período selecionado ou marque <strong>"Exibir Todas as Vendas Gravadas"</strong>. Todas as vendas com QR Code gerado ficam salvas no banco de dados.
            <br />
            • <strong>Devolução / Estorno:</strong> Quando precisar anular uma venda de fone ou acessório, clique no botão <strong>Estornar</strong>. O sistema devolverá o item ao estoque e criará uma saída manual de caixa (sangria/despesa com a justificativa de devolução) para que o saldo em dinheiro bata com 100% de exatidão no fechamento do dia.
          </p>
        </div>
      </div>

      {/* Top Banner & Control Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-800">Relatório Detalhado de Vendas (Modo Extrato)</h3>
              <span className="bg-blue-50 text-[#1E88E5] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Minuto a Minuto
              </span>
            </div>
            <p className="text-xs text-slate-400 italic mt-0.5">
              Acompanhamento minuto a minuto das movimentações do caixa ({periodLabel})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              onClick={() => setIgnoreDateFilter(!ignoreDateFilter)}
              className={`px-3 py-2 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                ignoreDateFilter
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
              title="Alternar entre filtro de data e histórico global de vendas"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{ignoreDateFilter ? "Filtrar por Período" : "Ver Todas as Vendas (Sem data)"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Exportar Planilha CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {onPrintReceipt && (
              <button
                onClick={handlePrintThermal}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Imprimir Cupom Térmico (80mm)"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Cupom Térmico</span>
              </button>
            )}

            <button
              onClick={handlePrintA4Document}
              className="px-4 py-2 bg-[#162a5b] hover:bg-[#0f1f45] text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              title="Imprimir em Formato A4 / Salvar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Extrato A4</span>
            </button>
          </div>
        </div>

        {/* Financial Highlights Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
          <div className="bg-blue-50/70 p-3 border border-blue-100 rounded-2xl">
            <p className="text-[9px] text-blue-800 font-extrabold uppercase tracking-wide">Total Transacionado</p>
            <p className="text-base font-black text-[#1E88E5] font-mono mt-0.5">
              R$ {totalTransacted.toFixed(2)}
            </p>
          </div>

          <div className="bg-emerald-50/70 p-3 border border-emerald-100 rounded-2xl">
            <p className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wide">Total em Pix</p>
            <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">
              R$ {(methodTotals.pix?.total || 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-amber-50/70 p-3 border border-amber-100 rounded-2xl">
            <p className="text-[9px] text-amber-800 font-extrabold uppercase tracking-wide">Total em Dinheiro</p>
            <p className="text-sm font-black text-amber-700 font-mono mt-0.5">
              R$ {(methodTotals.cash?.total || 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-purple-50/70 p-3 border border-purple-100 rounded-2xl">
            <p className="text-[9px] text-purple-800 font-extrabold uppercase tracking-wide">Cartões (Crédito/Débito)</p>
            <p className="text-sm font-black text-purple-700 font-mono mt-0.5">
              R$ {((methodTotals.credit?.total || 0) + (methodTotals.debit?.total || 0)).toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-50 p-3 border border-slate-200 rounded-2xl col-span-2 sm:col-span-1">
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Itens Saídos</p>
            <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
              {totalUnits} <span className="text-[10px] font-normal text-slate-500">unidades</span>
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar item (fone, cabo, película, cópia)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E88E5] transition"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="sm:col-span-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Formas Pgto: Todas</option>
              <option value="pix">Apenas Pix</option>
              <option value="cash">Apenas Dinheiro</option>
              <option value="credit">Cartão de Crédito</option>
              <option value="debit">Cartão de Débito</option>
              <option value="misto">Misto / Dividido</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Status: Todos</option>
              <option value="finalizada">Finalizadas</option>
              <option value="estornada">Estornadas / Devolvidas</option>
              <option value="aberta">Em Aberto</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="sm:col-span-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">Tudo (Balcão & OS)</option>
              <option value="vendas">Vendas Diretas</option>
              <option value="os">Serviços OS</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <div className="sm:col-span-2">
            <button
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortOrder === "asc" ? "Antigo 1º" : "Recente 1º"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Extrato Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#162a5b] text-white">
                <th className="py-3 px-4 text-xs font-extrabold tracking-wider w-[12%]">Horário</th>
                <th className="py-3 px-4 text-xs font-extrabold tracking-wider w-[38%]">Item/Serviço</th>
                <th className="py-3 px-4 text-xs font-extrabold tracking-wider text-center w-[8%]">Qtd</th>
                <th className="py-3 px-4 text-xs font-extrabold tracking-wider w-[16%]">Forma de Pagamento</th>
                <th className="py-3 px-4 text-xs font-extrabold tracking-wider text-right w-[14%]">Valor (R$)</th>
                <th className="py-3 px-4 text-xs font-extrabold tracking-wider text-center w-[12%]">Ações / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-xs text-slate-600">Nenhuma movimentação encontrada</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {ignoreDateFilter 
                        ? "Nenhum registro encontrado no banco com os filtros aplicados." 
                        : "Nenhuma venda nesta data. Experimente clicar em 'Ver Todas as Vendas (Sem data)' acima."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isEstornada = row.status === "estornada";
                  return (
                    <tr
                      key={row.id}
                      className={`transition ${
                        isEstornada 
                          ? "bg-rose-50/40 text-rose-950" 
                          : idx % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/50 hover:bg-blue-50/40"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                        {row.timeFormatted}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isEstornada ? "line-through text-rose-900" : "text-slate-800"}`}>
                              {row.itemOrService}
                            </span>
                            {row.clientName && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({row.clientName})
                              </span>
                            )}
                          </div>
                          {isEstornada && (
                            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold">
                              <RotateCcw className="w-3 h-3" />
                              <span>Estornada: {row.estornoReason || "Devolução"}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700 font-mono">
                        {row.quantity}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            row.paymentMethod === "pix"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : row.paymentMethod === "cash"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : row.paymentMethod === "credit"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {row.paymentMethodFormatted}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono text-xs whitespace-nowrap ${
                        isEstornada ? "text-rose-600 line-through" : "text-slate-900"
                      }`}>
                        {row.totalValue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.sourceType === "venda" && row.rawVenda && (
                          <div className="flex items-center justify-center gap-1.5">
                            {!isEstornada ? (
                              <button
                                onClick={() => {
                                  setEstornoModalVenda(row.rawVenda || null);
                                  setEstornoReason(`Devolução de ${row.itemOrService.substring(0, 25)}`);
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Estornar venda e lançar devolução no caixa"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Estornar</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                                Estornada
                              </span>
                            )}
                          </div>
                        )}
                        {row.sourceType === "os" && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            OS #{row.controlNumber}
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

        {/* Footer Total Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Total de {activeRows.length} lançamentos válidos ({totalUnits} unidades) {estornadasCount > 0 && `• ${estornadasCount} estornos`}
          </span>
          <div className="text-right">
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              Valor Total Líquido Transacionado:{" "}
              <span className="font-mono text-[#162a5b] font-black">
                R$ {totalTransacted.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ESTORNO MODAL DIALOG */}
      {estornoModalVenda && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Estorno de Venda Avulsa / Devolução</h3>
                  <p className="text-[11px] text-slate-400">Cancelamento de venda com acerto automático de caixa e estoque</p>
                </div>
              </div>
              <button
                onClick={() => setEstornoModalVenda(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Venda ID:</span>
                <span className="font-mono font-bold text-slate-700">{estornoModalVenda.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Total da Venda:</span>
                <span className="font-mono font-bold text-slate-900">R$ {estornoModalVenda.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-bold text-slate-700">{formatPaymentMethodLabel(estornoModalVenda.method)}</span>
              </div>
              <div className="text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-bold">Itens na Venda:</span>
                <ul className="list-disc pl-4 mt-0.5">
                  {estornoModalVenda.items.map((it, i) => (
                    <li key={i}>{it.quantity}x {it.name} (R$ {it.price.toFixed(2)} un)</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Justificativa do Estorno / Devolução:
                </label>
                <input
                  type="text"
                  value={estornoReason}
                  onChange={(e) => setEstornoReason(e.target.value)}
                  placeholder="Ex: Devolução de Fone / Desistência do cliente"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estornoReturnStock}
                    onChange={(e) => setEstornoReturnStock(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Devolver itens vendidos de volta ao estoque da loja</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estornoCreateSangria}
                    onChange={(e) => setEstornoCreateSangria(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Lançar saída manual no caixa (sangria/despesa) para que o saldo bata certinho no fim do dia</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEstornoModalVenda(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEstorno}
                disabled={estornoLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {estornoLoading ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar Estorno & Acerto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

