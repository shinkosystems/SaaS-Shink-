import React, { useState } from 'react';
import { Opportunity, ProjectStatus } from '../types';
import { 
    Activity, Clock, Calendar, Zap, CheckCircle2, ArrowRight 
} from 'lucide-react';
import { updateTask, deleteTask } from '../services/projectService';
import TaskDetailModal from './TaskDetailModal';
import MatrixChart from './MatrixChart';

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

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, userRole, whitelabel, onActivateWhitelabel, organizationId 
}) => {
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Stats
    const totalOpps = opportunities.length;
    const activeOpps = opportunities.filter(o => o.status === 'Active').length;
    const negotiationOpps = opportunities.filter(o => o.status === 'Negotiation').length;
    const futureOpps = opportunities.filter(o => o.status === 'Future').length;

    // Derive active tasks from projects
    const allTasks = opportunities.flatMap(o => 
        o.bpmn?.nodes.flatMap(n => n.checklist?.map(t => ({...t, projectTitle: o.title, oppId: o.id})) || []) || []
    ).filter(t => !t.completed).slice(0, 5);

    const refreshTasks = () => {
        // Callback to refresh tasks if needed, for now just force re-render via state update if connected to parent
    };

    const handleDeleteTask = async (id: number) => {
        if(window.confirm("Confirmar exclusão?")) {
            await deleteTask(id);
            refreshTasks();
            setSelectedTask(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Olá, {user.user_metadata?.full_name?.split(' ')[0] || 'Gestor'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Aqui está o panorama da sua operação hoje.
                    </p>
                </div>
                {userRole === 'dono' && !whitelabel && (
                    <button 
                        onClick={onActivateWhitelabel}
                        className="text-xs font-bold text-purple-500 bg-purple-500/10 px-3 py-1.5 rounded-full hover:bg-purple-500/20 transition-colors flex items-center gap-2"
                    >
                        <Zap className="w-3 h-3"/> Ativar White Label
                    </button>
                )}
            </div>

            {/* Stats Grid */}
            <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => onNavigate('Active')}
                    className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                            <Activity className="w-5 h-5"/>
                        </div>
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeOpps}</span>
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">Sprint Ativo</div>
                    <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Projetos em execução</div>
                </div>

                <div 
                    onClick={() => onNavigate('Negotiation')}
                    className="glass-panel p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5"/>
                        </div>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{negotiationOpps}</span>
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">Em Negociação</div>
                    <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Aguardando aprovação</div>
                </div>

                <div 
                    onClick={() => onNavigate('Future')}
                    className="glass-panel p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500 group-hover:scale-110 transition-transform">
                            <Calendar className="w-5 h-5"/>
                        </div>
                        <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{futureOpps}</span>
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">Backlog Futuro</div>
                    <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70">Oportunidades mapeadas</div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none"></div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Total Projetos</span>
                    <span className="text-4xl font-black text-slate-900 dark:text-white mt-1">{totalOpps}</span>
                </div>
            </div>

            {/* Matrix & Tasks Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Matrix Chart */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 bg-white/50 dark:bg-slate-900/50 h-[400px]">
                    <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                </div>

                {/* Quick Tasks List */}
                <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-white/50 dark:bg-slate-900/50 h-[400px] flex flex-col">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-slate-400"/> Tarefas Pendentes
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {allTasks.length === 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                Nenhuma tarefa urgente.
                            </div>
                        )}
                        {allTasks.map((task: any, i) => (
                            <div 
                                key={i} 
                                onClick={() => setSelectedTask(task)} // Open simple edit
                                className="p-3 rounded-xl bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer group transition-all"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[150px]">
                                        {task.projectTitle}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${task.status === 'doing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>
                                        {task.status}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                    {task.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => onNavigate('Active')}
                        className="mt-4 w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors flex items-center justify-center gap-2"
                    >
                        Ver Kanban Completo <ArrowRight className="w-3 h-3"/>
                    </button>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal 
                    task={{
                        id: selectedTask.id?.toString() || 'temp',
                        text: selectedTask.text,
                        description: selectedTask.description,
                        status: selectedTask.status as any,
                        completed: selectedTask.completed || selectedTask.status === 'done',
                        assignee: selectedTask.assignee,
                        assigneeId: selectedTask.assigneeId,
                        startDate: selectedTask.startDate,
                        dueDate: selectedTask.dueDate,
                        estimatedHours: selectedTask.estimatedHours,
                        gut: selectedTask.gut,
                        assigneeIsDev: selectedTask.assigneeIsDev
                    }}
                    nodeTitle={selectedTask.projectTitle || 'Tarefa'}
                    opportunityTitle={selectedTask.projectTitle}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updatedTask) => {
                        // This is a simplified handler. Real implementation needs proper context.
                        // Assuming updateTask service is available.
                        if (selectedTask.id && !isNaN(Number(selectedTask.id))) {
                             await updateTask(Number(selectedTask.id), {
                                titulo: updatedTask.text,
                                descricao: updatedTask.description,
                                status: updatedTask.status,
                                responsavel: updatedTask.assigneeId,
                                duracaohoras: updatedTask.estimatedHours,
                                datainicio: updatedTask.startDate,
                                datafim: updatedTask.dueDate
                            });
                        }
                        refreshTasks();
                    }}
                    onDelete={(id) => handleDeleteTask(Number(id))}
                />
            )}

            <div className="mt-8 mb-4 text-center">
                <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest opacity-50">
                    Desenvolvido por Shinkō Systems©
                </span>
            </div>
        </div>
    );
};