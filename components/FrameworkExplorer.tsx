
import React, { useState, useMemo } from 'react';
import { 
    Zap, Target, ShieldCheck, Microscope, Gauge, Info, 
    ChevronRight, ArrowRight, BrainCircuit, Loader2, CheckCircle2, 
    DollarSign, ArrowLeft, Activity, Rocket
} from 'lucide-react';
import { Opportunity, Archetype, IntensityLevel, RDEStatus, TadsCriteria, getTerminology } from '../types';
import MatrixChart from './MatrixChart';
import { analyzeOpportunity } from '../services/geminiService';

interface Props {
    onSaveToProject: (opp: Opportunity) => void;
    orgName?: string;
    onBack: () => void;
}

const STEPS = [
    { id: 'strategy', label: 'Identificação', icon: Target },
    { id: 'dna', label: 'DNA & Intensidade', icon: Microscope },
    { id: 'rde', label: 'Matriz RDE', icon: Gauge },
    { id: 'tads', label: 'Crivo T.A.D.S', icon: ShieldCheck }
];

export const FrameworkExplorer: React.FC<Props> = ({ onSaveToProject, orgName, onBack }) => {
    const terms = getTerminology(orgName);
    const [step, setStep] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiVerdict, setAiVerdict] = useState<string | null>(null);

    const [simData, setSimData] = useState<Partial<Opportunity>>({
        title: '',
        description: '',
        velocity: 3,
        viability: 3,
        revenue: 3,
        rde: RDEStatus.WARM,
        archetype: Archetype.SAAS_ENTRY,
        intensity: IntensityLevel.L1,
        tads: { scalability: false, integration: false, painPoint: false, recurring: false, mvpSpeed: false }
    });

    const metrics = useMemo(() => {
        const velocity = simData.velocity || 1;
        const viability = simData.viability || 1;
        const revenue = simData.revenue || 1;
        const prioScore = (velocity * 0.4 + viability * 0.35 + revenue * 0.25) * 10;
        const tadsTrueCount = Object.values(simData.tads || {}).filter(Boolean).length;
        const tadsScore = tadsTrueCount * 2;
        return { prioScore, tadsScore, tadsTrueCount };
    }, [simData]);

    const handleAiAnalysis = async () => {
        if (!simData.title || !simData.description) return alert("Preencha título e descrição para análise.");
        setIsAnalyzing(true);
        try {
            const verdict = await analyzeOpportunity(simData.title, simData.description);
            setAiVerdict(verdict);
        } catch (e) {
            alert("Guru Offline.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleTads = (key: keyof TadsCriteria) => {
        setSimData(prev => ({
            ...prev,
            tads: { ...prev.tads!, [key]: !prev.tads![key] }
        }));
    };

    const handleFinalize = () => {
        if (!simData.title) return alert("Dê um título ao seu projeto.");
        const finalOpp: Opportunity = {
            ...simData,
            id: crypto.randomUUID(),
            prioScore: metrics.prioScore,
            tadsScore: metrics.tadsScore,
            createdAt: new Date().toISOString(),
            status: 'Future',
            mrr: 0,
            meses: 12
        } as Opportunity;
        onSaveToProject(finalOpp);
    };

    return (
        <div className="h-full flex flex-col bg-[#0A0A0C] text-white overflow-hidden animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.08),transparent_50%)] pointer-events-none"></div>

            <header className="h-20 shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-xl px-8 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2.5 hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-white border border-transparent hover:border-white/10">
                        <ArrowLeft className="w-5 h-5"/>
                    </button>
                    <div>
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">Snapshot de Valor</div>
                        <h2 className="text-xl font-black tracking-tighter">Laboratório de <span className="text-amber-500">Oportunidades</span>.</h2>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden lg:flex gap-4">
                        {STEPS.map((s, idx) => (
                            <div key={s.id} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${step === idx ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber' : idx < step ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                    <s.icon className="w-4 h-4"/>
                                </div>
                                {idx < STEPS.length - 1 && <div className="w-4 h-px bg-white/10"></div>}
                            </div>
                        ))}
                    </div>
                    
                    {step === STEPS.length - 1 ? (
                        <button 
                            onClick={handleFinalize}
                            className="px-8 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-glow-amber flex items-center gap-2"
                        >
                            Ativar Projeto <Rocket className="w-4 h-4"/>
                        </button>
                    ) : (
                        <button 
                            onClick={() => setStep(s => s + 1)}
                            className="px-8 py-3 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                            Próximo <ChevronRight className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative z-10">
                <main className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-20 flex flex-col items-center">
                    <div className="max-w-3xl w-full">
                        {step === 0 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">Onde está o <br/><span className="text-amber-500">Diferencial?</span></h1>
                                    <p className="text-slate-500 text-xl font-medium">Nomeie a iniciativa e descreva o impacto técnico esperado.</p>
                                </div>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Ativo</label>
                                        <input 
                                            autoFocus value={simData.title} 
                                            onChange={e => setSimData({...simData, title: e.target.value})}
                                            placeholder="Ex: Engine de Precificação Dinâmica"
                                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-4xl font-black text-white outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contexto Técnico</label>
                                        <textarea 
                                            value={simData.description} 
                                            onChange={e => setSimData({...simData, description: e.target.value})}
                                            placeholder="Qual a dor real do usuário que este ativo resolve?"
                                            className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-xl text-slate-300 outline-none focus:border-amber-500/50 transition-all h-60 resize-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">DNA do <span className="text-amber-500">Ativo</span>.</h1>
                                    <p className="text-slate-500 text-xl font-medium">Defina o arquétipo e a intensidade crítica.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        {Object.values(Archetype).map((arch) => (
                                            <button 
                                                key={arch}
                                                onClick={() => setSimData({...simData, archetype: arch as Archetype})}
                                                className={`w-full p-6 rounded-[1.5rem] border text-left transition-all ${simData.archetype === arch ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber scale-[1.02]' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                                            >
                                                <div className="font-black text-xs uppercase tracking-widest mb-1">{terms.archetypes[arch as Archetype].label}</div>
                                                <p className="text-[10px] font-bold opacity-60">{terms.archetypes[arch as Archetype].desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center gap-8">
                                        <div className="text-8xl font-black text-blue-500 tracking-tighter">L{simData.intensity}</div>
                                        <input type="range" min="1" max="4" step="1" value={simData.intensity} onChange={e => setSimData({...simData, intensity: parseInt(e.target.value)})} className="w-full accent-blue-500" />
                                        <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest">{terms.intensities[simData.intensity || 1]}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">Matriz <span className="text-amber-500">RDE</span>.</h1>
                                    <p className="text-slate-500 text-xl font-medium">Equilíbrio fundamental entre Receita, Dor e Esforço.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-8 glass-panel p-10 rounded-[3rem] border-white/5">
                                    {[
                                        { key: 'velocity', label: terms.mvpLabel, icon: Zap, color: 'text-amber-500' },
                                        { key: 'viability', label: terms.viabilityLabel, icon: Target, color: 'text-blue-500' },
                                        { key: 'revenue', label: terms.revenueLabel, icon: DollarSign, color: 'text-emerald-500' }
                                    ].map(item => (
                                        <div key={item.key} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><item.icon className="w-4 h-4"/> {item.label}</span>
                                                <span className={`text-4xl font-black ${item.color}`}>{simData[item.key as keyof Opportunity] as number}</span>
                                            </div>
                                            <input type="range" min="1" max="5" step="1" value={simData[item.key as keyof Opportunity] as number} onChange={e => setSimData({...simData, [item.key]: parseInt(e.target.value)})} className="w-full accent-white" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="text-center space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">Crivo <span className="text-amber-500">T.A.D.S.</span></h1>
                                    <p className="text-slate-500 text-xl font-medium">Validadores industriais de escala e sustentabilidade.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { key: 'scalability', label: terms.scalabilityLabel, desc: 'Capacidade de escala sem aumento linear de custo.' },
                                        { key: 'integration', label: terms.integrationLabel, desc: 'Conectividade nativa com o ecossistema.' },
                                        { key: 'painPoint', label: terms.painPointLabel, desc: 'Resolução de uma dor real e imediata.' },
                                        { key: 'recurring', label: terms.recurringLabel, desc: 'Modelo de faturamento contínuo.' },
                                        { key: 'mvpSpeed', label: terms.mvpLabel, desc: 'Velocidade de validação funcional.' }
                                    ].map(item => (
                                        <button 
                                            key={item.key}
                                            onClick={() => toggleTads(item.key as keyof TadsCriteria)}
                                            className={`p-8 rounded-[2rem] border flex items-center justify-between transition-all ${simData.tads?.[item.key as keyof TadsCriteria] ? 'bg-emerald-500 border-emerald-400 text-black shadow-glow-emerald' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                                        >
                                            <div className="text-left">
                                                <div className="text-xl font-black uppercase tracking-tight">{item.label}</div>
                                                <div className="text-xs font-bold opacity-60">{item.desc}</div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${simData.tads?.[item.key as keyof TadsCriteria] ? 'bg-black text-emerald-500 border-black' : 'border-white/10'}`}>
                                                {simData.tads?.[item.key as keyof TadsCriteria] && <CheckCircle2 className="w-6 h-6 stroke-[3px]"/>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="pt-10 flex flex-col items-center gap-10">
                                    <button 
                                        onClick={handleAiAnalysis}
                                        disabled={isAnalyzing}
                                        className="px-12 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-glow-purple disabled:opacity-50 transition-all"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin"/> : <BrainCircuit className="w-6 h-6"/>}
                                        Veredito do Guru AI
                                    </button>
                                    
                                    {aiVerdict && (
                                        <div className="w-full max-w-2xl bg-purple-900/10 border border-purple-500/20 rounded-[3rem] p-10 animate-in zoom-in duration-500 relative">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-[8px] font-black uppercase tracking-widest">IA Insight</div>
                                            <p className="text-slate-300 italic text-xl leading-relaxed text-center">"{aiVerdict}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <aside className="w-96 shrink-0 border-l border-white/5 bg-black/40 backdrop-blur-3xl hidden xl:flex flex-col p-10 space-y-12">
                    <div className="space-y-8">
                        <div className="text-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">PRIO-6 SCORE</div>
                            <div className="text-7xl font-black text-white tracking-tighter">{metrics.prioScore.toFixed(1)}</div>
                        </div>

                        <div className="text-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">TADS STATUS</div>
                            <div className="text-7xl font-black text-white tracking-tighter">{metrics.tadsScore}<span className="text-xl text-slate-600">/10</span></div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-full h-full p-6">
                            <MatrixChart data={[{...simData, prioScore: metrics.prioScore, id: 'sim', title: 'Simulação', createdAt: ''} as any]} theme="dark" />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
