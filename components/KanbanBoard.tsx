import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, TaskStatus, DbTask } from '../types';
import { Trello, Filter, User, Hash, Clock, Briefcase, RefreshCw, Calendar as CalendarIcon, GitMerge, GanttChartSquare, Lock, MoreHorizontal } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { fetchAllTasks, updateTask, fetchProjects, deleteTask, syncTaskChecklist } from '../services/projectService';
import { logEvent } from '../services/analyticsService';
import { GanttView } from './GanttView';

interface Props {
  opportunities?: Opportunity[]; 
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate?: (oppId: string, nodeId: string, task: any) => void; 
  userRole?: string;
  userId?: string;
  projectId?: string; 
  organizationId?: number; 
  currentPlan?: string;
  activeModules?: string[];
}

interface KanbanColumn {
    id: string;
    label: string;
    color: string;
}

type TimeFilter = 'all' | 'day' | 'week' | 'month' | 'year';
type ViewMode = 'board' | 'gantt';

const COLUMNS: KanbanColumn[] = [
    { id: 'todo', label: 'A Fazer', color: 'bg-slate-400' },
    { id: 'doing', label: 'Fazendo', color: 'bg-blue-500' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<Props> = ({ onSelectOpportunity, userRole, projectId, organizationId, onTaskUpdate, currentPlan, activeModules }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [projectsList, setProjectsList] = useState<{id: number, nome: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState<string>(projectId || 'all');
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    
    // Time Filter States
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    const [draggedTask, setDraggedTask] = useState<DbTask | null>(null);
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);

    const isGanttEnabled = activeModules ? activeModules.includes('gantt') : false;
    const canViewGantt = isGanttEnabled;
    
    useEffect(() => {
        if (projectId) setFilterProject(projectId);
    }, [projectId]);

    useEffect(() => {
        if (viewMode === 'board') {
            loadData();
        }
    }, [organizationId, viewMode]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [tasksData, projectsData] = await Promise.all([
                fetchAllTasks(organizationId),
                fetchProjects(organizationId)
            ]);
            setTasks(tasksData);
            setProjectsList(projectsData.map(p => ({ id: p.id, nome: p.nome })));
            
            // Sync open modal with fresh data from DB (Important for subtasks sync)
            if (editingTaskCtx) {
                const fresh = tasksData.find(t => t.id === editingTaskCtx.id);
                if (fresh) setEditingTaskCtx(fresh);
            }
        } catch (error) {
            console.error("Erro ao carregar Kanban:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const getAvatarUrl = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;

    const assignees = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach(t => { if(t.responsavelData?.nome) set.add(t.responsavelData.nome); });
        return Array.from(set).sort();
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const refDate = new Date(filterDate);
        refDate.setHours(0,0,0,0);

        return tasks.filter(t => {
            // HIDE SUBTASKS FROM MAIN BOARD
            if (t.sutarefa) return false;

            if (filterProject !== 'all' && t.projeto?.toString() !== filterProject) return false;
            if (filterAssignee !== 'all' && t.responsavelData?.nome !== filterAssignee) return false;

            if (timeFilter !== 'all') {
                const dueDateStr = t.datafim || t.deadline || t.dataproposta; 
                if (!dueDateStr) return false;
                
                const taskDate = new Date(dueDateStr);
                taskDate.setHours(0,0,0,0);

                if (timeFilter === 'day') {
                    if (taskDate.getTime() !== refDate.getTime()) return false;
                } else if (timeFilter === 'week') {
                    const startOfWeek = new Date(refDate);
                    startOfWeek.setDate(refDate.getDate() - refDate.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    if (taskDate < startOfWeek || taskDate > endOfWeek) return false;
                } else if (timeFilter === 'month') {
                    if (taskDate.getMonth() !== refDate.getMonth() || taskDate.getFullYear() !== refDate.getFullYear()) return false;
                } else if (timeFilter === 'year') {
                    if (taskDate.getFullYear() !== refDate.getFullYear()) return false;
                }
            }
            return true;
        });
    }, [tasks, filterProject, filterAssignee, timeFilter, filterDate]);

    const columnsData = useMemo(() => {
        const cols: Record<string, DbTask[]> = { todo: [], doing: [], review: [], approval: [], done: [], backlog: [] };
        filteredTasks.forEach(task => { 
            const st = task.status?.toLowerCase() || 'todo'; 
            if (cols[st]) cols[st].push(task); 
            else cols['todo'].push(task); 
        });
        return cols;
    }, [filteredTasks]);

    // Helper to get subtasks for a specific parent ID from the global tasks list
    const getSubtasksForParent = (parentId: number) => {
        return tasks
            .filter(t => t.tarefamae === parentId || t.tarefa === parentId)
            .map(t => ({
                id: t.id.toString(),
                text: t.titulo,
                completed: t.status === 'done',
                dbId: t.id,
                dueDate: t.datafim,
                startDate: t.datainicio,
                assignee: t.responsavelData?.nome,
                assigneeId: t.responsavel,
                estimatedHours: t.duracaohoras
            }));
    };

    const handleStatusChange = async (task: DbTask, newStatus: string) => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        try {
            await updateTask(task.id, { status: newStatus });
            logEvent('feature_use', { feature: 'Kanban Drag', taskId: task.id, to: newStatus });
        } catch (e) {
            loadData(); 
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 shrink-0">
                <div className="flex justify-between items-center">
                    {!projectId && (
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Quadro de Tarefas
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Gerencie o fluxo de trabalho da equipe.
                            </p>
                        </div>
                    )}
                    
                    {/* View Switcher Minimal */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title="Quadro Kanban"
                        >
                            <Trello className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => canViewGantt ? setViewMode('gantt') : alert("Módulo inativo")}
                            className={`p-2 rounded-md transition-all ${viewMode === 'gantt' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title="Cronograma Gantt"
                        >
                            <GanttChartSquare className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                {viewMode === 'board' && (
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Project Filter */}
                        {!projectId && (
                            <div className="relative">
                                <select 
                                    value={filterProject} 
                                    onChange={e => setFilterProject(e.target.value)} 
                                    className="appearance-none bg-transparent text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white outline-none cursor-pointer pr-6"
                                >
                                    <option value="all" className="dark:bg-slate-900">Todos Projetos</option>
                                    <option value="adhoc" className="dark:bg-black">Tarefas Avulsas</option>
                                    {projectsList.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.nome}</option>)}
                                </select>
                                <Filter className="w-3 h-3 absolute right-0 top-1 text-slate-400 pointer-events-none"/>
                            </div>
                        )}
                        
                        {/* Assignee Filter */}
                        <div className="relative">
                             <select 
                                value={filterAssignee} 
                                onChange={e => setFilterAssignee(e.target.value)} 
                                className="appearance-none bg-transparent text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white outline-none cursor-pointer pr-6"
                            >
                                <option value="all" className="dark:bg-slate-900">Todos Responsáveis</option>
                                {assignees.map(a => <option key={a} value={a} className="dark:bg-slate-900">{a}</option>)}
                            </select>
                            <User className="w-3 h-3 absolute right-0 top-1 text-slate-400 pointer-events-none"/>
                        </div>

                        {/* Loading State */}
                        <div className="ml-auto">
                             <button onClick={() => loadData(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* GANTT VIEW MODE */}
            {viewMode === 'gantt' && canViewGantt && (
                <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <GanttView 
                        opportunities={[]} 
                        onSelectOpportunity={onSelectOpportunity}
                        onTaskUpdate={onTaskUpdate || (() => {})}
                        userRole={userRole}
                        projectId={projectId}
                        organizationId={organizationId}
                        activeModules={activeModules}
                    />
                </div>
            )}

            {/* BOARD VIEW MODE */}
            {viewMode === 'board' && (
            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex gap-6 h-full min-w-[1200px]">
                    {COLUMNS.map(col => (
                        <div 
                            key={col.id} 
                            onDragOver={e => {e.preventDefault(); e.dataTransfer.dropEffect = 'move';}} 
                            onDrop={e => {
                                e.preventDefault(); 
                                if(draggedTask && draggedTask.status !== col.id) {
                                    handleStatusChange(draggedTask, col.id);
                                    setDraggedTask(null);
                                }
                            }} 
                            className="flex-1 min-w-[260px] flex flex-col h-full"
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{col.label}</span>
                                </div>
                                <span className="text-xs font-medium text-slate-400">{columnsData[col.id]?.length || 0}</span>
                            </div>

                            {/* Cards Container */}
                            <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-3 p-1 rounded-xl transition-colors ${draggedTask ? 'bg-slate-50/50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10' : ''}`}>
                                {columnsData[col.id]?.map(task => (
                                    <div 
                                        key={task.id} 
                                        draggable 
                                        onDragStart={e => {setDraggedTask(task); e.dataTransfer.setData('text/plain', task.id.toString());}} 
                                        onClick={() => setEditingTaskCtx(task)} 
                                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer shadow-sm hover:shadow-md transition-all group relative"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                                                {task.projetoData?.nome || 'Avulso'}
                                            </span>
                                            {task.sutarefa && <GitMerge className="w-3 h-3 text-purple-400"/>}
                                        </div>

                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-snug line-clamp-3">
                                            {task.titulo}
                                        </div>

                                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3 mt-2">
                                            <div className="flex items-center gap-2">
                                                {task.responsavelData?.nome ? (
                                                     <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10" title={task.responsavelData.nome}>
                                                         <img src={getAvatarUrl(task.responsavelData.nome)} alt={task.responsavelData.nome} className="w-full h-full object-cover"/>
                                                     </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] text-slate-400">?</div>
                                                )}
                                                {/* Members Indicator */}
                                                {task.membros && task.membros.length > 0 && (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] text-slate-500 font-bold border border-white dark:border-slate-800 -ml-3">
                                                        +{task.membros.length}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {task.datafim && (
                                                <div className={`text-[10px] font-bold flex items-center gap-1 ${new Date(task.datafim) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-slate-400'}`}>
                                                    <Clock className="w-3 h-3"/>
                                                    {new Date(task.datafim).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
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
            )}

            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(),
                        text: editingTaskCtx.titulo,
                        description: editingTaskCtx.descricao,
                        completed: editingTaskCtx.status === 'done',
                        status: editingTaskCtx.status as TaskStatus,
                        estimatedHours: editingTaskCtx.duracaohoras,
                        dueDate: editingTaskCtx.datafim || editingTaskCtx.dataproposta,
                        startDate: editingTaskCtx.datainicio,
                        assignee: editingTaskCtx.responsavelData?.nome,
                        assigneeId: editingTaskCtx.responsavel,
                        assigneeIsDev: editingTaskCtx.responsavelData?.desenvolvedor,
                        gut: { g: editingTaskCtx.gravidade, u: editingTaskCtx.urgencia, t: editingTaskCtx.tendencia },
                        // FIX: Hydrate checklist from global tasks list instead of empty array
                        subtasks: getSubtasksForParent(editingTaskCtx.id),
                        members: editingTaskCtx.membros || [],
                        tags: editingTaskCtx.etiquetas || [],
                        attachments: editingTaskCtx.anexos || [],
                        projectId: editingTaskCtx.projeto || undefined,
                        dbId: editingTaskCtx.id
                    }}
                    nodeTitle={editingTaskCtx.projetoData?.nome || 'Projeto'}
                    opportunityTitle={editingTaskCtx.projetoData?.nome}
                    organizationId={organizationId} // Pass ID
                    onClose={() => setEditingTaskCtx(null)}
                    onDelete={async (id) => {
                        if (!isNaN(Number(id))) {
                            await deleteTask(Number(id));
                            loadData(true);
                            setEditingTaskCtx(null);
                        }
                    }}
                    onSave={async (updatedTask) => {
                        // OPTIMISTIC UPDATE: Update local state immediately to avoid revert flicker
                        setEditingTaskCtx(prev => prev ? {
                            ...prev,
                            titulo: updatedTask.text,
                            descricao: updatedTask.description,
                            status: updatedTask.status,
                            responsavel: updatedTask.assigneeId || prev.responsavel,
                            duracaohoras: updatedTask.estimatedHours || 0,
                            datafim: updatedTask.dueDate,
                            datainicio: updatedTask.startDate,
                            etiquetas: updatedTask.tags || [],
                            membros: updatedTask.members || [],
                            anexos: updatedTask.attachments || []
                        } : null);

                        const dbId = Number(updatedTask.id);
                        
                        await updateTask(dbId, {
                            titulo: updatedTask.text,
                            descricao: updatedTask.description,
                            status: updatedTask.status,
                            responsavel: updatedTask.assigneeId,
                            duracaohoras: updatedTask.estimatedHours,
                            datafim: updatedTask.dueDate,
                            datainicio: updatedTask.startDate,
                            gravidade: updatedTask.gut?.g,
                            urgencia: updatedTask.gut?.u,
                            tendencia: updatedTask.gut?.t,
                            etiquetas: updatedTask.tags,
                            membros: updatedTask.members,
                            anexos: updatedTask.attachments
                        });

                        // Sync Checklist (Subtasks)
                        if (updatedTask.subtasks && organizationId) {
                            await syncTaskChecklist(dbId, updatedTask.subtasks, organizationId, editingTaskCtx.projeto || undefined, updatedTask.assigneeId);
                        }

                        loadData(true); // Silent reload
                    }}
                />
            )}
        </div>
    );
};