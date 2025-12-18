
import React, { useState } from 'react';
import { Opportunity, Archetype, IntensityLevel, RDEStatus, TadsCriteria } from '../types';
import { ArrowLeft, Check, Loader2, Target, ShieldCheck, Zap, DollarSign, BrainCircuit, LayoutGrid, Sparkles, X, ChevronRight, Layers, Gauge, ShieldAlert } from 'lucide-react';

interface Props {
  initialData?: Partial<Opportunity>;
  onSave: (opp: Opportunity) => Promise<void> | void;
  onCancel: () => void;
  orgType?: string;
  activeModules?: string[];
}

const STEPS = [
    { id: 0, label: 'Estratégia', icon: Target },
    { id: 1, label: 'DNA', icon: Layers },
    { id: 2, label: 'Impacto', icon: Zap },
    { id: 3, label: 'T.A.D.S.', icon: ShieldCheck }
];

export default function OpportunityWizard({ initialData, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Opportunity>>(initialData || {
    title: '', 
    description: '', 
    status: 'Future',
    velocity: 3, 
    viability: 3, 
    revenue: 3,
    rde: RDEStatus.WARM,
    tads: { scalability: false, integration: false, painPoint: false, recurring: false, mvpSpeed: false },
    archetype: Archetype.SAAS_ENTRY,
    intensity: IntensityLevel.L1
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
      setIsSaving(true);
      const tadsScore = Object.values(formData.tads || {}).filter(Boolean).length * 2;
      const prioScore = ((formData.velocity || 1) * 0.4 + (formData.viability || 1) * 0.35 + (formData.revenue || 1) * 0.25) * 10;

      await onSave({
          ...formData,
          id: initialData?.id || crypto.randomUUID(),
          prioScore: prioScore,
          tadsScore: tadsScore,
          createdAt: initialData?.createdAt || new Date().toISOString(),
          status: 'Future'
      } as Opportunity);
      setIsSaving(false);
  };

  const toggleTads = (key: keyof TadsCriteria) => {
      setFormData({
          ...formData,
          tads: {
              ...formData.tads!,
              [key]: !formData.tads![key]
          }
      });
  };

  return (
    <div className="fixed inset-0 z-[600] glass-panel bg-[var(--bg-color)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.08),transparent_50%)] pointer-events-none"></div>

        {/* Header Wizard */}
        <header className="h-24 px-12 flex items-center justify-between shrink-0 relative z-10 border-b border-[var(--border-color)] bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-6">
                <button onClick={onCancel} className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl text-slate-500 transition-all">
                    <X className="w-6 h-6"/>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter leading-none">Mapear <span className="text-amber-500">Oportunidade</span>.</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Shinkō Innovation Framework v2.5</p>
                </div>
            </div>
            
            <div className="flex items-center gap-10">
                <div className="flex gap-4">
                    {STEPS.map((s, idx) => (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                             <div className={`w-12 h-1.5 rounded-full transition-all duration-500 ${step === idx ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : idx < step ? 'bg-amber-500/40' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${step === idx ? 'text-amber-500' : 'text-slate-400'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
                {step === STEPS.length - 1 ? (
                    <button onClick={handleSave} className="px-12 py-4 bg-amber-500 text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-glow-amber hover:scale-105 transition-all">
                        {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : 'Finalizar Ativo'}
                    </button>
                ) : (
                    <button onClick={() => setStep(s => s + 1)} className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                        Próximo <ChevronRight className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </header>

        {/* Wizard Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-16 px-8 relative z-10">
            <div className="max-w-4xl w-full">
                
                {/* STEP 0: ESTRATÉGIA */}
                {step === 0 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-[1.8rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-glow-amber">
                                <Sparkles className="w-8 h-8"/>
                            </div>
                            <h3 className="text-6xl font-black text-[var(--text-main)] tracking-tighter leading-[1.1]">Onde está o <br/><span className="text-amber-500">Valor?</span></h3>
                            <p className="text-slate-500 text-xl font-medium">Defina o nome e o contexto estratégico da sua iniciativa.</p>
                        </div>
                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 block ml-1">Identificação do Projeto</label>
                                <input 
                                    autoFocus
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="Ex: SaaS Gestão de Condomínio"
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[2rem] p-8 text-4xl font-black text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 block ml-1">Escopo e Missão</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Qual dor técnica ou de negócio estamos curando hoje?"
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[2.5rem] p-10 text-xl text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all h-60 resize-none leading-relaxed shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 1: DNA (ARCHETYPE & INTENSITY) */}
                {step === 1 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">DNA do <span className="text-amber-500">Ativo</span>.</h3>
                            <p className="text-slate-500 text-xl font-medium">Categorize a natureza e o peso da sua solução.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 block ml-1">Arquétipo de Negócio</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.values(Archetype).map(arch => (
                                        <button 
                                            key={arch}
                                            onClick={() => setFormData({...formData, archetype: arch})}
                                            className={`p-5 rounded-2xl border text-left transition-all ${formData.archetype === arch ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber scale-[1.02]' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-slate-500 hover:bg-white/5'}`}
                                        >
                                            <div className="font-black text-sm uppercase tracking-widest">{arch}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 block ml-1">Nível de Intensidade</label>
                                <div className="glass-card p-8 space-y-8">
                                    <div className="flex justify-between items-center">
                                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
                                            <Gauge className="w-8 h-8" />
                                        </div>
                                        <span className="text-7xl font-black text-blue-500">L{formData.intensity}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="4" step="1"
                                        value={formData.intensity}
                                        onChange={e => setFormData({...formData, intensity: parseInt(e.target.value)})}
                                        className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Baixa</span>
                                        <span>Crítica</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed px-2">A intensidade define o rigor técnico e de governança aplicado a este projeto durante o ciclo de engenharia.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: MATRIZ RDE */}
                {step === 2 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">Matriz <span className="text-amber-500">RDE</span>.</h3>
                            <p className="text-slate-500 text-xl font-medium">Priorização fundamentada em variáveis de esforço e retorno.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-10 glass-card p-12 border-[var(--border-color)]">
                            {[
                                { key: 'revenue', label: 'Impacto Comercial', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { key: 'viability', label: 'Viabilidade Técnica', icon: ShieldAlert, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                { key: 'velocity', label: 'Velocidade de MVP', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' }
                            ].map(item => (
                                <div key={item.key} className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-4 rounded-2xl ${item.bg} ${item.color} border border-white/5 shadow-sm`}>
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{item.label}</span>
                                        </div>
                                        <span className={`text-6xl font-black ${item.color}`}>{formData[item.key as keyof Opportunity] as number}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="5" step="1"
                                        value={formData[item.key as keyof Opportunity] as number}
                                        onChange={e => setFormData({...formData, [item.key]: parseInt(e.target.value)})}
                                        className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: T.A.D.S. VALIDATION */}
                {step === 3 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">Crivo <span className="text-amber-500">T.A.D.S.</span></h3>
                            <p className="text-slate-500 text-xl font-medium">Fundamentos obrigatórios para viabilidade de longo prazo.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { key: 'scalability', label: 'Escalabilidade Linear', desc: 'O ativo consegue crescer em volume sem aumentar proporcionalmente o custo?' },
                                { key: 'integration', label: 'Facilidade de Integração', desc: 'Possui APIs ou conectores que permitem o encaixe no ecossistema atual?' },
                                { key: 'painPoint', label: 'Dor Real Detectada', desc: 'Existe evidência factual de que o mercado sofre por falta desta solução?' },
                                { key: 'recurring', label: 'Potencial de Recorrência', desc: 'O modelo de negócio permite cobrança recorrente (MRR)?' },
                                { key: 'mvpSpeed', label: 'Velocidade de MVP', desc: 'Conseguimos colocar a primeira versão em produção em menos de 4 semanas?' }
                            ].map(item => (
                                <button 
                                    key={item.key}
                                    onClick={() => toggleTads(item.key as keyof TadsCriteria)}
                                    className={`p-8 rounded-[2.2rem] border text-left transition-all flex items-center justify-between group ${formData.tads?.[item.key as keyof TadsCriteria] ? 'bg-emerald-500 border-emerald-400 text-black shadow-glow-emerald' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-slate-500 hover:border-amber-500/30'}`}
                                >
                                    <div className="max-w-[80%]">
                                        <div className={`text-xl font-black uppercase tracking-tight mb-2 ${formData.tads?.[item.key as keyof TadsCriteria] ? 'text-black' : 'text-[var(--text-main)]'}`}>{item.label}</div>
                                        <div className={`text-sm font-medium ${formData.tads?.[item.key as keyof TadsCriteria] ? 'text-black/70' : 'text-slate-500'}`}>{item.desc}</div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${formData.tads?.[item.key as keyof TadsCriteria] ? 'bg-black text-emerald-500 border-black' : 'border-slate-200 dark:border-white/10 group-hover:border-amber-500/50'}`}>
                                        {formData.tads?.[item.key as keyof TadsCriteria] && <Check className="w-8 h-8 stroke-[4px]"/>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
}
