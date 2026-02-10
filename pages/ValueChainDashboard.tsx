import React, { useState, useEffect, useMemo } from 'react';
import { fetchProjects, fetchAllTasks, updateTask, deleteTask } from '../services/projectService';
import { fetchTransactions, getOperationalRates } from '../services/financialService';
import { DbProject, FinancialTransaction, DbTask, BpmnTask } from '../types';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { 
    Layers, Zap, Target, DollarSign, PieChart as PieIcon, 
    ArrowRight, Hourglass, Receipt, Loader2, ChevronLeft, ChevronRight,
    Activity, Clock, Briefcase, Filter, ListTodo, MousePointer2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

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

const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#6366F1', '#EC4899'];

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

const DEFAULT_PROFIT_MARGIN = 0.35;

export const ValueChainDashboard: React.FC<Props> = ({ organizationId }) => {
    const [activeTab, setActiveTab] = useState<'processes' | 'projects' | 'profitability'>('processes');
    const [kanbanTasks, setKanbanTasks] = useState<DbTask[]>([]);
    const [projects, setProjects] = useState<DbProject[]>([]);
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
    const [rates, setRates] = useState<any>(null);
    
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        if (organizationId) loadData();
    }, [organizationId, timeRange, viewDate]);

    const loadData = async () => {
        setLoading(true);
        try {
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
        } finally {
            setLoading(false);
        }
    };

    // Fix: Add handleNavigate function to fix "Cannot find name 'handleNavigate'" errors
    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(viewDate);
        const mod = direction === 'next' ? 1 : -1;
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

        const periodTrans = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        const periodKanban = kanbanTasks.filter(t => {
            const d = new Date(t.datafim || t.dataproposta);
            return d >= start && d <= end;
        });

        const hourlyRate = rates?.totalRate || 85;
        let globalRevenue = periodTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
        let globalWipCost = 0;
        let globalBilledVal = 0;
        let globalFutureVal = 0;

        const categoryData = Object.keys(CATEGORY_STYLES).map((pillar, idx) => {
            const tasks = periodKanban.filter(t => KANBAN_TO_PILLAR[t.category || 'Gestão'] === pillar);
            const hours = tasks.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);
            const cost = hours * hourlyRate;
            const val = cost / (1 - DEFAULT_PROFIT_MARGIN);

            const billed = tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + ((t.duracaohoras || 2) * hourlyRate / (1 - DEFAULT_PROFIT_MARGIN)), 0);
            const wip = tasks.filter(t => ['doing', 'review', 'approval'].includes(t.status)).reduce((acc, t) => acc + ((t.duracaohoras || 2) * hourlyRate), 0);
            const future = tasks.filter(t => ['todo', 'backlog'].includes(t.status)).reduce((acc, t) => acc + ((t.duracaohoras || 2) * hourlyRate / (1 - DEFAULT_PROFIT_MARGIN)), 0);

            globalWipCost += wip;
            globalBilledVal += billed;
            globalFutureVal += future;

            return { name: pillar, value: cost, billed, wip, future, hours, color: CHART_COLORS[idx % CHART_COLORS.length] };
        }).filter(c => c.value > 0);

        return { globalRevenue, globalWipCost, globalBilledVal, globalFutureVal, categoryData, 
                label: start.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase() };
    }, [kanbanTasks, transactions, viewDate, timeRange, rates]);

    const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditando Fluxo Industrial</span>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-6 md:p-12 space-y-12 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent pb-40">
            
            {/* HEADER CORRIGIDO */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-50">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Fluxo de <span className="text-amber-500">Valor</span>.
                    </h1>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                        <Activity className="w-3 h-3"/> Engenharia de Lucratividade v2.6
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => handleNavigate('prev')} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all"><ChevronLeft className="w-4 h-4"/></button>
                        <span className="text-[10px] font-black uppercase text-amber-500 min-w-[100px] text-center flex items-center justify-center">{stats.label}</span>
                        <button onClick={() => handleNavigate('next')} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all"><ChevronRight className="w-4 h-4"/></button>
                    </div>
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        {['processes', 'profitability'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => setActiveTab(t as any)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t === 'processes' ? 'Processos' : 'Métricas'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-40">
                {[
                    { label: 'Receita Operacional', val: stats.globalRevenue, icon: DollarSign, color: 'text-emerald-500' },
                    { label: 'Custos Ativos (WIP)', val: stats.globalWipCost, icon: Zap, color: 'text-rose-500' },
                    { label: 'Valor a Faturar', val: stats.globalBilledVal, icon: Receipt, color: 'text-blue-500' },
                    { label: 'Valor em Backlog', val: stats.globalFutureVal, icon: Hourglass, color: 'text-violet-500' }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-xl transition-all group">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <kpi.icon className={`w-4 h-4 ${kpi.color}`}/> {kpi.label}
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:scale-105 origin-left transition-transform">{formatCurrency(kpi.val)}</div>
                    </div>
                ))}
            </div>

            {/* MAIN CHART SECTION - CORREÇÃO DE DESIGN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* DONUT CONTAINER */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col items-center">
                    <div className="w-full mb-10 text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Distribuição do Mix de Valor</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Custo ABC por Pilar Shinkō</p>
                    </div>

                    <div className="w-full h-[320px] md:h-[400px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    innerRadius="65%"
                                    outerRadius="90%"
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '15px' }}
                                    formatter={(v: any) => formatCurrency(Number(v))}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total ABC</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {formatCurrency(stats.categoryData.reduce((acc, c) => acc + c.value, 0))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* LEGEND / BREAKDOWN - CORREÇÃO DE SOBREPOSIÇÃO */}
                <div className="lg:col-span-5 space-y-4 h-full">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft h-full">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Composição Operacional</h4>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {stats.categoryData.map((item, idx) => (
                                <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{item.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{item.hours}h alocadas</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(item.value)}</div>
                                        <div className="text-[8px] font-black text-emerald-500 uppercase">ABC Cost</div>
                                    </div>
                                </div>
                            ))}
                            {stats.categoryData.length === 0 && (
                                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                                    <PieIcon className="w-10 h-10" />
                                    <p className="text-[10px] font-black uppercase">Sem dados no período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PROCESS LIST (Aba Processos) */}
            {activeTab === 'processes' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center gap-4 px-2">
                        <ListTodo className="w-5 h-5 text-amber-500"/>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Inventário de Ativos Técnicos</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {kanbanTasks.slice(0, 12).map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => setSelectedTask(task)}
                                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-xl hover:border-amber-500/40 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${CATEGORY_STYLES[KANBAN_TO_PILLAR[task.category || 'Gestão']] || ''}`}>
                                        {task.category}
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase">#{task.id}</span>
                                </div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2 h-10 group-hover:text-amber-500 transition-colors">{task.titulo}</h4>
                                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-slate-400"/>
                                        <span className="text-[10px] font-black text-slate-500">{task.duracaohoras || 2}h</span>
                                    </div>
                                    <MousePointer2 className="w-4 h-4 text-slate-200 group-hover:text-amber-500 transition-colors"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES */}
            {selectedTask && (
                <TaskDetailModal 
                    task={{
                        id: selectedTask.id.toString(), dbId: selectedTask.id, text: selectedTask.titulo,
                        description: selectedTask.descricao || '', status: selectedTask.status as any,
                        completed: selectedTask.status === 'done', assigneeId: selectedTask.responsavel,
                        dueDate: selectedTask.datafim, estimatedHours: selectedTask.duracaohoras
                    }}
                    nodeTitle={selectedTask.category || 'Processo'}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, status: updated.status, 
                            duracaohoras: updated.estimatedHours, datafim: updated.dueDate 
                        });
                        loadData();
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
};
