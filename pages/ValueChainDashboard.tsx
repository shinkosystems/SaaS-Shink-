
import React, { useState, useEffect, useMemo } from 'react';
import { fetchProjects, fetchAllTasks, updateTask, deleteTask } from '../services/projectService';
import { fetchTransactions, getOperationalRates } from '../services/financialService';
import { DbProject, FinancialTransaction, DbTask, Opportunity, BpmnTask, TaskStatus } from '../types';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { 
    Layers, Activity, Clock, 
    Briefcase, ExternalLink, 
    Plus, TrendingUp, Zap, Target, ArrowUpRight, DollarSign,
    PieChart, BarChart3, ChevronRight, AlertTriangle, CheckCircle2, Save, RefreshCw,
    Calendar, ChevronLeft, Users, Filter, ArrowRight, TrendingDown, Hourglass, Receipt, Coins, Loader2, X, ListTodo
} from 'lucide-react';

interface Props {
    organizationId?: number;
}

const CATEGORY_STYLES: Record<string, string> = {
    'Apoio-Adm': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    'Apoio-Gestão': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
    'Primária-Modelagem': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
    'Primária-Interface': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
    'Primária-Lógica': 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800/50',
    'Primária-Marketing': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
};

const STATUS_OPTIONS = [
    { value: 'all', label: 'TUDO' },
    { value: 'backlog', label: 'BACKLOG' },
    { value: 'todo', label: 'A FAZER' },
    { value: 'doing', label: 'EXECUTANDO' },
    { value: 'review', label: 'REVISÃO' },
    { value: 'approval', label: 'APROVAÇÃO' },
    { value: 'done', label: 'CONCLUÍDO' }
];

