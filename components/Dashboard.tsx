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
            className="glass-card p-6 flex flex-col justify-between h-40 cursor-pointer group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md"
        >
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-10 border border-slate-100 dark:border-white/5 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 dark:text-[#A1A1AA] transition-all group-hover:text-amber-500" />
            </div>
            <div className="relative z-10">
                <div className="text-4xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight leading-none">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1AA] group-hover:text-amber-500 dark:group-hover:text-white transition-colors">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                        <Sparkles className="w-3 h-3"/> Inteligência Ativa
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Painel <span className="text-amber-500 font-extrabold">Operacional.</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 border border-slate-200 dark:border-[#333] rounded-xl bg-white dark:bg-transparent shadow-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-500"/>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-widest">Status: <span className="text-slate-900 dark:text-white">Excelente</span></span>
                </div>
            </div>

            {/* Grid de KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Em Execução" value={activeCount} icon={Activity} color="bg-emerald-500" onClick={() => onNavigate('Active')} />
                <KpiCard label="Pipeline Comercial" value={negotiationCount} icon={Users} color="bg-blue-500" onClick={() => onNavigate('Negotiation')} />
                <KpiCard label="PrioScore Médio" value={avgScore} icon={Zap} color="bg-amber-500" />
                <KpiCard label="Roadmap Futuro" value={futureCount} icon={Target} color="bg-purple-500" onClick={() => onNavigate('Future')} />
            </div>

            {/* Matrix Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-[#A1A1AA] whitespace-nowrap">Matriz de Priorização RDE</h3>
                    <div className="h-[1px] w-full bg-slate-200 dark:bg-[#333]"></div>
                </div>
                <div className="glass-card rounded-2xl p-8 h-[600px] relative overflow-hidden group shadow-lg">
                    <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                </div>
            </div>
        </div>
    );
};