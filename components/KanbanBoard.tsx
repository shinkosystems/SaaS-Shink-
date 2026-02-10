
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, DbTask, BpmnTask } from '../types';
import { RefreshCw, Clock, Lock, Trash2, Edit, DollarSign, BarChart3, AlignLeft, User, ChevronDown, Layers, FileText, Cpu, ArrowRight, X } from 'lucide-react';
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
    { id: 'todo', label: 'Backlog', color: 'bg-slate-400', border: 'border-slate-400' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500', border: 'border-blue-500' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500', border: 'border-purple-500' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500', border: 'border-orange-500' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500', border: 'border-emerald-500' }
];

export const KanbanBoard: React.FC<Props> = ({ tasks, organizationId, readOnly, onRefresh }) => {
    const [draggedTask, setDraggedTask] = useState<DbTask | null>(null);
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);
    const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
    const [flippedTaskId, setFlippedTaskId] = useState<number | null>(null);
    const [activeStatusMobile, setActiveStatusMobile] = useState<string>('doing');
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

    const handleCardClick = (task: DbTask) => {
        if (activeTaskId === task.id) {
            // Segundo clique: Inicia a animação de vira-página (Flip)
            setFlippedTaskId(task.id);
            
            // Aguarda o fim da animação de giro para abrir o modal
            setTimeout(() => {
                setEditingTaskCtx(task);
            }, 500);
        } else {
            // Primeiro clique: Apenas destaca o card
            setActiveTaskId(task.id);
            setFlippedTaskId(null);
        }
    };

    const handleCloseModal = () => {
        setEditingTaskCtx(null);
        // Após fechar o modal, desvira o card no Kanban
        setTimeout(() => {
            setFlippedTaskId(null);
            setActiveTaskId(null);
        }, 300);
    };

    const handleDeleteDirect = async (e: React.MouseEvent, taskId: number) => {
        e.stopPropagation();
        if (readOnly) return;
        if (confirm("Deseja permanentemente excluir esta tarefa?")) {
            const success = await deleteTask(taskId);
            if (success && onRefresh) onRefresh();
        }
    };

    const columnsData = useMemo(() => {
        return COLUMNS.reduce((acc, col) => {
            const filtered = tasks.filter(t => !t.sutarefa && (t.status || 'todo').toLowerCase() === col.id);
            acc[col.id] = filtered.sort((a, b) => {
                const dateA = a.datafim ? new Date(a.datafim).getTime() : Infinity;
                const dateB = b.datafim ? new Date(b.datafim).getTime() : Infinity;
                return dateA - dateB;
            });
            return acc;
        }, {} as Record<string, DbTask[]>);
    }, [tasks]);

    const STACK_OFFSET = 75;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-transparent" onClick={() => { setActiveTaskId(null); setFlippedTaskId(null); }}>
            
            {/* Seletor Status Mobile */}
            <div className="lg:hidden px-6 py-4 bg-white dark:bg-black/20 border-b border-slate-200 dark:border-white/5 shrink-0 z-30" onClick={e => e.stopPropagation()}>
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                    {COLUMNS.map(col => (
                        <button
                            key={col.id}
                            onClick={() => setActiveStatusMobile(col.id)}
                            className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                                ${activeStatusMobile === col.id ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}
                            `}
                        >
                            {col.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto lg:overflow-x-auto overflow-y-auto custom-scrollbar p-6 lg:p-10">
                
                {/* DESKTOP VIEW */}
                <div className="hidden lg:flex gap-8 h-full min-w-[1400px]">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="flex-1 min-w-[320px] flex flex-col h-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6 px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{col.label}</h3>
                                </div>
                                <span className="text-[10px] font-black bg-slate-200 dark:bg-white/5 text-slate-500 px-2 py-0.5 rounded-md">{columnsData[col.id]?.length || 0}</span>
                            </div>

                            <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar px-1 pb-10">
                                {columnsData[col.id]?.map(task => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        readOnly={readOnly}
                                        isActive={activeTaskId === task.id}
                                        isFlipped={flippedTaskId === task.id}
                                        onDragStart={() => setDraggedTask(task)}
                                        onClick={(e: any) => { e.stopPropagation(); handleCardClick(task); }}
                                        onDelete={handleDeleteDirect}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* MOBILE VIEW (STACKED) */}
                <div className="lg:hidden relative w-full pb-32" style={{ minHeight: `${(columnsData[activeStatusMobile]?.length || 0) * STACK_OFFSET + 300}px` }}>
                    {columnsData[activeStatusMobile]?.length > 0 ? (
                        columnsData[activeStatusMobile].map((task, idx) => (
                            <div 
                                key={task.id}
                                className="absolute left-0 w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{ 
                                    transform: `translateY(${idx * STACK_OFFSET}px)`, 
                                    zIndex: activeTaskId === task.id ? 100 : idx + 10 
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <TaskCard 
                                    task={task} 
                                    readOnly={readOnly}
                                    isActive={activeTaskId === task.id}
                                    isFlipped={flippedTaskId === task.id}
                                    onClick={(e: any) => { e.stopPropagation(); handleCardClick(task); }}
                                    onDelete={handleDeleteDirect}
                                    isStacked={true}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-40 opacity-30 text-center gap-4">
                            <Layers className="w-12 h-12"/>
                            <span className="text-[10px] font-black uppercase tracking-widest">Vazio</span>
                        </div>
                    )}
                </div>
            </div>

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(), text: editingTaskCtx.titulo, description: editingTaskCtx.descricao,
                        category: editingTaskCtx.category, completed: editingTaskCtx.status === 'done', status: editingTaskCtx.status as any, 
                        estimatedHours: editingTaskCtx.duracaohoras, dueDate: editingTaskCtx.datafim, assigneeId: editingTaskCtx.responsavel,
                        gut: { g: editingTaskCtx.gravidade || 1, u: editingTaskCtx.urgencia || 1, t: editingTaskCtx.tendencia || 1 },
                        dbId: editingTaskCtx.id, anexos: editingTaskCtx.anexos
                    }}
                    opportunityTitle={editingTaskCtx.projetoData?.nome || 'PROJETO ATIVO'}
                    nodeTitle={editingTaskCtx.category || 'Tarefa'}
                    organizationId={organizationId} 
                    onClose={handleCloseModal}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, status: updated.status, category: updated.category,
                            responsavel: updated.assigneeId, datafim: updated.dueDate, duracaohoras: updated.estimatedHours, 
                            gravidade: updated.gut?.g, urgencia: updated.gut?.u, tendencia: updated.gut?.t, descricao: updated.description
                        });
                        onRefresh?.(); handleCloseModal();
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onRefresh?.(); handleCloseModal();
                    }}
                />
            )}

            <style>{`
                .perspective-container { perspective: 1200px; }
                .card-3d-inner { 
                    position: relative;
                    width: 100%;
                    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    transform-style: preserve-3d;
                }
                .is-flipped { transform: rotateY(180deg); }
                .card-face {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                    top: 0;
                    left: 0;
                }
                .card-back {
                    transform: rotateY(180deg);
                    background: #0a0a0b;
                    border: 1px solid rgba(245, 158, 11, 0.3);
                }
            `}</style>
        </div>
    );
};

const TaskCard = ({ task, readOnly, onClick, onDelete, onDragStart, isStacked, isActive, isFlipped }: any) => {
    const getStatusColor = (status: string) => {
        switch(status) {
            case 'done': return 'bg-emerald-500';
            case 'doing': return 'bg-blue-500';
            case 'review': return 'bg-purple-500';
            case 'approval': return 'bg-orange-500';
            default: return 'bg-slate-300 dark:bg-slate-700';
        }
    };

    const g = task.gravidade || 1;
    const u = task.urgencia || 1;
    const t = task.tendencia || 1;
    const score = g * u * t;

    return (
        <div 
            className={`perspective-container w-full h-[220px] lg:h-[240px] ${isActive ? 'z-50' : 'z-10'}`}
            style={{ pointerEvents: 'auto' }}
        >
            <div 
                className={`card-3d-inner h-full ${isFlipped ? 'is-flipped' : ''}`}
                onClick={onClick}
            >
                {/* LADO A: FRENTE DO CARD */}
                <div className={`card-face card-front bg-white dark:bg-[#0c0c0e] p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border flex flex-col transition-all duration-300 ${isActive ? 'scale-[1.05] shadow-2xl border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-white/5 shadow-soft hover:border-amber-500/40'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(task.status)} ${isActive ? 'opacity-100' : 'opacity-80'}`}></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest truncate">{task.projetoData?.nome || 'Ad-hoc'}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">#{task.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black border ${score >= 60 ? 'bg-red-500/10 text-red-500' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}>
                                {g}/{u}/{t}
                            </div>
                            {!readOnly && <button onClick={(e) => onDelete(e, task.id)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5"/></button>}
                        </div>
                    </div>

                    <h4 className={`text-sm lg:text-base font-black tracking-tight mb-6 line-clamp-2 ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{task.titulo}</h4>

                    <div className="mt-auto pt-5 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10">
                                {task.responsavelData?.avatar_url ? <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-slate-400"/>}
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase">{task.duracaohoras || 2}h</span>
                        </div>
                        {isActive && !isFlipped && <div className="animate-bounce"><ChevronDown className="w-4 h-4 text-amber-500"/></div>}
                    </div>
                </div>

                {/* LADO B: VERSO DO CARD (TECHNICAL VIEW) */}
                <div className="card-face card-back p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-glow-amber">
                        <Cpu className="w-8 h-8"/>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Modo de Engenharia</h4>
                        <p className="text-slate-400 text-[9px] font-bold uppercase mt-2">Acessando Lógica de Ativo...</p>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KanbanBoard;
