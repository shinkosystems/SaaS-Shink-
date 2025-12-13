
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, TaskStatus, Attachment } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2, AlignLeft, Clock, PlayCircle, CheckCircle, BarChart3, Timer, Sparkles, Loader2, ArrowLeft, Layers, Hash, Eye, ShieldCheck, CornerDownRight, ChevronDown, Check, Paperclip, UploadCloud, File as FileIcon, ExternalLink, ArrowUpRight, Save, CreditCard, Tag, Activity, Info, Send } from 'lucide-react';
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
      tags: Array.isArray(task.tags) ? task.tags : []
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{id: number, text: string, user: string, created_at: string}[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  
  // Popover State
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null); // Subtask ID being edited for date/assignee

  // Label State
  const [newLabelText, setNewLabelText] = useState('');

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes to state (Critical for external updates)
  useEffect(() => {
      setFormData(prev => ({
          ...prev,
          ...task,
          // Preserve local edits if keys are missing in update
          members: Array.isArray(task.members) ? task.members : prev.members,
          tags: Array.isArray(task.tags) ? task.tags : prev.tags,
          subtasks: task.subtasks || prev.subtasks
      }));
  }, [task.id, task.status, task.dueDate, JSON.stringify(task.members), JSON.stringify(task.tags)]);

  // Fetch contextual data
  useEffect(() => {
      const loadData = async () => {
          // STRICT FILTERING: Only fetch if organizationId is present
          if (!organizationId) {
              console.warn("TaskDetailModal: No Organization ID provided. Members list will be empty.");
              setOrgMembers([]);
              return;
          }

          // Ensure email is selected
          let query = supabase.from('users')
              .select('id, nome, perfil, avatar_url, email')
              .eq('organizacao', organizationId) 
              .order('nome');
          
          const { data } = await query;
          if (data) setOrgMembers(data);
          
          if (task.dbId) {
              const { data: commentsData } = await supabase
                  .from('comentarios')
                  .select('id, mensagem, created_at, usuario')
                  .eq('task', task.dbId)
                  .order('created_at', { ascending: false });
              
              if(commentsData) {
                  const mappedComments = await Promise.all(commentsData.map(async (c: any) => {
                      const { data: u } = await supabase.from('users').select('nome').eq('id', c.usuario).single();
                      return {
                          id: c.id,
                          text: c.mensagem,
                          created_at: c.created_at,
                          user: u?.nome || 'Usuário'
                      };
                  }));
                  setComments(mappedComments);
              }
          }
      };
      loadData();
  }, [task.dbId, organizationId]);

  const handleSave = (dataToSave = formData) => {
      onSave(dataToSave);
  };

  // --- ACTIONS ---

  const handleToggleMember = (memberId: string) => {
      if (!memberId) return;

      const currentMembers = formData.members ? [...formData.members] : [];
      let newMembers: string[];
      
      // Toggle logic using strict ID comparison
      if (currentMembers.includes(memberId)) {
          newMembers = currentMembers.filter(id => id !== memberId);
      } else {
          newMembers = [...currentMembers, memberId];
      }
      
      const updatedData = { ...formData, members: newMembers };
      setFormData(updatedData); // Update Local State
      onSave(updatedData); // Trigger Parent Update & DB Save
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
      const updatedData = { ...formData, tags: (formData.tags || []).filter(t => t !== tag) };
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
      if (!file || !onAttach) return;
      alert("Funcionalidade de upload será conectada ao storage em breve.");
  };

  const scrollToChecklist = () => {
      const el = document.getElementById('checklist-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => checklistInputRef.current?.focus(), 500);
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

  const calcDuration = (start?: string, end?: string) => {
      if (!start || !end) return '-';
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const days = Math.floor(diff / (1000 * 3600 * 24));
      const hours = Math.floor((diff % (1000 * 3600 * 24)) / (1000 * 3600));
      if (days > 0) return `${days}d ${hours}h`;
      return `${hours}h`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => {
        if(e.target === e.currentTarget) onClose();
    }}>
      
      <div className="w-full max-w-4xl bg-transparent rounded-xl shadow-2xl relative flex flex-col md:flex-row min-h-[600px] text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Invisible Backdrop for closing Popovers */}
        {activePopover && (
            <div 
                className="fixed inset-0 z-[45]" 
                onClick={(e) => {
                    e.stopPropagation();
                    setActivePopover(null);
                }}
            />
        )}

        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors z-[60]">
            <X className="w-5 h-5"/>
        </button>

        {/* LEFT COLUMN - MAIN CONTENT */}
        <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1a1a] md:rounded-l-xl relative z-10">
            
            {/* Header Area */}
            <div className="space-y-4">
                {/* Labels Display */}
                {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-9">
                        {formData.tags.map((tag, idx) => (
                            <span key={idx} className="group relative px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-default transition-all hover:pr-6">
                                {tag}
                                <button 
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

            {/* Meta Data Row (Members, Status, Dates) */}
            <div className="pl-9 flex flex-wrap gap-6">
                {/* Members */}
                <div className="space-y-1.5 relative">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Membros</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Main Assignee */}
                        {formData.assigneeId && (
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 pr-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors" title="Responsável Principal">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-[#1a1a1a]">
                                    {orgMembers.find(m => m.id === formData.assigneeId)?.nome.charAt(0) || 'U'}
                                </div>
                                <span className="text-xs font-medium">{orgMembers.find(m => m.id === formData.assigneeId)?.nome.split(' ')[0]}</span>
                            </div>
                        )}
                        
                        {/* Other Members */}
                        {formData.members?.map(mid => {
                            // Find member by ID only
                            const mem = orgMembers.find(m => m.id === mid);
                            if (!mem) return null;
                            if (mem.id === formData.assigneeId) return null; // Skip duplicates of main assignee

                            return (
                                <div key={mid} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold shadow-sm ring-2 ring-white dark:ring-[#1a1a1a]" title={mem.nome || 'Membro'}>
                                    {mem.nome.charAt(0)}
                                </div>
                            );
                        })}

                        <button 
                            onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'members-inline' ? null : 'members-inline'); }}
                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <Plus className="w-4 h-4"/>
                        </button>
                    </div>

                    {/* Members Popover Inline */}
                    {activePopover === 'members-inline' && (
                        <div className="absolute top-10 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95">
                            <div className="p-3 border-b border-slate-100 dark:border-white/5 font-bold text-xs text-slate-500 uppercase">
                                Adicionar membros
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                                {orgMembers.length === 0 && <div className="p-3 text-xs text-slate-500 text-center">Nenhum membro encontrado.</div>}
                                {orgMembers.map(m => {
                                    // Check if user ID is in array
                                    const isSelected = (formData.members || []).includes(m.id) || formData.assigneeId === m.id;
                                    
                                    return (
                                        <button 
                                            key={m.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // STRICT ID USAGE
                                                handleToggleMember(m.id);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-sm flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                                    {m.nome.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 dark:text-slate-200">{m.nome}</span>
                                                    <span className="text-[10px] text-slate-400">{m.email}</span>
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

                {/* Status / Labels */}
                <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Status</h4>
                    <div className="flex items-center gap-2">
                        <select 
                            value={formData.status}
                            onChange={e => {
                                setFormData({...formData, status: e.target.value as any});
                                handleSave({...formData, status: e.target.value as any});
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

                {/* Dates */}
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

            {/* Description */}
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

            {/* Checklist */}
            <div className="space-y-3" id="checklist-section">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        <h3 className="font-bold text-base text-slate-800 dark:text-white">Checklist</h3>
                    </div>
                    {formData.subtasks && formData.subtasks.length > 0 && (
                        <button 
                            onClick={() => setFormData({...formData, subtasks: formData.subtasks?.filter(s => !s.completed)})}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
                        >
                            Ocultar concluídos
                        </button>
                    )}
                </div>
                
                <div className="pl-9 space-y-3">
                    {/* Progress Bar */}
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
                                <div className="flex items-start gap-3">
                                    <button 
                                        onClick={() => {
                                            const newSubs = formData.subtasks?.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                                            setFormData({...formData, subtasks: newSubs});
                                            handleSave();
                                        }}
                                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all ${sub.completed ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-black border-slate-300 dark:border-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {sub.completed && <Check className="w-3 h-3"/>}
                                    </button>
                                    
                                    <div className="flex-1">
                                        <span className={`text-sm block ${sub.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {sub.text}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => {
                                            setFormData({...formData, subtasks: formData.subtasks?.filter(s => s.id !== sub.id)});
                                            handleSave();
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-2">
                        <input 
                            ref={checklistInputRef}
                            type="text" 
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && newSubtask.trim()) {
                                    setFormData(prev => ({
                                        ...prev, 
                                        subtasks: [...(prev.subtasks||[]), {id: Date.now().toString(), text: newSubtask, completed: false}]
                                    }));
                                    setNewSubtask('');
                                    // Auto save on add
                                    setTimeout(() => handleSave(), 100);
                                }
                            }}
                            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-slate-500"
                            placeholder="Adicionar um item..."
                        />
                    </div>
                </div>
            </div>

            {/* Activity / Comments */}
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
                    {/* Input */}
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
                            {newComment && (
                                <div className="p-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400">Pressione Enter para salvar</span>
                                    <button onClick={handleAddComment} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors">Salvar</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* List */}
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

        {/* RIGHT COLUMN - SIDEBAR ACTIONS */}
        <div className="w-full md:w-48 bg-slate-100 dark:bg-[#121212] p-4 pt-12 space-y-6 md:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 md:rounded-r-xl relative z-20">
            
            <div className="space-y-2 relative">
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Adicionar ao cartão</h5>
                
                {/* Add Member Button */}
                <div className="relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'members-sidebar' ? null : 'members-sidebar'); }}
                        className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <User className="w-4 h-4"/> Membros
                    </button>
                    {activePopover === 'members-sidebar' && (
                        <div className="absolute top-0 right-[110%] mr-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95">
                            <div className="p-3 border-b border-slate-100 dark:border-white/5 font-bold text-xs text-slate-500 uppercase flex justify-between items-center">
                                <span>Membros</span>
                                <button onClick={() => setActivePopover(null)}><X className="w-3 h-3"/></button>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                                {orgMembers.length === 0 && <div className="p-3 text-xs text-slate-500 text-center">Nenhum membro disponível.</div>}
                                {orgMembers.map(m => {
                                    // Same Logic for Sidebar - STRICT ID
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

                {/* Add Labels Button - With CRUD */}
                <div className="relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'labels-sidebar' ? null : 'labels-sidebar'); }}
                        className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <Tag className="w-4 h-4"/> Etiquetas
                    </button>
                    {activePopover === 'labels-sidebar' && (
                        <div className="absolute top-0 right-[110%] mr-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95">
                            <div className="font-bold text-xs text-slate-500 uppercase mb-2 flex justify-between items-center">
                                <span>Etiquetas</span>
                                <button onClick={() => setActivePopover(null)}><X className="w-3 h-3"/></button>
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
                                {(formData.tags || []).map(tag => (
                                    <div 
                                        key={tag}
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-slate-100 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 group"
                                    >
                                        <span>{tag}</span>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleRemoveLabel(e, tag)} 
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-white dark:hover:bg-white/10 transition-colors"
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
                    onClick={scrollToChecklist}
                    className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                >
                    <CheckSquare className="w-4 h-4"/> Checklist
                </button>
                
                {/* Dates Button */}
                <div className="relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'dates-sidebar' ? null : 'dates-sidebar'); }}
                        className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                    >
                        <Clock className="w-4 h-4"/> Datas
                    </button>
                    {activePopover === 'dates-sidebar' && (
                        <div className="absolute top-0 right-[110%] mr-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95">
                            <div className="font-bold text-xs text-slate-500 uppercase mb-3 flex justify-between items-center">
                                <span>Definir Datas</span>
                                <button onClick={() => setActivePopover(null)}><X className="w-3 h-3"/></button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Início</label>
                                    <input 
                                        type="date"
                                        value={formData.startDate || ''}
                                        onChange={(e) => {
                                            setFormData({...formData, startDate: e.target.value});
                                            handleSave();
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
                                            setFormData({...formData, dueDate: e.target.value});
                                            handleSave();
                                        }}
                                        className="w-full p-2 bg-slate-100 dark:bg-black/20 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => attachmentInputRef.current?.click()}
                    className="w-full text-left px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-2"
                >
                    <Paperclip className="w-4 h-4"/> Anexo
                    <input 
                        type="file" 
                        hidden 
                        ref={attachmentInputRef}
                        onChange={handleFileUpload}
                    />
                </button>
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Ações</h5>
                {onDelete && (
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="w-full text-left px-3 py-1.5 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 rounded text-sm text-red-600 dark:text-red-400 font-medium transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4"/> Arquivar
                    </button>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
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
