
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
    Calendar, ChevronLeft, Users, Filter, ArrowRight, TrendingDown, Hourglass, Receipt, Coins, Loader2
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
    const [rates, setRates] = useState<any>(null);
    
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [viewDate, setViewDate] = useState(new Date());

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

        const hourlyRate = rates?.totalRate || 0;

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
            const expectedMonthlyRev = (proj.receita_total || 0) / (proj.prazo_meses || 12);
            
            const projProfit = expectedMonthlyRev - projCost;
            const projMargin = expectedMonthlyRev > 0 ? (projProfit / expectedMonthlyRev) * 100 : 0;

            return {
                id: proj.id,
                name: proj.nome,
                hours: projHours,
                cost: projCost,
                expectedMonthlyRev,
                profit: projProfit,
                margin: projMargin,
                status: proj.projoport ? 'Future' : 'Active'
            };
        }).sort((a, b) => b.cost - a.cost);

        const technicalMargin = totalRevenue > 0 ? ((totalRevenue - totalOutflow) / totalRevenue) * 100 : 0;

        return { 
            totalRevenue, totalOutflow, totalKanbanHours,
            technicalMargin, categoryMetrics, projectMetrics,
            globalFutureProfit, globalBilledProfit, globalActiveCost,
            label: start.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', day: timeRange === 'day' ? '2-digit' : undefined }).toUpperCase()
        };
    }, [kanbanTasks, transactions, viewDate, timeRange, rates, projects]);

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
                        <button onClick={() => setActiveTab('processes')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'processes' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Processos</button>
                        <button onClick={() => setActiveTab('projects')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'projects' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Projetos</button>
                        <button onClick={() => setActiveTab('profitability')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profitability' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Pillars</button>
                    </div>
                </div>
            </header>

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
                                    <span className="text-[10px] font-bold text-slate-400">{cat.tasks.length} processos ativos</span>
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
                </div>
            ) : activeTab === 'projects' ? (
                <div className="space-y-6 pb-24">
                     <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft">
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
                                    <tr key={proj.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{proj.name}</span>
                                                <span className={`text-[8px] font-bold uppercase mt-1 ${proj.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`}>{proj.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center"><span className="text-sm font-black text-slate-700 dark:text-slate-300">{proj.hours}h</span></td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-rose-500">{formatCurrency(proj.cost)}</td>
                                        <td className="px-4 py-6 text-center text-xs font-bold text-emerald-500">{formatCurrency(proj.expectedMonthlyRev)}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${proj.margin >= 40 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : proj.margin > 0 ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {proj.margin.toFixed(1)}% {proj.profit > 0 ? 'ROI' : 'LOS'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                     <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft">
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
                                    <tr key={item.category} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[item.category].split(' ')[0]}`}></div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{item.category}</span>
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
