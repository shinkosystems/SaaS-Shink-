
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, syncTaskChecklist, fetchOrgMembers } from '../services/projectService';
import { fetchOrganizationDetails } from '../services/organizationService';
import { optimizeSchedule } from '../services/geminiService';
import { TaskDetailModal } from './TaskDetailModal';
import { ChevronLeft, ChevronRight, RefreshCw, Sparkles, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: any) => void;
  userRole?: string;
  projectId?: string;
  organizationId?: number;
  activeModules?: string[];
}

type ViewMode = 'day' | 'week' | 'month';

export const CalendarView: React.FC<Props> = ({ 
    opportunities, onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId, activeModules 
}) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationStep, setOptimizationStep] = useState<string>('');
    const [orgCapacity, setOrgCapacity] = useState(8); 
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    const hasAiModule = activeModules?.includes('ia');

    useEffect(() => {
        loadTasks();
        if (organizationId) {
            fetchOrganizationDetails(organizationId).then(org => {
                if (org) setOrgCapacity((org.colaboradores || 1) * 8);
            });
        }
    }, [organizationId, projectId]);

    const loadTasks = async () => {
        setLoading(true);
        if (organizationId) {
            const allTasks = await fetchAllTasks(organizationId);
            setTasks(projectId ? allTasks.filter(t => t.projeto?.toString() === projectId) : allTasks);
        }
        setLoading(false);
    };

    const handleOptimizeWorkload = async () => {
        if (!organizationId) return;
        setIsOptimizing(true);
        setOptimizationStep('Guru analisando carga técnica...');
        try {
            const team = await fetchOrgMembers(organizationId);
            const pendingTasks = tasks.filter(t => !t.sutarefa && t.status !== 'done' && t.status !== 'approval');
            
            if (pendingTasks.length === 0) { 
                setOptimizationStep('Nada para otimizar.'); 
                setTimeout(() => setIsOptimizing(false), 2000); 
                return; 
            }

            const optimizedSchedule = await optimizeSchedule(pendingTasks, team, Math.floor(orgCapacity / (team.length || 1)));
            
            if (optimizedSchedule && optimizedSchedule.length > 0) {
                setOptimizationStep(`Equilibrando ${optimizedSchedule.length} tarefas...`);
                
                await Promise.all(optimizedSchedule.map(item => 
                    updateTask(item.id, { 
                        datainicio: item.startDate, 
                        datafim: item.dueDate,
                        responsavel: item.assigneeId
                    })
                ));
                
                await loadTasks();
                setOptimizationStep(`Cronograma Sincronizado!`);
            } else {
                setOptimizationStep("Operação já otimizada.");
            }
        } catch (error) { 
            console.error(error);
            setOptimizationStep("Erro na IA."); 
        } finally { 
            setTimeout(() => { 
                setIsOptimizing(false); 
                setOptimizationStep(''); 
            }, 3000); 
        }
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const modifier = direction === 'next' ? 1 : -1;
        if (viewMode === 'day') newDate.setDate(newDate.getDate() + modifier);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (modifier * 7));
        else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + modifier);
        setCurrentDate(newDate);
    };

    const viewTitle = useMemo(() => {
        if (viewMode === 'day') {
            const isToday = new Date().toDateString() === currentDate.toDateString();
            return isToday ? 'Hoje' : currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
        }
        if (viewMode === 'week') {
            const start = new Date(currentDate);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `${start.getDate()} - ${end.getDate()} de ${end.toLocaleDateString('pt-BR', { month: 'short' })}`;
        }
        return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }, [currentDate, viewMode]);

    const getDaysInView = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];
        if (viewMode === 'month') {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
            for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
            // Preencher o final para manter o grid de 7 colunas
            while (days.length % 7 !== 0) days.push(null);
        } else if (viewMode === 'week') {
            const curr = new Date(currentDate);
            const first = curr.getDate() - curr.getDay(); 
            for (let i = 0; i < 7; i++) {
                const d = new Date(curr);
                d.setDate(first + i);
                days.push(d);
            }
        } else if (viewMode === 'day') days.push(new Date(currentDate));
        return days;
    }, [currentDate, viewMode]);

    const normalizeDate = (d: Date | string) => {
        const date = new Date(d);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    };

    return (
        <div className="flex flex-col h-full glass-panel rounded-[2.5rem] overflow-hidden shadow-glass border-slate-200 dark:border-white/10 relative transition-all bg-white dark:bg-[#050507]">
            {isOptimizing && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-purple-600 text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-in slide-in-from-top-full shadow-lg">
                    {optimizationStep.includes('Sincronizado') ? <CheckCircle2 className="w-4 h-4"/> : <Loader2 className="w-4 h-4 animate-spin"/>}
                    {optimizationStep}
                </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-white/5 gap-6 shrink-0">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl shadow-inner shrink-0">
                    {['day', 'week', 'month'].map(m => (
                        <button key={m} onClick={() => setViewMode(m as any)} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === m ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-600'}`}>{m === 'day' ? 'Dia' : m === 'week' ? 'Semana' : 'Mês'}</button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={hasAiModule ? handleOptimizeWorkload : undefined}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${hasAiModule ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'}`}
                    >
                        {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                        Otimizar Carga (IA)
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleNavigate('prev')} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-400"><ChevronLeft className="w-5 h-5"/></button>
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest w-48 text-center truncate">{viewTitle}</h2>
                        <button onClick={() => handleNavigate('next')} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-400"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>

            {/* Container principal do calendário que permite scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b border-slate-200 dark:border-white/5 sticky top-0 bg-white/90 dark:bg-[#050507]/90 backdrop-blur-md z-10`}>
                    {viewMode !== 'day' && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.3em]">{day}</div>
                    ))}
                </div>
                
                <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} auto-rows-min gap-[1px] bg-slate-200 dark:bg-white/5`}>
                    {getDaysInView.map((date, i) => {
                        if (!date) return <div key={i} className="bg-slate-50 dark:bg-black/20 opacity-20 min-h-[140px]"></div>;
                        const isToday = new Date().toDateString() === date.toDateString();
                        const currentTimestamp = normalizeDate(date);

                        const dayTasks = tasks.filter(t => {
                            if (t.sutarefa) return false;
                            const start = normalizeDate(t.datainicio || t.dataproposta);
                            const end = normalizeDate(t.datafim || t.dataproposta);
                            return currentTimestamp >= start && currentTimestamp <= end;
                        });

                        const totalH = dayTasks.reduce((a, t) => a + (t.duracaohoras || 0), 0);
                        const perc = Math.min(100, (totalH / orgCapacity) * 100);

                        return (
                            <div key={date.toISOString()} className={`bg-white dark:bg-[#050507] p-3 flex flex-col gap-2 min-h-[140px] transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${isToday ? 'ring-1 ring-inset ring-amber-500/40 bg-amber-500/5' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-xl ${isToday ? 'bg-amber-500 text-black shadow-glow-amber' : 'text-slate-400 dark:text-white/50'}`}>{date.getDate()}</span>
                                    {totalH > 0 && (
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-slate-400 uppercase">{totalH}h / {orgCapacity}h</span>
                                            <div className="w-10 h-1 bg-slate-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                                                <div className={`h-full ${perc > 100 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${perc}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {dayTasks.map(task => {
                                        const isStart = normalizeDate(task.datainicio || task.dataproposta) === currentTimestamp;
                                        const isEnd = normalizeDate(task.datafim || task.dataproposta) === currentTimestamp;
                                        const isDone = task.status === 'done';

                                        return (
                                            <div 
                                                key={task.id} 
                                                onClick={() => setEditingTaskCtx({ 
                                                    task: { 
                                                        ...task, 
                                                        id: task.id.toString(), 
                                                        dbId: task.id,
                                                        text: task.titulo,
                                                        description: task.descricao,
                                                        status: task.status as any, 
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
                                                        gut: { g: task.gravidade, u: task.urgencia, t: task.tendencia }, 
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
                                                })} 
                                                className={`p-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider truncate cursor-pointer transition-all hover:scale-105 active:scale-95 border flex items-center gap-1.5 ${
                                                    isDone 
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                                } ${isStart ? 'border-l-[3px]' : ''} ${isEnd ? 'border-r-[3px]' : ''}`}
                                            >
                                                {isStart && <div className="w-1 h-1 rounded-full bg-current"></div>}
                                                <span className="flex-1 truncate">{task.titulo}</span>
                                                {isEnd && <ArrowRight className="w-2 h-2 opacity-60"/>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={editingTaskCtx.task} nodeTitle={editingTaskCtx.nodeLabel} opportunityTitle={editingTaskCtx.nodeLabel}
                    organizationId={organizationId} onClose={() => setEditingTaskCtx(null)}
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
                        loadTasks();
                    }}
                />
            )}
        </div>
    );
};
