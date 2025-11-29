
import React, { useEffect, useState } from 'react';
import { Opportunity, DbTask, ProjectStatus } from '../types';
import MatrixChart from './MatrixChart';
import { fetchUserTasks, updateTask, deleteTask } from '../services/projectService';
import TaskDetailModal from './TaskDetailModal';
import { CheckCircle2, Circle, Clock, AlertTriangle, Calendar, Check, LayoutList, Smile, Sparkles, Trash2 } from 'lucide-react';

interface Props {
    opportunities: Opportunity[];
    onNavigate: (status: ProjectStatus | 'All') => void;
    onOpenProject: (opp: Opportunity) => void;
    user: any;
    theme: 'dark' | 'light';
    userRole?: string;
    whitelabel?: boolean;
    onActivateWhitelabel?: () => void;
    organizationId?: number;
}

export const Dashboard: React.FC<Props> = ({ opportunities, onNavigate, onOpenProject, user, theme, userRole, whitelabel, onActivateWhitelabel, organizationId }) => {
    const [myTasks, setMyTasks] = useState<DbTask[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);

    const refreshTasks = async () => {
        if (!user?.id) return;
        setLoadingTasks(true);
        const tasks = await fetchUserTasks(user.id, organizationId);
        
        // Frontend Filter for "Today's Focus" + Security Check (Organization)
        const today = new Date().toISOString().split('T')[0];
        
        const filtered = tasks.filter(t => {
            // Strict Security: Ensure task belongs to current org context if provided
            if (organizationId && t.organizacao && t.organizacao !== organizationId) return false;

            const deadline = t.datafim ? t.datafim.split('T')[0] : '9999-99-99';
            const start = t.datainicio ? t.datainicio.split('T')[0] : '9999-99-99';
            
            const isOverdue = deadline < today;
            const isDueToday = deadline === today;
            const isDoing = t.status === 'doing';
            const shouldStart = start <= today;

            return isOverdue || isDueToday || isDoing || shouldStart;
        });

        setMyTasks(filtered);
        setLoadingTasks(false);
    };

    useEffect(() => {
        refreshTasks();
    }, [user, organizationId]);

    const handleCompleteTask = async (taskId: number) => {
        // Optimistic update
        setMyTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await updateTask(taskId, { status: 'done' });
        } catch (e) {
            console.error("Error completing task", e);
            refreshTasks(); // Revert on error
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
            // Optimistic update
            setMyTasks(prev => prev.filter(t => t.id !== taskId));
            setSelectedTask(null);
            
            try {
                await deleteTask(taskId);
            } catch (e) {
                console.error("Erro ao excluir tarefa:", e);
                refreshTasks(); // Revert on error
            }
        }
    };

    return (
        <div className="text-slate-900 dark:text-white animate-in fade-in duration-500 h-full flex flex-col">
            {userRole === 'dono' && !whitelabel && (
                <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-900 border border-shinko-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-shinko-primary/5 group-hover:bg-shinko-primary/10 transition-colors pointer-events-none"></div>
                    <div className="relative z-10">
                        <h2 className="text-lg font-bold text-shinko-primary flex items-center gap-2">
                            <Sparkles className="w-5 h-5"/> Plano Whitelabel
                        </h2>
                        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                            Você está convidado a experimentar as funcionalidades do plano <strong>Whitelabel</strong>. Personalize o painel com sua marca e ofereça uma experiência exclusiva para seus clientes.
                        </p>
                    </div>
                    <button 
                        onClick={onActivateWhitelabel}
                        className="relative z-10 bg-shinko-primary hover:brightness-110 text-white font-bold px-6 py-3 rounded-lg text-sm whitespace-nowrap transition-all shadow-lg hover:shadow-shinko-primary/20 active:scale-95 min-h-[48px]"
                    >
                        Experimentar as funcionalidades
                    </button>
                </div>
            )}

            <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Dashboard</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
                <div onClick={() => onNavigate('Active')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm min-h-[120px]">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Sprint Atual</h3>
                    <div className="text-4xl font-black text-emerald-500">{opportunities.filter(o => o.status === 'Active').length}</div>
                    <span className="text-slate-400 text-xs">Projetos Ativos</span>
                </div>
                <div onClick={() => onNavigate('Negotiation')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm min-h-[120px]">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Comercial</h3>
                    <div className="text-4xl font-black text-blue-500">{opportunities.filter(o => o.status === 'Negotiation').length}</div>
                    <span className="text-slate-400 text-xs">Em Negociação</span>
                </div>
                <div onClick={() => onNavigate('Future')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm min-h-[120px]">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Pipeline</h3>
                    <div className="text-4xl font-black text-amber-500">{opportunities.filter(o => o.status === 'Future').length}</div>
                    <span className="text-slate-400 text-xs">Backlog Futuro</span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                {/* Matrix Chart (Left - 2 Cols) */}
                <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 overflow-hidden shadow-sm h-[400px] lg:h-auto relative">
                    <div className="absolute inset-0">
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                </div>

                {/* Daily Tasks (Right - 1 Col) */}
                <div className="lg:col-span-1 glass-panel rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 flex flex-col overflow-hidden shadow-sm h-[400px] lg:h-auto">
                    <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/40 dark:bg-white/5 backdrop-blur-md">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                                <CheckCircle2 className="w-5 h-5 text-shinko-primary"/> Meu Foco Hoje
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tarefas atribuídas para hoje ou atrasadas</p>
                        </div>
                        <div className="text-xs font-bold bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                            {myTasks.length}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                        {loadingTasks ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <div className="w-6 h-6 border-2 border-shinko-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">Carregando tarefas...</span>
                            </div>
                        ) : myTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-3">
                                    <Smile className="w-8 h-8 text-emerald-500"/>
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tudo limpo por hoje!</p>
                                <p className="text-xs text-slate-500 mt-1">Você não tem tarefas pendentes para hoje.</p>
                            </div>
                        ) : (
                            myTasks.map(task => {
                                const today = new Date().toISOString().split('T')[0];
                                const deadline = task.datafim ? task.datafim.split('T')[0] : null;
                                const isOverdue = deadline && deadline < today;
                                const isToday = deadline === today;

                                return (
                                    <div 
                                        key={task.id} 
                                        onClick={() => setSelectedTask(task)}
                                        className="group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 rounded-xl hover:border-shinko-primary/30 hover:shadow-md transition-all flex gap-3 items-start cursor-pointer min-h-[72px]"
                                    >
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                                            className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors shrink-0 p-2 -ml-2"
                                            title="Concluir Tarefa"
                                        >
                                            <Circle className="w-6 h-6 hover:fill-emerald-500/20"/>
                                        </button>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug mb-1 line-clamp-2 group-hover:text-shinko-primary transition-colors">
                                                {task.titulo}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px] flex items-center gap-1">
                                                    <LayoutList className="w-3 h-3"/>
                                                    {task.projetoData?.nome || 'Tarefa Avulsa'}
                                                </span>
                                                {deadline && (
                                                    <span className={`text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                                        isOverdue ? 'text-red-600 bg-red-100 dark:bg-red-900/30' : 
                                                        isToday ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' : 
                                                        'text-slate-500 bg-slate-100 dark:bg-white/10'
                                                    }`}>
                                                        {isOverdue ? <AlertTriangle className="w-3 h-3"/> : <Calendar className="w-3 h-3"/>}
                                                        {new Date(task.datafim!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal 
                    task={{
                        id: selectedTask.id.toString(),
                        text: selectedTask.titulo,
                        description: selectedTask.descricao,
                        status: selectedTask.status as any,
                        completed: selectedTask.status === 'done',
                        assignee: selectedTask.responsavelData?.nome,
                        assigneeId: selectedTask.responsavel,
                        startDate: selectedTask.datainicio,
                        dueDate: selectedTask.datafim,
                        estimatedHours: selectedTask.duracaohoras,
                        gut: { g: selectedTask.gravidade, u: selectedTask.urgencia, t: selectedTask.tendencia },
                        assigneeIsDev: selectedTask.responsavelData?.desenvolvedor
                    }}
                    nodeTitle={selectedTask.projetoData?.nome || 'Tarefa Avulsa'}
                    opportunityTitle={selectedTask.projetoData?.nome}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updatedTask) => {
                        await updateTask(Number(selectedTask.id), {
                            titulo: updatedTask.text,
                            descricao: updatedTask.description,
                            status: updatedTask.status,
                            responsavel: updatedTask.assigneeId,
                            duracaohoras: updatedTask.estimatedHours,
                            datainicio: updatedTask.startDate,
                            datafim: updatedTask.dueDate,
                            gravidade: updatedTask.gut?.g,
                            urgencia: updatedTask.gut?.u,
                            tendencia: updatedTask.gut?.t
                        });
                        refreshTasks();
                    }}
                    onDelete={(id) => handleDeleteTask(Number(id))}
                />
            )}
        </div>
    );
};
