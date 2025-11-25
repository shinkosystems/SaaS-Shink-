
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Minus, Filter, Users, UserMinus, DollarSign, Target, Gem, PieChart, Timer, Percent, Info } from 'lucide-react';
import { FinancialRecord, FinancialTransaction } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, ReferenceArea } from 'recharts';
import { supabase } from '../services/supabaseClient';

type TimeRange = 'week' | 'month' | 'year';

interface Props {
    manualTransactions?: FinancialTransaction[];
}

// Glossário de Métricas
const METRIC_TOOLTIPS: Record<string, string> = {
    "Faturamento Bruto": "Soma total de todas as receitas recebidas (MRR + Serviços pontuais) no período.",
    "Margem Bruta": "Percentual da receita que sobra após deduzir os custos diretos (infraestrutura, taxas, fornecedores).",
    "Despesas Totais": "Soma de todos os custos operacionais, marketing, vendas e despesas administrativas.",
    "Lucro Líquido": "O que sobra no caixa: Faturamento menos todas as despesas e custos.",
    "Churn de Clientes": "Percentual de clientes que cancelaram o contrato em relação ao total de clientes ativos.",
    "Churn Financeiro": "Percentual de receita recorrente (MRR) perdida devido a cancelamentos ou downgrades.",
    "CAC (Custo Aquisição)": "Custo médio para conquistar cada novo cliente (Investimento em Mkt + Vendas ÷ Novos Clientes).",
    "LTV (Lifetime Value)": "Valor total estimado que um cliente gera para a empresa durante todo o tempo de contrato.",
    "LTV / CAC": "Indica a saúde do crescimento. O ideal é que o cliente gere pelo menos 3x o que custou para ser adquirido.",
    "Payback (Meses)": "Tempo necessário para recuperar o custo de aquisição do cliente através da margem de lucro gerada."
};

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-2 cursor-help z-50">
        <Info className="w-3 h-3 text-slate-400 hover:text-blue-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl leading-tight text-center border border-white/10 z-50 invisible group-hover:visible">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export const FinancialDashboard: React.FC<Props> = ({ manualTransactions = [] }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
    
    // State for Week selection
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));

    const [financialHistory, setFinancialHistory] = useState<FinancialRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // FETCH AND CALCULATE REAL DATA
    useEffect(() => {
        const fetchFinancialData = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
                const orgId = userData?.organizacao || 0;

                const { data: clients } = await supabase
                    .from('clientes')
                    .select('id, valor_mensal, data_inicio, meses, status');

                const safeClients = clients || [];

                const history: FinancialRecord[] = [];
                // Process last 2 years for YoY comparison
                const yearsToProcess = [selectedYear - 1, selectedYear];
                
                yearsToProcess.forEach(year => {
                    for (let month = 0; month < 12; month++) {
                        const monthStart = new Date(year, month, 1);
                        const monthEnd = new Date(year, month + 1, 0); 
                        
                        let monthMrr = 0;
                        let monthActive = 0;
                        let newClients = 0;
                        let churnedClients = 0;
                        let churnedMrr = 0;

                        safeClients.forEach(c => {
                            if (c.data_inicio && c.meses) {
                                const contractStart = new Date(c.data_inicio);
                                contractStart.setHours(0,0,0,0);
                                
                                const contractEnd = new Date(contractStart);
                                contractEnd.setMonth(contractEnd.getMonth() + c.meses);
                                contractEnd.setHours(23,59,59,999);

                                const isActiveContract = contractStart <= monthEnd && contractEnd >= monthStart;
                                
                                if (isActiveContract && c.status !== 'Bloqueado') {
                                    monthMrr += Number(c.valor_mensal || 0);
                                    monthActive++;
                                }

                                if (contractStart >= monthStart && contractStart <= monthEnd) {
                                    newClients++;
                                }
                                
                                if (contractEnd >= monthStart && contractEnd <= monthEnd && c.status === 'Bloqueado') {
                                    churnedClients++;
                                    churnedMrr += Number(c.valor_mensal || 0);
                                }
                            }
                        });

                        const monthTrans = manualTransactions.filter(t => {
                            const [tYear, tMonth] = t.date.split('-').map(Number);
                            return tMonth - 1 === month && tYear === year;
                        });

                        const manualInflow = monthTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);
                        
                        const marketingSpend = monthTrans.filter(t => t.type === 'outflow' && t.category === 'Marketing').reduce((acc, t) => acc + Number(t.amount), 0);
                        const salesSpend = monthTrans.filter(t => t.type === 'outflow' && t.category === 'Vendas').reduce((acc, t) => acc + Number(t.amount), 0);
                        
                        const directCosts = monthTrans.filter(t => 
                            t.type === 'outflow' && 
                            ['Infraestrutura', 'Operacional'].includes(t.category)
                        ).reduce((acc, t) => acc + Number(t.amount), 0);

                        const totalOutflow = monthTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);

                        history.push({
                            id: `hist_${year}_${month}`,
                            date: monthEnd.toISOString().split('T')[0],
                            organizationId: orgId,
                            mrr: monthMrr,
                            gross_revenue: monthMrr + manualInflow, 
                            cogs: directCosts, 
                            total_expenses: totalOutflow,
                            marketing_spend: marketingSpend,
                            sales_spend: salesSpend,
                            active_customers: monthActive,
                            new_customers: newClients,
                            churned_customers: churnedClients,
                            churned_mrr: churnedMrr
                        });
                    }
                });

                setFinancialHistory(history);

            } catch (e) {
                console.error("Erro ao calcular financeiro:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFinancialData();
    }, [selectedYear, manualTransactions]); 

    const snapshot = useMemo(() => {
        if (financialHistory.length === 0) return null;

        let currentPeriod: any = {};
        let previousPeriod: any = {}; // YoY Comparison
        let chartData: any[] = [];
        let label = '';
        let comparisonLabel = '';

        // Logic for Week Range
        if (timeRange === 'week') {
            const getWeekData = (year: number, week: number) => {
                // Start of week
                const d = new Date(year, 0, 1 + (week - 1) * 7);
                const dayOfWeek = d.getDay();
                const start = d;
                const end = new Date(d);
                end.setDate(end.getDate() + 6);

                const weekTrans = manualTransactions.filter(t => {
                    const tDate = new Date(t.date);
                    return tDate >= start && tDate <= end;
                });

                const inflow = weekTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
                const outflow = weekTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);
                
                // Prorate MRR for week (Month MRR * 12 / 52)
                const monthIndex = start.getMonth();
                const historyRecord = financialHistory.find(h => {
                    const hDate = new Date(h.date);
                    return hDate.getMonth() === monthIndex && hDate.getFullYear() === year;
                });
                const weeklyMrr = (historyRecord?.mrr || 0) * 12 / 52;

                return {
                    gross_revenue: weeklyMrr + inflow,
                    total_expenses: outflow,
                    mrr: weeklyMrr,
                    active_customers: historyRecord?.active_customers || 0,
                    new_customers: 0, // Simplified
                    churned_customers: 0,
                    churned_mrr: 0,
                    cogs: outflow * 0.3, // Estimate
                    marketing_spend: outflow * 0.2, // Estimate
                    sales_spend: outflow * 0.1 // Estimate
                };
            };

            currentPeriod = getWeekData(selectedYear, selectedWeek);
            previousPeriod = getWeekData(selectedYear - 1, selectedWeek); // YoY
            label = `Semana ${selectedWeek} de ${selectedYear}`;
            comparisonLabel = `vs. Semana ${selectedWeek} de ${selectedYear - 1}`;

            // Chart Data for Week (Daily breakdown)
            const startOfWeek = new Date(selectedYear, 0, 1 + (selectedWeek - 1) * 7);
            for(let i=0; i<7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(day.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                
                const dayTrans = manualTransactions.filter(t => t.date === dateStr);
                const inflow = dayTrans.filter(t => t.type === 'inflow').reduce((a,b) => a + b.amount, 0);
                const outflow = dayTrans.filter(t => t.type === 'outflow').reduce((a,b) => a + b.amount, 0);
                
                chartData.push({
                    date: dateStr,
                    gross_revenue: inflow + (currentPeriod.mrr / 7),
                    total_expenses: outflow,
                    label: ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][day.getDay()]
                });
            }

        } else if (timeRange === 'month') {
            const currentIndex = 12 + selectedMonth;
            const prevYearIndex = selectedMonth; // Same month, previous year (index 0-11)

            currentPeriod = financialHistory[currentIndex] || {};
            previousPeriod = financialHistory[prevYearIndex] || {};
            
            label = new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            comparisonLabel = `vs. ${new Date(selectedYear - 1, selectedMonth).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;

            // Chart data (Daily breakdown for month)
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const monthlyMrr = currentPeriod.mrr || 0;
            const dailyProratedMrr = monthlyMrr / daysInMonth;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayTrans = manualTransactions.filter(t => t.date === dateStr);
                const dayInflow = dayTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);
                const dayOutflow = dayTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);

                chartData.push({
                    date: dateStr,
                    gross_revenue: Number((dailyProratedMrr + dayInflow).toFixed(2)),
                    total_expenses: Number(dayOutflow.toFixed(2)),
                    day: d
                });
            }

        } else {
            // YEAR
            const sumYear = (startIndex: number) => {
                const slice = financialHistory.slice(startIndex, startIndex + 12);
                return slice.reduce((acc, r) => ({
                    gross_revenue: acc.gross_revenue + r.gross_revenue,
                    cogs: acc.cogs + r.cogs,
                    total_expenses: acc.total_expenses + r.total_expenses,
                    mrr: acc.mrr + r.mrr,
                    active_customers: slice[slice.length-1]?.active_customers || 0,
                    new_customers: acc.new_customers + r.new_customers,
                    churned_customers: acc.churned_customers + r.churned_customers,
                    churned_mrr: acc.churned_mrr + r.churned_mrr,
                    marketing_spend: acc.marketing_spend + r.marketing_spend,
                    sales_spend: acc.sales_spend + r.sales_spend
                }), { gross_revenue: 0, cogs: 0, total_expenses: 0, mrr: 0, active_customers: 0, new_customers: 0, churned_customers: 0, churned_mrr: 0, marketing_spend: 0, sales_spend: 0 });
            };

            currentPeriod = sumYear(12);
            previousPeriod = sumYear(0);
            label = `Ano de ${selectedYear}`;
            comparisonLabel = `vs. ${selectedYear - 1}`;
            chartData = financialHistory.slice(12, 24);
        }

        const currentGrossMargin = currentPeriod.gross_revenue > 0 
            ? ((currentPeriod.gross_revenue - currentPeriod.cogs) / currentPeriod.gross_revenue) * 100
            : 0;
        const prevGrossMargin = previousPeriod.gross_revenue > 0
            ? ((previousPeriod.gross_revenue - previousPeriod.cogs) / previousPeriod.gross_revenue) * 100
            : 0;

        const currentProfit = (currentPeriod.gross_revenue || 0) - (currentPeriod.total_expenses || 0);
        const previousProfit = (previousPeriod.gross_revenue || 0) - (previousPeriod.total_expenses || 0);

        const currentStartClients = (currentPeriod.active_customers || 0) + (currentPeriod.churned_customers || 0) - (currentPeriod.new_customers || 0);
        const currentChurnRate = currentStartClients > 0 
            ? ((currentPeriod.churned_customers || 0) / currentStartClients) * 100 
            : 0;
        const prevStartClients = (previousPeriod.active_customers || 0) + (previousPeriod.churned_customers || 0) - (previousPeriod.new_customers || 0);
        const prevChurnRate = prevStartClients > 0 
            ? ((previousPeriod.churned_customers || 0) / prevStartClients) * 100 
            : 0;

        const startMrr = (previousPeriod.mrr || 1);
        const revenueChurn = (currentPeriod.churned_mrr / startMrr) * 100;
        
        const prevStartMrr = (previousPeriod.mrr || 1);
        const prevRevenueChurn = (previousPeriod.churned_mrr / prevStartMrr) * 100;

        const totalAcquisitionCost = (currentPeriod.marketing_spend || 0) + (currentPeriod.sales_spend || 0);
        const cac = currentPeriod.new_customers > 0 
            ? totalAcquisitionCost / currentPeriod.new_customers 
            : 0;
        
        const prevTotalAcquisitionCost = (previousPeriod.marketing_spend || 0) + (previousPeriod.sales_spend || 0);
        const prevCac = previousPeriod.new_customers > 0 
            ? prevTotalAcquisitionCost / previousPeriod.new_customers 
            : 0;

        const currentArpu = currentPeriod.active_customers > 0 ? (currentPeriod.mrr / currentPeriod.active_customers) : 0;
        const prevArpu = previousPeriod.active_customers > 0 ? (previousPeriod.mrr / previousPeriod.active_customers) : 0;

        const currentChurnDecimal = currentChurnRate / 100;
        const prevChurnDecimal = prevChurnRate / 100;

        const safeChurnCurr = currentChurnDecimal === 0 ? 0.01 : currentChurnDecimal;
        const safeChurnPrev = prevChurnDecimal === 0 ? 0.01 : prevChurnDecimal;

        const currentLtv = currentArpu * (1 / safeChurnCurr);
        const prevLtv = prevArpu * (1 / safeChurnPrev);

        const currentLtvCac = cac > 0 ? (currentLtv / cac) : 0;
        const prevLtvCac = prevCac > 0 ? (prevLtv / prevCac) : 0;

        const currentPayback = currentArpu > 0 ? (cac / currentArpu) : 0;
        const prevPayback = prevArpu > 0 ? (prevCac / prevArpu) : 0;

        const calcDelta = (curr: number, prev: number) => {
            if (!prev || prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            label,
            comparisonLabel,
            chartData,
            metrics: {
                revenue: { value: currentPeriod.gross_revenue || 0, delta: calcDelta(currentPeriod.gross_revenue, previousPeriod.gross_revenue) },
                grossMargin: { value: currentGrossMargin || 0, delta: calcDelta(currentGrossMargin, prevGrossMargin) },
                expenses: { value: currentPeriod.total_expenses || 0, delta: calcDelta(currentPeriod.total_expenses, previousPeriod.total_expenses) },
                profit: { value: currentProfit || 0, delta: calcDelta(currentProfit, previousProfit) },
                churnRate: { value: currentChurnRate || 0, delta: calcDelta(currentChurnRate, prevChurnRate) },
                revenueChurn: { value: revenueChurn || 0, delta: calcDelta(revenueChurn, prevRevenueChurn) },
                cac: { value: cac || 0, delta: calcDelta(cac, prevCac) },
                ltv: { value: currentLtv || 0, delta: calcDelta(currentLtv, prevLtv) },
                ltvCac: { value: currentLtvCac || 0, delta: calcDelta(currentLtvCac, prevLtvCac) },
                payback: { value: currentPayback || 0, delta: calcDelta(currentPayback, prevPayback) },
                churnCount: currentPeriod.churned_customers || 0,
                churnMrr: currentPeriod.churned_mrr || 0
            }
        };
    }, [financialHistory, timeRange, selectedMonth, selectedYear, selectedWeek, manualTransactions]);

    const KPICard = ({ label, data, prefix = '', suffix = '', inverse = false, icon }: any) => {
        const isPositive = data.delta >= 0;
        const isGood = inverse ? !isPositive : isPositive; 
        const Arrow = isPositive ? ArrowUpRight : ArrowDownRight;
        const color = isGood ? 'text-emerald-500' : 'text-red-500';
        const bg = isGood ? 'bg-emerald-500/10' : 'bg-red-500/10';

        return (
            <div className="glass-card p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all relative group">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        {icon && icon} {label}
                        {METRIC_TOOLTIPS[label] && <InfoTooltip text={METRIC_TOOLTIPS[label]} />}
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${color} ${bg}`}>
                        {data.delta !== 0 ? <Arrow className="w-3 h-3"/> : <Minus className="w-3 h-3"/>}
                        {Math.abs(data.delta).toFixed(1)}%
                    </div>
                </div>
                <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {prefix}{typeof data.value === 'number' ? data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : data.value}{suffix}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                    {snapshot?.comparisonLabel} (YoY)
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pb-10 custom-scrollbar">
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-emerald-500"/> Indicadores Financeiros
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 capitalize">
                        {snapshot ? snapshot.label : 'Calculando indicadores...'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full xl:w-auto">
                    
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shrink-0">
                        <button onClick={() => setTimeRange('week')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === 'week' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Semana</button>
                        <button onClick={() => setTimeRange('month')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === 'month' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Mensal</button>
                        <button onClick={() => setTimeRange('year')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === 'year' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Anual</button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                    <div className="flex gap-2 flex-1 overflow-x-auto no-scrollbar">
                        {timeRange === 'week' && (
                            <div className="relative min-w-[100px] flex items-center gap-2">
                                <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronLeft className="w-4 h-4"/></button>
                                <span className="text-xs font-bold whitespace-nowrap">Semana {selectedWeek}</span>
                                <button onClick={() => setSelectedWeek(w => Math.min(52, w + 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronRight className="w-4 h-4"/></button>
                            </div>
                        )}

                        {timeRange === 'month' && (
                            <div className="relative min-w-[140px]">
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="appearance-none pl-8 pr-8 h-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-amber-500 outline-none cursor-pointer">
                                    {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <Calendar className="w-4 h-4 absolute left-2.5 top-3 text-slate-500 pointer-events-none"/>
                            </div>
                        )}

                        <div className="flex items-center px-2 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0">
                            <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronLeft className="w-4 h-4"/></button>
                            <span className="text-sm font-bold px-3 min-w-[50px] text-center">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronRight className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
            </div>

            {snapshot && (
                <div className="space-y-8 max-w-[1600px] mx-auto w-full">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <KPICard 
                            label="Faturamento Bruto" 
                            data={snapshot.metrics.revenue}
                            prefix="R$ " 
                        />
                        
                        <KPICard 
                            label="Margem Bruta" 
                            data={snapshot.metrics.grossMargin}
                            suffix="%" 
                            icon={<Percent className="w-3 h-3"/>}
                        />

                        <KPICard 
                            label="Despesas Totais" 
                            data={snapshot.metrics.expenses}
                            prefix="R$ " 
                            inverse={true} 
                        />
                        <KPICard 
                            label="Lucro Líquido" 
                            data={snapshot.metrics.profit}
                            prefix="R$ "
                        />
                        
                        <div className="glass-card p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all relative group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-3 h-3"/> Churn de Clientes
                                    <InfoTooltip text={METRIC_TOOLTIPS["Churn de Clientes"]} />
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                    snapshot.metrics.churnRate.delta > 0 ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'
                                }`}>
                                    {snapshot.metrics.churnRate.delta !== 0 ? (snapshot.metrics.churnRate.delta > 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>) : <Minus className="w-3 h-3"/>}
                                    {Math.abs(snapshot.metrics.churnRate.delta).toFixed(1)}%
                                </div>
                            </div>
                            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                {snapshot.metrics.churnRate.value.toFixed(1)}%
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-medium">
                                <span className="text-red-500 flex items-center gap-1">
                                    <UserMinus className="w-3 h-3"/> {snapshot.metrics.churnCount} cancelados
                                </span>
                            </div>
                        </div>

                        <div className="glass-card p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all relative group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <DollarSign className="w-3 h-3"/> Churn Financeiro
                                    <InfoTooltip text={METRIC_TOOLTIPS["Churn Financeiro"]} />
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                    snapshot.metrics.revenueChurn.delta > 0 ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'
                                }`}>
                                    {snapshot.metrics.revenueChurn.delta !== 0 ? (snapshot.metrics.revenueChurn.delta > 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>) : <Minus className="w-3 h-3"/>}
                                    {Math.abs(snapshot.metrics.revenueChurn.delta).toFixed(1)}%
                                </div>
                            </div>
                            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                {snapshot.metrics.revenueChurn.value.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                MRR Perdido: R$ {snapshot.metrics.churnMrr.toLocaleString('pt-BR')}
                            </div>
                        </div>

                        <KPICard 
                            label="CAC (Custo Aquisição)" 
                            data={snapshot.metrics.cac}
                            prefix="R$ " 
                            inverse={true}
                            icon={<Target className="w-3 h-3"/>}
                        />

                        <KPICard 
                            label="LTV (Lifetime Value)" 
                            data={snapshot.metrics.ltv}
                            prefix="R$ " 
                            icon={<Gem className="w-3 h-3"/>}
                        />

                        <KPICard 
                            label="LTV / CAC" 
                            data={snapshot.metrics.ltvCac}
                            suffix="x" 
                            icon={<PieChart className="w-3 h-3"/>}
                        />

                        <KPICard 
                            label="Payback (Meses)" 
                            data={snapshot.metrics.payback}
                            inverse={true} 
                            icon={<Timer className="w-3 h-3"/>}
                        />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> {timeRange === 'month' ? `Fluxo Diário - ${monthNames[selectedMonth]}` : timeRange === 'week' ? `Fluxo Semanal` : `Evolução Anual (${selectedYear})`}</h3>
                        <div className="grid grid-cols-1 gap-4 h-[350px]">
                            <div className="glass-card p-0 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 overflow-hidden flex flex-col h-full shadow-sm">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Receita vs Despesas</span>
                                    <div className="flex gap-4 text-[10px] font-bold">
                                        <span className="text-emerald-500 flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Receita</span>
                                        <span className="text-red-500 flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Despesas</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart 
                                            key={`${timeRange}-${selectedMonth}-${selectedWeek}-${selectedYear}`}
                                            data={snapshot.chartData} 
                                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px', color: 'white' }}
                                                itemStyle={{ color: '#cbd5e1' }}
                                                labelFormatter={(label) => {
                                                    if (typeof label === 'number') {
                                                        return `${label}/${selectedMonth+1}/${selectedYear}`;
                                                    }
                                                    if (typeof label === 'string' && label.includes('-')) { const [y, m, d] = label.split('-'); return `${d}/${m}/${y}`; }
                                                    return label;
                                                }}
                                            />
                                            <XAxis 
                                                dataKey={timeRange === 'month' ? 'day' : timeRange === 'week' ? 'label' : 'date'} 
                                                tick={{fontSize: 10, fill: '#94a3b8'}} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tickFormatter={(val) => { 
                                                    if (timeRange === 'month') {
                                                        return String(val).padStart(2, '0');
                                                    }
                                                    if (timeRange === 'week') return val;
                                                    const [y, m, d] = val.split('-'); 
                                                    return `${d}/${m}`; 
                                                }} 
                                                interval={timeRange === 'month' ? 2 : 'preserveStartEnd'}
                                            />
                                            
                                            <Area type="monotone" dataKey="gross_revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} name="Receita" />
                                            <Area type="monotone" dataKey="total_expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} name="Despesas" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
