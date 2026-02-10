import React, { useState, useEffect, useMemo } from 'react';
import { ProductIndicators } from '../components/ProductIndicators';
import { DevIndicators } from '../components/DevIndicators';
import { CategoryInsights } from '../components/CategoryInsights';
import { Opportunity } from '../types';
import { 
    BarChart3, Code2, Sparkles, PieChart, Zap, Target, 
    TrendingUp, Activity, ShieldCheck, ArrowRight, BrainCircuit,
    Info, Loader2, Gauge, Heart, X
} from 'lucide-react';
import { calculateDevMetrics, fetchProductMetrics } from '../services/analyticsService';
import { getOperationalRates } from '../services/financialService';

interface Props {
    organizationId?: number;
    opportunities: Opportunity[];
}

type Lens = 'adoption' | 'velocity' | 'value';

export const IntelligencePage: React.FC<Props> = ({ organizationId, opportunities }) => {
    const [lens, setLens] = useState<Lens>('adoption');
    const [loadingPulse, setLoadingPulse] = useState(true);
    const [pulseData, setPulseData] = useState<any>(null);

    useEffect(() => {
        if (organizationId) {
            loadPulse();
        }
    }, [organizationId, opportunities]);

    const loadPulse = async () => {
        setLoadingPulse(true);
        try {
            const [prodMetrics, rates] = await Promise.all([
                fetchProductMetrics('month', organizationId),
                getOperationalRates(organizationId!)
            ]);
            const devMetrics = calculateDevMetrics(opportunities, 'month');
            setPulseData({ product: prodMetrics, dev: devMetrics, finance: rates });
        } catch (e) {
            console.error("Erro ao carregar Pulse:", e);
        } finally {
            setLoadingPulse(false);
        }
    };

    const PulseCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => (
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col justify-between min-h-[11rem] h-auto hover:border-amber-500/40 transition-all group">
            <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 ${color.replace('bg-', 'text-')}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                        <TrendingUp className="w-3 h-3"/> {trend}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-2">{subtext}</div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-6 md:p-12 space-y-12 bg-slate-50 dark:bg-transparent overflow-y-auto custom-scrollbar pb-40">
            
            {/* HEADER INDUSTRIAL CORRIGIDO */}
            <header className="flex flex-col gap-6 pt-4 mb-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full w-fit">
                    <Sparkles className="w-3 h-3 text-amber-600"/>
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Inteligência Operacional</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85]">
                    Pulso <span className="text-amber-500">Estratégico</span>.
                </h1>
            </header>

            {/* GURU INSIGHT WIDGET - RESPIRO AUMENTADO E ALTURA FLEXÍVEL */}
            <div className="bg-[#0f172a] p-10 md:p-14 rounded-[3rem] relative shadow-2xl flex items-center border border-white/5 min-h-fit">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none overflow-hidden h-full">
                    <BrainCircuit className="w-64 h-64 text-white"/>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 w-full py-2">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 shrink-0">
                        <Zap className="w-8 h-8 md:w-10 md:h-10 text-black fill-black"/>
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Diagnóstico IA Shinkō</h3>
                        <p className="text-white text-lg md:text-2xl font-medium leading-relaxed">
                            {loadingPulse ? "Sincronizando telemetria de ativos..." : 
                             `Sua taxa de bug está em ${pulseData?.dev?.bugRate?.value || 0}%. Foco absoluto em "Lógica" para estabilizar o MRR e garantir a saúde do próximo ciclo operacional.`}
                        </p>
                    </div>
                </div>
            </div>

            {/* STRATEGIC PULSE COCKPIT */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <PulseCard 
                    title="Eficiência de Entrega" 
                    value={pulseData ? `${pulseData.dev.cycleTime.value}d` : '---'} 
                    subtext={pulseData ? `Vs. ${pulseData.product.activationRate.toFixed(1)}% Ativação` : 'Calculando...'}
                    icon={Activity} 
                    color="bg-blue-500"
                    trend="Elite"
                />
                <PulseCard 
                    title="ROI Operacional" 
                    value={pulseData ? `${(pulseData.product.nps > 50 ? 'ALTO' : 'ESTÁVEL')}` : '---'} 
                    subtext="Engenharia vs Satisfação"
                    icon={TrendingUp} 
                    color="bg-emerald-500"
                />
                <PulseCard 
                    title="Score de Saúde" 
                    value={pulseData ? `${pulseData.product.nps.toFixed(0)} NPS` : '---'} 
                    subtext={pulseData ? `${pulseData.dev.bugRate.value}% Bugs detectados` : 'Calculando...'}
                    icon={Heart} 
                    color="bg-rose-500"
                />
            </section>

            {/* LENS SECTOR SELECTION */}
            <div className="space-y-10 pt-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-200 dark:border-white/10 pb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Lentes Analíticas</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Selecione o prisma de visão profunda</p>
                    </div>
                    
                    <div className="flex bg-white dark:bg-white/5 p-2 rounded-[1.8rem] border border-slate-200 dark:border-white/10 shadow-soft w-full lg:w-auto overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setLens('adoption')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${lens === 'adoption' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <BarChart3 className="w-4 h-4"/> Adoção
                        </button>
                        <button 
                            onClick={() => setLens('velocity')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${lens === 'velocity' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Gauge className="w-4 h-4"/> Vazão
                        </button>
                        <button 
                            onClick={() => setLens('value')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${lens === 'value' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <PieChart className="w-4 h-4"/> Valor
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {lens === 'adoption' && <ProductIndicators />}
                    {lens === 'velocity' && <DevIndicators organizationId={organizationId} />}
                    {lens === 'value' && <CategoryInsights organizationId={organizationId} />}
                </div>
            </div>
        </div>
    );
};
