import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, deleteTask, syncTaskChecklist } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, List, Clock } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: any) => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
  activeModules?: string[];
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

export const CalendarView: React.FC<Props> = ({ 
    opportunities, onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId, activeModules 
}) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    useEffect(() => {
        loadTasks();
    }, [organizationId, projectId]);

    const loadTasks = async () => {
        setLoading(true);
        if (organizationId) {
            const allTasks = await fetchAllTasks(organizationId);
            
            // Keep ALL tasks in state (including subtasks) so we can hydrate the modal correctly.
            // Filtering for display happens in render.
            if (projectId) {
                setTasks(allTasks.filter(t => t.projeto?.toString() === projectId));
            } else {
                setTasks(allTasks);
            }
        }
        setLoading(false);
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const modifier = direction === 'next' ? 1 : -1;

        if (viewMode === 'day') newDate.setDate(newDate.getDate() + modifier);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (modifier * 7));
        else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + modifier);
        else if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + modifier);

        setCurrentDate(newDate);
    };

    const getDaysInView = useMemo(() => {
        if (viewMode === 'year') return []; // Handled separately

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];

        if (viewMode === 'month') {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startPad = firstDay.getDay(); // 0 = Sunday
            
            // Previous month padding
            for (let i = 0; i < startPad; i++) {
                days.push(null);
            }
            // Days
            for (let i = 1; i <= lastDay.getDate(); i++) {
                days.push(new Date(year, month, i));
            }
        } else if (viewMode === 'week') {
            const curr = new Date(currentDate);
            const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(curr);
                d.setDate(first + i);
                days.push(d);
            }
        } else if (viewMode === 'day') {
            days.push(new Date(currentDate));
        }

        return days;
    }, [currentDate, viewMode]);

    const getTasksForDate = (date: Date) => {
        return tasks.filter(t => {
            const tDate = t.datafim ? new Date(t.datafim) : new Date(t.dataproposta);
            return tDate.getDate() === date.getDate() && 
                   tDate.getMonth() === date.getMonth() && 
                   tDate.getFullYear() === date.getFullYear();
        });
    };

    const getTitle = () => {
        if (viewMode === 'day') return currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        if (viewMode === 'week') {
            const days = getDaysInView;
            if(days.length > 0 && days[0] && days[6]) {
                const start = days[0] as Date;
                const end = days[6] as Date;
                return `${start.getDate()} ${start.toLocaleDateString('pt-BR', {month:'short'})} - ${end.getDate()} ${end.toLocaleDateString('pt-BR', {month:'short'})}`;
            }
            return 'Semana';
        }
        if (viewMode === 'month') return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (viewMode === 'year') return currentDate.getFullYear().toString();
        return '';
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/5">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-white/5 gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                        <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Dia</button>
                        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Semana</button>
                        <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Mês</button>
                        <button onClick={() => setViewMode('year')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'year' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Ano</button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleNavigate('prev')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500"><ChevronLeft className="w-5 h-5"/></button>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white capitalize w-48 text-center truncate">
                            {getTitle()}
                        </h2>
                        <button onClick={() => handleNavigate('next')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                    <button onClick={loadTasks} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/></button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                
                {/* YEAR VIEW */}
                {viewMode === 'year' && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {Array.from({ length: 12 }, (_, i) => {
                                const mDate = new Date(currentDate.getFullYear(), i, 1);
                                const mName = mDate.toLocaleDateString('pt-BR', { month: 'long' });
                                const mTasks = tasks.filter(t => {
                                    // HIDE SUBTASKS
                                    if (t.sutarefa) return false;
                                    const d = t.datafim ? new Date(t.datafim) : new Date(t.dataproposta);
                                    return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === i;
                                });
                                
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => { setCurrentDate(mDate); setViewMode('month'); }}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl p-4 hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-md group"
                                    >
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize mb-3 flex justify-between items-center">
                                            {mName}
                                            {mTasks.length > 0 && <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-slate-500">{mTasks.length}</span>}
                                        </h3>
                                        <div className="space-y-1">
                                            {mTasks.slice(0, 3).map(t => (
                                                <div key={t.id} className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                                    {t.titulo}
                                                </div>
                                            ))}
                                            {mTasks.length > 3 && (
                                                <div className="text-[10px] text-slate-400 italic pl-2.5">+ {mTasks.length - 3} tarefas</div>
                                            )}
                                            {mTasks.length === 0 && <div className="text-[10px] text-slate-300 dark:text-slate-700 italic">Sem tarefas</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* DAY / WEEK / MONTH VIEW */}
                {viewMode !== 'year' && (
                    <div className={`h-full grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} ${viewMode === 'month' ? 'grid-rows-[auto_1fr]' : 'grid-rows-[auto_1fr]'} gap-[1px] bg-slate-200 dark:bg-slate-800`}>
                        {/* Days Header */}
                        {viewMode !== 'day' && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="bg-white dark:bg-slate-900 p-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                        {viewMode === 'day' && (
                            <div className="bg-white dark:bg-slate-900 p-3 text-center font-bold text-slate-700 dark:text-white border-b border-slate-100 dark:border-white/5">
                                {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                        )}

                        {/* Calendar Cells */}
                        {getDaysInView.map((date, i) => {
                            if (!date) return <div key={`empty-${i}`} className="bg-slate-5 dark:bg-slate-950/50"></div>;
                            
                            // FILTER: Hide subtasks from calendar view
                            const dayTasks = getTasksForDate(date).filter(t => !t.sutarefa);
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <div key={date.toISOString()} className={`bg-white dark:bg-slate-900 p-2 flex flex-col gap-1 transition-colors ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} ${viewMode === 'day' ? 'p-4 overflow-y-auto' : 'min-h-[100px] overflow-hidden hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                    {viewMode !== 'day' && (
                                        <span className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {date.getDate()}
                                        </span>
                                    )}
                                    
                                    <div className={`flex-1 ${viewMode === 'day' ? 'space-y-3' : 'overflow-y-auto custom-scrollbar space-y-1'}`}>
                                        {dayTasks.map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => {
                                                    // HYDRATE SUBTASKS from the full 'tasks' state
                                                    const subtasks = tasks
                                                        .filter(t => (t.tarefamae === task.id || t.tarefa === task.id) && t.sutarefa)
                                                        .map(t => ({
                                                            id: t.id.toString(),
                                                            text: t.titulo,
                                                            completed: t.status === 'done',
                                                            dbId: t.id,
                                                            dueDate: t.datafim,
                                                            startDate: t.datainicio,
                                                            assignee: t.responsavelData?.nome,
                                                            assigneeId: t.responsavel,
                                                            estimatedHours: t.duracaohoras
                                                        }));

                                                    setEditingTaskCtx({ task: {
                                                        id: task.id.toString(),
                                                        text: task.titulo,
                                                        description: task.descricao,
                                                        status: task.status as any,
                                                        startDate: task.datainicio,
                                                        dueDate: task.datafim,
                                                        assigneeId: task.responsavel,
                                                        estimatedHours: task.duracaohoras,
                                                        completed: task.status === 'done',
                                                        gut: { g: task.gravidade, u: task.urgencia, t: task.tendencia },
                                                        tags: task.etiquetas || [],
                                                        members: task.membros || [],
                                                        attachments: task.anexos || [],
                                                        dbId: task.id,
                                                        projectId: task.projeto || undefined,
                                                        subtasks: subtasks // Pass Subtasks here
                                                    }, nodeLabel: task.projetoData?.nome || 'Tarefa' });
                                                }}
                                                className={`rounded border cursor-pointer shadow-sm transition-transform hover:scale-[1.01] ${
                                                    viewMode === 'day' ? 'p-3 border-l-4' : 'text-[10px] p-1.5 border-l-2 truncate'
                                                } ${
                                                    task.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 border-l-emerald-500 text-emerald-700 dark:text-emerald-300' :
                                                    task.status === 'doing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 border-l-blue-500 text-blue-700 dark:text-blue-300' :
                                                    new Date(task.datafim || '') < new Date() ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 border-l-red-500 text-red-700 dark:text-red-300' :
                                                    'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 border-l-slate-400 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="truncate font-medium">{task.titulo}</span>
                                                    {viewMode === 'day' && task.datafim && (
                                                        <span className="text-[10px] opacity-70 whitespace-nowrap">{new Date(task.datafim).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    )}
                                                </div>
                                                {viewMode === 'day' && (
                                                    <div className="text-xs opacity-70 mt-1 truncate">{task.projetoData?.nome || 'Sem projeto'}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={editingTaskCtx.task}
                    nodeTitle={editingTaskCtx.nodeLabel}
                    opportunityTitle={editingTaskCtx.nodeLabel}
                    organizationId={organizationId}
                    onClose={() => setEditingTaskCtx(null)}
                    onDelete={async (id) => {
                        if (!isNaN(Number(id))) {
                            await deleteTask(Number(id));
                            loadTasks();
                            setEditingTaskCtx(null);
                        }
                    }}
                    onSave={async (updated) => {
                        if (updated.id) {
                            const dbId = Number(updated.id);
                            if (!isNaN(dbId)) {
                                await updateTask(dbId, {
                                    titulo: updated.text,
                                    descricao: updated.description,
                                    status: updated.status,
                                    responsavel: updated.assigneeId,
                                    duracaohoras: updated.estimatedHours,
                                    datafim: updated.dueDate,
                                    datainicio: updated.startDate,
                                    etiquetas: updated.tags,
                                    membros: updated.members,
                                    anexos: updated.attachments
                                });

                                // Sync Checklist (Subtasks)
                                if (updated.subtasks && organizationId) {
                                    await syncTaskChecklist(dbId, updated.subtasks, organizationId, updated.projectId, updated.assigneeId);
                                }
                            }
                        }
                        loadTasks();
                    }}
                />
            )}
        </div>
    );
};