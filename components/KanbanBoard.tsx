
import React, { useState, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { RefreshCw, Clock, Lock, Trash2, Edit, DollarSign } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { updateTask, deleteTask, syncTaskChecklist, fetchOrgMembers } from '../services/projectService';
import { getOperationalRates } from '../services/financialService';

interface Props {
  tasks: DbTask[]; 
  onSelectOpportunity: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number; 
  readOnly?: boolean;
  onRefresh?: () => void;
}

const COLUMNS = [
    { id: 'todo', label: 'Backlog', color: 'bg-slate-400' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<Props> = ({ tasks, organizationId, readOnly, onRefresh }) => {
    const [draggedTask, setDraggedTask] = useState<DbTask | null>(null);
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);
    const [rates, setRates] = useState<any>(null);

    useEffect(() => {
        if (organizationId) {
            getOperationalRates(organizationId).then(setRates);
        }
    }, [organizationId]);

    const handleStatusChange = async (task: DbTask, newStatus: string) => {
        if (readOnly) return;
        const now = new Date().toISOString();
        const updates: any = { status: newStatus };
        const dateFields: Record<string, string> = {
            todo: 'dataafazer', doing: 'datafazendo', review: 'datarevisao', approval: 'dataaprovacao', done: 'dataconclusao'
        };
        if (dateFields[newStatus]) updates[dateFields[newStatus]] = now;
        await updateTask(task.id, updates);
        if (onRefresh) onRefresh();
    };

    const columnsData = COLUMNS.reduce((acc, col) => {
        const filtered = tasks.filter(t => !t.sutarefa && (t.status || 'todo').toLowerCase() === col.id);
        acc[col.id] = filtered.sort((a, b) => {
            const dateA = a.datafim ? new Date(a.datafim).getTime() : Infinity;
            const dateB = b.datafim ? new Date(b.datafim).getTime() : Infinity;
            return dateA - dateB;
        });
        return acc;
    }, {} as Record<string, DbTask[]>);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-x-auto custom-scrollbar p-6">
                <div className="flex gap-6 h-full min-w-[1300px]">
                    {COLUMNS.map(col => (
                        <div key={col.id} onDragOver={e => !readOnly && e.preventDefault()} onDrop={() => !readOnly && draggedTask && handleStatusChange(draggedTask, col.id)} className="flex-1 min-w-[280px] flex flex-col h-full bg-slate-100/30 dark:bg-white/[0.01] rounded-[2rem] border border-slate-200/50 dark:border-white/5 p-3">
                            <div className="flex items-center justify-between mb-4 px-3 py-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{col.label}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400">{columnsData[col.id]?.length || 0}</span>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar px-1">
                                {columnsData[col.id]?.map(task => {
                                    const score = (task.gravidade || 1) * (task.urgencia || 1) * (task.tendencia || 1);
                                    const productionCost = (task.duracaohoras || 2) * (rates?.totalRate || 0);
                                    
                                    return (
                                        <div key={task.id} draggable={!readOnly} onDragStart={() => setDraggedTask(task)} onDragEnd={() => setDraggedTask(null)} onClick={() => setEditingTaskCtx(task)} className="bg-white dark:bg-[#0a0a0c] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-amber-500/30 transition-all cursor-grab active:cursor-grabbing group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest truncate max-w-[140px]">{task.projetoData?.nome || 'Ad-hoc'}</div>
                                                    <div className="text-[7px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 opacity-60">ID: {task.id}</div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${score >= 60 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>GUT {score}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-white leading-relaxed line-clamp-3 mb-4">{task.titulo}</div>
                                            
                                            <div className="flex flex-col gap-2 mb-4">
                                                <div className="flex items-center justify-between text-[9px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
                                                    <span className="flex items-center gap-1 uppercase tracking-widest"><DollarSign className="w-2.5 h-2.5"/> Custo ABC</span>
                                                    <span>R$ {productionCost.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 dark:text-white overflow-hidden shadow-inner">
                                                    {task.responsavelData?.avatar_url ? <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover"/> : task.responsavelData?.nome?.charAt(0)}
                                                </div>
                                                {task.datafim && (
                                                    <div className={`text-[8px] font-black uppercase flex items-center gap-1 ${new Date(task.datafim) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-slate-400'}`}>
                                                        <Clock className="w-2.5 h-2.5"/> 
                                                        {new Date(task.datafim).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(), text: editingTaskCtx.titulo, description: editingTaskCtx.descricao,
                        category: editingTaskCtx.category,
                        completed: editingTaskCtx.status === 'done', status: editingTaskCtx.status as any, estimatedHours: editingTaskCtx.duracaohoras,
                        dueDate: editingTaskCtx.datafim, 
                        startDate: editingTaskCtx.datainicio, 
                        assigneeId: editingTaskCtx.responsavel,
                        gut: { g: editingTaskCtx.gravidade, u: editingTaskCtx.urgencia, t: editingTaskCtx.tendencia },
                        dbId: editingTaskCtx.id
                    }}
                    opportunityTitle={editingTaskCtx.projetoData?.nome}
                    nodeTitle={editingTaskCtx.category || 'Tarefa'}
                    organizationId={organizationId} onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, 
                            status: updated.status, 
                            category: updated.category,
                            responsavel: updated.assigneeId,
                            datafim: updated.dueDate,
                            duracaohoras: updated.estimatedHours, 
                            gravidade: updated.gut?.g, 
                            urgencia: updated.gut?.u, 
                            tendencia: updated.gut?.t 
                        });
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onRefresh?.();
                        setEditingTaskCtx(null);
                    }}
                />
            )}
        </div>
    );
};
