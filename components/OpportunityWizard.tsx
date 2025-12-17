
import React, { useState } from 'react';
import { Opportunity, Archetype, IntensityLevel, TadsCriteria, RDEStatus } from '../types';
import { X, ArrowLeft, ChevronRight, Check, Rocket, Sparkles, Loader2, RefreshCw, Target, Layers, ShieldCheck, Zap, DollarSign, BrainCircuit, LayoutGrid } from 'lucide-react';
import { generateBpmn } from '../services/geminiService';
import { ElasticSwitch } from './ElasticSwitch';

interface Props {
  initialData?: Partial<Opportunity>;
  onSave: (opp: Opportunity) => Promise<void> | void;
  onCancel: () => void;
  orgType?: string;
  activeModules?: string[];
}

const STEPS = [
    { id: 0, label: 'Definição', icon: Target, desc: 'O que vamos construir?' },
    { id: 1, label: 'Arquétipo', icon: LayoutGrid, desc: 'Qual o modelo de negócio?' },
    { id: 2, label: 'T.A.D.S.', icon: ShieldCheck, desc: 'Validação de Potencial' },
    { id: 3, label: 'Matriz RDE', icon: Zap, desc: 'Priorização Matemática' },
    { id: 4, label: 'Estrutura IA', icon: BrainCircuit, desc: 'Geração do Cronograma' }
];

