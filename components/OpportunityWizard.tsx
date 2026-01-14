
import React, { useState } from 'react';
import { Opportunity, Archetype, IntensityLevel, RDEStatus, TadsCriteria, getTerminology, ProjectStatus } from '../types';
import { Check, Loader2, Target, ShieldCheck, Zap, DollarSign, Sparkles, X, ChevronRight, Layers, Gauge, Info, Coins, Calendar, Ban } from 'lucide-react';

interface Props {
  initialData?: Partial<Opportunity>;
  onSave: (opp: Opportunity) => Promise<void> | void;
  onCancel: () => void;
  orgType?: string;
  customLogoUrl?: string | null;
}

const Logo = ({ customLogoUrl, orgName }: { customLogoUrl?: string | null, orgName?: string }) => (
    <div className="flex items-center gap-3">
        {customLogoUrl ? (
            <img src={customLogoUrl} alt={orgName} className="h-7 w-auto object-contain" />
        ) : (
            <>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-glow-amber">
                    <Sparkles className="w-4 h-4"/>
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-sm tracking-tighter text-slate-900 dark:text-white leading-none">Shinkō</span>
                    <span className="text-[6px] font-black uppercase tracking-widest text-amber-500 mt-0.5">OS 26</span>
                </div>
            </>
        )}
    </div>
);

const STEPS = [
    { id: 0, label: 'Estratégia', icon: Target },
    { id: 1, label: 'DNA', icon: Layers },
    { id: 2, label: 'Economia', icon: Coins },
    { id: 3, label: 'Matriz RDE', icon: Zap },
    { id: 4, label: 'Crivo TADS', icon: ShieldCheck }
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
    { value: 'Future', label: 'Backlog / Oportunidade' },
    { value: 'Negotiation', label: 'Em Negociação' },
    { value: 'Active', label: 'Ativar na Engenharia' }
];

