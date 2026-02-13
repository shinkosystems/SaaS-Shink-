
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
        <div className="flex flex-col bg-white dark:bg-[#020203] min-h-screen">
            {/* Nubank-Style Header */}
            <header className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-8 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Operações.</h2>
                        </div>
                        <button 
                            onClick={handleGlobalOptimize}
                            disabled={isOptimizing}
                            className="px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-amber-500"/>}
                            <span>IA Smart Engine</span>
                        </button>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                            Central de Execução Industrial
                        </h2>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Gestão de Pipeline e Alocação</p>
                    </div>

                    {/* Integrated Search and View Switcher Area */}
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar ativos ou IDs..."
                                className="w-full bg-white/10 border border-white/10 rounded-[1.5rem] p-4 pl-14 text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all"
                            />
                        </div>
                        <div className="flex bg-white/10 p-1 rounded-2xl border border-white/10 w-full md:w-auto">
                            {VIEWS.map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setSubView(tab.id as any)}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${subView === tab.id ? 'bg-white text-amber-500 shadow-lg' : 'text-white/60 hover:text-white'}`}
                                >
                                    <tab.icon className="w-3.5 h-3.5"/> <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-0">
                {loading ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-6 text-slate-300">
                        <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Pipeline</span>
                    </div>
                ) : (
                    <div className="w-full pb-40">
                        {subView === 'kanban' && <KanbanBoard tasks={filteredTasks} onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={organizationId} onRefresh={loadData} />}
                        {subView === 'gantt' && <GanttView tasks={filteredTasks} opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={loadData} organizationId={organizationId} />}
                        {subView === 'calendar' && <CalendarView tasks={filteredTasks} opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={loadData} organizationId={organizationId} />}
                        {subView === 'workload' && <WorkloadView tasks={filteredTasks} members={members} organizationId={organizationId} />}
                    </div>
                )}
            </div>
        </div>
    );
};