const DEFAULT_PROFIT_MARGIN = 0.35; 

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
    const [activeTab, setActiveTab] = useState<'processes' | 'projects' | 'profitability'>('processes');
    const [kanbanTasks, setKanbanTasks] = useState<DbTask[]>([]);
    const [projects, setProjects] = useState<DbProject[]>([]);
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
    const [rates, setRates] = useState<any>(null);
    
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [viewDate, setViewDate] = useState(new Date());
    const [processStatusFilter, setProcessStatusFilter] = useState<string>('all');

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

        // Filtragem Base por Tempo
        let periodKanban = kanbanTasks.filter(t => {
            const d = new Date(t.datafim || t.dataproposta);
            return d >= start && d <= end;
        });

        // Filtragem Adicional por Status (se aplicável)
        if (processStatusFilter !== 'all') {
            periodKanban = periodKanban.filter(t => t.status === processStatusFilter);
        }

        const totalRevenue = periodTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
        const totalOutflow = periodTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);
        
        const hourlyRate = rates?.totalRate || 0;

        let globalFutureProfit = 0;
        let globalBilledProfit = 0;
        let globalActiveCost = 0;

        const categoryMetrics = Object.keys(CATEGORY_STYLES).map(pillar => {
            const pillarTasks = periodKanban.filter(t => KANBAN_TO_PILLAR[t.category || 'Gestão'] === pillar);
            const pillarHours = pillarTasks.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);
            
            let pillarFutureProfit = 0;
            let pillarBilledProfit = 0;
            let pillarActiveCost = 0;

            pillarTasks.forEach(task => {
                const taskCost = (task.duracaohoras || 2) * hourlyRate;
                const taskVal = taskCost / (1 - DEFAULT_PROFIT_MARGIN);

                if (task.status === 'todo' || task.status === 'backlog') pillarFutureProfit += taskVal;
                else if (task.status === 'done') pillarBilledProfit += taskVal;
                else pillarActiveCost += taskCost;
            });

            globalFutureProfit += pillarFutureProfit;
            globalBilledProfit += pillarBilledProfit;
            globalActiveCost += pillarActiveCost;

            return {
                category: pillar,
                hours: pillarHours,
                futureProfit: pillarFutureProfit,
                billedProfit: pillarBilledProfit,
                activeCost: pillarActiveCost,
                tasks: pillarTasks
            };
        });

        const projectMetrics = projects.map(proj => {
            const projTasks = periodKanban.filter(t => t.projeto === proj.id);
            const projHours = projTasks.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);
            const projCost = projHours * hourlyRate;
            // Fixed: Using correct mrr property from DbProject or fallback to calculated revenue if available
            const expectedMonthlyRev = proj.mrr || (proj.receita || 0) / (proj.meses || 12);
            
            const projProfit = expectedMonthlyRev - projCost;
            const projMargin = expectedMonthlyRev > 0 ? (projProfit / expectedMonthlyRev) * 100 : 0;

            // Breakdown por pilar para este projeto específico
            const pillarBreakdown = Object.keys(CATEGORY_STYLES).map(pillar => {
                const pTasks = projTasks.filter(t => KANBAN_TO_PILLAR[t.category || 'Gestão'] === pillar);
                const pHours = pTasks.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);
                const pCost = pHours * hourlyRate;
                return { pillar, hours: pHours, cost: pCost, tasks: pTasks };
            });

            return {
                id: proj.id,
                name: proj.nome,
                hours: projHours,
                cost: projCost,
                expectedMonthlyRev,
                profit: projProfit,
                margin: projMargin,
                status: proj.projoport ? 'Future' : 'Active',
                pillarBreakdown
            };
        }).sort((a, b) => b.cost - a.cost);

        return { 
            totalRevenue, totalOutflow, 
            categoryMetrics, projectMetrics,
            globalFutureProfit, globalBilledProfit, globalActiveCost,
            label: start.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', day: timeRange === 'day' ? '2-digit' : undefined }).toUpperCase()
        };
    }, [kanbanTasks, transactions, viewDate, timeRange, rates, projects, processStatusFilter]);

    const selectedProjectData = useMemo(() => {
        if (!selectedProjectId) return null;
        return stats.projectMetrics.find(p => p.id === selectedProjectId);
    }, [selectedProjectId, stats.projectMetrics]);

    const pillarTasks = useMemo(() => {
        if (!selectedPillar) return [];
        if (selectedProjectData) {
            const pillar = selectedProjectData.pillarBreakdown.find(pb => pb.pillar === selectedPillar);
            return pillar?.tasks || [];
        }
        // Organization wide pillar tasks
        const catMetric = stats.categoryMetrics.find(c => c.category === selectedPillar);
        return catMetric?.tasks || [];
    }, [selectedPillar, selectedProjectData, stats.categoryMetrics]);

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
                            <button key={r} onClick={() => setTimeRange(r as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{r === 'day' ? 'Dia' : r === 'week' ? 'Sem' : r === 'month' ? 'Mês' : r === 'year' ? 'Ano' : ''}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => handleNavigate('prev')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-[10px] font-black uppercase text-amber-500 min-w-[90px] text-center">{stats.label}</span>
                        <button onClick={() => handleNavigate('next')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>

                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => {setActiveTab('processes'); setSelectedProjectId(null); setSelectedPillar(null);}} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'processes' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Processos</button>
                        <button onClick={() => {setActiveTab('projects'); setSelectedProjectId(null); setSelectedPillar(null);}} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'projects' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Projetos</button>
                        <button onClick={() => {setActiveTab('profitability'); setSelectedProjectId(null); setSelectedPillar(null);}} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profitability' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Pillars</button>
                    </div>
                </div>
            </header>

            {/* Sub-Header: Filtro de Status para Aba Processos */}
            {activeTab === 'processes' && (
                <div className="flex justify-center md:justify-end animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-x-auto no-scrollbar">
                        {STATUS_OPTIONS.map(opt => (
                            <button 
                                key={opt.value} 
                                onClick={() => setProcessStatusFilter(opt.value)}
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${processStatusFilter === opt.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500"/> Receita Total (Inflow)</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-emerald-500 transition-colors">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Ledger Sincronizado</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-rose-500"/> Custos Ativos (WIP)</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-rose-500 transition-colors">{formatCurrency(stats.globalActiveCost)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Work-in-Progress Produção</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-500"/> Lucro a Faturar</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-blue-500 transition-colors">{formatCurrency(stats.globalBilledProfit)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Tasks Concluídas no Período</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Hourglass className="w-4 h-4 text-violet-500"/> Lucro Futuro</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-violet-500 transition-colors">{formatCurrency(stats.globalFutureProfit)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-3">Backlog Estimado</div>
                </div>
            </div>

            {/* Views */}
            {activeTab === 'processes' ? (
                <div className="space-y-12 pb-24">
                    {stats.categoryMetrics.filter(c => c.tasks.length > 0).map(cat => (
                        <div key={cat.category} className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[cat.category].split(' ')[0]}`}></div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{cat.category}</h3>
                                    <span className="text-[10px] font-bold text-slate-400">{cat.tasks.length} processos encontrados</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {cat.tasks.map(task => {
                                    const taskCost = (task.duracaohoras || 2) * (rates?.totalRate || 0);
                                    const taskGeneratedVal = taskCost / (1 - DEFAULT_PROFIT_MARGIN);
                                    
                                    const isBacklog = task.status === 'todo' || task.status === 'backlog';
                                    const isDone = task.status === 'done';

                                    return (
                                        <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer hover:border-amber-500/40">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{task.projetoData?.nome || 'Ad-hoc'}</span>
                                                <div className="flex items-center gap-2">
                                                     <div className={`w-1.5 h-1.5 rounded-full ${isBacklog ? 'bg-violet-500' : isDone ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                     <span className="text-[8px] font-bold text-slate-500 uppercase">{task.status}</span>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug mb-6 group-hover:text-amber-500 transition-colors line-clamp-2 h-10">{task.titulo}</h4>
                                            
                                            <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-[8px] font-black text-slate-400 uppercase">Custo ABC</div>
                                                    <div className="text-xs font-black text-slate-500">{formatCurrencyFull(taskCost)}</div>
                                                </div>
                                                <div className={`flex justify-between items-center p-2 rounded-xl ${isDone ? 'bg-emerald-500/5 text-emerald-500' : isBacklog ? 'bg-violet-500/5 text-violet-500' : 'bg-rose-500/5 text-rose-500'}`}>
                                                    <div className="text-[8px] font-black uppercase">{isDone ? 'Gerado' : isBacklog ? 'Futuro' : 'Consumo WIP'}</div>
                                                    <div className="text-sm font-black">{formatCurrencyFull(isDone || isBacklog ? taskGeneratedVal : taskCost)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {stats.categoryMetrics.every(c => c.tasks.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-40 text-center opacity-40">
                            <Filter className="w-16 h-16 mb-4 text-slate-300" />
                            <h3 className="text-xl font-black uppercase tracking-widest">Nenhum processo neste filtro</h3>
                        </div>
                    )}
                </div>
            ) : activeTab === 'projects' ? (
                <div className="space-y-12 pb-24">
                    {selectedProjectData ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => {setSelectedProjectId(null); setSelectedPillar(null);}} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-amber-500 transition-all shadow-sm">
                                        <ChevronLeft className="w-6 h-6"/>
                                    </button>
                                    <div>
                                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-1">Análise Deep Dive</div>
                                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{selectedProjectData.name}</h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Esforço Total</div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">{selectedProjectData.hours}h</div>
                                    </div>
                                    <div className="w-px h-10 bg-slate-200 dark:bg-white/10"></div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custo ABC Real</div>
                                        <div className="text-2xl font-black text-rose-500">{formatCurrency(selectedProjectData.cost)}</div>
                                    </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {selectedProjectData.pillarBreakdown.map(p => (
                                    <div 
                                        key={p.pillar} 
                                        onClick={() => setSelectedPillar(p.pillar === selectedPillar ? null : p.pillar)}
                                        className={`glass-card p-8 rounded-[2.5rem] border ${CATEGORY_STYLES[p.pillar]} flex flex-col justify-between h-48 transition-all hover:scale-[1.02] cursor-pointer ${selectedPillar === p.pillar ? 'ring-2 ring-amber-500 ring-offset-4 dark:ring-offset-black shadow-2xl' : ''}`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{p.pillar}</div>
                                                <div className="text-[9px] font-black px-2 py-1 bg-black/5 rounded-lg">{((p.cost / (selectedProjectData.cost || 1)) * 100).toFixed(0)}% do peso</div>
                                            </div>
                                            <div className="text-3xl font-black tracking-tighter">{formatCurrency(p.cost)}</div>
                                            <div className="text-[9px] font-bold uppercase mt-1 opacity-60">Custo ABC Consumido</div>
                                        </div>
                                        <div className="pt-4 border-t border-black/5 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 opacity-50"/>
                                                <span className="text-sm font-black">{p.hours}h</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase opacity-40">Ver Detalhes <ArrowRight className="w-2.5 h-2.5 inline ml-1"/></span>
                                        </div>
                                    </div>
                                ))}
                             </div>

                             {/* Drill-down de Tarefas do Pilar */}
                             {selectedPillar && (
                                 <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                     <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
                                         <div className="flex items-center gap-4">
                                             <div className={`w-3 h-10 rounded-full ${CATEGORY_STYLES[selectedPillar].split(' ')[0]}`}></div>
                                             <div>
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ativos de {selectedPillar}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Auditória de Engenharia Industrial</p>
                                             </div>
                                         </div>
                                         <span className="text-xs font-black px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500">{pillarTasks.length} tarefas mapeadas</span>
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                         {pillarTasks.map(task => (
                                             <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[1.8rem] p-6 hover:shadow-xl hover:border-amber-500/30 transition-all cursor-pointer group">
                                                 <div className="flex justify-between items-start mb-4">
                                                     <span className="text-[8px] font-black uppercase text-slate-400">ID: {task.id}</span>
                                                     <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500'}`}>{task.status}</div>
                                                 </div>
                                                 <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed mb-6 group-hover:text-amber-500 transition-colors line-clamp-2">{task.titulo}</h4>
                                                 <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                                     <div className="flex items-center gap-2">
                                                         <Clock className="w-3.5 h-3.5 text-slate-300"/>
                                                         <span className="text-[10px] font-black text-slate-400">{task.duracaohoras || 2}h</span>
                                                     </div>
                                                     <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors"/>
                                                 </div>
                                             </div>
                                         ))}
                                         {pillarTasks.length === 0 && (
                                             <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
                                                 <ListTodo className="w-12 h-12 text-slate-200 dark:text-white/5 mx-auto mb-4"/>
                                                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum ativo alocado neste pilar ainda.</p>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft animate-in fade-in duration-700">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeto</th>
                                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Esforço Real (h)</th>
                                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Custo ABC Real</th>
                                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Receita Mensal</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Margem de Lucro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                    {stats.projectMetrics.map(proj => (
                                        <tr key={proj.id} onClick={() => setSelectedProjectId(proj.id)} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase group-hover:text-amber-500 transition-colors">{proj.name}</span>
                                                    <span className={`text-[8px] font-bold uppercase mt-1 ${proj.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`}>{proj.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center"><span className="text-sm font-black text-slate-700 dark:text-slate-300">{proj.hours}h</span></td>
                                            <td className="px-4 py-6 text-center text-xs font-bold text-rose-500">{formatCurrency(proj.cost)}</td>
                                            <td className="px-4 py-6 text-center text-xs font-bold text-emerald-500">{formatCurrency(proj.expectedMonthlyRev)}</td>
                                            <td className="px-8 py-6 text-right">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${proj.margin >= 40 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : proj.margin > 0 ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {proj.margin.toFixed(1)}% {proj.profit > 0 ? 'ROI' : 'LOS'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                     <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft animate-in fade-in duration-700">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilar Shinkō</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Horas</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ativo (WIP)</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">A Faturar (Done)</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Futuro (Backlog)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {stats.categoryMetrics.map(item => (
                                    <tr key={item.category} onClick={() => setSelectedPillar(item.category === selectedPillar ? null : item.category)} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[item.category].split(' ')[0]}`}></div>
                                                <span className={`text-xs font-black uppercase transition-colors ${selectedPillar === item.category ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center"><span className="text-sm font-black text-slate-700 dark:text-slate-300">{item.hours}h</span></td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-rose-500">{formatCurrency(item.activeCost)}</td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-emerald-500">{formatCurrency(item.billedProfit)}</td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-violet-500">{formatCurrency(item.futureProfit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Drill-down de Tarefas do Pilar na aba Profitability */}
                    {selectedPillar && (
                         <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                             <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
                                 <div className="flex items-center gap-4">
                                     <div className={`w-3 h-10 rounded-full ${CATEGORY_STYLES[selectedPillar].split(' ')[0]}`}></div>
                                     <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Processos de {selectedPillar}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Auditória em Tempo Real</p>
                                     </div>
                                 </div>
                                 <span className="text-xs font-black px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500">{pillarTasks.length} processos encontrados</span>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 {pillarTasks.map(task => (
                                     <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[1.8rem] p-6 hover:shadow-xl hover:border-amber-500/30 transition-all cursor-pointer group">
                                         <div className="flex justify-between items-start mb-4">
                                             <span className="text-[8px] font-black uppercase text-slate-400">{task.projetoData?.nome || 'Ad-hoc'}</span>
                                             <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500'}`}>{task.status}</div>
                                         </div>
                                         <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed mb-6 group-hover:text-amber-500 transition-colors line-clamp-2">{task.titulo}</h4>
                                         <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                             <div className="flex items-center gap-2">
                                                 <Clock className="w-3.5 h-3.5 text-slate-300"/>
                                                 <span className="text-[10px] font-black text-slate-400">{task.duracaohoras || 2}h</span>
                                             </div>
                                             <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors"/>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                </div>
            )}

            {selectedTask && (
                <TaskDetailModal 
                    task={convertDbTaskToBpmn(selectedTask)}
                    nodeTitle={selectedTask.category || 'Processo'}
                    opportunityTitle={selectedTask.projetoData?.nome}
                    organizationId={organizationId}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, 
                            status: updated.status, 
                            category: updated.category,
                            responsavel: updated.assigneeId,
                            datafim: updated.dueDate,
                            duracaohoras: updated.estimatedHours,
                            descricao: updated.description
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
