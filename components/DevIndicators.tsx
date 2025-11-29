
import React, { useEffect, useState } from 'react';
import { 
    Activity, Clock, Zap, AlertTriangle, CheckCircle, GitCommit, 
    GitMerge, RotateCcw, TrendingUp, Server, Bug, Code2, Info
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    Tooltip, CartesianGrid, BarChart, Bar
} from 'recharts';
import { calculateDevMetrics, logEvent } from '../services/analyticsService';
import { fetchOpportunities } from '../services/opportunityService';
import { DevMetricsData, Opportunity } from '../types';

const DEV_TOOLTIPS: Record<string, string> = {
    "Lead Time": "Tempo total desde a criação da tarefa até a entrega em produção. Inclui tempo de espera e desenvolvimento.",
    "Cycle Time": "Tempo efetivo em que a tarefa esteve 'Em Progresso'. Mede a velocidade pura de desenvolvimento.",
    "Throughput": "Quantidade de tarefas entregues (concluídas) no período selecionado.",
    "WIP (Em Andamento)": "Work In Progress. Quantidade de tarefas atualmente em desenvolvimento ou revisão.",
    "Deployment Frequency": "Frequência com que o time faz deploys em produção com sucesso.",
    "Lead Time for Changes": "Tempo entre o commit do código e o deploy em produção.",
    "Change Failure Rate": "Porcentagem de deploys que causaram falhas em produção ou exigiram hotfix.",
    "Time to Recovery (MTTR)": "Tempo médio para restaurar o serviço após uma falha ou incidente.",
    "Bug Rate / Defect Density": "Percentual de tarefas classificadas como 'bug' ou 'fix' em relação ao total entregue.",
    "Code Churn (Refatoração)": "Volume de código que foi reescrito ou deletado logo após ser criado."
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

interface Props {
    organizationId?: number;
}

export const DevIndicators: React.FC<Props> = ({ organizationId }) => {
    const [metrics, setMetrics] = useState<DevMetricsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const opps = await fetchOpportunities(organizationId);
            if (opps) {
                const data = calculateDevMetrics(opps, timeRange);
                setMetrics(data);
            }
            setIsLoading(false);
            logEvent('page_view', { page: 'Dev Indicators' });
        };
        load();
    }, [timeRange, organizationId]);

    if (isLoading || !metrics) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shinko-primary"></div>
            </div>
        );
    }

    const StatCard = ({ title, value, unit, delta, icon: Icon, color, inverse = false }: any) => {
        const isPositive = delta >= 0;
        // Inverse logic: For bugs/lead time, going DOWN (negative delta) is GOOD (green).
        const isGood = inverse ? !isPositive : isPositive; 
        
        return (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60 flex flex-col justify-between h-32 relative group overflow-visible">
                <div className="flex justify-between items-start z-10">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Icon className={`w-3 h-3 ${color.replace('bg-', 'text-')}`} /> 
                        {title}
                        {DEV_TOOLTIPS[title] && <InfoTooltip text={DEV_TOOLTIPS[title]} />}
                    </div>
                    {delta !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isGood ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                        </span>
                    )}
                </div>
                <div className="z-10">
                    <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                        {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
                    </div>
                </div>
                {/* Background Accent */}
                <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${color} opacity-10 blur-2xl pointer-events-none`}></div>
            </div>
        );
    };

    const DoraCard = ({ title, data, icon: Icon }: { title: string, data: { value: number, unit: string, rating: string }, icon: any }) => {
        const ratingColors = {
            'Elite': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
            'High': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
            'Medium': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
            'Low': 'text-red-500 bg-red-500/10 border-red-500/20',
        };
        const style = ratingColors[data.rating as keyof typeof ratingColors] || ratingColors['Medium'];

        return (
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60 flex flex-col gap-4 overflow-visible group">
                <div className="flex justify-between items-start">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-400"/> 
                        {title}
                        {DEV_TOOLTIPS[title] && <InfoTooltip text={DEV_TOOLTIPS[title]} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${style}`}>
                        {data.rating}
                    </span>
                </div>
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{data.value}</span>
                    <span className="text-sm text-slate-500 font-bold mb-1">{data.unit}</span>
                </div>
                {/* Mini Bar */}
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${style.split(' ')[0].replace('text-', 'bg-')}`} 
                        style={{ width: data.rating === 'Elite' ? '100%' : data.rating === 'High' ? '75%' : data.rating === 'Medium' ? '50%' : '25%' }}
                    ></div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Code2 className="w-8 h-8 text-blue-500" /> Engenharia & Operações
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-3xl">
                        Monitoramento de performance (DORA Metrics) e eficiência operacional. Comparativo YoY.
                    </p>
                </div>

                {/* Time Filter */}
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button 
                        onClick={() => setTimeRange('week')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'week' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        Semana
                    </button>
                    <button 
                        onClick={() => setTimeRange('month')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'month' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        Mês
                    </button>
                    <button 
                        onClick={() => setTimeRange('year')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'year' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        Ano
                    </button>
                </div>
            </div>

            {/* Row 1: Flow Metrics */}
            <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4"/> Métricas de Fluxo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Lead Time" 
                        value={metrics.leadTime.value} 
                        unit={metrics.leadTime.unit}
                        delta={metrics.leadTime.delta}
                        icon={Clock}
                        color="bg-purple-500"
                        inverse={true}
                    />
                    <StatCard 
                        title="Cycle Time" 
                        value={metrics.cycleTime.value} 
                        unit={metrics.cycleTime.unit}
                        delta={metrics.cycleTime.delta}
                        icon={RotateCcw}
                        color="bg-blue-500"
                        inverse={true}
                    />
                    <StatCard 
                        title="Throughput" 
                        value={metrics.throughput.value} 
                        unit={metrics.throughput.unit}
                        delta={metrics.throughput.delta}
                        icon={CheckCircle}
                        color="bg-emerald-500"
                    />
                    <StatCard 
                        title="WIP (Em Andamento)" 
                        value={metrics.wip.value} 
                        unit={metrics.wip.unit}
                        delta={metrics.wip.delta}
                        icon={Zap}
                        color="bg-amber-500"
                        inverse={true}
                    />
                </div>
            </div>

            {/* Row 2: DORA Metrics */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <GitMerge className="w-4 h-4"/> DORA Metrics (DevOps)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DoraCard 
                        title="Deployment Frequency" 
                        data={metrics.deploymentFrequency} 
                        icon={Server}
                    />
                    <DoraCard 
                        title="Lead Time for Changes" 
                        data={metrics.leadTimeForChanges} 
                        icon={GitCommit}
                    />
                    <DoraCard 
                        title="Change Failure Rate" 
                        data={metrics.changeFailureRate} 
                        icon={AlertTriangle}
                    />
                    <DoraCard 
                        title="Time to Recovery (MTTR)" 
                        data={metrics.mttr} 
                        icon={RotateCcw}
                    />
                </div>
            </div>

            {/* Row 3: Charts & Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* Chart: Throughput Trend */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-400"/> Tendência de Throughput (Entregas)
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.charts.throughputHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3}/>
                                <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: 'white' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorTp)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quality Stats */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Bug className="w-4 h-4"/> Qualidade de Código
                    </h3>
                    
                    <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60 flex items-center gap-4 overflow-visible group">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <Bug className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                Bug Rate / Defect Density
                                <InfoTooltip text={DEV_TOOLTIPS["Bug Rate / Defect Density"]} />
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{metrics.bugRate.value}%</div>
                            <div className="text-xs text-slate-400">Tasks identificadas como falha</div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-800/60 flex items-center gap-4 overflow-visible group">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <RotateCcw className="w-6 h-6"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                Code Churn (Refatoração)
                                <InfoTooltip text={DEV_TOOLTIPS["Code Churn (Refatoração)"]} />
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">~{metrics.codeChurn.value}%</div>
                            <div className="text-xs text-slate-400">Linhas reescritas recentemente</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
