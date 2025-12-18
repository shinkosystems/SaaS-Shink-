
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, TaskStatus, DbTask } from '../types';
import { RefreshCw, Clock, Briefcase } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { fetchAllTasks, updateTask, syncTaskChecklist } from '../services/projectService';

interface Props {
  onSelectOpportunity: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number; 
  currentPlan?: string;
  activeModules?: string[];
  projectId?: string;
}

const COLUMNS = [
    { id: 'todo', label: 'Backlog', color: 'bg-slate-400' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<Props> = ({ organizationId, projectId }) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedTask, setDraggedTask] = useState<DbTask | null>(null);
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);

    useEffect(() => { loadData(); }, [organizationId, projectId]);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchAllTasks(organizationId);
        if (projectId) {
            setTasks(data.filter(t => t.projeto?.toString() === projectId));
        } else {
            setTasks(data);
        }
        setLoading(false);
    };

    const handleStatusChange = async (task: DbTask, newStatus: string) => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await updateTask(task.id, { status: newStatus });
    };

    const columnsData = useMemo(() => {
        const cols: Record<string, DbTask[]> = { todo: [], doing: [], review: [], approval: [], done: [] };
        tasks.filter(t => !t.sutarefa).forEach(t => { 
            const st = t.status?.toLowerCase() || 'todo';
            if (cols[st]) cols[st].push(t);
        });
        return cols;
    }, [tasks]);

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-700 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Fluxo de <span className="text-amber-500">Trabalho</span>.</h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.25em] mt-3">Operação Técnica Shinkō Engine</p>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={loadData} className="p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-white transition-all shadow-sm">
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar pb-8">
                <div className="flex gap-8 h-full min-w-[1300px]">
                    {COLUMNS.map(col => (
                        <div 
                            key={col.id} 
                            onDragOver={e => e.preventDefault()} 
                            onDrop={() => draggedTask && handleStatusChange(draggedTask, col.id)}
                            className="flex-1 min-w-[280px] flex flex-col h-full group"
                        >
                            <div className="flex items-center justify-between mb-6 px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${col.color} shadow-[0_0_10px_currentcolor]`}></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-white/60">{col.label}</span>
                                </div>
                                <span className="text-[10px] font-black px-2 py-1 bg-white/50 dark:bg-white/5 rounded-lg text-slate-400">{columnsData[col.id]?.length || 0}</span>
                            </div>

                            <div className={`flex-1 space-y-4 p-3 rounded-[2.5rem] transition-all duration-500 ${draggedTask ? 'bg-amber-500/5 ring-2 ring-dashed ring-amber-500/20' : 'bg-transparent'}`}>
                                {columnsData[col.id]?.map(task => (
                                    <div 
                                        key={task.id} 
                                        draggable 
                                        onDragStart={() => setDraggedTask(task)} 
                                        onDragEnd={() => setDraggedTask(null)}
                                        onClick={() => setEditingTaskCtx(task)}
                                        className="glass-card p-6 border-slate-200 dark:border-white/5 hover:border-amber-500/30 cursor-pointer group/card transition-all active:scale-[0.98]"
                                    >
                                        <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3 truncate opacity-80">{task.projetoData?.nome || 'Ad-hoc'}</div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-white mb-6 leading-relaxed line-clamp-3 group-hover/card:text-amber-500 transition-colors">{task.titulo}</div>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-white overflow-hidden shadow-sm">
                                                    {task.responsavelData?.avatar_url ? <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover"/> : task.responsavelData?.nome?.charAt(0)}
                                                </div>
                                            </div>
                                            {task.datafim && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    <Clock className="w-3 h-3"/> {new Date(task.datafim).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(),
                        text: editingTaskCtx.titulo,
                        description: editingTaskCtx.descricao,
                        completed: editingTaskCtx.status === 'done',
                        status: editingTaskCtx.status as any,
                        estimatedHours: editingTaskCtx.duracaohoras,
                        dueDate: editingTaskCtx.datafim,
                        assigneeId: editingTaskCtx.responsavel,
                        members: editingTaskCtx.membros || [],
                        gut: { g: editingTaskCtx.gravidade, u: editingTaskCtx.urgencia, t: editingTaskCtx.tendencia },
                        subtasks: tasks
                            .filter(t => (t.tarefamae === editingTaskCtx.id || t.tarefa === editingTaskCtx.id) && t.sutarefa)
                            .map(t => ({
                                id: t.id.toString(),
                                text: t.titulo,
                                completed: t.status === 'done',
                                dbId: t.id
                            }))
                    }}
                    nodeTitle={editingTaskCtx.projetoData?.nome || 'Tarefa'}
                    organizationId={organizationId}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), {
                            titulo: updated.text,
                            descricao: updated.description,
                            status: updated.status,
                            responsavel: updated.assigneeId,
                            membros: updated.members,
                            duracaohoras: updated.estimatedHours,
                            datafim: updated.dueDate,
                            gravidade: updated.gut?.g,
                            urgencia: updated.gut?.u,
                            tendencia: updated.gut?.t
                        });
                        if (updated.subtasks && organizationId) {
                            await syncTaskChecklist(Number(updated.id), updated.subtasks, organizationId, Number(editingTaskCtx.projeto), updated.assigneeId);
                        }
                        loadData();
                    }}
                />
            )}
        </div>
    );
};
