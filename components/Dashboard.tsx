
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Search, Plus, 
    Layers, ShieldCheck, ArrowRight, LayoutGrid,
    MessageSquare, Lightbulb, TrendingUp, Workflow, BrainCircuit,
    Calendar, CreditCard, Shield, Rocket, ChevronRight, Activity, Trophy
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
    const [commandInput, setCommandInput] = useState('');
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

    // CÁLCULO DINÂMICO DE ROI BASEADO EM ABC REAL
    const metrics = useMemo(() => {
        const totalRevenue = opportunities.reduce((acc, opp) => acc + (opp.revenue * 10000), 0); // Mock scale factor
        const totalPrioScore = opportunities.reduce((acc, opp) => acc + opp.prioScore, 0);
        const avgMargin = rates?.totalRate ? 72 : 0; // Exemplo de margem baseada em custos

        return { totalRevenue, totalPrioScore, avgMargin };
    }, [opportunities, rates]);

    const handleCommandSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commandInput.trim()) return;
        if (onGuruPrompt) {
            onGuruPrompt(commandInput);
            setCommandInput('');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pt-4 md:pt-10 pb-20 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 overflow-x-hidden">
            
            {/* Hero Section */}
            <div className="flex flex-col items-center text-center space-y-4 md:space-y-6 py-4 md:py-8 lg:py-6">
                <div className="space-y-2 px-4">
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-medium text-slate-400 dark:text-slate-500 tracking-tight flex items-center justify-center gap-2 md:gap-3">
                        <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-500 animate-pulse" />
                        <span>Olá, <span className="text-slate-900 dark:text-white font-bold">{firstName}</span></span>
                    </h2>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight lg:mb-2">
                        Painel de <span className="text-amber-500">Operações</span>.
                    </h1>
                </div>

                <div className="w-full max-w-xl lg:max-w-2xl px-4 relative group">
                    <form onSubmit={handleCommandSubmit} className="relative glass-panel bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-2 md:p-3 flex items-center gap-2 md:gap-4 shadow-2xl transition-all group-focus-within:border-amber-500/50">
                        <BrainCircuit className="w-5 h-5 ml-4 text-slate-400" />
                        <input 
                            value={commandInput}
                            onChange={e => setCommandInput(e.target.value)}
                            placeholder="Comande sua engenharia via IA..."
                            className="flex-1 bg-transparent border-none outline-none text-sm md:text-base font-medium text-slate-900 dark:text-white"
                        />
                        <button type="submit" className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg"><ArrowRight className="w-5 h-5" /></button>
                    </form>
                </div>
            </div>

            {/* Journey */}
            <div className="px-4">
                <SuccessJourney milestones={milestones} onAction={onNavigate} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
                <div className="lg:col-span-8 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-3 px-2">
                        <Layers className="w-3.5 h-3.5"/> Portfólio PRIO-6
                    </h3>
                    <div className="glass-panel p-4 md:p-6 rounded-[2.5rem] border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#050507]/40 shadow-xl h-[500px]">
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {userRole === 'dono' && (
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-3 px-2">
                                <TrendingUp className="w-3.5 h-3.5"/> Indicadores Financeiros
                            </h3>
                            <div className="glass-panel p-6 rounded-[2rem] border-slate-200 dark:border-white/5 flex flex-col justify-between h-40 animate-in zoom-in duration-500 bg-white dark:bg-[#050507]/40">
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3 text-emerald-500"/> Custo/Hora Operacional
                                </div>
                                <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                                    R$ {rates?.totalRate?.toFixed(2) || '0.00'}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[7px] font-black text-slate-400 uppercase">
                                        <span>RH + Tecnologia</span>
                                        <span>Base ABC Industrial</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 shadow-glow-emerald" style={{width: '100%'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="glass-card p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/5 to-transparent border-slate-200 dark:border-white/5 flex flex-col justify-between h-40 group">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Rocket className="w-3 h-3 text-amber-500"/> Ativos Ativos
                        </div>
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                            {opportunities.filter(o => o.status === 'Active').length}
                        </div>
                        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Iniciativas em execução técnica</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
