
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, Attachment, Comment } from '../types';
import { 
    X, AlignLeft, Trash2, Clock, 
    Save, Calendar, User as UserIcon, Loader2,
    Paperclip, MessageSquare, Send, ListTodo, FileText, Download, ExternalLink, Film, File as FileIcon, ChevronDown
} from 'lucide-react';
import { fetchOrgMembers } from '../services/projectService';
import { fetchComments, addComment, deleteComment } from '../services/commentService';
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

  // Calcula o ID real do banco (dbId ou id se for numérico)
  const effectiveDbId = formData.dbId || (typeof formData.id === 'string' && !isNaN(Number(formData.id)) ? Number(formData.id) : undefined);

  useEffect(() => {
    if (task.dbId && !formData.dbId) {
        setFormData(prev => ({ ...prev, dbId: task.dbId }));
    }
  }, [task.dbId]);

  useEffect(() => {
    if (organizationId) {
        fetchOrgMembers(organizationId).then(setAvailableUsers);
    }
    
    const loadUserAndComments = async () => {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
            setCurrentUser(data.user);
        }
        
        if (effectiveDbId) {
            loadComments(Number(effectiveDbId));
        }
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
    
    const textToSend = newComment.trim();
    if (!textToSend || isAddingComment) return;

    if (!effectiveDbId) {
        alert("Sincronize esta tarefa (botão laranja 'SINCRONIZAR ATIVO') antes de comentar para criar o registro no banco de dados.");
        return;
    }

    setIsAddingComment(true);
    try {
        let user = currentUser;
        if (!user) {
            const { data } = await supabase.auth.getUser();
            user = data.user;
            setCurrentUser(user);
        }

        if (!user) throw new Error("Usuário não identificado.");

        const comment = await addComment(Number(effectiveDbId), user.id, textToSend);
        if (comment) {
            setComments(prev => [...prev, comment]);
            setNewComment('');
            setTimeout(scrollToBottom, 100);
        } else {
            throw new Error("Falha na persistência.");
        }
    } catch (err: any) {
        console.error("Falha ao inserir comentário:", err);
        alert(`Não foi possível enviar o comentário: ${err.message || "Erro de conexão"}`);
    } finally {
        setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Excluir este comentário?")) return;
    const ok = await deleteComment(id);
    if (ok) setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleSync = async () => {
      if (readOnly) return;
      setIsSaving(true);
      try {
          const finalData = { ...formData, tags: [formData.category || 'Gestão'] };
          const result = await onSave(finalData);
          
          if (result && (result as any).dbId) {
              setFormData(prev => ({ ...prev, dbId: (result as any).dbId }));
          }
          
          if (!formData.dbId && !effectiveDbId) {
              alert("Tarefa sincronizada com sucesso! Agora você já pode adicionar comentários.");
          } else {
              onClose();
          }
      } catch (e) {
          alert("Erro ao sincronizar dados.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || readOnly) return;
      setIsUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `tasks/${effectiveDbId || 'temp'}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('documentos').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName);
          const newAttachment: Attachment = {
              id: crypto.randomUUID(),
              name: file.name,
              size: (file.size / 1024).toFixed(1) + ' KB',
              type: file.type,
              url: urlData.publicUrl,
              uploadedAt: new Date().toISOString()
          };
          setFormData(prev => ({ ...prev, attachments: [newAttachment, ...(prev.attachments || [])] }));
      } catch (err: any) {
          alert("Erro no upload: " + err.message);
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const currentAssignee = availableUsers.find(u => u.id === formData.assigneeId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-6xl h-[92vh] bg-[#F8F9FA] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-slate-200">
        
        <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-amber-500/20">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{nodeTitle}</span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {effectiveDbId || 'PENDENTE'}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
                <div className="space-y-12">
                    <div className="flex gap-6 items-start">
                        <div className="mt-4 text-slate-300 shrink-0"><ListTodo className="w-7 h-7" /></div>
                        <div className="flex-1">
                            <textarea 
                                ref={titleRef} 
                                value={formData.text} 
                                rows={1}
                                readOnly={readOnly}
                                onChange={e => setFormData({...formData, text: e.target.value})}
                                className="bg-transparent text-3xl md:text-4xl font-black text-slate-900 outline-none w-full tracking-tighter leading-[1.1] resize-none p-4"
                                placeholder="Título da tarefa..."
                            />
                            <div className="mt-2 flex items-center gap-2 px-4">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    em <span className="text-amber-600">{opportunityTitle || 'PROJETO ATIVO'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="mt-1 text-slate-300 shrink-0"><AlignLeft className="w-7 h-7" /></div>
                        <div className="flex-1 space-y-5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Descrição Técnica</h3>
                                {!readOnly && (
                                    <button onClick={() => setIsEditingDesc(!isEditingDesc)} className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all">
                                        {isEditingDesc ? 'CANCELAR' : 'EDITAR'}
                                    </button>
                                )}
                            </div>
                            {isEditingDesc ? (
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full h-48 p-6 bg-white border-2 border-amber-500/10 rounded-[2rem] text-sm text-slate-800 outline-none shadow-inner leading-relaxed"
                                    placeholder="Detalhe o escopo..."
                                />
                            ) : (
                                <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[120px]">
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                        {formData.description || "Nenhuma descrição detalhada."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="mt-1 text-slate-300 shrink-0"><MessageSquare className="w-7 h-7" /></div>
                        <div className="flex-1 space-y-6">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Comentários</h3>
                            
                            <div className="space-y-6">
                                {isLoadingComments ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300"/></div>
                                ) : (
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-4 group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {comment.user_data?.avatar_url ? (
                                                        <img src={comment.user_data.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-5 h-5 text-slate-400"/>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm group-hover:border-amber-500/20 transition-all">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                                                                {comment.user_data?.nome || 'Membro do Time'}
                                                            </span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                                                                {currentUser?.id === comment.usuario && (
                                                                    <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{comment.mensagem}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {comments.length === 0 && (
                                            <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum comentário registrado</p>
                                            </div>
                                        )}
                                        <div ref={commentsEndRef} />
                                    </div>
                                )}

                                <div className="relative group">
                                    <form onSubmit={handleAddComment} className="w-full bg-white border border-slate-200 rounded-[2rem] p-2 flex items-center shadow-soft focus-within:ring-4 focus-within:ring-amber-500/5 transition-all">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center ml-2 shrink-0 overflow-hidden">
                                            {currentUser?.user_metadata?.avatar_url ? <img src={currentUser.user_metadata.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-slate-300"/>}
                                        </div>
                                        <input 
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder={effectiveDbId ? "Adicionar comentário técnico..." : "Sincronize para habilitar comentários"}
                                            disabled={!effectiveDbId || isAddingComment}
                                            className="flex-1 bg-transparent px-4 text-sm font-medium outline-none text-slate-800 disabled:opacity-50"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!newComment.trim() || isAddingComment || !effectiveDbId}
                                            className="p-3 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all shadow-lg active:scale-95 disabled:opacity-30 mr-1"
                                        >
                                            {isAddingComment ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <aside className="w-full lg:w-[400px] border-l border-slate-100 bg-white p-8 lg:p-10 space-y-10 overflow-y-auto custom-scrollbar shrink-0">
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">CATEGORIA SHINKŌ</label>
                    <div className="bg-slate-50 p-2 rounded-[2rem] border border-slate-100 shadow-inner relative overflow-hidden">
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
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">RESPONSÁVEL</label>
                    <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 shadow-inner flex items-center gap-5 group relative h-24">
                        <div className="w-14 h-14 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
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
                    </div>
                </div>

                <div className="space-y-6">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">JANELA DE ENTREGA</label>
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner flex items-center gap-6">
                            <div className="p-4 rounded-2xl bg-white text-amber-500 shadow-sm"><Calendar className="w-7 h-7" /></div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">DEADLINE</span>
                                <input type="date" readOnly={readOnly} value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-transparent text-sm font-black text-slate-800 uppercase tracking-tight outline-none" />
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner flex items-center gap-6">
                            <div className="p-4 rounded-2xl bg-white text-blue-500 shadow-sm"><Clock className="w-7 h-7" /></div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">ESFORÇO (HORAS)</span>
                                <input type="number" readOnly={readOnly} value={formData.estimatedHours || 2} onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-slate-900 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>

        <div className="px-10 py-10 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-center shrink-0">
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || readOnly} className="w-full md:w-auto flex items-center gap-3 px-10 py-6 bg-[#F8F9FA] hover:bg-slate-100 rounded-[1.8rem] text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border border-slate-200">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Paperclip className="w-4 h-4 text-amber-500" />} ANEXAR ATIVO
            </button>
            <div className="flex gap-10 items-center w-full md:w-auto justify-end">
                <button onClick={onClose} className="px-4 py-2 text-[11px] font-black text-slate-400 hover:text-red-500 uppercase tracking-[0.3em] transition-colors">FECHAR</button>
                {!readOnly && (
                    <button onClick={handleSync} disabled={isSaving || isUploading} className="flex-1 md:flex-none flex items-center gap-5 px-16 py-6 bg-[#F59E0B] hover:bg-amber-400 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all disabled:opacity-50">
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
