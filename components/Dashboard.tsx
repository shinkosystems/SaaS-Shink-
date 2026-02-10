import React, { useMemo, useEffect, useState } from 'react';
import { Opportunity } from '../types';
import MatrixChart from './MatrixChart';
import { 
    Zap, Target, Sparkles, Trophy, DollarSign,
    Lock, Search, ArrowUpRight, Eye, HelpCircle, UserPlus, 
    ChevronRight, Briefcase, BarChart3, TrendingUp, AlertCircle,
    Plus, PlayCircle, Layers, CreditCard, Settings, EyeOff
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
    opportunities, onOpenProject, userData, organizationId, onNavigate, theme, onOpenCreate
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

    const ActionButton = ({ icon: Icon, label, onClick }: any) => (
        <div className="flex flex-col items-center gap-2 min-w-[80px] group">
            <button 
                onClick={onClick}
                className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-all duration-200 active:scale-90 border border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
            >
                <Icon className="w-5 h-5 text-slate-900 dark:text-white" />
            </button>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 text-center tracking-tight">{label}</span>
        </div>
    );

    const InsightCard = ({ title, desc, icon: Icon, color }: any) => (
        <div className="min-w-[260px] bg-slate-100 dark:bg-white/5 p-5 rounded-2xl flex flex-col justify-between h-36 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer">
            <div className={`p-2 w-fit rounded-lg ${color} bg-opacity-10 mb-2`}>
                <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <span className={`font-bold ${color.replace('bg-', 'text-')}`}>{title} </span>
                {desc}
            </p>
        </div>
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
            
            {/* Nubank-Style Balanced Header - Full Width Background */}
            <div className="bg-[#F59E0B] px-6 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 transition-all">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div 
                            className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white/30 transition-all border border-white/10"
                            onClick={() => onNavigate('profile')}
                        >
                            {userData?.avatar ? (
                                <img src={userData.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <UserPlus className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setShowValues(!showValues)}
                                className="p-3 rounded-full hover:bg-white/10 text-white transition-all"
                            >
                                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                            <button className="p-3 rounded-full hover:bg-white/10 text-white transition-all">
                                <HelpCircle className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => onNavigate('settings')}
                                className="p-3 rounded-full hover:bg-white/10 text-white transition-all"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
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
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8">
                        <InsightCard 
                            title="Desempenho:" 
                            desc={`Crescimento de 12% no trimestre.`} 
                            icon={TrendingUp} 
                            color="bg-emerald-500" 
                        />
                        <InsightCard 
                            title="Foco Técnico:" 
                            desc="Aguardando validação em 3 projetos." 
                            icon={Target} 
                            color="bg-amber-500" 
                        />
                        <InsightCard 
                            title="Guru IA:" 
                            desc="Novo insight sobre ROI disponível." 
                            icon={Sparkles} 
                            color="bg-purple-500" 
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