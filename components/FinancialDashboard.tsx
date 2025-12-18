
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Info, DollarSign, Target, PieChart } from 'lucide-react';
import { FinancialRecord, FinancialTransaction, getTerminology } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../services/supabaseClient';

type TimeRange = 'week' | 'month' | 'year';

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
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
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

                const history: FinancialRecord[] = [];
                const yearsToProcess = [selectedYear - 1, selectedYear];
                
                yearsToProcess.forEach(year => {
                    for (let month = 0; month < 12; month++) {
                        let monthMrr = 0;
                        safeClients.forEach(c => {
                            if (c.data_inicio && c.meses && c.status !== 'Bloqueado') {
                                monthMrr += Number(c.valormensal || 0);
                            }
                        });

                        const monthTrans = manualTransactions.filter(t => {
                            if (!t.date) return false;
                            const [tYear, tMonth] = t.date.split('-').map(Number);
                            return tMonth - 1 === month && tYear === year;
                        });

                        const manualInflow = monthTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);
                        const totalOutflow = monthTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);

                        history.push({
                            id: `hist_${year}_${month}`,
                            date: `${year}-${String(month+1).padStart(2, '0')}-01`,
                            organizationId: orgId,
                            mrr: monthMrr,
                            gross_revenue: monthMrr + manualInflow, 
                            cogs: 0, 
                            total_expenses: totalOutflow,
                            marketing_spend: 0, sales_spend: 0, active_customers: 0, new_customers: 0, churned_customers: 0, churned_mrr: 0
                        });
                    }
                });
                setFinancialHistory(history);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchFinancialData();
    }, [selectedYear, manualTransactions]); 

    const snapshot = useMemo(() => {
        if (financialHistory.length === 0) return null;
        let currentData = { revenue: 0, expenses: 0, profit: 0, margin: 0, mrr: 0 };
        let previousData = { revenue: 0, expenses: 0, profit: 0, margin: 0, mrr: 0 };
        let chartData: any[] = [];
        let label = '';

        if (timeRange === 'year') {
            label = `${selectedYear}`;
            const currentRecords = financialHistory.filter(h => new Date(h.date).getFullYear() === selectedYear);
            currentData.revenue = currentRecords.reduce((acc, r) => acc + r.gross_revenue, 0);
            currentData.expenses = currentRecords.reduce((acc, r) => acc + r.total_expenses, 0);
            currentData.mrr = currentRecords[currentRecords.length - 1]?.mrr || 0;
            
            const prevRecords = financialHistory.filter(h => new Date(h.date).getFullYear() === selectedYear - 1);
            previousData.revenue = prevRecords.reduce((acc, r) => acc + r.gross_revenue, 0);
            previousData.expenses = prevRecords.reduce((acc, r) => acc + r.total_expenses, 0);
            previousData.mrr = prevRecords[prevRecords.length - 1]?.mrr || 0;

            chartData = currentRecords.map(r => ({
                name: monthNames[new Date(r.date).getMonth()].substring(0, 3),
                Receita: r.gross_revenue,
                Despesas: r.total_expenses
            }));
        } else {
            label = `${monthNames[selectedMonth]}`;
            const curr = financialHistory.find(h => new Date(h.date).getMonth() === selectedMonth && new Date(h.date).getFullYear() === selectedYear);
            if (curr) {
                currentData.revenue = curr.gross_revenue;
                currentData.expenses = curr.total_expenses;
                currentData.mrr = curr.mrr;
            }
            const prev = financialHistory.find(h => new Date(h.date).getMonth() === selectedMonth && new Date(h.date).getFullYear() === selectedYear - 1);
            if (prev) {
                previousData.revenue = prev.gross_revenue;
                previousData.expenses = prev.total_expenses;
                previousData.mrr = prev.mrr;
            }
            chartData = financialHistory.filter(h => new Date(h.date).getFullYear() === selectedYear).map(r => ({
                name: monthNames[new Date(r.date).getMonth()].substring(0, 3),
                Receita: r.gross_revenue,
                Despesas: r.total_expenses
            }));
        }

        currentData.profit = currentData.revenue - currentData.expenses;
        previousData.profit = previousData.revenue - previousData.expenses;
        currentData.margin = currentData.revenue > 0 ? (currentData.profit / currentData.revenue) * 100 : 0;

        return { current: currentData, previous: previousData, chartData, label };
    }, [financialHistory, timeRange, selectedYear, selectedMonth]);

    const StatCard = ({ title, value, isCurrency = true, delta, inverse = false, tooltip }: any) => {
        const isPositive = delta >= 0;
        const isGood = inverse ? !isPositive : isPositive;
        
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col justify-between h-32 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                        {title}
                        {tooltip && <InfoTooltip text={tooltip} />}
                    </span>
                    {delta !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isGood ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>} {Math.abs(delta).toFixed(1)}%
                        </span>
                    )}
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
                        {isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : `${value.toFixed(1)}%`}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading || !snapshot) return <div className="py-20 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-slate-300 rounded-full border-t-transparent"></div></div>;

    const calcDelta = (curr: number, prev: number) => prev ? ((curr - prev) / prev) * 100 : 0;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in">
            {/* Header / Controls */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visão Financeira ({orgType})</h2>
                    <p className="text-slate-500 text-sm mt-1">Análise de saúde do caixa e rentabilidade.</p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setTimeRange('month')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeRange === 'month' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Mensal</button>
                    <button onClick={() => setTimeRange('year')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeRange === 'year' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Anual</button>
                </div>
            </div>

            {/* Date Selectors if Month */}
            {timeRange === 'month' && (
                <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedYear(y => y-1)}><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(y => y+1)}><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    
                    <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
                    
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer">
                        {monthNames.map((m, i) => <option key={i} value={i} className="dark:bg-slate-900">{m}</option>)}
                    </select>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Faturamento Bruto" value={snapshot.current.revenue} delta={calcDelta(snapshot.current.revenue, snapshot.previous.revenue)} tooltip="Receita total consolidada no período." />
                <StatCard title={terms.mrrLabel} value={snapshot.current.mrr} delta={calcDelta(snapshot.current.mrr, snapshot.previous.mrr)} tooltip="Base estável de faturamento recorrente mensal." />
                <StatCard title="Lucro Líquido" value={snapshot.current.profit} delta={calcDelta(snapshot.current.profit, snapshot.previous.profit)} tooltip="Valor final após todas as deduções operacionais." />
                <StatCard title="Margem Bruta" value={snapshot.current.margin} isCurrency={false} delta={snapshot.current.margin - snapshot.previous.margin} tooltip="Eficiência financeira da operação." />
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 h-80 flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 shrink-0">Tendência de Receita x Despesa</h3>
                <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={snapshot.chartData}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5}/>
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
