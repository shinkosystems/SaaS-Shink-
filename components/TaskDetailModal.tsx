
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, TaskStatus, Attachment } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2, AlignLeft, Clock, PlayCircle, CheckCircle, BarChart3, Timer, Sparkles, Loader2, ArrowLeft, Layers, Hash, Eye, ShieldCheck, CornerDownRight, ChevronDown, Check, Paperclip, UploadCloud, File as FileIcon, ExternalLink, ArrowUpRight, Save, CreditCard, Tag, Activity, Info, Send, Image as ImageIcon } from 'lucide-react';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { updateTask } from '../services/projectService';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => void;
  onClose: () => void;
  onOpenProject?: () => void;
  onDelete?: (id: string) => void;
  onAttach?: (attachment: Attachment) => void;
  orgType?: string;
  organizationId?: number; // Added to filter members
}

const PREDEFINED_COLORS = [
    { bg: 'bg-green-500', text: 'text-white', name: 'green' },
    { bg: 'bg-yellow-500', text: 'text-black', name: 'yellow' },
    { bg: 'bg-orange-500', text: 'text-white', name: 'orange' },
    { bg: 'bg-red-500', text: 'text-white', name: 'red' },
    { bg: 'bg-purple-500', text: 'text-white', name: 'purple' },
    { bg: 'bg-blue-500', text: 'text-white', name: 'blue' },
];

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, onAttach, orgType, organizationId }) => {
  const [formData, setFormData] = useState<BpmnTask>({ 
      ...task, 
      subtasks: task.subtasks || [], 
      gut: task.gut || { g: 1, u: 1, t: 1 },
      description: task.description || '',
      members: Array.isArray(task.members) ? task.members : [],
      tags: Array.isArray(task.tags) ? task.tags : [],
      attachments: Array.isArray(task.attachments) ? task.attachments : []
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{id: number, text: string, user: string, created_at: string}[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Popover State
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  // Label State
  const [newLabelText, setNewLabelText] = useState('');

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes to state (Critical for external updates)
  useEffect(() => {
      setFormData(prev => ({
          ...prev,
          ...task,
          // Preserve local edits if keys are missing in update, BUT update if props explicitly change (e.g. from optimistic update)
          members: Array.isArray(task.members) ? task.members : prev.members,
          tags: Array.isArray(task.tags) ? task.tags : prev.tags,
          subtasks: task.subtasks || prev.subtasks,
          attachments: Array.isArray(task.attachments) ? task.attachments : prev.attachments
      }));
  }, [
      task.id, 
      task.status, 
      task.dueDate, 
      JSON.stringify(task.members), 
      JSON.stringify(task.tags), 
      JSON.stringify(task.attachments),
      JSON.stringify(task.subtasks)
  ]);

  // Close popover on click outside
  useEffect(() => {
      const handleClickOutside = () => {
          if (activePopover) setActivePopover(null);
      };
      
      if (activePopover) {
          const timer = setTimeout(() => {
              document.addEventListener('click', handleClickOutside);
          }, 0);
          return () => {
              clearTimeout(timer);
              document.removeEventListener('click', handleClickOutside);
          };
      }
  }, [activePopover]);

  // Fetch contextual data
  useEffect(() => {
      const loadData = async () => {
          try {
              let currentOrgId = organizationId;

              if (!currentOrgId) {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                      const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
                      if (userData) currentOrgId = userData.organizacao;
                  }
              }

              if (currentOrgId) {
                  let query = supabase.from('users')
                      .select('id, nome, perfil, avatar_url, email')
                      .eq('organizacao', currentOrgId) 
                      .order('nome');
                  
                  const { data, error } = await query;
                  if (!error && data) setOrgMembers(data);
              }
              
              if (task.dbId) {
                  const { data: commentsData, error: commentsError } = await supabase
                      .from('comentarios')
                      .select('id, mensagem, created_at, usuario')
                      .eq('task', task.dbId)
                      .order('created_at', { ascending: false });
                  
                  if (!commentsError && commentsData) {
                      const userIds = [...new Set(commentsData.map((c: any) => c.usuario))];
                      let userMap = new Map<string, string>();
                      
                      if (userIds.length > 0) {
                          const { data: users } = await supabase.from('users').select('id, nome').in('id', userIds);
                          users?.forEach((u: any) => userMap.set(u.id, u.nome));
                      }

                      const mappedComments = commentsData.map((c: any) => ({
                          id: c.id,
                          text: c.mensagem,
                          created_at: c.created_at,
                          user: userMap.get(c.usuario) || 'Usuário'
                      }));
                      setComments(mappedComments);
                  }
              }
          } catch (err) {
              console.error("TaskDetailModal Load Error:", err);
          }
      };
      loadData();
  }, [task.dbId, organizationId]);

  const handleSave = (dataToSave = formData) => {
      onSave(dataToSave);
  };

  const updateSubtask = (subId: string, updates: Partial<BpmnSubTask>) => {
      const newSubtasks = (formData.subtasks || []).map(s => 
          s.id === subId ? { ...s, ...updates } : s
      );
      const updatedData = { ...formData, subtasks: newSubtasks };
      setFormData(updatedData);
      handleSave(updatedData);
  };

  // --- ACTIONS ---

  const handleToggleMember = (memberId: string) => {
      if (!memberId) return;

      const currentMembers = formData.members ? [...formData.members] : [];
      let newMembers: string[];
      
      if (currentMembers.includes(memberId)) {
          newMembers = currentMembers.filter(id => id !== memberId);
      } else {
          newMembers = [...currentMembers, memberId];
      }
      
      const updatedData = { ...formData, members: newMembers };
      setFormData(updatedData);
      onSave(updatedData);
  };

  const handleAddSubtask = (e?: React.KeyboardEvent | React.MouseEvent) => {
      if (e && e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
      
      e?.preventDefault(); 
      e?.stopPropagation();

      if (!newSubtask.trim()) return;

      const newItem: BpmnSubTask = { 
          id: Date.now().toString(), 
          text: newSubtask, 
          completed: false 
      };
      
      const updatedSubtasks = [...(formData.subtasks || []), newItem];
      const updatedData = { ...formData, subtasks: updatedSubtasks };
      
      setFormData(updatedData);
      setNewSubtask('');
      handleSave(updatedData);
      
      setTimeout(() => checklistInputRef.current?.focus(), 10);
  };

  // --- AI GENERATION ---
  const handleGenerateSubtasks = async () => {
      setIsGeneratingAI(true);
      try {
          const suggestions = await generateSubtasksForTask(
              formData.text,
              `Projeto: ${opportunityTitle || 'Geral'}. Descrição: ${formData.description}`,
              orgType
          );

          if (suggestions && suggestions.length > 0) {
              const newItems: BpmnSubTask[] = suggestions.map(s => ({
                  id: crypto.randomUUID(),
                  text: s.title,
                  completed: false,
                  estimatedHours: s.hours
              }));

              const updatedSubtasks = [...(formData.subtasks || []), ...newItems];
              const updatedData = { ...formData, subtasks: updatedSubtasks };
              setFormData(updatedData);
              handleSave(updatedData);
          }
      } catch (error) {
          console.error("Erro AI:", error);
          alert("Erro ao gerar subtarefas com IA.");
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleAddLabel = () => {
      if (!newLabelText.trim()) return;
      const currentTags = formData.tags || [];
      if (!currentTags.includes(newLabelText.trim())) {
          const updatedData = { ...formData, tags: [...currentTags, newLabelText.trim()] };
          setFormData(updatedData);
          onSave(updatedData);
      }
      setNewLabelText('');
  };

  const handleRemoveLabel = (e: React.MouseEvent, tag: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentTags = formData.tags || [];
      const newTags = currentTags.filter(t => t !== tag);
      const updatedData = { ...formData, tags: newTags };
      
      setFormData(updatedData);
      onSave(updatedData);
  };

  const handleAddComment = async () => {
      if (!newComment.trim()) return;
      
      if (!task.dbId) {
          alert("Salve a tarefa antes de comentar (ID do banco ausente).");
          return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
          const { data, error } = await supabase.from('comentarios').insert({
              task: task.dbId,
              usuario: user.id,
              mensagem: newComment
          }).select().single();

          if (error) throw error;

          if (data) {
              const { data: u } = await supabase.from('users').select('nome').eq('id', user.id).single();
              setComments(prev => [{
                  id: data.id,
                  text: data.mensagem,
                  created_at: data.created_at,
                  user: u?.nome || 'Eu'
              }, ...prev]);
              setNewComment('');
          }
      } catch (e: any) {
          console.error("Erro ao comentar:", e);
          alert("Erro ao salvar comentário.");
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `tasks/${formData.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from('documentos')
              .upload(fileName, file);
          
          if (uploadError) throw new Error(uploadError.message);
          
          const { data } = supabase.storage.from('documentos').getPublicUrl(fileName);
          
          const newAttachment: Attachment = {
              id: crypto.randomUUID(),
              name: file.name,
              size: (file.size / 1024).toFixed(2) + ' KB',
              type: file.type,
              uploadedAt: new Date().toISOString(),
              url: data.publicUrl
          };
          
          const updatedAttachments = [...(formData.attachments || []), newAttachment];
          
          const updatedData = { ...formData, attachments: updatedAttachments };
          setFormData(updatedData);
          onSave(updatedData);
          
          if (onAttach) onAttach(newAttachment);

      } catch (error: any) {
          console.error("Upload Error:", error);
          alert("Erro no upload: " + error.message);
      } finally {
          setIsUploading(false);
          if(attachmentInputRef.current) attachmentInputRef.current.value = '';
      }
  };

  const handleDeleteAttachment = (attId: string) => {
      if(!window.confirm("Remover este anexo?")) return;
      
      const updatedAttachments = (formData.attachments || []).filter(a => a.id !== attId);
      const updatedData = { ...formData, attachments: updatedAttachments };
      setFormData(updatedData);
      onSave(updatedData);
  };

  const scrollToChecklist = () => {
      const el = document.getElementById('checklist-section');
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => checklistInputRef.current?.focus(), 500);
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'todo': return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
          case 'doing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          case 'review': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
          case 'done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
          default: return 'bg-slate-100 text-slate-500';
      }
  };

  const handleSidebarClick = (e: React.MouseEvent, popoverName: string) => {
      e.preventDefault();
      e.stopPropagation();
      setActivePopover(prev => prev === popoverName ? null : popoverName);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden" onClick={(e) => {
        if(e.target === e.currentTarget) onClose();
    }}>
      <input 
          type="file" 
          hidden 
          ref={attachmentInputRef}
          onChange={handleFileUpload}
      />

      <div className="w-full max-w-4xl bg-transparent rounded-xl shadow-2xl relative flex flex-col md:flex-row min-h-[600px] text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors z-[250]">
            <X className="w-5 h-5"/>
        </button>

        <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1a1a] md:rounded-l-xl relative z-10">
            
            <div className="space-y-4">
                {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-9">
                        {formData.tags.map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="group relative px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-default transition-all hover:pr-6">
                                {tag}
                                <button 
                                    type="button"
                                    onClick={(e) => handleRemoveLabel(e, tag)}
                                    className="hidden group-hover:flex absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-900 dark:text-amber-200 hover:text-red-500 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                >
                                    <X className="w-3 h-3"/>
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-start gap-3">
                    <CreditCard className="w-6 h-6 mt-1 text-slate-600 dark:text-slate-400" />
                    <div className="flex-1">
                        <input 
                            value={formData.text}
                            onChange={e => setFormData({...formData, text: e.target.value})}
                            onBlur={() => handleSave()}
                            className="text-xl font-bold bg-transparent outline-none w-full text-slate-900 dark:text-white focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 transition-all"
                        />
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            na lista <span className="underline decoration-slate-300">{nodeTitle}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pl-9 flex flex-wrap gap-6">
                <div className="space-y-1.5 relative">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Membros</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        {formData.assigneeId && (
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 pr-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors" title="Responsável Principal">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-[#1a1a1a]">
                                    {orgMembers.find(m => m.id === formData.assigneeId)?.nome.charAt(0) || 'U'}
                                </div>
                                <span className="text-xs font-medium">{orgMembers.find(m => m.id === formData.assigneeId)?.nome.split(' ')[0]}</span>
                            </div>
                        )}
                        
                        {formData.members?.map(mid => {
                            const mem = orgMembers.find(m => m.id === mid);
                            if (!mem) return null;
                            if (mem.id === formData.assigneeId) return null;

                            return (
                                <div key={mid} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold shadow-sm ring-2 ring-white dark:ring-[#1a1a1a]" title={mem.nome || 'Membro'}>
                                    {mem.nome.charAt(0)}
                                </div>
                            );
                        })}

                        <button 
                            type="button"
                            onClick={(e) => handleSidebarClick(e, 'members-inline')}
                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <Plus className="w-4 h-4"/>
                        </button>
                    </div>

                    {activePopover === 'members-inline' && (
                        <div 
                            className="absolute top-10 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[200] animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3 border-b border-slate-100 dark:border-white/5 font-bold text-xs text-slate-500 uppercase">
                                Adicionar membros
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                {orgMembers.length === 0 && <div className="p-3 text-xs text-slate-500 text-center">Nenhum membro encontrado.</div>}
                                {orgMembers.map(m => {
                                    const isSelected = (formData.members || []).includes(m.id) || formData.assigneeId === m.id;
                                    
                                    return (
                                        <button 
                                            key={m.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleToggleMember(m.id);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-sm flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                                    {m.nome.charAt(0)}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-slate-700 dark:text-slate-200 truncate">{m.nome}</span>
                                                    <span className="text-[10px] text-slate-400 truncate">{m.email}</span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-emerald-500"/>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Status</h4>
                    <div className="flex items-center gap-2">
                        <select 
                            value={formData.status}
                            onChange={e => {
                                const newStatus = e.target.value as any;
                                setFormData({...formData, status: newStatus});
                                handleSave({...formData, status: newStatus});
                            }}
                            className={`appearance-none px-3 py-1.5 rounded font-bold text-xs outline-none cursor-pointer ${getStatusColor(formData.status)}`}
                        >
                            <option value="todo">A Fazer</option>
                            <option value="doing">Fazendo</option>
                            <option value="review">Revisão</option>
                            <option value="approval">Aprovação</option>
                            <option value="done">Concluído</option>
                        </select>
                    </div>
                </div>

                {(formData.dueDate || formData.startDate) && (
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Datas</h4>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer group relative">
                            <CalendarIcon className="w-4 h-4 text-slate-500"/>
                            {formData.startDate ? new Date(formData.startDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : '...'} 
                            {' - '}
                            {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : '...'}
                            
                            {formData.completed && <span className="bg-emerald-500 text-white text-[10px] px-1.5 rounded ml-2">Concluído</span>}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <AlignLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-bold text-base text-slate-800 dark:text-white">Descrição</h3>
                    {!isEditingDesc && formData.description && (
                        <button onClick={() => setIsEditingDesc(true)} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-xs font-medium transition-colors">Editar</button>
                    )}
                </div>
                <div className="pl-9">
                    {isEditingDesc || !formData.description ? (
                        <div className="space-y-2">
                            <textarea 
                                value={formData.description || ''}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full min-h-[120px] bg-white dark:bg-black border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                                placeholder="Adicione uma descrição mais detalhada..."
                                autoFocus={isEditingDesc}
                                onBlur={() => { if(formData.description) setIsEditingDesc(false); handleSave(); }}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditingDesc(false); handleSave(); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition-colors">Salvar</button>
                                <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold transition-colors">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => setIsEditingDesc(true)}
                            className="min-h-[60px] p-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-pre-wrap"
                        >
                            {formData.description}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Paperclip className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-bold text-base text-slate-800 dark:text-white">Anexos</h3>
                </div>
                <div className="pl-9">
                    {(!formData.attachments || formData.attachments.length === 0) ? (
                        <div className="text-sm text-slate-400 italic">Nenhum anexo. Use o botão lateral para adicionar.</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {formData.attachments.map((att, index) => (
                                <div key={index} className="group relative p-3 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3 bg-white/50 dark:bg-black/20">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                        {att.type.startsWith('image/') ? <img src={att.url} className="w-full h-full object-cover"/> : <FileIcon className="w-5 h-5 text-slate-500"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={att.name}>{att.name}</div>
                                        <div className="text-[10px] text-slate-400">{att.size}</div>
                                    </div>
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-500 transition-opacity"><ExternalLink className="w-4 h-4"/></a>
                                    <button onClick={() => handleDeleteAttachment(att.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3" id="checklist-section">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        <h3 className="font-bold text-base text-slate-800 dark:text-white">Checklist</h3>
                    </div>
                    {/* Botão de IA restaurado */}
                    <div className="flex gap-2">
                        {formData.subtasks && formData.subtasks.length > 0 && (
                            <button 
                                onClick={() => setFormData({...formData, subtasks: formData.subtasks?.filter(s => !s.completed)})}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
                            >
                                Ocultar concluídos
                            </button>
                        )}
                        <button 
                            onClick={handleGenerateSubtasks} 
                            disabled={isGeneratingAI}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-full text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                            Gerar com IA
                        </button>
                    </div>
                </div>
                
                <div className="pl-9 space-y-3">
                    {formData.subtasks && formData.subtasks.length > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs text-slate-500 font-bold w-8 text-right">
                                {Math.round((formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100)}%
                            </span>
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-500" 
                                    style={{ width: `${(formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {formData.subtasks?.map(sub => (
                            <div key={sub.id} className="flex flex-col gap-1 group relative">
                                <div className="flex items-center gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newSubs = formData.subtasks?.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                                            const updatedData = {...formData, subtasks: newSubs};
                                            setFormData(updatedData);
                                            handleSave(updatedData);
                                        }}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${sub.completed ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-black border-slate-300 dark:border-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {sub.completed && <Check className="w-3 h-3"/>}
                                    </button>
                                    
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className={`text-sm block ${sub.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {sub.text}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <div className="relative group/date">
                                                {sub.dueDate ? (
                                                    <div className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        <span>{new Date(sub.dueDate).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                                                        <CalendarIcon className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                                                    </div>
                                                )}
                                                <input
                                                    type="date"
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                    onChange={(e) => updateSubtask(sub.id, { dueDate: e.target.value })}
                                                    value={sub.dueDate || ''}
                                                />
                                            </div>

                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActivePopover(activePopover === `sub-assignee-${sub.id}` ? null : `sub-assignee-${sub.id}`);
                                                    }}
                                                    className="flex items-center justify-center outline-none p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                >
                                                    {sub.assigneeId ? (
                                                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold" title={sub.assignee || 'Responsável'}>
                                                            {sub.assignee?.charAt(0) || orgMembers.find(m => m.id === sub.assigneeId)?.nome?.charAt(0) || 'U'}
                                                        </div>
                                                    ) : (
                                                        <User className="w-4 h-4 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                </button>

                                                {activePopover === `sub-assignee-${sub.id}` && (
                                                    <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 origin-top-right">
                                                        <div className="max-h-32 overflow-y-auto custom-scrollbar">
                                                            {orgMembers.map(m => (
                                                                <button 
                                                                    key={m.id}
                                                                    onClick={() => {
                                                                        updateSubtask(sub.id, { assigneeId: m.id, assignee: m.nome });
                                                                        setActivePopover(null);
                                                                    }}
                                                                    className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2"
                                                                >
                                                                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold">
                                                                        {m.nome.charAt(0)}
                                                                    </div>
                                                                    <span className="truncate">{m.nome}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const updatedSubtasks = formData.subtasks?.filter(s => s.id !== sub.id);
                                                    const updatedData = {...formData, subtasks: updatedSubtasks};
                                                    setFormData(updatedData);
                                                    handleSave(updatedData);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-2 flex gap-2">
                        <input 
                            ref={checklistInputRef}
                            type="text" 
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={handleAddSubtask}
                            autoComplete="off"
                            className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-slate-500"
                            placeholder="Adicionar um item..."
                        />
                        <button 
                            onClick={(e) => handleAddSubtask(e)}
                            className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <Plus className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        <h3 className="font-bold text-base text-slate-800 dark:text-white">Atividade</h3>
                    </div>
                    <button className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-xs font-medium transition-colors">
                        Ocultar detalhes
                    </button>
                </div>

                <div className="pl-9 space-y-4">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            EU
                        </div>
                        <div className="flex-1 bg-white dark:bg-black border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <input 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                className="w-full px-3 py-2 bg-transparent outline-none text-sm"
                                placeholder="Escrever um comentário..."
                            />
                            <div className="p-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    type="button" 
                                    onClick={() => attachmentInputRef.current?.click()}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
                                    title="Anexar arquivo"
                                >
                                    <Paperclip className="w-4 h-4"/> 
                                    <span className="text-xs">Anexar</span>
                                </button>
                                <button onClick={handleAddComment} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors">Salvar</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shrink-0">
                                    {c.user.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{c.user}</span>
                                        <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 inline-block">
                                        {c.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>

        <div className="w-full md:w-48 bg-slate-100 dark:bg-[#121212] p-4 pt-12 space-y-6 md:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 md:rounded-r-xl relative z-20 overflow-visible">
            
            <div className="space-y-2 relative">
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Adicionar ao cartão</h5>
                
                <div className="relative">
                    <button 
                        type="button"
                        onClick={(e) => handleSidebarClick(e, 'members-sidebar')}
                        className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <User className="w-4 h-4"/> Membros
                    </button>
                    {activePopover === 'members-sidebar' && (
                        <div 
                            className="absolute top-0 right-full mr-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[200] animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3 border-b border-slate-100 dark:border-white/5 font-bold text-xs text-slate-500 uppercase flex justify-between items-center">
                                <span>Membros</span>
                                <button type="button" onClick={() => setActivePopover(null)}><X className="w-3 h-3"/></button>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                {orgMembers.length === 0 && <div className="p-3 text-xs text-slate-500 text-center">Nenhum membro disponível.</div>}
                                {orgMembers.map(m => {
                                    const isSelected = (formData.members || []).includes(m.id) || formData.assigneeId === m.id;
                                    
                                    return (
                                        <button 
                                            key={m.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleToggleMember(m.id);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-sm flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                                    {m.nome.charAt(0)}
                                                </div>
                                                <span className="text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{m.nome}</span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-emerald-500"/>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button 
                        type="button"
                        onClick={(e) => handleSidebarClick(e, 'labels-sidebar')}
                        className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <Tag className="w-4 h-4"/> Etiquetas
                    </button>
                    {activePopover === 'labels-sidebar' && (
                        <div 
                            className="absolute top-0 right-full mr-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[200] p-3 animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="font-bold text-xs text-slate-500 uppercase mb-2 flex justify-between items-center">
                                <span>Etiquetas</span>
                                <button type="button" onClick={() => setActivePopover(null)}><X className="w-3 h-3"/></button>
                            </div>
                            
                            <div className="mb-2">
                                <input 
                                    type="text" 
                                    value={newLabelText}
                                    onChange={(e) => setNewLabelText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                                    placeholder="Nova etiqueta..."
                                    autoFocus
                                    className="w-full px-2 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                <div className="text-[10px] text-slate-400 font-bold mb-1 px-1">ATIVAS</div>
                                {(formData.tags || []).length === 0 && (
                                    <div className="text-[10px] text-slate-400 italic px-1">Nenhuma etiqueta.</div>
                                )}
                                {(formData.tags || []).map((tag, i) => (
                                    <div 
                                        key={`${tag}-${i}`}
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-slate-100 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 group"
                                    >
                                        <span>{tag}</span>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleRemoveLabel(e, tag)} 
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-white dark:hover:bg-white/10 transition-colors z-10"
                                        >
                                            <X className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollToChecklist();
                    }}
                    className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                >
                    <CheckSquare className="w-4 h-4"/> Checklist
                </button>
                
                <div className="relative">
                    <button 
                        type="button"
                        onClick={(e) => handleSidebarClick(e, 'dates-sidebar')}
                        className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <Clock className="w-4 h-4"/> Datas
                    </button>
                    {activePopover === 'dates-sidebar' && (
                        <div 
                            className="absolute top-0 right-full mr-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[200] p-4 animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="font-bold text-xs text-slate-500 uppercase mb-3 flex justify-between items-center">
                                <span>Definir Datas</span>
                                <button type="button" onClick={() => setActivePopover(null)}><X className="w-3 h-3"/></button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Início</label>
                                    <input 
                                        type="date"
                                        value={formData.startDate || ''}
                                        onChange={(e) => {
                                            const updatedData = {...formData, startDate: e.target.value};
                                            setFormData(updatedData);
                                            handleSave(updatedData);
                                        }}
                                        className="w-full p-2 bg-slate-100 dark:bg-black/20 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Prazo Final</label>
                                    <input 
                                        type="date"
                                        value={formData.dueDate || ''}
                                        onChange={(e) => {
                                            const updatedData = {...formData, dueDate: e.target.value};
                                            setFormData(updatedData);
                                            handleSave(updatedData);
                                        }}
                                        className="w-full p-2 bg-slate-100 dark:bg-black/20 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        attachmentInputRef.current?.click();
                    }}
                    className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Paperclip className="w-4 h-4"/>} 
                    Anexo
                </button>
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Ações</h5>
                {onDelete && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="w-full text-left px-3 py-1.5 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 rounded text-sm text-red-600 dark:text-red-400 font-medium transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4"/> Arquivar
                    </button>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                    type="button"
                    onClick={() => { handleSave(); onClose(); }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4"/> Salvar
                </button>
            </div>

        </div>

      </div>
    </div>
  );
};
