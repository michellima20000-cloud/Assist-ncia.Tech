import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Percent } from "lucide-react";

interface FinancialChartProps {
  reportResult: {
    payments: any[];
    expenses: any[];
    closedOrders: any[];
    summary: {
      cash: number;
      card: number;
      revenue: number;
      expense: number;
      balance: number;
    };
  };
  reportType: "daily" | "range";
  reportDate?: string;
  reportStartDate?: string;
  reportEndDate?: string;
}

export default function FinancialChart({
  reportResult,
  reportType,
  reportDate,
  reportStartDate,
  reportEndDate,
}: FinancialChartProps) {
  const { summary, closedOrders, expenses } = reportResult;
  const [activeTab, setActiveTab] = useState<"distribution" | "timeline">("distribution");

  // Format currency
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Grouping timeline data for multi-day period
  const timelineData = useMemo(() => {
    if (reportType !== "range") return [];

    const dateMap: { [key: string]: { revenue: number; expense: number } } = {};

    // Populate closed service orders
    closedOrders.forEach((o) => {
      if (!o.exitDate) return;
      const dateKey = o.exitDate.split("T")[0]; // YYYY-MM-DD
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { revenue: 0, expense: 0 };
      }
      dateMap[dateKey].revenue += o.totalAmount || 0;
    });

    // Populate expenses
    expenses.forEach((e) => {
      if (!e.date) return;
      const dateKey = e.date.split("T")[0]; // YYYY-MM-DD
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { revenue: 0, expense: 0 };
      }
      dateMap[dateKey].expense += e.amount || 0;
    });

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort();

    return sortedDates.map((dateStr) => {
      // Format to DD/MM
      const parts = dateStr.split("-");
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      return {
        dateStr,
        label,
        revenue: dateMap[dateStr].revenue,
        expense: dateMap[dateStr].expense,
        balance: dateMap[dateStr].revenue - dateMap[dateStr].expense,
      };
    });
  }, [closedOrders, expenses, reportType]);

  // Calculations for charts
  const totalRev = summary.revenue || 0;
  const totalExp = summary.expense || 0;
  const maxBarValue = Math.max(totalRev, totalExp, 100);

  const cashPct = totalRev > 0 ? (summary.cash / totalRev) * 100 : 0;
  const cardPct = totalRev > 0 ? (summary.card / totalRev) * 100 : 0;

  // Efficiency/Profit margin percentage
  const marginPct = totalRev > 0 ? (summary.balance / totalRev) * 100 : 0;

  // Draw SVG Line Chart variables for Range Mode
  const svgLinePoints = useMemo(() => {
    if (timelineData.length < 2) return { revenuePath: "", expensePath: "", points: [] };

    const width = 450;
    const height = 140;
    const padding = 25;

    const maxVal = Math.max(...timelineData.map((d) => Math.max(d.revenue, d.expense, 50)));
    const minVal = 0;
    const valRange = maxVal - minVal;

    const xStep = (width - padding * 2) / (timelineData.length - 1);

    const points = timelineData.map((d, index) => {
      const x = padding + index * xStep;
      // Invert Y coordinate so 0 is at bottom
      const revY = height - padding - ((d.revenue - minVal) / valRange) * (height - padding * 2);
      const expY = height - padding - ((d.expense - minVal) / valRange) * (height - padding * 2);

      return { x, revY, expY, ...d };
    });

    // Generate path descriptions
    let revenuePath = "";
    let expensePath = "";

    points.forEach((p, idx) => {
      if (idx === 0) {
        revenuePath = `M ${p.x} ${p.revY}`;
        expensePath = `M ${p.x} ${p.expY}`;
      } else {
        revenuePath += ` L ${p.x} ${p.revY}`;
        expensePath += ` L ${p.x} ${p.expY}`;
      }
    });

    return { revenuePath, expensePath, points };
  }, [timelineData]);

  return (
    <div id="financial-report-chart" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1E88E5]/10 rounded-lg text-[#1E88E5]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Análise de Desempenho</h4>
            <p className="text-[10px] text-slate-400">Distribuição financeira e fluxo de caixa</p>
          </div>
        </div>

        {/* Tab Switcher if range */}
        {reportType === "range" && timelineData.length > 1 && (
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab("distribution")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                activeTab === "distribution"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Distribuição
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                activeTab === "timeline"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Evolução Diária
            </button>
          </div>
        )}
      </div>

      {activeTab === "distribution" || reportType === "daily" || timelineData.length < 2 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Cash flow comparisom */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fluxo de Caixa (Entradas vs Despesas)</p>
            
            <div className="space-y-3">
              {/* Revenue Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Faturamento total (Receitas)
                  </span>
                  <span className="font-bold text-slate-800">{formatBRL(totalRev)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-emerald-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(totalRev / maxBarValue) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Expense Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    Despesas do período
                  </span>
                  <span className="font-bold text-slate-800">{formatBRL(totalExp)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-red-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(totalExp / maxBarValue) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Balance Conversion Stat */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${marginPct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    <Percent className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Conversão Líquida</span>
                    <span className="text-xs text-slate-600 font-medium">Margem de aproveitamento</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black font-mono ${marginPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Distribution Circle chart */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribuição de Meios de Recebimento</p>
            
            <div className="flex items-center gap-6 justify-center bg-slate-50/50 border border-slate-100/60 p-3 rounded-2xl">
              {/* Donut SVG Chart */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 42 42" className="transform -rotate-90">
                  {/* Background Circle */}
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4.2" />
                  
                  {/* Cash Segment */}
                  {cashPct > 0 && (
                    <motion.circle
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke="#10B981" // Emerald-500
                      strokeWidth="4.2"
                      strokeDasharray={`${cashPct} ${100 - cashPct}`}
                      strokeDashoffset="0"
                      initial={{ strokeDasharray: "0 100" }}
                      animate={{ strokeDasharray: `${cashPct} ${100 - cashPct}` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  )}

                  {/* Card Segment */}
                  {cardPct > 0 && (
                    <motion.circle
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke="#3B82F6" // Blue-500
                      strokeWidth="4.2"
                      strokeDasharray={`${cardPct} ${100 - cardPct}`}
                      strokeDashoffset={100 - cashPct}
                      initial={{ strokeDasharray: "0 100" }}
                      animate={{ strokeDasharray: `${cardPct} ${100 - cardPct}` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    />
                  )}
                </svg>
                {/* Center metric */}
                <div className="absolute text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Saldo</span>
                  <span className="text-xs font-black font-mono text-slate-700">{formatBRL(summary.balance)}</span>
                </div>
              </div>

              {/* Legend with exact amounts */}
              <div className="space-y-2 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    <span className="text-slate-600 font-medium">Dinheiro:</span>
                  </div>
                  <span className="font-bold text-slate-800 font-mono text-right">{formatBRL(summary.cash)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                    <span className="text-slate-600 font-medium">Pix / Cartões:</span>
                  </div>
                  <span className="font-bold text-slate-800 font-mono text-right">{formatBRL(summary.card)}</span>
                </div>
                <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-[10px] text-slate-400 uppercase">
                  <span>Total arrecadado:</span>
                  <span className="font-mono text-slate-700">{formatBRL(totalRev)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Timeline line chart for multi-day periods */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico de Fluxo de Caixa no Período</p>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Receita Diária
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Despesa Diária
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[460px] relative pb-2 select-none">
              <svg width="100%" height="160" viewBox="0 0 450 160" className="overflow-visible">
                {/* Horizontal grid lines */}
                <line x1="25" y1="25" x2="425" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="70" x2="425" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="115" x2="425" y2="115" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Bottom line */}
                <line x1="25" y1="135" x2="425" y2="135" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Render Curves */}
                {svgLinePoints.revenuePath && (
                  <motion.path
                    d={svgLinePoints.revenuePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                )}

                {svgLinePoints.expensePath && (
                  <motion.path
                    d={svgLinePoints.expensePath}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  />
                )}

                {/* Draw Points & Tooltips */}
                {svgLinePoints.points.map((pt, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    {/* Hover indicator vertical bar */}
                    <line
                      x1={pt.x}
                      y1="20"
                      x2={pt.x}
                      y2="135"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />

                    {/* Revenue Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.revY}
                      r="4.5"
                      fill="#10B981"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="filter drop-shadow-sm transition-all group-hover:r-6"
                    />

                    {/* Expense Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.expY}
                      r="3.5"
                      fill="#EF4444"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="filter drop-shadow-sm transition-all group-hover:r-5"
                    />

                    {/* X Axis Date Label */}
                    <text
                      x={pt.x}
                      y="152"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {pt.label}
                    </text>

                    {/* Tooltip Content displayed on hover or static placement above */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-150">
                      <rect
                        x={pt.x - 55}
                        y={Math.min(pt.revY, pt.expY) - 50}
                        width="110"
                        height="38"
                        rx="8"
                        fill="#0f172a"
                        filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
                      />
                      <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 38} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                        Entradas: {formatBRL(pt.revenue)}
                      </text>
                      <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 26} fill="#f87171" fontSize="8" fontWeight="bold" textAnchor="middle">
                        Saídas: {formatBRL(pt.expense)}
                      </text>
                      <polygon
                        points={`${pt.x-4},${Math.min(pt.revY, pt.expY)-12} ${pt.x+4},${Math.min(pt.revY, pt.expY)-12} ${pt.x},${Math.min(pt.revY, pt.expY)-8}`}
                        fill="#0f172a"
                      />
                    </g>
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 text-center font-medium italic mt-1">
            Passe o mouse por cima dos pontos do gráfico para ver os detalhes de cada dia.
          </p>
        </div>
      )}
    </div>
  );
}
