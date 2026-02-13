
import React, { useState, useEffect } from 'react';
import { 
    Activity, Zap, ShieldCheck, AlertTriangle, 
    Globe, Cpu, Gauge, RefreshCw, Loader2, HardDrive
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
    organizationId?: number;
}

const APM_MOCK_DATA = [
    { time: '00:00', latency: 120, errors: 0.1 },
    { time: '04:00', latency: 132, errors: 0.2 },
    { time: '08:00', latency: 245, errors: 0.5 },
    { time: '12:00', latency: 190, errors: 0.3 },
    { time: '16:00', latency: 210, errors: 0.4 },
    { time: '20:00', latency: 145, errors: 0.1 },
    { time: '23:59', latency: 110, errors: 0.0 },
];

export const AssetsScreen: React.FC<Props> = ({ organizationId }) => {
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [organizationId]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#020203] overflow-y-auto custom-scrollbar">
            {/* Nubank-Style Header */}
            <header className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-8 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                <HardDrive className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Ativos.</h2>
                        </div>
                        <button onClick={loadData} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 text-white transition-all border border-white/10 group">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                            Monitoramento de Performance
                        </h2>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Cofre de Assets e Saúde Cloud</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-0 space-y-12 pb-40">
                {loading ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Coletando Métricas de Infraestrutura...</span>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Health Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-emerald-50 dark:bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 relative overflow-hidden group">
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Uptime</div>
                                <div className="text-4xl font-black text-emerald-700 dark:text-white leading-none">99.9%</div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-500/5 p-8 rounded-[2rem] border border-amber-100 dark:border-amber-500/20 relative overflow-hidden group">
                                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Latência</div>
                                <div className="text-4xl font-black text-amber-700 dark:text-white leading-none">164ms</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-500/5 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 relative overflow-hidden group">
                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Cloud CPU</div>
                                <div className="text-4xl font-black text-blue-700 dark:text-white leading-none">42%</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">SLA</div>
                                <div className="text-4xl font-black text-slate-700 dark:text-white leading-none">Elite</div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-8 md:p-10 rounded-[3rem] shadow-soft">
                             <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={APM_MOCK_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                        <XAxis dataKey="time" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="latency" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
