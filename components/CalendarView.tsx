
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, deleteTask } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: any) => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
  activeModules?: string[];
}

export const CalendarView: React.FC<Props> = ({ 
    opportunities, onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId, activeModules 
}) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    useEffect(() => {
        loadTasks();
    }, [organizationId, projectId]);

    const loadTasks = async () => {
        setLoading(true);
        if (organizationId) {
            const allTasks = await fetchAllTasks(organizationId);
            if (projectId) {
                setTasks(allTasks.filter(t => t.projeto?.toString() === projectId));
            } else {
                setTasks(allTasks);
            }
        }
        setLoading(false);
    };

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        
        // Pad start
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    const getTasksForDate = (date: Date) => {
        return tasks.filter(t => {
            const tDate = t.datafim ? new Date(t.datafim) : new Date(t.dataproposta);
            return tDate.getDate() === date.getDate() && 
                   tDate.getMonth() === date.getMonth() && 
                   tDate.getFullYear() === date.getFullYear();
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-5 h-5"/></button>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize w-48 text-center">
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                    <button onClick={loadTasks} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/></button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] bg-slate-200 dark:bg-slate-800 gap-[1px]">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="bg-white dark:bg-slate-900 p-2 text-center text-xs font-bold text-slate-500 uppercase">
                        {day}
                    </div>
                ))}
                
                {daysInMonth.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="bg-slate-50 dark:bg-slate-950/50"></div>;
                    
                    const dayTasks = getTasksForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div key={date.toISOString()} className={`bg-white dark:bg-slate-900 p-2 min-h-[100px] flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <span className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full w-fit' : 'text-slate-700 dark:text-slate-300'}`}>
                                {date.getDate()}
                            </span>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {dayTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => setEditingTaskCtx({ task: {
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
                                            dbId: task.id
                                        }, nodeLabel: task.projetoData?.nome || 'Tarefa' })}
                                        className={`text-[10px] p-1.5 rounded border border-l-4 cursor-pointer truncate shadow-sm transition-transform hover:scale-[1.02] ${
                                            task.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 border-l-emerald-500 text-emerald-700 dark:text-emerald-300' :
                                            task.status === 'doing' ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 border-l-blue-500 text-blue-700 dark:text-blue-300' :
                                            new Date(task.datafim || '') < new Date() ? 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800 border-l-red-500 text-red-700 dark:text-red-300' :
                                            'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-l-slate-400 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {task.titulo}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={editingTaskCtx.task}
                    nodeTitle={editingTaskCtx.nodeLabel}
                    opportunityTitle="Detalhes"
                    organizationId={organizationId}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        if (updated.id) {
                            await updateTask(Number(updated.id), {
                                titulo: updated.text,
                                descricao: updated.description,
                                status: updated.status,
                                responsavel: updated.assigneeId,
                                duracaohoras: updated.estimatedHours,
                                datafim: updated.dueDate,
                                datainicio: updated.startDate,
                                etiquetas: updated.tags,
                                membros: updated.members
                            });
                        }
                        loadTasks();
                    }}
                    onDelete={async (id) => {
                        if (!isNaN(Number(id))) {
                            if (window.confirm("Excluir tarefa?")) {
                                await deleteTask(Number(id));
                                loadTasks();
                                setEditingTaskCtx(null);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
};
