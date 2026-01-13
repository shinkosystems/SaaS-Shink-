
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, Attachment, TaskStatus, Comment } from '../types';
import { 
    X, AlignLeft, CheckSquare, Trash2, Clock, 
    Save, Calendar, Users, Zap, 
    Plus, User as UserIcon, BrainCircuit, Loader2, Sparkles,
    Tag, Paperclip, MessageSquare, MoreHorizontal, Eye, Share2, 
    CheckCircle2, ChevronDown, ListTodo, History, FileText, Download, Send, Lock
} from 'lucide-react';
import { fetchOrgMembers } from '../services/projectService';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => Promise<void> | void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  organizationId?: number;
  readOnly?: boolean;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'Backlog',
    doing: 'Em Execução',
    review: 'Revisão Técnica',
    approval: 'Aprovação',
    done: 'Concluído',
    backlog: 'Backlog'
};

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, organizationId, readOnly }) => {
  // Garantir que o assigneeId seja populado corretamente vindo do objeto de tarefa
  const [formData, setFormData] = useState<BpmnTask>(() => ({
      ...task,
      assigneeId: task.assigneeId || (task as any).responsavel || "",
      subtasks: task.subtasks || [],
      gut: task.gut || { g: 1, u: 1, t: 1 },
      tags: task.tags || [],
      members: task.members || [],
      attachments: task.attachments || []
  }));
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(users => {
            setAvailableUsers(users);
        });
    }
  }, [organizationId]);

  useEffect(() => {
    if (titleRef.current) {
        titleRef.current.style.height = 'auto';
        titleRef.current.style.height = (titleRef.current.scrollHeight) + 'px';
    }
  }, [formData.text]);

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

  const handleSaveDescriptionOnly = async () => {
      if (readOnly) return;
      setIsEditingDesc(false);
      setIsSaving(true);
      try {
          await onSave(formData);
      } catch (e) {
          alert("Erro ao salvar descrição.");
      } finally {
          setIsSaving(false);
      }
  };

  const toggleSubtask = (id: string) => {
      if (readOnly) return;
      setFormData(prev => ({
          ...prev,
          subtasks: prev.subtasks?.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
      }));
  };

  const deleteSubtask = (id: string) => {
      if (readOnly) return;
      setFormData(prev => ({
          ...prev,
          subtasks: prev.subtasks?.filter(s => s.id !== id)
      }));
  };

  const progress = formData.subtasks?.length 
    ? Math.round((formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100) 
    : 0;

  const currentAssignee = availableUsers.find(u => u.id === formData.assigneeId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl h-[92vh] bg-[#F8F9FA] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-slate-200">
        
        {/* Header Compacto conforme screenshot */}
        <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-amber-500/20">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{nodeTitle}</span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {task.dbId || formData.dbId || formData.displayId || '585'}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Coluna Esquerda: Conteúdo Principal */}
                    <div className="lg:col-span-7 space-y-12">
                        
                        {/* Seção de Título */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-4 text-slate-300 shrink-0"><ListTodo className="w-7 h-7" /></div>
                            <div className="flex-1">
                                <textarea 
                                    ref={titleRef} 
                                    value={formData.text} 
                                    rows={1}
                                    readOnly={readOnly}
                                    onChange={e => setFormData({...formData, text: e.target.value})}
                                    className={`bg-white text-3xl md:text-4xl font-black text-slate-900 outline-none w-full tracking-tighter leading-[1.1] resize-none rounded-2xl p-4 transition-all border border-transparent ${readOnly ? 'cursor-default' : 'focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/10'}`}
                                    placeholder="Defina o objetivo da tarefa..."
                                />
                                <div className="mt-2 flex items-center gap-2 px-4">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        em <span className="text-amber-600 underline cursor-pointer decoration-amber-500/30 hover:text-amber-500 transition-colors">{opportunityTitle || 'PROJETO ATIVO'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Seção de Descrição */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-1 text-slate-300 shrink-0"><AlignLeft className="w-7 h-7" /></div>
                            <div className="flex-1 space-y-5">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Descrição Técnica</h3>
                                    {!readOnly && (
                                        <button 
                                            onClick={() => setIsEditingDesc(!isEditingDesc)}
                                            className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
                                        >
                                            {isEditingDesc ? 'CANCELAR' : 'EDITAR'}
                                        </button>
                                    )}
                                </div>
                                {isEditingDesc ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <textarea 
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                            className="w-full h-48 p-6 bg-white border-2 border-amber-500/10 rounded-[2rem] text-sm text-slate-800 outline-none shadow-inner leading-relaxed focus:border-amber-500/30 transition-all"
                                            autoFocus
                                            placeholder="Detalhe o escopo, requisitos e critérios de aceitação..."
                                        />
                                        <button 
                                            onClick={handleSaveDescriptionOnly} 
                                            disabled={isSaving}
                                            className="px-8 py-3 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2"
                                        >
                                            {isSaving && <Loader2 className="w-3 h-3 animate-spin"/>}
                                            SALVAR DESCRIÇÃO
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[120px]">
                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                            {formData.description || <span className="italic text-slate-400 font-bold opacity-50">Nenhuma descrição técnica fornecida ainda.</span>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Seção de Checklist */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-1 text-slate-300 shrink-0"><CheckSquare className="w-7 h-7" /></div>
                            <div className="flex-1 space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Etapas de Execução</h3>
                                    {!readOnly && (
                                        <button 
                                            disabled={isGeneratingChecklist}
                                            className="flex items-center gap-3 px-5 py-2.5 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-purple-500 disabled:opacity-50"
                                        >
                                            {isGeneratingChecklist ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3.5 h-3.5" />}
                                            IA Check
                                        </button>
                                    )}
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Progresso Operacional</span>
                                        <span className="text-sm font-black text-amber-600">{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 shadow-glow-amber" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {formData.subtasks?.map(sub => (
                                        <div key={sub.id} className="flex items-center gap-4 group bg-white p-5 rounded-[1.8rem] border border-slate-50 hover:border-amber-500/20 transition-all shadow-sm">
                                            <button 
                                                onClick={() => toggleSubtask(sub.id)}
                                                disabled={readOnly}
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 hover:border-amber-500'} ${readOnly ? 'cursor-default' : ''}`}
                                            >
                                                {sub.completed && <CheckCircle2 className="w-4 h-4 stroke-[3px]" />}
                                            </button>
                                            <span className={`text-sm flex-1 font-bold ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.text}</span>
                                            {!readOnly && (
                                                <button onClick={() => deleteSubtask(sub.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Sidebar Fixada e Organizada */}
                    <div className="lg:col-span-5 space-y-10 border-l border-slate-100 pl-4 lg:pl-12">
                        
                        {/* Responsável - Layout circular + nome garantido */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">RESPONSÁVEL</label>
                            <div className={`bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 group transition-all relative overflow-hidden h-24 ${readOnly ? '' : 'hover:border-amber-500/30'}`}>
                                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {currentAssignee?.avatar_url ? (
                                        <img src={currentAssignee.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                            <UserIcon className="w-7 h-7 text-slate-300"/>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-slate-800 uppercase tracking-widest truncate">
                                        {currentAssignee?.nome || "NINGUÉM ATRIBUÍDO"}
                                    </div>
                                    {!readOnly && (
                                        <select 
                                            value={formData.assigneeId || ""} 
                                            onChange={e => setFormData({...formData, assigneeId: e.target.value})}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                                        >
                                            <option value="">SELECIONAR RESPONSÁVEL</option>
                                            {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome.toUpperCase()}</option>)}
                                        </select>
                                    )}
                                </div>
                                {!readOnly && <ChevronDown className="w-4 h-4 text-slate-400 mr-2 shrink-0" />}
                            </div>
                        </div>

                        {/* Janela de Entrega - Stack Vertical Rígido */}
                        <div className="space-y-6">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">JANELA DE ENTREGA</label>
                            <div className="flex flex-col gap-4">
                                {/* DEADLINE CARD */}
                                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-amber-500/20 transition-all">
                                    <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/5 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                                        <Calendar className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">DEADLINE FINAL</span>
                                        <input 
                                            type="date"
                                            readOnly={readOnly}
                                            value={formData.dueDate ? formData.dueDate.split('T')[0] : '2026-01-13'}
                                            onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                            className="w-full bg-transparent text-sm font-black text-slate-800 uppercase tracking-tight outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* ESFORÇO CARD */}
                                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-blue-500/20 transition-all">
                                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/5 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                                        <Clock className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">ESFORÇO ESTIMADO (HORAS)</span>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number" 
                                                readOnly={readOnly}
                                                value={formData.estimatedHours || 2}
                                                onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})}
                                                className="w-16 bg-transparent text-2xl font-black text-slate-900 outline-none"
                                            />
                                            <div className="h-4 w-px bg-slate-200"></div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">H/TÉCNICA</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Estágio Atual conforme screenshot */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">ESTÁGIO ATUAL</label>
                            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm relative group overflow-hidden">
                                <select 
                                    disabled={readOnly}
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                                    className={`w-full bg-transparent p-5 text-xs font-black text-slate-900 uppercase tracking-[0.3em] outline-none cursor-pointer appearance-none ${readOnly ? '' : 'group-hover:text-amber-600 transition-colors'}`}
                                >
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label.toUpperCase()}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {!readOnly && (
                            <button 
                                onClick={() => onDelete && onDelete(formData.id)}
                                className="w-full flex items-center justify-between p-6 bg-red-50 hover:bg-red-500 hover:text-white rounded-[2rem] border border-red-100 transition-all group mt-6"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">ARQUIVAR TAREFA</span>
                                <Trash2 className="w-4 h-4 text-red-300 group-hover:text-white transition-colors"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Master Sync */}
        <div className="px-10 py-10 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center shrink-0">
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full md:w-auto flex items-center gap-3 px-10 py-6 bg-[#F8F9FA] hover:bg-slate-100 rounded-[1.8rem] text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4 text-amber-500" />}
                ANEXAR ATIVO
            </button>

            <div className="flex gap-10 items-center w-full md:w-auto justify-end">
                <button onClick={onClose} className="px-4 py-2 text-[11px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] transition-colors active:scale-95">
                    {readOnly ? 'FECHAR' : 'DESCARTAR'}
                </button>
                {!readOnly && (
                    <button 
                        onClick={handleSync} 
                        disabled={isSaving}
                        className="flex-1 md:flex-none flex items-center gap-5 px-16 py-6 bg-[#F59E0B] hover:bg-amber-400 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        SINCRONIZAR ATIVO
                    </button>
                )}
            </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" onChange={() => {}} />
      </div>
    </div>
  );
};
