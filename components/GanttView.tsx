
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, DbTask } from '../types';
import { fetchAllTasks, updateTask, deleteTask } from '../services/projectService';
import { TaskDetailModal } from './TaskDetailModal';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

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
    const [viewDate, setViewDate] = useState(new Date());
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = Day, 0.5 = Week
    const [editingTaskCtx, setEditingTaskCtx] = useState<any | null>(null);

    useEffect(() => {
        loadData();
    }, [organizationId, projectId]);

    const loadData = async () => {
        setLoading(true);
        if (organizationId) {
            const allTasks = await fetchAllTasks(organizationId);
            if (projectId) {
                setTasks(allTasks.filter(t => t.projeto?.toString() === projectId));
            } else {
                setTasks(allTasks);
            }
        }
        setLoading(false);
    };

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    }, [viewDate]);

    const getTaskStyle = (task: DbTask) => {
        const start = task.datainicio ? new Date(task.datainicio) : new Date(task.dataproposta);
        const end = task.datafim ? new Date(task.datafim) : start;
        
        const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

        // Simple overlap check
        if (end < monthStart || start > monthEnd) return null;

        // Calculate position relative to view month
        const dayWidth = 100 / daysInMonth.length;
        
        let startDay = start.getDate();
        if (start < monthStart) startDay = 1;

        let endDay = end.getDate();
        if (end > monthEnd) endDay = daysInMonth.length;

        const duration = Math.max(1, endDay - startDay + 1);
        const left = (startDay - 1) * dayWidth;
        const width = duration * dayWidth;

        let colorClass = 'bg-blue-500';
        if (task.status === 'done') colorClass = 'bg-emerald-500';
        else if (task.status === 'doing') colorClass = 'bg-amber-500';
        else if (new Date(task.datafim || '') < new Date() && task.status !== 'done') colorClass = 'bg-red-500';

        return {
            left: `${left}%`,
            width: `${width}%`,
            className: colorClass
        };
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-5 h-5"/></button>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize w-32 text-center">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                    <button onClick={loadData} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/></button>
                </div>
            </div>

            {/* Gantt Chart */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {/* Header Row */}
                <div className="flex sticky top-0 z-10 bg-slate-50 dark:bg-black border-b border-slate-200 dark:border-white/10 min-w-[800px]">
                    <div className="w-64 p-3 font-bold text-xs text-slate-500 uppercase shrink-0 bg-slate-50 dark:bg-black sticky left-0 z-20 border-r border-slate-200 dark:border-white/10">Tarefa</div>
                    <div className="flex-1 flex">
                        {daysInMonth.map(d => (
                            <div key={d.toISOString()} className="flex-1 border-r border-slate-200 dark:border-white/5 min-w-[30px] text-center py-2 text-[10px] text-slate-400">
                                {d.getDate()}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Task Rows */}
                <div className="min-w-[800px]">
                    {tasks.map(task => {
                        const style = getTaskStyle(task);
                        return (
                            <div key={task.id} className="flex border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 group">
                                <div className="w-64 p-3 text-sm font-medium text-slate-700 dark:text-slate-300 truncate shrink-0 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-white/5 group-hover:bg-slate-50 dark:group-hover:bg-transparent">
                                    <div className="truncate cursor-pointer hover:text-blue-500" onClick={() => setEditingTaskCtx({ task: {
                                        id: task.id.toString(),
                                        text: task.titulo,
                                        description: task.descricao,
                                        status: task.status as any,
                                        startDate: task.datainicio,
                                        dueDate: task.datafim,
                                        assigneeId: task.responsavel,
                                        estimatedHours: task.duracaohoras,
                                        completed: task.status === 'done',
                                        gut: { g: task.gravidade, u: task.urgencia, t: task.tendencia },
                                        tags: task.etiquetas || [],
                                        members: task.membros || [],
                                        attachments: task.anexos || [],
                                        dbId: task.id
                                    }, nodeLabel: task.projetoData?.nome || 'Tarefa' })}>
                                        {task.titulo}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">{task.projetoData?.nome}</div>
                                </div>
                                <div className="flex-1 relative h-12">
                                    {daysInMonth.map(d => (
                                        <div key={d.toISOString()} className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-white/5" style={{ left: `${(d.getDate() - 1) * (100 / daysInMonth.length)}%`, width: `${100 / daysInMonth.length}%` }}></div>
                                    ))}
                                    {style && (
                                        <div 
                                            className={`absolute top-2.5 h-7 rounded-md shadow-sm cursor-pointer opacity-90 hover:opacity-100 transition-all ${style.className}`}
                                            style={{ left: style.left, width: style.width }}
                                            onClick={() => setEditingTaskCtx({ task: {
                                                id: task.id.toString(),
                                                text: task.titulo,
                                                description: task.descricao,
                                                status: task.status as any,
                                                startDate: task.datainicio,
                                                dueDate: task.datafim,
                                                assigneeId: task.responsavel,
                                                estimatedHours: task.duracaohoras,
                                                completed: task.status === 'done',
                                                gut: { g: task.gravidade, u: task.urgencia, t: task.tendencia },
                                                tags: task.etiquetas || [],
                                                members: task.membros || [],
                                                attachments: task.anexos || [],
                                                dbId: task.id
                                            }, nodeLabel: task.projetoData?.nome || 'Tarefa' })}
                                        >
                                            <div className="px-2 py-1 text-[10px] text-white font-bold truncate">
                                                {task.responsavelData?.nome?.split(' ')[0]}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal */}
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={editingTaskCtx.task}
                    nodeTitle={editingTaskCtx.nodeLabel}
                    opportunityTitle={editingTaskCtx.nodeLabel}
                    organizationId={organizationId}
                    onClose={() => setEditingTaskCtx(null)}
                    onDelete={async (id) => {
                        if (!isNaN(Number(id))) {
                            await deleteTask(Number(id));
                            loadData();
                            setEditingTaskCtx(null);
                        }
                    }}
                    onSave={async (updated) => {
                        if (updated.id) {
                            const dbId = Number(updated.id);
                            if (!isNaN(dbId)) {
                                await updateTask(dbId, {
                                    titulo: updated.text,
                                    descricao: updated.description,
                                    status: updated.status,
                                    responsavel: updated.assigneeId,
                                    duracaohoras: updated.estimatedHours,
                                    datafim: updated.dueDate,
                                    datainicio: updated.startDate,
                                    etiquetas: updated.tags,
                                    membros: updated.members,
                                    anexos: updated.attachments
                                });
                            }
                        }
                        loadData();
                    }}
                />
            )}
        </div>
    );
};
