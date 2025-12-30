
import React, { useState, useMemo } from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Search, Plus, 
    Layers, ShieldCheck, ArrowRight, LayoutGrid,
    MessageSquare, Lightbulb, TrendingUp, Workflow, BrainCircuit,
    Calendar, CreditCard, Shield, Rocket, ChevronRight, Activity
} from 'lucide-react';

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
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, userData, onOpenCreate, onGuruPrompt, billingDate, activeModules = []
}) => {
    const [commandInput, setCommandInput] = useState('');
    const firstName = userData?.name?.split(' ')[0] || 'Inovador';

    const daysRemaining = useMemo(() => {
        if (!billingDate) return null;
        const diff = new Date(billingDate).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [billingDate]);

    const handleCommandSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commandInput.trim()) return;
        
        if (onGuruPrompt) {
            onGuruPrompt(commandInput);
            setCommandInput('');
        }
    };

    const ShortcutChip = ({ label, icon: Icon, onClick, color }: any) => (
        <button 
            onClick={onClick}
            className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group whitespace-nowrap shadow-sm"
        >
            <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${color || 'text-slate-500 dark:text-slate-400 group-hover:text-amber-500'}`} />
            <span className="text-[9px] md:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-500">{label}</span>
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto pt-4 md:pt-10 pb-20 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 overflow-x-hidden">
            
            {/* Seção Hero - Otimizada */}
            <div className="flex flex-col items-center text-center space-y-4 md:space-y-6 py-4 md:py-8 lg:py-6">
                <div className="space-y-2 px-4">
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-medium text-slate-400 dark:text-slate-500 tracking-tight flex items-center justify-center gap-2 md:gap-3">
                        <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-500 animate-pulse" />
                        <span>Olá, <span className="text-slate-900 dark:text-white font-bold">{firstName}</span></span>
                    </h2>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight lg:mb-2">
                        Painel de <span className="text-amber-500">Oportunidades</span>.
                    </h1>
                </div>

                {/* Barra de Comando Central */}
                <div className="w-full max-w-xl lg:max-w-2xl px-4 relative group">
                    <div className="absolute inset-0 bg-amber-500/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <form 
                        onSubmit={handleCommandSubmit}
                        className="relative glass-panel bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-2 md:p-3 flex items-center gap-2 md:gap-4 shadow-2xl transition-all group-focus-within:border-amber-500/50 group-focus-within:ring-4 group-focus-within:ring-amber-500/5"
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-focus-within:text-amber-500 transition-colors">
                            <BrainCircuit className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <input 
                            type="text"
                            value={commandInput}
                            onChange={e => setCommandInput(e.target.value)}
                            placeholder="Peça ao Guru para analisar seu portfólio..."
                            className="flex-1 bg-transparent border-none outline-none text-sm md:text-base lg:text-lg font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                        />
                        <button 
                            type="submit"
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </form>
                </div>

                {/* Chips de Ação Rápida */}
                <div className="flex flex-wrap justify-center gap-2 px-4">
                    <ShortcutChip label="Mapear Oportunidade" icon={Target} onClick={() => onNavigate('framework-system')} color="text-amber-500"/>
                    <ShortcutChip label="Fluxo Operacional" icon={Workflow} onClick={() => onNavigate('kanban')}/>
                    <ShortcutChip label="Pipeline CRM" icon={TrendingUp} onClick={() => onNavigate('crm')}/>
                </div>
            </div>

            {/* Grid Principal: Matriz + Widget de Ciclo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
                
                {/* LADO ESQUERDO: MATRIZ RDE */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-3">
                            <Layers className="w-3.5 h-3.5"/> Inteligência de Portfólio (PRIO-6)
                        </h3>
                    </div>
                    <div className="glass-panel p-4 md:p-6 rounded-[2.5rem] border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#050507]/40 shadow-xl h-[400px] md:h-[500px] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                    </div>
                </div>

                {/* LADO DIREITO: WIDGET DE CICLO & ATIVOS */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-3 px-2">
                        {/* Fix: Added Activity to lucide-react imports to resolve "Cannot find name 'Activity'" error */}
                        <Activity className="w-3.5 h-3.5"/> Ciclo de Operação
                    </h3>
                    
                    <div className="glass-card p-8 rounded-[2.5rem] bg-slate-900 border-white/10 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        
                        <div className="relative z-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"><Calendar className="w-6 h-6"/></div>
                                {daysRemaining !== null && (
                                    <div className="text-right">
                                        <div className="text-4xl font-black tracking-tighter text-amber-500">{daysRemaining}</div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Dias para o Ciclo</div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Seus Ativos Ativos</div>
                                <div className="flex flex-wrap gap-2">
                                    {activeModules.slice(0, 6).map(mod => (
                                        <span key={mod} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-white/10 text-slate-300">
                                            {mod}
                                        </span>
                                    ))}
                                    {activeModules.length > 6 && <span className="text-[9px] font-bold text-slate-500 flex items-center">+{activeModules.length - 6}</span>}
                                    {activeModules.length === 0 && <span className="text-[9px] font-bold text-slate-600">Nenhum módulo contratado</span>}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => onNavigate('profile')}
                            className="relative z-10 w-full py-4 mt-8 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-amber-500 transition-all flex items-center justify-center gap-2 group/btn active:scale-95"
                        >
                            <CreditCard className="w-3.5 h-3.5"/> Gerenciar Ativos <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform"/>
                        </button>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-6 rounded-[2rem] border-slate-200 dark:border-white/5 flex flex-col justify-between h-32 hover:border-blue-500/30 transition-all">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saúde Técnica</div>
                             <div className="text-2xl font-black text-slate-900 dark:text-white">98%</div>
                             <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{width: '98%'}}></div>
                             </div>
                        </div>
                        <div className="glass-card p-6 rounded-[2rem] border-slate-200 dark:border-white/5 flex flex-col justify-between h-32 hover:border-emerald-500/30 transition-all">
                             <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ROI Previsto</div>
                             <div className="text-2xl font-black text-slate-900 dark:text-white">+42%</div>
                             <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{width: '42%'}}></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insights Rápidos - Bottom Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
                {[
                    { label: 'Projetos Críticos (L4)', val: opportunities.filter(o => o.intensity === 4).length, icon: Rocket, color: 'text-red-500' },
                    { label: 'Validados TADS', val: opportunities.filter(o => o.tadsScore >= 8).length, icon: ShieldCheck, color: 'text-emerald-500' },
                    { label: 'Ideias no Backlog', val: opportunities.filter(o => o.status === 'Future').length, icon: Lightbulb, color: 'text-amber-500' }
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 md:p-5 rounded-2xl border-slate-200 dark:border-white/5 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer shadow-sm group">
                        <div className={`p-2.5 rounded-xl bg-white dark:bg-white/5 shadow-sm ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                            <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-0.5">{stat.val}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
