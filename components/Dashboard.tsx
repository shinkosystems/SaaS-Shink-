
import React, { useState, useEffect } from 'react';
import { Opportunity, ProjectStatus } from '../types';
import { 
    Activity, Clock, Calendar, Zap, CheckCircle2, ArrowRight, TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, Briefcase, Filter
} from 'lucide-react';
import { deleteTask } from '../services/projectService';
import { fetchCrmOpportunities } from '../services/crmService';
import { TaskDetailModal } from './TaskDetailModal';
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
                
                const totalValue = deals.reduce((acc, d) => acc + d.value, 0);
                const wonDeals = deals.filter(d => d.stage === 'won');
                const wonCount = wonDeals.length;
                const avgTicket = wonCount > 0 ? wonDeals.reduce((acc, d) => acc + d.value, 0) / wonCount : 0;
                const conversionRate = deals.length > 0 ? (wonCount / deals.length) * 100 : 0;

                setCrmStats({ totalValue, wonCount, avgTicket, conversionRate });

                const countWon = wonCount;
                const countNeg = deals.filter(d => ['negotiation', 'won'].includes(d.stage)).length;
                const countProp = deals.filter(d => ['proposal', 'negotiation', 'won'].includes(d.stage)).length;
                const countQual = deals.length; 

                const getRate = (val: number) => countQual > 0 ? ((val / countQual) * 100).toFixed(0) : '0';

                setFunnelData([
                    { name: 'Qualificação', value: countQual, fill: '#60a5fa', rate: '100%' }, 
                    { name: 'Proposta', value: countProp, fill: '#facc15', rate: `${getRate(countProp)}%` },     
                    { name: 'Negociação', value: countNeg, fill: '#fb923c', rate: `${getRate(countNeg)}%` },    
                    { name: 'Fechado', value: countWon, fill: '#10b981', rate: `${getRate(countWon)}%` }        
                ]);
            }
        };
        loadCrm();
    }, [modules, organizationId]);

    const allTasks = opportunities.flatMap(o => 
        o.bpmn?.nodes.flatMap(n => n.checklist?.map(t => ({...t, projectTitle: o.title, oppId: o.id})) || []) || []
    ).filter(t => !t.completed).slice(0, 5);

    const refreshTasks = () => {};

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

    const renderCustomLabel = (props: any) => {
        const { x, y, width, height, name, rate } = props;
        return (
            <text x={x + 5} y={y + height / 2 + 4} fill="#94a3b8" textAnchor="start" fontSize={11} fontWeight="600">
                {name} <tspan fill="#10b981" fontSize={10}>({rate})</tspan>
            </text>
        );
    };

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'Gestor';

    return (
        <div className="max-w-[1920px] mx-auto animate-in fade-in duration-500 h-full flex flex-col p-2">
            
            {/* Minimal Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    Bom dia, {firstName}.
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Visão geral do sistema.
                </p>
            </div>

            {/* KPI Cards - Minimal Design */}
            <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div onClick={() => onNavigate('Active')} className="bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all border border-slate-100 dark:border-white/5 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Execução</span>
                            <div className="text-4xl font-light text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-emerald-500 transition-colors">
                                {activeOpps}
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-emerald-500 transition-colors">
                            <Activity className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                <div onClick={() => onNavigate('Negotiation')} className="bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all border border-slate-100 dark:border-white/5 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Negociação</span>
                            <div className="text-4xl font-light text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-blue-500 transition-colors">
                                {negotiationOpps}
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Clock className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                <div onClick={() => onNavigate('Future')} className="bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all border border-slate-100 dark:border-white/5 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Backlog</span>
                            <div className="text-4xl font-light text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-amber-500 transition-colors">
                                {futureOpps}
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-amber-500 transition-colors">
                            <Calendar className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                <div onClick={() => onNavigate('All')} className="bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all border border-slate-100 dark:border-white/5 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent dark:from-white/5 dark:to-transparent opacity-50"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Projetos</span>
                            <div className="text-4xl font-light text-slate-900 dark:text-white mt-2 tracking-tight">
                                {totalOpps}
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400">
                            <Briefcase className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Matrix & Tasks Split */}
            <div className="flex-1 min-h-[400px] grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Matrix Chart - CORE FEATURE */}
                {modules.includes('projects') && (
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                )}

                {/* Quick Tasks List - CORE FEATURE */}
                {modules.includes('kanban') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-sm flex flex-col">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-slate-400"/> Tarefas Prioritárias
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {allTasks.length === 0 && (
                                <div className="text-center py-12 text-slate-400 text-sm italic">
                                    Tudo em dia por aqui.
                                </div>
                            )}
                            {allTasks.map((task: any, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedTask(task)}
                                    className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer group transition-colors border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[150px]">
                                            {task.projectTitle}
                                        </span>
                                        <span className={`w-2 h-2 rounded-full ${task.status === 'doing' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                        {task.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => onNavigate('Active')}
                            className="mt-6 w-full py-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors flex items-center justify-center gap-2"
                        >
                            Ver Quadro Completo <ArrowRight className="w-3 h-3"/>
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