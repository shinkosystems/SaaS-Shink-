
import React, { useState, useEffect } from 'react';
import { 
    Activity, Zap, ShieldCheck, AlertTriangle, 
    Globe, Cpu, Gauge, RefreshCw, Loader2
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
        // Simulação de carregamento de métricas APM
        await new Promise(resolve => setTimeout(resolve, 800));
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [organizationId]);

    const MonitoringDashboard = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Real-time Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-8 rounded-[2rem] border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Globe className="w-12 h-12 text-emerald-500"/></div>
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Disponibilidade</div>
                    <div className="text-4xl font-black text-white leading-none">99.98%</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase mt-2">Uptime (SLA Mensal)</div>
                </div>

                <div className="glass-panel p-8 rounded-[2rem] border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Zap className="w-12 h-12 text-amber-500"/></div>
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Latência Média</div>
                    <div className="text-4xl font-black text-white leading-none">164ms</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase mt-2">Global Response Time</div>
                </div>

                <div className="glass-panel p-8 rounded-[2rem] border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Cpu className="w-12 h-12 text-blue-500"/></div>
                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Utilização CPU</div>
                    <div className="text-4xl font-black text-white leading-none">42.5%</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase mt-2">Cluster Infra Autoscale</div>
                </div>

                <div className="glass-panel p-8 rounded-[2rem] border-red-500/20 bg-red-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><AlertTriangle className="w-12 h-12 text-red-500"/></div>
                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Taxa de Erro</div>
                    <div className="text-4xl font-black text-white leading-none">0.02%</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase mt-2">Exceções Críticas</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* APM Performance Chart */}
                <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] border-white/5 bg-black/20 min-h-[450px] flex flex-col">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">Performance de Resposta (APM)</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Análise granulada por endpoint</p>
                        </div>
                        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black uppercase text-amber-500">Live Stream</div>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={APM_MOCK_DATA}>
                                <defs>
                                    <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{backgroundColor: '#0A0A0C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                                <Area type="monotone" dataKey="latency" name="Latência (ms)" stroke="#F59E0B" strokeWidth={3} fill="url(#latencyGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SaaS Metrics Side */}
                <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-white/[0.03] to-transparent border-white/5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-amber-500"/> Segurança & Compliance
                        </h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold text-slate-300">ISO 27001 Status</span>
                                <span className="text-[9px] font-black text-emerald-500 uppercase">Compliant</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold text-slate-300">WAF Alertas (24h)</span>
                                <span className="text-[9px] font-black text-white uppercase">0 Detectados</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-8 rounded-[2.5rem] bg-white/[0.02] border-white/5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <Gauge className="w-4 h-4 text-blue-500"/> Business KPIs (SaaS)
                        </h4>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                    <span>Quota de API Mensal</span>
                                    <span className="text-white">82%</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 shadow-glow-blue" style={{width: '82%'}}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                    <span>Health Score Global</span>
                                    <span className="text-emerald-500">EXCELENTE</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 shadow-glow-emerald" style={{width: '95%'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-full flex flex-col p-8 md:p-12 space-y-12 animate-in fade-in duration-700">
            {/* Header Performance */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-4">
                        <Activity className="w-3 h-3"/> Central de Monitoramento
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                        Dashboard de <span className="text-amber-500">Performance</span>.
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Monitoramento APM e Métricas de Negócio em Tempo Real</p>
                </div>
                
                <div className="flex gap-4 w-full lg:w-auto">
                    <button onClick={loadData} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-amber-500/30 transition-all group">
                        <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-amber-500 ${loading ? 'animate-spin' : ''}`}/>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Coletando Métricas de Infraestrutura...</span>
                </div>
            ) : (
                <MonitoringDashboard />
            )}
        </div>
    );
};
