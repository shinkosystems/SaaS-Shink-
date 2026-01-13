
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Info, DollarSign, Target, PieChart, Clock } from 'lucide-react';
import { FinancialRecord, FinancialTransaction, getTerminology } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../services/supabaseClient';

type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface Props {
    manualTransactions?: FinancialTransaction[];
    orgType?: string;
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-1 cursor-help z-50">
        <Info className="w-3 h-3 text-slate-300 hover:text-slate-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 z-50 invisible group-hover:visible">
            {text}
        </div>
    </div>
);

export const FinancialDashboard: React.FC<Props> = ({ manualTransactions = [], orgType = 'Startup' }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [viewDate, setViewDate] = useState(new Date());
    const [financialHistory, setFinancialHistory] = useState<FinancialRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const terms = getTerminology(orgType);
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    useEffect(() => {
        const fetchFinancialData = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
                const orgId = userData?.organizacao || 0;

                const { data: clients } = await supabase.from('clientes').select('*').eq('organizacao', orgId);
                const safeClients = clients || [];

                // Simulação de histórico baseada no MRR e transações manuais
                const history: FinancialRecord[] = [];
                const currentYear = viewDate.getFullYear();
                
                // Geramos um histórico simplificado para os últimos 24 meses para cálculos comparativos
                for (let y = currentYear - 1; y <= currentYear; y++) {
                    for (let m = 0; m < 12; m++) {
                        let monthMrr = 0;
                        safeClients.forEach(c => {
                            if (c.data_inicio && c.meses && c.status !== 'Bloqueado') {
                                // Lógica simplificada: se começou antes do mês analisado, conta no MRR
                                const start = new Date(c.data_inicio);
                                if (start.getFullYear() < y || (start.getFullYear() === y && start.getMonth() <= m)) {
                                    monthMrr += Number(c.valormensal || 0);
                                }
                            }
                        });

                        const monthTrans = manualTransactions.filter(t => {
                            const d = new Date(t.date);
                            return d.getMonth() === m && d.getFullYear() === y;
                        });

                        const manualInflow = monthTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);
                        const totalOutflow = monthTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);

                        history.push({
                            id: `hist_${y}_${m}`,
                            date: `${y}-${String(m+1).padStart(2, '0')}-01`,
                            organizationId: orgId,
                            mrr: monthMrr,
                            gross_revenue: monthMrr + manualInflow, 
                            cogs: 0, 
                            total_expenses: totalOutflow,
                            marketing_spend: 0, sales_spend: 0, active_customers: 0, new_customers: 0, churned_customers: 0, churned_mrr: 0
                        });
                    }
                }
                setFinancialHistory(history);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchFinancialData();
    }, [viewDate.getFullYear(), manualTransactions]); 

    const snapshot = useMemo(() => {
        if (financialHistory.length === 0) return null;

        let label = '';
        let startRange = new Date(viewDate);
        let endRange = new Date(viewDate);
        let prevStart = new Date(viewDate);
        let prevEnd = new Date(viewDate);

        // Definir limites de tempo conforme o filtro
        if (timeRange === 'day') {
            startRange.setHours(0,0,0,0);
            endRange.setHours(23,59,59,999);
            prevStart.setDate(prevStart.getDate() - 1);
            prevStart.setHours(0,0,0,0);
            prevEnd.setDate(prevEnd.getDate() - 1);
            prevEnd.setHours(23,59,59,999);
            label = startRange.toLocaleDateString('pt-BR');
        } else if (timeRange === 'week') {
            const day = startRange.getDay();
            startRange.setDate(startRange.getDate() - day);
            endRange.setDate(startRange.getDate() + 6);
            prevStart.setDate(startRange.getDate() - 7);
            prevEnd.setDate(endRange.getDate() - 7);
            label = `${startRange.getDate()}/${startRange.getMonth()+1} - ${endRange.getDate()}/${endRange.getMonth()+1}`;
        } else if (timeRange === 'month') {
            startRange.setDate(1);
            endRange = new Date(startRange.getFullYear(), startRange.getMonth() + 1, 0);
            prevStart.setMonth(prevStart.getMonth() - 1);
            prevStart.setDate(1);
            prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
            label = `${monthNames[startRange.getMonth()]} / ${startRange.getFullYear()}`;
        } else if (timeRange === 'quarter') {
            const q = Math.floor(startRange.getMonth() / 3);
            startRange = new Date(startRange.getFullYear(), q * 3, 1);
            endRange = new Date(startRange.getFullYear(), (q + 1) * 3, 0);
            prevStart = new Date(startRange);
            prevStart.setMonth(prevStart.getMonth() - 3);
            prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 3, 0);
            label = `${q + 1}º Trimestre de ${startRange.getFullYear()}`;
        } else if (timeRange === 'year') {
            startRange = new Date(startRange.getFullYear(), 0, 1);
            endRange = new Date(startRange.getFullYear(), 11, 31);
            prevStart = new Date(startRange);
            prevStart.setFullYear(prevStart.getFullYear() - 1);
            prevEnd = new Date(prevStart.getFullYear(), 11, 31);
            label = `Ano de ${startRange.getFullYear()}`;
        }

        const filterPeriod = (t: FinancialTransaction) => {
            const d = new Date(t.date);
            return d >= startRange && d <= endRange;
        };

        const filterPrevPeriod = (t: FinancialTransaction) => {
            const d = new Date(t.date);
            return d >= prevStart && d <= prevEnd;
        };

        const currentTrans = manualTransactions.filter(filterPeriod);
        const prevTrans = manualTransactions.filter(filterPrevPeriod);

        // MRR é calculado com base no último mês do período
        const lastMonthInPeriod = endRange.getMonth();
        const yearOfLastMonth = endRange.getFullYear();
        const historyRecord = financialHistory.find(h => {
            const d = new Date(h.date);
            return d.getMonth() === lastMonthInPeriod && d.getFullYear() === yearOfLastMonth;
        });

        const currentMrr = historyRecord?.mrr || 0;
        const currentRevenue = currentMrr + currentTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
        const currentExpenses = currentTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);

        const prevRevenue = prevTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
        const prevExpenses = prevTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);

        // Gerar dados do gráfico (últimos 6 meses do ano da viewDate)
        const chartData = financialHistory
            .filter(h => new Date(h.date).getFullYear() === viewDate.getFullYear())
            .map(r => ({
                name: monthNames[new Date(r.date).getMonth()].substring(0, 3),
                Receita: r.gross_revenue,
                Despesas: r.total_expenses
            }));

        return {
            label,
            current: {
                revenue: currentRevenue,
                expenses: currentExpenses,
                profit: currentRevenue - currentExpenses,
                margin: currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue) * 100 : 0,
                mrr: currentMrr
            },
            deltas: {
                revenue: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
                expenses: prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0
            },
            chartData
        };
    }, [financialHistory, timeRange, viewDate, manualTransactions]);

    const handleNavigate = (dir: 'next' | 'prev') => {
        const mod = dir === 'next' ? 1 : -1;
        const newDate = new Date(viewDate);
        if (timeRange === 'day') newDate.setDate(newDate.getDate() + mod);
        else if (timeRange === 'week') newDate.setDate(newDate.getDate() + (mod * 7));
        else if (timeRange === 'month') newDate.setMonth(newDate.getMonth() + mod);
        else if (timeRange === 'quarter') newDate.setMonth(newDate.getMonth() + (mod * 3));
        else if (timeRange === 'year') newDate.setFullYear(newDate.getFullYear() + mod);
        setViewDate(newDate);
    };

    const StatCard = ({ title, value, isCurrency = true, delta, inverse = false, tooltip }: any) => {
        const isPositive = delta >= 0;
        const isGood = inverse ? !isPositive : isPositive;
        
        return (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-40 hover:shadow-2xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex justify-between items-start relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        {title}
                        {tooltip && <InfoTooltip text={tooltip} />}
                    </span>
                    {delta !== 0 && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${isGood ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>} {Math.abs(delta).toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="relative z-10">
                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        {isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : `${value.toFixed(1)}%`}
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Balanço do Período</p>
                </div>
            </div>
        );
    };

    if (isLoading || !snapshot) return <div className="py-20 flex flex-col items-center justify-center gap-4"><Loader2 className="w-10 h-10 animate-spin text-amber-500"/><span className="text-[10px] font-black uppercase text-slate-400">Processando Ciclo Financeiro...</span></div>;

    return (
        <div className="flex flex-col gap-10 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Visão de <span className="text-amber-500">Fluxo</span>.</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Análise de saúde do caixa e rentabilidade para {orgType}.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                    {[
                        { id: 'day', label: 'Dia' },
                        { id: 'week', label: 'Semana' },
                        { id: 'month', label: 'Mês' },
                        { id: 'quarter', label: 'Trimestre' },
                        { id: 'year', label: 'Ano' }
                    ].map(range => (
                        <button 
                            key={range.id}
                            onClick={() => setTimeRange(range.id as any)} 
                            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${timeRange === range.id ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-4 rounded-[1.5rem] border border-slate-100 dark:border-white/5 w-fit shadow-sm">
                <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-100 dark:border-white/5"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                <div className="flex items-center gap-3 px-4">
                    <Calendar className="w-4 h-4 text-amber-500"/>
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest min-w-[150px] text-center">{snapshot.label}</span>
                </div>
                <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-100 dark:border-white/5"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
                
                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
                
                <button onClick={() => setViewDate(new Date())} className="px-4 py-2 text-[9px] font-black text-amber-600 uppercase tracking-widest hover:bg-amber-50 rounded-lg">Ir para Hoje</button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Faturamento Bruto" value={snapshot.current.revenue} delta={snapshot.deltas.revenue} tooltip="Receita total consolidada no período analisado." />
                <StatCard title={terms.mrrLabel} value={snapshot.current.mrr} delta={0} tooltip="Base estável de faturamento recorrente mensal (Snapshot de encerramento)." />
                <StatCard title="Lucro Líquido" value={snapshot.current.profit} delta={0} tooltip="Valor residual após todas as deduções operacionais do período." />
                <StatCard title="Margem Bruta" value={snapshot.current.margin} isCurrency={false} delta={0} tooltip="Eficiência financeira da operação (Profit / Revenue)." />
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-500"/> Tendência Operacional
                    </h3>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                            <span className="text-[10px] font-black uppercase text-slate-400">Receita</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-900"></div>
                            <span className="text-[10px] font-black uppercase text-slate-400">Despesas</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={snapshot.chartData}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0A0A0C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', fontSize: '12px', fontWeight: 'bold' }}
                                cursor={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5' }}
                            />
                            <Area type="monotone" dataKey="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                            <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={0} strokeWidth={2} strokeDasharray="8 8" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const Loader2 = ({ className }: { className?: string }) => (
    <Activity className={className} />
);
