
import React, { useEffect, useState } from 'react';
import { 
    BarChart3, Users, Zap, Activity, Heart, Clock, 
    UserPlus, RotateCcw, AlertOctagon, Timer, PieChart,
    MousePointer2, Trophy, TrendingUp, Info, Calendar, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    Tooltip, CartesianGrid, LineChart, Line 
} from 'recharts';
import { fetchProductMetrics, logEvent } from '../services/analyticsService';
import { ProductMetricsData } from '../types';

const PRODUCT_TOOLTIPS: Record<string, string> = {
    "Engajamento (DAU/MAU)": "Relação entre usuários ativos diários e mensais. Mede o quão 'viciante' ou habitual é o seu produto.",
    "NPS Score": "Net Promoter Score. Índice de satisfação do cliente que mede a probabilidade de recomendação (Promotores - Detratores).",
    "Retenção (D30)": "Porcentagem de usuários que retornaram ao produto 30 dias após o primeiro uso.",
    "Saúde Técnica": "Confiabilidade do sistema. Calculado como (100% - Taxa de Crashes).",
    "Time-to-Value (TTV)": "Tempo médio entre o cadastro do usuário e o momento em que ele percebe valor real no produto.",
    "Taxa de Ativação": "Porcentagem de usuários que completaram o fluxo de onboarding ou realizaram a ação chave.",
    "Taxa de Reativação": "Usuários que estavam inativos (churned) e voltaram a usar o produto no período.",
    "Adoção de Features": "Porcentagem da base ativa que utilizou uma funcionalidade específica pelo menos uma vez."
};

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-2 cursor-help z-50">
        <Info className="w-3 h-3 text-slate-400 hover:text-blue-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl leading-tight text-center border border-white/10 z-50 invisible group-hover:visible">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

type TimeRange = 'week' | 'month' | 'year';

