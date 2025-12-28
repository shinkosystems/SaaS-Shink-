
import React from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Search, Plus, 
    Layers, ShieldCheck, ArrowRight, LayoutGrid,
    MessageSquare, Lightbulb, TrendingUp, Workflow
} from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onNavigate: (view: string) => void;
  onOpenProject: (opp: Opportunity) => void;
  user: any;
  theme: 'dark' | 'light';
  userData?: { name: string };
  onOpenCreate?: () => void;
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, userData, onOpenCreate
}) => {
    const firstName = userData?.name?.split(' ')[0] || 'Inovador';

    const ShortcutChip = ({ label, icon: Icon, onClick, color }: any) => (
        <button 
            onClick={onClick}
            className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group whitespace-nowrap shadow-sm"
        >
            <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${color || 'text-slate-500 dark:text-slate-400 group-hover:text-amber-500'}`} />
            <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-500">{label}</span>
        </button>
    );

    return (
        <div className="max-w-6xl mx-auto pt-8 md:pt-12 pb-20 space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* Seção Hero - Refinada para Tablet */}
            <div className="flex flex-col items-center text-center space-y-6 md:space-y-8 py-6 md:py-10">
                <div className="space-y-2 md:space-y-4 px-4">
                    <h2 className="text-xl md:text-3xl lg:text-4xl font-medium text-slate-400 dark:text-slate-500 tracking-tight flex items-center justify-center gap-2 md:gap-3">
                        <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-amber-500 animate-pulse" />
                        <span>Olá, <span className="text-slate-900 dark:text-white font-bold">{firstName}</span></span>
                    </h2>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                        Por onde começamos?
                    </h1>
                </div>

                {/* Barra de Comando Central - Otimizada para md: (Tablet) */}
                <div className="w-full max-w-2xl lg:max-w-3xl px-4 relative group">
                    <div className="absolute inset-0 bg-amber-500/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative glass-panel bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl md:rounded-[2.5rem] p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-2xl transition-all group-focus-within:border-amber-500/50 group-focus-within:ring-4 group-focus-within:ring-amber-500/5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-focus-within:text-amber-500 transition-colors">
                            <Plus className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <input 
                            type="text"
                            placeholder="Mapear nova ideia ou buscar ativo..."
                            className="flex-1 bg-transparent border-none outline-none text-base md:text-lg lg:text-xl font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                        />
                        <div className="flex items-center gap-1 md:gap-2 pr-1">
                            <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-all">
                                <Layers className="w-4 h-4"/>
                                <span className="text-[9px] font-black uppercase tracking-widest">Ativos</span>
                            </button>
                            <button 
                                onClick={onOpenCreate}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chips de Ação Rápida - Scroll em mobile/tablet se necessário */}
                <div className="flex flex-wrap justify-center gap-2 px-4 md:gap-3">
                    <ShortcutChip 
                        label="Mapear Oportunidade" 
                        icon={Target} 
                        onClick={() => onNavigate('framework-system')} 
                        color="text-amber-500"
                    />
                    <ShortcutChip 
                        label="Matriz RDE" 
                        icon={LayoutGrid} 
                        onClick={() => onNavigate('dashboard')} 
                    />
                    <ShortcutChip 
                        label="Crivo T.A.D.S" 
                        icon={ShieldCheck} 
                        onClick={() => onNavigate('list')} 
                    />
                    <ShortcutChip 
                        label="Gerar Workflow" 
                        icon={Workflow} 
                        onClick={() => onNavigate('kanban')} 
                    />
                </div>
            </div>

            {/* Matrix Visualization - Responsividade Tablet */}
            <div className="space-y-6 md:space-y-10 animate-in fade-in duration-1000 delay-300 px-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600 flex items-center gap-3">
                        <div className="w-6 md:w-10 h-px bg-current opacity-20"></div>
                        Inteligência de Portfólio
                    </h3>
                    <div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Total: <span className="text-amber-500">{opportunities.length}</span>
                    </div>
                </div>

                <div className="glass-panel p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#050507]/40 shadow-2xl h-[380px] md:h-[500px] lg:h-[550px] relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent pointer-events-none"></div>
                    <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                </div>
            </div>

            {/* Insights Rápidos - 2 colunas no tablet, 3 no desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-4">
                {[
                    { label: 'Saúde Operacional', val: '98%', icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Ideias no Backlog', val: opportunities.filter(o => o.status === 'Future').length, icon: Lightbulb, color: 'text-amber-500' },
                    { label: 'Mensagens Guru AI', val: '2 novas', icon: MessageSquare, color: 'text-blue-500' }
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-slate-200 dark:border-white/5 flex items-center gap-4 md:gap-5 hover:bg-white/10 transition-all cursor-pointer shadow-sm">
                        <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-white/5 shadow-sm ${stat.color}`}>
                            <stat.icon className="w-4 h-4 md:w-5 md:h-5"/>
                        </div>
                        <div>
                            <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                            <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-0.5 md:mt-1">{stat.val}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
