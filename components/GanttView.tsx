
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, syncTaskChecklist, fetchAssignableUsers } from '../services/projectService';
import { optimizeSchedule } from '../services/geminiService';
import { TaskDetailModal } from './TaskDetailModal';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut, Zap, Loader2, Filter } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: any) => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
  activeModules?: string[];
  customPrimaryColor?: string;
}

export const GanttView: React.FC<Props> = ({ 
    opportunities, onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId, activeModules, customPrimaryColor 
}) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    useEffect(() => { loadData(); }, [organizationId, projectId]);

    const loadData = async () => {
        setLoading(true);
        if (organizationId) {
            const allTasks = await fetchAllTasks(organizationId);
            setTasks(projectId ? allTasks.filter(t => t.projeto?.toString() === projectId) : allTasks);
        }
        setLoading(false);
    };

    const handleOptimize = async () => {
        if (!organizationId) return;
        setIsOptimizing(true);
        try {
            const devs = await fetchAssignableUsers(organizationId);
            const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'approval');
            const tasksForAi = pendingTasks.map(t => ({
                taskId: t.id, taskText: t.titulo, estimatedHours: t.duracaohoras, assigneeId: t.responsavel, gut: { g: t.gravidade, u: t.urgencia, t: t.tendencia }
            }));
            const updates = await optimizeSchedule(tasksForAi, devs);
            if (updates && updates.length > 0) {
                for (const update of updates) {
                    await updateTask(update.id, { datainicio: update.startDate, datafim: update.dueDate, responsavel: update.assigneeId });
                }
                alert(`Otimização concluída! ${updates.length} tarefas reagendadas.`);
                loadData();
            }
        } catch (e) { alert("Erro ao otimizar cronograma."); } finally { setIsOptimizing(false); }
    };

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    }, [viewDate]);

    const getTaskStyle = (task: DbTask) => {
        const start = task.datainicio ? new Date(task.datainicio) : new Date(task.dataproposta);
        const end = task.datafim ? new Date(task.datafim) : start;
        const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
        if (end < monthStart || start > monthEnd) return null;
        const dayWidth = 100 / daysInMonth.length;
        let startDay = Math.max(1, start.getMonth() === viewDate.getMonth() ? start.getDate() : 1);
        let endDay = Math.min(daysInMonth.length, end.getMonth() === viewDate.getMonth() ? end.getDate() : daysInMonth.length);
        const duration = Math.max(1, endDay - startDay + 1);
        return {
            left: `${(startDay - 1) * dayWidth}%`,
            width: `${duration * dayWidth}%`,
            className: task.status === 'done' ? 'bg-emerald-500' : task.status === 'doing' ? 'bg-blue-500 shadow-glow-blue' : 'bg-amber-500 shadow-glow-amber'
        };
    };

    const handleTaskClick = (task: DbTask) => {
        setEditingTaskCtx({ 
            task: { 
                ...task, 
                id: task.id.toString(), 
                dbId: task.id,
                text: task.titulo, 
                description: task.descricao,
                status: task.status as any,
                gut: { g: task.gravidade || 1, u: task.urgencia || 1, t: task.tendencia || 1 },
                dueDate: task.datafim,
                startDate: task.datainicio,
                estimatedHours: task.duracaohoras,
                assigneeId: task.responsavel,
                createdAt: task.createdat,
                lifecycle: {
                    created: task.createdat,
                    todo: task.dataafazer,
                    doing: task.datafazendo,
                    review: task.datarevisao,
                    approval: task.dataaprovacao,
                    done: task.dataconclusao
                },
                subtasks: tasks
                    .filter(t => (t.tarefamae === task.id || t.tarefa === task.id) && t.sutarefa)
                    .map(t => ({
                        id: t.id.toString(),
                        text: t.titulo,
                        completed: t.status === 'done',
                        dbId: t.id
                    }))
            }, 
            nodeLabel: task.projetoData?.nome || 'Tarefa' 
        });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-color)] animate-in fade-in duration-500 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--surface)] gap-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-[var(--border-color)]">
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                        <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em] w-48 text-center flex items-center justify-center">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
                    </div>
                    <button onClick={loadData} className="p-3 bg-white dark:bg-white/5 border border-[var(--border-color)] rounded-2xl shadow-sm"><RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`}/></button>
                </div>
                
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white dark:bg-white/5 border border-[var(--border-color)] rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Filter className="w-4 h-4"/> Filtros</button>
                    <button 
                        onClick={handleOptimize} 
                        disabled={isOptimizing}
                        className="flex items-center gap-3 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                        {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        Equilibrar Carga (IA)
                    </button>
                </div>
            </div>

            {/* Gantt Scroll Area */}
            <div className="flex-1 overflow-x-auto custom-scrollbar bg-slate-50/50 dark:bg-black/20">
                <div className="h-full min-w-[1400px] flex flex-col relative">
                    
                    {/* Dates Header */}
                    <div className="flex sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--surface)]/95 backdrop-blur-md">
                        <div className="w-80 p-4 border-r border-[var(--border-color)] shrink-0 sticky left-0 z-30 bg-[var(--surface)]">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ativo / Tarefa</span>
                        </div>
                        <div className="flex-1 flex h-14">
                            {daysInMonth.map(d => {
                                const isToday = new Date().toDateString() === d.toDateString();
                                return (
                                    <div key={d.toISOString()} className={`flex-1 border-r border-[var(--border-color)] flex flex-col items-center justify-center min-w-[40px] ${isToday ? 'bg-amber-500/10' : ''}`}>
                                        <span className={`text-[10px] font-black ${isToday ? 'text-amber-500' : 'text-slate-400'}`}>{d.getDate()}</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">{d.toLocaleDateString('pt-BR', {weekday: 'short'}).substring(0, 1)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {tasks.map(task => {
                            const style = getTaskStyle(task);
                            return (
                                <div key={task.id} className="flex border-b border-[var(--border-color)] hover:bg-slate-100/50 dark:hover:bg-white/[0.02] group transition-colors">
                                    <div className="w-80 p-5 border-r border-[var(--border-color)] shrink-0 sticky left-0 z-10 bg-[var(--bg-color)] shadow-[5px_0_15px_rgba(0,0,0,0.05)]">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{task.projetoData?.nome || 'AD-HOC'}</span>
                                            <span className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-amber-500 transition-colors cursor-pointer" onClick={() => handleTaskClick(task)}>{task.titulo}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-white/10">
                                                    {task.responsavelData?.avatar_url && <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover"/>}
                                                </div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{task.responsavelData?.nome || 'Sem Resp.'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 relative h-20">
                                        {/* Day Columns BG */}
                                        <div className="absolute inset-0 flex">
                                            {daysInMonth.map((d, idx) => (
                                                <div key={idx} className="flex-1 border-r border-slate-200/30 dark:border-white/5"></div>
                                            ))}
                                        </div>
                                        {/* Task Bar */}
                                        {style && (
                                            <div 
                                                className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-full z-10 shadow-lg border border-white/20 flex items-center px-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 ${style.className}`}
                                                style={{ left: style.left, width: style.width }}
                                                onClick={() => handleTaskClick(task)}
                                            >
                                                <span className="text-[8px] font-black text-white uppercase tracking-tighter truncate">{task.titulo}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={editingTaskCtx.task}
                    nodeTitle={editingTaskCtx.nodeLabel}
                    opportunityTitle={editingTaskCtx.nodeLabel}
                    organizationId={organizationId}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        const now = new Date().toISOString();
                        const updatePayload: any = { 
                            titulo: updated.text, 
                            descricao: updated.description,
                            status: updated.status,
                            responsavel: updated.assigneeId,
                            duracaohoras: updated.estimatedHours,
                            datafim: updated.dueDate, 
                            datainicio: updated.startDate 
                        };
                        
                        // Sincronizar timestamps se o status mudou
                        if (updated.status !== editingTaskCtx.task.status) {
                            const dateFields: Record<string, string> = {
                                todo: 'dataafazer',
                                doing: 'datafazendo',
                                review: 'datarevisao',
                                approval: 'dataaprovacao',
                                done: 'dataconclusao'
                            };
                            const field = dateFields[updated.status];
                            if (field) updatePayload[field] = now;
                        }

                        await updateTask(Number(updated.id), updatePayload);
                        if (updated.subtasks && organizationId) {
                            await syncTaskChecklist(Number(updated.id), updated.subtasks, organizationId, Number(editingTaskCtx.task.projeto), updated.assigneeId);
                        }
                        loadData();
                    }}
                />
            )}
        </div>
    );
};
