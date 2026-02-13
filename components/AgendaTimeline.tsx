
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DbTask, TaskStatus, DbProject } from '../types';
import { 
    CalendarDays, Clock, ChevronLeft, 
    ChevronRight, AlertCircle, Sparkles,
    CheckCircle, Circle, Loader2, Filter,
    User, Target, Activity, Zap, X, Search,
    Calendar, ArrowLeft, Briefcase
} from 'lucide-react';
import { updateTask, fetchOrgMembers, deleteTask, fetchProjects } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';

interface Props {
  tasks: DbTask[];
  organizationId?: number;
  onRefresh?: () => void;
  currentUserId?: string;
}

const STATUS_OPTIONS = [
    { value: 'todo', label: 'Backlog' },
    { value: 'doing', label: 'Execução' },
    { value: 'review', label: 'Revisão' },
    { value: 'approval', label: 'Aprovação' },
    { value: 'done', label: 'Concluído' }
];

export const AgendaTimeline: React.FC<Props> = ({ tasks, organizationId, onRefresh, currentUserId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isUpdating, setIsUpdating] = useState<number | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [projects, setProjects] = useState<DbProject[]>([]);
    
    // Estados de Filtro - Inicializa filterResp com o usuário atual
    const [filterResp, setFilterResp] = useState(currentUserId || '');
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMinGut, setFilterMinGut] = useState(0);

    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (organizationId) {
            fetchOrgMembers(organizationId).then(setMembers);
            fetchProjects(organizationId).then(setProjects);
        }
    }, [organizationId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const dateStrip = useMemo(() => {
        const days = [];
        const base = new Date();
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(base.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesResp = !filterResp || t.responsavel === filterResp;
            const matchesProject = !filterProject || t.projeto?.toString() === filterProject;
            const matchesStatus = !filterStatus || t.status === filterStatus;
            const gut = (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1);
            const matchesGut = gut >= filterMinGut;
            return matchesResp && matchesProject && matchesStatus && matchesGut;
        });
    }, [tasks, filterResp, filterProject, filterStatus, filterMinGut]);

    const taskGroups = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue = filteredTasks.filter(t => {
            if (t.status === 'done' || t.sutarefa) return false;
            const deadline = new Date(t.datafim || t.dataproposta);
            deadline.setHours(0, 0, 0, 0);
            return deadline < today;
        });

        const selectedDay = filteredTasks.filter(t => {
            if (t.sutarefa) return false;
            const deadline = new Date(t.datafim || t.dataproposta);
            return isSameDay(deadline, selectedDate);
        });

        return { overdue, selectedDay };
    }, [filteredTasks, selectedDate]);

    const handleToggleTask = async (task: DbTask) => {
        if (isUpdating) return;
        setIsUpdating(task.id);
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            await updateTask(task.id, { status: newStatus });
            onRefresh?.();
        } catch (e) {
            alert("Erro de sincronização.");
        } finally {
            setIsUpdating(null);
        }
    };

    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-700 max-w-2xl mx-auto pb-40">
            
            {/* 1. HEADER ESTILO INÍCIO */}
            <div className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-8 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                            <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Agenda Operacional</h2>
                    </div>
                    
                    <div className="relative" ref={filterRef}>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`p-3 rounded-2xl transition-all ${isFilterOpen ? 'bg-white text-amber-500 shadow-lg' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                        >
                            <Filter className="w-5 h-5" />
                        </button>

                        {/* 2. MENU DE FILTROS (POPOVER) */}
                        {isFilterOpen && (
                            <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-[#0c0c0e] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 p-8 z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Ajustes de Visão</h4>
                                
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                                        <select 
                                            value={filterResp} 
                                            onChange={e => setFilterResp(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                                        >
                                            <option value="">Todos</option>
                                            {members.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ativo / Projeto</label>
                                        <select 
                                            value={filterProject} 
                                            onChange={e => setFilterProject(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                                        >
                                            <option value="">Todos os Projetos</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Status da Tarefa</label>
                                        <select 
                                            value={filterStatus} 
                                            onChange={e => setFilterStatus(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                                        >
                                            <option value="">Qualquer Estágio</option>
                                            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mínimo GUT Score</label>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${filterMinGut > 60 ? 'bg-rose-500 text-white shadow-lg' : 'bg-amber-100 text-amber-600'}`}>
                                                {filterMinGut}
                                            </span>
                                        </div>
                                        <div className="relative h-6 flex items-center">
                                            <input 
                                                type="range" min="0" max="125" step="5"
                                                value={filterMinGut}
                                                onChange={e => setFilterMinGut(parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full appearance-none cursor-pointer accent-amber-500 hover:accent-amber-600 transition-all"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[7px] font-black text-slate-300 uppercase tracking-tighter px-1">
                                            <span>Mínimo (0)</span>
                                            <span>Crítico (125)</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => { setFilterResp(''); setFilterProject(''); setFilterStatus(''); setFilterMinGut(0); }}
                                        className="w-full py-3 mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors border border-dashed border-slate-200 dark:border-white/5 rounded-xl"
                                    >
                                        Limpar Ajustes
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold tracking-tight text-white">
                    Foco Temporal
                </h2>
            </div>

            {/* DATE STRIP SELECTOR */}
            <div className="pt-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 px-2 mb-12">
                {dateStrip.map((date, idx) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                        <button 
                            key={idx}
                            onClick={() => setSelectedDate(date)}
                            className={`
                                flex flex-col items-center justify-center min-w-[58px] h-24 rounded-[1.8rem] transition-all duration-500
                                ${isSelected 
                                    ? 'bg-amber-500 text-black shadow-[0_12px_24px_-8px_rgba(245,158,11,0.4)] scale-110' 
                                    : 'bg-white dark:bg-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
                                }
                            `}
                        >
                            <span className={`text-[8px] font-black tracking-[0.2em] mb-1 ${isSelected ? 'text-black/60' : 'text-slate-400'}`}>
                                {weekDays[date.getDay()]}
                            </span>
                            <span className="text-xl font-black tracking-tighter">{date.getDate()}</span>
                            {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-amber-500 mt-2"></div>}
                        </button>
                    );
                })}
            </div>

            <div className="space-y-14 px-1">
                {/* SECTION: OVERDUE */}
                {taskGroups.overdue.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Débito Técnico</h3>
                            </div>
                            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[9px] font-black uppercase">{taskGroups.overdue.length} Pendentes</span>
                        </div>
                        <div className="flex flex-col gap-4">
                            {taskGroups.overdue.map(task => (
                                <TaskCard key={task.id} task={task} onToggle={handleToggleTask} onClick={() => setSelectedTask(task)} updating={isUpdating === task.id} />
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION: SELECTED DAY */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2 border-b border-slate-100 dark:border-white/5 pb-4">
                        <CalendarDays className="w-4 h-4 text-amber-500"/>
                        <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">
                            {isSameDay(selectedDate, new Date()) ? 'Foco de Hoje' : `Agenda • ${selectedDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}).toUpperCase()}`}
                        </h3>
                    </div>

                    {taskGroups.selectedDay.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center opacity-30 gap-6 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem]">
                            <Sparkles className="w-12 h-12 text-slate-300"/>
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest">Radar Limpo</p>
                                <p className="text-[10px] font-bold text-slate-400">Nenhum ativo alocado para este ciclo.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {taskGroups.selectedDay.map(task => (
                                <TaskCard key={task.id} task={task} onToggle={handleToggleTask} onClick={() => setSelectedTask(task)} updating={isUpdating === task.id} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. MODAL DE DETALHES E EDIÇÃO */}
            {selectedTask && (
                <TaskDetailModal 
                    task={{
                        id: selectedTask.id.toString(), text: selectedTask.titulo, description: selectedTask.descricao,
                        category: selectedTask.category, completed: selectedTask.status === 'done', status: selectedTask.status as any, 
                        estimatedHours: selectedTask.duracaohoras, dueDate: selectedTask.datafim, assigneeId: selectedTask.responsavel,
                        dbId: selectedTask.id, gut: { g: selectedTask.gravidade || 3, u: selectedTask.urgencia || 3, t: selectedTask.tendencia || 3 }
                    }}
                    nodeTitle={selectedTask.category || 'Tarefa'}
                    opportunityTitle={selectedTask.projetoData?.nome || 'Ativo Operacional'}
                    organizationId={organizationId}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, 
                            descricao: updated.description,
                            status: updated.status, 
                            category: updated.category,
                            responsavel: updated.assigneeId, 
                            datafim: updated.dueDate, 
                            duracaohoras: updated.estimatedHours,
                            gravidade: updated.gut?.g,
                            urgencia: updated.gut?.u,
                            tendencia: updated.gut?.t
                        });
                        onRefresh?.();
                        setSelectedTask(null);
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onRefresh?.();
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
};

const TaskCard: React.FC<{ task: DbTask, onToggle: (t: DbTask) => void | Promise<void>, onClick: () => void, updating: boolean }> = ({ task, onToggle, onClick, updating }) => {
    const isDone = task.status === 'done';
    const gut = (task.gravidade || 1) * (task.urgencia || 1) * (task.tendencia || 1);
    
    return (
        <div 
            onClick={onClick}
            className={`
                group relative bg-white dark:bg-[#0c0c0e] p-6 rounded-[2rem] border transition-all duration-500 flex items-center gap-6 cursor-pointer
                ${isDone 
                    ? 'border-transparent opacity-50 grayscale' 
                    : 'border-slate-100 dark:border-white/5 hover:border-amber-500/20 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] active:scale-[0.98]'
                }
            `}
        >
            {/* Project Indicator Bar */}
            <div 
                className={`absolute left-0 top-8 bottom-8 w-1 rounded-r-full transition-all ${isDone ? 'opacity-20' : 'opacity-100'}`}
                style={{ backgroundColor: task.projetoData?.cor || '#F59E0B' }}
            ></div>

            {/* Checkbox Tactile */}
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(task); }}
                disabled={updating}
                className={`
                    w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all active:scale-90
                    ${isDone 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-amber-500/30'
                    }
                `}
            >
                {updating ? <Loader2 className="w-5 h-5 animate-spin text-slate-300"/> : isDone ? <CheckCircle className="w-6 h-6 stroke-[3px]"/> : <Circle className="w-5 h-5 opacity-10"/>}
            </button>

            {/* Content Body */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isDone ? 'text-slate-400' : 'text-amber-500'}`}>
                            {task.projetoData?.nome || 'Avulso'}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10"></div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.category || 'Ativo'}</span>
                    </div>
                    {gut > 60 && !isDone && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-md text-[8px] font-black uppercase tracking-tighter">
                            <Zap className="w-2.5 h-2.5"/> Prio Máxima
                        </div>
                    )}
                </div>
                
                <h4 className={`text-base font-bold tracking-tight leading-tight line-clamp-2 ${isDone ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {task.titulo}
                </h4>

                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tight">
                        <Clock className="w-3 h-3 opacity-60"/>
                        {task.duracaohoras || 2}h <span className="opacity-40">esforço</span>
                    </div>
                    {task.responsavelData && (
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tight">
                            <User className="w-3 h-3 opacity-60"/>
                            {task.responsavelData.nome.split(' ')[0]}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Indicator */}
            {!isDone && (
                <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-300">
                    <ChevronRight className="w-4 h-4" />
                </div>
            )}
        </div>
    );
};
