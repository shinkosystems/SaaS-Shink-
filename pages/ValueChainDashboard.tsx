
import React, { useState, useEffect, useMemo } from 'react';
import { fetchProjects, fetchAllTasks, updateTask, deleteTask } from '../services/projectService';
import { fetchTransactions, getOperationalRates } from '../services/financialService';
import { DbProject, FinancialTransaction, DbTask, Opportunity, BpmnTask } from '../types';
import { QuickTaskModal } from '../components/QuickTaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { 
    Layers, Activity, Clock, 
    Briefcase, ExternalLink, 
    Plus, TrendingUp, Zap, Target, ArrowUpRight, DollarSign,
    PieChart, BarChart3, ChevronRight, AlertTriangle, CheckCircle2, Save, RefreshCw,
    Calendar, ChevronLeft, Users, Filter, ArrowRight, TrendingDown, Hourglass, Receipt
} from 'lucide-react';

interface Props {
    organizationId?: number;
}

const CATEGORY_STYLES: Record<string, string> = {
    'Apoio-Adm': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'Apoio-Gestão': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    'Primária-Modelagem': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'Primária-Interface': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Primária-Lógica': 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    'Primária-Marketing': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

// Constantes de Engenharia Shinkō
const DEFAULT_PROFIT_MARGIN = 0.35; // 35% de margem padrão por card
const DAILY_DELAY_PENALTY = 0.05; // 5% de perda de valor por dia de atraso

const KANBAN_TO_PILLAR: Record<string, string> = {
    'Adm': 'Apoio-Adm',
    'Financeiro': 'Apoio-Adm',
    'Gestão': 'Apoio-Gestão',
    'Modelagem': 'Primária-Modelagem',
    'Interface': 'Primária-Interface',
    'Lógica': 'Primária-Lógica',
    'Marketing': 'Primária-Marketing',
    'Tecnológico': 'Primária-Lógica',
    'RH': 'Apoio-Adm',
    'Suporte': 'Apoio-Gestão'
};

const CATEGORY_REVENUE_WEIGHTS: Record<string, number> = {
    'Apoio-Adm': 0.05,
    'Apoio-Gestão': 0.10,
    'Primária-Modelagem': 0.20,
    'Primária-Interface': 0.20,
    'Primária-Lógica': 0.30,
    'Primária-Marketing': 0.15,
};

type TimeRange = 'day' | 'week' | 'month' | 'year';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
    }).format(value);
};

