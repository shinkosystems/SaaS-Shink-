
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, Attachment, Comment, TaskStatus } from '../types';
import { 
    X, AlignLeft, Trash2, Clock, 
    Save, Calendar, User as UserIcon, Loader2,
    Paperclip, MessageSquare, Send, ChevronDown, BarChart3, Tag,
    ArrowRight, ArrowLeft, Check, AlertTriangle, TrendingUp
} from 'lucide-react';
import { fetchOrgMembers, updateTask, deleteTask } from '../services/projectService';
import { fetchComments, addComment } from '../services/commentService';
import { supabase } from '../services/supabaseClient';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => Promise<any> | any;
  onClose: () => void;
  onDelete?: (id: string) => void;
  organizationId?: number;
  readOnly?: boolean;
}

const SHINKO_CATEGORIES = [
    "Adm", "Financeiro", "Gestão", "Tecnológico", "RH", 
    "Modelagem", "Interface", "Lógica", "Marketing", "Suporte"
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'todo', label: 'Backlog', color: 'bg-slate-400' },
    { value: 'doing', label: 'Execução', color: 'bg-blue-500' },
    { value: 'review', label: 'Revisão', color: 'bg-purple-500' },
    { value: 'approval', label: 'Aprovação', color: 'bg-orange-500' },
    { value: 'done', label: 'Concluído', color: 'bg-emerald-500' }
];