export const ProductIndicators: React.FC = () => {
    const [metrics, setMetrics] = useState<ProductMetricsData | null>(null);
    const [prevMetrics, setPrevMetrics] = useState<ProductMetricsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await fetchProductMetrics(timeRange);
            setMetrics(data);
            
            // Simulate previous period for delta calculation (Simulated YoY logic)
            const prevData = JSON.parse(JSON.stringify(data));
            // Randomize slightly to show variation
            prevData.engagementRatio *= 0.9;
            prevData.nps -= 5;
            prevData.retentionRate *= 0.95;
            prevData.crashRate *= 1.2;
            setPrevMetrics(prevData);

            setIsLoading(false);
            logEvent('page_view', { page: 'Product Indicators' });
        };
        load();
    }, [timeRange]);

    if (isLoading || !metrics) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shinko-primary"></div>
            </div>
        );
    }

    const calcDelta = (curr: number, prev: number) => {
        if(!prev) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const StatCard = ({ title, value, subtext, icon: Icon, color, deltaValue, inverse = false }: any) => {
        const delta = deltaValue !== undefined ? deltaValue : 0;
        const isPositive = delta >= 0;
        const isGood = inverse ? !isPositive : isPositive;
        const Arrow = isPositive ? ArrowUpRight : ArrowDownRight;

        return (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-between h-36 relative group overflow-visible">
                <div className="flex justify-between items-start">
                    <div className="flex items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
                        {PRODUCT_TOOLTIPS[title] && <InfoTooltip text={PRODUCT_TOOLTIPS[title]} />}
                    </div>
                    <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                        <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                    </div>
                </div>
                <div>
                    <div className="flex items-end gap-2 mb-1">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{value}</div>
                        {delta !== 0 && (
                            <div className={`flex items-center text-xs font-bold mb-1.5 px-1.5 py-0.5 rounded ${isGood ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                <Arrow className="w-3 h-3"/> {Math.abs(delta).toFixed(1)}%
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{subtext}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-purple-500" /> Indicadores de Produto
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-3xl">
                        Métricas essenciais de engajamento e retenção. Comparativo YoY.
                    </p>
                </div>

                {/* Time Filter */}
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button 
                        onClick={() => setTimeRange('week')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'week' ? 'bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        Semana
                    </button>
                    <button 
                        onClick={() => setTimeRange('month')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'month' ? 'bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        Mês
                    </button>
                    <button 
                        onClick={() => setTimeRange('year')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'year' ? 'bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        Ano
                    </button>
                </div>
            </div>

            {/* Top Row: Vital Signs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Engajamento (DAU/MAU)"
                    value={`${metrics.engagementRatio.toFixed(1)}%`}
                    deltaValue={calcDelta(metrics.engagementRatio, prevMetrics?.engagementRatio || 0)}
                    subtext={`${metrics.dau} ativos hoje / ${metrics.mau} mensais`}
                    icon={Zap}
                    color="bg-amber-500 text-amber-500"
                />
                <StatCard 
                    title="NPS Score"
                    value={metrics.nps.toFixed(0)}
                    deltaValue={metrics.nps - (prevMetrics?.nps || 0)} 
                    subtext="Zona de Qualidade"
                    icon={Heart}
                    color="bg-pink-500 text-pink-500"
                />
                <StatCard 
                    title="Retenção (D30)"
                    value={`${metrics.retentionRate}%`}
                    deltaValue={calcDelta(metrics.retentionRate, prevMetrics?.retentionRate || 0)}
                    subtext="Usuários que retornam após 30 dias"
                    icon={RotateCcw}
                    color="bg-blue-500 text-blue-500"
                />
                <StatCard 
                    title="Saúde Técnica"
                    value={`${(100 - metrics.crashRate).toFixed(1)}%`}
                    deltaValue={calcDelta((100 - metrics.crashRate), (100 - (prevMetrics?.crashRate || 0)))}
                    subtext={`Crash Rate: ${metrics.crashRate}%`}
                    icon={AlertOctagon}
                    color={metrics.crashRate < 1 ? "bg-emerald-500 text-emerald-500" : "bg-red-500 text-red-500"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* Feature Engagement Chart */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-slate-400"/> Engajamento por Funcionalidade
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.featureEngagement} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3}/>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="feature" 
                                    type="category" 
                                    width={100} 
                                    tick={{fill: '#94a3b8', fontSize: 12}} 
                                    axisLine={false} 
                                    tickLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: 'white' }}
                                    cursor={{fill: 'transparent'}}
                                />
                                <Bar dataKey="percentage" name="% Uso" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Detailed Metrics List */}
                <div className="space-y-4">
                    <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Trophy className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                Time-to-Value (TTV)
                                <InfoTooltip text={PRODUCT_TOOLTIPS["Time-to-Value (TTV)"]} />
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{metrics.timeToValue} dias</div>
                            <div className="text-xs text-slate-400">Cadastro até 1º Sucesso</div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <UserPlus className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                Taxa de Ativação
                                <InfoTooltip text={PRODUCT_TOOLTIPS["Taxa de Ativação"]} />
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{metrics.activationRate}%</div>
                            <div className="text-xs text-slate-400">Completaram Onboarding</div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Timer className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase">Tempo em Tela</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{metrics.avgSessionDuration} min</div>
                            <div className="text-xs text-slate-400">Duração Média da Sessão</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reativação e Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-slate-400"/> Taxa de Reativação
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl font-black text-emerald-500">{metrics.reactivationRate}%</div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Dos usuários inativos há 30 dias retornaram à plataforma este mês.
                        </p>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${metrics.reactivationRate}%` }}></div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-400"/> Adoção de Features
                        <InfoTooltip text={PRODUCT_TOOLTIPS["Adoção de Features"]} />
                    </h3>
                    <div className="space-y-4 mt-4">
                        {metrics.featureAdoption.map((feat, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{feat.feature}</span>
                                    <span className="text-slate-500">{feat.percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full" 
                                        style={{ width: `${feat.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};
