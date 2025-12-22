
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask } from '../types';
import { 
    X, AlignLeft, CheckSquare, BarChart3, Trash2, Clock, 
    Save, Calendar, Users, Zap, 
    Plus, User as UserIcon, BrainCircuit, Loader2, Sparkles
} from 'lucide-react';
import { fetchOrgMembers } from '../services/projectService';
import { generateSubtasksForTask } from '../services/geminiService';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => Promise<void> | void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  organizationId?: number;
}

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, organizationId }) => {
  const [formData, setFormData] = useState<BpmnTask>({ 
      ...task,
      subtasks: task.subtasks || [],
      gut: task.gut || { g: 1, u: 1, t: 1 },
      tags: task.tags || [],
      members: task.members || []
  });
  
  const [activeTab, setActiveTab] = useState<'info' | 'checklist' | 'activity'>('info');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(setAvailableUsers);
    }
  }, [organizationId]);

  useEffect(() => {
    if (titleRef.current) {
        titleRef.current.style.height = 'auto';
        titleRef.current.style.height = (titleRef.current.scrollHeight + 4) + 'px';
    }
  }, [formData.text]);

  const handleSync = async () => {
      setIsSaving(true);
      try {
          await onSave(formData);
          onClose();
      } catch (e) {
          alert("Erro ao salvar dados.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleAddSubtask = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      
      const textToAdd = newSubtask.trim();
      if (!textToAdd) return;

      const sub: BpmnSubTask = { 
          id: crypto.randomUUID(), 
          text: textToAdd, 
          completed: false 
      };

      // Atualização atômica para garantir renderização
      setFormData(prev => ({ 
          ...prev, 
          subtasks: [...(prev.subtasks || []), sub] 
      }));
      setNewSubtask('');
  };

  const toggleSubtask = (id: string) => {
      setFormData(prev => ({
          ...prev,
          subtasks: prev.subtasks?.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
      }));
  };

  const deleteSubtask = (id: string) => {
      setFormData(prev => ({
          ...prev,
          subtasks: prev.subtasks?.filter(s => s.id !== id)
      }));
  };

  const handleAiGenerateChecklist = async () => {
    if (!formData.text) return alert("Título da tarefa é necessário para IA.");
    setIsGeneratingChecklist(true);
    try {
        const teamForAi = availableUsers.map(u => ({ id: u.id, name: u.nome, role: u.area || 'Técnico' }));
        const suggestions = await generateSubtasksForTask(formData.text, formData.description || '', '', teamForAi);
        
        if (suggestions && suggestions.length > 0) {
            const newSubs: BpmnSubTask[] = suggestions.map(s => ({
                id: crypto.randomUUID(),
                text: s.title,
                completed: false,
                estimatedHours: s.hours,
                assigneeId: s.assigneeId,
                assignee: availableUsers.find(u => u.id === s.assigneeId)?.nome
            }));
            setFormData(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), ...newSubs] }));
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao conectar com a IA.");
    } finally {
        setIsGeneratingChecklist(false);
    }
  };

  const updateGut = (key: 'g' | 'u' | 't', val: number) => {
    setFormData(prev => ({
        ...prev,
        gut: { ...(prev.gut || { g: 1, u: 1, t: 1 }), [key]: val }
    }));
  };

  const getAssigneeData = () => availableUsers.find(u => u.id === formData.assigneeId);
  const gutTotal = (formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1);

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-5xl h-[95vh] md:h-[90vh] bg-white dark:bg-[#050507] rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-glass border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-ios-pop">
        
        <header className="px-6 md:px-12 py-10 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] shrink-0">
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80 mb-2 block">{opportunityTitle}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => onDelete?.(task.id)} className="p-3 text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4.5 h-4.5"/></button>
                        <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-xl transition-all"><X className="w-4.5 h-4.5"/></button>
                    </div>
                </div>
                <textarea 
                    ref={titleRef} value={formData.text} rows={1}
                    onChange={e => setFormData({...formData, text: e.target.value})}
                    className="bg-transparent text-3xl md:text-5xl font-black text-slate-900 dark:text-white outline-none w-full tracking-tighter leading-tight resize-none overflow-hidden"
                    placeholder="Título do Ativo"
                />
            </div>

            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl w-fit mt-10 border border-slate-200 dark:border-white/5 shadow-inner">
                {[
                    { id: 'info', icon: AlignLeft, label: 'Geral' }, 
                    { id: 'checklist', icon: CheckSquare, label: 'Checklist' }, 
                    { id: 'activity', icon: BarChart3, label: 'Histórico' }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex items-center justify-center gap-3 px-8 h-12 rounded-xl transition-all ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-lg scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <tab.icon className="w-4 h-4"/>
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-slate-50/30 dark:bg-black/20 text-slate-900 dark:text-white">
            {activeTab === 'info' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Responsável Técnico</label>
                            <div className="relative group">
                                <select 
                                    value={formData.assigneeId || ''}
                                    onChange={e => setFormData({...formData, assigneeId: e.target.value, assignee: availableUsers.find(u => u.id === e.target.value)?.nome})}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                >
                                    <option value="">Ninguém</option>
                                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                                <div className="flex items-center gap-4 glass-input rounded-2xl p-5 h-16 group-hover:border-amber-500/50 shadow-inner">
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <UserIcon className="w-4 h-4 text-slate-500"/>
                                    </div>
                                    <span className="text-xs font-bold truncate">{getAssigneeData()?.nome || 'Atribuir...'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Prazo de Entrega</label>
                            <div className="flex items-center gap-4 glass-input rounded-2xl p-5 h-16 shadow-inner">
                                <Calendar className="w-5 h-5 text-amber-500 shrink-0"/>
                                <input type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="bg-transparent text-xs font-bold outline-none flex-1 uppercase w-full"/>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Custo em Horas</label>
                            <div className="flex items-center gap-4 glass-input rounded-2xl p-5 h-16 shadow-inner">
                                <Clock className="w-5 h-5 text-blue-500 shrink-0"/>
                                <input 
                                    type="number" 
                                    value={formData.estimatedHours || 0} 
                                    onChange={e => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })} 
                                    className="bg-transparent text-xs font-bold outline-none flex-1 w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Contexto Técnico do Ativo</label>
                        <textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="w-full glass-input rounded-[2rem] p-8 text-lg text-slate-700 dark:text-slate-300 min-h-[250px] resize-none leading-relaxed shadow-inner" 
                            placeholder="Descreva os requisitos técnicos e objetivos..."
                        />
                    </div>

                    <div className="glass-card p-8 rounded-[2rem] border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02] max-w-sm ml-auto">
                        <div className="flex justify-between items-center mb-8">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Matriz GUT</label>
                            <span className="text-sm font-black text-amber-500">Score: {gutTotal}</span>
                        </div>
                        <div className="flex gap-6">
                           {['g', 'u', 't'].map(k => (
                               <div key={k} className="flex-1 space-y-3">
                                   <input 
                                        type="range" min="1" max="5" 
                                        value={(formData.gut as any)[k] || 1} 
                                        onChange={e => updateGut(k as any, parseInt(e.target.value))}
                                        className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                   <div className="text-center text-[9px] font-black text-slate-400 uppercase">{k}</div>
                               </div>
                           ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'checklist' && (
                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 w-full">
                    <form onSubmit={handleAddSubtask} className="flex gap-4 p-2 glass-input rounded-2xl shadow-inner">
                        <input 
                            value={newSubtask} 
                            onChange={e => setNewSubtask(e.target.value)} 
                            placeholder="Adicionar nova entrega técnica..." 
                            className="flex-1 bg-transparent px-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none"
                        />
                        <button 
                            type="submit"
                            className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-amber-500 hover:text-black transition-all shrink-0 shadow-lg"
                        >
                            <Plus className="w-6 h-6"/>
                        </button>
                    </form>
                    
                    <button onClick={handleAiGenerateChecklist} disabled={isGeneratingChecklist} className="w-full flex items-center justify-center gap-3 py-5 bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50">
                        {isGeneratingChecklist ? <Loader2 className="w-5 h-5 animate-spin"/> : <BrainCircuit className="w-5 h-5"/>}
                        Explodir Checklist via IA
                    </button>

                    <div className="space-y-4">
                        {formData.subtasks?.map(sub => (
                            <div key={sub.id} className="flex items-center gap-5 p-6 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-3xl animate-in slide-in-from-bottom-2 group">
                                <button 
                                    onClick={() => toggleSubtask(sub.id)} 
                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-glow-emerald' : 'border-slate-300 dark:border-slate-700'}`}
                                >
                                    {sub.completed && <CheckCircle2 className="w-5 h-5" />}
                                </button>
                                <span className={`text-sm font-bold flex-1 transition-all ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{sub.text}</span>
                                <button 
                                    onClick={() => deleteSubtask(sub.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
                        {(!formData.subtasks || formData.subtasks.length === 0) && (
                            <div className="text-center py-24 text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] bg-black/5">
                                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20"/>
                                <p className="text-sm font-black uppercase tracking-widest">Nenhuma entrega mapeada.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-700 w-full">
                    <div className="relative pl-12 space-y-12">
                        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/5"></div>
                        {[
                            { label: 'Registro Inicial', date: formData.createdAt, icon: Plus, color: 'bg-blue-500' },
                            { label: 'Em Execução', date: formData.lifecycle?.doing, icon: Zap, color: 'bg-amber-500' },
                            { label: 'Revisão Técnica', date: formData.lifecycle?.review, icon: Sparkles, color: 'bg-purple-500' },
                            { label: 'Ativo Concluído', date: formData.lifecycle?.done, icon: CheckCircle2, color: 'bg-emerald-500' }
                        ].map((evt, i) => (
                            <div key={i} className="relative flex items-center gap-10">
                                <div className={`z-10 w-12 h-12 rounded-2xl ${evt.color} flex items-center justify-center text-white shadow-xl shrink-0`}>
                                    <evt.icon className="w-5 h-5"/>
                                </div>
                                <div className="flex-1 p-6 glass-panel rounded-2xl flex justify-between items-center shadow-sm">
                                    <span className="font-black text-[11px] uppercase tracking-widest">{evt.label}</span>
                                    <span className="font-mono text-[10px] text-amber-600 font-black">{evt.date ? new Date(evt.date).toLocaleDateString() : '--/--'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>

        <footer className="h-28 px-6 md:px-12 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex items-center justify-end gap-6 shrink-0">
            <button onClick={onClose} className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
            <button onClick={handleSync} disabled={isSaving} className="px-14 py-5 bg-amber-500 text-black rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-glow-amber flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-70">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                Sincronizar Ativo
            </button>
        </footer>
      </div>
    </div>
  );
};

const CheckCircle2 = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);
