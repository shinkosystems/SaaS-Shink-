
import React, { useState, useEffect } from 'react';
import { 
    LayoutGrid, Briefcase, TrendingUp, DollarSign, BrainCircuit, 
    Code2, BarChart3, Users, Zap, ShieldCheck, Box, 
    ArrowUpRight, Plus, Check, Loader2, Sparkles, MonitorSmartphone,
    GanttChartSquare, Palette
} from 'lucide-react';
import { fetchActiveOrgModules, updateOrgModules } from '../services/organizationService';

interface Props {
    organizationId?: number | null;
    userRole: string;
}

const APPS = [
    { id: 'projects', name: 'Framework Core', category: 'Core', desc: 'Snapshot de ativos e matriz RDE.', icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-500/10', price: 0 },
    { id: 'kanban', name: 'Kanban Board', category: 'Execution', desc: 'Fluxo visual de tarefas técnicas.', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-500/10', price: 0 },
    { id: 'gantt', name: 'Cronograma Gantt', category: 'Core', desc: 'Linha do tempo e dependências.', icon: GanttChartSquare, color: 'text-teal-500', bg: 'bg-teal-500/10', price: 29.90 },
    { id: 'crm', name: 'Sales Pipeline', category: 'Business', desc: 'Gestão de contratos e leads.', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10', price: 49.90 },
    { id: 'financial', name: 'Financial Insights', category: 'Business', desc: 'MRR, DRE e Fluxo de Caixa.', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', price: 39.90 },
    { id: 'ia', name: 'Guru AI', category: 'Intelligence', desc: 'Análise de viabilidade generativa.', icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-500/10', price: 59.90 },
    { id: 'engineering', name: 'DORA Metrics', category: 'Engineering', desc: 'Performance de elite para dev.', icon: Code2, color: 'text-blue-600', bg: 'bg-blue-600/10', price: 69.90 },
    { id: 'product', name: 'Product Analytics', category: 'Intelligence', desc: 'Adoção e retenção de usuários.', icon: BarChart3, color: 'text-pink-500', bg: 'bg-pink-500/10', price: 69.90 },
    { id: 'clients', name: 'Stakeholders', category: 'Business', desc: 'Portal externo de transparência.', icon: Users, color: 'text-amber-600', bg: 'bg-amber-600/10', price: 39.90 },
    { id: 'assets', name: 'Asset Monitoring', category: 'Engineering', desc: 'Monitoramento de infraestrutura.', icon: MonitorSmartphone, color: 'text-indigo-500', bg: 'bg-indigo-500/10', price: 29.90 },
    { id: 'whitelabel', name: 'White Label', category: 'Business', desc: 'Personalização total da marca.', icon: Palette, color: 'text-slate-400', bg: 'bg-slate-400/10', price: 1500.00 },
];

export const EcosystemPage: React.FC<Props> = ({ organizationId, userRole }) => {
    const [activeModules, setActiveModules] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);

    useEffect(() => {
        if (organizationId) {
            fetchActiveOrgModules(organizationId).then(mods => {
                setActiveModules(mods);
                setLoading(false);
            });
        }
    }, [organizationId]);

    const handleInstall = async (appId: string) => {
        if (!organizationId || userRole !== 'dono') return alert("Apenas proprietários podem gerenciar a instalação de módulos.");
        
        const isInstalled = activeModules.includes(appId);
        const app = APPS.find(a => a.id === appId);

        if (!isInstalled && app && app.price > 0) {
            if (!confirm(`Deseja ativar o módulo "${app.name}"? Este é um ativo Premium (R$ ${app.price.toFixed(2)}/mês) e será incluído no seu próximo faturamento.`)) return;
        }

        setInstalling(appId);
        try {
            let newList;
            if (isInstalled) {
                newList = activeModules.filter(id => id !== appId);
            } else {
                newList = [...activeModules, appId];
            }
            await updateOrgModules(organizationId, newList);
            setActiveModules(newList);
        } finally {
            setInstalling(null);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 md:p-12 overflow-y-auto custom-scrollbar animate-in fade-in duration-1000 bg-slate-50 dark:bg-[#020203]">
            <header className="mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                    <Box className="w-3 h-3"/> Shinkō Ecosystem Hub
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Ecossistema de <br/><span className="text-amber-500">Ativos</span>.
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl font-medium">Potencialize sua engenharia de valor ativando módulos especializados em um clique.</p>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500 w-10 h-10"/></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
                    {APPS.map(app => {
                        const isInstalled = activeModules.includes(app.id);
                        return (
                            <div key={app.id} className="glass-card p-8 rounded-[2.5rem] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col justify-between hover:shadow-2xl transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.03] rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className={`p-4 rounded-2xl ${app.bg} ${app.color} border border-white/5 transition-transform group-hover:scale-110 shadow-sm`}>
                                            <app.icon className="w-7 h-7"/>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">{app.category}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{app.name}</h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium line-clamp-2">{app.desc}</p>
                                </div>

                                <div className="mt-10 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Custo</span>
                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                            {app.price === 0 ? 'INCLUSO' : `R$ ${app.price.toFixed(2)}/mês`}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleInstall(app.id)}
                                        disabled={installing === app.id}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isInstalled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg hover:scale-105 active:scale-95'}`}
                                    >
                                        {installing === app.id ? <Loader2 className="w-3 h-3 animate-spin"/> : isInstalled ? <Check className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}
                                        {isInstalled ? 'Ativo' : 'Instalar'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
