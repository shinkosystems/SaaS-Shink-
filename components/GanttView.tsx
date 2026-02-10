
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { updateTask } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    ChevronLeft, ChevronRight, Zap, Loader2, 
    ArrowRight, Calendar, CheckCircle2, Clock, 
    Layers, LayoutList, GanttChartSquare, MapPin
} from 'lucide-react';

interface Props {
  tasks: DbTask[];
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: () => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
}

export const GanttView: React.FC<Props> = ({ 
    tasks, opportunities, onSelectOpportunity, onTaskUpdate, organizationId 
}) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                    color: task.projetoData?.cor || '#F59E0B',
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
            createdAt: task.createdat, category: task.category
        };
        setEditingTaskCtx({ task: hydrated, projetoData: task.projetoData });
    };

    // --- VISÃO MOBILE: TIMELINE VERTICAL ---
    if (isMobile) {
        return (
            <div className="flex flex-col space-y-12 pb-40 p-6 animate-in fade-in duration-500">
                {groupedTasks.map(([pId, project]) => (
                    <div key={pId} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: project.color }}></div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{project.name}</h3>
                        </div>
                        <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 dark:border-white/5 ml-2">
                            {project.tasks.map((task, idx) => (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleTaskClick(task)}
                                    className="relative group cursor-pointer"
                                >
                                    {/* Ponto na Timeline */}
                                    <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full border-4 border-white dark:border-[#020203] bg-amber-500 shadow-sm transition-transform group-active:scale-125"></div>
                                    
                                    <div className="bg-white dark:bg-[#0c0c0e] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-soft hover:border-amber-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {task.category || 'Ativo'}
                                            </span>
                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {task.status}
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-6 leading-tight">{task.titulo}</h4>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                                            <div className="flex items-center gap-4 text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3"/>
                                                    <span className="text-[9px] font-black">{task.duracaohoras || 2}h</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3"/>
                                                    <span className="text-[9px] font-black">{new Date(task.datafim || task.dataproposta).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-amber-500 transition-colors"/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {editingTaskCtx && (
                    <TaskDetailModal 
                        task={editingTaskCtx.task} 
                        nodeTitle={editingTaskCtx.task.category || 'Tarefa'} 
                        opportunityTitle={editingTaskCtx.projetoData?.nome}
                        organizationId={organizationId} 
                        onClose={() => setEditingTaskCtx(null)}
                        onSave={async (updated) => {
                            await updateTask(Number(updated.id), { titulo: updated.text, status: updated.status, responsavel: updated.assigneeId, duracaohoras: updated.estimatedHours, datafim: updated.dueDate, datainicio: updated.startDate, category: updated.category });
                            onTaskUpdate(); setEditingTaskCtx(null);
                        }}
                    />
                )}
            </div>
        );
    }

    // --- VISÃO DESKTOP: GANTT INDUSTRIAL ---
    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden relative animate-in fade-in duration-700">
            {/* Toolbar Minimalista */}
            <div className="flex items-center justify-between p-8 shrink-0">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-inner">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-3 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                    <div className="px-10 flex flex-col items-center justify-center min-w-[200px]">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-1">{viewDate.getFullYear()}</span>
                        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">{viewDate.toLocaleDateString('pt-BR', { month: 'long' })}</h2>
                    </div>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-3 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative mx-8 mb-20 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-[#08080a]">
                <div className="min-w-max relative">
                    {/* Header do Calendário */}
                    <div className="sticky top-0 z-40 grid border-b border-slate-100 dark:border-white/5 bg-white/95 dark:bg-[#0a0a0c]/95 backdrop-blur-xl" style={{ gridTemplateColumns: `320px repeat(${daysInMonth.length}, 60px)` }}>
                        <div className="p-6 border-r border-slate-100 dark:border-white/5 sticky left-0 z-50 bg-inherit flex items-center gap-3">
                            <GanttChartSquare className="w-5 h-5 text-amber-500"/>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ativos & Atividades</span>
                        </div>
                        {daysInMonth.map(d => {
                            const isToday = new Date().toDateString() === d.toDateString();
                            return (
                                <div key={d.toISOString()} className={`h-24 border-r border-slate-50 dark:border-white/[0.02] flex flex-col items-center justify-center ${isToday ? 'bg-amber-500/5' : ''}`}>
                                    <span className="text-[9px] font-black uppercase text-slate-300 mb-1">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                    <span className={`text-base font-black ${isToday ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}>{d.getDate()}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Linhas de Projetos e Tarefas */}
                    <div className="relative">
                        {groupedTasks.map(([pId, project]) => (
                            <React.Fragment key={pId}>
                                {/* Header do Grupo (Projeto) */}
                                <div className="grid border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] sticky top-24 z-10" style={{ gridTemplateColumns: `320px repeat(${daysInMonth.length}, 60px)` }}>
                                    <div className="p-5 border-r border-slate-100 dark:border-white/5 sticky left-0 z-20 bg-inherit flex items-center gap-4">
                                        <div className="w-2 h-7 rounded-full shadow-sm" style={{ backgroundColor: project.color }}></div>
                                        <span className="text-[11px] font-black uppercase truncate text-slate-600 dark:text-slate-300 tracking-wider">{project.name}</span>
                                    </div>
                                    {daysInMonth.map((_, idx) => <div key={idx} className="border-r border-slate-50 dark:border-white/[0.01] h-14"></div>)}
                                </div>
                                
                                {/* Tarefas do Projeto */}
                                {project.tasks.map(task => {
                                    const startCol = getGridColumn(task.datainicio || task.dataproposta);
                                    const endCol = getGridColumn(task.datafim || task.dataproposta, true);
                                    const isDone = task.status === 'done';
                                    
                                    return (
                                        <div key={task.id} className="grid border-b border-slate-50 dark:border-white/[0.02] hover:bg-slate-50/50 dark:hover:bg-white/[0.01] h-16 relative group" style={{ gridTemplateColumns: `320px repeat(${daysInMonth.length}, 60px)` }}>
                                            <div className="p-5 border-r border-slate-100 dark:border-white/5 sticky left-0 z-20 bg-white dark:bg-[#08080a] flex items-center overflow-hidden">
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate pl-6 cursor-pointer hover:text-amber-500 transition-colors" onClick={() => handleTaskClick(task)}>{task.titulo}</span>
                                            </div>
                                            {daysInMonth.map((_, idx) => <div key={idx} className="border-r border-slate-50 dark:border-white/[0.01] h-full"></div>)}
                                            
                                            {/* BARRA GANTT - ESTILO INDUSTRIAL PILULA */}
                                            {startCol && endCol && (
                                                <div 
                                                    onClick={() => handleTaskClick(task)} 
                                                    className={`
                                                        absolute top-1/2 -translate-y-1/2 h-8 rounded-full z-10 border shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-95 flex items-center px-4 overflow-hidden
                                                        ${isDone 
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                                                            : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}
                                                    `} 
                                                    style={{ 
                                                        gridColumnStart: startCol, 
                                                        gridColumnEnd: endCol, 
                                                        left: '4px', right: '4px', 
                                                        position: 'relative', marginLeft: '-320px' 
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50"></div>
                                                    <div className="relative z-10 w-full flex items-center justify-between gap-2">
                                                        <span className="text-[9px] font-black uppercase truncate">{task.titulo}</span>
                                                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0"/>}
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
                    nodeTitle={editingTaskCtx.task.category || 'Tarefa'} 
                    opportunityTitle={editingTaskCtx.projetoData?.nome}
                    organizationId={organizationId} onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { titulo: updated.text, status: updated.status, responsavel: updated.assigneeId, duracaohoras: updated.estimatedHours, datafim: updated.dueDate, datainicio: updated.startDate, category: updated.category });
                        onTaskUpdate(); setEditingTaskCtx(null);
                    }}
                />
            )}
        </div>
    );
};
