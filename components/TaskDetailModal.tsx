
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask } from '../types';
import { 
    X, AlignLeft, CheckSquare, BarChart3, Trash2, Clock, 
    CreditCard, Save, Calendar, Users, Tag, Zap, 
    ChevronRight, Plus, Info, Check, User as UserIcon, Eye, Timer, BrainCircuit, Loader2, Sparkles
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
        titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
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

  const toggleMember = (userId: string) => {
      const current = formData.members || [];
      const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
      setFormData({ ...formData, members: updated });
  };

  const getAssigneeData = () => availableUsers.find(u => u.id === formData.assigneeId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-5xl h-[95vh] md:h-[90vh] bg-white dark:bg-[#0A0A0C] rounded-t-[2rem] md:rounded-[3.5rem] shadow-glass border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-ios-pop">
        
        {/* Compact Header */}
        <header className="px-5 md:px-12 py-5 md:py-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] shrink-0">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden">
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-amber-500/80 truncate max-w-[120px]">{opportunityTitle}</span>
                            <ChevronRight className="w-2.5 h-2.5 text-slate-300 dark:text-slate-700 shrink-0"/>
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[120px]">{nodeTitle}</span>
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
                    className="bg-transparent text-lg md:text-3xl font-black text-slate-900 dark:text-white outline-none w-full tracking-tighter leading-tight resize-none overflow-hidden"
                    placeholder="Título da Tarefa"
                />
            </div>

            {/* Icon-Only Compact Tabs for Mobile */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
                {[
                    { id: 'info', label: 'Propriedades', icon: AlignLeft }, 
                    { id: 'checklist', label: 'Checklist', icon: CheckSquare }, 
                    { id: 'activity', label: 'Histórico', icon: BarChart3 }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-8 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        title={tab.label}
                    >
                        <tab.icon className="w-4.5 h-4.5 md:w-3.5 md:h-3.5"/>
                        <span className="hidden lg:inline whitespace-nowrap">{tab.label}</span>
                    </button>
                ))}
            </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-5 md:p-12 custom-scrollbar bg-white/50 dark:bg-black/20">
            {activeTab === 'info' && (
                <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block ml-1">Responsável</label>
                            <div className="relative group cursor-pointer">
                                <select 
                                    value={formData.assigneeId || ''}
                                    onChange={e => setFormData({...formData, assigneeId: e.target.value, assignee: availableUsers.find(u => u.id === e.target.value)?.nome})}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                >
                                    <option value="">Ninguém</option>
                                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                                <div className="flex items-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                                        {getAssigneeData()?.avatar_url ? <img src={getAssigneeData().avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 text-slate-400"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-black text-slate-900 dark:text-white truncate">{getAssigneeData()?.nome || 'Atribuir...'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block ml-1">Prazo Final</label>
                            <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 h-[52px] shadow-sm">
                                <Calendar className="w-4 h-4 text-amber-500 mr-3 shrink-0"/>
                                <input type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="bg-transparent text-[11px] font-black text-slate-900 dark:text-white outline-none flex-1 uppercase w-full"/>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block ml-1">GUT Score</label>
                            <div className="flex items-center justify-between bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 h-[52px] shadow-sm">
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">G:{formData.gut?.g}</span>
                                    <span className="text-[10px] font-bold text-slate-500">U:{formData.gut?.u}</span>
                                    <span className="text-[10px] font-bold text-slate-500">T:{formData.gut?.t}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${(formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1) >= 60 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {(formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block ml-1">Descrição do Ativo</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-8 text-sm md:text-base text-slate-700 dark:text-slate-400 outline-none h-40 md:h-60 focus:border-amber-500/30 shadow-inner resize-none leading-relaxed" placeholder="Adicione os detalhes técnicos e requisitos..."/>
                    </div>
                </div>
            )}

            {activeTab === 'checklist' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3 p-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} placeholder="Nova entrega..." className="flex-1 bg-transparent px-4 py-2.5 text-slate-900 dark:text-white outline-none text-sm font-medium"/>
                            <button onClick={handleAddSubtask} className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-amber-500 transition-all shrink-0"><Plus className="w-5 h-5"/></button>
                        </div>
                        <button 
                            onClick={handleAiGenerateChecklist}
                            disabled={isGeneratingChecklist}
                            className="flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                        >
                            {isGeneratingChecklist ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <BrainCircuit className="w-3.5 h-3.5"/>}
                            {isGeneratingChecklist ? 'Processando...' : 'Explodir em Subtarefas (IA)'}
                        </button>
                    </div>
                    
                    <div className="space-y-2.5">
                        {formData.subtasks?.map(sub => (
                            <div key={sub.id} className="group flex items-center gap-4 p-4 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm">
                                <button onClick={() => setFormData({...formData, subtasks: formData.subtasks?.map(s => s.id === sub.id ? {...s, completed: !s.completed} : s)})} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700 text-transparent'}`}><Check className="w-4 h-4 stroke-[4px]"/></button>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-xs md:text-sm font-bold block truncate ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{sub.text}</span>
                                </div>
                                <button onClick={() => setFormData({...formData, subtasks: formData.subtasks?.filter(s => s.id !== sub.id)})} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500/40 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="max-w-2xl mx-auto py-5 animate-in fade-in duration-700">
                    <div className="relative pl-10 space-y-10">
                        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/50 via-purple-500/50 to-emerald-500/50 rounded-full opacity-20"></div>
                        {[
                            { label: 'Criação', date: formData.createdAt || formData.lifecycle?.created, icon: Plus, color: 'bg-blue-500' },
                            { label: 'Execução', date: formData.lifecycle?.doing, icon: Zap, color: 'bg-amber-500' },
                            { label: 'Revisão', date: formData.lifecycle?.review, icon: Eye, color: 'bg-purple-500' },
                            { label: 'Concluído', date: formData.lifecycle?.done, icon: Check, color: 'bg-emerald-500' }
                        ].map((evt, i) => (
                            <div key={i} className="relative flex items-center gap-6 group">
                                <div className={`z-10 w-10 h-10 rounded-xl ${evt.color} border-[4px] border-white dark:border-[#0A0A0C] flex items-center justify-center text-white shadow-lg shrink-0`}><evt.icon className="w-4 h-4 stroke-[3px]"/></div>
                                <div className="flex-1 p-5 glass-card rounded-2xl flex justify-between items-center gap-2">
                                    <div>
                                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-white">{evt.label}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono text-[9px] text-amber-500 font-black block">
                                            {evt.date ? new Date(evt.date).toLocaleDateString('pt-BR') : '--/--'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>

        <footer className="h-20 md:h-28 px-5 md:px-12 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex items-center justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Descartar</button>
            <button onClick={handleSync} className="flex-1 md:flex-none px-8 md:px-16 py-3.5 md:py-5 bg-amber-500 text-black rounded-xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest shinko-button shadow-glow-amber flex items-center justify-center gap-2 md:gap-3"><Save className="w-4 h-4"/> Sincronizar</button>
        </footer>
      </div>
    </div>
  );
};
