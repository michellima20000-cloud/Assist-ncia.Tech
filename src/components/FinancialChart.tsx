import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, Percent, Calendar, ChevronLeft, ChevronRight, 
  Sparkles, DollarSign, ArrowUpRight, ArrowDownRight
} from "lucide-react";

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
  reportType: "daily" | "range" | "annual";
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
  const [activeTab, setActiveTab] = useState<"distribution" | "timeline" | "monthly" | "calendar">(
    reportType === "annual" ? "monthly" : "distribution"
  );

  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => {
    if (reportDate) return new Date(reportDate + "T12:00:00");
    if (reportStartDate) return new Date(reportStartDate + "T12:00:00");
    return new Date();
  });

  const [selectedCalendarDay, setSelectedCalendarDay] = useState<any>(null);

  // Sync active tab and calendar base when report parameters change
  useEffect(() => {
    if (reportType === "annual") {
      setActiveTab("monthly");
    } else if (reportType === "range") {
      setActiveTab("timeline");
      if (reportStartDate) {
        setCurrentCalendarDate(new Date(reportStartDate + "T12:00:00"));
      }
    } else {
      setActiveTab("distribution");
      if (reportDate) {
        setCurrentCalendarDate(new Date(reportDate + "T12:00:00"));
      }
    }
    setSelectedCalendarDay(null);
  }, [reportType, reportDate, reportStartDate]);

  // Format currency
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Calendar prev/next month handers
  const handlePrevMonth = () => {
    setCurrentCalendarDate((prev) => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(year, month - 1, 1);
    });
    setSelectedCalendarDay(null);
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate((prev) => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(year, month + 1, 1);
    });
    setSelectedCalendarDay(null);
  };

  // Grouping timeline data for multi-day period
  const timelineData = useMemo(() => {
    if (reportType === "daily") return [];

    const dateMap: { [key: string]: { revenue: number; expense: number } } = {};

    // Populate closed service orders
    if (closedOrders && Array.isArray(closedOrders)) {
      closedOrders.forEach((o) => {
        if (!o.exitDate) return;
        const dateKey = o.exitDate.split("T")[0]; // YYYY-MM-DD
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = { revenue: 0, expense: 0 };
        }
        dateMap[dateKey].revenue += o.totalAmount || 0;
      });
    }

    // Populate expenses
    if (expenses && Array.isArray(expenses)) {
      expenses.forEach((e) => {
        if (!e.date) return;
        const dateKey = e.date.split("T")[0]; // YYYY-MM-DD
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = { revenue: 0, expense: 0 };
        }
        dateMap[dateKey].expense += e.amount || 0;
      });
    }

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

  // Grouping monthly data for 12 months (annual report)
  const monthlyData = useMemo(() => {
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    
    // Initialize with 0s for all 12 months
    const data = months.map((m, idx) => ({
      monthIndex: idx,
      label: m,
      revenue: 0,
      expense: 0,
      balance: 0,
    }));

    // Populate closed service orders by month
    if (closedOrders && Array.isArray(closedOrders)) {
      closedOrders.forEach((o) => {
        if (!o.exitDate) return;
        const date = new Date(o.exitDate);
        const mIdx = date.getMonth(); // 0-11
        if (mIdx >= 0 && mIdx < 12) {
          data[mIdx].revenue += o.totalAmount || 0;
        }
      });
    }

    // Populate expenses by month
    if (expenses && Array.isArray(expenses)) {
      expenses.forEach((e) => {
        if (!e.date) return;
        const date = new Date(e.date);
        const mIdx = date.getMonth(); // 0-11
        if (mIdx >= 0 && mIdx < 12) {
          data[mIdx].expense += e.amount || 0;
        }
      });
    }

    // Calculate balance
    data.forEach((d) => {
      d.balance = d.revenue - d.expense;
    });

    return data;
  }, [closedOrders, expenses]);

  // Calculations for static metrics
  const totalRev = summary.revenue || 0;
  const totalExp = summary.expense || 0;
  const maxBarValue = Math.max(totalRev, totalExp, 100);

  const cashPct = totalRev > 0 ? (summary.cash / totalRev) * 100 : 0;
  const cardPct = totalRev > 0 ? (summary.card / totalRev) * 100 : 0;

  // Efficiency/Profit margin percentage
  const marginPct = totalRev > 0 ? (summary.balance / totalRev) * 100 : 0;

  // Analytical Insights for Custom Period (Range Mode)
  const rangeStats = useMemo(() => {
    if (timelineData.length === 0) return null;

    let bestDay = { label: "", revenue: 0 };
    let totalRevenue = 0;
    let totalExpense = 0;
    let profitableDays = 0;

    timelineData.forEach((d) => {
      totalRevenue += d.revenue;
      totalExpense += d.expense;
      if (d.revenue > bestDay.revenue) {
        bestDay = { label: d.label, revenue: d.revenue };
      }
      if (d.balance > 0) {
        profitableDays++;
      }
    });

    const averageDailyRevenue = totalRevenue / timelineData.length;
    const averageDailyExpense = totalExpense / timelineData.length;
    const consistencyPercentage = timelineData.length > 0 
      ? (profitableDays / timelineData.length) * 100 
      : 0;

    return {
      bestDay: bestDay.revenue > 0 ? bestDay : null,
      averageDailyRevenue,
      averageDailyExpense,
      profitableDays,
      totalDays: timelineData.length,
      consistencyPercentage
    };
  }, [timelineData]);

  // Draw SVG Line Chart variables for Range Mode (Daily timeline)
  const svgLinePoints = useMemo(() => {
    if (timelineData.length < 2) return { revenuePath: "", revenueAreaPath: "", expensePath: "", points: [] };

    const width = 450;
    const height = 140;
    const padding = 25;

    const maxVal = Math.max(...timelineData.map((d) => Math.max(d.revenue, d.expense, 50)));
    const minVal = 0;
    const valRange = maxVal - minVal || 50;

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

    // Generate Area path for Revenue with bottom boundary
    let revenueAreaPath = "";
    if (points.length > 0) {
      revenueAreaPath = `${revenuePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }

    return { revenuePath, revenueAreaPath, expensePath, points };
  }, [timelineData]);

  // Draw SVG Line/Area Chart variables for Annual Mode (12-month evolution)
  const svgMonthlyPoints = useMemo(() => {
    const width = 450;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;

    // Scale y axis between 0 and maxVal (minimum 100)
    const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.revenue, d.expense, 100)));
    const minVal = 0;
    const valRange = maxVal - minVal || 100;

    const xStep = (width - paddingLeft - paddingRight) / 11; // 12 months, 11 intervals

    const points = monthlyData.map((d, index) => {
      const x = paddingLeft + index * xStep;
      // Invert Y coordinate so 0 is at bottom
      const revY = height - paddingBottom - ((d.revenue - minVal) / valRange) * (height - paddingTop - paddingBottom);
      const expY = height - paddingBottom - ((d.expense - minVal) / valRange) * (height - paddingTop - paddingBottom);

      return { x, revY, expY, ...d };
    });

    // Generate paths
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

    // Generate Area path for Revenue with bottom boundary
    let revenueAreaPath = "";
    if (points.length > 0) {
      revenueAreaPath = `${revenuePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    return { revenuePath, revenueAreaPath, expensePath, points, width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, maxVal };
  }, [monthlyData]);

  // Calendar Grid Calculations (combines days of previous, current, and next months to form full grid)
  const calendarGrid = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-11

    // First day of current month
    const firstDayOfMonth = new Date(year, month, 1);
    // Day of the week of the first day (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = firstDayOfMonth.getDay();

    // Number of days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Padding days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Padding days for next month to complete visual weekly grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Map financial values to each day in the calendar grid
    return days.map((day) => {
      let revenue = 0;
      let expense = 0;
      let cash = 0;
      let card = 0;
      const dayOrders: any[] = [];
      const dayExpenses: any[] = [];

      if (closedOrders && Array.isArray(closedOrders)) {
        closedOrders.forEach((o) => {
          if (!o.exitDate) return;
          const oDate = o.exitDate.split("T")[0];
          if (oDate === day.dateStr) {
            revenue += o.totalAmount || 0;
            dayOrders.push(o);
            
            if (o.paymentMethod === "money" || o.paymentMethod === "cash") {
              cash += o.totalAmount || 0;
            } else {
              card += o.totalAmount || 0;
            }
          }
        });
      }

      if (expenses && Array.isArray(expenses)) {
        expenses.forEach((e) => {
          if (!e.date) return;
          const eDate = e.date.split("T")[0];
          if (eDate === day.dateStr) {
            expense += e.amount || 0;
            dayExpenses.push(e);
          }
        });
      }

      const daysOfWeekNames = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ];
      const dObj = new Date(day.dateStr + "T12:00:00");
      const dayOfWeekName = daysOfWeekNames[dObj.getDay()];

      return {
        ...day,
        revenue,
        expense,
        balance: revenue - expense,
        cash,
        card,
        orders: dayOrders,
        expenses: dayExpenses,
        dayOfWeekName,
      };
    });
  }, [currentCalendarDate, closedOrders, expenses]);

  return (
    <div id="financial-report-chart" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1E88E5]/10 rounded-lg text-[#1E88E5]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Análise de Desempenho</h4>
            <p className="text-[10px] text-slate-400">Distribuição financeira e fluxo de caixa</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-end sm:self-auto flex-wrap gap-0.5">
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
          {reportType === "range" && timelineData.length > 1 && (
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
          )}
          {(reportType === "range" || reportType === "annual") && (
            <button
              onClick={() => setActiveTab("monthly")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                activeTab === "monthly"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Evolução Mensal
            </button>
          )}
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${
              activeTab === "calendar"
                ? "bg-white text-slate-800 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-3 h-3 text-[#1E88E5]" />
            Calendário do Fluxo
          </button>
        </div>
      </div>

      {activeTab === "distribution" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Cash flow comparison */}
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
                    className="bg-emerald-50 h-full rounded-full"
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
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Saldo</span>
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
      ) : activeTab === "timeline" && timelineData.length >= 2 ? (
        /* Timeline line chart for multi-day periods */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Histórico de Fluxo de Caixa no Período</p>
              <p className="text-[9px] text-slate-400 font-sans">Visualização diária do intervalo selecionado</p>
            </div>
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

          <div className="w-full overflow-x-auto relative">
            <div className="min-w-[460px] relative pb-2 select-none">
              
              {/* Dollar watermark inside graph */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/5">
                  <span className="text-4xl font-black text-emerald-600">$</span>
                </div>
              </div>

              <svg width="100%" height="165" viewBox="0 0 450 165" className="overflow-visible">
                <defs>
                  <linearGradient id="timelineRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vertical Dotted Guides for each day */}
                {svgLinePoints.points.map((pt, idx) => {
                  const showGrid = timelineData.length <= 15 || idx % Math.ceil(timelineData.length / 15) === 0;
                  if (!showGrid) return null;
                  return (
                    <line
                      key={`t-grid-${idx}`}
                      x1={pt.x}
                      y1="25"
                      x2={pt.x}
                      y2="135"
                      stroke="#10B981"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                      className="opacity-15"
                    />
                  );
                })}

                {/* Horizontal grid lines */}
                <line x1="25" y1="25" x2="425" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="70" x2="425" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="115" x2="425" y2="115" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Bottom line */}
                <line x1="25" y1="135" x2="425" y2="135" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Revenue Gradient Fill */}
                {svgLinePoints.revenueAreaPath && (
                  <motion.path
                    d={svgLinePoints.revenueAreaPath}
                    fill="url(#timelineRevenueGrad)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                )}

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
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="3 2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                  />
                )}

                {/* Dots on top of coordinates */}
                {svgLinePoints.points.map((pt, idx) => {
                  const showDot = timelineData.length <= 20 || idx % Math.ceil(timelineData.length / 20) === 0 || idx === timelineData.length - 1;
                  
                  return (
                    <g key={idx} className="group cursor-pointer">
                      {/* Hover indicator vertical bar */}
                      <line
                        x1={pt.x}
                        y1="20"
                        x2={pt.x}
                        y2="135"
                        stroke="#e2e8f0"
                        strokeWidth="1.5"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />

                      {/* Revenue Dot */}
                      {showDot && (
                        <circle
                          cx={pt.x}
                          cy={pt.revY}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#10B981"
                          strokeWidth="2.5"
                          className="filter drop-shadow-sm transition-all group-hover:r-6 group-hover:stroke-emerald-600"
                        />
                      )}

                      {/* Expense Dot */}
                      {showDot && (
                        <circle
                          cx={pt.x}
                          cy={pt.expY}
                          r="3"
                          fill="#EF4444"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          className="filter drop-shadow-sm transition-all group-hover:r-4.5"
                        />
                      )}

                      {/* X Axis Date Label */}
                      {(timelineData.length <= 12 || idx % Math.ceil(timelineData.length / 10) === 0 || idx === timelineData.length - 1) && (
                        <text
                          x={pt.x}
                          y="152"
                          fill="#475569"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {pt.label}
                        </text>
                      )}

                      {/* Tooltip Content displayed on hover */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-150">
                        <rect
                          x={pt.x - 60}
                          y={Math.min(pt.revY, pt.expY) - 52}
                          width="120"
                          height="40"
                          rx="8"
                          fill="#0f172a"
                          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                        />
                        <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 39} fill="#38bdf8" fontSize="8.5" fontWeight="black" textAnchor="middle" className="font-sans">
                          Dia {pt.label}
                        </text>
                        <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 27} fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono">
                          Entrou: {formatBRL(pt.revenue)}
                        </text>
                        <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 17} fill="#f87171" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono">
                          Gastou: {formatBRL(pt.expense)}
                        </text>
                        <polygon
                          points={`${pt.x-4},${Math.min(pt.revY, pt.expY)-12} ${pt.x+4},${Math.min(pt.revY, pt.expY)-12} ${pt.x},${Math.min(pt.revY, pt.expY)-8}`}
                          fill="#0f172a"
                        />
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Dynamic Performance Insights */}
          {rangeStats && (
            <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center font-sans">
              <div>
                <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider">Média Diária</span>
                <span className="text-xs font-black text-slate-700 font-mono">
                  {formatBRL(rangeStats.averageDailyRevenue)}
                </span>
                <span className="text-[7.5px] text-slate-400 block mt-0.5">Faturamento médio</span>
              </div>
              <div>
                <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider">Melhor Dia</span>
                <span className="text-xs font-black text-emerald-600 font-mono">
                  {rangeStats.bestDay 
                    ? `Dia ${rangeStats.bestDay.label} (${formatBRL(rangeStats.bestDay.revenue)})` 
                    : "N/A"
                  }
                </span>
                <span className="text-[7.5px] text-slate-400 block mt-0.5">Pico de faturamento</span>
              </div>
              <div>
                <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider">Dias Positivos</span>
                <span className="text-xs font-black text-[#1E88E5] font-mono">
                  {rangeStats.profitableDays} de {rangeStats.totalDays}
                </span>
                <span className="text-[7.5px] text-slate-400 block mt-0.5">
                  ({rangeStats.consistencyPercentage.toFixed(0)}% do período)
                </span>
              </div>
            </div>
          )}

          <p className="text-[9px] text-slate-400 text-center font-medium italic mt-1 font-sans">
            Passe o mouse por cima dos pontos do gráfico para ver os detalhes de cada dia.
          </p>
        </div>
      ) : activeTab === "monthly" ? (
        /* Monthly evolution */
        <div className="space-y-4 relative">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Evolução Mensal do Caixa</p>
              <p className="text-[9px] text-slate-400 font-sans">Visualização anual consolidada mês a mês</p>
            </div>
            <div className="flex gap-3 text-[10px] font-bold font-sans">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Faturamento
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Despesas
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto relative">
            <div className="min-w-[460px] relative pb-2 select-none">
              
              {/* Center Watermark icon matching the user image exactly! */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none">
                <div className="w-28 h-28 rounded-full border-8 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                  <span className="text-6xl font-black text-emerald-600">$</span>
                </div>
              </div>

              <svg width="100%" height="220" viewBox="0 0 450 220" className="overflow-visible">
                <defs>
                  <linearGradient id="monthlyRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vertical Dotted Guides (dashed like the user image) */}
                {svgMonthlyPoints.points.map((pt, idx) => (
                  <line
                    key={`v-grid-${idx}`}
                    x1={pt.x}
                    y1="25"
                    x2={pt.x}
                    y2="185"
                    stroke="#10B981"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    className="opacity-25"
                  />
                ))}

                {/* Horizontal grid lines */}
                <line x1="35" y1="25" x2="430" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="35" y1="65" x2="430" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="35" y1="105" x2="430" y2="105" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="35" y1="145" x2="430" y2="145" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="35" y1="185" x2="430" y2="185" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Area Gradient under curves */}
                {svgMonthlyPoints.revenueAreaPath && (
                  <motion.path
                    d={svgMonthlyPoints.revenueAreaPath}
                    fill="url(#monthlyRevenueGrad)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  />
                )}

                {/* Glowing curves */}
                {svgMonthlyPoints.revenuePath && (
                  <motion.path
                    d={svgMonthlyPoints.revenuePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  />
                )}

                {svgMonthlyPoints.expensePath && (
                  <motion.path
                    d={svgMonthlyPoints.expensePath}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="4 3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }}
                  />
                )}

                {/* Dots on top of coordinates */}
                {svgMonthlyPoints.points.map((pt, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    {/* Hover indicator vertical bar */}
                    <line
                      x1={pt.x}
                      y1="25"
                      x2={pt.x}
                      y2="185"
                      stroke="#10B981"
                      strokeWidth="2"
                      className="opacity-0 group-hover:opacity-10 transition-opacity"
                    />

                    {/* Revenue Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.revY}
                      r="5.5"
                      fill="#ffffff"
                      stroke="#10B981"
                      strokeWidth="3.5"
                      className="filter drop-shadow-md transition-all group-hover:r-7 group-hover:stroke-emerald-600"
                    />

                    {/* Expense Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.expY}
                      r="4"
                      fill="#EF4444"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="filter drop-shadow-sm transition-all group-hover:r-5"
                    />

                    {/* X-axis labels */}
                    <text
                      x={pt.x}
                      y="204"
                      fill="#475569"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-sans"
                    >
                      {pt.label}
                    </text>

                    {/* Inline values showing above non-zero points */}
                    {pt.revenue > 0 && (
                      <text
                        x={pt.x}
                        y={pt.revY - 12}
                        fill="#047857"
                        fontSize="8"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        className="opacity-80 group-hover:opacity-100 transition-opacity font-mono font-sans bg-white/80 rounded"
                      >
                        {pt.revenue >= 1000 ? `${(pt.revenue / 1000).toFixed(1)}k` : pt.revenue.toFixed(0)}
                      </text>
                    )}

                    {/* Dynamic hover tooltips */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-150">
                      <rect
                        x={pt.x - 65}
                        y={Math.min(pt.revY, pt.expY) - 55}
                        width="130"
                        height="44"
                        rx="8"
                        fill="#0f172a"
                        filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                      />
                      <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 41} fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-sans">
                        Mês de {pt.label}
                      </text>
                      <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 29} fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" className="font-mono">
                        Receita: {formatBRL(pt.revenue)}
                      </text>
                      <text x={pt.x} y={Math.min(pt.revY, pt.expY) - 19} fill="#f87171" fontSize="8.5" fontWeight="bold" textAnchor="middle" className="font-mono">
                        Despesas: {formatBRL(pt.expense)}
                      </text>
                      <polygon
                        points={`${pt.x-4},${Math.min(pt.revY, pt.expY)-11} ${pt.x+4},${Math.min(pt.revY, pt.expY)-11} ${pt.x},${Math.min(pt.revY, pt.expY)-7}`}
                        fill="#0f172a"
                      />
                    </g>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Monthly Stats Insights row */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center font-sans">
            <div>
              <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider">Melhor Mês</span>
              <span className="text-xs font-black text-emerald-600 font-mono">
                {(() => {
                  const maxRev = Math.max(...monthlyData.map(d => d.revenue));
                  const best = monthlyData.find(d => d.revenue === maxRev && d.revenue > 0);
                  return best ? `${best.label} (${formatBRL(best.revenue)})` : "N/A";
                })()}
              </span>
            </div>
            <div>
              <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider">Média Mensal</span>
              <span className="text-xs font-black text-slate-700 font-mono">
                {formatBRL(monthlyData.reduce((acc, d) => acc + d.revenue, 0) / 12)}
              </span>
            </div>
            <div>
              <span className="text-[8.5px] text-slate-400 block font-bold uppercase tracking-wider">Meses Positivos</span>
              <span className="text-xs font-black text-[#1E88E5] font-mono">
                {monthlyData.filter(d => d.balance > 0).length} de 12
              </span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 text-center font-medium italic mt-1 font-sans">
            Passe o mouse por cima dos pontos para ver detalhes completos de receitas e despesas.
          </p>
        </div>
      ) : (
        /* INTERACTIVE CASH FLOW CALENDAR WITH DAYS OF THE WEEK (Perfect User Requirement Fit!) */
        <div className="space-y-5">
          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Calendário de Movimentação</p>
              <p className="text-xs font-extrabold text-slate-700 font-sans">
                {monthNames[currentCalendarDate.getMonth()]} de {currentCalendarDate.getFullYear()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 bg-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 bg-white transition"
              >
                Hoje
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 bg-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Calendar Grid Area */}
            <div className="lg:col-span-7 space-y-3">
              {/* Weekdays header with Days of the Week! */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase font-sans tracking-wide">
                <div className="text-red-500">Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div className="text-blue-500">Sáb</div>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarGrid.map((day, idx) => {
                  const isSelected = selectedCalendarDay && selectedCalendarDay.dateStr === day.dateStr;

                  // Is in currently selected period?
                  let isInRange = false;
                  if (reportType === "daily" && reportDate === day.dateStr) {
                    isInRange = true;
                  } else if (reportType === "range" && reportStartDate && reportEndDate) {
                    isInRange = day.dateStr >= reportStartDate && day.dateStr <= reportEndDate;
                  } else if (reportType === "annual") {
                    const derivedYear = reportStartDate ? reportStartDate.split("-")[0] : reportDate ? reportDate.split("-")[0] : String(currentCalendarDate.getFullYear());
                    isInRange = day.dateStr.startsWith(derivedYear);
                  }

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setSelectedCalendarDay(day)}
                      className={`min-h-[56px] p-1 rounded-xl border flex flex-col justify-between cursor-pointer transition relative ${
                        day.isCurrentMonth 
                          ? isSelected
                            ? "bg-blue-50 border-[#1E88E5] shadow-xs"
                            : isInRange
                              ? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50"
                          : "bg-slate-50/40 border-slate-100/30 text-slate-400 hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-extrabold font-mono ${
                          day.isCurrentMonth ? "text-slate-800" : "text-slate-400"
                        }`}>
                          {day.dayNum}
                        </span>
                        
                        {/* Indicators dots inside calendar days */}
                        {day.isCurrentMonth && (day.revenue > 0 || day.expense > 0) && (
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            day.balance >= 0 ? "bg-emerald-500" : "bg-red-500"
                          }`} />
                        )}
                      </div>

                      {/* Displaying simple miniature bars or dot metrics */}
                      <div className="space-y-0.5 mt-1">
                        {day.revenue > 0 && (
                          <div className="bg-emerald-50 text-emerald-700 font-extrabold font-mono text-[8px] py-0.5 px-1 rounded-xs text-center border border-emerald-100/80 truncate">
                            +{day.revenue >= 1000 ? `${(day.revenue / 1000).toFixed(0)}k` : day.revenue.toFixed(0)}
                          </div>
                        )}
                        {day.expense > 0 && (
                          <div className="bg-red-50 text-red-700 font-extrabold font-mono text-[8px] py-0.5 px-1 rounded-xs text-center border border-red-100/80 truncate">
                            -{day.expense >= 1000 ? `${(day.expense / 1000).toFixed(0)}k` : day.expense.toFixed(0)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Brief Legend */}
              <div className="flex gap-4 justify-center text-[9px] font-bold text-slate-400 font-sans pt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500 inline-block" />
                  Dias com Receita
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-red-500 inline-block" />
                  Dias com Despesa
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded border border-[#1E88E5] bg-blue-50 inline-block" />
                  Dia Selecionado
                </span>
              </div>
            </div>

            {/* Sidebar Details of the selected day */}
            <div className="lg:col-span-5 flex flex-col h-full justify-between">
              {selectedCalendarDay ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 h-full flex flex-col justify-between"
                >
                  {/* Selected Day Header */}
                  <div className="border-b border-slate-200 pb-2.5">
                    <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block font-sans">
                      {selectedCalendarDay.dayOfWeekName}
                    </span>
                    <h5 className="font-extrabold text-sm text-slate-800 font-sans">
                      Dia {selectedCalendarDay.dayNum} de {monthNames[currentCalendarDate.getMonth()]}
                    </h5>
                  </div>

                  {/* Cash Flow metrics for that single day */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-slate-150 p-2.5 rounded-xl text-center shadow-xs">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Receitas</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">
                        {formatBRL(selectedCalendarDay.revenue)}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-150 p-2.5 rounded-xl text-center shadow-xs">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Despesas</span>
                      <span className="text-xs font-black text-red-500 font-mono">
                        {formatBRL(selectedCalendarDay.expense)}
                      </span>
                    </div>
                  </div>

                  {/* Day's Balance */}
                  <div className={`p-2.5 rounded-xl border flex justify-between items-center ${
                    selectedCalendarDay.balance >= 0 
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                      : "bg-red-50/50 border-red-100 text-red-800"
                  }`}>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider">Saldo do Dia:</span>
                    <span className="text-xs font-black font-mono">
                      {formatBRL(selectedCalendarDay.balance)}
                    </span>
                  </div>

                  {/* List of Closed Orders / Services */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[130px] min-h-[90px] pt-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Serviços Fechados ({selectedCalendarDay.orders.length})</span>
                    {selectedCalendarDay.orders.length > 0 ? (
                      <div className="space-y-1">
                        {selectedCalendarDay.orders.map((o: any, idx: number) => (
                          <div key={idx} className="bg-white border border-slate-150 p-2 rounded-lg flex justify-between items-center text-[10px] shadow-2xs">
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-700 block truncate">OS #{o.controlNumber} - {o.clientName}</span>
                              <span className="text-[8.5px] text-slate-400 font-medium font-mono">{o.vehicleBrand} {o.vehicleModel}</span>
                            </div>
                            <span className="font-extrabold text-slate-800 font-mono text-right">{formatBRL(o.totalAmount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9.5px] text-slate-400 italic">Nenhum serviço fechado neste dia.</p>
                    )}
                  </div>

                  {/* List of Registered Expenses */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[110px] min-h-[70px] pt-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans">Despesas Registradas ({selectedCalendarDay.expenses.length})</span>
                    {selectedCalendarDay.expenses.length > 0 ? (
                      <div className="space-y-1">
                        {selectedCalendarDay.expenses.map((e: any, idx: number) => (
                          <div key={idx} className="bg-white border border-slate-150 p-2 rounded-lg flex justify-between items-center text-[10px] shadow-2xs">
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-700 block truncate">{e.description}</span>
                              <span className="text-[8.5px] text-slate-400 font-medium">{e.category || "Geral"}</span>
                            </div>
                            <span className="font-extrabold text-red-500 font-mono text-right">-{formatBRL(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9.5px] text-slate-400 italic">Nenhuma despesa registrada neste dia.</p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                  <div className="p-3 bg-[#1E88E5]/10 rounded-full text-[#1E88E5] mb-3 animate-pulse">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h6 className="font-extrabold text-xs text-slate-700 mb-1 font-sans">Detalhamento por Dia da Semana</h6>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed font-sans">
                    Selecione qualquer dia no calendário para ver o faturamento, despesas e as ordens de serviço correspondentes!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
