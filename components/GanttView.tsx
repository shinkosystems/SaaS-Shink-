
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, fetchAssignableUsers } from '../services/projectService';
import { optimizeSchedule } from '../services/geminiService';
import { TaskDetailModal } from './TaskDetailModal';
import { ChevronLeft, ChevronRight, RefreshCw, Zap, Loader2, ArrowRight } from 'lucide-react';

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

    // Função para calcular a coluna do grid para uma data
    const getGridColumn = (dateStr: string | null | undefined, isEnd = false) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

        if (date < monthStart && !isEnd) return 2; // Começa na primeira coluna de dias (col 2)
        if (date > monthEnd && isEnd) return daysInMonth.length + 2; // Termina após a última coluna
        if (date < monthStart || date > monthEnd) return null;

        // +2 porque a col 1 é a sidebar e o grid é 1-indexed
        return date.getDate() + 1 + (isEnd ? 1 : 0);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#020203] rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
            {/* Toolbar Superior */}
            <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/40 gap-6 shrink-0 z-30">
                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-200 dark:bg-white/5 p-1 rounded-2xl border border-slate-300 dark:border-white/10">
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest w-48 text-center flex items-center justify-center">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    <button onClick={loadData} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:scale-105 active:scale-95 transition-all"><RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`}/></button>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleOptimize} 
                        disabled={isOptimizing}
                        className="flex items-center gap-3 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        IA Scheduler
                    </button>
                </div>
            </div>

            {/* Gantt Container com Grid Unificado */}
            <div className="flex-1 overflow-x-auto custom-scrollbar bg-white dark:bg-[#020203]">
                <div className="min-w-[1600px] flex flex-col h-full">
                    
                    {/* Header Row (Sticky) */}
                    <div 
                        className="sticky top-0 z-40 grid border-b border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-[#0a0a0c]/95 backdrop-blur-xl"
                        style={{ gridTemplateColumns: `320px repeat(${daysInMonth.length}, 1fr)` }}
                    >
                        <div className="p-5 border-r border-slate-200 dark:border-white/10 sticky left-0 z-50 bg-slate-50 dark:bg-[#0a0a0c]">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Snapshot / Iniciativa</span>
                        </div>
                        {daysInMonth.map(d => {
                            const isToday = new Date().toDateString() === d.toDateString();
                            return (
                                <div key={d.toISOString()} className={`h-16 border-r border-slate-200 dark:border-white/5 flex flex-col items-center justify-center transition-colors ${isToday ? 'bg-amber-500/10' : ''}`}>
                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                    </span>
                                    <span className={`text-xs font-black mt-0.5 ${isToday ? 'text-amber-500 underline underline-offset-4 decoration-2' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {d.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Task Rows */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {tasks.filter(t => !t.sutarefa).map(task => {
                            const startCol = getGridColumn(task.datainicio || task.dataproposta);
                            const endCol = getGridColumn(task.datafim || task.dataproposta, true);
                            const isVisible = startCol !== null && endCol !== null;

                            return (
                                <div 
                                    key={task.id} 
                                    className="grid border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group h-16 relative"
                                    style={{ gridTemplateColumns: `320px repeat(${daysInMonth.length}, 1fr)` }}
                                >
                                    {/* Sidebar Label */}
                                    <div className="p-4 border-r border-slate-200 dark:border-white/10 sticky left-0 z-20 bg-white dark:bg-[#020203] flex flex-col justify-center overflow-hidden">
                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block mb-0.5 truncate">{task.projetoData?.nome || 'AD-HOC'}</span>
                                        <span 
                                            className="text-[11px] font-bold text-slate-800 dark:text-white truncate cursor-pointer hover:text-amber-500 transition-colors"
                                            onClick={() => setEditingTaskCtx(task)}
                                        >
                                            {task.titulo}
                                        </span>
                                    </div>

                                    {/* Grid Background Lines */}
                                    {daysInMonth.map((_, idx) => (
                                        <div key={idx} className="border-r border-slate-100 dark:border-white/[0.03] h-full"></div>
                                    ))}

                                    {/* Task Bar - Posicionada por Grid Columns */}
                                    {isVisible && (
                                        <div 
                                            className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-full z-10 border border-white/20 flex items-center px-4 cursor-pointer transition-all hover:scale-[1.01] hover:brightness-110 shadow-lg ${
                                                task.status === 'done' ? 'bg-emerald-500 shadow-emerald-500/20' : 
                                                task.status === 'doing' ? 'bg-blue-500 shadow-blue-500/20 shadow-glow-blue' : 
                                                'bg-amber-500 shadow-amber-500/20 shadow-glow-amber'
                                            }`}
                                            style={{ 
                                                gridColumnStart: startCol, 
                                                gridColumnEnd: endCol,
                                                left: '4px',
                                                right: '4px',
                                                width: 'auto',
                                                position: 'relative', // Mantém dentro do container do grid após a sidebar
                                                marginLeft: '-320px' // Compensação manual para o container do grid
                                            }}
                                            onClick={() => setEditingTaskCtx(task)}
                                        >
                                            <span className="text-[8px] font-black text-white uppercase tracking-tight truncate">{task.titulo}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
