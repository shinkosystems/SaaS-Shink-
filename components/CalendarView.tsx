
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Opportunity, TaskStatus, BpmnTask, DbTask } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Clock, Zap, Plus, LayoutGrid, Columns, Square, Loader2, CheckCircle2, Hash, RefreshCw, Grid, CornerDownRight, AlignLeft, Layers } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { optimizeSchedule } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { fetchAssignableUsers, updateTask, fetchAllTasks, deleteTask } from '../services/projectService';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: BpmnTask) => void;
  onCreateAdhocTask?: (task: BpmnTask) => void;
  onRefresh?: () => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
  activeModules?: string[];
}

interface EditableTaskContext {
    task: BpmnTask;
    oppId: string;
    nodeId: string;
    nodeLabel: string;
    opportunity?: Opportunity;
}

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<Props> = ({ opportunities, onSelectOpportunity, onTaskUpdate, onCreateAdhocTask, onRefresh, userRole, projectId, organizationId, activeModules }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [editingTaskCtx, setEditingTaskCtx] = useState<{task: BpmnTask, oppId: string, nodeLabel: string} | null>(null);
  const [dbTasks, setDbTasks] = useState<DbTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      loadTasks();
  }, [organizationId, onRefresh]);

  const loadTasks = async () => {
      setIsLoading(true);
      const tasks = await fetchAllTasks(organizationId);
      setDbTasks(tasks);
      setIsLoading(false);
  };

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const monthDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const handlePrev = () => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentDate(newDate);
  };

  const handleNext = () => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
  };

  const tasksByDay = useMemo(() => {
      const map = new Map<string, DbTask[]>();
      dbTasks.forEach(task => {
          if (!task.datainicio) return;
          const dateStr = task.datainicio.split('T')[0];
          if (!map.has(dateStr)) map.set(dateStr, []);
          map.get(dateStr)?.push(task);
      });
      return map;
  }, [dbTasks]);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
          case 'doing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 bg-white dark:bg-[#0a0a0a]">
        
        {/* Header Clean */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/5">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6"/> Agenda
                </h2>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-1">
                    <button onClick={handlePrev} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                    <span className="px-4 text-sm font-bold text-slate-700 dark:text-white capitalize w-32 text-center">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNext} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-slate-500 transition-colors"><ChevronRight className="w-4 h-4"/></button>
                </div>
                <button onClick={loadTasks} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}/>
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-7 gap-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-xs font-bold text-slate-400 uppercase text-center mb-2">{day}</div>
                ))}
                
                {/* Empty slots for start of month */}
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-32"></div>
                ))}

                {monthDays.map(date => {
                    const dateKey = date.toISOString().split('T')[0];
                    const dayTasks = tasksByDay.get(dateKey) || [];
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div key={dateKey} className={`min-h-[120px] p-2 rounded-xl border transition-all ${isToday ? 'bg-blue-50/30 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}>
                            <div className={`text-xs font-bold mb-2 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                {date.getDate()}
                            </div>
                            <div className="space-y-1">
                                {dayTasks.slice(0, 3).map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={() => setEditingTaskCtx({
                                            task: {
                                                id: task.id.toString(),
                                                text: task.titulo,
                                                status: task.status as any,
                                                completed: task.status === 'done',
                                                description: task.descricao,
                                                assignee: task.responsavelData?.nome,
                                                assigneeId: task.responsavel,
                                                startDate: task.datainicio,
                                                dueDate: task.datafim,
                                                estimatedHours: task.duracaohoras
                                            },
                                            oppId: task.projeto?.toString() || '',
                                            nodeLabel: 'Agenda'
                                        })}
                                        className={`px-2 py-1.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(task.status)}`}
                                    >
                                        {task.titulo}
                                    </div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <div className="text-[10px] text-slate-400 text-center cursor-pointer hover:text-slate-600">
                                        + {dayTasks.length - 3} mais
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Modal */}
        {editingTaskCtx && (
            <TaskDetailModal 
                task={editingTaskCtx.task}
                nodeTitle="Tarefa"
                opportunityTitle="Detalhes"
                onClose={() => setEditingTaskCtx(null)}
                onSave={async (updated) => {
                    await updateTask(Number(updated.id), {
                        titulo: updated.text,
                        descricao: updated.description,
                        status: updated.status,
                        datainicio: updated.startDate,
                        datafim: updated.dueDate,
                        responsavel: updated.assigneeId
                    });
                    loadTasks();
                }}
                onDelete={async (id) => {
                    if (window.confirm("Excluir tarefa?")) {
                        await deleteTask(Number(id));
                        loadTasks();
                        setEditingTaskCtx(null);
                    }
                }}
            />
        )}
    </div>
  );
};
