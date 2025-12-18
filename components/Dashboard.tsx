
import React from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { Activity, Users, Zap, Target, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';

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
    opportunities, onNavigate, onOpenProject, theme
}) => {
    const activeCount = opportunities.filter(o => o.status === 'Active').length;
    const negotiationCount = opportunities.filter(o => o.status === 'Negotiation').length;
    const futureCount = opportunities.filter(o => o.status === 'Future').length;
    const avgScore = opportunities.length > 0 
        ? (opportunities.reduce((acc, curr) => acc + curr.prioScore, 0) / opportunities.length).toFixed(1) 
        : '0.0';

    const KpiCard = ({ label, value, icon: Icon, color, onClick }: any) => (
        <div 
            onClick={onClick}
            className="glass-card p-8 flex flex-col justify-between h-48 cursor-pointer group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.05] rounded-full -mr-12 -mt-12 blur-3xl group-hover:opacity-[0.1] transition-opacity"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-4 rounded-[1.2rem] ${color} bg-opacity-20 text-white dark:text-white shadow-sm border border-white/10`}>
                    <Icon className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-6 h-6 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="relative z-10">
                <div className="text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter leading-none">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                        <Sparkles className="w-3 h-3"/> Inteligência Ativa
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                        Painel <span className="text-amber-500">Operacional</span>.
                    </h1>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 glass-panel rounded-[1.5rem] shadow-sm">
                    <TrendingUp className="w-5 h-5 text-emerald-500"/>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Saúde da Operação: <span className="text-slate-900 dark:text-white">Excelência</span></span>
                </div>
            </div>

            {/* Grid de KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard label="Em Execução" value={activeCount} icon={Activity} color="bg-emerald-500" onClick={() => onNavigate('Active')} />
                <KpiCard label="Pipeline Comercial" value={negotiationCount} icon={Users} color="bg-blue-500" onClick={() => onNavigate('Negotiation')} />
                <KpiCard label="PrioScore Médio" value={avgScore} icon={Zap} color="bg-amber-500" />
                <KpiCard label="Roadmap Futuro" value={futureCount} icon={Target} color="bg-purple-500" onClick={() => onNavigate('Future')} />
            </div>

            {/* Matrix Section */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 whitespace-nowrap">Matriz de Priorização RDE</h3>
                    <div className="h-px w-full bg-slate-200 dark:bg-white/5"></div>
                </div>
                <div className="glass-panel rounded-[3.5rem] p-10 h-[650px] shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                </div>
            </div>
        </div>
    );
};
