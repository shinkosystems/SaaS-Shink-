
import React, { useEffect, useState } from 'react';
import { Opportunity, DbTask, ProjectStatus } from '../types';
import MatrixChart from './MatrixChart';
import { fetchUserTasks, updateTask } from '../services/projectService';
import { CheckCircle2, Circle, Clock, AlertTriangle, Calendar, Check, LayoutList, Smile } from 'lucide-react';

interface Props {
    opportunities: Opportunity[];
    onNavigate: (status: ProjectStatus | 'All') => void;
    onOpenProject: (opp: Opportunity) => void;
    user: any;
    theme: 'dark' | 'light';
}

export const Dashboard: React.FC<Props> = ({ opportunities, onNavigate, onOpenProject, user, theme }) => {
    const [myTasks, setMyTasks] = useState<DbTask[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    useEffect(() => {
        const loadTasks = async () => {
            if (!user?.id) return;
            setLoadingTasks(true);
            const tasks = await fetchUserTasks(user.id);
            
            // Frontend Filter for "Today's Focus"
            // Logic: 
            // 1. Deadline is today or in the past (Overdue)
            // 2. OR Status is 'doing' (In progress)
            // 3. OR Start date is today or past
            
            const today = new Date().toISOString().split('T')[0];
            
            const filtered = tasks.filter(t => {
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
        loadTasks();
    }, [user]);

    const handleCompleteTask = async (taskId: number) => {
        // Optimistic update
        setMyTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await updateTask(taskId, { status: 'done' });
        } catch (e) {
            console.error("Error completing task", e);
        }
    };

    return (
        <div className="text-slate-900 dark:text-white animate-in fade-in duration-500 h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Dashboard</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
                <div onClick={() => onNavigate('Active')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Sprint Atual</h3>
                    <div className="text-4xl font-black text-emerald-500">{opportunities.filter(o => o.status === 'Active').length}</div>
                    <span className="text-slate-400 text-xs">Projetos Ativos</span>
                </div>
                <div onClick={() => onNavigate('Negotiation')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Comercial</h3>
                    <div className="text-4xl font-black text-blue-500">{opportunities.filter(o => o.status === 'Negotiation').length}</div>
                    <span className="text-slate-400 text-xs">Em Negociação</span>
                </div>
                <div onClick={() => onNavigate('Future')} className="glass-card p-6 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm">
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
                                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
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
                                    <div key={task.id} className="group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 p-3 rounded-xl hover:border-amber-500/30 hover:shadow-md transition-all flex gap-3 items-start">
                                        <button 
                                            onClick={() => handleCompleteTask(task.id)}
                                            className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                                            title="Concluir Tarefa"
                                        >
                                            <Circle className="w-5 h-5 hover:fill-emerald-500/20"/>
                                        </button>
                                        <div className="flex-1 min-w-0">
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
        </div>
    );
};