export default function OpportunityWizard({ initialData, onSave, onCancel, orgType, customLogoUrl }: Props) {
  const [step, setStep] = useState(0);
  const terms = getTerminology(orgType);
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<Partial<Opportunity>>(initialData || {
    title: '', 
    description: '', 
    status: 'Future',
    velocity: 3, 
    viability: 3, 
    revenue: 3,
    mrr: 0,
    meses: 12,
    rde: RDEStatus.WARM,
    tads: { scalability: false, integration: false, painPoint: false, recurring: false, mvpSpeed: false },
    archetype: Archetype.SAAS_ENTRY,
    intensity: IntensityLevel.L1
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const isInternal = formData.archetype === Archetype.INTERNAL_MARKETING;

  const handleSave = async () => {
      if (!formData.title) return alert("Defina um título para o projeto.");
      setIsSaving(true);
      try {
          const tadsScore = Object.values(formData.tads || {}).filter(Boolean).length * 2;
          const prioScore = ((formData.velocity || 1) * 0.4 + (formData.viability || 1) * 0.35 + (formData.revenue || 1) * 0.25) * 10;

          await onSave({
              ...formData,
              id: initialData?.id || crypto.randomUUID(),
              mrr: isInternal ? 0 : Number(formData.mrr || 0),
              meses: Number(formData.meses || 12),
              prioScore: prioScore,
              tadsScore: tadsScore,
              createdAt: initialData?.createdAt || new Date().toISOString(),
              status: formData.status || 'Future'
          } as Opportunity);
      } catch (e) {
          console.error("Wizard Save Error:", e);
      } finally {
          setIsSaving(false);
      }
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

        <header className="h-20 lg:h-24 px-6 lg:px-12 flex items-center justify-between shrink-0 relative z-10 border-b border-[var(--border-color)] bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-4 lg:gap-10">
                <div className="hidden lg:block border-r border-white/10 pr-10">
                    <Logo customLogoUrl={customLogoUrl} orgName={orgType} />
                </div>
                <button onClick={onCancel} className="p-2 lg:p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl text-slate-500 transition-all">
                    <X className="w-5 h-5 lg:w-6 lg:h-6"/>
                </button>
                <div>
                    <h2 className="text-lg lg:text-2xl font-black text-[var(--text-main)] tracking-tighter leading-none truncate max-w-[150px] lg:max-w-none">{isEditing ? 'Refinar' : 'Mapear'} <span className="text-amber-500">Projeto</span>.</h2>
                    <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 lg:mt-2">FRAMEWORK SHINKŌ</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 lg:gap-10">
                <div className="hidden sm:flex gap-4">
                    {STEPS.map((s, idx) => (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                             <div className={`w-8 lg:w-12 h-1.5 rounded-full transition-all duration-500 ${step === idx ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : idx < step ? 'bg-amber-500/40' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                        </div>
                    ))}
                </div>
                {step === STEPS.length - 1 ? (
                    <button onClick={handleSave} disabled={isSaving} className="px-6 lg:px-12 py-3 lg:py-4 bg-amber-500 text-black rounded-2xl lg:rounded-[1.5rem] font-black text-[10px] lg:text-xs uppercase tracking-widest shadow-glow-amber hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : 'Finalizar Mapeamento'}
                    </button>
                ) : (
                    <button onClick={() => setStep(s => s + 1)} className="px-6 lg:px-12 py-3 lg:py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl lg:rounded-[1.5rem] font-black text-[10px] lg:text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                        Próximo <ChevronRight className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-8 lg:py-16 px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl w-full">
                
                {step === 0 && (
                    <div className="space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-4xl lg:text-6xl font-black text-[var(--text-main)] tracking-tighter leading-[1.1]">Onde está o <br/><span className="text-amber-500">Valor?</span></h3>
                            <p className="text-slate-500 dark:text-slate-400 text-base lg:text-xl font-medium max-w-lg">Nomeie seu ativo e defina sua governança inicial.</p>
                        </div>
                        <div className="space-y-8 lg:space-y-10">
                            <div>
                                <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 block ml-1">Identificação do Ativo</label>
                                <input 
                                    autoFocus
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="Ex: Sistema de Gestão de Frotas v2"
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[1.5rem] lg:rounded-[2rem] p-6 lg:p-8 text-2xl lg:text-4xl font-black text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 block ml-1">Governança</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData({...formData, status: opt.value})}
                                            className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === opt.value ? 'bg-amber-500 border-amber-400 text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 block ml-1">Contexto Técnico</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Descreva a dor que este projeto resolve..."
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[1.5rem] lg:rounded-[2.5rem] p-6 lg:p-10 text-base lg:text-xl text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all h-48 lg:h-60 resize-none leading-relaxed shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-4xl lg:text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">DNA do <span className="text-amber-500">Ativo</span>.</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-base lg:text-xl font-medium">Categorize a natureza e o peso da sua solução.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                            <div className="space-y-4">
                                <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 block ml-1">Arquétipo de Negócio</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.values(Archetype).map((arch: string) => (
                                        <button 
                                            key={arch}
                                            onClick={() => setFormData({...formData, archetype: arch as Archetype})}
                                            className={`p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border text-left transition-all group ${formData.archetype === arch ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber scale-[1.02]' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-slate-500 hover:bg-white/5'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1 lg:mb-2">
                                                <div className="font-black text-xs lg:text-sm uppercase tracking-widest">{terms.archetypes[arch as Archetype].label}</div>
                                                {formData.archetype === arch && <Check className="w-4 h-4" />}
                                            </div>
                                            <p className={`text-[8px] lg:text-[10px] font-bold leading-relaxed ${formData.archetype === arch ? 'text-black/70' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {terms.archetypes[arch as Archetype].desc}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 block ml-1">Nível de Intensidade</label>
                                <div className="glass-card p-6 lg:p-10 space-y-6 lg:space-y-10 border-blue-500/20">
                                    <div className="flex justify-between items-center">
                                        <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
                                            <Gauge className="w-6 h-6 lg:w-8 lg:h-8" />
                                        </div>
                                        <span className="text-5xl lg:text-7xl font-black text-blue-500 tracking-tighter leading-none">L{formData.intensity}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="4" step="1"
                                        value={formData.intensity}
                                        onChange={e => setFormData({...formData, intensity: parseInt(e.target.value)})}
                                        className="w-full h-2 lg:h-3 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Baixa</span>
                                        <span>Crítica</span>
                                    </div>
                                    <div className="p-4 lg:p-5 bg-blue-500/5 rounded-xl lg:rounded-2xl border border-blue-500/10 flex gap-3 lg:gap-4 items-start">
                                        <div className="mt-0.5"><Info className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 shrink-0" /></div>
                                        <p className="text-[10px] lg:text-xs text-blue-400 font-bold leading-relaxed">{terms.intensities[formData.intensity || 1]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-4xl lg:text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">Economia do <span className="text-amber-500">Ativo</span>.</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-base lg:text-xl font-medium">Projete o retorno financeiro deste projeto.</p>
                        </div>
                        
                        {isInternal ? (
                            <div className="p-12 bg-white/5 border border-dashed border-white/20 rounded-[3rem] text-center space-y-6">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <Ban className="w-10 h-10 text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white">Projeto Interno</h4>
                                    <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">Ativos deste arquétipo medem valor por redução de custos ou ganho de eficiência técnica.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                                <div className="space-y-6 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
                                            <Coins className="w-6 h-6"/>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">MRR Alvo</span>
                                    </div>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500 opacity-50">R$</span>
                                        <input 
                                            type="number"
                                            value={formData.mrr || ''}
                                            onChange={e => setFormData({...formData, mrr: Number(e.target.value)})}
                                            placeholder="0,00"
                                            className="w-full bg-black/20 border border-white/10 rounded-[1.5rem] p-6 pl-16 text-4xl font-black text-white outline-none focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
                                                <Calendar className="w-6 h-6"/>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Ciclo</span>
                                        </div>
                                        <span className="text-3xl font-black text-blue-500">{formData.meses} <span className="text-sm">meses</span></span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="36" step="1"
                                        value={formData.meses || 12}
                                        onChange={e => setFormData({...formData, meses: parseInt(e.target.value)})}
                                        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Projetado:</span>
                                        <span className="text-lg font-black text-emerald-500">R$ {(Number(formData.mrr || 0) * (formData.meses || 12)).toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-4xl lg:text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">Matriz <span className="text-amber-500">RDE</span>.</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-base lg:text-xl font-medium">Priorização estratégica baseada em esforço e retorno.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-8 lg:gap-10 glass-card p-6 lg:p-12 border-[var(--border-color)]">
                            {[
                                { key: 'revenue', label: terms.revenueLabel, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { key: 'viability', label: terms.viabilityLabel, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                { key: 'velocity', label: terms.mvpLabel, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' }
                            ].map(item => (
                                <div key={item.key} className="space-y-4 lg:space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3 lg:gap-4">
                                            <div className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl ${item.bg} ${item.color} border border-white/5 shadow-sm`}>
                                                <item.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                                            </div>
                                            <span className="text-lg lg:text-2xl font-black text-[var(--text-main)] uppercase tracking-tight block leading-none">{item.label}</span>
                                        </div>
                                        <span className={`text-4xl lg:text-6xl font-black ${item.color} tracking-tighter leading-none`}>{formData[item.key as keyof Opportunity] as number}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="5" step="1"
                                        value={formData[item.key as keyof Opportunity] as number}
                                        onChange={e => setFormData({...formData, [item.key]: parseInt(e.target.value)})}
                                        className="w-full h-2 lg:h-3 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="space-y-4">
                            <h3 className="text-4xl lg:text-6xl font-black text-[var(--text-main)] tracking-tighter leading-none">Mapear <span className="text-amber-500">Projeto</span>.</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-base lg:text-xl font-medium">Validadores fundamentais do Framework Shinkō.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { key: 'scalability', label: terms.scalabilityLabel, desc: `Capacidade de escalar em volume sem aumentar o custo proporcional.` },
                                { key: 'integration', label: terms.integrationLabel, desc: `Conexão fluida com as outras áreas e ferramentas do ecossistema.` },
                                { key: 'painPoint', label: terms.painPointLabel, desc: `Evidência factual de necessidade real e imediata do usuário.` },
                                { key: 'recurring', label: terms.recurringLabel, desc: `Modelo que permite vínculo de longo prazo e faturamento recorrente.` },
                                { key: 'mvpSpeed', label: terms.mvpLabel, desc: `Entrega funcional rápida para validação de hipótese de mercado.` }
                            ].map(item => (
                                <button 
                                    key={item.key}
                                    onClick={() => toggleTads(item.key as keyof TadsCriteria)}
                                    className={`p-6 lg:p-8 rounded-[2rem] border text-left transition-all flex items-center justify-between group ${formData.tads?.[item.key as keyof TadsCriteria] ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-[1.02]' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-slate-500 hover:border-amber-500/30'}`}
                                >
                                    <div className="max-w-[80%] lg:max-w-[85%]">
                                        <div className={`text-sm lg:text-xl font-black uppercase tracking-tight mb-1 lg:mb-2 ${formData.tads?.[item.key as keyof TadsCriteria] ? 'text-white' : 'text-[var(--text-main)]'}`}>{item.label}</div>
                                        <div className={`text-[10px] lg:text-sm font-medium leading-relaxed ${formData.tads?.[item.key as keyof TadsCriteria] ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>{item.desc}</div>
                                    </div>
                                    <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center border-2 transition-all ${formData.tads?.[item.key as keyof TadsCriteria] ? 'bg-white text-emerald-600 border-white' : 'border-slate-200 dark:border-white/10 group-hover:border-amber-500/50 shadow-sm'}`}>
                                        {formData.tads?.[item.key as keyof TadsCriteria] && <Check className="w-5 h-5 lg:w-8 lg:h-8 stroke-[4px]"/>}
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
