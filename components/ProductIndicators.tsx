
import React, { useEffect, useState } from 'react';
import { 
    Activity, Heart, Zap, Users, Rocket, MousePointer2, Info, Loader2 as LoaderIcon
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    Tooltip, CartesianGrid
} from 'recharts';
import { fetchProductMetrics, logEvent } from '../services/analyticsService';
import { ProductMetricsData } from '../types';
import { supabase } from '../services/supabaseClient';

const PRODUCT_TOOLTIPS: Record<string, string> = {
    "Engajamento (DAU/MAU)": "Relação entre usuários ativos diários e mensais. Dados reais de acesso.",
    "NPS Score": "Net Promoter Score calculado a partir das respostas no sistema.",
    "Retenção (D30)": "Porcentagem de usuários que retornaram ao produto 30 dias após o primeiro uso.",
    "Taxa de Ativação": "Usuários que calcularam o Score PRIO-6 dividido pelo total de usuários. Meta: 60%.",
};

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-2 cursor-help z-[100] isolate">
        <Info className="w-3 h-3 text-slate-400 hover:text-blue-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 bg-slate-800 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-2xl leading-tight text-center border border-white/10 z-[110] invisible group-hover:visible translate-y-1 group-hover:translate-y-0">
            <div className="relative z-10">{text}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

type TimeRange = 'week' | 'month' | 'year';

export const ProductIndicators: React.FC = () => {
    const [metrics, setMetrics] = useState<ProductMetricsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            let orgId = undefined;
            if (user) {
                const { data } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
                orgId = data?.organizacao;
            }

            const data = await fetchProductMetrics(timeRange, orgId);
            setMetrics(data);
            setIsLoading(false);
            logEvent('page_view', { page: 'Product Indicators' });
        };
        load();
    }, [timeRange]);

    if (isLoading || !metrics) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <LoaderIcon className="w-10 h-10 animate-spin text-amber-500"/>
                <span className="text-[10px] font-black uppercase text-slate-400">Calculando Adoção...</span>
            </div>
        );
    }

    const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => {
        return (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60 flex flex-col justify-between h-36 relative group overflow-visible">
                <div className="flex justify-between items-start z-10">
                    <div className="flex items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
                        {PRODUCT_TOOLTIPS[title] && <InfoTooltip text={PRODUCT_TOOLTIPS[title]} />}
                    </div>
                    <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                        <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                    </div>
                </div>
                <div className="z-10">
                    <div className="flex items-end gap-2 mb-1">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{value}</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{subtext}</div>
                </div>
                {/* Decoration isolada para evitar clipping da tooltip */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-20">
                     <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${color.split(' ')[0]} blur-2xl`}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 md:p-10 animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-purple-500" /> Indicadores de Produto
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-3xl">Métricas calculadas a partir de eventos reais.</p>
                </div>

                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {['week', 'month', 'year'].map(r => (
                        <button key={r} onClick={() => setTimeRange(r as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === r ? 'bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{r === 'week' ? 'Semana' : r === 'month' ? 'Mês' : 'Ano'}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Engajamento (DAU/MAU)" value={`${metrics.engagementRatio.toFixed(1)}%`} subtext={`${metrics.dau} hoje / ${metrics.mau} mês`} icon={Zap} color="bg-amber-500 text-amber-500" />
                <StatCard title="NPS Score" value={metrics.nps.toFixed(0)} subtext="Voz do Usuário" icon={Heart} color="bg-pink-500 text-pink-500" />
                <StatCard title="Taxa de Ativação" value={`${metrics.activationRate.toFixed(1)}%`} subtext="Adoção PRIO-6" icon={Rocket} color="bg-emerald-500 text-emerald-500" />
                <StatCard title="Ativos Mensais (MAU)" value={`${metrics.mau}`} subtext="Usuários únicos 30d" icon={Users} color="bg-blue-500 text-blue-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-slate-400"/> Volume de Criação
                    </h3>
                    <div className="h-64 w-full">
                        {metrics.featureEngagement.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.featureEngagement} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3}/>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="feature" type="category" width={100} tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: 'white', zIndex: 1000 }} cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="count" name="Uso" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">Sem dados de uso.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
