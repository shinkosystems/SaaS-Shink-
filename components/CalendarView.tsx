
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, DbTask } from '../types';
import { updateTask, deleteTask, fetchOrgMembers } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';
import { ChevronLeft, ChevronRight, Sparkles, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  tasks: DbTask[]; 
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: () => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
}

type ViewMode = 'day' | 'week' | 'month';

export const CalendarView: React.FC<Props> = ({ 
    tasks, opportunities, onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const mod = direction === 'next' ? 1 : -1;
        if (viewMode === 'day') newDate.setDate(newDate.getDate() + mod);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (mod * 7));
        else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + mod);
        setCurrentDate(newDate);
    };

    const daysInView = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];
        if (viewMode === 'month') {
            const first = new Date(year, month, 1);
            const last = new Date(year, month + 1, 0);
            for (let i = 0; i < first.getDay(); i++) days.push(null);
            for (let i = 1; i <= last.getDate(); i++) days.push(new Date(year, month, i));
            while (days.length % 7 !== 0) days.push(null);
        } else if (viewMode === 'week') {
            const curr = new Date(currentDate);
            const first = curr.getDate() - curr.getDay(); 
            for (let i = 0; i < 7; i++) {
                const d = new Date(curr); d.setDate(first + i); days.push(d);
            }
        } else if (viewMode === 'day') days.push(new Date(currentDate));
        return days;
    }, [currentDate, viewMode]);

    // Normalização agnóstica de fuso horário
    const normalizeDate = (d: Date | string | null | undefined) => {
        if (!d) return 0;
        let date: Date;
        if (typeof d === 'string') {
            // Se for apenas data YYYY-MM-DD, extraímos sem passar pelo parser UTC do Date
            if (d.includes('-') && !d.includes('T') && !d.includes(':')) {
                const [y, m, day] = d.split('-').map(Number);
                date = new Date(y, m - 1, day);
            } else {
                date = new Date(d);
            }
        } else {
            date = d;
        }
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#050507] rounded-[2.5rem] overflow-hidden shadow-glass border border-slate-200 dark:border-white/10 relative">
            <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-white/5 gap-6 shrink-0">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl shadow-inner">
                    {['day', 'week', 'month'].map(m => (
                        <button key={m} onClick={() => setViewMode(m as any)} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl ${viewMode === m ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500'}`}>{m === 'day' ? 'Dia' : m === 'week' ? 'Semana' : 'Mês'}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleNavigate('prev')} className="p-2.5 hover:bg-slate-100 rounded-xl"><ChevronLeft className="w-5 h-5"/></button>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest w-48 text-center">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => handleNavigate('next')} className="p-2.5 hover:bg-slate-100 rounded-xl"><ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b border-slate-200 dark:border-white/5 sticky top-0 bg-white/90 dark:bg-[#050507]/90 backdrop-blur-md z-10`}>
                    {viewMode !== 'day' && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.3em]">{day}</div>
                    ))}
                </div>
                <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} auto-rows-min gap-[1px] bg-slate-200 dark:bg-white/5`}>
                    {daysInView.map((date, i) => {
                        if (!date) return <div key={i} className="bg-slate-50 dark:bg-black/20 min-h-[140px]"></div>;
                        const isToday = new Date().toDateString() === date.toDateString();
                        const timestamp = normalizeDate(date);
                        
                        // EXIBE APENAS NO DIA DA DEADLINE (datafim ou dataproposta como fallback)
                        const dayTasks = tasks.filter(t => {
                            if (t.sutarefa) return false;
                            const deadline = normalizeDate(t.datafim || t.dataproposta);
                            return timestamp === deadline;
                        });

                        return (
                            <div key={date.toISOString()} className={`bg-white dark:bg-[#050507] p-3 flex flex-col gap-2 min-h-[140px] ${isToday ? 'ring-1 ring-inset ring-amber-500/40 bg-amber-500/5' : ''}`}>
                                <span className={`text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-xl ${isToday ? 'bg-amber-500 text-black shadow-glow-amber' : 'text-slate-400'}`}>{date.getDate()}</span>
                                <div className="flex-1 space-y-1.5">
                                    {dayTasks.map(task => (
                                        <div key={task.id} onClick={() => setEditingTaskCtx({ task, projectData: task.projetoData })} className={`p-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider truncate cursor-pointer border ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                            {task.titulo}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{ 
                        id: editingTaskCtx.task.id.toString(), 
                        dbId: editingTaskCtx.task.id, 
                        text: editingTaskCtx.task.titulo, 
                        description: editingTaskCtx.task.descricao,
                        status: editingTaskCtx.task.status as any,
                        assigneeId: editingTaskCtx.task.responsavel,
                        dueDate: editingTaskCtx.task.datafim,
                        category: editingTaskCtx.task.category
                    }}
                    opportunityTitle={editingTaskCtx.projectData?.nome}
                    nodeTitle={editingTaskCtx.task.category || 'Tarefa'} organizationId={organizationId} onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => { 
                        await updateTask(Number(updated.id), { 
                            status: updated.status, 
                            responsavel: updated.assigneeId, 
                            datafim: updated.dueDate,
                            titulo: updated.text,
                            descricao: updated.description,
                            category: updated.category
                        }); 
                        onTaskUpdate(); 
                        setEditingTaskCtx(null); 
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onTaskUpdate();
                        setEditingTaskCtx(null);
                    }}
                />
            )}
        </div>
    );
};