const STEPS = [
    { id: 'title', label: 'Título' },
    { id: 'status', label: 'Estágio' },
    { id: 'category', label: 'Categoria' },
    { id: 'assignee', label: 'Responsável' },
    { id: 'effort', label: 'Prazo e Esforço' },
    { id: 'gut', label: 'Prioridade' },
    { id: 'description', label: 'Escopo' }
];

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, organizationId, readOnly }) => {
  const isNew = task.id === 'new';
  const [step, setStep] = useState(isNew ? 0 : -1); // -1 significa visão completa (edição)
  
  const [formData, setFormData] = useState<BpmnTask>(() => ({
      ...task,
      category: task.category || 'Gestão',
      assigneeId: task.assigneeId || "",
      gut: task.gut || { g: 3, u: 3, t: 3 },
      attachments: task.attachments || []
  }));
  
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const effectiveDbId = formData.dbId || (typeof formData.id === 'string' && !isNaN(Number(formData.id)) ? Number(formData.id) : undefined);

  // Efeito Nubank: Ocultar Navegação sempre que o modal de tarefa estiver aberto
  useEffect(() => {
    // Oculta sidebar e drawer mobile para focar no fluxo e evitar sobreposição
    const navElements = document.querySelectorAll('aside, .fixed.bottom-6, .lg\\:flex.flex-col.w-64');
    navElements.forEach(el => {
        (el as HTMLElement).style.visibility = 'hidden';
        (el as HTMLElement).style.pointerEvents = 'none';
    });
    
    return () => {
        navElements.forEach(el => {
            (el as HTMLElement).style.visibility = 'visible';
            (el as HTMLElement).style.pointerEvents = 'auto';
        });
    };
  }, []);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(setAvailableUsers);
    }
    const loadUserAndComments = async () => {
        const { data } = await supabase.auth.getUser();
        if (data.user) setCurrentUser(data.user);
        if (effectiveDbId) loadComments(Number(effectiveDbId));
    };
    loadUserAndComments();
  }, [effectiveDbId, organizationId]);

  const loadComments = async (id: number) => {
    setIsLoadingComments(true);
    try {
        const data = await fetchComments(id);
        setComments(data || []);
    } finally {
        setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const textToSend = newComment.trim();
    if (!textToSend || isAddingComment || !effectiveDbId) return;

    setIsAddingComment(true);
    try {
        const comment = await addComment(Number(effectiveDbId), currentUser.id, textToSend);
        if (comment) {
            setComments(prev => [...prev, comment]);
            setNewComment('');
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    } finally {
        setIsAddingComment(false);
    }
  };

  const handleSync = async () => {
      if (readOnly) return;
      setIsSaving(true);
      try {
          await onSave(formData);
          onClose();
      } catch (e) {
          alert("Erro ao sincronizar dados.");
      } finally {
          setIsSaving(false);
      }
  };

  const updateGut = (field: 'g' | 'u' | 't', val: number) => {
      setFormData(prev => ({
          ...prev,
          gut: { ...prev.gut!, [field]: val }
      }));
  };

  const gutScore = (formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1);
  const progress = step === -1 ? 100 : ((step + 1) / STEPS.length) * 100;

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  // Renderização da Visão de Edição (Industrial / Full)
  const renderEditView = () => (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-10">
        <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Título do Ativo</label>
            <input 
                value={formData.text}
                onChange={e => setFormData({...formData, text: e.target.value})}
                className="w-full bg-transparent text-2xl md:text-3xl font-black text-slate-900 dark:text-white outline-none tracking-tight border-b border-slate-100 dark:border-white/5 pb-2 transition-all focus:border-amber-500/40"
            />
        </div>

        <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Estágio Atual</label>
            <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setFormData({...formData, status: opt.value, completed: opt.value === 'done'})}
                        className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                            ${formData.status === opt.value 
                                ? `${opt.color} text-white border-transparent shadow-lg scale-105` 
                                : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5'}
                        `}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <AlignLeft className="w-4 h-4" /> Escopo do Ativo
            </label>
            <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva detalhadamente..."
                className="w-full h-48 p-5 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-3xl text-base text-slate-800 dark:text-slate-300 outline-none focus:border-amber-500/20 transition-all resize-none leading-relaxed"
            />
        </div>

        <div className="p-8 bg-slate-950 rounded-[2.5rem] border border-amber-500/10 text-white space-y-8 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4"/> Prioridade GUT
                </label>
                <span className="text-2xl font-black text-white tracking-tighter">Score: {gutScore}</span>
            </div>
            <div className="space-y-8 relative z-10">
                {[
                    { id: 'g', label: 'Gravidade', val: formData.gut?.g || 1 },
                    { id: 'u', label: 'Urgência', val: formData.gut?.u || 1 },
                    { id: 't', label: 'Tendência', val: formData.gut?.t || 1 }
                ].map(item => (
                    <div key={item.id} className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>{item.label}</span>
                            <span className="text-amber-500 text-sm">{item.val} / 5</span>
                        </div>
                        <input type="range" min="1" max="5" value={item.val} onChange={e => updateGut(item.id as any, parseInt(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500" />
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Tag className="w-4 h-4" /> Categoria
                </label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-sm font-black uppercase outline-none appearance-none cursor-pointer dark:text-white">
                    {SHINKO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <UserIcon className="w-4 h-4" /> Responsável
                </label>
                <select value={formData.assigneeId || ""} onChange={e => setFormData({...formData, assigneeId: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-sm font-black uppercase outline-none appearance-none cursor-pointer dark:text-white">
                    <option value="">Sem Atribuição...</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome.toUpperCase()}</option>)}
                </select>
            </div>
            <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Calendar className="w-4 h-4" /> Deadline Final
                </label>
                <input type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-sm font-black uppercase outline-none dark:text-white" />
            </div>
            <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Clock className="w-4 h-4" /> Esforço Estimado (h)
                </label>
                <input type="number" value={formData.estimatedHours || 0} onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-base font-black outline-none dark:text-white" />
            </div>
        </div>

        <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <MessageSquare className="w-4 h-4" /> Log de Comunicação
            </label>
            <div className="space-y-4 bg-slate-50 dark:bg-white/[0.01] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                {comment.user_data?.avatar_url ? <img src={comment.user_data.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-slate-400"/>}
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{comment.user_data?.nome}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(comment.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-400 leading-relaxed bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">{comment.mensagem}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={commentsEndRef} />
                </div>
                <form onSubmit={handleAddComment} className="relative mt-4">
                    <input 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Adicionar nota técnica..."
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 pr-14 text-sm font-medium outline-none focus:border-amber-500 transition-all shadow-sm dark:text-white"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-amber-500 text-white rounded-xl shadow-lg active:scale-90 transition-all">
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>

        <div className="pt-10 pb-20 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-6 py-5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center justify-center gap-3 transition-all border border-slate-200 dark:border-white/10">
                    <Paperclip className="w-5 h-5" /> Anexar Arquivos
                </button>
                <button onClick={handleSync} disabled={isSaving} className="flex-[2] px-10 py-5 bg-amber-500 text-black rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Sincronizar Registro
                </button>
            </div>
        </div>
    </div>
  );

  // Renderização da Visão Progressiva (Wizard Style)
  const renderWizardView = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-xl py-12">
            
            {step === 0 && (
                <div className="space-y-10 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                        O que precisa <span className="text-amber-500">ser feito</span>?
                    </h1>
                    <input 
                        autoFocus
                        value={formData.text}
                        onChange={e => setFormData({...formData, text: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && formData.text && next()}
                        placeholder="Ex: Definir arquitetura de dados..."
                        className="w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 focus:border-amber-500 outline-none py-6 text-2xl md:text-3xl font-bold transition-all placeholder:text-slate-200 dark:placeholder:text-white/5 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Pressione Enter para continuar</p>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-10 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                        Qual o <span className="text-amber-500">estágio</span> atual?
                    </h1>
                    <div className="grid grid-cols-1 gap-3">
                        {STATUS_OPTIONS.map(opt => (
                            <button 
                                key={opt.value}
                                onClick={() => { setFormData({...formData, status: opt.value}); next(); }}
                                className={`p-6 rounded-[1.8rem] border-2 text-left transition-all font-black text-xs uppercase tracking-widest flex items-center justify-between ${formData.status === opt.value ? 'bg-amber-500 border-amber-500 text-black shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'}`}
                            >
                                {opt.label}
                                {formData.status === opt.value && <Check className="w-5 h-5"/>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-10 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                        Qual a <span className="text-amber-500">categoria</span>?
                    </h1>
                    <div className="grid grid-cols-2 gap-3">
                        {SHINKO_CATEGORIES.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => { setFormData({...formData, category: cat}); next(); }}
                                className={`p-6 rounded-[1.8rem] border-2 text-center transition-all font-black text-[9px] uppercase tracking-widest ${formData.category === cat ? 'bg-amber-500 border-amber-500 text-black shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-10 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                        Quem será o <span className="text-amber-500">responsável</span>?
                    </h1>
                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={() => { setFormData({...formData, assigneeId: ''}); next(); }}
                            className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 ${!formData.assigneeId ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-black shadow-xl' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-black text-lg">?</div>
                            <span className="font-black text-xs uppercase tracking-widest">Sem Atribuição</span>
                        </button>
                        {availableUsers.map(m => (
                            <button 
                                key={m.id}
                                onClick={() => { setFormData({...formData, assigneeId: m.id}); next(); }}
                                className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 ${formData.assigneeId === m.id ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-black shadow-xl' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'}`}
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

            {step === 4 && (
                <div className="space-y-12 animate-fade-up">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                            Qual o <span className="text-amber-500">prazo</span> final?
                        </h1>
                        <input 
                            type="date" 
                            value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                            onChange={e => setFormData({...formData, dueDate: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-[1.8rem] p-8 text-2xl font-black shadow-inner uppercase outline-none text-slate-900 dark:text-white focus:ring-4 focus:ring-amber-500/10"
                        />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Esforço Estimado (Horas)</h2>
                        <div className="flex items-center gap-6 p-8 bg-slate-50 dark:bg-white/5 rounded-[1.8rem]">
                            <input 
                                type="range" min="1" max="40" 
                                value={formData.estimatedHours || 2}
                                onChange={e => setFormData({...formData, estimatedHours: parseInt(e.target.value)})}
                                className="flex-1 accent-amber-500"
                            />
                            <span className="text-4xl font-black text-slate-900 dark:text-white min-w-[80px] text-right">{formData.estimatedHours || 2}h</span>
                        </div>
                    </div>
                </div>
            )}

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
                            { id: 'g', label: 'Gravidade', val: formData.gut?.g || 1 },
                            { id: 'u', label: 'Urgência', val: formData.gut?.u || 1 },
                            { id: 't', label: 'Tendência', val: formData.gut?.t || 1 }
                        ].map(item => (
                            <div key={item.id} className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                                    <span className="text-slate-400">{item.label}</span>
                                    <span className="text-slate-900 dark:text-white text-base">{item.val}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={item.val} 
                                    onChange={e => updateGut(item.id as any, parseInt(e.target.value))} 
                                    className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 6 && (
                <div className="space-y-10 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                        Escopo <span className="text-amber-500">Técnico</span>.
                    </h1>
                    <textarea 
                        autoFocus
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full h-64 bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-amber-500 rounded-[2rem] p-8 text-lg font-medium shadow-inner outline-none transition-all text-slate-700 dark:text-slate-300 resize-none leading-relaxed"
                        placeholder="Opcional: Descreva os requisitos técnicos desta entrega..."
                    />
                </div>
            )}

        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0c0c0e] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
        
        {/* BARRA DE PROGRESSO (Apenas na criação) */}
        {isNew && (
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 shrink-0">
                <div 
                    className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        )}

        {/* HEADER FIXO */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">{opportunityTitle || 'Ativo Operacional'}</span>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {isNew ? `Novo Card - Passo ${step + 1}` : `Registro #${effectiveDbId || '---'}`}
                </h2>
            </div>
            <div className="flex items-center gap-3">
                {!readOnly && onDelete && !isNew && (
                    <button 
                        onClick={() => onDelete(formData.id)} 
                        className="p-3 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-full text-red-500 transition-all active:scale-90"
                        title="Deletar Tarefa"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
                <button onClick={onClose} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-900 dark:text-white shadow-sm active:scale-90 transition-all">
                    <X className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isNew ? renderWizardView() : renderEditView()}
        </div>

        {/* FOOTER NAVEGAÇÃO (Apenas na criação) */}
        {isNew && (
            <footer className="px-8 pb-12 pt-6 flex gap-4 shrink-0 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-md border-t border-slate-100 dark:border-white/5">
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
                        disabled={step === 0 && !formData.text.trim()}
                        className="flex-[2] py-5 rounded-[1.8rem] bg-slate-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-20"
                    >
                        Continuar <ArrowRight className="w-4 h-4"/>
                    </button>
                ) : (
                    <button 
                        onClick={handleSync}
                        disabled={isSaving}
                        className="flex-[2] py-5 rounded-[1.8rem] bg-amber-500 text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
                        Sincronizar Ativo
                    </button>
                )}
            </footer>
        )}
        
        <input type="file" ref={fileInputRef} className="hidden" multiple={false} />
    </div>
  );
};