export default function OpportunityWizard({ initialData, onSave, onCancel, orgType }: Props) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Opportunity>>(initialData || {
    title: '', 
    description: '', 
    status: 'Future',
    velocity: 3, 
    viability: 3, 
    revenue: 3,
    tads: { scalability: false, integration: false, painPoint: false, recurring: false, mvpSpeed: false },
    archetype: Archetype.SAAS_ENTRY,
    intensity: IntensityLevel.L1
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedStructure, setGeneratedStructure] = useState<any>(initialData?.bpmn || null);

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleTadsToggle = (key: keyof TadsCriteria) => {
      setFormData(prev => ({
          ...prev,
          tads: { ...prev.tads!, [key]: !prev.tads![key] }
      }));
  };

  const handleGenerateStructure = async () => {
      if (!formData.title || !formData.description) return;
      
      setIsGenerating(true);
      try {
          const bpmn = await generateBpmn(
              formData.title,
              formData.description,
              formData.archetype || 'SaaS',
              '', 
              orgType
          );
          
          if (bpmn) {
              setGeneratedStructure(bpmn);
              setFormData(prev => ({ ...prev, bpmn }));
          } else {
              throw new Error("Resposta vazia da IA");
          }
      } catch (e: any) {
          console.error(e);
          alert("Erro ao conectar com Shinkō Guru AI. Verifique sua conexão ou tente novamente mais tarde.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const tadsScore = Object.values(formData.tads || {}).filter(Boolean).length * 2;
          const prioScore = ((formData.velocity || 1) * 0.4 + (formData.viability || 1) * 0.35 + (formData.revenue || 1) * 0.25) * 10;

          let rde = RDEStatus.WARM;
          const rev = formData.revenue || 3;
          const via = formData.viability || 3;
          if (rev >= 4 && via >= 3) rde = RDEStatus.HOT;
          else if (rev <= 2 && via <= 2) rde = RDEStatus.COLD;

          await onSave({
              ...formData,
              id: initialData?.id || crypto.randomUUID(),
              prioScore: prioScore,
              tadsScore: tadsScore,
              rde: rde,
              createdAt: initialData?.createdAt || new Date().toISOString()
          } as Opportunity);
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar projeto. Tente novamente.");
      } finally {
          setIsSaving(false);
      }
  };

  // LAYOUT CHANGED: Removed fixed overlay, now behaves as a full page container
  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-white dark:bg-[#050505] animate-in fade-in duration-300">
        
        {/* Sidebar Steps - Left Side */}
        <div className="w-full md:w-72 bg-slate-50 dark:bg-[#0c0c0e] border-r border-slate-200 dark:border-white/5 p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div>
                <button onClick={onCancel} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-medium text-sm">
                    <ArrowLeft className="w-4 h-4"/> Cancelar
                </button>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 px-2 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-purple-500"/> {initialData ? 'Editar Projeto' : 'Novo Projeto'}
                </h2>
                <p className="text-xs text-slate-500 px-2 mb-8">Framework de Inovação Shinkō</p>

                <div className="space-y-2">
                    {STEPS.map((s, idx) => {
                        const isActive = step === idx;
                        const isPast = step > idx;
                        return (
                            <button 
                                key={s.id}
                                onClick={() => step > idx ? setStep(idx) : null}
                                disabled={step < idx}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-white dark:bg-white/10 shadow-lg scale-105 border border-slate-200 dark:border-white/5' 
                                    : 'hover:bg-slate-100 dark:hover:bg-white/5 opacity-60'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                    isActive ? 'bg-purple-600 text-white' : 
                                    isPast ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                                }`}>
                                    {isPast ? <Check className="w-4 h-4"/> : <s.icon className="w-4 h-4"/>}
                                </div>
                                <div>
                                    <div className={`text-sm font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{s.label}</div>
                                    <div className="text-[10px] text-slate-400 leading-tight">{s.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center px-4 opacity-50 mt-8">
                Shinkō Framework v2.5
            </div>
        </div>

        {/* Main Content - Right Side */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-[#050505]">
            <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar max-w-5xl mx-auto w-full">
                
                {/* STEP 0: DEFINITION */}
                {step === 0 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Vamos começar pelo básico.</h3>
                            <p className="text-lg text-slate-500 dark:text-slate-400">Defina o nome e o objetivo principal desta iniciativa.</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Nome do Projeto</label>
                                <input 
                                    type="text" 
                                    value={formData.title} 
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full p-6 text-2xl font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
                                    placeholder="Ex: App de Delivery, Novo CRM..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Descrição & Objetivos</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full p-6 h-64 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 resize-none text-lg transition-all placeholder:text-slate-300 dark:placeholder:text-white/20 leading-relaxed"
                                    placeholder="Descreva o que será feito, para quem e qual o resultado esperado..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 1: ARCHETYPE */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Qual o modelo?</h3>
                            <p className="text-lg text-slate-500 dark:text-slate-400">O Shinkō adapta a estratégia baseada no arquétipo do projeto.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.values(Archetype).map((arch) => (
                                <div 
                                    key={arch}
                                    onClick={() => setFormData({...formData, archetype: arch})}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-6 ${
                                        formData.archetype === arch 
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-xl shadow-purple-500/10' 
                                        : 'border-slate-200 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/50 bg-white dark:bg-white/5'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                                        formData.archetype === arch ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                                    }`}>
                                        <Layers className="w-7 h-7"/>
                                    </div>
                                    <div>
                                        <h4 className={`font-bold text-lg ${formData.archetype === arch ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {arch}
                                        </h4>
                                        <p className="text-sm text-slate-500 mt-2 leading-snug">
                                            {arch === 'SaaS de Entrada' && 'Foco em MVP e validação rápida.'}
                                            {arch === 'SaaS Verticalizado' && 'Solução profunda para nicho específico.'}
                                            {arch === 'Serviço + Tecnologia' && 'Híbrido de consultoria e software.'}
                                            {arch === 'Plataforma de Automação' && 'Integração e eficiência operacional.'}
                                            {arch === 'Interno / Marketing' && 'Projetos de apoio e crescimento.'}
                                        </p>
                                    </div>
                                    {formData.archetype === arch && <Check className="w-6 h-6 text-purple-500 ml-auto"/>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: T.A.D.S. */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Filtro T.A.D.S.</h3>
                            <p className="text-lg text-slate-500 dark:text-slate-400">Analise os 5 pilares fundamentais. Quanto mais itens, maior a chance de sucesso.</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: 'painPoint', label: 'Dor Real (Pain)', desc: 'O cliente sabe que tem o problema e busca ativamente a solução?' },
                                { key: 'scalability', label: 'Escalabilidade', desc: 'É possível vender para 10 ou 1000 clientes com o mesmo esforço?' },
                                { key: 'recurring', label: 'Recorrência', desc: 'O modelo permite cobrança mensal/anual ou retenção longa?' },
                                { key: 'integration', label: 'Integração', desc: 'O produto se conecta ao ecossistema existente do cliente?' },
                                { key: 'mvpSpeed', label: 'Velocidade (Speed)', desc: 'É possível entregar valor em menos de 4 semanas?' },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <div className="pr-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{item.label}</h4>
                                        <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                                    </div>
                                    <ElasticSwitch 
                                        checked={!!formData.tads?.[item.key as keyof TadsCriteria]} 
                                        onChange={() => handleTadsToggle(item.key as keyof TadsCriteria)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: RDE MATRIX */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Matriz RDE</h3>
                            <p className="text-lg text-slate-500 dark:text-slate-400">Classifique para calcular o PrioScore.</p>
                        </div>

                        <div className="space-y-10 bg-slate-50 dark:bg-white/5 p-10 rounded-3xl border border-slate-200 dark:border-white/5">
                            <div>
                                <div className="flex justify-between items-end mb-6">
                                    <label className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-3">
                                        <DollarSign className="w-6 h-6 text-amber-500"/> Receita / Impacto
                                    </label>
                                    <span className="text-4xl font-black text-amber-500">{formData.revenue}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={formData.revenue}
                                    onChange={(e) => setFormData({...formData, revenue: parseInt(e.target.value)})}
                                    className="w-full h-4 bg-slate-200 dark:bg-black/40 rounded-full appearance-none cursor-pointer accent-amber-500"
                                />
                                <div className="flex justify-between text-xs uppercase font-bold text-slate-400 mt-3">
                                    <span>Baixo Impacto</span>
                                    <span>Game Changer</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-6">
                                    <label className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-3">
                                        <ShieldCheck className="w-6 h-6 text-blue-500"/> Viabilidade (Dor Técnica)
                                    </label>
                                    <span className="text-4xl font-black text-blue-500">{formData.viability}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={formData.viability}
                                    onChange={(e) => setFormData({...formData, viability: parseInt(e.target.value)})}
                                    className="w-full h-4 bg-slate-200 dark:bg-black/40 rounded-full appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-xs uppercase font-bold text-slate-400 mt-3">
                                    <span>Muito Complexo</span>
                                    <span>Fácil Execução</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-6">
                                    <label className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-3">
                                        <Zap className="w-6 h-6 text-emerald-500"/> Velocidade (Esforço)
                                    </label>
                                    <span className="text-4xl font-black text-emerald-500">{formData.velocity}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={formData.velocity}
                                    onChange={(e) => setFormData({...formData, velocity: parseInt(e.target.value)})}
                                    className="w-full h-4 bg-slate-200 dark:bg-black/40 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs uppercase font-bold text-slate-400 mt-3">
                                    <span>Lento / Demorado</span>
                                    <span>Rápido / Imediato</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: AI STRUCTURE */}
                {step === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 h-full flex flex-col">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Toque Final com IA</h3>
                            <p className="text-lg text-slate-500 dark:text-slate-400">Deixe o Shinkō Guru criar a estrutura inicial de tarefas para você.</p>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-3xl relative overflow-hidden min-h-[400px]">
                            {generatedStructure ? (
                                <div className="text-center space-y-8 w-full max-w-md animate-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Check className="w-12 h-12"/>
                                    </div>
                                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">Estrutura Criada!</h4>
                                    <div className="bg-white dark:bg-black/30 p-6 rounded-2xl text-left text-base text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-sm">
                                        <p className="font-bold mb-3 flex justify-between">
                                            <span>Etapas Geradas:</span>
                                            <span>{generatedStructure.nodes?.length || 0}</span>
                                        </p>
                                        <p className="font-bold mb-3 flex justify-between">
                                            <span>Tarefas Totais:</span>
                                            <span>{generatedStructure.nodes?.reduce((acc: any, n: any) => acc + n.checklist.length, 0)}</span>
                                        </p>
                                        <p className="text-sm text-slate-400 mt-4 italic">
                                            Você poderá editar tudo no quadro Kanban após salvar.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handleGenerateStructure}
                                        className="text-sm text-slate-400 hover:text-purple-500 flex items-center justify-center gap-2 mx-auto transition-colors mt-6"
                                    >
                                        <RefreshCw className="w-4 h-4"/> Regenerar com IA
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center w-full max-w-sm">
                                    <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/20 animate-pulse-slow">
                                        <Sparkles className="w-14 h-14 text-white"/>
                                    </div>
                                    <button 
                                        onClick={handleGenerateStructure}
                                        disabled={isGenerating}
                                        className="w-full py-5 bg-white dark:bg-white text-slate-900 dark:text-black font-bold text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                                    >
                                        {isGenerating ? <Loader2 className="w-6 h-6 animate-spin"/> : <BrainCircuit className="w-6 h-6"/>}
                                        {isGenerating ? 'Criando Estrutura...' : 'Gerar Estrutura Automática'}
                                    </button>
                                    <p className="text-sm text-slate-400 mt-6 max-w-xs mx-auto leading-relaxed">
                                        A IA analisará o título, descrição e arquétipo para sugerir o melhor fluxo de trabalho.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Footer Controls */}
            <div className="p-8 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] flex justify-between items-center shrink-0">
                <button 
                    onClick={prevStep}
                    disabled={step === 0}
                    className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5"/> Voltar
                </button>

                <div className="flex gap-4">
                    <div className="flex gap-2 mr-6 items-center">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i === step ? 'bg-purple-600 w-8' : i < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                        ))}
                    </div>

                    {step === STEPS.length - 1 ? (
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-3 transition-all hover:scale-105 disabled:opacity-70 disabled:scale-100 text-lg"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Rocket className="w-5 h-5"/>} 
                            {isSaving ? 'Salvando...' : (initialData ? 'Atualizar Projeto' : 'Lançar Projeto')}
                        </button>
                    ) : (
                        <button 
                            onClick={nextStep}
                            disabled={!formData.title}
                            className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg flex items-center gap-3 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 text-lg"
                        >
                            Próximo <ChevronRight className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
