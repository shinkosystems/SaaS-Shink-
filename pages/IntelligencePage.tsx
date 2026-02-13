
import React, { useState, useEffect, useMemo } from 'react';
import { ProductIndicators } from '../components/ProductIndicators';
import { DevIndicators } from '../components/DevIndicators';
import { CategoryInsights } from '../components/CategoryInsights';
import { Opportunity } from '../types';
import { 
    BarChart3, Code2, Sparkles, PieChart, Zap, Target, 
    TrendingUp, Activity, ShieldCheck, ArrowRight, BrainCircuit,
    Info, Loader2, Gauge, Heart, X, Microscope
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

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#020203] overflow-y-auto custom-scrollbar">
            {/* Nubank-Style Header */}
            <header className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-8 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Inteligência.</h2>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                            Pulso Estratégico Shinkō
                        </h2>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Diagnóstico de Ativos em Tempo Real</p>
                    </div>

                    <div className="flex bg-white/10 p-1.5 rounded-[1.8rem] border border-white/10 w-full lg:w-auto overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setLens('adoption')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${lens === 'adoption' ? 'bg-white text-amber-500 shadow-xl' : 'text-white/60 hover:text-white'}`}
                        >
                            <BarChart3 className="w-4 h-4"/> Adoção
                        </button>
                        <button 
                            onClick={() => setLens('velocity')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${lens === 'velocity' ? 'bg-white text-amber-500 shadow-xl' : 'text-white/60 hover:text-white'}`}
                        >
                            <Gauge className="w-4 h-4"/> Vazão
                        </button>
                        <button 
                            onClick={() => setLens('value')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${lens === 'value' ? 'bg-white text-amber-500 shadow-xl' : 'text-white/60 hover:text-white'}`}
                        >
                            <PieChart className="w-4 h-4"/> Valor
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full px-4 md:px-6 space-y-12 pb-40">
                {/* GURU INSIGHT WIDGET - FLOATING BELOW HEADER */}
                <div className="bg-[#0f172a] p-8 md:p-12 rounded-[3rem] relative shadow-2xl flex items-center border border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 pointer-events-none">
                        <BrainCircuit className="w-64 h-64 text-white"/>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 w-full">
                        <div className="w-16 h-16 rounded-[1.8rem] bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 shrink-0">
                            <Zap className="w-8 h-8 text-black fill-black"/>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-2">Diagnóstico IA Shinkō</h3>
                            <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
                                {loadingPulse ? "Sincronizando telemetria de ativos..." : 
                                 `Sua taxa de bug está em ${pulseData?.dev?.bugRate?.value || 0}%. Foco absoluto em "Lógica" para estabilizar o MRR e garantir a saúde do próximo ciclo operacional.`}
                            </p>
                        </div>
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
