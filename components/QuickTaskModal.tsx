
import React, { useState, useEffect, useRef } from 'react';
import { Opportunity, BpmnTask } from '../types';
import { 
    X, CheckCircle, Calendar as CalendarIcon, User, 
    Briefcase, Layers, Clock, BarChart3, AlignLeft, 
    ChevronDown, Tag, ArrowRight, ArrowLeft, Check,
    Loader2, Target, Zap, AlertTriangle, TrendingUp
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Props {
  opportunities: Opportunity[];
  onClose: () => void;
  onSave: (task: BpmnTask, projectId: string | null) => void;
  userRole?: string;
}

interface OrgMember {
    id: string;
    nome: string;
}

const SHINKO_CATEGORIES = [
    "Adm", "Financeiro", "Gestão", "Tecnológico", "RH", 
    "Modelagem", "Interface", "Lógica", "Marketing", "Suporte"
];

const STEPS = [
    { id: 'title', label: 'O que precisa ser feito?' },
    { id: 'category', label: 'Qual a categoria?' },
    { id: 'project', label: 'Vincular a qual projeto?' },
    { id: 'assignee', label: 'Quem será o responsável?' },
    { id: 'date', label: 'Qual o prazo final?' },
    { id: 'gut', label: 'Prioridade (GUT)' },
    { id: 'desc', label: 'Mais algum detalhe?' }
];

export const QuickTaskModal: React.FC<Props> = ({ opportunities, onClose, onSave, userRole }) => {
  const [step, setStep] = useState(0);
  
  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [category, setCategory] = useState('Gestão');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [description, setDescription] = useState('');
  const [gravidade, setGravidade] = useState(3);
  const [urgencia, setUrgencia] = useState(3);
  const [tendencia, setTendencia] = useState(3);
  
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Esconder navegação global ao abrir
  useEffect(() => {
    const navElements = document.querySelectorAll('aside, .fixed.bottom-6');
    navElements.forEach(el => (el as HTMLElement).style.display = 'none');
    return () => {
        navElements.forEach(el => (el as HTMLElement).style.display = '');
    };
  }, []);

  useEffect(() => {
      const fetchMembers = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              setAssigneeId(user.id);
              const { data: userData } = await supabase.from('users').select('organizacao, nome').eq('id', user.id).single();
              if (userData) {
                  setAssigneeName(userData.nome || 'Eu');
                  if (userData.organizacao) {
                      const { data: members } = await supabase.from('users').select('id, nome').eq('organizacao', userData.organizacao).order('nome');
                      if (members) setOrgMembers(members);
                  }
              }
          }
      };
      fetchMembers();
  }, []);

  const handleSave = async () => {
      if (!taskTitle.trim()) return setStep(0);
      setIsSaving(true);

      const newTask: BpmnTask = {
          id: crypto.randomUUID(),
          displayId: Math.floor(100000 + Math.random() * 900000),
          text: taskTitle,
          description: description,
          completed: false,
          status: 'todo',
          assignee: assigneeName || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate,
          estimatedHours: estimatedHours,
          gut: { g: gravidade, u: urgencia, t: tendencia },
          tags: [category]
      };

      // @ts-ignore
      newTask.category = category;

      await onSave(newTask, projectId || null);
      setIsSaving(false);
  };

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const activeProjects = opportunities.filter(o => o.status !== 'Archived' && o.status !== 'Frozen');
  const progress = ((step + 1) / STEPS.length) * 100;
  const gutScore = gravidade * urgencia * tendencia;

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col bg-white dark:bg-[#060608] animate-in fade-in duration-300">
        
        {/* PROGRESS BAR ESTILO NUBANK */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 shrink-0">
            <div 
                className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${progress}%` }}
            ></div>
        </div>

        {/* HEADER MINIMALISTA */}
        <header className="px-8 h-24 flex items-center justify-between shrink-0">
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X className="w-7 h-7"/>
            </button>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nova Tarefa</span>
                <span className="text-[10px] font-bold text-amber-500 mt-1">{step + 1} de {STEPS.length}</span>
            </div>
            <div className="w-12"></div> {/* Spacer for symmetry */}
        </header>

        {/* MAIN CONTENT AREA - PERGUNTA POR PERGUNTA */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-xl py-12">
                
                {/* PASSO 1: TÍTULO */}
                {step === 0 && (
                    <div className="space-y-10 animate-fade-up">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                            O que precisa <span className="text-amber-500">ser feito</span>?
                        </h1>
                        <input 
                            autoFocus
                            value={taskTitle}
                            onChange={e => setTaskTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && taskTitle && next()}
                            placeholder="Ex: Refinar interface do Dashboard..."
                            className="w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 focus:border-amber-500 outline-none py-6 text-2xl md:text-3xl font-bold transition-all placeholder:text-slate-200 dark:placeholder:text-white/5 text-slate-900 dark:text-white"
                        />
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Pressione Enter para continuar</p>
                    </div>
                )}

                {/* PASSO 2: CATEGORIA */}
                {step === 1 && (
                    <div className="space-y-10 animate-fade-up">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                            Qual a <span className="text-amber-500">categoria</span>?
                        </h1>
                        <div className="grid grid-cols-2 gap-3">
                            {SHINKO_CATEGORIES.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => { setCategory(cat); next(); }}
                                    className={`p-6 rounded-[1.8rem] border-2 text-center transition-all font-black text-xs uppercase tracking-widest ${category === cat ? 'bg-amber-500 border-amber-500 text-black shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* PASSO 3: PROJETO */}
                {step === 2 && (
                    <div className="space-y-10 animate-fade-up">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                            Vincular a qual <span className="text-amber-500">ativo</span>?
                        </h1>
                        <div className="space-y-3">
                            <button 
                                onClick={() => { setProjectId(''); next(); }}
                                className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-4 ${projectId === '' ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-black shadow-xl' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'}`}
                            >
                                <div className="p-3 bg-white/10 rounded-xl"><Layers className="w-5 h-5"/></div>
                                <span className="font-black text-xs uppercase tracking-widest">Tarefa Avulsa (Ad-hoc)</span>
                            </button>
                            {activeProjects.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => { setProjectId(p.id); next(); }}
                                    className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-4 ${projectId === p.id ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-black shadow-xl' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'}`}
                                >
                                    <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl"><Briefcase className="w-5 h-5"/></div>
                                    <span className="font-black text-xs uppercase tracking-widest truncate">{p.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* PASSO 4: RESPONSÁVEL */}
                {step === 3 && (
                    <div className="space-y-10 animate-fade-up">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                            Quem será o <span className="text-amber-500">responsável</span>?
                        </h1>
                        <div className="grid grid-cols-1 gap-3">
                            {orgMembers.map(m => (
                                <button 
                                    key={m.id}
                                    onClick={() => { setAssigneeId(m.id); setAssigneeName(m.nome); next(); }}
                                    className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 ${assigneeId === m.id ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-black shadow-xl' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-black text-lg">
                                        {m.nome.charAt(0)}
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest">{m.nome}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* PASSO 5: DATA E ESFORÇO */}
                {step === 4 && (
                    <div className="space-y-12 animate-fade-up">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                                Qual o <span className="text-amber-500">prazo</span> final?
                            </h1>
                            <input 
                                type="date" 
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-[1.8rem] p-8 text-2xl font-black shadow-inner uppercase outline-none text-slate-900 dark:text-white focus:ring-4 focus:ring-amber-500/10"
                            />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Esforço Estimado (Horas)</h2>
                            <div className="flex items-center gap-6 p-8 bg-slate-50 dark:bg-white/5 rounded-[1.8rem]">
                                <input 
                                    type="range" min="1" max="40" 
                                    value={estimatedHours}
                                    onChange={e => setEstimatedHours(parseInt(e.target.value))}
                                    className="flex-1 accent-amber-500"
                                />
                                <span className="text-4xl font-black text-slate-900 dark:text-white min-w-[80px] text-right">{estimatedHours}h</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASSO 6: MATRIZ GUT */}
                {step === 5 && (
                    <div className="space-y-10 animate-fade-up">
                        <div className="flex justify-between items-end">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                                Qual a <span className="text-amber-500">prioridade</span>?
                            </h1>
                            <div className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest border ${gutScore >= 60 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                GUT {gutScore}
                            </div>
                        </div>
                        
                        <div className="space-y-10 bg-slate-50 dark:bg-white/5 p-10 rounded-[3rem]">
                            {[
                                { label: 'Gravidade', val: gravidade, set: setGravidade, icon: AlertTriangle, color: 'text-rose-500' },
                                { label: 'Urgência', val: urgencia, set: setUrgencia, icon: Clock, color: 'text-amber-500' },
                                { label: 'Tendência', val: tendencia, set: setTendencia, icon: TrendingUp, color: 'text-blue-500' }
                            ].map(item => (
                                <div key={item.label} className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                                        <div className="flex items-center gap-2">
                                            <item.icon className={`w-3.5 h-3.5 ${item.color}`}/>
                                            <span className="text-slate-400">{item.label}</span>
                                        </div>
                                        <span className="text-slate-900 dark:text-white text-base">{item.val}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="5" step="1"
                                        value={item.val} 
                                        onChange={e => item.set(parseInt(e.target.value))} 
                                        className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PASSO 7: DESCRIÇÃO E FINALIZAÇÃO */}
                {step === 6 && (
                    <div className="space-y-10 animate-fade-up">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                            Mais algum <span className="text-amber-500">detalhe</span>?
                        </h1>
                        <textarea 
                            autoFocus
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full h-64 bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-amber-500 rounded-[2rem] p-8 text-lg font-medium shadow-inner outline-none transition-all text-slate-700 dark:text-slate-300 resize-none leading-relaxed"
                            placeholder="Opcional: Descreva o escopo técnico..."
                        />
                        <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-4">
                            <Zap className="w-6 h-6 text-amber-500"/>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quase lá! Ao confirmar, a tarefa será sincronizada imediatamente no Kanban.</p>
                        </div>
                    </div>
                )}

            </div>
        </main>

        {/* NAVEGAÇÃO DE RODAPÉ ESTILO NUBANK */}
        <footer className="px-8 pb-12 pt-6 flex gap-4 shrink-0 bg-white/80 dark:bg-[#060608]/80 backdrop-blur-md">
            {step > 0 && (
                <button 
                    onClick={prev}
                    className="flex-1 py-5 rounded-[1.8rem] bg-slate-100 dark:bg-white/5 text-slate-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                    <ArrowLeft className="w-4 h-4"/> Voltar
                </button>
            )}
            
            {step < STEPS.length - 1 ? (
                <button 
                    onClick={next}
                    disabled={step === 0 && !taskTitle.trim()}
                    className="flex-[2] py-5 rounded-[1.8rem] bg-slate-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-20"
                >
                    Continuar <ArrowRight className="w-4 h-4"/>
                </button>
            ) : (
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-[2] py-5 rounded-[1.8rem] bg-amber-500 text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 active:scale-95 transition-all"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
                    Sincronizar Ativo
                </button>
            )}
        </footer>
    </div>
  );
};
