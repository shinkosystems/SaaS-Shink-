import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask } from '../types';
import { 
    X, AlignLeft, CheckSquare, BarChart3, Trash2, Clock, 
    CreditCard, Save, Calendar, Users, Tag, Zap, 
    ChevronRight, Plus, Info, Check, User as UserIcon, Eye, Timer, BrainCircuit, Loader2, Sparkles,
    AlertTriangle
} from 'lucide-react';
import { fetchOrgMembers, syncTaskChecklist, updateTask } from '../services/projectService';
import { generateSubtasksForTask } from '../services/geminiService';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => void;
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
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(setAvailableUsers);
    }
  }, [organizationId]);

  useEffect(() => {
    if (titleRef.current) {
        titleRef.current.style.height = 'auto';
        // Adiciona 4px de buffer para evitar cortes em descenders
        titleRef.current.style.height = (titleRef.current.scrollHeight + 4) + 'px';
    }
  }, [formData.text]);

  const handleSync = () => {
      onSave(formData);
      onClose();
  };

  const handleAddSubtask = () => {
      if (!newSubtask.trim()) return;
      const sub: BpmnSubTask = { id: crypto.randomUUID(), text: newSubtask, completed: false };
      setFormData({ ...formData, subtasks: [...(formData.subtasks || []), sub] });
      setNewSubtask('');
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
    setFormData({
        ...formData,
        gut: {
            ...(formData.gut || { g: 1, u: 1, t: 1 }),
            [key]: val
        }
    });
  };

  const getAssigneeData = () => availableUsers.find(u => u.id === formData.assigneeId);
  const gutTotal = (formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1);

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-5xl h-[95vh] md:h-[90vh] bg-white dark:bg-[#050507] rounded-t-[2rem] md:rounded-[3.5rem] shadow-glass border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-ios-pop">
        
        {/* Header - Shinko Style */}
        <header className="px-5 md:px-12 py-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] shrink-0">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">{opportunityTitle}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => onDelete?.(task.id)} className="p-2.5 text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white bg-slate-100 dark:bg-white/5 rounded-xl transition-all"><X className="w-4 h-4"/></button>
                    </div>
                </div>
                <textarea 
                    ref={titleRef} value={formData.text} rows={1}
                    onChange={e => setFormData({...formData, text: e.target.value})}
                    className="bg-transparent text-2xl md:text-5xl font-black text-slate-900 dark:text-white outline-none w-full tracking-tighter leading-[1.1] resize-none overflow-hidden py-2"
                    placeholder="Título do Ativo"
                />
            </div>

            {/* Abas Minimalistas */}
            <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-2xl w-fit mt-8 border border-white/5">
                {[
                    { id: 'info', icon: AlignLeft }, 
                    { id: 'checklist', icon: CheckSquare }, 
                    { id: 'activity', icon: BarChart3 }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-10 rounded-xl transition-all ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <tab.icon className="w-4.5 h-4.5"/>
                    </button>
                ))}
            </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-5 md:p-12 custom-scrollbar bg-white/50 dark:bg-black/20">
            {activeTab === 'info' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                    
                    {/* Grid de Propriedades (Horizontal conforme a imagem) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Responsável</label>
                            <div className="relative h-[64px] group">
                                <select 
                                    value={formData.assigneeId || ''}
                                    onChange={e => setFormData({...formData, assigneeId: e.target.value, assignee: availableUsers.find(u => u.id === e.target.value)?.nome})}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                >
                                    <option value="">Ninguém</option>
                                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                                <div className="flex items-center gap-4 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 h-full group-hover:border-amber-500/30 transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                                        <UserIcon className="w-4 h-4 text-slate-500"/>
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{getAssigneeData()?.nome || 'Atribuir...'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Prazo Final</label>
                            <div className="flex items-center gap-4 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 h-[64px] hover:border-amber-500/30 transition-all">
                                <Calendar className="w-5 h-5 text-amber-500 shrink-0"/>
                                <input type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none flex-1 uppercase w-full"/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Esforço Estimado</label>
                            <div className="flex items-center gap-4 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 h-[64px] hover:border-amber-500/30 transition-all">
                                <Clock className="w-5 h-5 text-blue-500 shrink-0"/>
                                <input 
                                    type="number" 
                                    value={formData.estimatedHours || 0} 
                                    /* Fixed error: using setFormData to update estimatedHours */
                                    onChange={e => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })} 
                                    className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none flex-1 w-full"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Descrição do Ativo */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Descrição do Ativo</label>
                        <div className="relative group">
                            <textarea 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-sm md:text-lg text-slate-700 dark:text-slate-400 outline-none h-60 md:h-80 focus:border-amber-500/30 shadow-inner resize-none leading-relaxed" 
                                placeholder="Implementação de ferramentas e dashboards..."
                            />
                        </div>
                    </div>

                    {/* GUT Matrix Mini */}
                    <div className="glass-card p-6 border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] max-w-sm ml-auto">
                        <div className="flex justify-between items-center mb-6">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Matriz GUT</label>
                            <span className="text-xs font-black text-amber-500">Score: {gutTotal}</span>
                        </div>
                        <div className="flex gap-4">
                           {['g', 'u', 't'].map(k => (
                               <div key={k} className="flex-1">
                                   <input 
                                        type="range" min="1" max="5" 
                                        value={(formData.gut as any)[k] || 1} 
                                        onChange={e => updateGut(k as any, parseInt(e.target.value))}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                   <div className="text-center text-[8px] font-bold text-slate-500 uppercase mt-2">{k}</div>
                               </div>
                           ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'checklist' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
                    <div className="flex gap-3 p-1.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                        <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} placeholder="Nova entrega técnica..." className="flex-1 bg-transparent px-4 py-2.5 text-slate-900 dark:text-white outline-none text-sm font-medium"/>
                        <button onClick={handleAddSubtask} className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-amber-500 transition-all shrink-0"><Plus className="w-5 h-5"/></button>
                    </div>
                    <button onClick={handleAiGenerateChecklist} disabled={isGeneratingChecklist} className="w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">
                        {isGeneratingChecklist ? <Loader2 className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>}
                        Explodir Subtarefas via IA
                    </button>
                    <div className="space-y-3 mt-8">
                        {formData.subtasks?.map(sub => (
                            <div key={sub.id} className="flex items-center gap-4 p-5 bg-black/20 border border-white/5 rounded-[1.5rem]">
                                <button onClick={() => setFormData({...formData, subtasks: formData.subtasks?.map(s => s.id === sub.id ? {...s, completed: !s.completed} : s)})} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}><Check className="w-3 h-3 stroke-[4px]"/></button>
                                <span className={`text-sm font-bold flex-1 ${sub.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{sub.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="max-w-2xl mx-auto py-10 animate-in fade-in duration-700">
                    <div className="relative pl-10 space-y-12">
                        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/5"></div>
                        {[
                            { label: 'Registro Inicial', date: formData.createdAt, icon: Plus, color: 'bg-blue-500' },
                            { label: 'Em Execução', date: formData.lifecycle?.doing, icon: Zap, color: 'bg-amber-500' },
                            { label: 'Revisão Técnica', date: formData.lifecycle?.review, icon: Eye, color: 'bg-purple-500' },
                            { label: 'Ativo Concluído', date: formData.lifecycle?.done, icon: Check, color: 'bg-emerald-500' }
                        ].map((evt, i) => (
                            <div key={i} className="relative flex items-center gap-8">
                                <div className={`z-10 w-10 h-10 rounded-xl ${evt.color} flex items-center justify-center text-white shadow-lg shrink-0`}><evt.icon className="w-4 h-4 stroke-[3px]"/></div>
                                <div className="flex-1 p-5 glass-panel rounded-2xl flex justify-between items-center">
                                    <span className="font-black text-[10px] uppercase tracking-widest text-white">{evt.label}</span>
                                    <span className="font-mono text-[9px] text-amber-500 font-black">{evt.date ? new Date(evt.date).toLocaleDateString() : '--/--'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>

        <footer className="h-28 px-5 md:px-12 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex items-center justify-end gap-6 shrink-0">
            <button onClick={onClose} className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">Descartar</button>
            <button onClick={handleSync} className="px-12 py-5 bg-amber-500 text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-glow-amber flex items-center justify-center gap-3 transition-transform active:scale-95"><Save className="w-5 h-5"/> Sincronizar</button>
        </footer>
      </div>
    </div>
  );
};