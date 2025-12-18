
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask } from '../types';
import { 
    X, AlignLeft, CheckSquare, BarChart3, Trash2, Clock, 
    CreditCard, Save, Calendar, Users, Tag, Zap, 
    ChevronRight, Plus, Info, Check, User as UserIcon, Eye, Timer, BrainCircuit, Loader2, Sparkles
} from 'lucide-react';
import { fetchOrgMembers } from '../services/projectService';
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
        } else {
            alert("A IA não retornou sugestões para esta tarefa.");
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 dark:bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-[#0A0A0C] rounded-[3.5rem] shadow-glass border border-slate-200 dark:border-white/10 flex overflow-hidden animate-ios-pop">
        
        {/* Sidebar */}
        <aside className="w-72 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex flex-col shrink-0">
            <div className="p-10 space-y-10">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[1.8rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 border border-amber-500/20 shadow-glow-amber">
                        <CreditCard className="w-10 h-10"/>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Task Control</h3>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${((formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1)) >= 60 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                            GUT: {(formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1)}
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    {[
                        { id: 'info', label: 'Propriedades', icon: AlignLeft }, 
                        { id: 'checklist', label: 'Checklist', icon: CheckSquare }, 
                        { id: 'activity', label: 'Histórico', icon: BarChart3 }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-glow-amber scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5'}`}>
                            <tab.icon className="w-5 h-5"/> {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-auto p-10">
                <button onClick={() => onDelete?.(task.id)} className="w-full py-4 flex items-center justify-center gap-3 text-red-500 hover:bg-red-500/10 rounded-[1.2rem] text-[10px] font-black uppercase transition-all"><Trash2 className="w-4 h-4"/> Excluir</button>
            </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white/50 dark:bg-black/40">
            <header className="min-h-[140px] px-12 py-8 flex items-start justify-between border-b border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <div className="flex-1 min-w-0 pr-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/80">{opportunityTitle}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700"/>
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{nodeTitle}</span>
                    </div>
                    <textarea 
                        ref={titleRef} value={formData.text} rows={1}
                        onChange={e => setFormData({...formData, text: e.target.value})}
                        className="bg-transparent text-4xl font-black text-slate-900 dark:text-white outline-none w-full tracking-tighter leading-[1.1] resize-none overflow-hidden"
                    />
                </div>
                <button onClick={onClose} className="p-4 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-[1.2rem] transition-all shrink-0"><X className="w-6 h-6"/></button>
            </header>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'info' && (
                    <div className="space-y-16 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block ml-1">Responsável</label>
                                <div className="relative group cursor-pointer h-[60px]">
                                    <select 
                                        value={formData.assigneeId || ''}
                                        onChange={e => setFormData({...formData, assigneeId: e.target.value, assignee: availableUsers.find(u => u.id === e.target.value)?.nome})}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    >
                                        <option value="">Ninguém</option>
                                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                    </select>
                                    <div className="flex items-center h-full gap-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-4 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-all shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                            {getAssigneeData()?.avatar_url ? <img src={getAssigneeData().avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-5 h-5 text-slate-400"/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-slate-900 dark:text-white truncate">{getAssigneeData()?.nome || 'Atribuir...'}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{getAssigneeData()?.area || 'Clique para escolher'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block ml-1">Membros</label>
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] h-[60px] items-center shadow-sm">
                                    {availableUsers.map(user => (
                                        <button key={user.id} onClick={() => toggleMember(user.id)} className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${formData.members?.includes(user.id) ? 'border-amber-500 scale-110 shadow-glow-amber' : 'border-transparent opacity-30 hover:opacity-100'}`}>
                                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-white">{user.nome.charAt(0)}</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block ml-1">Prazo</label>
                                <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-4 h-[60px] shadow-sm">
                                    <Calendar className="w-5 h-5 text-amber-500 mr-4"/>
                                    <input type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="bg-transparent text-sm font-black text-slate-900 dark:text-white outline-none flex-1 uppercase tracking-widest"/>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block ml-1">Descrição & Requisitos</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-10 text-lg text-slate-700 dark:text-slate-400 outline-none h-60 focus:border-amber-500/30 shadow-inner resize-none leading-relaxed" placeholder="Documentação técnica do ativo..."/>
                        </div>
                    </div>
                )}

                {activeTab === 'checklist' && (
                    <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl mx-auto">
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4 p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-sm">
                                <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} placeholder="Adicionar nova entrega..." className="flex-1 bg-transparent px-8 py-4 text-slate-900 dark:text-white outline-none text-lg font-medium"/>
                                <button onClick={handleAddSubtask} className="w-16 h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.5rem] flex items-center justify-center hover:bg-amber-500 transition-all"><Plus className="w-8 h-8"/></button>
                            </div>
                            <button 
                                onClick={handleAiGenerateChecklist}
                                disabled={isGeneratingChecklist}
                                className="flex items-center justify-center gap-3 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                {isGeneratingChecklist ? <Loader2 className="w-5 h-5 animate-spin"/> : <BrainCircuit className="w-5 h-5"/>}
                                {isGeneratingChecklist ? 'IA Decompondo Ativo...' : 'Gerar Checklist via IA'}
                            </button>
                        </div>
                        
                        <div className="space-y-3 pt-6">
                            {formData.subtasks?.map(sub => (
                                <div key={sub.id} className="group flex items-center gap-6 p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-[2rem] hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm">
                                    <button onClick={() => setFormData({...formData, subtasks: formData.subtasks?.map(s => s.id === sub.id ? {...s, completed: !s.completed} : s)})} className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700 text-transparent'}`}><Check className="w-6 h-6 stroke-[4px]"/></button>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-xl font-bold block truncate ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{sub.text}</span>
                                        {sub.assignee && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Ref: {sub.assignee}</span>}
                                    </div>
                                    <button onClick={() => setFormData({...formData, subtasks: formData.subtasks?.filter(s => s.id !== sub.id)})} className="opacity-0 group-hover:opacity-100 p-3 text-red-500/40 hover:text-red-500 transition-all"><Trash2 className="w-6 h-6"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="max-w-4xl mx-auto py-10 animate-in fade-in duration-700">
                        <div className="relative pl-16 space-y-16">
                            <div className="absolute left-[31px] top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/50 via-purple-500/50 to-emerald-500/50 rounded-full opacity-20"></div>
                            {[
                                { label: 'Criação da Tarefa', date: formData.createdAt || formData.lifecycle?.created, icon: Plus, color: 'bg-blue-500' },
                                { label: 'Início da Execução', date: formData.lifecycle?.doing, icon: Zap, color: 'bg-amber-500' },
                                { label: 'Aguardando Revisão', date: formData.lifecycle?.review, icon: Eye, color: 'bg-purple-500' },
                                { label: 'Entrega Concluída', date: formData.lifecycle?.done, icon: Check, color: 'bg-emerald-500' }
                            ].map((evt, i) => (
                                <div key={i} className="relative flex items-center gap-12 group">
                                    <div className={`z-10 w-16 h-16 rounded-[1.5rem] ${evt.color} border-[6px] border-white dark:border-[#0A0A0C] flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110`}><evt.icon className="w-8 h-8 stroke-[3px]"/></div>
                                    <div className="flex-1 p-8 glass-card rounded-[2.5rem] flex justify-between items-center group-hover:border-amber-500/30">
                                        <div>
                                            <span className="font-black text-sm uppercase tracking-[0.2em] text-slate-900 dark:text-white">{evt.label}</span>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Snapshot de sistema</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono text-xs text-amber-600 dark:text-amber-500 font-black block">
                                                {evt.date ? new Date(evt.date).toLocaleDateString('pt-BR') : 'Pendente'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {evt.date ? new Date(evt.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <footer className="h-32 px-12 border-t border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-black/60 backdrop-blur-xl flex items-center justify-end gap-6 shrink-0">
                <button onClick={onClose} className="px-10 py-5 text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
                <button onClick={handleSync} className="px-16 py-6 bg-amber-500 text-black rounded-[2.2rem] font-black text-[13px] uppercase tracking-[0.25em] shinko-button shadow-glow-amber flex items-center gap-4"><Save className="w-6 h-6"/> Sincronizar Mudanças</button>
            </footer>
        </main>
      </div>
    </div>
  );
};
