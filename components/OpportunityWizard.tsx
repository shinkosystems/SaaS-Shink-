
import React, { useState, useEffect } from 'react';
import { Opportunity, RDEStatus, Archetype, IntensityLevel, TadsCriteria, ProjectStatus } from '../types';
import { X, ArrowLeft, ChevronRight, Check, Rocket } from 'lucide-react';
import { ElasticSwitch } from './ElasticSwitch';

interface Props {
  initialData?: Partial<Opportunity>;
  onSave: (opp: Opportunity) => void;
  onCancel: () => void;
  orgType?: string;
  activeModules?: string[];
}

export default function OpportunityWizard({ initialData, onSave, onCancel, orgType }: Props) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Opportunity>>(initialData || {
    title: '', description: '', status: 'Future',
    velocity: 3, viability: 3, revenue: 3,
    tads: { scalability: false, integration: false, painPoint: false, recurring: false, mvpSpeed: false }
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSave = () => {
      onSave({
          ...formData,
          id: initialData?.id || crypto.randomUUID(),
          prioScore: ((formData.velocity || 1) * 0.4 + (formData.viability || 1) * 0.35 + (formData.revenue || 1) * 0.25),
          createdAt: new Date().toISOString()
      } as Opportunity);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Projeto</h2>
                    <p className="text-xs text-slate-500">Passo {step + 1} de 3</p>
                </div>
                <button onClick={onCancel}><X className="w-5 h-5 text-slate-400"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {step === 0 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Projeto</label>
                            <input 
                                type="text" 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full p-4 text-lg font-bold bg-slate-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: App de Delivery"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição</label>
                            <textarea 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full p-4 h-32 bg-slate-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                placeholder="Descreva os objetivos..."
                            />
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Priorização (Score)</label>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2"><span>Velocidade</span> <span>{formData.velocity}/5</span></div>
                                    <input type="range" min="1" max="5" value={formData.velocity} onChange={e => setFormData({...formData, velocity: parseInt(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2"><span>Viabilidade</span> <span>{formData.viability}/5</span></div>
                                    <input type="range" min="1" max="5" value={formData.viability} onChange={e => setFormData({...formData, viability: parseInt(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2"><span>Receita/Valor</span> <span>{formData.revenue}/5</span></div>
                                    <input type="range" min="1" max="5" value={formData.revenue} onChange={e => setFormData({...formData, revenue: parseInt(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"/>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center py-8">
                            <Rocket className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Tudo pronto!</h3>
                            <p className="text-slate-500 mt-2">Seu projeto será criado e você poderá começar a adicionar tarefas.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-between">
                {step > 0 ? (
                    <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Voltar</button>
                ) : <div></div>}
                
                {step < 2 ? (
                    <button onClick={nextStep} disabled={!formData.title} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">Próximo <ChevronRight className="w-4 h-4"/></button>
                ) : (
                    <button onClick={handleSave} className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-lg">Lançar Projeto <Check className="w-4 h-4"/></button>
                )}
            </div>
        </div>
    </div>
  );
}
