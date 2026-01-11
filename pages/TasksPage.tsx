
import React, { useState, useEffect, useMemo } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { GanttView } from '../components/GanttView';
import { CalendarView } from '../components/CalendarView';
import { WorkloadView } from '../components/WorkloadView';
import { Opportunity, DbTask } from '../types';
import { 
    Trello, GanttChartSquare, Calendar as CalendarIcon, Users as UsersIcon, 
    Filter, Search, X, ChevronDown, ListTodo, PlayCircle, CheckCircle2, 
    ClipboardCheck, Archive, Target, Calendar, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { fetchAllTasks, fetchOrgMembers, fetchProjects } from '../services/projectService';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    userRole: string;
    organizationId?: number;
    initialSubView?: 'kanban' | 'gantt' | 'calendar' | 'workload';
    tasksVersion?: number;
}

export const TasksPage: React.FC<Props> = ({ opportunities, onOpenProject, userRole, organizationId, initialSubView = 'kanban', tasksVersion = 0 }) => {
    const [subView, setSubView] = useState<'kanban' | 'gantt' | 'calendar' | 'workload'>(initialSubView as any);
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros Globais
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTime, setFilterTime] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [viewDate, setViewDate] = useState(new Date());
    const [filterProject, setFilterProject] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [minGut, setMinGut] = useState(0);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Metadados
    const [members, setMembers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        if (organizationId) {
            fetchOrgMembers(organizationId).then(setMembers);
            fetchProjects(organizationId).then(setProjects);
        }
    }, [organizationId, tasksVersion]); // Adicionado tasksVersion como dependência

    const loadData = async () => {
        setLoading(true);
        const allTasks = await fetchAllTasks(organizationId);
        setTasks(allTasks);
        setLoading(false);
    };

    const periodLabel = useMemo(() => {
        const d = viewDate;
        if (filterTime === 'day') {
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
        }
        if (filterTime === 'week') {
            const first = new Date(d);
            first.setDate(d.getDate() - d.getDay());
            const last = new Date(first);
            last.setDate(first.getDate() + 6);
            return `${first.getDate()} ${first.toLocaleDateString('pt-BR', { month: 'short' })} - ${last.getDate()} ${last.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`.toUpperCase();
        }
        if (filterTime === 'month') {
            return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        }
        if (filterTime === 'year') {
            return d.getFullYear().toString();
        }
        return "PERÍODO PERSONALIZADO";
    }, [viewDate, filterTime]);

    const handleNavigate = (dir: 'prev' | 'next') => {
        const next = new Date(viewDate);
        const mod = dir === 'next' ? 1 : -1;
        if (filterTime === 'day') next.setDate(next.getDate() + mod);
        else if (filterTime === 'week') next.setDate(next.getDate() + (mod * 7));
        else if (filterTime === 'month') next.setMonth(next.getMonth() + mod);
        else if (filterTime === 'year') next.setFullYear(next.getFullYear() + mod);
        setViewDate(next);
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesProject = !filterProject || t.projeto?.toString() === filterProject;
            const matchesAssignee = !filterAssignee || t.responsavel === filterAssignee;
            const score = (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1);
            const matchesGut = score >= minGut;

            const taskDate = t.datafim ? new Date(t.datafim) : (t.dataproposta ? new Date(t.dataproposta) : null);
            if (!taskDate) return matchesSearch && matchesProject && matchesAssignee && matchesGut;

            let start = new Date(viewDate);
            let end = new Date(viewDate);

            if (filterTime === 'day') {
                start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            } else if (filterTime === 'week') {
                start.setDate(viewDate.getDate() - viewDate.getDay());
                start.setHours(0,0,0,0);
                end.setDate(start.getDate() + 6);
                end.setHours(23,59,59,999);
            } else if (filterTime === 'month') {
                start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
            } else if (filterTime === 'year') {
                start = new Date(viewDate.getFullYear(), 0, 1);
                end = new Date(viewDate.getFullYear(), 11, 31, 23, 59, 59);
            } else if (filterTime === 'custom' && customStartDate && customEndDate) {
                start = new Date(customStartDate);
                end = new Date(customEndDate);
            } else {
                return matchesSearch && matchesProject && matchesAssignee && matchesGut;
            }

            return matchesSearch && matchesProject && matchesAssignee && matchesGut && taskDate >= start && taskDate <= end;
        });
    }, [tasks, searchTerm, filterTime, viewDate, filterProject, filterAssignee, minGut, customStartDate, customEndDate]);

    const counts = useMemo(() => {
        const c = { todo: 0, doing: 0, review: 0, approval: 0, done: 0 };
        filteredTasks.forEach(t => {
            if (t.status in c) (c as any)[t.status]++;
        });
        return c;
    }, [filteredTasks]);

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
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/>
                        <input 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar ativo..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold focus:border-amber-500 transition-all"
                        />
                    </div>

                    <select value={filterTime} onChange={e => setFilterTime(e.target.value as any)} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:border-amber-500 transition-all">
                        <option value="day">Hoje</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                        <option value="year">Ano</option>
                        <option value="custom">Personalizado</option>
                    </select>

                    <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer max-w-[150px]">
                        <option value="">Todos Projetos</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>

                    <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer max-w-[150px]">
                        <option value="">Responsáveis</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>

                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <span className="text-[9px] font-black px-2 text-slate-400">GUT {minGut}</span>
                        <input type="range" min="0" max="125" step="5" value={minGut} onChange={e => setMinGut(parseInt(e.target.value))} className="w-24 h-1 bg-slate-300 rounded-full appearance-none cursor-pointer accent-amber-500"/>
                    </div>
                </div>
            </header>

            <div className="px-6 md:px-8 py-4 bg-slate-50 dark:bg-white/[0.01] flex gap-4 overflow-x-auto no-scrollbar shrink-0 border-b border-slate-200 dark:border-white/5">
                {[
                    { id: 'todo', label: 'Backlog', count: counts.todo, color: 'text-slate-400', bg: 'bg-slate-400/10', icon: ListTodo },
                    { id: 'doing', label: 'Execução', count: counts.doing, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: PlayCircle },
                    { id: 'review', label: 'Revisão', count: counts.review, countColor: 'text-purple-500', bg: 'bg-purple-500/10', icon: ClipboardCheck },
                    { id: 'approval', label: 'Aprovação', count: counts.approval, color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Target },
                    { id: 'done', label: 'Finalizado', count: counts.done, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 }
                ].map(stat => (
                    <div key={stat.id} className="min-w-[180px] p-4 bg-white dark:bg-[#0a0a0c] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color || stat.countColor}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">{stat.count}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* BARRA DE NAVEGAÇÃO DE PERÍODO */}
                {filterTime !== 'custom' && (
                    <div className="px-6 md:px-8 py-3 bg-white dark:bg-[#0a0a0c] border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                            <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-500"/></button>
                            <div className="px-6 flex flex-col items-center justify-center min-w-[200px]">
                                <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-widest">{periodLabel}</span>
                            </div>
                            <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-500"/></button>
                        </div>
                        
                        <button onClick={loadData} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
                             <Zap className="w-3.5 h-3.5"/> IA SMART SCHEDULE
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    {subView === 'kanban' && (
                        <KanbanBoard tasks={filteredTasks} onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={organizationId} onRefresh={loadData} />
                    )}
                    {subView === 'gantt' && (
                        <GanttView tasks={filteredTasks} opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={loadData} organizationId={organizationId} />
                    )}
                    {subView === 'calendar' && (
                        <CalendarView tasks={filteredTasks} opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={loadData} organizationId={organizationId} />
                    )}
                    {subView === 'workload' && (
                        <WorkloadView tasks={filteredTasks} members={members} organizationId={organizationId} />
                    )}
                </div>
            </div>
        </div>
    );
};
