import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, Archetype } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Rocket, Activity, Trophy, DollarSign,
    AlertTriangle, CheckCircle2, BarChart3, Clock, Info, Layers, ChevronRight
} from 'lucide-react'; // Fix: Corrected typo in import from lucide-center to lucide-react
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
    opportunities, onNavigate, onOpenProject, theme, userData, organizationId
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

    const stats = useMemo(() => {
        const hourlyRate = rates?.totalRate || 85;
        const totalMrr = opportunities.reduce((acc, o) => acc + (Number(o.mrr) || 0), 0);
        const totalHours = opportunities.reduce((acc, o) => {
            const nodeHours = o.bpmn?.nodes?.reduce((nAcc, n) => nAcc + (n.checklist?.reduce((cAcc, t) => cAcc + (Number(t.estimatedHours) || 0), 0) || 0), 0) || 0;
            return acc + nodeHours;
        }, 0);
        const activeCost = totalHours * hourlyRate;
        const margin = totalMrr > 0 ? ((totalMrr - (activeCost/12)) / totalMrr) * 100 : 0;

        return { totalMrr, activeCost, margin, activeCount: opportunities.filter(o => o.status === 'Active').length };
    }, [opportunities, rates]);

    return (
        <div className="max-w-7xl mx-auto pt-10 pb-24 space-y-12 animate-in fade-in duration-1000">
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 px-4">
                <div className="space-y-2">
                    <h2 className="text-2xl font-medium text-slate-400 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span>Bom dia, <span className="text-slate-900 dark:text-white font-black">{firstName}</span></span>
                    </h2>
                    <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">War Room.</h1>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => onNavigate('framework-system')} className="px-8 py-4 bg-amber-500 text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-glow-amber hover:scale-105 transition-all">
                        <Zap className="w-4 h-4"/> Framework Simulator
                    </button>
                    <button onClick={() => onNavigate('create-project')} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 transition-all">
                        <Rocket className="w-4 h-4"/> Novo Ativo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-44 shadow-soft group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign className="w-3 h-3 text-emerald-500"/> MRR Ativo</span>
                    <div>
                        <div className="text-4xl font-black tracking-tighter">R$ {stats.totalMrr.toLocaleString('pt-BR')}</div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Receita Recorrente Consolidada</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-44 shadow-soft group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Zap className="w-3 h-3 text-amber-500"/> WIP Ativo</span>
                    <div>
                        <div className="text-4xl font-black tracking-tighter">{stats.activeCount} <span className="text-sm font-bold text-slate-400">Ativos</span></div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Em Execução na Engenharia</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-44 shadow-soft group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target className="w-3 h-3 text-blue-500"/> Margem Global</span>
                    <div>
                        <div className="text-4xl font-black tracking-tighter">{stats.margin.toFixed(1)}%</div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">ROI Médio do Portfólio</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between h-44 shadow-soft group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3 text-purple-500"/> Eficiência ABC</span>
                    <div>
                        <div className="text-4xl font-black tracking-tighter">94%</div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Aproveitamento de Esforço</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 pb-20">
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl h-[600px] relative overflow-hidden">
                         <div className="absolute top-0 left-0 p-8 z-10">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                                <Zap className="w-5 h-5 text-amber-500"/> Matriz RDE Industrial
                            </h3>
                         </div>
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -mr-16 -mt-16"></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-black tracking-tight mb-2">Framework Shinkō</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">Siga a jornada de maturidade para extrair o máximo de previsibilidade da sua inovação.</p>
                        </div>
                        <SuccessJourney milestones={milestones} onAction={onNavigate} />
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex items-center justify-between group cursor-pointer" onClick={() => onNavigate('framework-system')}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform"><Target className="w-6 h-6"/></div>
                            <div>
                                <div className="text-sm font-black tracking-tight">Simular Valor</div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Acesse o Laboratório</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-all"/>
                    </div>
                </div>
            </div>
        </div>
    );
};
