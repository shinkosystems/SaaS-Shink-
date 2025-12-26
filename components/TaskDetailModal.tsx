import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, Attachment, TaskStatus, Comment } from '../types';
import { 
    X, AlignLeft, CheckSquare, Trash2, Clock, 
    Save, Calendar, Users, Zap, 
    Plus, User as UserIcon, BrainCircuit, Loader2, Sparkles,
    Tag, Paperclip, MessageSquare, MoreHorizontal, Eye, Share2, 
    CheckCircle2, ChevronDown, ListTodo, History, FileText, Download, Send
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
}

const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'Backlog',
    doing: 'Em Execução',
    review: 'Revisão Técnica',
    approval: 'Aprovação',
    done: 'Concluído',
    backlog: 'Backlog'
};

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, organizationId }) => {
  const [formData, setFormData] = useState<BpmnTask>({ 
      ...task,
      subtasks: task.subtasks || [],
      gut: task.gut || { g: 1, u: 1, t: 1 },
      tags: task.tags || [],
      members: task.members || [],
      attachments: task.attachments || []
  });
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(setAvailableUsers);
    }
    if (task.dbId) {
        loadComments(task.dbId);
    }
  }, [organizationId, task.dbId]);

  const loadComments = async (taskId: number) => {
      const { data, error } = await supabase
          .from('comentarios')
          .select(`
            id,
            mensagem,
            created_at,
            user_data:users(id, nome, avatar_url)
          `)
          .eq('task', taskId)
          .order('created_at', { ascending: false });
      
      if (!error && data) {
          setComments(data);
      }
  };

  useEffect(() => {
    if (titleRef.current) {
        titleRef.current.style.height = 'auto';
        titleRef.current.style.height = (titleRef.current.scrollHeight) + 'px';
    }
  }, [formData.text]);

  const handleSync = async () => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !organizationId) return;

      setIsUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `attachments/${organizationId}/${crypto.randomUUID()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('documentos').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName);

          const newAttachment: Attachment = {
              id: crypto.randomUUID(),
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              url: urlData.publicUrl
          };

          setFormData(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), newAttachment]
          }));
      } catch (err: any) {
          alert(`Falha no upload: ${err.message}`);
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleAddComment = async () => {
      const trimmedComment = commentText.trim();
      if (!trimmedComment) return;
      
      const targetTaskId = task.dbId || formData.dbId;
      if (!targetTaskId) {
          alert("Atenção: Salve a tarefa antes de comentar.");
          return;
      }
      
      setIsSendingComment(true);
      try {
          const { data: authData } = await supabase.auth.getUser();
          if (!authData.user) throw new Error("Usuário não autenticado.");

          const { data: inserted, error } = await supabase.from('comentarios').insert({
              task: targetTaskId,
              usuario: authData.user.id,
              mensagem: trimmedComment,
              organizacao: organizationId
          }).select().single();

          if (error) throw error;

          const currentUser = availableUsers.find(u => u.id === authData.user.id) || { nome: 'Eu', avatar_url: null };

          if (inserted) {
              const newCommentView = {
                  ...inserted,
                  user_data: currentUser
              };
              setComments(prev => [newCommentView, ...prev]);
              setCommentText('');
          }
      } catch (e: any) {
          console.error("Erro ao enviar comentário:", e);
          const errorMsg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
          alert(`Erro ao registrar comentário: ${errorMsg}`);
      } finally {
          setIsSendingComment(false);
      }
  };

  const handleAddTag = () => {
      const tagInput = prompt("Digite o nome da nova tag:");
      if (tagInput && tagInput.trim()) {
          const newTag = tagInput.trim();
          const currentTags = formData.tags || [];
          if (!currentTags.includes(newTag)) {
              setFormData(prev => ({ ...prev, tags: [...currentTags, newTag] }));
          }
      }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      setFormData(prev => ({
          ...prev,
          tags: (prev.tags || []).filter(t => t !== tagToRemove)
      }));
  };

  const handleAddSubtask = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const textToAdd = newSubtask.trim();
      if (!textToAdd) return;
      const sub: BpmnSubTask = { id: crypto.randomUUID(), text: textToAdd, completed: false };
      setFormData(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), sub] }));
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
    if (!formData.text) return alert("Título da tarefa é necessário para a IA processar.");
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
    } catch (e) { console.error(e); } finally { setIsGeneratingChecklist(false); }
  };

  const progress = formData.subtasks?.length 
    ? Math.round((formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100) 
    : 0;

  const getAssigneeData = () => availableUsers.find(u => u.id === formData.assigneeId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl h-[92vh] bg-[#F8F9FA] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-slate-200">
        
        {/* Header Compacto */}
        <div className="px-8 py-5 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-amber-500/20">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{nodeTitle}</span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {task.dbId || formData.dbId || formData.displayId || '---'}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Coluna Esquerda: Conteúdo Principal */}
                    <div className="lg:col-span-8 space-y-14">
                        
                        {/* Seção de Título */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-4 text-slate-400 shrink-0"><ListTodo className="w-6 h-6" /></div>
                            <div className="flex-1">
                                <textarea 
                                    ref={titleRef} 
                                    value={formData.text} 
                                    rows={1}
                                    onChange={e => setFormData({...formData, text: e.target.value})}
                                    className="bg-white dark:bg-white/5 text-3xl font-black text-slate-900 outline-none w-full tracking-tighter leading-[1.2] resize-none focus:ring-8 focus:ring-amber-500/5 rounded-2xl p-4 transition-all border border-transparent focus:border-amber-500/20"
                                    placeholder="Defina o objetivo da tarefa..."
                                />
                                <div className="mt-2 flex items-center gap-2 px-4">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        em <span className="text-amber-600 underline cursor-pointer decoration-amber-500/30 hover:text-amber-500 transition-colors">{opportunityTitle || 'Projeto Ativo'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Seção de Descrição */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-1 text-slate-400 shrink-0"><AlignLeft className="w-6 h-6" /></div>
                            <div className="flex-1 space-y-5">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Descrição Técnica</h3>
                                    <button 
                                        onClick={() => setIsEditingDesc(!isEditingDesc)}
                                        className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
                                    >
                                        {isEditingDesc ? 'Cancelar' : 'Editar'}
                                    </button>
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
                                        <button onClick={() => setIsEditingDesc(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Salvar Descrição</button>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm min-h-[100px]">
                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                            {formData.description || <span className="italic text-slate-400 font-bold opacity-50">Nenhuma descrição técnica fornecida ainda.</span>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Seção de Checklist */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-1 text-slate-400 shrink-0"><CheckSquare className="w-6 h-6" /></div>
                            <div className="flex-1 space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Etapas de Execução</h3>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleAiGenerateChecklist}
                                            disabled={isGeneratingChecklist}
                                            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-purple-500 disabled:opacity-50"
                                        >
                                            {isGeneratingChecklist ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                                            IA Check
                                        </button>
                                        <button 
                                            onClick={() => setFormData(prev => ({...prev, subtasks: []}))}
                                            className="px-4 py-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all"
                                        >
                                            Limpar
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
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
                                        <div key={sub.id} className="flex items-center gap-4 group bg-white p-4 rounded-2xl border border-slate-100 hover:border-amber-500/20 transition-all shadow-sm">
                                            <button 
                                                onClick={() => toggleSubtask(sub.id)}
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 hover:border-amber-500'}`}
                                            >
                                                {sub.completed && <CheckCircle2 className="w-4 h-4 stroke-[3px]" />}
                                            </button>
                                            <span className={`text-sm flex-1 font-bold ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.text}</span>
                                            <button onClick={() => deleteSubtask(sub.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <form onSubmit={handleAddSubtask} className="relative group pt-2">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        <input 
                                            value={newSubtask}
                                            onChange={e => setNewSubtask(e.target.value)}
                                            placeholder="Adicionar novo marco técnico..."
                                            className="w-full bg-white border border-slate-200 hover:border-amber-500/20 focus:border-amber-500 p-4 pl-12 rounded-[1.5rem] text-sm font-bold text-slate-800 outline-none transition-all shadow-sm"
                                        />
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* Comentários e Histórico */}
                        <div className="flex gap-6 items-start">
                            <div className="mt-1 text-slate-400 shrink-0"><History className="w-6 h-6" /></div>
                            <div className="flex-1 space-y-8">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Linha do Tempo</h3>
                                
                                <div className="space-y-8">
                                    {/* Campo de Novo Comentário */}
                                    <div className="flex gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg border border-white/10 uppercase">
                                            EU
                                        </div>
                                        <div className="flex-1 relative group">
                                            <textarea 
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                                                placeholder="Escreva um comentário técnico ou atualização de status..."
                                                className="w-full p-5 pr-14 bg-white border border-slate-200 rounded-[1.8rem] text-sm font-medium outline-none focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/30 transition-all resize-none h-28 shadow-sm group-hover:border-amber-500/10"
                                            />
                                            <button 
                                                onClick={handleAddComment}
                                                disabled={isSendingComment || !commentText.trim()}
                                                className="absolute bottom-4 right-4 p-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 disabled:opacity-30 transition-all shadow-xl active:scale-90"
                                            >
                                                {isSendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de Comentários Reais */}
                                    <div className="space-y-6 pt-4">
                                        {comments.map((c) => (
                                            <div key={c.id} className="flex gap-5 animate-in slide-in-from-left-2 duration-500">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                                    {c.user_data?.avatar_url ? <img src={c.user_data.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black text-slate-500">{c.user_data?.nome?.charAt(0) || '?'}</span>}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black text-slate-900">{c.user_data?.nome || 'Usuário'}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                                                    </div>
                                                    <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-sm text-sm text-slate-700 leading-relaxed font-medium">
                                                        {c.mensagem}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Log de Sistema Automático */}
                                        <div className="flex gap-5 opacity-60">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black text-[10px] font-black shrink-0 shadow-lg border border-amber-400">OS</div>
                                            <div className="space-y-1.5 pt-1">
                                                <p className="text-sm text-slate-700">
                                                    <span className="font-black text-slate-900">Shinkō Engine</span> sincronizou este ativo para <span className="text-amber-600 font-black tracking-widest">{formData.status?.toUpperCase()}</span>
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                                    {formData.createdAt ? new Date(formData.createdAt).toLocaleString('pt-BR') : 'Log de Criação'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Sidebar de Ações Técnicas */}
                    <div className="lg:col-span-4 space-y-10 border-l border-slate-100 pl-4 lg:pl-10">
                        
                        {/* Responsável */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Responsável</label>
                            <div className="bg-white p-3 rounded-[1.8rem] border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-amber-500/20 transition-all overflow-hidden w-full flex-nowrap">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                                    {getAssigneeData()?.nome?.charAt(0) || <UserIcon className="w-5 h-5"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <select 
                                        value={formData.assigneeId || ""} 
                                        onChange={e => setFormData({...formData, assigneeId: e.target.value})}
                                        className="w-full bg-transparent text-xs font-black text-slate-800 uppercase tracking-widest outline-none cursor-pointer truncate pr-4"
                                    >
                                        <option value="">Ninguém atribuído</option>
                                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Prazos */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Janela de Entrega</label>
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600"><Calendar className="w-5 h-5" /></div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Deadline Final</span>
                                        <input 
                                            type="date"
                                            value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                                            onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                            className="w-full bg-transparent text-[11px] font-black text-slate-800 uppercase tracking-widest outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100"></div>
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"><Clock className="w-5 h-5" /></div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Esforço Estimado (Horas)</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={formData.estimatedHours || 0}
                                                onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})}
                                                className="w-16 bg-transparent text-sm font-black text-slate-800 outline-none"
                                            />
                                            <span className="text-[10px] font-black text-slate-400 uppercase">H/Técnica</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Estágio (Governança) */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Estágio Atual</label>
                            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                                <select 
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                                    className="w-full bg-transparent p-3 text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] outline-none cursor-pointer"
                                >
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Etiquetas */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Atributos (Tags)</label>
                            <div className="flex flex-wrap gap-2.5">
                                {(formData.tags || []).map(t => (
                                    <div key={t} className="group relative">
                                        <span className="px-4 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2">
                                            {t}
                                            <button onClick={() => handleRemoveTag(t)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-all">
                                                <X className="w-3 h-3"/>
                                            </button>
                                        </span>
                                    </div>
                                ))}
                                <button 
                                    onClick={handleAddTag}
                                    className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-amber-500 hover:text-black transition-all border border-slate-200"
                                >
                                    <Plus className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>

                        {/* Anexos Rápidos */}
                        {formData.attachments && formData.attachments.length > 0 && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Documentos ({formData.attachments.length})</label>
                                <div className="space-y-2">
                                    {formData.attachments.slice(0, 3).map(att => (
                                        <div key={att.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3 group">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-600 truncate flex-1">{att.name}</span>
                                        </div>
                                    ))}
                                    {formData.attachments.length > 3 && <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">+{formData.attachments.length - 3} outros arquivos</p>}
                                </div>
                            </div>
                        )}

                        {/* Ações Críticas */}
                        <div className="space-y-3 pt-6 border-t border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Perigo</label>
                            <button 
                                onClick={() => onDelete && onDelete(formData.id)}
                                className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-500 hover:text-white rounded-[1.5rem] border border-red-100 transition-all group"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Arquivar Tarefa</span>
                                <Trash2 className="w-4 h-4 text-red-300 group-hover:text-white transition-colors"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Master Sync */}
        <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
            <div className="flex gap-6">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-3 px-6 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4 text-amber-500" />}
                    Anexar Ativo
                </button>
            </div>
            <div className="flex gap-6 items-center">
                <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] transition-colors active:scale-95">Descartar</button>
                <button 
                    onClick={handleSync} 
                    disabled={isSaving}
                    className="flex items-center gap-4 px-12 py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-xl hover:shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Sincronizar Ativo
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};