
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, TaskStatus, DbTask } from '../types';
import { Trello, Filter, User, Hash, Clock, Briefcase, RefreshCw, Calendar as CalendarIcon, GitMerge } from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';
import { fetchAllTasks, updateTask, fetchProjects } from '../services/projectService';
import { logEvent } from '../services/analyticsService';

interface Props {
  opportunities?: Opportunity[]; // Opcional agora
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate?: (oppId: string, nodeId: string, task: any) => void; 
  userRole?: string;
  userId?: string;
  projectId?: string; // Prop para filtrar por projeto específico
  organizationId?: number; // Prop para filtrar por organização
}

interface KanbanColumn {
    id: string;
    label: string;
    color: string;
}

type TimeFilter = 'all' | 'day' | 'week' | 'month' | 'year';

const COLUMNS: KanbanColumn[] = [
    { id: 'todo', label: 'A Fazer', color: 'bg-slate-500' },
    { id: 'doing', label: 'Fazendo', color: 'bg-blue-500' },
    { id: 'review', label: 'Em Revisão', color: 'bg-purple-500' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<Props> = ({ onSelectOpportunity, userRole, projectId, organizationId }) => {
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
    
    // Update filter if prop changes
    useEffect(() => {
        if (projectId) setFilterProject(projectId);
    }, [projectId]);

    // Load Real Tasks from DB
    useEffect(() => {
        loadData();
    }, [organizationId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksData, projectsData] = await Promise.all([
                fetchAllTasks(organizationId),
                fetchProjects(organizationId)
            ]);
            
            // We show all tasks including subtasks in the board now
            setTasks(tasksData);
            setProjectsList(projectsData.map(p => ({ id: p.id, nome: p.nome })));
        } catch (error) {
            console.error("Erro ao carregar Kanban:", error);
        } finally {
            setLoading(false);
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
            // Project Filter
            if (filterProject !== 'all' && t.projeto?.toString() !== filterProject) return false;
            
            // Assignee Filter
            if (filterAssignee !== 'all' && t.responsavelData?.nome !== filterAssignee) return false;

            // Time Filter
            if (timeFilter !== 'all') {
                const dueDateStr = t.datafim || t.deadline || t.dataproposta; // Fallback to proposal date
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
            // Normalizar status para lowercase e fallback para 'todo'
            const st = task.status?.toLowerCase() || 'todo'; 
            if (cols[st]) cols[st].push(task); 
            else cols['todo'].push(task); 
        });
        return cols;
    }, [filteredTasks]);

    const handleStatusChange = async (task: DbTask, newStatus: string) => {
        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        
        try {
            await updateTask(task.id, { status: newStatus });
            logEvent('feature_use', { feature: 'Kanban Drag', taskId: task.id, to: newStatus });
        } catch (e) {
            console.error("Falha ao atualizar status", e);
            loadData(); // Revert on error
        }
    };

    const getCurrentValueLabel = () => {
        const d = new Date(filterDate);
        if (timeFilter === 'all') return 'Todo o Período';
        if (timeFilter === 'day') return d.toLocaleDateString();
        if (timeFilter === 'month') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (timeFilter === 'year') return d.getFullYear().toString();
        if (timeFilter === 'week') {
             const startOfWeek = new Date(d);
             startOfWeek.setDate(d.getDate() - d.getDay());
             const endOfWeek = new Date(startOfWeek);
             endOfWeek.setDate(startOfWeek.getDate() + 6);
             return `Semana ${startOfWeek.getDate()}/${startOfWeek.getMonth()+1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth()+1}`;
        }
        return '';
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="mb-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    {!projectId && (
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Trello className="w-8 h-8 text-shinko-primary"/> Kanban
                        </h1>
                    )}
                    
                    <div className="flex items-center gap-3 ml-auto">
                        {/* Current Value Display (The "Exibidor") */}
                        <div className="bg-shinko-primary/10 text-shinko-primary px-3 py-1.5 rounded-lg text-xs font-bold border border-shinko-primary/20 flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3"/>
                            {getCurrentValueLabel()}
                        </div>

                        <button onClick={loadData} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`}/>
                        </button>
                        <div className="px-3 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full font-bold border border-blue-500/30 text-xs backdrop-blur-sm">
                            {filteredTasks.length} Tasks
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 glass-panel p-3 rounded-2xl">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-bold mr-2"><Filter className="w-4 h-4"/> Filtros:</div>
                    
                    {/* Time Filter Buttons */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        {['all', 'day', 'week', 'month', 'year'].map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeFilter(tf as TimeFilter)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                                    timeFilter === tf 
                                    ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' 
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {tf === 'all' ? 'Tudo' : tf === 'day' ? 'Dia' : tf === 'week' ? 'Semana' : tf === 'month' ? 'Mês' : 'Ano'}
                            </button>
                        ))}
                    </div>

                    {/* Date Picker (Only visible if time filter is active) */}
                    {timeFilter !== 'all' && (
                        <div className="relative">
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-shinko-primary"
                            />
                        </div>
                    )}

                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2"></div>

                    {!projectId && (
                        <div className="relative group">
                            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="appearance-none pl-9 pr-8 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:border-shinko-primary outline-none cursor-pointer max-w-[200px] backdrop-blur-sm">
                                <option value="all" className="dark:bg-slate-900">Todos Projetos</option>
                                {projectsList.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.nome}</option>)}
                            </select>
                            <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none"/>
                        </div>
                    )}
                    
                    <div className="relative group">
                         <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="appearance-none pl-9 pr-8 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:border-shinko-primary outline-none cursor-pointer backdrop-blur-sm">
                            <option value="all" className="dark:bg-slate-900">Todos Responsáveis</option>
                            {assignees.map(a => <option key={a} value={a} className="dark:bg-slate-900">{a}</option>)}
                        </select>
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none"/>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex gap-4 h-full min-w-[1400px]">
                    {COLUMNS.map(col => (
                        <div key={col.id} onDragOver={e => {e.preventDefault(); e.dataTransfer.dropEffect = 'move';}} onDrop={e => {
                            e.preventDefault(); 
                            if(draggedTask && draggedTask.status !== col.id) {
                                handleStatusChange(draggedTask, col.id);
                                setDraggedTask(null);
                            }
                        }} className={`flex-1 min-w-[280px] bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-3xl flex flex-col ${draggedTask ? 'border-dashed border-amber-500/50' : ''}`}>
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-white/20 dark:bg-white/5 rounded-t-3xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${col.color} shadow-glow`}></div>
                                    <span className="font-bold text-slate-800 dark:text-white text-sm tracking-wide">{col.label}</span>
                                </div>
                                <span className="text-xs font-bold bg-slate-200 dark:bg-black/30 px-2 py-1 rounded-full text-slate-600 dark:text-slate-400">{columnsData[col.id]?.length || 0}</span>
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                                {columnsData[col.id]?.map(task => (
                                    <div key={task.id} draggable onDragStart={e => {setDraggedTask(task); e.dataTransfer.setData('text/plain', task.id.toString());}} onClick={() => setEditingTaskCtx(task)} className="glass-card p-4 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-white/60 dark:hover:bg-white/10 border-slate-200 dark:border-white/5 transition-all hover:scale-[1.02] shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[140px]">{task.projetoData?.nome || 'Sem Projeto'}</span>
                                            <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-black/30 px-1 rounded">#{task.id}</span>
                                        </div>
                                        
                                        {/* Subtask Badge */}
                                        {task.sutarefa && (
                                            <div className="text-[9px] font-bold text-purple-500 bg-purple-100 dark:bg-purple-900/20 px-1.5 py-0.5 rounded mb-2 w-fit flex items-center gap-1 border border-purple-200 dark:border-purple-500/30">
                                                <GitMerge className="w-3 h-3"/> Subtarefa
                                            </div>
                                        )}

                                        <div className="text-sm font-medium text-slate-900 dark:text-white mb-3 leading-snug">{task.titulo}</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {task.responsavelData?.nome && (
                                                     <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-slate-100 dark:bg-black/50 flex items-center justify-center" title={task.responsavelData.nome}>
                                                         <img src={getAvatarUrl(task.responsavelData.nome)} alt={task.responsavelData.nome} className="w-full h-full object-cover"/>
                                                     </div>
                                                )}
                                                {task.dataproposta && (
                                                    <div className={`text-[10px] flex items-center gap-1 ${new Date(task.dataproposta) < new Date() && task.status !== 'done' ? 'text-red-500 dark:text-red-400 font-bold' : 'text-slate-500'}`}>
                                                        <Clock className="w-3 h-3"/>
                                                        {new Date(task.dataproposta).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{task.duracaohoras}h</div>
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
                        status: editingTaskCtx.status as TaskStatus,
                        estimatedHours: editingTaskCtx.duracaohoras,
                        dueDate: editingTaskCtx.datafim || editingTaskCtx.dataproposta,
                        startDate: editingTaskCtx.datainicio,
                        assignee: editingTaskCtx.responsavelData?.nome,
                        assigneeId: editingTaskCtx.responsavel, // UUID for saving
                        assigneeIsDev: editingTaskCtx.responsavelData?.desenvolvedor,
                        gut: { g: editingTaskCtx.gravidade, u: editingTaskCtx.urgencia, t: editingTaskCtx.tendencia },
                        subtasks: [] 
                    }}
                    nodeTitle={editingTaskCtx.projetoData?.nome || 'Projeto'}
                    opportunityTitle={editingTaskCtx.projetoData?.nome}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updatedTask) => {
                        // Salvar alterações na tarefa principal
                        await updateTask(Number(updatedTask.id), {
                            titulo: updatedTask.text,
                            descricao: updatedTask.description,
                            status: updatedTask.status,
                            responsavel: updatedTask.assigneeId,
                            duracaohoras: updatedTask.estimatedHours,
                            datafim: updatedTask.dueDate,
                            datainicio: updatedTask.startDate,
                            gravidade: updatedTask.gut?.g,
                            urgencia: updatedTask.gut?.u,
                            tendencia: updatedTask.gut?.t
                        });
                        loadData(); // Recarrega tudo para garantir sincronia
                    }}
                />
            )}
        </div>
    );
};
