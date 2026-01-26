
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, syncTaskChecklist, fetchOrgMembers } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    ChevronLeft, ChevronRight, RefreshCw, Zap, Loader2, 
    ArrowRight, Calendar, Info, CheckCircle2, Layout
} from 'lucide-react';

interface Props {
  tasks: DbTask[];
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: () => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
  activeModules?: string[];
  customPrimaryColor?: string;
  readOnly?: boolean;
}

export const GanttView: React.FC<Props> = ({ 
    tasks, opportunities, onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId, activeModules, customPrimaryColor, readOnly 
}) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1));
    }, [viewDate]);

    const groupedTasks = useMemo(() => {
        const groups: Record<string, { name: string; color: string; tasks: DbTask[] }> = {};
        tasks.filter(t => !t.sutarefa).forEach(task => {
            const pKey = task.projeto?.toString() || 'adhoc';
            if (!groups[pKey]) {
                groups[pKey] = {
                    name: task.projetoData?.nome || 'Tarefas Avulsas',
                    color: task.projetoData?.cor || '#64748b',
                    tasks: []
                };
            }
            groups[pKey].tasks.push(task);
        });
        return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name));
    }, [tasks]);

    const getGridColumn = (dateStr: string | null | undefined, isEnd = false) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
        if (date < monthStart && !isEnd) return 2; 
        if (date > monthEnd && isEnd) return daysInMonth.length + 2;
        if (date < monthStart || date > monthEnd) return null;
        return date.getDate() + 1 + (isEnd ? 1 : 0);
    };

    const handleTaskClick = (task: DbTask) => {
        const hydrated = {
            id: task.id.toString(), dbId: task.id, text: task.titulo, description: task.descricao,
            status: task.status as any, completed: task.status === 'done', estimatedHours: task.duracaohoras,
            dueDate: task.datafim || task.dataproposta, startDate: task.datainicio || task.dataproposta,
            assigneeId: task.responsavel, gut: { g: task.gravidade, u: task.urgencia, t: task.tendencia },
            createdAt: task.createdat
        };
        setEditingTaskCtx({ task: hydrated, projetoData: task.projetoData });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#020203] rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl gap-6 shrink-0 z-50">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all shadow-sm"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
                    <div className="px-6 flex flex-col items-center justify-center min-w-[160px]">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">{viewDate.getFullYear()}</span>
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{viewDate.toLocaleDateString('pt-BR', { month: 'long' })}</h2>
                    </div>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all shadow-sm"><ChevronRight className="w-5 h-5 text-slate-500"/></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-black/20 relative">
                <div className="min-w-[1400px]">
                    <div className="sticky top-0 z-40 grid border-b border-slate-200 dark:border-white/5 bg-slate-50/95 dark:bg-[#0a0a0c]/95 backdrop-blur-xl" style={{ gridTemplateColumns: `280px repeat(${daysInMonth.length}, 1fr)` }}>
                        <div className="p-6 border-r border-slate-200 dark:border-white/5 sticky left-0 z-50 bg-slate-50 dark:bg-[#0a0a0c]">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Roadmap / Ativos</span>
                        </div>
                        {daysInMonth.map(d => (
                            <div key={d.toISOString()} className={`h-20 border-r border-slate-200 dark:border-white/5 flex flex-col items-center justify-center ${new Date().toDateString() === d.toDateString() ? 'bg-amber-500/5' : ''}`}>
                                <span className={`text-[8px] font-black uppercase text-slate-400`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                <span className={`text-sm font-black mt-1 ${new Date().toDateString() === d.toDateString() ? 'text-amber-500' : ''}`}>{d.getDate()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pb-20">
                        {groupedTasks.map(([pId, project]) => (
                            <React.Fragment key={pId}>
                                <div className="grid border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02] sticky top-20 z-10" style={{ gridTemplateColumns: `280px repeat(${daysInMonth.length}, 1fr)` }}>
                                    <div className="p-4 border-r border-slate-200 dark:border-white/10 sticky left-0 z-20 bg-slate-100 dark:bg-[#111113] flex items-center gap-3">
                                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: project.color }}></div>
                                        <span className="text-[11px] font-black uppercase truncate text-slate-700 dark:text-slate-300">{project.name}</span>
                                    </div>
                                    {daysInMonth.map((_, idx) => <div key={idx} className="border-r border-slate-200 dark:border-white/[0.03] h-12"></div>)}
                                </div>
                                {project.tasks.map(task => {
                                    const startCol = getGridColumn(task.datainicio || task.dataproposta);
                                    const endCol = getGridColumn(task.datafim || task.dataproposta, true);
                                    const isDone = task.status === 'done';
                                    return (
                                        <div key={task.id} className="grid border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.01] h-14 relative group" style={{ gridTemplateColumns: `280px repeat(${daysInMonth.length}, 1fr)` }}>
                                            <div className="p-4 border-r border-slate-200 dark:border-white/10 sticky left-0 z-20 bg-white dark:bg-[#020203] flex items-center overflow-hidden">
                                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate pl-4 cursor-pointer hover:text-amber-500 transition-colors" onClick={() => handleTaskClick(task)}>{task.titulo}</span>
                                            </div>
                                            {daysInMonth.map((_, idx) => <div key={idx} className="border-r border-slate-100 dark:border-white/[0.03] h-full"></div>)}
                                            {startCol && endCol && (
                                                <div onClick={() => handleTaskClick(task)} className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-full z-10 border border-white/10 flex items-center shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-95 ${isDone ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/20 text-amber-500 border-amber-500/20'}`} style={{ gridColumnStart: startCol, gridColumnEnd: endCol, left: '4px', right: '4px', position: 'relative', marginLeft: '-280px' }}>
                                                    <div className="relative z-10 w-full px-3 flex items-center justify-between">
                                                        <span className="text-[9px] font-black uppercase truncate text-slate-900 dark:text-white">{task.titulo}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={editingTaskCtx.task} 
                    nodeTitle={editingTaskCtx.projetoData?.nome || 'Tarefa'} 
                    opportunityTitle={editingTaskCtx.projetoData?.nome || 'PROJETO ATIVO'}
                    organizationId={organizationId} onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { titulo: updated.text, status: updated.status, responsavel: updated.assigneeId, duracaohoras: updated.estimatedHours, datafim: updated.dueDate, datainicio: updated.startDate });
                        onTaskUpdate(); setEditingTaskCtx(null);
                    }}
                />
            )}
        </div>
    );
};
