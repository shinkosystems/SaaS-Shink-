
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Minus, Filter, Users, UserMinus, DollarSign, Target, Gem, PieChart, Timer, Percent, Info } from 'lucide-react';
import { FinancialRecord, FinancialTransaction } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, ReferenceArea, CartesianGrid, YAxis } from 'recharts';
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
                    .select('id, valormensal, data_inicio, meses, status')
                    .eq('organizacao', orgId);

                const safeClients = clients || [];

                const history: FinancialRecord[] = [];
                // Process last 2 years for YoY comparison
                const yearsToProcess = [selectedYear - 1, selectedYear];
                
                yearsToProcess.forEach(year => {
                    for (let month = 0; month < 12; month++) {
                        const monthStart = new Date(year, month, 1);
                        const monthEnd = new Date(year, month + 1, 0); 
                        monthEnd.setHours(23, 59, 59, 999);
                        
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

                                // Check if active in this month
                                const isActiveContract = contractStart <= monthEnd && contractEnd >= monthStart;
                                
                                if (isActiveContract && c.status !== 'Bloqueado') {
                                    monthMrr += Number(c.valormensal || 0);
                                    monthActive++;
                                }

                                if (contractStart >= monthStart && contractStart <= monthEnd) {
                                    newClients++;
                                }
                                
                                // Simplified Churn Logic
                                if (c.status === 'Bloqueado') {
                                    // Placeholder logic for churn
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
                            date: `${year}-${String(month+1).padStart(2, '0')}-01`,
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

        let currentData = { revenue: 0, expenses: 0, profit: 0, margin: 0 };
        let previousData = { revenue: 0, expenses: 0, profit: 0, margin: 0 };
        let chartData: any[] = [];
        let label = '';
        let comparisonLabel = '';

        // YEAR VIEW
        if (timeRange === 'year') {
            label = `${selectedYear}`;
            comparisonLabel = `vs ${selectedYear - 1}`;
            
            // Current Year Data
            const currentRecords = financialHistory.filter(h => new Date(h.date).getFullYear() === selectedYear);
            currentData.revenue = currentRecords.reduce((acc, r) => acc + r.gross_revenue, 0);
            currentData.expenses = currentRecords.reduce((acc, r) => acc + r.total_expenses, 0);
            currentData.profit = currentData.revenue - currentData.expenses;
            currentData.margin = currentData.revenue > 0 ? ((currentData.revenue - currentRecords.reduce((acc,r) => acc + r.cogs, 0)) / currentData.revenue) * 100 : 0;

            // Previous Year Data
            const prevRecords = financialHistory.filter(h => new Date(h.date).getFullYear() === selectedYear - 1);
            previousData.revenue = prevRecords.reduce((acc, r) => acc + r.gross_revenue, 0);
            previousData.expenses = prevRecords.reduce((acc, r) => acc + r.total_expenses, 0);
            previousData.profit = previousData.revenue - previousData.expenses;
            previousData.margin = previousData.revenue > 0 ? ((previousData.revenue - prevRecords.reduce((acc,r) => acc + r.cogs, 0)) / previousData.revenue) * 100 : 0;

            // Chart Data (Monthly)
            chartData = currentRecords.map(r => {
                const date = new Date(r.date);
                return {
                    name: monthNames[date.getMonth()].substring(0, 3),
                    Receita: r.gross_revenue,
                    Despesas: r.total_expenses,
                    Lucro: r.gross_revenue - r.total_expenses
                };
            });
        }
        
        // MONTH VIEW
        else if (timeRange === 'month') {
            label = `${monthNames[selectedMonth]} ${selectedYear}`;
            comparisonLabel = `vs Mês Anterior`;

            const currentRecord = financialHistory.find(h => {
                const d = new Date(h.date);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });

            if (currentRecord) {
                currentData.revenue = currentRecord.gross_revenue;
                currentData.expenses = currentRecord.total_expenses;
                currentData.profit = currentData.revenue - currentData.expenses;
                currentData.margin = currentData.revenue > 0 ? ((currentData.revenue - currentRecord.cogs) / currentData.revenue) * 100 : 0;
            }

            // Previous Month
            let prevMonth = selectedMonth - 1;
            let prevYear = selectedYear;
            if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }

            const prevRecord = financialHistory.find(h => {
                const d = new Date(h.date);
                return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
            });

            if (prevRecord) {
                previousData.revenue = prevRecord.gross_revenue;
                previousData.expenses = prevRecord.total_expenses;
                previousData.profit = previousData.revenue - previousData.expenses;
                previousData.margin = previousData.revenue > 0 ? ((previousData.revenue - prevRecord.cogs) / previousData.revenue) * 100 : 0;
            }

            chartData = financialHistory
                .filter(h => new Date(h.date).getFullYear() === selectedYear)
                .map(r => ({
                    name: monthNames[new Date(r.date).getMonth()].substring(0, 3),
                    Receita: r.gross_revenue,
                    Despesas: r.total_expenses,
                    Lucro: r.gross_revenue - r.total_expenses,
                    active: new Date(r.date).getMonth() === selectedMonth // Marker
                }));
        }

        // WEEK VIEW
        else if (timeRange === 'week') {
            label = `Semana ${selectedWeek}`;
            comparisonLabel = `vs Semana Anterior`;
            
            const getWeekRange = (year: number, week: number) => {
                const simple = new Date(year, 0, 1 + (week - 1) * 7);
                const dow = simple.getDay();
                const ISOweekStart = simple;
                if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
                else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
                const end = new Date(ISOweekStart);
                end.setDate(end.getDate() + 6);
                return { start: ISOweekStart, end };
            };

            const currRange = getWeekRange(selectedYear, selectedWeek);
            const prevRange = getWeekRange(selectedYear, selectedWeek - 1);

            const calcRangeData = (start: Date, end: Date) => {
                // Manual Tx
                const txs = manualTransactions.filter(t => {
                    const d = new Date(t.date);
                    return d >= start && d <= end;
                });
                const inflow = txs.filter(t => t.type === 'inflow').reduce((acc,t) => acc+t.amount, 0);
                const outflow = txs.filter(t => t.type === 'outflow').reduce((acc,t) => acc+t.amount, 0);
                const cogs = txs.filter(t => t.type === 'outflow' && ['Infraestrutura', 'Operacional'].includes(t.category)).reduce((acc,t) => acc+t.amount, 0);

                // Pro-rate MRR
                const mRec = financialHistory.find(h => {
                    const d = new Date(h.date);
                    return d.getMonth() === start.getMonth() && d.getFullYear() === start.getFullYear();
                });
                const weeklyMrr = (mRec?.mrr || 0) / 4.3; 

                const revenue = inflow + weeklyMrr;
                const expenses = outflow;
                return {
                    revenue,
                    expenses,
                    profit: revenue - expenses,
                    margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0
                };
            };

            currentData = calcRangeData(currRange.start, currRange.end);
            previousData = calcRangeData(prevRange.start, prevRange.end);

            chartData = [];
            let cursor = new Date(currRange.start);
            while (cursor <= currRange.end) {
                const dStr = cursor.toISOString().split('T')[0];
                const dTxs = manualTransactions.filter(t => t.date === dStr);
                const dIn = dTxs.filter(t => t.type === 'inflow').reduce((a,b)=>a+b.amount,0);
                const dOut = dTxs.filter(t => t.type === 'outflow').reduce((a,b)=>a+b.amount,0);
                
                const mRec = financialHistory.find(h => {
                    const d = new Date(h.date);
                    return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
                });
                const dailyMrr = (mRec?.mrr || 0) / 30;

                chartData.push({
                    name: cursor.toLocaleDateString('pt-BR', {weekday: 'short'}),
                    Receita: dIn + dailyMrr,
                    Despesas: dOut,
                    Lucro: (dIn + dailyMrr) - dOut
                });
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        return { current: currentData, previous: previousData, chartData, label, comparisonLabel };
    }, [financialHistory, timeRange, selectedYear, selectedMonth, selectedWeek, manualTransactions]);

    if (isLoading) {
        return <div className="w-full py-20 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div></div>;
    }

    const calcDelta = (curr: number, prev: number) => {
        if (!prev) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const StatCard = ({ title, value, isCurrency = true, delta, inverse = false }: any) => {
        const isPositive = delta >= 0;
        const isGood = inverse ? !isPositive : isPositive;
        const Arrow = isPositive ? ArrowUpRight : ArrowDownRight;
        
        return (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between group h-32 relative overflow-hidden">
                <div className="flex justify-between items-start z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        {title}
                        {METRIC_TOOLTIPS[title] && <InfoTooltip text={METRIC_TOOLTIPS[title]} />}
                    </span>
                    {delta !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isGood ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                            <Arrow className="w-3 h-3"/> {Math.abs(delta).toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="z-10">
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `${value.toFixed(1)}%`}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{snapshot?.comparisonLabel}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-500">
            
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-emerald-500"/> Performance Financeira
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Visão consolidada de caixa e indicadores de crescimento.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                        {(['month', 'year'] as TimeRange[]).map((t) => (
                            <button 
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-4 py-2 text-xs font-bold capitalize transition-all rounded-lg ${timeRange === t ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {t === 'month' ? 'Mensal' : 'Anual'}
                            </button>
                        ))}
                    </div>
                    
                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

                    {timeRange === 'year' && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded"><ChevronLeft className="w-4 h-4 text-slate-500"/></button>
                            <span className="text-sm font-bold text-slate-700 dark:text-white">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded"><ChevronRight className="w-4 h-4 text-slate-500"/></button>
                        </div>
                    )}

                    {timeRange === 'month' && (
                        <div className="relative">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="appearance-none bg-transparent text-sm font-bold text-slate-700 dark:text-white pl-2 pr-6 outline-none cursor-pointer"
                            >
                                {monthNames.map((m, i) => <option key={i} value={i} className="dark:bg-slate-900">{m}</option>)}
                            </select>
                            <ChevronRight className="w-3 h-3 absolute right-0 top-1.5 text-slate-400 pointer-events-none rotate-90"/>
                        </div>
                    )}
                </div>
            </div>

            {snapshot && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard 
                            title="Faturamento Bruto" 
                            value={snapshot.current.revenue} 
                            delta={calcDelta(snapshot.current.revenue, snapshot.previous.revenue)} 
                        />
                        <StatCard 
                            title="Despesas Totais" 
                            value={snapshot.current.expenses} 
                            delta={calcDelta(snapshot.current.expenses, snapshot.previous.expenses)} 
                            inverse={true}
                        />
                        <StatCard 
                            title="Lucro Líquido" 
                            value={snapshot.current.profit} 
                            delta={calcDelta(snapshot.current.profit, snapshot.previous.profit)} 
                        />
                        <StatCard 
                            title="Margem Bruta" 
                            value={snapshot.current.margin} 
                            isCurrency={false}
                            delta={snapshot.current.margin - snapshot.previous.margin} 
                        />
                    </div>

                    {/* Charts Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        
                        {/* Main Trend Chart */}
                        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm flex flex-col">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4"/> Fluxo de Caixa ({snapshot.label})
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={snapshot.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3}/>
                                        <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: 'white', borderRadius: '8px' }}
                                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                                        />
                                        <Area type="monotone" dataKey="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                                        <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Breakdown / Profitability */}
                        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 flex items-center gap-2">
                                <PieChart className="w-4 h-4"/> Composição
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600 dark:text-slate-300">Lucratividade</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{snapshot.current.margin.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, snapshot.current.margin))}%` }}></div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-2 text-slate-500"><Target className="w-3 h-3"/> Meta de Margem</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">40%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-2 text-slate-500"><DollarSign className="w-3 h-3"/> Custo Fixo (Est.)</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">R$ {(snapshot.current.expenses * 0.6).toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
