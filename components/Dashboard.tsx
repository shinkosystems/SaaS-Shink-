
import React, { useState } from 'react';
import { Opportunity, BpmnTask } from '../types';
import MatrixChart from './MatrixChart';
import { TaskDetailModal } from './TaskDetailModal';
import { Activity, Users, DollarSign, TrendingUp, Zap, Target } from 'lucide-react';
import { updateTask, deleteTask } from '../services/projectService';

interface Props {
  opportunities: Opportunity[];
  onNavigate: (status: string) => void;
  onOpenProject: (opp: Opportunity) => void;
  user: any;
  theme: 'dark' | 'light';
  userRole?: string;
  organizationId?: number;
  appBrandName?: string;
  whitelabel?: boolean;
  onActivateWhitelabel?: () => void;
  activeModules?: string[];
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, 
    userRole, organizationId, appBrandName, whitelabel, onActivateWhitelabel, activeModules 
}) => {
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    const activeCount = opportunities.filter(o => o.status === 'Active').length;
    const negotiationCount = opportunities.filter(o => o.status === 'Negotiation').length;
    const futureCount = opportunities.filter(o => o.status === 'Future').length;
    
    // Quick Stats Calculation
    const totalRevenue = opportunities.reduce((acc, curr) => acc + (curr.revenue || 0) * 1000, 0); // Mock scale for visualization
    const avgScore = opportunities.length > 0 
        ? (opportunities.reduce((acc, curr) => acc + curr.prioScore, 0) / opportunities.length).toFixed(1) 
        : '0.0';

    const refreshTasks = () => {
        // Logic to refresh tasks if needed, mostly handled by parent reload usually
    };

    const handleDeleteTask = async (id: number) => {
        await deleteTask(id);
        setSelectedTask(null);
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Olá, {user.user_metadata?.full_name?.split(' ')[0] || 'Gestor'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Aqui está o raio-x da sua operação hoje.
                    </p>
                </div>
                {!whitelabel && userRole === 'dono' && (
                    <button onClick={onActivateWhitelabel} className="text-xs text-slate-400 hover:text-shinko-primary underline transition-colors">
                        Ativar White Label
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div onClick={() => onNavigate('Active')} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-emerald-500/50 cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Activity className="w-5 h-5"/>
                        </div>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">Sprints</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        {activeCount}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Projetos em Execução</p>
                </div>

                <div onClick={() => onNavigate('Negotiation')} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-blue-500/50 cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <Users className="w-5 h-5"/>
                        </div>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">CRM</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                        {negotiationCount}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Em Negociação</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-purple-500/50 cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                            <Zap className="w-5 h-5"/>
                        </div>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">Score</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                        {avgScore}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Média de Priorização</p>
                </div>

                <div onClick={() => onNavigate('Future')} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-amber-500/50 cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                            <Target className="w-5 h-5"/>
                        </div>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">Backlog</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                        {futureCount}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Oportunidades Futuras</p>
                </div>
            </div>

            {/* Matrix Chart Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/5 p-6 h-[500px] shadow-sm relative overflow-hidden">
                <MatrixChart 
                    data={opportunities} 
                    onClick={onOpenProject} 
                    theme={theme} 
                />
            </div>

            {/* Modals */}
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
                        assigneeIsDev: selectedTask.assigneeIsDev,
                        tags: selectedTask.tags || [],
                        members: selectedTask.members || [],
                        dbId: selectedTask.id
                    }}
                    nodeTitle={selectedTask.projectTitle || 'Tarefa'}
                    opportunityTitle={selectedTask.projectTitle}
                    organizationId={organizationId}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (updatedTask) => {
                        if (updatedTask.id && !isNaN(Number(updatedTask.id))) {
                            await updateTask(Number(updatedTask.id), {
                                titulo: updatedTask.text,
                                descricao: updatedTask.description,
                                status: updatedTask.status,
                                responsavel: updatedTask.assigneeId,
                                duracaohoras: updatedTask.estimatedHours,
                                datainicio: updatedTask.startDate,
                                datafim: updatedTask.dueDate,
                                etiquetas: updatedTask.tags,
                                membros: updatedTask.members
                            });
                        }
                        refreshTasks();
                    }}
                    onDelete={(id) => handleDeleteTask(Number(id))}
                />
            )}
        </div>
    );
};
