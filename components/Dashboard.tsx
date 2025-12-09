
import React, { useState, useEffect } from 'react';
import { Opportunity, ProjectStatus } from '../types';
import { 
    Activity, Clock, Calendar, Zap, CheckCircle2, ArrowRight, TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, Briefcase, Filter
} from 'lucide-react';
import { deleteTask } from '../services/projectService';
import { fetchCrmOpportunities } from '../services/crmService';
import TaskDetailModal from './TaskDetailModal';
import MatrixChart from './MatrixChart';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';

interface Props {
  opportunities: Opportunity[];
  onNavigate: (status: ProjectStatus | 'All') => void;
  onOpenProject: (opp: Opportunity) => void;
  user: any;
  theme: 'dark' | 'light';
  userRole?: string;
  whitelabel?: boolean;
  onActivateWhitelabel?: () => void;
  organizationId?: number;
  appBrandName?: string;
  activeModules?: string[];
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, userRole, whitelabel, onActivateWhitelabel, appBrandName, activeModules, organizationId
}) => {
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [crmStats, setCrmStats] = useState({ totalValue: 0, wonCount: 0, avgTicket: 0, conversionRate: 0 });
    const [funnelData, setFunnelData] = useState<{name: string, value: number, fill: string, rate: string}[]>([]);
    
    const brand = appBrandName || 'Shinkō';
    const modules = activeModules || [];

    // Stats Project
    const totalOpps = opportunities.length;
    const activeOpps = opportunities.filter(o => o.status === 'Active').length;
    const negotiationOpps = opportunities.filter(o => o.status === 'Negotiation').length;
    const futureOpps = opportunities.filter(o => o.status === 'Future').length;

    // Load CRM Stats
    useEffect(() => {
        const loadCrm = async () => {
            if (modules.includes('crm') && organizationId) {
                const deals = await fetchCrmOpportunities(organizationId);
                
                // Basic Stats
                const totalValue = deals.reduce((acc, d) => acc + d.value, 0);
                const wonDeals = deals.filter(d => d.stage === 'won');
                const wonCount = wonDeals.length;
                const avgTicket = wonCount > 0 ? wonDeals.reduce((acc, d) => acc + d.value, 0) / wonCount : 0;
                const conversionRate = deals.length > 0 ? (wonCount / deals.length) * 100 : 0;

                setCrmStats({ totalValue, wonCount, avgTicket, conversionRate });

                // Funnel Calculation (Cumulative)
                const countWon = wonCount;
                const countNeg = deals.filter(d => ['negotiation', 'won'].includes(d.stage)).length;
                const countProp = deals.filter(d => ['proposal', 'negotiation', 'won'].includes(d.stage)).length;
                const countQual = deals.length; // All deals start at qualification

                // Percentage Calculator (relative to total leads/qualification)
                const getRate = (val: number) => countQual > 0 ? ((val / countQual) * 100).toFixed(0) : '0';

                setFunnelData([
                    { name: 'Qualificação', value: countQual, fill: '#60a5fa', rate: '100%' }, // Blue 400
                    { name: 'Proposta', value: countProp, fill: '#facc15', rate: `${getRate(countProp)}%` },     // Yellow 400
                    { name: 'Negociação', value: countNeg, fill: '#fb923c', rate: `${getRate(countNeg)}%` },    // Orange 400
                    { name: 'Fechado', value: countWon, fill: '#10b981', rate: `${getRate(countWon)}%` }        // Emerald 500
                ]);
            }
        };
        loadCrm();
    }, [modules, organizationId]);

    // Derive active tasks from projects
    const allTasks = opportunities.flatMap(o => 
        o.bpmn?.nodes.flatMap(n => n.checklist?.map(t => ({...t, projectTitle: o.title, oppId: o.id})) || []) || []
    ).filter(t => !t.completed).slice(0, 5);

    const refreshTasks = () => {
        // Callback to refresh tasks if needed
    };

    const handleDeleteTask = async (id: number) => {
        if(window.confirm("Confirmar exclusão?")) {
            await deleteTask(id);
            refreshTasks();
            setSelectedTask(null);
        }
    };

    const CustomFunnelTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 text-white text-xs p-3 rounded-lg border border-white/10 shadow-xl min-w-[140px]">
                    <p className="font-bold text-sm mb-2 pb-2 border-b border-white/10">{data.name}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Volume:</span>
                            <span className="font-mono font-bold">{data.value}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-400">
                            <span>Conversão:</span>
                            <span className="font-bold">{data.rate}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom Label to show Name + Percentage
    const renderCustomLabel = (props: any) => {
        const { x, y, width, height, name, rate } = props;
        return (
            <text x={x + 5} y={y + height / 2 + 4} fill="#94a3b8" textAnchor="start" fontSize={11} fontWeight="600">
                {name} <tspan fill="#10b981" fontSize={10}>({rate})</tspan>
            </text>
        );
    };

    return (
        <div className="max-w-[1920px] mx-auto animate-in fade-in duration-500 h-full flex flex-col p-1">
            
            {/* Header & Stats */}
            <div className="space-y-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Olá, {user.user_metadata?.full_name?.split(' ')[0] || 'Gestor'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Aqui está o panorama do {brand} hoje.
                        </p>
                    </div>
                    {userRole === 'dono' && whitelabel && (
                        <button 
                            onClick={onActivateWhitelabel}
                            className="text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 shadow-md"
                        >
                            <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300"/> Configurar White Label
                        </button>
                    )}
                </div>

                <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div onClick={() => onNavigate('Active')} className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform"><Activity className="w-5 h-5"/></div>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeOpps}</span>
                        </div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">Sprint Ativo</div>
                        <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Projetos em execução</div>
                    </div>
                    <div onClick={() => onNavigate('Negotiation')} className="glass-panel p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform"><Clock className="w-5 h-5"/></div>
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{negotiationOpps}</span>
                        </div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">Em Negociação</div>
                        <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Aguardando aprovação</div>
                    </div>
                    <div onClick={() => onNavigate('Future')} className="glass-panel p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500 group-hover:scale-110 transition-transform"><Calendar className="w-5 h-5"/></div>
                            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{futureOpps}</span>
                        </div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">Backlog Futuro</div>
                        <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70">Oportunidades mapeadas</div>
                    </div>
                    <div onClick={() => onNavigate('All')} className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/70 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none"></div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Total Projetos</span>
                        <span className="text-4xl font-black text-slate-900 dark:text-white mt-1">{totalOpps}</span>
                    </div>
                </div>
            </div>

            {/* CRM Metrics Widget - ONLY IF CRM MODULE ACTIVE */}
            {modules.includes('crm') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-in slide-in-from-bottom-4">
                    
                    {/* Cards Column */}
                    <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-white/10 bg-white/40 dark:bg-slate-900/40">
                        <div className="flex items-center gap-2 mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500"/> Indicadores de Vendas (CRM)
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <DollarSign className="w-6 h-6"/>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                        R$ {crmStats.totalValue.toLocaleString('pt-BR', { notation: 'compact' })}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Valor em Pipeline</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Users className="w-6 h-6"/>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                        {crmStats.wonCount}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Negócios Fechados</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                                    <Target className="w-6 h-6"/>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                        {crmStats.conversionRate.toFixed(1)}%
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Taxa Conversão</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                                    <Briefcase className="w-6 h-6"/>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                        R$ {crmStats.avgTicket.toLocaleString('pt-BR', { notation: 'compact' })}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Ticket Médio (Ganho)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Funnel Chart Column */}
                    <div className="lg:col-span-1 glass-panel p-5 rounded-xl border border-white/10 bg-white/40 dark:bg-slate-900/40 flex flex-col">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Filter className="w-4 h-4 text-blue-500"/> Funil de Conversão
                        </h3>
                        <div className="flex-1 min-h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <FunnelChart>
                                    <Tooltip content={<CustomFunnelTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Funnel
                                        dataKey="value"
                                        data={funnelData}
                                        isAnimationActive
                                    >
                                        <LabelList position="right" content={renderCustomLabel} />
                                        {/* Render Cells explicitly for colors */}
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* DORA Metrics Widget - ONLY IF ENGINEERING MODULE ACTIVE */}
            {modules.includes('engineering') && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                    <div className="lg:col-span-4 glass-panel p-4 rounded-xl border border-white/10 bg-white/40 dark:bg-slate-900/40">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500"/> Métricas DORA (Engenharia)
                            </h3>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">Últimos 30 dias</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Freq. Deploy', val: 'High', trend: 'up', color: 'text-emerald-500' },
                                { label: 'Lead Time', val: '3.2d', trend: 'down', color: 'text-emerald-500' }, // Down is good for Lead Time
                                { label: 'Falhas (CFR)', val: '2.1%', trend: 'up', color: 'text-red-500' }, // Up is bad for failures
                                { label: 'MTTR', val: '4h', trend: 'stable', color: 'text-blue-500' }
                            ].map((m, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-opacity-10 ${m.color.replace('text-', 'bg-')}`}>
                                        {m.trend === 'up' ? <TrendingUp className={`w-4 h-4 ${m.color}`}/> : m.trend === 'down' ? <TrendingDown className={`w-4 h-4 ${m.color}`}/> : <Minus className={`w-4 h-4 ${m.color}`}/>}
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{m.val}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">{m.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Matrix & Tasks Split */}
            <div className="flex-1 min-h-[400px] grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Matrix Chart - CORE FEATURE, ALWAYS VISIBLE IF PROJECTS ACTIVE */}
                {modules.includes('projects') && (
                    <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col">
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                )}

                {/* Quick Tasks List - CORE FEATURE, ALWAYS VISIBLE IF KANBAN ACTIVE */}
                {modules.includes('kanban') && (
                    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-slate-400"/> Tarefas Pendentes
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {allTasks.length === 0 && (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Nenhuma tarefa urgente.
                                </div>
                            )}
                            {allTasks.map((task: any, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedTask(task)}
                                    className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer group transition-all"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[150px]">
                                            {task.projectTitle}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${task.status === 'doing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                        {task.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => onNavigate('Active')}
                            className="mt-4 w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors flex items-center justify-center gap-2"
                        >
                            Ver Kanban Completo <ArrowRight className="w-3 h-3"/>
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedTask && (
                <TaskDetailModal 
                    task={{
                        id: selectedTask.id?.toString() || 'temp',
                        text: selectedTask.text,
                        description: selectedTask.description,
                        status: selectedTask.status as any,
                        completed: selectedTask.completed || selectedTask.status === 'done',
                        assignee: selectedTask.assignee,
                        assigneeId: selectedTask.assigneeId,
                        startDate: selectedTask.startDate,
                        dueDate: selectedTask.dueDate,
                        estimatedHours: selectedTask.estimatedHours,
                        gut: selectedTask.gut,
                        assigneeIsDev: selectedTask.assigneeIsDev
                    }}
                    nodeTitle={selectedTask.projectTitle || 'Tarefa'}
                    opportunityTitle={selectedTask.projectTitle}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updatedTask) => {
                        refreshTasks();
                    }}
                    onDelete={(id) => handleDeleteTask(Number(id))}
                />
            )}
        </div>
    );
};
