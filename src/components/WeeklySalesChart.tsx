import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { TrendingUp, DollarSign, RefreshCw, ShoppingCart, Calendar, FileText, Award } from "lucide-react";
import { Venda } from "../types";

export default function WeeklySalesChart() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate dates for past 7 days
  const past7Days = useMemo(() => {
    const days = [];
    const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = `${dd}/${mm} (${daysOfWeek[d.getDay()]})`;
      
      days.push({ dateStr, label });
    }
    return days;
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const todayStr = new Date().toLocaleDateString('sv-SE');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startStr = sevenDaysAgo.toLocaleDateString('sv-SE');
      const offset = new Date().getTimezoneOffset();

      const [vendasRes, reportsRes] = await Promise.all([
        fetch("/api/vendas"),
        fetch(`/api/reports?type=range&startDate=${startStr}&endDate=${todayStr}&offset=${offset}`)
      ]);

      if (!vendasRes.ok || !reportsRes.ok) {
        throw new Error("Erro ao carregar dados financeiros do servidor.");
      }

      const vendasData = await vendasRes.json();
      const reportsData = await reportsRes.json();

      setVendas(Array.isArray(vendasData) ? vendasData : []);
      setPayments(Array.isArray(reportsData.payments) ? reportsData.payments : []);
    } catch (err: any) {
      console.error("Error fetching weekly sales data:", err);
      setError(err.message || "Falha na conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [past7Days]);

  // Build the chart data series
  const chartData = useMemo(() => {
    return past7Days.map(({ dateStr, label }) => {
      // Direct sales
      const dayVendas = vendas.filter(v => v.date && v.date.substring(0, 10) === dateStr);
      const vendasTotal = dayVendas.reduce((sum, v) => sum + (Number(v.totalAmount) || 0), 0);

      // Total billing payments (Direct sales + OS payments)
      const dayPayments = payments.filter(p => p.date && p.date.substring(0, 10) === dateStr);
      const totalFaturamento = dayPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

      // OS finalized order payments
      const osPayments = dayPayments.filter(p => !p.isVendaDirecta);
      const osTotal = osPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

      return {
        name: label,
        "Faturamento Total": totalFaturamento,
        "Venda de Produtos": vendasTotal,
        "Ordens de Serviço": osTotal
      };
    });
  }, [past7Days, vendas, payments]);

  // Weekly aggregate metrics
  const metrics = useMemo(() => {
    let totalWeekly = 0;
    let totalVendas = 0;
    let totalOS = 0;
    let maxDay = { name: "N/A", value: 0 };

    chartData.forEach(d => {
      totalWeekly += d["Faturamento Total"];
      totalVendas += d["Venda de Produtos"];
      totalOS += d["Ordens de Serviço"];

      if (d["Faturamento Total"] > maxDay.value) {
        maxDay = { name: d.name, value: d["Faturamento Total"] };
      }
    });

    const averageDaily = totalWeekly / 7;

    return {
      totalWeekly,
      totalVendas,
      totalOS,
      averageDaily,
      maxDay
    };
  }, [chartData]);

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <p className="text-slate-500 text-xs font-semibold">Carregando faturamento da semana...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
        <p className="text-red-500 text-xs font-bold mb-2">Erro ao carregar dados do gráfico</p>
        <p className="text-slate-500 text-[11px] mb-4 max-w-xs">{error}</p>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Evolução de Caixa Semanal</h4>
            <p className="text-[10px] text-slate-400">Faturamento diário combinado nos últimos 7 dias</p>
          </div>
        </div>
        
        <button
          onClick={fetchData}
          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition"
          title="Atualizar dados"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Mini Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#F8FAF6] border border-emerald-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Faturamento da Semana</span>
            <span className="text-sm font-black text-slate-800 font-mono">{formatBRL(metrics.totalWeekly)}</span>
          </div>
        </div>

        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Média Diária</span>
            <span className="text-sm font-black text-slate-800 font-mono">{formatBRL(metrics.averageDaily)}</span>
          </div>
        </div>

        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Pico de Caixa</span>
            <span className="text-sm font-black text-slate-800 font-mono" title={`No dia ${metrics.maxDay.name}`}>
              {formatBRL(metrics.maxDay.value)}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Chart Container */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorOS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={10}
              fontWeight="bold"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={9}
              fontWeight="medium"
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `R$ ${val}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#0f172a", 
                borderColor: "#1e293b",
                borderRadius: "12px",
                padding: "10px"
              }}
              labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "10px", fontFamily: "sans-serif" }}
              itemStyle={{ fontSize: "11px", fontWeight: "bold", padding: "1px 0" }}
              formatter={(value: any) => [formatBRL(Number(value)), ""]}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "10px", fontWeight: "bold", color: "#64748b" }}
            />
            <Area 
              type="monotone" 
              dataKey="Faturamento Total" 
              stroke="#10B981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
            />
            <Area 
              type="monotone" 
              dataKey="Ordens de Serviço" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorOS)" 
            />
            <Area 
              type="monotone" 
              dataKey="Venda de Produtos" 
              stroke="#F59E0B" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorVendas)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detail breakdowns */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
          Produtos vendidos na semana: <span className="text-slate-700 font-black">{formatBRL(metrics.totalVendas)}</span>
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          OS finalizadas na semana: <span className="text-slate-700 font-black">{formatBRL(metrics.totalOS)}</span>
        </span>
      </div>
    </div>
  );
}