const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export const ValueChainDashboard: React.FC<Props> = ({ organizationId }) => {
    const [activeTab, setActiveTab] = useState<'processes' | 'profitability'>('processes');
    const [kanbanTasks, setKanbanTasks] = useState<DbTask[]>([]);
    const [projects, setProjects] = useState<DbProject[]>([]);
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuickTask, setShowQuickTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
    const [rates, setRates] = useState<any>(null);
    
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [viewDate, setViewDate] = useState(new Date());

    const [manualMetrics, setManualMetrics] = useState<Record<string, { 
        targetRev?: number, 
        realRev?: number, 
        targetCost?: number, 
        realCost?: number 
    }>>({});

    useEffect(() => {
        if (organizationId) {
            loadData();
        }
    }, [organizationId, timeRange, viewDate]);

    const loadData = async () => {
        setLoading(true);
        const [kData, pData, transData, rData] = await Promise.all([
            fetchAllTasks(organizationId!),
            fetchProjects(organizationId!),
            fetchTransactions(organizationId!),
            getOperationalRates(organizationId!)
        ]);
        setKanbanTasks(kData);
        setProjects(pData);
        setTransactions(transData);
        setRates(rData);
        setLoading(false);
    };

    const handleNavigate = (dir: 'next' | 'prev') => {
        const mod = dir === 'next' ? 1 : -1;
        const newDate = new Date(viewDate);
        if (timeRange === 'day') newDate.setDate(newDate.getDate() + mod);
        else if (timeRange === 'week') newDate.setDate(newDate.getDate() + (mod * 7));
        else if (timeRange === 'month') newDate.setMonth(newDate.getMonth() + mod);
        else if (timeRange === 'year') newDate.setFullYear(newDate.getFullYear() + mod);
        setViewDate(newDate);
    };

    const stats = useMemo(() => {
        let start = new Date(viewDate);
        let end = new Date(viewDate);
        if (timeRange === 'day') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
        else if (timeRange === 'week') { start.setDate(start.getDate() - start.getDay()); end.setDate(start.getDate() + 6); }
        else if (timeRange === 'month') { start.setDate(1); end = new Date(start.getFullYear(), start.getMonth() + 1, 0); }
        else if (timeRange === 'year') { start = new Date(start.getFullYear(), 0, 1); end = new Date(start.getFullYear(), 11, 31); }

        const periodTrans = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        const periodKanban = kanbanTasks.filter(t => {
            const d = new Date(t.datafim || t.dataproposta);
            return d >= start && d <= end;
        });

        const totalRevenue = periodTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
        const totalOutflow = periodTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);
        const totalKanbanHours = periodKanban.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);

        let globalFutureProfit = 0;
        let globalBilledProfit = 0;
        let globalActiveCost = 0;

        const categoryMetrics = Object.keys(CATEGORY_STYLES).map(pillar => {
            const pillarTasks = periodKanban.filter(t => KANBAN_TO_PILLAR[t.category || 'Gestão'] === pillar);
            const pillarHours = pillarTasks.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);
            const effortRatio = totalKanbanHours > 0 ? (pillarHours / totalKanbanHours) : 0;
            
            const baseTargetRev = Number((totalRevenue * (CATEGORY_REVENUE_WEIGHTS[pillar] || 0.1)).toFixed(2));
            const baseRealRev = baseTargetRev; 
            const baseRealCost = Number((totalOutflow * effortRatio).toFixed(2));

            const m = manualMetrics[pillar] || {};
            const targetRev = m.targetRev !== undefined ? m.targetRev : baseTargetRev;
            const realRev = m.realRev !== undefined ? m.realRev : baseRealRev;
            const realCost = m.realCost !== undefined ? m.realCost : baseRealCost;

            const profitability = realRev > 0 ? ((realRev - realCost) / realRev) * 100 : realCost > 0 ? -100 : 0;

            // Classificação Shinkō por Pilar
            let pillarFutureProfit = 0;
            let pillarBilledProfit = 0;
            let pillarActiveCost = 0;

            pillarTasks.forEach(task => {
                const hourlyRate = rates?.totalRate || 0;
                const taskCost = (task.duracaohoras || 2) * hourlyRate;
                const taskVal = taskCost / (1 - DEFAULT_PROFIT_MARGIN);

                if (task.status === 'todo' || task.status === 'backlog') {
                    pillarFutureProfit += taskVal;
                } else if (task.status === 'done') {
                    pillarBilledProfit += taskVal;
                } else {
                    pillarActiveCost += taskCost;
                }
            });

            globalFutureProfit += pillarFutureProfit;
            globalBilledProfit += pillarBilledProfit;
            globalActiveCost += pillarActiveCost;

            return {
                category: pillar,
                hours: pillarHours,
                ratio: effortRatio * 100,
                targetRev, realRev, realCost, profitability,
                tasks: pillarTasks,
                futureProfit: pillarFutureProfit,
                billedProfit: pillarBilledProfit,
                activeCost: pillarActiveCost,
                overridden: {
                    realRev: m.realRev !== undefined,
                    realCost: m.realCost !== undefined
                }
            };
        });

        const technicalMargin = totalRevenue > 0 ? ((totalRevenue - totalOutflow) / totalRevenue) * 100 : 0;

        return { 
            totalRevenue, 
            totalOutflow, 
            totalKanbanHours,
            technicalMargin, 
            categoryMetrics,
            globalFutureProfit,
            globalBilledProfit,
            globalActiveCost,
            label: start.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', day: timeRange === 'day' ? '2-digit' : undefined }).toUpperCase()
        };
    }, [kanbanTasks, transactions, manualMetrics, timeRange, viewDate, rates]);

    const handleMetricChange = (category: string, field: string, value: string) => {
        const numVal = value === '' ? undefined : Number(value);
        setManualMetrics(prev => ({
            ...prev,
            [category]: { ...(prev[category] || {}), [field]: numVal }
        }));
    };

    const convertDbTaskToBpmn = (t: DbTask): BpmnTask => ({
        id: t.id.toString(),
        dbId: t.id,
        text: t.titulo,
        description: t.descricao || '',
        status: t.status as any,
        completed: t.status === 'done',
        assigneeId: t.responsavel,
        dueDate: t.datafim || t.dataproposta,
        estimatedHours: t.duracaohoras,
        category: t.category,
        gut: { g: t.gravidade || 1, u: t.urgencia || 1, t: t.tendencia || 1 },
        attachments: t.anexos || []
    });

    return (
        <div className="h-full flex flex-col p-6 md:p-12 space-y-10 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent pb-32">
            
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Fluxo de <span className="text-amber-500">Valor</span>.
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3">Engenharia de Lucratividade Shinkō</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        {['day', 'week', 'month', 'year'].map(r => (
                            <button key={r} onClick={() => setTimeRange(r as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{r === 'day' ? 'Dia' : r === 'week' ? 'Sem' : r === 'month' ? 'Mês' : 'Ano'}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => handleNavigate('prev')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-[10px] font-black uppercase text-amber-500 min-w-[90px] text-center">{stats.label}</span>
                        <button onClick={() => handleNavigate('next')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>

                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => setActiveTab('processes')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'processes' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Processos (Kanban)</button>
                        <button onClick={() => setActiveTab('profitability')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profitability' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Rentabilidade</button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500"/> Receita Total (Inflow)</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-emerald-500 transition-colors">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Ledger Sincronizado</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-rose-500"/> Custos Ativos</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-rose-500 transition-colors">{formatCurrency(stats.globalActiveCost)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Work-in-Progress (WIP)</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-500"/> Lucro a Faturar</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-blue-500 transition-colors">{formatCurrency(stats.globalBilledProfit)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Tarefas Concluídas</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Hourglass className="w-4 h-4 text-violet-500"/> Lucro Futuro</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-violet-500 transition-colors">{formatCurrency(stats.globalFutureProfit)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Expectativa de Backlog</div>
                </div>
            </div>

            {activeTab === 'processes' ? (
                <div className="space-y-12 pb-24">
                    {stats.categoryMetrics.filter(c => c.tasks.length > 0).map(cat => (
                        <div key={cat.category} className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[cat.category].split(' ')[0]}`}></div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{cat.category}</h3>
                                    <span className="text-[10px] font-bold text-slate-400">{cat.tasks.length} processos ativos</span>
                                </div>
                                <div className="flex gap-8 items-center">
                                    <div className="text-right">
                                        <div className="text-xs font-black text-emerald-500">{formatCurrencyFull(cat.billedProfit)}</div>
                                        <div className="text-[8px] font-bold text-slate-400 uppercase">A Faturar</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-blue-500">{formatCurrencyFull(cat.futureProfit)}</div>
                                        <div className="text-[8px] font-bold text-slate-400 uppercase">Futuro</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {cat.tasks.map(task => {
                                    const hourlyRate = rates?.totalRate || 0;
                                    const taskCost = (task.duracaohoras || 2) * hourlyRate;
                                    let taskGeneratedVal = taskCost / (1 - DEFAULT_PROFIT_MARGIN);
                                    
                                    // Cálculo de Prejuízo por Atraso
                                    let delayPenalty = 0;
                                    let daysDelayed = 0;
                                    const deadline = new Date(task.datafim || task.dataproposta);
                                    const completionDate = (task as any).dataconclusao ? new Date((task as any).dataconclusao) : new Date();
                                    
                                    if (completionDate > deadline) {
                                        const diffTime = Math.abs(completionDate.getTime() - deadline.getTime());
                                        daysDelayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        delayPenalty = taskGeneratedVal * DAILY_DELAY_PENALTY * daysDelayed;
                                    }

                                    const finalValue = taskGeneratedVal - delayPenalty;
                                    
                                    // Lógica de Ativo/Passivo por Status
                                    const isBacklog = task.status === 'todo' || task.status === 'backlog';
                                    const isDone = task.status === 'done';
                                    const isCostActive = !isBacklog && !isDone;

                                    return (
                                        <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer hover:border-amber-500/40">
                                            {daysDelayed > 0 && (
                                                <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl z-10 animate-pulse">
                                                    Atraso: {daysDelayed}d
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{task.projetoData?.nome || 'Ad-hoc'}</span>
                                                <div className="flex items-center gap-2">
                                                     <div className={`w-1.5 h-1.5 rounded-full ${
                                                         isBacklog ? 'bg-violet-500' :
                                                         isDone ? 'bg-emerald-500' :
                                                         'bg-rose-500'
                                                     }`}></div>
                                                     <span className={`text-[8px] font-black uppercase ${
                                                          isBacklog ? 'text-violet-500' :
                                                          isDone ? 'text-emerald-500' :
                                                          'text-rose-500'
                                                     }`}>
                                                         {isBacklog ? 'Lucro Futuro' : isDone ? 'Lucro a Faturar' : 'Custo Ativo'}
                                                     </span>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug mb-6 group-hover:text-amber-500 transition-colors line-clamp-2 h-10">{task.titulo}</h4>
                                            
                                            <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-[8px] font-black text-slate-400 uppercase">Investimento ABC</div>
                                                    <div className="text-xs font-black text-slate-500 dark:text-slate-400">{formatCurrencyFull(taskCost)}</div>
                                                </div>
                                                
                                                {delayPenalty > 0 ? (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                                                            <div className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase flex items-center gap-1.5">
                                                                <TrendingDown className="w-3 h-3"/> Prejuízo Atraso
                                                            </div>
                                                            <div className="text-xs font-black text-red-600 dark:text-red-400">-{formatCurrencyFull(delayPenalty)}</div>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                                                            <div className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase flex items-center gap-1.5">
                                                                <Activity className="w-3 h-3"/> Valor Real
                                                            </div>
                                                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-500">{formatCurrencyFull(finalValue)}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`flex justify-between items-center p-2 rounded-xl border ${
                                                        isBacklog ? 'bg-violet-500/5 border-violet-500/10' :
                                                        isDone ? 'bg-emerald-500/5 border-emerald-500/10' :
                                                        'bg-rose-500/5 border-rose-500/10'
                                                    }`}>
                                                        <div className={`text-[8px] font-black uppercase flex items-center gap-1.5 ${
                                                            isBacklog ? 'text-violet-600' :
                                                            isDone ? 'text-emerald-600' :
                                                            'text-rose-600'
                                                        }`}>
                                                            {isBacklog ? <Hourglass className="w-3 h-3"/> : isDone ? <TrendingUp className="w-3 h-3"/> : <Zap className="w-3 h-3"/>}
                                                            {isBacklog ? 'Potencial' : isDone ? 'Gerado' : 'Consumindo'}
                                                        </div>
                                                        <div className={`text-sm font-black ${
                                                            isBacklog ? 'text-violet-600' :
                                                            isDone ? 'text-emerald-600' :
                                                            'text-rose-600'
                                                        }`}>
                                                            {formatCurrencyFull(isCostActive ? taskCost : taskGeneratedVal)}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                                     <span>Esforço: {task.duracaohoras || 2}h</span>
                                                     <span className={delayPenalty > 0 ? 'text-red-500' : 'text-emerald-500'}>
                                                        Margem: {((finalValue - taskCost) / finalValue * 100).toFixed(0)}%
                                                     </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {kanbanTasks.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] text-slate-400 gap-4">
                            <Layers className="w-12 h-12 opacity-20"/>
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhum card de processo no Kanban</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilar Shinkō</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Esforço (h)</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ativo (WIP)</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">A Faturar (Concluído)</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Futuro (Backlog)</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rentabilidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {stats.categoryMetrics.map(item => (
                                    <tr key={item.category} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[item.category].split(' ')[0]}`}></div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center"><span className="text-sm font-black text-slate-700 dark:text-slate-300">{item.hours}h</span></td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-rose-500">{formatCurrency(item.activeCost)}</td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-emerald-500">{formatCurrency(item.billedProfit)}</td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-violet-500">{formatCurrency(item.futureProfit)}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${item.profitability >= 30 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : item.profitability > 0 ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {item.profitability.toFixed(1)}% {item.profitability > 0 ? 'LUCRO' : 'PREJUÍZO'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-10 bg-slate-900 border border-white/5 rounded-[3rem] flex items-start gap-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                        <BarChart3 className="w-10 h-10 text-amber-500 shrink-0 relative z-10"/>
                        <div className="relative z-10">
                            <h4 className="text-base font-black text-white uppercase tracking-[0.2em] mb-3">Massa Crítica de Dados Operacionais</h4>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-4xl">
                                • A aba <strong>Processos</strong> agora reflete o esforço real do seu Kanban fatiado por pilar estratégico.<br/>
                                • <strong>Lucro Futuro:</strong> Reflete o valor potencial que o seu backlog de inovação representa para o negócio.<br/>
                                • <strong>Lucro a Faturar:</strong> Valor técnico gerado e pronto para reconhecimento de receita.<br/>
                                • <strong>Custos Ativos:</strong> Recursos humanos e tecnológicos sendo consumidos em tempo real pelo WIP.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showQuickTask && (
                <QuickTaskModal 
                    opportunities={projects as any} 
                    onClose={() => setShowQuickTask(false)} 
                    onSave={async (task, pid) => {
                        setShowQuickTask(false);
                        loadData();
                    }}
                />
            )}

            {selectedTask && (
                <TaskDetailModal 
                    task={convertDbTaskToBpmn(selectedTask)}
                    nodeTitle={selectedTask.category || 'Gestão'}
                    opportunityTitle={selectedTask.projetoData?.nome || 'Tarefa Ad-hoc'}
                    organizationId={organizationId}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), {
                            titulo: updated.text,
                            descricao: updated.description,
                            status: updated.status,
                            responsavel: updated.assigneeId,
                            datafim: updated.dueDate,
                            duracaohoras: updated.estimatedHours,
                            category: updated.category,
                            gravidade: updated.gut?.g,
                            urgencia: updated.gut?.u,
                            tendencia: updated.gut?.t
                        });
                        loadData();
                        setSelectedTask(null);
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        loadData();
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
};
