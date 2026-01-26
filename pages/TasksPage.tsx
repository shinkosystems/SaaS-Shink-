
import React, { useState, useEffect, useMemo } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { GanttView } from '../components/GanttView';
import { CalendarView } from '../components/CalendarView';
import { WorkloadView } from '../components/WorkloadView';
import { Opportunity, DbTask } from '../types';
import { 
    Trello, GanttChartSquare, Calendar as CalendarIcon, Users as UsersIcon, 
    Filter, Search, X, ChevronDown, ListTodo, PlayCircle, CheckCircle2, 
    ClipboardCheck, Archive, Target, Zap, Loader2, Briefcase, Activity
} from 'lucide-react';
import { fetchAllTasks, fetchOrgMembers, fetchProjects, updateTask } from '../services/projectService';
import { optimizeSchedule } from '../services/geminiService';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    userRole: string;
    organizationId?: number;
    initialSubView?: 'kanban' | 'gantt' | 'calendar' | 'workload';
    tasksVersion?: number;
}

const STATUS_OPTIONS = [
    { value: 'todo', label: 'BACKLOG' },
    { value: 'doing', label: 'EM EXECUÇÃO' },
    { value: 'review', label: 'REVISÃO' },
    { value: 'approval', label: 'APROVAÇÃO' },
    { value: 'done', label: 'CONCLUÍDO' }
];

export const TasksPage: React.FC<Props> = ({ opportunities, onOpenProject, userRole, organizationId, initialSubView = 'kanban', tasksVersion = 0 }) => {
    const [subView, setSubView] = useState<'kanban' | 'gantt' | 'calendar' | 'workload'>(initialSubView as any);
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTime, setFilterTime] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [viewDate, setViewDate] = useState(new Date());
    const [filterProject, setFilterProject] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [minGut, setMinGut] = useState(0);

    const [members, setMembers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        if (organizationId) {
            fetchOrgMembers(organizationId).then(setMembers);
            fetchProjects(organizationId).then(setProjects);
        }
    }, [organizationId, tasksVersion]);

    const loadData = async () => {
        setLoading(true);
        const allTasks = await fetchAllTasks(organizationId);
        setTasks(allTasks);
        setLoading(false);
    };

    const handleGlobalOptimize = async () => {
        if (!organizationId || isOptimizing) return;
        
        // Selecionar apenas tarefas que não estão prontas
        const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'approval');
        
        if (pendingTasks.length === 0) {
            alert("Nenhuma tarefa pendente para otimizar.");
            return;
        }

        if (!confirm(`O Shinkō Engine analisará ${pendingTasks.length} tarefas. Este processo pode levar até 20 segundos devido ao volume de dados. Deseja prosseguir?`)) return;

        setIsOptimizing(true);
        try {
            // PAYLOAD ULTRA-LEVE: Apenas o necessário para matemática de alocação
            const taskPayload = pendingTasks.map(t => ({
                id: String(t.id),
                h: t.duracaohoras || 2,
                uId: t.responsavel
            }));

            const memberPayload = members.map(m => ({
                id: String(m.id),
                h: 8 // Capacidade fixa
            }));

            const optimized = await optimizeSchedule(taskPayload, memberPayload);
            
            if (optimized && Array.isArray(optimized) && optimized.length > 0) {
                let successCount = 0;
                
                await Promise.all(optimized.map(async (item) => {
                    if (!item.id) return;
                    
                    const res = await updateTask(Number(item.id), { 
                        datainicio: item.startDate, 
                        datafim: item.dueDate, 
                        responsavel: item.assigneeId 
                    });
                    
                    if (res) successCount++;
                }));
                
                alert(`Pipeline Sincronizado! ${successCount} tarefas foram realocadas no cronograma industrial.`);
                await loadData();
            } else {
                alert("A IA processou os dados mas recomendou manter o cronograma atual.");
            }
        } catch (e: any) {
            console.error("Erro no balanceamento IA:", e);
            alert("Falha técnica no Motor: " + (e.message || "Erro desconhecido"));
        } finally {
            setIsOptimizing(false);
        }
    };

    const filteredTasks = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return tasks.filter(t => {
            const matchesSearch = 
                t.titulo.toLowerCase().includes(searchLower) || 
                (t.descricao && t.descricao.toLowerCase().includes(searchLower)) || 
                t.id.toString().includes(searchTerm);
                
            const matchesProject = !filterProject || t.projeto?.toString() === filterProject;
            const matchesAssignee = !filterAssignee || t.responsavel === filterAssignee;
            const matchesStatus = !filterStatus || t.status === filterStatus;
            const score = (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1);
            
            return matchesSearch && matchesProject && matchesAssignee && matchesStatus && score >= minGut;
        });
    }, [tasks, searchTerm, filterProject, filterAssignee, filterStatus, minGut]);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-transparent overflow-hidden">
            <header className="p-6 md:p-8 bg-white dark:bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 space-y-6 shrink-0 z-20">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                            Central de <span className="text-amber-500">Operações</span>.
                        </h1>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Pipeline Shinkō Engine</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl shadow-inner border border-slate-200 dark:border-white/10">
                            {[
                                { id: 'kanban', label: 'Kanban', icon: Trello },
                                { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
                                { id: 'calendar', label: 'Calendário', icon: CalendarIcon },
                                { id: 'workload', label: 'Carga', icon: UsersIcon }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setSubView(tab.id as any)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === tab.id ? 'bg-white dark:bg-white/10 text-amber-500 shadow-md scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    <tab.icon className="w-3.5 h-3.5"/> {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        <button 
                            onClick={handleGlobalOptimize}
                            disabled={isOptimizing}
                            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
                            IA Smart Schedule
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1.5 rounded-xl min-w-[180px]">
                        <Briefcase className="w-4 h-4 text-slate-400 ml-2" />
                        <select 
                            value={filterProject} 
                            onChange={e => setFilterProject(e.target.value)} 
                            className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white flex-1 cursor-pointer"
                        >
                            <option value="">TODOS OS PROJETOS</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.nome.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1.5 rounded-xl min-w-[160px]">
                        <Activity className="w-4 h-4 text-slate-400 ml-2" />
                        <select 
                            value={filterStatus} 
                            onChange={e => setFilterStatus(e.target.value)} 
                            className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white flex-1 cursor-pointer"
                        >
                            <option value="">TODOS ESTÁGIOS</option>
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className="dark:bg-slate-900">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/>
                        <input 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por ID, título ou descrição..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-all"
                        />
                    </div>
                    
                    <select value={filterTime} onChange={e => setFilterTime(e.target.value as any)} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer">
                        <option value="day">Hoje</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                        <option value="year">Ano</option>
                    </select>

                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <span className="text-[9px] font-black px-2 text-slate-400">GUT {minGut}</span>
                        <input type="range" min="0" max="125" step="5" value={minGut} onChange={e => setMinGut(parseInt(e.target.value))} className="w-24 h-1 bg-slate-300 rounded-full appearance-none cursor-pointer accent-amber-500"/>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Workflow...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
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
