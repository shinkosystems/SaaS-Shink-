
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, TaskStatus, DbTask } from '../types';
import { RefreshCw, Clock, Briefcase, Search, User, Target, Filter, X, BarChart3, Calendar, Timer, Lock } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { fetchAllTasks, updateTask, syncTaskChecklist, fetchOrgMembers, fetchProjects } from '../services/projectService';

interface Props {
  onSelectOpportunity: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number; 
  currentPlan?: string;
  activeModules?: string[];
  projectId?: string;
  readOnly?: boolean;
}

const COLUMNS = [
    { id: 'todo', label: 'Backlog', color: 'bg-slate-400' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<Props> = ({ organizationId, projectId, readOnly, userRole }) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedTask, setDraggedTask] = useState<DbTask | null>(null);
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterProjectId, setFilterProjectId] = useState(projectId || '');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [dateFilterField, setDateFilterField] = useState<'due' | 'start'>('due');
    const [minGut, setMinGut] = useState(0);

    // Meta Data for Filters
    const [members, setMembers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => { loadData(); }, [organizationId, projectId]);
    
    useEffect(() => {
        if (organizationId) {
            fetchOrgMembers(organizationId).then(setMembers);
            fetchProjects(organizationId).then(setProjects);
        }
    }, [organizationId]);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchAllTasks(organizationId);
        setTasks(projectId ? data.filter(t => t.projeto?.toString() === projectId) : data);
        setLoading(false);
    };

    const handleStatusChange = async (task: DbTask, newStatus: string) => {
        if (readOnly) return;
        const now = new Date().toISOString();
        const dateFields: Record<string, string> = {
            todo: 'dataafazer',
            doing: 'datafazendo',
            review: 'datarevisao',
            approval: 'dataaprovacao',
            done: 'dataconclusao'
        };
        
        const fieldToUpdate = dateFields[newStatus];
        const updates: any = { status: newStatus };
        if (fieldToUpdate) updates[fieldToUpdate] = now;

        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t));
        await updateTask(task.id, updates);
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAssignee = !filterAssignee || t.responsavel === filterAssignee;
            const matchesProject = !filterProjectId || t.projeto?.toString() === filterProjectId;
            
            let taskDate: Date | null = null;
            if (dateFilterField === 'due') {
                taskDate = t.datafim ? new Date(t.datafim) : (t.dataproposta ? new Date(t.dataproposta) : null);
            } else {
                taskDate = t.datainicio ? new Date(t.datainicio) : null;
            }

            let matchesDate = true;
            if (taskDate) {
                if (filterStartDate) {
                    const start = new Date(filterStartDate);
                    start.setHours(0, 0, 0, 0);
                    if (taskDate < start) matchesDate = false;
                }
                if (filterEndDate) {
                    const end = new Date(filterEndDate);
                    end.setHours(23, 59, 59, 999);
                    if (taskDate > end) matchesDate = false;
                }
            } else if (filterStartDate || filterEndDate) {
                matchesDate = false;
            }

            const gutScore = (t.gravidade || 1) * (t.urgencia || 1) * (t.tendencia || 1);
            const matchesGut = gutScore >= minGut;
            
            return matchesSearch && matchesAssignee && matchesProject && matchesGut && matchesDate;
        });
    }, [tasks, searchTerm, filterAssignee, filterProjectId, minGut, filterStartDate, filterEndDate, dateFilterField]);

    const columnsData = useMemo(() => {
        const cols: Record<string, DbTask[]> = { todo: [], doing: [], review: [], approval: [], done: [] };
        filteredTasks.filter(t => !t.sutarefa).forEach(t => { 
            const st = t.status?.toLowerCase() || 'todo';
            if (cols[st]) cols[st].push(t);
        });
        return cols;
    }, [filteredTasks]);

    const resetFilters = () => {
        setSearchTerm('');
        setFilterAssignee('');
        setFilterProjectId(projectId || '');
        setFilterStartDate('');
        setFilterEndDate('');
        setDateFilterField('due');
        setMinGut(0);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-700 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Fluxo de <span className="text-amber-500">Trabalho</span>.</h1>
                        <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.25em] mt-2">Operação Técnica Shinkō Engine</p>
                    </div>
                    {readOnly && (
                        <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full flex items-center gap-2 border border-slate-200 dark:border-white/10">
                            <Lock className="w-3 h-3 text-slate-400"/>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Snapshot View</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all shadow-sm">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`}/>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel p-3 rounded-[1.8rem] flex flex-wrap items-center gap-4 bg-white/40 dark:bg-white/[0.02] border-slate-200 dark:border-white/5">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/>
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar tarefa..."
                        className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none focus:border-amber-500/50 transition-all"
                    />
                </div>

                {!projectId && (
                    <div className="relative min-w-[150px]">
                        <Briefcase className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/>
                        <select 
                            value={filterProjectId}
                            onChange={e => setFilterProjectId(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Todos Projetos</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>
                )}

                <div className="relative min-w-[150px]">
                    <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400"/>
                    <select 
                        value={filterAssignee}
                        onChange={e => setFilterAssignee(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Todos Membros</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="relative min-w-[110px]">
                        <Timer className="absolute left-3 top-2 w-3 h-3 text-amber-500"/>
                        <select 
                            value={dateFilterField}
                            onChange={e => setDateFilterField(e.target.value as 'due' | 'start')}
                            className="w-full pl-8 pr-4 py-1.5 bg-transparent text-[9px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-slate-600 dark:text-slate-300"
                        >
                            <option value="due">Prazo</option>
                            <option value="start">Início</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <input 
                            type="date"
                            value={filterStartDate}
                            onChange={e => setFilterStartDate(e.target.value)}
                            className="w-28 pl-2 pr-1 py-1.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-bold outline-none focus:border-amber-500/50 transition-all uppercase"
                        />
                        <span className="text-[9px] font-black text-slate-400">➜</span>
                        <input 
                            type="date"
                            value={filterEndDate}
                            onChange={e => setFilterEndDate(e.target.value)}
                            className="w-28 pl-2 pr-1 py-1.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-bold outline-none focus:border-amber-500/50 transition-all uppercase"
                        />
                    </div>
                </div>

                {(searchTerm || filterAssignee || (filterProjectId && !projectId) || minGut > 0 || filterStartDate || filterEndDate) && (
                    <button 
                        onClick={resetFilters}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Limpar Filtros"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar pb-8">
                <div className="flex gap-6 h-full min-w-[1300px]">
                    {COLUMNS.map(col => (
                        <div 
                            key={col.id} 
                            onDragOver={e => !readOnly && e.preventDefault()} 
                            onDrop={() => !readOnly && draggedTask && handleStatusChange(draggedTask, col.id)}
                            className="flex-1 min-w-[260px] flex flex-col h-full group"
                        >
                            <div className="flex items-center justify-between mb-5 px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${col.color} shadow-[0_0_8px_currentcolor]`}></div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40">{col.label}</span>
                                </div>
                                <span className="text-[9px] font-black px-2 py-0.5 bg-white/50 dark:bg-white/5 rounded-lg text-slate-400 border border-slate-200 dark:border-white/5">
                                    {columnsData[col.id]?.length || 0}
                                </span>
                            </div>

                            <div className={`flex-1 space-y-4 p-2 rounded-[2.2rem] transition-all duration-500 ${draggedTask && !readOnly ? 'bg-amber-500/5 ring-2 ring-dashed ring-amber-500/10' : 'bg-transparent'}`}>
                                {columnsData[col.id]?.map(task => {
                                    const score = (task.gravidade || 1) * (task.urgencia || 1) * (task.tendencia || 1);
                                    return (
                                        <div 
                                            key={task.id} 
                                            draggable={!readOnly}
                                            onDragStart={() => !readOnly && setDraggedTask(task)} 
                                            onDragEnd={() => !readOnly && setDraggedTask(null)}
                                            onClick={() => setEditingTaskCtx(task)}
                                            className="glass-card p-6 border-slate-200 dark:border-white/5 hover:border-amber-500/40 cursor-pointer group/card transition-all active:scale-[0.98] shadow-sm"
                                        >
                                            <div className="flex justify-between items-start mb-3 gap-2">
                                                <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest truncate opacity-80 flex-1">{task.projetoData?.nome || 'Ad-hoc'}</div>
                                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${score >= 60 ? 'bg-red-500/10 text-red-500 border-red-500/20' : score >= 27 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/5'}`}>
                                                    GUT {score}
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-white mb-6 leading-relaxed line-clamp-3 group-hover/card:text-amber-500 transition-colors">{task.titulo}</div>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[9px] font-black text-slate-500 dark:text-white overflow-hidden shadow-sm">
                                                        {task.responsavelData?.avatar_url ? <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover" alt="avatar"/> : task.responsavelData?.nome?.charAt(0)}
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase hidden sm:inline">{task.responsavelData?.nome?.split(' ')[0]}</span>
                                                </div>
                                                {task.datafim && (
                                                    <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                        <Clock className="w-2.5 h-2.5"/> {new Date(task.datafim).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
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
                        id: editingTaskCtx.id.toString(),
                        text: editingTaskCtx.titulo,
                        description: editingTaskCtx.descricao,
                        completed: editingTaskCtx.status === 'done',
                        status: editingTaskCtx.status as any,
                        estimatedHours: editingTaskCtx.duracaohoras,
                        dueDate: editingTaskCtx.datafim,
                        startDate: editingTaskCtx.datainicio,
                        createdAt: editingTaskCtx.createdat,
                        lifecycle: {
                            created: editingTaskCtx.createdat,
                            todo: editingTaskCtx.dataafazer,
                            doing: editingTaskCtx.datafazendo,
                            review: editingTaskCtx.datarevisao,
                            approval: editingTaskCtx.dataaprovacao,
                            done: editingTaskCtx.dataconclusao
                        },
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
                        if (readOnly) return;
                        const now = new Date().toISOString();
                        const updatePayload: any = {
                            titulo: updated.text,
                            descricao: updated.description,
                            status: updated.status,
                            responsavel: updated.assigneeId,
                            membros: updated.members,
                            duracaohoras: updated.estimatedHours,
                            datafim: updated.dueDate,
                            datainicio: updated.startDate,
                            gravidade: updated.gut?.g,
                            urgencia: updated.gut?.u,
                            tendencia: updated.gut?.t
                        };

                        if (updated.status !== editingTaskCtx.status) {
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
                            await syncTaskChecklist(Number(updated.id), updated.subtasks, organizationId, Number(editingTaskCtx.projeto), updated.assigneeId);
                        }
                        loadData();
                    }}
                    readOnly={readOnly}
                />
            )}
        </div>
    );
};
