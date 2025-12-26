import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, fetchAssignableUsers } from '../services/projectService';
import { optimizeSchedule } from '../services/geminiService';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    ChevronLeft, ChevronRight, RefreshCw, Zap, Loader2, 
    ArrowRight, Calendar, Info, CheckCircle2, Layout
} from 'lucide-react';

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
                id: t.id, 
                titulo: t.titulo, 
                duracaohoras: t.duracaohoras, 
                responsavel: t.responsavel
            }));
            const updates = await optimizeSchedule(tasksForAi, devs);
            if (updates && updates.length > 0) {
                for (const update of updates) {
                    await updateTask(update.id, { datainicio: update.startDate, datafim: update.dueDate });
                }
                loadData();
            }
        } catch (e) { alert("Erro ao otimizar cronograma."); } finally { setIsOptimizing(false); }
    };

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

    const getTaskProgress = (task: DbTask) => {
        if (task.status === 'done' || task.status === 'approval') return 100;
        if (task.status === 'todo') return 0;
        return 50;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#020203] rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl gap-6 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all shadow-sm"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
                        <div className="px-6 flex flex-col items-center justify-center min-w-[160px]">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">{viewDate.getFullYear()}</span>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {viewDate.toLocaleDateString('pt-BR', { month: 'long' })}
                            </h2>
                        </div>
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all shadow-sm"><ChevronRight className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    <button onClick={loadData} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:scale-105 transition-all">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`}/>
                    </button>
                </div>
                
                <button 
                    onClick={handleOptimize} 
                    disabled={isOptimizing}
                    className="flex items-center gap-3 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                    {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                    IA Smart Schedule
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-black/20 relative">
                <div className="min-w-[1400px]">
                    
                    <div 
                        className="sticky top-0 z-40 grid border-b border-slate-200 dark:border-white/5 bg-slate-50/95 dark:bg-[#0a0a0c]/95 backdrop-blur-xl"
                        style={{ gridTemplateColumns: `280px repeat(${daysInMonth.length}, 1fr)` }}
                    >
                        <div className="p-6 border-r border-slate-200 dark:border-white/5 sticky left-0 z-50 bg-slate-50 dark:bg-[#0a0a0c]">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Roadmap / Iniciativas</span>
                        </div>
                        {daysInMonth.map(d => {
                            const isToday = new Date().toDateString() === d.toDateString();
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                                <div key={d.toISOString()} className={`h-20 border-r border-slate-200 dark:border-white/5 flex flex-col items-center justify-center transition-colors ${isToday ? 'bg-amber-500/10' : isWeekend ? 'bg-black/[0.02]' : ''}`}>
                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                    </span>
                                    <span className={`text-sm font-black mt-1 ${isToday ? 'text-amber-500 bg-amber-500/10 w-8 h-8 flex items-center justify-center rounded-full border border-amber-500/20' : 'text-slate-700 dark:text-slate-400'}`}>
                                        {d.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pb-20">
                        {groupedTasks.map(([pId, project]) => (
                            <React.Fragment key={pId}>
                                <div 
                                    className="grid border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02] sticky top-20 z-10"
                                    style={{ gridTemplateColumns: `280px repeat(${daysInMonth.length}, 1fr)` }}
                                >
                                    <div className="p-4 border-r border-slate-200 dark:border-white/10 sticky left-0 z-20 bg-slate-100 dark:bg-[#111113] flex items-center gap-3">
                                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: project.color }}></div>
                                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{project.name}</span>
                                    </div>
                                    {daysInMonth.map((_, idx) => (
                                        <div key={idx} className="border-r border-slate-200 dark:border-white/[0.03] h-12"></div>
                                    ))}
                                </div>

                                {project.tasks.map(task => {
                                    const startCol = getGridColumn(task.datainicio || task.dataproposta);
                                    const endCol = getGridColumn(task.datafim || task.dataproposta, true);
                                    const isVisible = startCol !== null && endCol !== null;
                                    const progress = getTaskProgress(task);

                                    return (
                                        <div 
                                            key={task.id} 
                                            className="grid border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group h-14 relative"
                                            style={{ gridTemplateColumns: `280px repeat(${daysInMonth.length}, 1fr)` }}
                                        >
                                            <div className="p-4 border-r border-slate-200 dark:border-white/10 sticky left-0 z-20 bg-white dark:bg-[#020203] flex items-center overflow-hidden">
                                                <span 
                                                    className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate cursor-pointer hover:text-amber-500 transition-colors pl-4"
                                                    onClick={() => setEditingTaskCtx(task)}
                                                >
                                                    {task.titulo}
                                                </span>
                                            </div>

                                            {daysInMonth.map((d, idx) => {
                                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                return <div key={idx} className={`border-r border-slate-100 dark:border-white/[0.03] h-full ${isWeekend ? 'bg-black/[0.01]' : ''}`}></div>
                                            })}

                                            {isVisible && (
                                                <div 
                                                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full z-10 border border-white/10 flex items-center cursor-pointer transition-all hover:scale-[1.01] overflow-hidden group shadow-lg ${
                                                        task.status === 'done' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 
                                                        task.status === 'doing' ? 'bg-blue-500/20 text-blue-500 border-blue-500/20' : 
                                                        'bg-amber-500/20 text-amber-500 border-amber-500/20'
                                                    }`}
                                                    style={{ 
                                                        gridColumnStart: startCol, 
                                                        gridColumnEnd: endCol,
                                                        left: '4px',
                                                        right: '4px',
                                                        position: 'relative',
                                                        marginLeft: '-280px'
                                                    }}
                                                    onClick={() => setEditingTaskCtx(task)}
                                                >
                                                    <div 
                                                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ${
                                                            task.status === 'done' ? 'bg-emerald-500' : 
                                                            task.status === 'doing' ? 'bg-blue-500' : 
                                                            'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${progress}%`, opacity: 0.8 }}
                                                    ></div>
                                                    
                                                    <div className="relative z-10 w-full px-3 flex items-center justify-between">
                                                        <span className="text-[9px] font-black uppercase tracking-tight truncate drop-shadow-sm text-slate-900 dark:text-white">
                                                            {task.titulo}
                                                        </span>
                                                        <span className="text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 px-1.5 rounded">{progress}%</span>
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
                    task={{...editingTaskCtx, id: editingTaskCtx.id.toString(), text: editingTaskCtx.titulo}} 
                    nodeTitle="Tarefa" 
                    organizationId={organizationId} 
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), {
                            titulo: updated.text, 
                            status: updated.status, 
                            datafim: updated.dueDate, 
                            datainicio: updated.startDate
                        });
                        loadData();
                    }}
                />
            )}
        </div>
    );
};