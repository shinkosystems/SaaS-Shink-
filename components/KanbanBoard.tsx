
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, DbTask, BpmnTask } from '../types';
import { RefreshCw, Clock, Lock, Trash2, Edit, DollarSign, BarChart3, AlignLeft, User, ChevronDown, Layers, FileText, Cpu, ArrowRight, X, LayoutGrid } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { updateTask, deleteTask } from '../services/projectService';
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
    { id: 'todo', label: 'Backlog', color: 'bg-slate-400', accent: 'bg-slate-500' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500', accent: 'bg-blue-600' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500', accent: 'bg-purple-600' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500', accent: 'bg-orange-600' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500', accent: 'bg-emerald-600' }
];

export const KanbanBoard: React.FC<Props> = ({ tasks, organizationId, readOnly, onRefresh }) => {
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);

    const columnsData = useMemo(() => {
        return COLUMNS.reduce((acc, col) => {
            acc[col.id] = tasks.filter(t => !t.sutarefa && (t.status || 'todo').toLowerCase() === col.id);
            return acc;
        }, {} as Record<string, DbTask[]>);
    }, [tasks]);

    return (
        <div className="flex overflow-x-auto custom-scrollbar bg-transparent p-8 md:p-12">
            <div className="flex gap-8 min-w-max">
                {COLUMNS.map(col => (
                    <div key={col.id} className="w-[320px] flex flex-col space-y-6">
                        {/* HEADER DA COLUNA */}
                        <div className="flex items-center justify-between px-2 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-5 rounded-full ${col.color}`}></div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{col.label}</h3>
                            </div>
                            <div className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-400">
                                {columnsData[col.id]?.length || 0}
                            </div>
                        </div>

                        {/* ÁREA DE CARDS - SEM OVERFLOW INTERNO */}
                        <div className="space-y-5 px-1 pb-10">
                            {columnsData[col.id]?.map(task => (
                                <div 
                                    key={task.id}
                                    onClick={() => setEditingTaskCtx(task)}
                                    className="group relative bg-white dark:bg-[#0c0c0e] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-soft transition-all duration-300 cursor-pointer hover:shadow-2xl hover:border-amber-500/30 hover:-translate-y-1"
                                >
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r-full bg-slate-100 dark:bg-white/5 transition-colors group-hover:bg-amber-500"></div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest truncate max-w-[150px]">{task.projetoData?.nome || 'Avulso'}</span>
                                            <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase mt-0.5">#{task.id}</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/50 flex items-center justify-center overflow-hidden">
                                            {task.responsavelData?.avatar_url ? (
                                                <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-3.5 h-3.5 text-slate-300"/>
                                            )}
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-200 leading-snug line-clamp-3 mb-6">
                                        {task.titulo}
                                    </h4>

                                    <div className="flex items-center justify-between pt-5 border-t border-slate-50 dark:border-white/5">
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3"/>
                                                <span className="text-[9px] font-black">{task.duracaohoras || 2}h</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-amber-500 transition-colors"/>
                                    </div>
                                </div>
                            ))}
                            {columnsData[col.id]?.length === 0 && (
                                <div className="py-16 flex flex-col items-center justify-center text-center opacity-10 border-2 border-dashed border-slate-300 dark:border-white/5 rounded-[2.5rem]">
                                    <LayoutGrid className="w-10 h-10 mb-2"/>
                                    <p className="text-[9px] font-black uppercase">Vazio</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(), text: editingTaskCtx.titulo, description: editingTaskCtx.descricao,
                        category: editingTaskCtx.category, completed: editingTaskCtx.status === 'done', status: editingTaskCtx.status as any, 
                        estimatedHours: editingTaskCtx.duracaohoras, dueDate: editingTaskCtx.datafim, assigneeId: editingTaskCtx.responsavel,
                        dbId: editingTaskCtx.id
                    }}
                    nodeTitle={editingTaskCtx.category || 'Tarefa'}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, status: updated.status, category: updated.category,
                            responsavel: updated.assigneeId, datafim: updated.dueDate, duracaohoras: updated.estimatedHours
                        });
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                />
            )}
        </div>
    );
};
