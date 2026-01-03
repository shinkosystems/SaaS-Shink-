
import React from 'react';
import { DbTask } from '../types';
import { Users, Clock, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
    tasks: DbTask[];
    members: any[];
    organizationId?: number;
}

export const WorkloadView: React.FC<Props> = ({ tasks, members }) => {
    const dailyCapacity = 8; // h/dia padrão

    const memberMetrics = members.map(m => {
        const memberTasks = tasks.filter(t => t.responsavel === m.id);
        const totalHours = memberTasks.reduce((acc, t) => acc + (t.duracaohoras || 2), 0);
        const taskCount = memberTasks.length;
        
        // Simulação de % baseada no total de horas (assumindo uma semana de 40h se o filtro for maior)
        const loadPercentage = Math.min(100, (totalHours / 40) * 100);

        return { ...m, totalHours, taskCount, loadPercentage, memberTasks };
    }).sort((a, b) => b.totalHours - a.totalHours);

    return (
        <div className="h-full p-8 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-black/10">
            <div className="max-w-6xl mx-auto space-y-8 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {memberMetrics.map(m => (
                        <div key={m.id} className="bg-white dark:bg-[#0a0a0c] rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-xl group hover:border-amber-500/30 transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden flex items-center justify-center font-black text-2xl text-slate-500 dark:text-white group-hover:scale-105 transition-transform">
                                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : m.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{m.nome}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{m.area || 'Colaborador'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-4xl font-black tracking-tighter ${m.totalHours > 40 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{m.totalHours}<span className="text-sm font-bold text-slate-400 ml-1">h</span></div>
                                    <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Esforço Alocado</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Zap className="w-3.5 h-3.5 text-amber-500"/> Ocupação Estimada
                                        </span>
                                        <span className={`text-xs font-black ${m.loadPercentage > 90 ? 'text-red-500' : 'text-amber-500'}`}>{m.loadPercentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${m.loadPercentage > 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-glow-amber'}`}
                                            style={{ width: `${m.loadPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cards Ativos</div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white">{m.taskCount}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Score</div>
                                        <div className="text-lg font-black text-emerald-500">92%</div>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pt-2 border-t border-slate-100 dark:border-white/5">
                                    {m.memberTasks.slice(0, 5).map((task: any) => (
                                        <div key={task.id} className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                <span className="truncate">{task.titulo}</span>
                                            </div>
                                            <span className="shrink-0">{task.duracaohoras || 2}h</span>
                                        </div>
                                    ))}
                                    {m.taskCount > 5 && (
                                        <p className="text-[8px] text-slate-400 italic text-center">+{m.taskCount - 5} outras tarefas alocadas</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
