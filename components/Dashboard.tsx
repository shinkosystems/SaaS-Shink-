import React, { useState } from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Search, Plus, 
    Layers, ShieldCheck, ArrowRight, LayoutGrid,
    MessageSquare, Lightbulb, TrendingUp, Workflow, BrainCircuit
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
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onNavigate, onOpenProject, user, theme, userData, onOpenCreate, onGuruPrompt
}) => {
    const [commandInput, setCommandInput] = useState('');
    const firstName = userData?.name?.split(' ')[0] || 'Inovador';

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
            
            {/* Seção Hero - Otimizada para Tablet Horizontal */}
            <div className="flex flex-col items-center text-center space-y-4 md:space-y-6 py-4 md:py-8 lg:py-6">
                <div className="space-y-2 px-4">
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-medium text-slate-400 dark:text-slate-500 tracking-tight flex items-center justify-center gap-2 md:gap-3">
                        <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-500 animate-pulse" />
                        <span>Olá, <span className="text-slate-900 dark:text-white font-bold">{firstName}</span></span>
                    </h2>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight lg:mb-2">
                        Por onde começamos?
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
                            placeholder="Peça ao Guru AI..."
                            className="flex-1 bg-transparent border-none outline-none text-sm md:text-base lg:text-lg font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                        />
                        <button 
                            type="submit"
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </form>
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">Comando Ativo</span>
                    </div>
                </div>

                {/* Chips de Ação Rápida */}
                <div className="flex flex-wrap justify-center gap-2 px-4">
                    <ShortcutChip label="Mapear Oportunidade" icon={Target} onClick={() => onNavigate('framework-system')} color="text-amber-500"/>
                    <ShortcutChip label="Matriz RDE" icon={LayoutGrid} onClick={() => onNavigate('dashboard')}/>
                    <ShortcutChip label="Fluxo Operacional" icon={Workflow} onClick={() => onNavigate('kanban')}/>
                </div>
            </div>

            {/* Matrix Visualization - Responsive Height */}
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-1000 delay-300 px-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 flex items-center gap-3">
                        Inteligência de Portfólio
                    </h3>
                    <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Total: <span className="text-amber-500">{opportunities.length}</span>
                    </div>
                </div>

                <div className="glass-panel p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#050507]/40 shadow-xl h-[340px] md:h-[450px] lg:h-[500px] relative overflow-hidden">
                    <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                </div>
            </div>

            {/* Insights Rápidos - Grid optimized for horizontal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
                {[
                    { label: 'Saúde Operacional', val: '98%', icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Ideias no Backlog', val: opportunities.filter(o => o.status === 'Future').length, icon: Lightbulb, color: 'text-amber-500' },
                    { label: 'Sistema', val: 'Estável', icon: ShieldCheck, color: 'text-blue-500' }
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 md:p-5 rounded-2xl border-slate-200 dark:border-white/5 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer shadow-sm">
                        <div className={`p-2 rounded-xl bg-white dark:bg-white/5 shadow-sm ${stat.color}`}>
                            <stat.icon className="w-4 h-4 md:w-5 md:h-5"/>
                        </div>
                        <div>
                            <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                            <div className="text-base md:text-lg font-black text-slate-900 dark:text-white mt-0.5">{stat.val}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};