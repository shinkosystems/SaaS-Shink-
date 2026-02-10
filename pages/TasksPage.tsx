
import React, { useState, useEffect, useMemo } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { GanttView } from '../components/GanttView';
import { CalendarView } from '../components/CalendarView';
import { WorkloadView } from '../components/WorkloadView';
import { Opportunity, DbTask } from '../types';
import { 
    Trello, GanttChartSquare, Calendar as CalendarIcon, Users as UsersIcon, 
    Filter, Search, X, ChevronDown, Zap, Loader2, Briefcase, Activity, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { fetchAllTasks, fetchOrgMembers, fetchProjects, updateTask } from '../services/projectService';
import { optimizeSchedule } from '../services/geminiService';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    userRole: string;
    organizationId?: number;
    initialSubView?: 'kanban' | 'gantt' | 'calendar' | 'workload';
}

const STATUS_OPTIONS = [
    { value: 'todo', label: 'BACKLOG' },
    { value: 'doing', label: 'EXECUÇÃO' },
    { value: 'review', label: 'REVISÃO' },
    { value: 'approval', label: 'APROVAÇÃO' },
    { value: 'done', label: 'CONCLUÍDO' }
];

export const TasksPage: React.FC<Props> = ({ opportunities, onOpenProject, userRole, organizationId, initialSubView = 'kanban' }) => {
    const [subView, setSubView] = useState<'kanban' | 'gantt' | 'calendar' | 'workload'>(initialSubView);
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [members, setMembers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        if (organizationId) {
            fetchOrgMembers(organizationId).then(setMembers);
            fetchProjects(organizationId).then(setProjects);
        }
    }, [organizationId]);

    const loadData = async () => {
        setLoading(true);
        const allTasks = await fetchAllTasks(organizationId);
        setTasks(allTasks);
        setLoading(false);
    };

    const handleGlobalOptimize = async () => {
        if (!organizationId || isOptimizing) return;
        const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'approval');
        if (pendingTasks.length === 0) return;
        if (!confirm(`O Shinkō Engine analisará ${pendingTasks.length} tarefas. Deseja prosseguir?`)) return;

        setIsOptimizing(true);
        try {
            const taskPayload = pendingTasks.map(t => ({ id: String(t.id), h: t.duracaohoras || 2, uId: t.responsavel }));
            const memberPayload = members.map(m => ({ id: String(m.id), h: 8 }));
            const optimized = await optimizeSchedule(taskPayload, memberPayload);
            
            if (optimized && Array.isArray(optimized)) {
                await Promise.all(optimized.map(async (item) => {
                    if (!item.id) return;
                    await updateTask(Number(item.id), { datainicio: item.startDate, datafim: item.dueDate, responsavel: item.assigneeId });
                }));
                alert(`Pipeline Sincronizado!`);
                await loadData();
            }
        } catch (e: any) {
            alert("Falha técnica no Motor: " + (e.message || "Erro desconhecido"));
        } finally {
            setIsOptimizing(false);
        }
    };

    const filteredTasks = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return tasks.filter(t => {
            const matchesSearch = t.titulo.toLowerCase().includes(searchLower) || (t.descricao && t.descricao.toLowerCase().includes(searchLower));
            const matchesProject = !filterProject || t.projeto?.toString() === filterProject;
            const matchesStatus = !filterStatus || t.status === filterStatus;
            return matchesSearch && matchesProject && matchesStatus;
        });
    }, [tasks, searchTerm, filterProject, filterStatus]);

    const VIEWS = [
        { id: 'kanban', label: 'Kanban', icon: Trello },
        { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
        { id: 'calendar', label: 'Calendário', icon: CalendarIcon },
        { id: 'workload', label: 'Carga', icon: UsersIcon }
    ];

    return (
        <div className="flex flex-col bg-[#F9FAFB] dark:bg-[#020203] pb-32">
            {/* HEADER RELATIVO - ELE SOBE COM O SCROLL DA PÁGINA */}
            <header className="relative p-8 md:px-12 bg-white dark:bg-[#0A0A0C] border-b border-slate-200 dark:border-white/5 space-y-8 shrink-0 z-30 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                            <Activity className="w-3 h-3 text-amber-600"/>
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Pipeline Engine v2.6</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                            Central de <span className="text-amber-500">Operações</span>.
                        </h1>
                    </div>

                    {/* SEGMENTED CONTROL NATIVO */}
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl shadow-inner border border-slate-200/50 dark:border-white/10 relative w-full lg:w-auto">
                        <div 
                            className="absolute top-1 bottom-1 bg-white dark:bg-white/10 rounded-xl shadow-lg transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            style={{ 
                                left: `${(VIEWS.findIndex(v => v.id === subView) * (100 / VIEWS.length))}%`,
                                marginLeft: '4px',
                                width: `calc(${100 / VIEWS.length}% - 8px)`
                            }}
                        />
                        {VIEWS.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setSubView(tab.id as any)}
                                className={`relative z-10 flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === tab.id ? 'text-amber-500' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <tab.icon className="w-3.5 h-3.5"/> <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* FILTROS INTEGRADOS */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300 dark:text-slate-600"/>
                        <input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar ativo por ID ou título..."
                            className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 transition-all text-slate-900 dark:text-white shadow-inner"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${showAdvancedFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4"/>
                        </button>

                        <button 
                            onClick={handleGlobalOptimize}
                            disabled={isOptimizing}
                            className="flex-1 md:flex-none px-8 py-4 bg-[#0a0a0c] dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-amber-500"/>}
                            <span>IA Smart Engine</span>
                        </button>
                    </div>
                </div>

                {showAdvancedFilters && (
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Projeto Alvo</label>
                            <select 
                                value={filterProject} 
                                onChange={e => setFilterProject(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none dark:text-white"
                            >
                                <option value="">Todos os Projetos</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estágio de Fluxo</label>
                            <select 
                                value={filterStatus} 
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none dark:text-white"
                            >
                                <option value="">Todos os Estágios</option>
                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex-1">
                {loading ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-6 text-slate-300">
                        <div className="w-12 h-12 relative">
                            <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Pipeline</span>
                    </div>
                ) : (
                    <div className="w-full">
                        {subView === 'kanban' && <KanbanBoard tasks={filteredTasks} onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={organizationId} onRefresh={loadData} />}
                        {subView === 'gantt' && <div className="h-auto min-h-[600px]"><GanttView tasks={filteredTasks} opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={loadData} organizationId={organizationId} /></div>}
                        {subView === 'calendar' && <div className="h-auto min-h-[600px]"><CalendarView tasks={filteredTasks} opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={loadData} organizationId={organizationId} /></div>}
                        {subView === 'workload' && <WorkloadView tasks={filteredTasks} members={members} organizationId={organizationId} />}
                    </div>
                )}
            </div>
        </div>
    );
};
