
import React, { useState } from 'react';
import { ProductIndicators } from '../components/ProductIndicators';
import { DevIndicators } from '../components/DevIndicators';
import { CategoryInsights } from '../components/CategoryInsights';
import { Opportunity } from '../types';
import { BarChart3, Code2, Sparkles, PieChart } from 'lucide-react';

interface Props {
    organizationId?: number;
    opportunities: Opportunity[];
}

export const IntelligencePage: React.FC<Props> = ({ organizationId, opportunities }) => {
    const [tab, setTab] = useState<'product' | 'dev' | 'distribution'>('product');

    return (
        <div className="h-full flex flex-col p-6 md:p-10 overflow-hidden bg-slate-50 dark:bg-transparent">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Central de <span className="text-amber-500">Inteligência</span>.
                    </h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Visão técnica e comportamental profunda</p>
                </div>
                
                <div className="flex p-1 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <button 
                        onClick={() => setTab('product')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'product' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <BarChart3 className="w-3.5 h-3.5"/> Produto
                    </button>
                    <button 
                        onClick={() => setTab('dev')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'dev' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Code2 className="w-3.5 h-3.5"/> Engenharia
                    </button>
                    <button 
                        onClick={() => setTab('distribution')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'distribution' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <PieChart className="w-3.5 h-3.5"/> Distribuição
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tab === 'product' && (
                    <div className="animate-in fade-in duration-500"><ProductIndicators /></div>
                )}
                {tab === 'dev' && (
                    <div className="animate-in fade-in duration-500"><DevIndicators organizationId={organizationId} /></div>
                )}
                {tab === 'distribution' && (
                    <div className="animate-in fade-in duration-500"><CategoryInsights organizationId={organizationId} /></div>
                )}
            </div>
        </div>
    );
};
