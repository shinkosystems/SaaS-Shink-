
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BpmnTask, BpmnSubTask, Attachment } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Plus, Trash2, AlignLeft, Paperclip, File as FileIcon, ExternalLink, Save, CreditCard, Tag, Activity, Sparkles, Loader2, Check, Users, Clock, BarChart3, Hash, ArrowUpRight, Calendar } from 'lucide-react';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { createTask } from '../services/projectService';

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
      attachments: Array.isArray(task.attachments) ? task.attachments : [],
      estimatedHours: task.estimatedHours || 0
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{id: number, text: string, user: string, created_at: string, avatar_url?: string}[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Popover State
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [newLabelText, setNewLabelText] = useState('');
  
  // Subtask specific popover state (format: "subtask_ID_field")
  const [activeSubtaskPopover, setActiveSubtaskPopover] = useState<string | null>(null);

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes - FIXED DEPENDENCIES
  useEffect(() => {
      setFormData(prev => ({
          ...prev,
          ...task,
          members: Array.isArray(task.members) ? task.members : prev.members,
          tags: Array.isArray(task.tags) ? task.tags : prev.tags,
          subtasks: task.subtasks || prev.subtasks,
          attachments: Array.isArray(task.attachments) ? task.attachments : prev.attachments,
          startDate: task.startDate, 
          dueDate: task.dueDate,     
          assigneeId: task.assigneeId,
          assignee: task.assignee,
          estimatedHours: task.estimatedHours || prev.estimatedHours,
          gut: task.gut || prev.gut
      }));
  }, [task.id, task.status, task.dueDate, task.startDate, task.assigneeId, task.estimatedHours, JSON.stringify(task.subtasks), JSON.stringify(task.gut)]);

  // Load Context Data (Users & Comments)
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
                  // FETCH WITH AVATAR_URL AND ROLE (area_atuacao)
                  const { data } = await supabase.from('users')
                      .select('id, nome, email, avatar_url, area_atuacao(cargo)')
                      .eq('organizacao', currentOrgId)
                      .order('nome');
                  
                  if (data) {
                      const formattedMembers = data.map((m: any) => ({
                          ...m,
                          role: m.area_atuacao?.cargo || 'Colaborador'
                      }));
                      setOrgMembers(formattedMembers);
                  }
              }
              
              if (task.dbId) {
                  const { data: commentsData } = await supabase
                      .from('comentarios')
                      .select('id, mensagem, created_at, usuario')
                      .eq('task', task.dbId)
                      .order('created_at', { ascending: false });
                  
                  if (commentsData) {
                      const userIds = [...new Set(commentsData.map((c: any) => c.usuario))];
                      let userMap = new Map<string, any>();
                      if (userIds.length > 0) {
                          const { data: users } = await supabase.from('users').select('id, nome, avatar_url').in('id', userIds);
                          users?.forEach((u: any) => userMap.set(u.id, u));
                      }
                      setComments(commentsData.map((c: any) => ({
                          id: c.id,
                          text: c.mensagem,
                          created_at: c.created_at,
                          user: userMap.get(c.usuario)?.nome || 'Usuário',
                          avatar_url: userMap.get(c.usuario)?.avatar_url
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

  const handleDateChange = (field: 'startDate' | 'dueDate', value: string) => {
      const updatedData = { ...formData, [field]: value };
      setFormData(updatedData);
      onSave(updatedData);
  };

  const handleHoursChange = (value: string) => {
      const numVal = parseFloat(value);
      const updatedData = { ...formData, estimatedHours: isNaN(numVal) ? 0 : numVal };
      setFormData(updatedData);
  };

  const handleGutChange = (field: 'g' | 'u' | 't', value: string) => {
      const numVal = parseInt(value);
      const newGut = { ...formData.gut!, [field]: numVal };
      const updatedData = { ...formData, gut: newGut };
      setFormData(updatedData);
      onSave(updatedData); 
  };

  const handleChangeAssignee = (id: string, name: string) => {
      const updatedData = { ...formData, assigneeId: id, assignee: name };
      setFormData(updatedData);
      onSave(updatedData);
      setActivePopover(null);
  };

  const handleToggleMember = (memberId: string) => {
      const current = formData.members || [];
      const newMembers = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId];
      const updatedData = { ...formData, members: newMembers };
      setFormData(updatedData);
      onSave(updatedData);
  };

  // --- SUBTASK LOGIC ---

  const handleAddSubtask = (e?: React.KeyboardEvent | React.MouseEvent) => {
      if (e && e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
      if (!newSubtask.trim()) return;

      const newItem: BpmnSubTask = { id: Date.now().toString(), text: newSubtask, completed: false };
      const updatedData = { ...formData, subtasks: [...(formData.subtasks || []), newItem] };
      setFormData(updatedData);
      setNewSubtask('');
      handleSave(updatedData);
  };

  const handleSubtaskUpdate = (subId: string, updates: Partial<BpmnSubTask>) => {
      const newSubs = formData.subtasks?.map(s => s.id === subId ? { ...s, ...updates } : s);
      const updatedData = { ...formData, subtasks: newSubs };
      setFormData(updatedData);
      handleSave(updatedData);
      setActiveSubtaskPopover(null);
  };

  const handlePromoteSubtask = async (subId: string) => {
      const sub = formData.subtasks?.find(s => s.id === subId);
      if (!sub || !organizationId) return;

      if (!confirm("Transformar este item em uma tarefa principal? Ele será removido deste checklist.")) return;

      try {
          // 1. Create new main task
          await createTask({
              titulo: sub.text,
              projeto: formData.projectId || null,
              status: 'todo',
              responsavel: sub.assigneeId || formData.assigneeId, // Inherit or use subtask assignee
              duracaohoras: sub.estimatedHours || 1,
              datainicio: sub.startDate || new Date().toISOString(),
              datafim: sub.dueDate || undefined,
              organizacao: organizationId,
              descricao: `Promovido de item de checklist da tarefa: ${formData.text}`,
              sutarefa: false
          });

          // 2. Remove from current checklist
          const newSubs = formData.subtasks?.filter(s => s.id !== subId);
          const updatedData = { ...formData, subtasks: newSubs };
          setFormData(updatedData);
          handleSave(updatedData);
          
      } catch (e) {
          console.error("Erro ao promover tarefa:", e);
          alert("Erro ao promover tarefa.");
      }
  };

  // --- AI & UPLOAD ---

  const handleGenerateSubtasks = async () => {
      setIsGeneratingAI(true);
      try {
          // Prepare team data for AI context
          const teamContext = orgMembers.map(m => ({
              id: m.id,
              name: m.nome,
              role: m.role
          }));

          const suggestions = await generateSubtasksForTask(
              formData.text, 
              `Projeto: ${opportunityTitle}. Desc: ${formData.description}`, 
              orgType,
              teamContext
          );

          if (suggestions && suggestions.length > 0) {
              const newItems: BpmnSubTask[] = suggestions.map(s => {
                  // Find assigned user object to get name
                  const assignedUser = s.assigneeId ? orgMembers.find(m => m.id === s.assigneeId) : null;
                  
                  return {
                      id: crypto.randomUUID(), 
                      text: s.title, 
                      completed: false, 
                      estimatedHours: s.hours,
                      assigneeId: s.assigneeId || undefined,
                      assignee: assignedUser ? assignedUser.nome : undefined
                  };
              });

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
          const currentUserInfo = orgMembers.find(m => m.id === user.id);
          setComments(prev => [{ 
              id: data.id, 
              text: data.mensagem, 
              created_at: data.created_at, 
              user: currentUserInfo?.nome || 'Eu',
              avatar_url: currentUserInfo?.avatar_url
          }, ...prev]);
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
      if (s === 'done') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      if (s === 'doing') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      if (s === 'review') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      if (s === 'approval') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';
  };

  const closePopover = () => {
      setActivePopover(null);
      setActiveSubtaskPopover(null);
      setNewLabelText('');
  };

  const toInputDate = (dateStr?: string) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0];
  };

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

  const gutScore = (formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1);

  const currentAssigneeUser = useMemo(() => {
      return orgMembers.find(m => m.id === formData.assigneeId);
  }, [formData.assigneeId, orgMembers]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <input type="file" hidden ref={attachmentInputRef} onChange={handleFileUpload} />
      <div className="w-full max-w-5xl bg-white dark:bg-[#121212] rounded-2xl shadow-2xl flex flex-col md:flex-row min-h-[600px] max-h-[90vh] text-slate-800 dark:text-slate-200 animate-in zoom-in-95 relative overflow-hidden border border-slate-200 dark:border-white/5">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full z-[120] transition-colors">
            <X className="w-5 h-5"/>
        </button>

        {/* --- MAIN CONTENT (LEFT) --- */}
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
                            className="text-2xl font-bold bg-transparent outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
                            placeholder="Título da tarefa..."
                        />
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            na lista <span className="font-semibold underline decoration-slate-300 dark:decoration-white/20">{nodeTitle}</span>
                            {opportunityTitle && <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-full">{opportunityTitle}</span>}
                        </div>
                    </div>
                </div>
                
                {/* Labels & People */}
                <div className="pl-9 flex flex-wrap items-center gap-4">
                    {/* GUT Badge */}
                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                        gutScore >= 60 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800' : 
                        gutScore >= 30 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800' : 
                        'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                    }`} title="Prioridade calculada (Gravidade x Urgência x Tendência)">
                        <BarChart3 className="w-3 h-3"/> Score: {gutScore}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 relative">
                        {formData.tags?.map(t => (
                            <span key={t} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-white/5">
                                <Tag className="w-3 h-3 opacity-50"/> {t} 
                                <button onClick={() => {
                                    const newTags = formData.tags?.filter(tag => tag !== t);
                                    setFormData({...formData, tags: newTags});
                                    onSave({...formData, tags: newTags});
                                }} className="hover:text-red-500 transition-colors ml-1"><X className="w-3 h-3"/></button>
                            </span>
                        ))}
                        
                        <button 
                            onClick={() => setActivePopover(activePopover === 'labels' ? null : 'labels')} 
                            className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors border border-dashed border-slate-300 dark:border-white/20"
                        >
                            + Tag
                        </button>
                        
                        {activePopover === 'labels' && (
                            <>
                                <div className="fixed inset-0 z-[40]" onClick={closePopover}></div>
                                <div className="absolute z-[50] top-full left-0 mt-2 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-white/10 p-2 rounded-lg animate-in fade-in zoom-in-95 origin-top-left min-w-[200px]">
                                    <input 
                                        autoFocus 
                                        placeholder="Nova etiqueta..." 
                                        value={newLabelText} 
                                        onChange={e => setNewLabelText(e.target.value)} 
                                        onKeyDown={e => { 
                                            if(e.key === 'Enter' && newLabelText) {
                                                const newTags = [...(formData.tags||[]), newLabelText];
                                                setFormData({...formData, tags: newTags});
                                                onSave({...formData, tags: newTags});
                                                closePopover();
                                            }
                                            if(e.key === 'Escape') closePopover();
                                        }}
                                        className="p-2 text-xs border border-slate-200 dark:border-white/10 rounded w-full bg-transparent outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2 hidden sm:block"></div>

                    {/* PEOPLE */}
                    <div className="flex items-center gap-3">
                        {/* Assignee */}
                        <div className="relative">
                            <button 
                                onClick={() => setActivePopover(activePopover === 'assignee' ? null : 'assignee')}
                                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 p-1 pr-3 rounded-full transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                                title="Responsável Principal"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-[#121212] overflow-hidden">
                                    {currentAssigneeUser?.avatar_url ? (
                                        <img src={currentAssigneeUser.avatar_url} alt="Assignee" className="w-full h-full object-cover"/>
                                    ) : (
                                        <span>{formData.assignee ? getInitials(formData.assignee) : <User className="w-4 h-4"/>}</span>
                                    )}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold leading-none mb-0.5">Responsável</span>
                                    <span className="text-xs text-slate-700 dark:text-slate-200 font-bold max-w-[100px] truncate leading-none">
                                        {formData.assignee || 'Sem dono'}
                                    </span>
                                </div>
                            </button>

                            {activePopover === 'assignee' && (
                                <>
                                    <div className="fixed inset-0 z-[40]" onClick={closePopover}></div>
                                    <div className="absolute z-[50] top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl p-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 origin-top-left">
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 mb-1">Definir Responsável</div>
                                        {orgMembers.map(m => (
                                            <button 
                                                key={m.id}
                                                onClick={() => handleChangeAssignee(m.id, m.nome)}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-3 text-sm transition-colors"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 overflow-hidden">
                                                    {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : getInitials(m.nome)}
                                                </div>
                                                <span className={`${formData.assigneeId === m.id ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {m.nome}
                                                </span>
                                                {formData.assigneeId === m.id && <Check className="w-3 h-3 text-blue-500 ml-auto"/>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Members Stack */}
                        <div className="flex items-center relative pl-2">
                            <div className="flex items-center -space-x-2 mr-2">
                                {orgMembers.filter(m => (formData.members || []).includes(m.id)).map(m => (
                                    <div key={m.id} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-[#121212] flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white overflow-hidden" title={m.nome}>
                                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : getInitials(m.nome)}
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={() => setActivePopover(activePopover === 'members' ? null : 'members')}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all z-10"
                                title="Gerenciar Participantes"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            {/* Members Popover */}
                            {activePopover === 'members' && (
                                <>
                                    <div className="fixed inset-0 z-[40]" onClick={closePopover}></div>
                                    <div className="absolute z-[50] top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl p-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 origin-top-left">
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 mb-1">
                                            <Users className="w-3 h-3"/> Participantes
                                        </div>
                                        {orgMembers.map(m => {
                                            const isSelected = (formData.members || []).includes(m.id);
                                            return (
                                                <button 
                                                    key={m.id}
                                                    onClick={() => handleToggleMember(m.id)}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-3 text-sm transition-colors group"
                                                >
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                                                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : getInitials(m.nome)}
                                                    </div>
                                                    <span className={`${isSelected ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {m.nome}
                                                    </span>
                                                    {isSelected && <Check className="w-3 h-3 text-blue-500 ml-auto"/>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                    <AlignLeft className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-base">Descrição</h3>
                </div>
                <div className="pl-8">
                    <textarea 
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        onBlur={() => handleSave()}
                        className="w-full min-h-[120px] bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-300 leading-relaxed transition-all focus:bg-white dark:focus:bg-black/40"
                        placeholder="Adicione detalhes, contexto ou instruções..."
                    />
                </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3" id="checklist-section">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                        <CheckSquare className="w-5 h-5 text-slate-400" />
                        <h3 className="font-bold text-base">Checklist</h3>
                    </div>
                    <button onClick={handleGenerateSubtasks} disabled={isGeneratingAI} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                        {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} 
                        Gerar com IA
                    </button>
                </div>
                <div className="pl-8 space-y-2">
                    {/* Progress Bar */}
                    {formData.subtasks && formData.subtasks.length > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-[10px] font-bold text-slate-400">{Math.round((formData.subtasks.filter(s=>s.completed).length / formData.subtasks.length) * 100)}%</span>
                            <div className="h-1.5 flex-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${(formData.subtasks.filter(s=>s.completed).length / formData.subtasks.length) * 100}%` }}></div>
                            </div>
                        </div>
                    )}
                    
                    {formData.subtasks?.map(sub => (
                        <div key={sub.id} className="flex items-start gap-3 group animate-in slide-in-from-left-2 duration-300 relative">
                            {/* Checkbox */}
                            <button 
                                onClick={() => handleSubtaskUpdate(sub.id, { completed: !sub.completed })}
                                className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${sub.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-white/20 hover:border-blue-400'}`}
                            >
                                {sub.completed && <Check className="w-3 h-3"/>}
                            </button>
                            
                            {/* Text */}
                            <span className={`text-sm flex-1 leading-snug transition-all mt-0.5 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                {sub.text}
                            </span>

                            {/* Actions Group */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                
                                {/* Date Trigger */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setActiveSubtaskPopover(activeSubtaskPopover === `sub_${sub.id}_date` ? null : `sub_${sub.id}_date`)}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] font-bold transition-colors ${sub.dueDate ? 'text-blue-500' : 'text-slate-400'}`}
                                        title="Definir Data"
                                    >
                                        <Calendar className="w-3 h-3"/>
                                        {sub.dueDate ? new Date(sub.dueDate).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'}) : ''}
                                    </button>
                                    
                                    {activeSubtaskPopover === `sub_${sub.id}_date` && (
                                        <>
                                            <div className="fixed inset-0 z-[40]" onClick={closePopover}></div>
                                            <div className="absolute z-[50] right-0 mt-1 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-white/10 p-2 rounded-lg min-w-[150px]">
                                                <input 
                                                    type="date" 
                                                    value={toInputDate(sub.dueDate)} 
                                                    onChange={(e) => handleSubtaskUpdate(sub.id, { dueDate: e.target.value })}
                                                    className="w-full p-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Assignee Trigger */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setActiveSubtaskPopover(activeSubtaskPopover === `sub_${sub.id}_assignee` ? null : `sub_${sub.id}_assignee`)}
                                        className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[10px] text-slate-500 hover:border-blue-500 overflow-hidden"
                                        title={sub.assignee || "Atribuir Responsável"}
                                    >
                                        {(() => {
                                            const assignedUser = orgMembers.find(m => m.id === sub.assigneeId);
                                            if (assignedUser?.avatar_url) return <img src={assignedUser.avatar_url} className="w-full h-full object-cover"/>;
                                            return sub.assignee ? getInitials(sub.assignee) : <User className="w-3 h-3"/>;
                                        })()}
                                    </button>

                                    {activeSubtaskPopover === `sub_${sub.id}_assignee` && (
                                        <>
                                            <div className="fixed inset-0 z-[40]" onClick={closePopover}></div>
                                            <div className="absolute z-[50] right-0 mt-1 w-48 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-white/10 rounded-lg p-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {orgMembers.map(m => (
                                                    <button 
                                                        key={m.id}
                                                        onClick={() => handleSubtaskUpdate(sub.id, { assigneeId: m.id, assignee: m.nome })}
                                                        className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2 text-xs transition-colors"
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 overflow-hidden">
                                                            {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : getInitials(m.nome)}
                                                        </div>
                                                        <span className="truncate flex-1 text-slate-700 dark:text-slate-200">{m.nome}</span>
                                                        {sub.assigneeId === m.id && <Check className="w-3 h-3 text-blue-500"/>}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Promote Button */}
                                <button 
                                    onClick={() => handlePromoteSubtask(sub.id)} 
                                    className="text-slate-400 hover:text-purple-500 transition-colors p-1"
                                    title="Promover para Tarefa Principal"
                                >
                                    <ArrowUpRight className="w-4 h-4"/>
                                </button>

                                {/* Delete Button */}
                                <button 
                                    onClick={() => {
                                        const newSubs = formData.subtasks?.filter(s => s.id !== sub.id);
                                        setFormData({...formData, subtasks: newSubs});
                                        handleSave({...formData, subtasks: newSubs});
                                    }} 
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    <div className="flex gap-2 mt-3 group">
                        <div className="flex-1 relative">
                            <input 
                                ref={checklistInputRef}
                                value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={handleAddSubtask}
                                className="w-full bg-slate-50 dark:bg-white/5 px-4 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-slate-900 dark:text-white placeholder-slate-400" 
                                placeholder="Adicionar item..."
                            />
                            <Plus className="w-4 h-4 absolute right-3 top-3 text-slate-400 opacity-50"/>
                        </div>
                        <button onClick={handleAddSubtask} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20">Adicionar</button>
                    </div>
                </div>
            </div>

            {/* Attachments */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                    <Paperclip className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-base">Anexos</h3>
                </div>
                <div className="pl-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formData.attachments?.map(att => (
                        <div key={att.id} className="p-3 border border-slate-200 dark:border-white/10 rounded-xl flex items-center gap-3 group bg-white dark:bg-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 flex items-center justify-center rounded-lg text-slate-500 shrink-0"><FileIcon className="w-5 h-5"/></div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-xs font-bold truncate text-slate-700 dark:text-slate-200" title={att.name}>{att.name}</div>
                                <div className="text-[10px] text-slate-400">{att.size}</div>
                            </div>
                            <a href={att.url} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs gap-1">
                                <ExternalLink className="w-4 h-4"/> Abrir
                            </a>
                        </div>
                    ))}
                    <button 
                        onClick={() => attachmentInputRef.current?.click()}
                        className="p-3 border border-dashed border-slate-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all h-[66px]"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Plus className="w-5 h-5"/>}
                        <span className="text-[10px] font-bold uppercase">Upload</span>
                    </button>
                </div>
            </div>

            {/* Activity */}
            <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/5 mt-6">
                <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                    <Activity className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-base">Atividade</h3>
                </div>
                <div className="pl-8 space-y-4">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">EU</div>
                        <div className="flex-1 relative">
                            <input 
                                value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                                placeholder="Escreva um comentário..."
                            />
                            <button onClick={handleAddComment} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-500 transition-colors"><Save className="w-4 h-4"/></button>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 border border-white dark:border-[#121212] overflow-hidden">
                                    {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover"/> : c.user.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{c.user}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-slate-700 dark:text-slate-300 shadow-sm leading-relaxed">
                                        {c.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* --- SIDEBAR (RIGHT) --- */}
        <div className="w-full md:w-72 bg-slate-50 dark:bg-[#0f0f0f] border-l border-slate-200 dark:border-white/5 flex flex-col overflow-y-auto custom-scrollbar relative">
            
            <div className="p-5 space-y-6">
                
                {/* Status Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                    <div className="relative">
                        <select 
                            value={formData.status} 
                            onChange={e => {
                                setFormData({...formData, status: e.target.value as any});
                                onSave({...formData, status: e.target.value as any});
                            }}
                            className={`w-full p-3 rounded-xl text-xs font-bold appearance-none outline-none cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all ${getStatusColor(formData.status)}`}
                        >
                            <option value="todo">A Fazer</option>
                            <option value="doing">Fazendo</option>
                            <option value="review">Revisão</option>
                            <option value="approval">Aprovação</option>
                            <option value="done">Concluído</option>
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none opacity-50">▼</div>
                    </div>
                </div>

                {/* Estimated Hours */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3"/> Estimativa
                    </label>
                    <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-xl">
                        <input 
                            type="number" 
                            min="0"
                            value={formData.estimatedHours || ''}
                            onChange={e => handleHoursChange(e.target.value)}
                            onBlur={() => handleSave()}
                            className="w-full bg-transparent p-2 text-sm font-bold text-slate-700 dark:text-white outline-none text-center"
                            placeholder="0"
                        />
                        <span className="text-xs font-bold text-slate-400 pr-3">Horas</span>
                    </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3"/> Datas
                    </label>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 w-10">Início</span>
                            <input 
                                type="date" 
                                value={toInputDate(formData.startDate)} 
                                onChange={e => handleDateChange('startDate', e.target.value)} 
                                className="flex-1 bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 w-10">Fim</span>
                            <input 
                                type="date" 
                                value={toInputDate(formData.dueDate)} 
                                onChange={e => handleDateChange('dueDate', e.target.value)} 
                                className="flex-1 bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* GUT Matrix (Sidebar Widget) */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3"/> Matriz G.U.T.</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{gutScore} pts</span>
                    </label>
                    
                    <div className="space-y-3 bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                <span>Gravidade</span>
                                <span>{formData.gut?.g || 1}</span>
                            </div>
                            <input type="range" min="1" max="5" value={formData.gut?.g || 1} onChange={e => handleGutChange('g', e.target.value)} className="w-full h-1.5 bg-slate-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                <span>Urgência</span>
                                <span>{formData.gut?.u || 1}</span>
                            </div>
                            <input type="range" min="1" max="5" value={formData.gut?.u || 1} onChange={e => handleGutChange('u', e.target.value)} className="w-full h-1.5 bg-slate-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                <span>Tendência</span>
                                <span>{formData.gut?.t || 1}</span>
                            </div>
                            <input type="range" min="1" max="5" value={formData.gut?.t || 1} onChange={e => handleGutChange('t', e.target.value)} className="w-full h-1.5 bg-slate-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                    </div>
                </div>

                {/* Metadata Footer */}
                <div className="pt-6 mt-auto text-[10px] text-slate-400 font-mono space-y-1 border-t border-slate-200 dark:border-white/5">
                    <div className="flex justify-between">
                        <span>ID:</span>
                        <span className="select-all">{task.dbId || task.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Criado:</span>
                        <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>

                <button onClick={() => onDelete && onDelete(task.id)} className="w-full mt-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-3 h-3"/> Arquivar Tarefa
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
