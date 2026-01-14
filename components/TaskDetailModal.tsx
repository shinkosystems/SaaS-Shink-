
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, Attachment, TaskStatus, Comment } from '../types';
import { 
    X, AlignLeft, CheckSquare, Trash2, Clock, 
    Save, Calendar, Users, Zap, 
    Plus, User as UserIcon, BrainCircuit, Loader2, Sparkles,
    Tag, Paperclip, MessageSquare, MoreHorizontal, Eye, Share2, 
    CheckCircle2, ChevronDown, ListTodo, History, FileText, Download, Send, Lock,
    Image as ImageIcon, Film, File as FileIcon, ExternalLink, Smile
} from 'lucide-react';
import { fetchOrgMembers } from '../services/projectService';
import { fetchComments, addComment, deleteComment } from '../services/commentService';
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

const SHINKO_CATEGORIES = [
    "Adm", "Financeiro", "Gestão", "Tecnológico", "RH", 
    "Modelagem", "Interface", "Lógica", "Marketing", "Suporte"
];

const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'Backlog',
    doing: 'Em Execução',
    review: 'Revisão Técnica',
    approval: 'Aprovação',
    done: 'Concluído',
    backlog: 'Backlog'
};

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, organizationId, readOnly }) => {
  const [formData, setFormData] = useState<BpmnTask>(() => ({
      ...task,
      category: task.category || (task as any).tags?.[0] || 'Gestão',
      assigneeId: task.assigneeId || (task as any).responsavel || "",
      subtasks: task.subtasks || [],
      gut: task.gut || { g: 1, u: 1, t: 1 },
      tags: task.tags || [],
      members: task.members || [],
      attachments: task.attachments || []
  }));
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(setAvailableUsers);
    }
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    
    if (task.dbId) {
        loadComments();
    }
  }, [task.dbId, organizationId]);

  const loadComments = async () => {
    if (!task.dbId) return;
    setIsLoadingComments(true);
    const data = await fetchComments(task.dbId);
    setComments(data);
    setIsLoadingComments(false);
  };

  useEffect(() => {
    if (titleRef.current) {
        titleRef.current.style.height = 'auto';
        titleRef.current.style.height = (titleRef.current.scrollHeight) + 'px';
    }
  }, [formData.text]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || !task.dbId || !currentUser || isAddingComment) return;

    setIsAddingComment(true);
    const comment = await addComment(task.dbId, currentUser.id, newComment);
    if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
        setTimeout(scrollToBottom, 100);
    }
    setIsAddingComment(false);
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Excluir este comentário?")) return;
    const ok = await deleteComment(id);
    if (ok) setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || readOnly) return;

      setIsUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `tasks/${formData.dbId || 'temp'}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from('documentos')
              .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
              .from('documentos')
              .getPublicUrl(fileName);

          const newAttachment: Attachment = {
              id: crypto.randomUUID(),
              name: file.name,
              size: (file.size / 1024).toFixed(1) + ' KB',
              type: file.type,
              url: urlData.publicUrl,
              uploadedAt: new Date().toISOString()
          };

          setFormData(prev => ({
              ...prev,
              attachments: [newAttachment, ...(prev.attachments || [])]
          }));
      } catch (err: any) {
          alert("Erro no upload: " + err.message);
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const removeAttachment = (id: string) => {
      if (readOnly) return;
      setFormData(prev => ({
          ...prev,
          attachments: prev.attachments?.filter(a => a.id !== id)
      }));
  };

  const handleSync = async () => {
      if (readOnly) return;
      setIsSaving(true);
      try {
          const finalData = { ...formData, tags: [formData.category || 'Gestão'] };
          await onSave(finalData);
          onClose();
      } catch (e) {
          alert("Erro ao sincronizar dados.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDiscard = () => {
    if (readOnly) {
        onClose();
        return;
    }
    if (onDelete && (formData.dbId || formData.id)) {
        if (confirm("Deseja realmente excluir permanentemente esta tarefa?")) {
            onDelete(formData.id);
        }
    } else {
        onClose();
    }
  };

  const handleSaveDescriptionOnly = async () => {
      if (readOnly) return;
      setIsEditingDesc(false);
      setIsSaving(true);
      try {
          const finalData = { ...formData, tags: [formData.category || 'Gestão'] };
          await onSave(finalData);
      } catch (e) {
          alert("Erro ao salvar descrição.");
      } finally {
          setIsSaving(false);
      }
  };

  const progress = formData.subtasks?.length 
    ? Math.round((formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100) 
    : 0;

  const currentAssignee = availableUsers.find(u => u.id === formData.assigneeId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-6xl h-[92vh] bg-[#F8F9FA] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-slate-200">
        
        <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-amber-500/20">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{nodeTitle}</span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {formData.dbId || formData.displayId || '---'}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-90">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
                <div className="space-y-12">
                    {/* Título */}
                    <div className="flex gap-6 items-start">
                        <div className="mt-4 text-slate-300 shrink-0"><ListTodo className="w-7 h-7" /></div>
                        <div className="flex-1">
                            <textarea 
                                ref={titleRef} 
                                value={formData.text} 
                                rows={1}
                                readOnly={readOnly}
                                onChange={e => setFormData({...formData, text: e.target.value})}
                                className={`bg-transparent text-3xl md:text-4xl font-black text-slate-900 outline-none w-full tracking-tighter leading-[1.1] resize-none rounded-2xl p-4 transition-all border border-transparent ${readOnly ? 'cursor-default' : 'focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500/10'}`}
                                placeholder="Defina o objetivo da tarefa..."
                            />
                            <div className="mt-2 flex items-center gap-2 px-4">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    em <span className="text-amber-600 underline cursor-pointer decoration-amber-500/30 hover:text-amber-500 transition-colors">{opportunityTitle || 'PROJETO ATIVO'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
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
                                        placeholder="Detalhe o escopo..."
                                    />
                                    <button onClick={handleSaveDescriptionOnly} className="px-8 py-3 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">SALVAR DESCRIÇÃO</button>
                                </div>
                            ) : (
                                <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[120px]">
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                        {formData.description || <span className="italic text-slate-400 font-bold opacity-50">Sem descrição.</span>}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comentários - NOVA SEÇÃO */}
                    <div className="flex gap-6 items-start">
                        <div className="mt-1 text-slate-300 shrink-0"><MessageSquare className="w-7 h-7" /></div>
                        <div className="flex-1 space-y-6">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Comunicação Industrial</h3>
                            
                            <div className="space-y-6">
                                {isLoadingComments ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300"/></div>
                                ) : comments.length === 0 ? (
                                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma interação registrada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-4 group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {comment.user_data?.avatar_url ? <img src={comment.user_data.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-slate-400"/>}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm group-hover:border-amber-500/20 transition-all">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{comment.user_data?.nome || 'Membro'}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                                                                {currentUser?.id === comment.user_id && (
                                                                    <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.text}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={commentsEndRef} />
                                    </div>
                                )}

                                <form onSubmit={handleAddComment} className="relative group">
                                    <div className="w-full bg-white border border-slate-200 rounded-[2rem] p-2 flex items-center shadow-soft focus-within:ring-4 focus-within:ring-amber-500/5 focus-within:border-amber-500/20 transition-all">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center ml-2 shrink-0">
                                            {currentUser?.user_metadata?.avatar_url ? <img src={currentUser.user_metadata.avatar_url} className="w-full h-full rounded-full" /> : <UserIcon className="w-5 h-5 text-slate-300"/>}
                                        </div>
                                        <input 
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Adicionar comentário técnico..."
                                            className="flex-1 bg-transparent px-4 text-sm font-medium outline-none text-slate-800"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!newComment.trim() || isAddingComment}
                                            className="p-3 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all shadow-lg active:scale-95 disabled:opacity-30 mr-1"
                                        >
                                            {isAddingComment ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Ativos */}
                    <div className="flex gap-6 items-start">
                        <div className="mt-1 text-slate-300 shrink-0"><Paperclip className="w-7 h-7" /></div>
                        <div className="flex-1 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Ativos Vinculados</h3>
                                {isUploading && <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> SUBINDO...</div>}
                            </div>
                            
                            {formData.attachments && formData.attachments.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {formData.attachments.map(att => (
                                        <div key={att.id} className="group relative bg-white border border-slate-100 rounded-2xl p-3 flex flex-col gap-2 shadow-sm hover:border-amber-500/30 transition-all">
                                            <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
                                                {att.type.startsWith('image/') ? (
                                                    <img src={att.url} className="w-full h-full object-cover" />
                                                ) : att.type.startsWith('video/') ? (
                                                    <Film className="w-8 h-8 text-slate-300" />
                                                ) : (
                                                    <FileIcon className="w-8 h-8 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-bold text-slate-800 truncate" title={att.name}>{att.name}</p>
                                                <p className="text-[8px] text-slate-400 font-medium uppercase">{att.size}</p>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <a href={att.url} target="_blank" className="flex-1 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors">
                                                    <ExternalLink className="w-3 h-3 text-slate-400"/>
                                                </a>
                                                {!readOnly && (
                                                    <button onClick={() => removeAttachment(att.id)} className="flex-1 p-1.5 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center transition-colors">
                                                        <Trash2 className="w-3 h-3"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum ativo anexado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <aside className="w-full lg:w-[400px] border-l border-slate-100 bg-white p-8 lg:p-10 space-y-10 overflow-y-auto custom-scrollbar shrink-0">
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">CATEGORIA SHINKŌ</label>
                    <div className="bg-slate-50 p-2 rounded-[2rem] border border-slate-100 shadow-inner relative group overflow-hidden">
                        <select 
                            disabled={readOnly}
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                            className="w-full bg-transparent p-5 text-xs font-black text-slate-900 uppercase tracking-[0.3em] outline-none cursor-pointer appearance-none"
                        >
                            {SHINKO_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">RESPONSÁVEL</label>
                    <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 shadow-inner flex items-center gap-5 group transition-all relative overflow-hidden h-24">
                        <div className="w-14 h-14 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                            {currentAssignee?.avatar_url ? <img src={currentAssignee.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-7 h-7 text-slate-300"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-slate-800 uppercase tracking-widest truncate">{currentAssignee?.nome || "SEM ATRIBUIÇÃO"}</div>
                            {!readOnly && (
                                <select value={formData.assigneeId || ""} onChange={e => setFormData({...formData, assigneeId: e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20">
                                    <option value="">SELECIONAR...</option>
                                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.nome.toUpperCase()}</option>)}
                                </select>
                            )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    </div>
                </div>

                <div className="space-y-6">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">JANELA DE ENTREGA</label>
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner flex items-center gap-6 group hover:border-amber-500/20 transition-all">
                            <div className="p-4 rounded-2xl bg-white text-amber-500 shadow-sm"><Calendar className="w-7 h-7" /></div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">DEADLINE</span>
                                <input type="date" readOnly={readOnly} value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-transparent text-sm font-black text-slate-800 uppercase tracking-tight outline-none" />
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner flex items-center gap-6 group hover:border-blue-500/20 transition-all">
                            <div className="p-4 rounded-2xl bg-white text-blue-500 shadow-sm"><Clock className="w-7 h-7" /></div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">ESFORÇO (HORAS)</span>
                                <input type="number" readOnly={readOnly} value={formData.estimatedHours || 2} onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-slate-900 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <div className="flex justify-between items-center mb-8">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Matriz GUT</label>
                        {formData.gut && (
                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border ${formData.gut.g * formData.gut.u * formData.gut.t >= 60 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                SCORE {formData.gut.g * formData.gut.u * formData.gut.t}
                            </span>
                        )}
                    </div>
                    <div className="space-y-8">
                        {[
                            { key: 'g', label: 'Gravidade' },
                            { key: 'u', label: 'Urgência' },
                            { key: 't', label: 'Tendência' }
                        ].map(item => (
                            <div key={item.key} className="space-y-4">
                                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                    <span>{item.label}</span>
                                    <span className="text-slate-900">{formData.gut?.[item.key as keyof typeof formData.gut] || 1}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    disabled={readOnly}
                                    value={formData.gut?.[item.key as keyof typeof formData.gut] || 1}
                                    onChange={e => setFormData({...formData, gut: { ...formData.gut!, [item.key]: parseInt(e.target.value) }})}
                                    className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {!readOnly && (
                    <button onClick={() => onDelete && onDelete(formData.id)} className="w-full flex items-center justify-between p-6 bg-red-50 hover:bg-red-500 hover:text-white rounded-[2rem] border border-red-100 transition-all group shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest">ARQUIVAR TAREFA</span>
                        <Trash2 className="w-4 h-4 text-red-300 group-hover:text-white transition-colors"/>
                    </button>
                )}
            </aside>
        </div>

        <div className="px-10 py-10 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center shrink-0">
            <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading || readOnly}
                className="w-full md:w-auto flex items-center gap-3 px-10 py-6 bg-[#F8F9FA] hover:bg-slate-100 rounded-[1.8rem] text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border border-slate-200 shadow-sm disabled:opacity-50"
            >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Paperclip className="w-4 h-4 text-amber-500" />} ANEXAR ATIVO
            </button>
            <div className="flex gap-10 items-center w-full md:w-auto justify-end">
                <button onClick={onClose} className="px-4 py-2 text-[11px] font-black text-slate-400 hover:text-red-500 uppercase tracking-[0.3em] transition-colors">{readOnly ? 'FECHAR' : 'DESCARTAR'}</button>
                {!readOnly && (
                    <button onClick={handleSync} disabled={isSaving || isUploading} className="flex-1 md:flex-none flex items-center gap-5 px-16 py-6 bg-[#F59E0B] hover:bg-amber-400 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/30 transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} SINCRONIZAR ATIVO
                    </button>
                )}
            </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple={false} />
      </div>
    </div>
  );
};
