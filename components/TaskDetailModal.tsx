
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, Attachment } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Plus, Trash2, AlignLeft, Paperclip, File as FileIcon, ExternalLink, Save, CreditCard, Tag, Activity, Sparkles, Loader2, Check } from 'lucide-react';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

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
  organizationId?: number;
}

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
  const [newLabelText, setNewLabelText] = useState('');

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes
  useEffect(() => {
      setFormData(prev => ({
          ...prev,
          ...task,
          members: Array.isArray(task.members) ? task.members : prev.members,
          tags: Array.isArray(task.tags) ? task.tags : prev.tags,
          subtasks: task.subtasks || prev.subtasks,
          attachments: Array.isArray(task.attachments) ? task.attachments : prev.attachments
      }));
  }, [task.id, task.status, task.dueDate, JSON.stringify(task.subtasks)]);

  // Load Context Data
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
                  const { data } = await supabase.from('users').select('id, nome, email').eq('organizacao', currentOrgId).order('nome');
                  if (data) setOrgMembers(data);
              }
              
              if (task.dbId) {
                  const { data: commentsData } = await supabase
                      .from('comentarios')
                      .select('id, mensagem, created_at, usuario')
                      .eq('task', task.dbId)
                      .order('created_at', { ascending: false });
                  
                  if (commentsData) {
                      const userIds = [...new Set(commentsData.map((c: any) => c.usuario))];
                      let userMap = new Map<string, string>();
                      if (userIds.length > 0) {
                          const { data: users } = await supabase.from('users').select('id, nome').in('id', userIds);
                          users?.forEach((u: any) => userMap.set(u.id, u.nome));
                      }
                      setComments(commentsData.map((c: any) => ({
                          id: c.id,
                          text: c.mensagem,
                          created_at: c.created_at,
                          user: userMap.get(c.usuario) || 'Usuário'
                      })));
                  }
              }
          } catch (err) { console.error(err); }
      };
      loadData();
  }, [task.dbId, organizationId]);

  const handleSave = (dataToSave = formData) => {
      onSave(dataToSave);
  };

  const updateSubtask = (subId: string, updates: Partial<BpmnSubTask>) => {
      const newSubtasks = (formData.subtasks || []).map(s => s.id === subId ? { ...s, ...updates } : s);
      const updatedData = { ...formData, subtasks: newSubtasks };
      setFormData(updatedData);
      handleSave(updatedData);
  };

  const handleToggleMember = (memberId: string) => {
      const current = formData.members || [];
      const newMembers = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId];
      const updatedData = { ...formData, members: newMembers };
      setFormData(updatedData);
      onSave(updatedData);
  };

  const handleAddSubtask = (e?: React.KeyboardEvent | React.MouseEvent) => {
      if (e && e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
      if (!newSubtask.trim()) return;

      const newItem: BpmnSubTask = { id: Date.now().toString(), text: newSubtask, completed: false };
      const updatedData = { ...formData, subtasks: [...(formData.subtasks || []), newItem] };
      setFormData(updatedData);
      setNewSubtask('');
      handleSave(updatedData);
  };

  const handleGenerateSubtasks = async () => {
      setIsGeneratingAI(true);
      try {
          const suggestions = await generateSubtasksForTask(formData.text, `Projeto: ${opportunityTitle}. Desc: ${formData.description}`, orgType);
          if (suggestions && suggestions.length > 0) {
              const newItems: BpmnSubTask[] = suggestions.map(s => ({
                  id: crypto.randomUUID(), text: s.title, completed: false, estimatedHours: s.hours
              }));
              const updatedData = { ...formData, subtasks: [...(formData.subtasks || []), ...newItems] };
              setFormData(updatedData);
              handleSave(updatedData);
          }
      } catch (error) { alert("Erro IA"); } finally { setIsGeneratingAI(false); }
  };

  const handleAddComment = async () => {
      if (!newComment.trim() || !task.dbId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('comentarios').insert({
          task: task.dbId, usuario: user.id, mensagem: newComment
      }).select().single();

      if (data) {
          setComments(prev => [{ id: data.id, text: data.mensagem, created_at: data.created_at, user: 'Eu' }, ...prev]);
          setNewComment('');
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
          const fileName = `tasks/${formData.id}/${Date.now()}.${file.name.split('.').pop()}`;
          await supabase.storage.from('documentos').upload(fileName, file);
          const { data } = supabase.storage.from('documentos').getPublicUrl(fileName);
          
          const newAtt: Attachment = {
              id: crypto.randomUUID(), name: file.name, size: (file.size/1024).toFixed(2)+'KB', type: file.type, uploadedAt: new Date().toISOString(), url: data.publicUrl
          };
          const updatedData = { ...formData, attachments: [...(formData.attachments || []), newAtt] };
          setFormData(updatedData);
          onSave(updatedData);
      } catch (e) { alert("Erro upload"); } finally { setIsUploading(false); }
  };

  const getStatusColor = (s: string) => {
      if (s === 'done') return 'bg-emerald-100 text-emerald-700';
      if (s === 'doing') return 'bg-blue-100 text-blue-700';
      return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <input type="file" hidden ref={attachmentInputRef} onChange={handleFileUpload} />
      <div className="w-full max-w-4xl bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl flex flex-col md:flex-row min-h-[600px] text-slate-800 dark:text-slate-200 animate-in zoom-in-95 relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full z-[120]">
            <X className="w-5 h-5"/>
        </button>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Title Block */}
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <CreditCard className="w-6 h-6 mt-1 text-slate-400" />
                    <div className="flex-1">
                        <input 
                            value={formData.text}
                            onChange={e => setFormData({...formData, text: e.target.value})}
                            onBlur={() => handleSave()}
                            className="text-xl font-bold bg-transparent outline-none w-full text-slate-900 dark:text-white"
                        />
                        <div className="text-sm text-slate-500 mt-1">na lista <span className="underline">{nodeTitle}</span></div>
                    </div>
                </div>
                {/* Labels */}
                <div className="pl-9 flex flex-wrap gap-2">
                    {formData.tags?.map(t => (
                        <span key={t} className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1">
                            {t} <button onClick={() => {
                                const newTags = formData.tags?.filter(tag => tag !== t);
                                setFormData({...formData, tags: newTags});
                                onSave({...formData, tags: newTags});
                            }}><X className="w-3 h-3"/></button>
                        </span>
                    ))}
                    <button onClick={() => setActivePopover('labels')} className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-xs text-slate-500">+</button>
                    
                    {activePopover === 'labels' && (
                        <div className="absolute z-50 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-white/10 p-2 rounded-lg mt-8">
                            <input autoFocus placeholder="Nova etiqueta" value={newLabelText} onChange={e => setNewLabelText(e.target.value)} 
                                onKeyDown={e => { if(e.key === 'Enter' && newLabelText) {
                                    const newTags = [...(formData.tags||[]), newLabelText];
                                    setFormData({...formData, tags: newTags});
                                    onSave({...formData, tags: newTags});
                                    setNewLabelText('');
                                    setActivePopover(null);
                                }}}
                                className="p-1 text-xs border rounded w-32 bg-transparent"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <AlignLeft className="w-6 h-6 text-slate-400" />
                    <h3 className="font-bold text-base">Descrição</h3>
                </div>
                <div className="pl-9">
                    <textarea 
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        onBlur={() => handleSave()}
                        className="w-full min-h-[100px] bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Adicione detalhes..."
                    />
                </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3" id="checklist-section">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="w-6 h-6 text-slate-400" />
                        <h3 className="font-bold text-base">Checklist</h3>
                    </div>
                    <button onClick={handleGenerateSubtasks} disabled={isGeneratingAI} className="text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} IA
                    </button>
                </div>
                <div className="pl-9 space-y-2">
                    {/* Progress Bar */}
                    {formData.subtasks && formData.subtasks.length > 0 && (
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${(formData.subtasks.filter(s=>s.completed).length / formData.subtasks.length) * 100}%` }}></div>
                        </div>
                    )}
                    
                    {formData.subtasks?.map(sub => (
                        <div key={sub.id} className="flex items-center gap-3 group">
                            <button 
                                onClick={() => {
                                    const newSubs = formData.subtasks?.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                                    setFormData({...formData, subtasks: newSubs});
                                    handleSave({...formData, subtasks: newSubs});
                                }}
                                className={`w-5 h-5 rounded border flex items-center justify-center ${sub.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}
                            >
                                {sub.completed && <Check className="w-3 h-3"/>}
                            </button>
                            <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-slate-400' : ''}`}>{sub.text}</span>
                            <button onClick={() => {
                                const newSubs = formData.subtasks?.filter(s => s.id !== sub.id);
                                setFormData({...formData, subtasks: newSubs});
                                handleSave({...formData, subtasks: newSubs});
                            }} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                        <input 
                            ref={checklistInputRef}
                            value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={handleAddSubtask}
                            className="flex-1 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded text-sm outline-none" placeholder="Adicionar item..."
                        />
                        <button onClick={handleAddSubtask} className="bg-slate-200 dark:bg-white/10 px-3 rounded"><Plus className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>

            {/* Attachments */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Paperclip className="w-6 h-6 text-slate-400" />
                    <h3 className="font-bold text-base">Anexos</h3>
                </div>
                <div className="pl-9 grid grid-cols-2 gap-2">
                    {formData.attachments?.map(att => (
                        <div key={att.id} className="p-2 border border-slate-200 dark:border-white/10 rounded-lg flex items-center gap-2 group">
                            <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded text-slate-500"><FileIcon className="w-4 h-4"/></div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-xs font-bold truncate">{att.name}</div>
                                <div className="text-[10px] text-slate-400">{att.size}</div>
                            </div>
                            <a href={att.url} target="_blank" className="opacity-0 group-hover:opacity-100"><ExternalLink className="w-4 h-4"/></a>
                        </div>
                    ))}
                </div>
            </div>

            {/* Activity */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-slate-400" />
                    <h3 className="font-bold text-base">Comentários</h3>
                </div>
                <div className="pl-9 space-y-4">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">EU</div>
                        <div className="flex-1">
                            <input 
                                value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none"
                                placeholder="Escreva um comentário..."
                            />
                        </div>
                    </div>
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 flex items-center justify-center font-bold text-xs">{c.user.charAt(0)}</div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">{c.user}</span>
                                    <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                                </div>
                                <div className="text-sm bg-slate-50 dark:bg-white/5 p-2 rounded-lg mt-1">{c.text}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-48 bg-slate-50 dark:bg-[#121212] p-4 space-y-4 border-l border-slate-200 dark:border-white/10">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <select 
                    value={formData.status} 
                    onChange={e => {
                        setFormData({...formData, status: e.target.value as any});
                        onSave({...formData, status: e.target.value as any});
                    }}
                    className={`w-full p-2 rounded text-xs font-bold appearance-none outline-none cursor-pointer ${getStatusColor(formData.status)}`}
                >
                    <option value="todo">A Fazer</option>
                    <option value="doing">Fazendo</option>
                    <option value="review">Revisão</option>
                    <option value="done">Concluído</option>
                </select>
            </div>

            <div className="space-y-2">
                <div className="relative">
                    <button onClick={() => setActivePopover(activePopover === 'members' ? null : 'members')} className="w-full text-left px-3 py-2 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 rounded text-sm flex items-center gap-2">
                        <User className="w-4 h-4"/> Membros
                    </button>
                    {activePopover === 'members' && (
                        <div className="absolute right-full top-0 mr-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-1">
                            {orgMembers.map(m => (
                                <button key={m.id} onClick={() => handleToggleMember(m.id)} className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex justify-between items-center text-sm">
                                    {m.nome}
                                    {(formData.members || []).includes(m.id) && <Check className="w-3 h-3 text-blue-500"/>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={() => attachmentInputRef.current?.click()} className="w-full text-left px-3 py-2 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 rounded text-sm flex items-center gap-2">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Paperclip className="w-4 h-4"/>} Anexo
                </button>

                <button onClick={() => {
                    const el = document.getElementById('checklist-section');
                    el?.scrollIntoView({behavior:'smooth'});
                    setTimeout(() => checklistInputRef.current?.focus(), 500);
                }} className="w-full text-left px-3 py-2 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 rounded text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4"/> Checklist
                </button>

                <div className="space-y-1 mt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase">Datas</label>
                    <input type="date" value={formData.startDate || ''} onChange={e => {setFormData({...formData, startDate: e.target.value}); onSave({...formData, startDate: e.target.value});}} className="w-full p-2 bg-slate-200 dark:bg-white/5 rounded text-xs outline-none"/>
                    <input type="date" value={formData.dueDate || ''} onChange={e => {setFormData({...formData, dueDate: e.target.value}); onSave({...formData, dueDate: e.target.value});}} className="w-full p-2 bg-slate-200 dark:bg-white/5 rounded text-xs outline-none"/>
                </div>
            </div>

            <div className="pt-6 mt-auto">
                <button onClick={() => onDelete && onDelete(task.id)} className="w-full text-left px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded text-sm flex items-center gap-2 hover:bg-red-200">
                    <Trash2 className="w-4 h-4"/> Arquivar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
