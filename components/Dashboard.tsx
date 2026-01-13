
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, Archetype } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, ArrowRight, 
    Layers, ShieldCheck, TrendingUp, Rocket, 
    ChevronRight, Activity, Trophy, DollarSign,
    AlertTriangle, CheckCircle2, BarChart3, Clock, Info
} from 'lucide-react';
import { SuccessJourney } from './SuccessJourney';
import { getOperationalRates } from '../services/financialService';

interface Props {
  opportunities: Opportunity[];
  onNavigate: (view: string) => void;
  onOpenProject: (opp: Opportunity) => void;
  user: any;
  theme: 'dark' | 'light';
  userData?: { name: string };
  onOpenCreate?: () => void;
  onGuruPrompt?: (prompt: string) => void; 
  billingDate?: string;
  activeModules?: string[];
  userRole?: string;
  organizationId?: number;
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, userData, onOpenCreate, onGuruPrompt, activeModules = [], userRole, organizationId
}) => {
    const [rates, setRates] = useState<any>(null);
    const firstName = userData?.name?.split(' ')[0] || 'Inovador';

    useEffect(() => {
        if (organizationId) {
            getOperationalRates(organizationId).then(setRates);
        }
    }, [organizationId]);

    const milestones = [
        { id: '1', label: '1º Ativo', description: 'Mapeie sua primeira oportunidade.', completed: opportunities.length > 0, actionId: 'framework-system' },
        { id: '2', label: 'Priorização', description: 'Gere um Score PRIO-6 válido.', completed: opportunities.some(o => o.prioScore > 0), actionId: 'dashboard' },
        { id: '3', label: 'Crivo Técnico', description: 'Valide 3 ativos via T.A.D.S.', completed: opportunities.filter(o => o.tadsScore >= 6).length >= 3, actionId: 'list' },
        { id: '4', label: 'Escala', description: 'Tenha 1 projeto em execução.', completed: opportunities.some(o => o.status === 'Active'), actionId: 'kanban' },
    ];

    const dashboardMetrics = useMemo(() => {
        const activeProjects = opportunities.filter(o => o.status === 'Active');
        const backlogProjects = opportunities.filter(o => o.status === 'Future');
        
        // CÁLCULO DE MRR (REAL OU PROJETADO)
        let isProjectedMrr = false;
        const totalProjectedMrr = opportunities.reduce((acc, o) => {
            // Ignorar projetos internos na receita
            if (o.archetype === Archetype.INTERNAL_MARKETING) return acc;

            const mrrReal = Number(o.mrr || 0);
            if (mrrReal > 0) return acc + mrrReal;
            
            // Fallback: Cada ponto de revenue = R$ 2.000,00 de MRR projetados
            isProjectedMrr = true;
            return acc + (Number(o.revenue || 1) * 2000);
        }, 0);
        
        // CÁLCULO DE CUSTO ABC (REAL OU TEÓRICO)
        const hourlyRate = rates?.totalRate || 80;
        
        const totalHours = opportunities.reduce((acc, o) => {
            const hasNodes = o.bpmn?.nodes && o.bpmn.nodes.length > 0;
            if (!hasNodes) return acc;

            const nodeHours = o.bpmn?.nodes?.reduce((nAcc, n) => {
                const checklist = n.checklist || [];
                return nAcc + checklist.reduce((cAcc, t) => {
                    const h = Number(t.estimatedHours);
                    return cAcc + (isNaN(h) || h === 0 ? 4 : h);
                }, 0);
            }, 0) || 0;
            return acc + nodeHours;
        }, 0);

        const accumulatedCost = totalHours * hourlyRate;
        const monthlyCost = totalHours > 0 ? (accumulatedCost / 12) : 0; 
        const globalMargin = totalProjectedMrr > 0 ? ((totalProjectedMrr - monthlyCost) / totalProjectedMrr) * 100 : 0;

        return { 
            activeProjectsCount: activeProjects.length,
            backlogCount: backlogProjects.length,
            totalProjectedMrr,
            accumulatedCost,
            monthlyCost,
            globalMargin,
            isProjectedMrr,
            isProjectedCost: rates?.isFallback || totalHours === 0
        };
    }, [opportunities, rates]);

    return (
        <div className="max-w-7xl mx-auto pt-4 md:pt-10 pb-20 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* Header / Command Center */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div className="space-y-2">
                    <h2 className="text-lg md:text-2xl font-medium text-slate-400 dark:text-slate-500 tracking-tight flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span>Olá, <span className="text-slate-900 dark:text-white font-black">{firstName}</span></span>
                    </h2>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                        War Room de <span className="text-amber-500">Inovação</span>.
                    </h1>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => onNavigate('create-project')} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 transition-all">
                        <Rocket className="w-4 h-4"/> Ativar Novo Ativo
                    </button>
                </div>
            </div>

            {/* KPI Section: Saúde do Portfólio */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col justify-between h-44 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-emerald-500"/> MRR {dashboardMetrics.isProjectedMrr ? 'Projetado' : 'Real'}
                        </span>
                        {dashboardMetrics.isProjectedMrr && <div className="p-1.5 bg-amber-500/10 rounded-lg" title="Valores baseados no Score RDE (Configure MRR alvo no projeto)"><Info className="w-3 h-3 text-amber-500"/></div>}
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            R$ {dashboardMetrics.totalProjectedMrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Receita Mensal em Pipeline</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col justify-between h-44 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-500"/> Custo Mensal ABC
                        </span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            R$ {dashboardMetrics.monthlyCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Investimento/mês (Equipe)</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col justify-between h-44 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Target className="w-3 h-3 text-blue-500"/> Margem Projetada
                        </span>
                        <div className="p-2 bg-blue-500/10 rounded-lg"><BarChart3 className="w-3 h-3 text-blue-500"/></div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {dashboardMetrics.globalMargin.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                             <div className="flex-1 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, dashboardMetrics.globalMargin))}%` }}></div>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col justify-between h-44 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500"/> Ativos Ativos
                        </span>
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Rocket className="w-3 h-3 text-amber-500"/></div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {dashboardMetrics.activeProjectsCount} <span className="text-sm font-bold text-slate-400">em curso</span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Backlog: {dashboardMetrics.backlogCount} ideias</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 pb-20">
                <div className="lg:col-span-8 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3 px-2">
                        <Layers className="w-3.5 h-3.5"/> Algoritmo de Priorização RDE
                    </h3>
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl h-[550px] relative overflow-hidden">
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3 px-2">
                            <ShieldCheck className="w-3.5 h-3.5"/> Crivo de Fragilidade
                        </h3>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft space-y-6">
                            {opportunities.filter(o => o.tadsScore < 6).length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-amber-500">
                                        <AlertTriangle className="w-6 h-6 animate-pulse"/>
                                        <div className="text-xs font-black uppercase tracking-widest">Atenção: Ativos Frágeis</div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Detectamos {opportunities.filter(o => o.tadsScore < 6).length} projetos com baixo score T.A.D.S. Recomendamos revisão de viabilidade.</p>
                                    <div className="space-y-2 pt-4">
                                        {opportunities.filter(o => o.tadsScore < 6).slice(0, 3).map(o => (
                                            <div key={o.id} onClick={() => onOpenProject(o)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl flex justify-between items-center cursor-pointer hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20">
                                                <span className="text-[10px] font-bold truncate max-w-[150px]">{o.title}</span>
                                                <span className="text-[9px] font-black text-rose-500 uppercase">{o.tadsScore}/10</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500"/>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DNA do Portfólio Robusto</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3 px-2">
                            <Trophy className="w-3.5 h-3.5"/> Maturidade Shinkō
                        </h3>
                        <SuccessJourney milestones={milestones} onAction={onNavigate} />
                    </div>
                </div>
            </div>
        </div>
    );
};
