import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, 
    ChevronLeft, ChevronRight, Info, DollarSign, Target, PieChart, 
    Clock, Loader2 as LoaderIcon, Cloud, Gauge, ShieldCheck, 
    Zap, AlertTriangle, Users, BarChart3, Layers, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { FinancialRecord, FinancialTransaction, getTerminology, DbClient } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { supabase } from '../services/supabaseClient';
import { fetchClients } from '../services/clientService';

type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface Props {
    manualTransactions?: FinancialTransaction[];
    orgType?: string;
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-1 cursor-help z-[100] isolate">
        <Info className="w-3 h-3 text-slate-300 hover:text-slate-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-2xl border border-white/10 z-[110] invisible group-hover:visible translate-y-1 group-hover:translate-y-0 text-center">
            <div className="relative z-10">{text}</div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/10"></div>
        </div>
    </div>
);

const StatCard = ({ title, value, isCurrency = true, delta, suffix = "", tooltip, colorClass }: any) => {
    const isPositive = delta >= 0;
    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-44 hover:shadow-2xl transition-all group relative overflow-hidden shadow-soft">
            <div className={`absolute top-0 right-0 w-24 h-24 ${colorClass} opacity-5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700`}></div>
            <div className="flex justify-between items-start relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    {title}
                    {tooltip && <InfoTooltip text={tooltip} />}
                </span>
                {delta !== undefined && delta !== 0 && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${isPositive ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>} {Math.abs(delta).toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    {isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : `${value}${suffix}`}
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-3 tracking-widest">Snapshot Período</p>
            </div>
        </div>
    );
};

export const FinancialDashboard: React.FC<Props> = ({ manualTransactions = [], orgType = 'Startup' }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [financialHistory, setFinancialHistory] = useState<FinancialRecord[]>([]);
    const [clients, setClients] = useState<DbClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const monthlyBudget = 25000; 

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(viewDate);
        const mod = direction === 'next' ? 1 : -1;
        newDate.setMonth(newDate.getMonth() + mod);
        setViewDate(newDate);
    };

    const safeParse = (dateStr: string) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('T') || dateStr.includes(' ')) return new Date(dateStr);
        return new Date(dateStr + 'T12:00:00');
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
                const orgId = userData?.organizacao || 0;

                const clientsData = await fetchClients(orgId);
                setClients(clientsData || []);

                const history: FinancialRecord[] = [];
                const currentYear = viewDate.getFullYear();
                
                for (let y = currentYear - 1; y <= currentYear; y++) {
                    for (let m = 0; m < 12; m++) {
                        let monthMrr = 0;
                        clientsData.forEach(c => {
                            const start = safeParse(c.data_inicio);
                            if (start.getFullYear() < y || (start.getFullYear() === y && start.getMonth() <= m)) {
                                monthMrr += Number(c.valormensal || 0);
                            }
                        });

                        const monthTrans = manualTransactions.filter(t => {
                            const d = safeParse(t.date);
                            return d.getMonth() === m && d.getFullYear() === y;
                        });

                        const outflow = monthTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);
                        const inflow = monthTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);

                        history.push({
                            id: `h_${y}_${m}`,
                            date: `${y}-${String(m+1).padStart(2, '0')}-01`,
                            organizationId: orgId,
                            mrr: monthMrr,
                            gross_revenue: monthMrr + inflow,
                            cogs: 0,
                            total_expenses: outflow,
                            marketing_spend: monthTrans.filter(t => t.category === 'Marketing').reduce((acc, t) => acc + Number(t.amount), 0),
                            sales_spend: monthTrans.filter(t => t.category === 'Suporte').reduce((acc, t) => acc + Number(t.amount), 0),
                            active_customers: clientsData.length,
                            new_customers: clientsData.filter(c => {
                                const d = safeParse(c.data_inicio);
                                return d.getMonth() === m && d.getFullYear() === y;
                            }).length,
                            churned_customers: 0,
                            churned_mrr: 0
                        });
                    }
                }
                setFinancialHistory(history);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        loadDashboardData();
    }, [viewDate.getFullYear(), manualTransactions]);

    const metrics = useMemo(() => {
        if (financialHistory.length === 0) return null;

        const currentMonth = viewDate.getMonth();
        const currentYear = viewDate.getFullYear();
        
        const currentMonthTransactions = manualTransactions.filter(t => {
            const d = safeParse(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const manualInflow = currentMonthTransactions.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);
        const totalOutflow = currentMonthTransactions.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);
        
        const record = financialHistory.find(h => {
            const d = safeParse(h.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        if (!record) return null;

        const totalRevenue = record.mrr + manualInflow;

        const infraCost = currentMonthTransactions
            .filter(t => t.category === 'Tecnológico')
            .reduce((acc, t) => acc + Number(t.amount), 0) || (totalRevenue * 0.18); 

        const showbackData = clients.map((c) => {
            const share = (c.valormensal || 0) / (record.mrr || 1);
            return {
                name: c.nome,
                cost: infraCost * share,
                db: 40, storage: 30, edge: 30 
            };
        }).sort((a, b) => b.cost - a.cost);

        const avgMrr = record.mrr / (record.active_customers || 1);
        const ltv = avgMrr * 24; 
        const cac = (record.marketing_spend + record.sales_spend) / (record.new_customers || 1);
        const infraEfficiency = totalRevenue > 0 ? ((totalRevenue - infraCost) / totalRevenue) * 100 : 0;
        const netProfit = totalRevenue - totalOutflow;

        const budgetConsumption = (totalOutflow / monthlyBudget) * 100;
        let budgetLevel: 'safe' | 'warning' | 'critical' = 'safe';
        if (budgetConsumption >= 90) budgetLevel = 'critical';
        else if (budgetConsumption >= 75) budgetLevel = 'warning';

        return {
            record, showbackData, ltv, cac, netProfit, totalRevenue, totalOutflow,
            ltvCacRatio: ltv / (cac || 1),
            infraEfficiency, infraCost, budgetConsumption, budgetLevel,
            chartData: financialHistory.filter(h => safeParse(h.date).getFullYear() === currentYear).map(h => ({
                name: safeParse(h.date).toLocaleDateString('pt-BR', {month: 'short'}),
                Receita: h.gross_revenue,
                Despesas: h.total_expenses
            }))
        };
    }, [financialHistory, clients, manualTransactions, viewDate]);

    if (isLoading || !metrics) return (
        <div className="py-40 flex flex-col items-center justify-center gap-6">
            <LoaderIcon className="w-12 h-12 animate-spin text-amber-500"/>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] animate-pulse">Auditando Fluxo Industrial...</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 animate-in fade-in duration-700">
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-amber-500"/> Panorama <span className="text-amber-500">Geral</span>.
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Snapshot de performance e auditória de nuvem.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-3 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-soft">
                    <button onClick={() => handleNavigate('prev')} className="p-2.5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                    <div className="flex items-center gap-3 px-4">
                        <Calendar className="w-4 h-4 text-amber-500"/>
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest min-w-[140px] text-center">
                            {safeParse(metrics.record.date).toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'})}
                        </span>
                    </div>
                    <button onClick={() => handleNavigate('next')} className="p-2.5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
                </div>
            </div>

            {/* DESTAQUE PRINCIPAL: LUCRO LÍQUIDO */}
            <div className="bg-slate-900 dark:bg-white p-12 rounded-[3.5rem] flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative z-10 text-center md:text-left">
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mb-4 block">Resultado Operacional Líquido</span>
                    <div className={`text-6xl md:text-8xl font-black tracking-tighter leading-none ${metrics.netProfit >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                        R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                         <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${metrics.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                            {metrics.netProfit >= 0 ? 'Operação em Superávit' : 'Operação em Déficit'}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">v2.6 Performance Engine</span>
                    </div>
                </div>
                <div className="relative z-10 grid grid-cols-2 gap-4 shrink-0">
                    <div className="p-6 bg-white/5 dark:bg-black/5 rounded-3xl border border-white/10 dark:border-black/10">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Entradas</div>
                        <div className="text-xl font-black text-emerald-500">+{formatCurrency(metrics.totalRevenue)}</div>
                    </div>
                    <div className="p-6 bg-white/5 dark:bg-black/5 rounded-3xl border border-white/10 dark:border-black/10">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saídas</div>
                        <div className="text-xl font-black text-rose-500">-{formatCurrency(metrics.totalOutflow)}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Eficiência de Infra" 
                    value={metrics.infraEfficiency.toFixed(1)} 
                    isCurrency={false} suffix="%" 
                    colorClass="bg-blue-500"
                    tooltip="Percentual de faturamento após custos de nuvem. Benchmark ideal: 75% a 81%." 
                />
                <StatCard 
                    title="LTV : CAC" 
                    value={metrics.ltvCacRatio.toFixed(1)} 
                    isCurrency={false} suffix="x" 
                    colorClass="bg-purple-500"
                    tooltip="Métrica de tração. A cada 1 real investido em CAC, o cliente deve retornar pelo menos 3 vezes no LTV." 
                />
                <StatCard 
                    title="Custo de Aquisição (CAC)" 
                    value={metrics.cac} 
                    colorClass="bg-rose-500"
                    tooltip="Média de investimento em Marketing e Vendas para conquistar um novo parceiro." 
                />
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-44 relative group overflow-hidden shadow-soft">
                    <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${metrics.budgetLevel === 'critical' ? 'bg-red-500' : metrics.budgetLevel === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, metrics.budgetConsumption)}%` }}></div>
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Orçamento Consumido <InfoTooltip text="Gasto total vs Budget mensal aprovado pela gestão."/></span>
                        <div className={`p-2 rounded-xl ${metrics.budgetLevel === 'critical' ? 'bg-red-500 text-white animate-pulse' : metrics.budgetLevel === 'warning' ? 'bg-amber-500 text-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
                             {metrics.budgetLevel === 'critical' ? <AlertTriangle className="w-4 h-4"/> : <Gauge className="w-4 h-4"/>}
                        </div>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{metrics.budgetConsumption.toFixed(0)}%</div>
                        <p className={`text-[8px] font-black uppercase mt-2 ${metrics.budgetLevel === 'critical' ? 'text-red-500' : 'text-slate-400'}`}>
                            {metrics.budgetConsumption >= 100 ? 'BUDGET ESTOURADO' : `R$ ${metrics.totalOutflow.toLocaleString()} / R$ ${monthlyBudget.toLocaleString()}`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col h-full min-h-[500px]">
                        <div className="mb-8 border-b border-slate-50 dark:border-white/5 pb-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                                <Cloud className="w-6 h-6 text-blue-500"/> Cloud Showback
                            </h3>
                            <p className="text-[9px] text-slate-500 font-black uppercase mt-2 tracking-widest">Custo Operacional por Stakeholder</p>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-2">
                            {metrics.showbackData.map((item, idx) => (
                                <div key={idx} className="group p-5 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-amber-500/30 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[150px] uppercase">{item.name}</span>
                                        <span className="text-sm font-black text-blue-500">R$ {item.cost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="h-1 bg-blue-500/20 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${item.db}%`}}></div></div>
                                            <span className="text-[7px] text-slate-400 font-bold uppercase">DB</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="h-1 bg-amber-500/20 rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{width: `${item.storage}%`}}></div></div>
                                            <span className="text-[7px] text-slate-400 font-bold uppercase">Store</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="h-1 bg-purple-500/20 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${item.edge}%`}}></div></div>
                                            <span className="text-[7px] text-slate-400 font-bold uppercase">Edge</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {metrics.showbackData.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                                    <Layers className="w-12 h-12"/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Sem Clientes Ativos</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-soft h-full min-h-[500px] flex flex-col">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                                    <Activity className="w-7 h-7 text-emerald-500"/> Performance Anual
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Sincronização com Ledger Industrial</p>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-glow-emerald"></div><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Entradas</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-800"></div><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Saídas</span></div>
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics.chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0C', border: 'none', borderRadius: '24px', color: 'white', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} cursor={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5' }} />
                                    <Area type="monotone" dataKey="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                                    <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} strokeDasharray="6 6" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;