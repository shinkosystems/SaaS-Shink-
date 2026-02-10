
import React, { useState, useRef, useEffect } from 'react';
import { Opportunity, Archetype, IntensityLevel, RDEStatus, getTerminology, DbClient } from '../types';
import { Check, Loader2, Target, Zap, DollarSign, Sparkles, X, ChevronLeft, FileUp, Rocket } from 'lucide-react';
import { extractProjectDetailsFromPdf } from '../services/geminiService';
import { fetchClients } from '../services/clientService';

interface Props {
  initialData?: Partial<Opportunity>;
  onSave: (opp: Opportunity) => Promise<void> | void;
  onCancel: () => void;
  orgType?: string;
  customLogoUrl?: string | null;
  organizationId?: number;
}

export default function OpportunityWizard({ initialData, onSave, onCancel, orgType, organizationId }: Props) {
  const [step, setStep] = useState(0);
  const terms = getTerminology(orgType);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    intensity: IntensityLevel.L1,
    docsContext: '',
    pdfUrl: '',
    clientId: undefined
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);

  useEffect(() => {
    if (organizationId) {
        fetchClients(organizationId);
    }
  }, [organizationId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || file.type !== 'application/pdf') return;

      setIsAnalyzingPdf(true);
      try {
          const reader = new FileReader();
          reader.onload = async () => {
              const base64 = (reader.result as string).split(',')[1];
              const result = await extractProjectDetailsFromPdf(base64);
              if (result) {
                  setFormData(prev => ({
                      ...prev,
                      title: result.title || prev.title,
                      description: result.description || prev.description,
                      archetype: (result.archetype as Archetype) || prev.archetype,
                      intensity: result.intensity || prev.intensity,
                      docsContext: result.suggestedSummary || '',
                  }));
                  setStep(1); 
              }
              setIsAnalyzingPdf(false);
          };
          reader.readAsDataURL(file);
      } catch (err) {
          setIsAnalyzingPdf(false);
      }
  };

  const handleSave = async () => {
      if (!formData.title) return;
      setIsSaving(true);
      try {
          const tadsScore = Object.values(formData.tads || {}).filter(Boolean).length * 2;
          const prioScore = ((formData.velocity || 1) * 0.4 + (formData.viability || 1) * 0.35 + (formData.revenue || 1) * 0.25) * 10;

          await onSave({
              ...formData,
              id: initialData?.id || crypto.randomUUID(),
              prioScore: prioScore,
              tadsScore: tadsScore,
              createdAt: initialData?.createdAt || new Date().toISOString(),
          } as Opportunity);
      } catch (e) {
          alert("Falha ao salvar projeto.");
      } finally {
          setIsSaving(false);
      }
  };

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#F8F9FA] flex flex-col font-sans animate-in fade-in duration-300">
        <div className="h-1.5 w-full bg-slate-100 shrink-0">
            <div 
                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / 6) * 100}%` }}
            ></div>
        </div>

        <header className="px-6 h-16 flex items-center justify-between shrink-0">
            <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6"/>
            </button>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Novo Projeto</span>
                <span className="text-[10px] font-black text-amber-500">{step + 1}/6</span>
            </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start md:justify-center px-6 pt-12 md:pt-0">
            <div className="w-full max-w-lg space-y-8 animate-fade-up">
                
                {step === 0 && (
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900">Qual o <span className="text-amber-500">nome</span> do novo projeto?</h1>
                        <input 
                            autoFocus
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && formData.title && next()}
                            placeholder="Ex: Minha Nova Ideia"
                            className="w-full bg-transparent border-b-2 border-slate-200 focus:border-amber-500 outline-none py-4 text-2xl md:text-4xl font-bold transition-all placeholder:text-slate-200 text-slate-900"
                        />
                        <div className="flex items-center gap-4">
                            <button onClick={next} disabled={!formData.title} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg hover:bg-amber-500 transition-all disabled:opacity-20 active:scale-95">Próximo</button>
                        </div>
                        <div className="pt-6">
                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-all uppercase font-black text-[9px] tracking-widest">
                                {isAnalyzingPdf ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileUp className="w-3 h-3"/>}
                                Ou subir descrição em PDF para IA
                            </button>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900">O que vamos <span className="text-amber-500">resolver</span>?</h1>
                        <textarea 
                            autoFocus
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="Descreva o problema ou a dor do usuário..."
                            className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-lg font-medium outline-none focus:border-amber-500 transition-all h-40 resize-none shadow-sm text-slate-700"
                        />
                        <div className="flex gap-3">
                            <button onClick={prev} className="p-4 bg-slate-100 rounded-xl text-slate-500"><ChevronLeft/></button>
                            <button onClick={next} disabled={!formData.description} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all disabled:opacity-20">Continuar</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900">Qual o <span className="text-amber-500">tipo</span> de projeto?</h1>
                        <div className="grid grid-cols-1 gap-3">
                            {Object.values(Archetype).map(arch => (
                                <button 
                                    key={arch}
                                    onClick={() => { setFormData({...formData, archetype: arch as Archetype}); next(); }}
                                    className={`p-5 rounded-2xl border text-left transition-all ${formData.archetype === arch ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <div className="font-bold text-sm uppercase tracking-wider">{terms.archetypes[arch as Archetype].label}</div>
                                    <p className="text-[10px] opacity-70 mt-1">{terms.archetypes[arch as Archetype].desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900">Quanto <span className="text-amber-500">vale</span> o projeto?</h1>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Ganhos mensais esperados (MRR)</label>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-slate-300">R$</span>
                                <input 
                                    type="number"
                                    autoFocus
                                    value={formData.mrr || ''}
                                    onChange={e => setFormData({...formData, mrr: Number(e.target.value)})}
                                    className="bg-transparent border-none outline-none text-4xl font-black text-slate-900 w-full"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={prev} className="p-4 bg-slate-100 rounded-xl text-slate-500"><ChevronLeft/></button>
                            <button onClick={next} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg">Tudo certo</button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-8">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900">Como está o <span className="text-amber-500">ânimo</span>?</h1>
                        <div className="space-y-8">
                            {[
                                { key: 'revenue', label: 'Retorno esperado', icon: DollarSign },
                                { key: 'viability', label: 'Facilidade técnica', icon: Target },
                                { key: 'velocity', label: 'Rapidez de entrega', icon: Zap }
                            ].map(item => (
                                <div key={item.key} className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-4 h-4 text-amber-500"/>
                                            <span className="font-bold text-xs uppercase text-slate-600">{item.label}</span>
                                        </div>
                                        <span className="text-2xl font-black text-amber-500">{formData[item.key as keyof Opportunity] as number}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="5" step="1"
                                        value={formData[item.key as keyof Opportunity] as number}
                                        onChange={e => setFormData({...formData, [item.key]: parseInt(e.target.value)})}
                                        className="w-full accent-amber-500"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={prev} className="p-4 bg-slate-100 rounded-xl text-slate-500"><ChevronLeft/></button>
                            <button onClick={next} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg">Gerar Score</button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-8 text-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg animate-bounce">
                            <Rocket className="w-10 h-10 text-white fill-white"/>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">Tudo <span className="text-amber-500">pronto!</span></h1>
                            <p className="text-slate-500 font-medium">O projeto foi mapeado com sucesso. Clique abaixo para começar a gestão.</p>
                        </div>
                        <div className="pt-4 space-y-4">
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:bg-amber-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : <><Check className="w-5 h-5"/> Salvar Projeto</>}
                            </button>
                            <button onClick={prev} className="text-[10px] font-black uppercase tracking-widest text-slate-400">Revisar dados</button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
}
