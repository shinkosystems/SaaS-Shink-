import React, { useState, useMemo } from 'react';
import { 
    Zap, Target, ShieldCheck, Layers, Gauge, Info, Sparkles, 
    ChevronRight, ChevronLeft, ArrowRight, Save, RotateCcw,
    BrainCircuit, Loader2, CheckCircle2, TrendingUp, BarChart3,
    Microscope, FlaskConical, Atom, DollarSign, ArrowLeft
} from 'lucide-react';
import { Opportunity, Archetype, IntensityLevel, RDEStatus, TadsCriteria, getTerminology } from '../types';
import MatrixChart from './MatrixChart';
import { analyzeOpportunity } from '../services/geminiService';

interface Props {
    onSaveToProject: (opp: Opportunity) => void;
    orgType?: string;
    onBack: () => void;
}

const STEPS = [
    { id: 'strategy', label: 'Identificação', icon: Target },
    { id: 'dna', label: 'DNA & Intensidade', icon: Microscope },
    { id: 'rde', label: 'Matriz RDE', icon: Gauge },
    { id: 'tads', label: 'Crivo T.A.D.S', icon: ShieldCheck }
];

export const FrameworkExplorer: React.FC<Props> = ({ onSaveToProject, orgType, onBack }) => {
    const terms = getTerminology(orgType);
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
        const velocity = simData.velocity || 0;
        const viability = simData.viability || 0;
        const revenue = simData.revenue || 0;
        
        // Shinkō Formula: 40% Velocity, 35% Viability, 25% Revenue
        const prioScore = (velocity * 0.4 + viability * 0.35 + revenue * 0.25) * 10;
        
        const tadsTrueCount = Object.values(simData.tads || {}).filter(Boolean).length;
        const tadsScore = tadsTrueCount * 2;
        
        return { prioScore, tadsScore, tadsTrueCount };
    }, [simData]);

    const handleNext = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
    const handleBack = () => setStep(s => Math.max(0, s - 1));

    const handleAiAnalysis = async () => {
        if (!simData.title || !simData.description) return alert("Preencha título e descrição para análise.");
        setIsAnalyzing(true);
        try {
            const verdict = await analyzeOpportunity(simData.title, simData.description, orgType);
            setAiVerdict(verdict);
        } catch (e) {
            alert("Erro na conexão com o Guru AI.");
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
        const finalOpp: Opportunity = {
            ...simData,
            id: crypto.randomUUID(),
            prioScore: metrics.prioScore,
            tadsScore: metrics.tadsScore,
            createdAt: new Date().toISOString(),
            status: 'Future'
        } as Opportunity;
        onSaveToProject(finalOpp);
    };

    return (
        <div className="h-full flex flex-col bg-[#020203] text-white overflow-hidden animate-in fade-in duration-700">
            {/* Laboratory Background */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
            </div>

            {/* Top Lab Header */}
            <header className="h-20 shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-3xl px-8 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10">
                        <ArrowLeft className="w-6 h-6"/>
                    </button>
                    <div>
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] leading-none mb-1">Simulador de Valor</div>
                        <h2 className="text-xl font-black tracking-tighter">Laboratório <span className="text-amber-500">Shinkō</span>.</h2>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="hidden md:flex gap-4">
                        {STEPS.map((s, idx) => (
                            <div key={s.id} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${step === idx ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber' : idx < step ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                    <s.icon className="w-4 h-4"/>
                                </div>
                                {idx < STEPS.length - 1 && <div className="w-4 h-px bg-white/10"></div>}
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={step === STEPS.length - 1 ? handleFinalize : handleNext}
                        className="px-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-amber-500 transition-all shadow-xl flex items-center gap-2"
                    >
                        {step === STEPS.length - 1 ? 'Gerar Ativo' : 'Próximo'} <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative z-10">
                
                {/* Main Simulator Console */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16 flex flex-col items-center">
                    <div className="max-w-4xl w-full space-y-12">
                        
                        {/* STEP: STRATEGY */}
                        {step === 0 && (
                            <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">Onde está a <br/><span className="text-amber-500">Oportunidade?</span></h1>
                                    <p className="text-slate-500 text-lg font-medium">Defina os fundamentos estratégicos da nova iniciativa.</p>
                                </div>
                                <div className="space-y-8">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Identificação</label>
                                        <input 
                                            autoFocus
                                            value={simData.title}
                                            onChange={e => setSimData({...simData, title: e.target.value})}
                                            placeholder="Ex: Novo Ativo de Valor"
                                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-4xl font-black text-white outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Missão Técnica</label>
                                        <textarea 
                                            value={simData.description}
                                            onChange={e => setSimData({...simData, description: e.target.value})}
                                            placeholder={`Qual problema técnico real estamos resolvendo?`}
                                            className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-xl text-white outline-none focus:border-amber-500/50 transition-all h-60 resize-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP: DNA */}
                        {step === 1 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">DNA do <span className="text-amber-500">Ativo</span>.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Categorize a natureza e o peso da sua solução.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Arquétipo de Negócio</label>
                                        <div className="space-y-3">
                                            {Object.values(Archetype).map(arch => (
                                                <button 
                                                    key={arch}
                                                    onClick={() => setSimData({...simData, archetype: arch})}
                                                    className={`w-full p-6 rounded-[2rem] border text-left transition-all group ${simData.archetype === arch ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    <div className="font-black text-xs uppercase tracking-widest mb-1">{terms.archetypes[arch].label}</div>
                                                    <p className={`text-[10px] font-bold leading-relaxed ${simData.archetype === arch ? 'text-black/60' : 'text-slate-500'}`}>{terms.archetypes[arch].desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Intensidade Operacional</label>
                                        <div className="glass-panel p-10 rounded-[3rem] border-white/5 space-y-8 flex flex-col items-center">
                                            <div className="text-8xl font-black text-blue-500 tracking-tighter">L{simData.intensity}</div>
                                            <input 
                                                type="range" min="1" max="4" step="1"
                                                value={simData.intensity}
                                                onChange={e => setSimData({...simData, intensity: parseInt(e.target.value)})}
                                                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                                            />
                                            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{terms.intensities[simData.intensity || 1]}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP: RDE MATRIX */}
                        {step === 2 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">Matriz <span className="text-amber-500">RDE</span>.</h1>
                                    <p className="text-slate-500 text-lg font-medium">Equilíbrio entre esforço técnico e retorno financeiro.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div className="space-y-10">
                                        {[
                                            { key: 'velocity', label: terms.mvpLabel, icon: Zap, color: 'text-amber-500' },
                                            { key: 'viability', label: terms.viabilityLabel, icon: Target, color: 'text-blue-500' },
                                            { key: 'revenue', label: terms.revenueLabel, icon: DollarSign, color: 'text-emerald-500' }
                                        ].map(item => (
                                            <div key={item.key} className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><item.icon className="w-4 h-4"/> {item.label}</span>
                                                    <span className={`text-4xl font-black ${item.color}`}>{simData[item.key as keyof Opportunity] as number}</span>
                                                </div>
                                                <input 
                                                    type="range" min="1" max="5" step="1"
                                                    value={simData[item.key as keyof Opportunity] as number}
                                                    onChange={e => setSimData({...simData, [item.key]: parseInt(e.target.value)})}
                                                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-80 w-full glass-panel rounded-[3rem] border-white/5 p-6 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <MatrixChart data={[{...simData, prioScore: metrics.prioScore, id: 'preview', title: 'Preview', createdAt: ''} as any]} theme="dark" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP: TADS */}
                        {step === 3 && (
                            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4 text-center">
                                    <h1 className="text-6xl font-black tracking-tighter leading-none">Crivo <span className="text-amber-500">T.A.D.S.</span></h1>
                                    <p className="text-slate-500 text-lg font-medium">Validadores fundamentais de viabilidade de escala.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'scalability', label: terms.scalabilityLabel, desc: 'Capacidade de crescer sem custo linear.' },
                                        { key: 'integration', label: terms.integrationLabel, desc: 'Facilidade de conexão com ecossistema.' },
                                        { key: 'painPoint', label: terms.painPointLabel, desc: 'Evidência de dor técnica real.' },
                                        { key: 'recurring', label: terms.recurringLabel, desc: 'Potencial de geração de receita recorrente.' },
                                        { key: 'mvpSpeed', label: terms.mvpLabel, desc: 'Capacidade de entrega funcional rápida.' }
                                    ].map(item => (
                                        <button 
                                            key={item.key}
                                            onClick={() => toggleTads(item.key as keyof TadsCriteria)}
                                            className={`p-8 rounded-[2.5rem] border text-left transition-all flex items-center justify-between group ${simData.tads?.[item.key as keyof TadsCriteria] ? 'bg-emerald-500 border-emerald-400 text-black shadow-glow-emerald scale-[1.02]' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                                        >
                                            <div className="max-w-[80%]">
                                                <div className="text-lg font-black uppercase tracking-tight mb-2">{item.label}</div>
                                                <div className="text-xs font-bold opacity-60">{item.desc}</div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${simData.tads?.[item.key as keyof TadsCriteria] ? 'bg-black text-emerald-500 border-black' : 'border-white/10'}`}>
                                                {simData.tads?.[item.key as keyof TadsCriteria] && <CheckCircle2 className="w-6 h-6 stroke-[3px]"/>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="pt-10 flex flex-col items-center gap-8">
                                    <button 
                                        onClick={handleAiAnalysis}
                                        disabled={isAnalyzing}
                                        className="px-12 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-glow-purple disabled:opacity-50 transition-all"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin"/> : <BrainCircuit className="w-5 h-5"/>}
                                        Pedir Veredito ao Guru AI
                                    </button>
                                    
                                    {aiVerdict && (
                                        <div className="w-full max-w-2xl bg-purple-900/10 border border-purple-500/20 rounded-[3rem] p-10 animate-in zoom-in duration-500 relative">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-[8px] font-black uppercase tracking-widest">Análise do Guru</div>
                                            <p className="text-slate-300 italic text-lg leading-relaxed text-center">"{aiVerdict}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar Monitor (Live Stats) */}
                <aside className="w-96 shrink-0 border-l border-white/5 bg-black/40 backdrop-blur-3xl hidden xl:flex flex-col p-10 space-y-12">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Snapshot do Ativo</h3>
                        <p className="text-xl font-bold truncate">{simData.title || '---'}</p>
                    </div>

                    <div className="space-y-8">
                        <div className="text-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">PRIO-6 SCORE</div>
                            <div className="text-7xl font-black text-white tracking-tighter">{metrics.prioScore.toFixed(1)}</div>
                            <div className="mt-4 flex justify-center gap-1">
                                {[1,2,3,4,5,6].map(i => (
                                    <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${metrics.prioScore >= i * 10 ? 'bg-amber-500 shadow-glow-amber' : 'bg-white/10'}`}></div>
                                ))}
                            </div>
                        </div>

                        <div className="text-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">TADS VALIDATION</div>
                            <div className="text-7xl font-black text-white tracking-tighter">{metrics.tadsScore}<span className="text-xl text-slate-600">/10</span></div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase mt-2">{metrics.tadsTrueCount} critérios validados</div>
                        </div>

                        <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">DNA MESTRE</span>
                                <Atom className="w-4 h-4 text-blue-500"/>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-bold uppercase">Arquétipo</span>
                                    <span className="text-white font-black">{simData.archetype?.split(' ')[0]}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-bold uppercase">Intensidade</span>
                                    <span className="text-white font-black">L{simData.intensity}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                            <Info className="w-4 h-4 text-amber-500 shrink-0"/>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Os resultados simulados podem ser convertidos em um projeto real a qualquer momento.</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
