
import React, { useMemo, useEffect, useState } from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Trophy, DollarSign,
    Lock, Search, ArrowUpRight, Eye, HelpCircle, UserPlus, 
    ChevronRight, Briefcase, BarChart3, TrendingUp, AlertCircle,
    Plus, PlayCircle, Layers, CreditCard, Settings, EyeOff,
    CalendarDays, User
} from 'lucide-react';
import { getOperationalRates } from '../services/financialService';

interface Props {
  opportunities: Opportunity[];
  onNavigate: (view: string) => void;
  onOpenProject: (opp: Opportunity) => void;
  user: any;
  theme: 'dark' | 'light';
  userData?: { name: string; avatar?: string | null };
  organizationId?: number;
  onOpenCreate?: () => void;
  onGuruPrompt?: (prompt: string) => void;
  billingDate?: string;
  activeModules?: string[];
  userRole?: string;
}

export const Dashboard: React.FC<Props> = ({ 
    opportunities, onOpenProject, userData, organizationId, onNavigate, theme, onOpenCreate, onGuruPrompt
}) => {
    const [rates, setRates] = useState<any>(null);
    const [showValues, setShowValues] = useState(true);
    const firstName = userData?.name?.split(' ')[0] || 'Inovador';

    useEffect(() => {
        if (organizationId) {
            getOperationalRates(organizationId).then(setRates);
        }
    }, [organizationId]);

    const stats = useMemo(() => {
        const totalMrr = opportunities.reduce((acc, o) => acc + (Number(o.mrr) || 0), 0);
        const activeCount = opportunities.filter(o => o.status === 'Active').length;
        const validationCount = opportunities.filter(o => o.status === 'Future').length;
        return { totalMrr, activeCount, validationCount };
    }, [opportunities]);

    const ActionButton = ({ icon: Icon, label, onClick, color = "text-slate-900 dark:text-white" }: any) => (
        <div className="flex flex-col items-center gap-2 min-w-[80px] group">
            <button 
                onClick={onClick}
                className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-all duration-200 active:scale-90 border border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
            >
                <Icon className={`w-5 h-5 ${color}`} />
            </button>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 text-center tracking-tight">{label}</span>
        </div>
    );

    const InsightCard = ({ title, desc, icon: Icon, color, onClick }: any) => (
        <button 
            onClick={onClick}
            className="min-w-[280px] bg-white dark:bg-white/5 p-6 rounded-[2rem] flex flex-col justify-between h-44 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl dark:shadow-none transition-all text-left group active:scale-95"
        >
            <div className={`p-3 w-fit rounded-xl ${color} bg-opacity-10 mb-2 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div className="space-y-2">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span className={`font-black uppercase tracking-tight ${color.replace('bg-', 'text-')}`}>{title} </span>
                    {desc}
                </p>
                <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                    Abrir Detalhes <ChevronRight className="w-2 h-2"/>
                </div>
            </div>
        </button>
    );

    const SectionRow = ({ title, value, subtext, onClick, icon: Icon }: any) => (
        <button 
            onClick={onClick}
            className="w-full flex flex-col p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-transparent text-left hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all group"
        >
            <div className="flex justify-between items-center w-full mb-2">
                <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-0.5">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {showValues ? value : '••••'}
                </div>
                {subtext && <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{subtext}</div>}
            </div>
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#020203] pb-32">
            
            {/* Unidade Nubank-Style Header */}
            <div className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-8 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-7xl mx-auto flex flex-col gap-10">
                    <div className="flex justify-between items-center">
                        <div 
                            className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white/30 transition-all border border-white/10"
                            onClick={() => onNavigate('profile')}
                        >
                            {userData?.avatar ? (
                                <img src={userData.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowValues(!showValues)}
                                className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all border border-white/10"
                            >
                                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                            <button className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all border border-white/10">
                                <HelpCircle className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => onNavigate('settings')}
                                className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all border border-white/10"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                        Olá, {firstName}
                    </h2>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full">
                
                {/* Account Section */}
                <div className="px-0 md:px-6">
                    <SectionRow 
                        title="Portfólio & MRR" 
                        value={`R$ ${stats.totalMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        subtext="Faturamento Mensal Recorrente"
                        icon={DollarSign}
                        onClick={() => onNavigate('financial')}
                    />
                </div>

                {/* Standard Action Carrossel */}
                <div className="px-6 py-6 overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        <ActionButton icon={Plus} label="Novo Ativo" onClick={onOpenCreate} />
                        <ActionButton icon={CalendarDays} label="Agenda" onClick={() => onNavigate('agenda')} color="text-amber-500" />
                        <ActionButton icon={CreditCard} label="Financeiro" onClick={() => onNavigate('financial')} />
                        <ActionButton icon={TrendingUp} label="Insights" onClick={() => onNavigate('intelligence')} />
                    </div>
                </div>

                {/* My Assets Link */}
                <div className="px-6 pb-6">
                    <button 
                        onClick={() => onNavigate('list')}
                        className="w-full p-5 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center gap-4 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-left"
                    >
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-white flex-1 uppercase tracking-widest">Ver Carteira de Ativos</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                </div>

                {/* Insight Carousel */}
                <div className="px-6 overflow-hidden">
                    <div className="flex gap-6 overflow-x-auto no-scrollbar pb-10 pt-2 -mx-2 px-2">
                        <InsightCard 
                            title="Desempenho" 
                            desc={`Crescimento de 12% no trimestre.`} 
                            icon={TrendingUp} 
                            color="bg-emerald-500" 
                            onClick={() => onNavigate('intelligence')}
                        />
                        <InsightCard 
                            title="Foco Técnico" 
                            desc={`${stats.validationCount} projetos aguardando validação.`} 
                            icon={Target} 
                            color="bg-amber-500" 
                            onClick={() => onNavigate('list')}
                        />
                        <InsightCard 
                            title="Guru IA" 
                            desc="Novo insight sobre ROI disponível." 
                            icon={Sparkles} 
                            color="bg-purple-500" 
                            onClick={() => onGuruPrompt ? onGuruPrompt("Quais são os novos insights sobre ROI para o meu portfólio atual?") : onNavigate('guru')}
                        />
                    </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-2">
                    <div className="bg-white dark:bg-transparent">
                        <SectionRow 
                            title="Ativos em Execução" 
                            value={`${stats.activeCount} Projetos`}
                            subtext="Operação em Performance"
                            icon={Briefcase}
                            onClick={() => onNavigate('list')}
                        />
                        
                        <div className="p-6 md:p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matriz de Prioridade</span>
                                </div>
                            </div>
                            <div className="aspect-square w-full max-h-[500px] bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-100 dark:border-white/5 p-4 overflow-hidden shadow-inner">
                                <MatrixChart data={opportunities} onClick={onOpenProject} theme={theme} />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Analise o quadrante de valor atualizado</p>
                        </div>

                        <SectionRow 
                            title="Novas Ideias" 
                            value={`${stats.validationCount} Oportunidades`}
                            subtext="Aguardando Validação T.A.D.S."
                            icon={Target}
                            onClick={() => onNavigate('list')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
