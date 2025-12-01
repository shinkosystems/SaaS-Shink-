
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, TaskStatus } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2, AlignLeft, Clock, PlayCircle, CheckCircle, BarChart3, Timer, Sparkles, Loader2, ArrowLeft, Layers, Hash, Eye, ShieldCheck, CornerDownRight, ChevronDown, Check } from 'lucide-react';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { logEvent } from '../services/analyticsService';
import { syncSubtasks, updateTask, fetchSubtasks } from '../services/projectService';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => void;
  onClose: () => void;
  onOpenProject?: () => void;
  onDelete?: (id: string) => void;
}

export interface OrgMember {
    id: string;
    nome: string;
    perfil: string;
}

// Helper to format ISO string to datetime-local input format (YYYY-MM-DDThh:mm)
const toInputFormat = (isoString?: string) => {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
        return '';
    }
};

// Helper to convert datetime-local input back to ISO string
const fromInputFormat = (inputValue: string) => {
    if (!inputValue) return undefined;
    try {
        return new Date(inputValue).toISOString();
    } catch (e) {
        return undefined;
    }
};

// --- INTERNAL MULTI-SELECT COMPONENT ---
const MultiUserSelect = ({ 
    members, 
    selectedIds, 
    onChange, 
    label = "Selecionar" 
}: { 
    members: OrgMember[], 
    selectedIds: string[], 
    onChange: (ids: string[]) => void,
    label?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleId = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(sid => sid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectedCount = selectedIds.length;
    const displayLabel = selectedCount === 0 ? label : 
                         selectedCount === 1 ? members.find(m => m.id === selectedIds[0])?.nome.split(' ')[0] : 
                         `${selectedCount} selecionados`;

    return (
        <div className="relative" ref={wrapperRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-xs font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 px-3 py-2.5 rounded hover:border-purple-500 transition-colors min-w-[120px] justify-between text-slate-700 dark:text-slate-300 min-h-[40px]"
            >
                <span className="truncate max-w-[100px]">{displayLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-50"/>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto p-1">
                    {members.map(m => {
                        const isSelected = selectedIds.includes(m.id);
                        return (
                            <div 
                                key={m.id} 
                                onClick={() => toggleId(m.id)}
                                className={`flex items-center gap-2 p-3 text-xs cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-white/5 ${isSelected ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-400'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white"/>}
                                </div>
                                {m.nome}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onOpenProject, onDelete }) => {
  const [formData, setFormData] = useState<BpmnTask>({
    ...task,
    subtasks: task.subtasks || [],
    status: task.status || (task.completed ? 'done' : 'todo'),
    gut: task.gut || { g: 1, u: 1, t: 1 },
    estimatedHours: task.estimatedHours || 2,
    startDate: task.startDate || new Date().toISOString(),
    dueDate: task.dueDate || new Date().toISOString()
  });

  const [newSubtask, setNewSubtask] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Modified state to include assigneeId per suggestion
  const [aiSuggestions, setAiSuggestions] = useState<{title: string, hours: number, assigneeIds: string[]}[]>([]);
  
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [currentUser, setCurrentUser] = useState<{id: string, nome: string} | null>(null);
  
  // State for bulk assignment of AI tasks
  const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);

  // Carrega subtarefas frescas do banco ao montar
  const loadSubtasks = async () => {
      const taskId = Number(formData.id);
      if (!isNaN(taskId)) {
          const freshSubtasks = await fetchSubtasks(taskId);
          setFormData(prev => ({
              ...prev,
              subtasks: freshSubtasks
          }));
      }
  };

  useEffect(() => {
      loadSubtasks();
  }, [task.id]);

  // Fetch Users from Organization
  useEffect(() => {
      const fetchOrgMembers = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const { data: userData } = await supabase
                  .from('users')
                  .select('id, nome, organizacao')
                  .eq('id', user.id)
                  .single();

              if (userData) {
                  setCurrentUser({ id: userData.id, nome: userData.nome });
                  setBulkAssigneeIds([userData.id]); // Default to current user

                  if (userData.organizacao) {
                      const { data: members } = await supabase
                          .from('users')
                          .select('id, nome, perfil')
                          .eq('organizacao', userData.organizacao)
                          .order('nome');
                      
                      if (members) {
                          setOrgMembers(members);
                      }
                  }
              }
          }
      };
      fetchOrgMembers();
  }, []);

  const handleChange = (field: keyof BpmnTask, value: any) => {
    setFormData(prev => {
        const updated = { ...prev, [field]: value };
        if (field === 'status') {
            updated.completed = value === 'done';
        }
        return updated;
    });
  };

  const handleGutChange = (key: 'g'|'u'|'t', value: number) => {
      setFormData(prev => ({
          ...prev,
          gut: { ...prev.gut!, [key]: value }
      }));
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const sub: BpmnSubTask = {
      id: crypto.randomUUID(), // UI ID
      text: newSubtask,
      completed: false,
      // Assign to current user by default
      assigneeId: currentUser?.id,
      assignee: currentUser?.nome
    };
    setFormData(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), sub] }));
    setNewSubtask('');
  };

  const updateSubtask = (subId: string, field: keyof BpmnSubTask, value: any) => {
      setFormData(prev => ({
          ...prev,
          subtasks: prev.subtasks?.map(s => s.id === subId ? { ...s, [field]: value } : s)
      }));
  };

  const toggleSubtask = (subId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map(s => s.id === subId ? { ...s, completed: !s.completed } : s)
    }));
  };

  const deleteSubtask = (subId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(s => s.id !== subId)
    }));
  };

  const handleAiGenerate = async () => {
      if (!formData.text.trim()) {
          alert("Por favor, adicione um título à tarefa antes de gerar o checklist.");
          return;
      }

      setIsGenerating(true);
      setAiSuggestions([]); // Reset previous suggestions
      try {
          const context = `${nodeTitle} - ${opportunityTitle || ''}. Start: ${formData.startDate}. Due: ${formData.dueDate}`;
          let generated = await generateSubtasksForTask(formData.text, context);
          
          // Auto-fix mechanism for missing key (if result empty, try to open selector)
          if (generated.length === 0 && (window as any).aistudio) {
               try {
                   const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                   if (!hasKey) {
                       await (window as any).aistudio.openSelectKey();
                       // Retry once
                       generated = await generateSubtasksForTask(formData.text, context);
                   }
               } catch(e) {
                   console.error("AI Key retry failed", e);
               }
          }
          
          if (generated && generated.length > 0) {
              // BALANCEAMENTO (Round Robin)
              // Se houver usuários selecionados em massa, distribui as tarefas sequencialmente entre eles
              // em vez de duplicar a tarefa para todos.
              const defaultIds = bulkAssigneeIds.length > 0 ? bulkAssigneeIds : (currentUser?.id ? [currentUser.id] : []);
              
              const mappedSuggestions = generated.map((item, index) => {
                  // Round robin: index % numero_de_usuarios
                  const balancedUserId = defaultIds[index % defaultIds.length];
                  return {
                      ...item,
                      assigneeIds: [balancedUserId] // Atribui apenas um usuário por tarefa para balancear
                  };
              });

              setAiSuggestions(mappedSuggestions);
              logEvent('feature_use', { feature: 'AI Subtasks Generated' });
          } else {
              alert("A IA não gerou sugestões. Verifique a chave de API ou o contexto.");
          }
      } catch (e) {
          console.error(e);
          alert("Erro ao conectar com a IA.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleBulkAssignChange = (newIds: string[]) => {
      setBulkAssigneeIds(newIds);
      
      // Ao mudar a seleção em massa, redistribuímos as tarefas existentes (Round Robin)
      // para não criar duplicatas, mas sim balancear a carga.
      if (newIds.length > 0) {
          setAiSuggestions(prev => prev.map((item, index) => {
              const balancedUserId = newIds[index % newIds.length];
              return {
                  ...item,
                  assigneeIds: [balancedUserId]
              };
          }));
      } else {
          // Se limpar a seleção, volta para o usuário atual (fallback)
          const fallbackId = currentUser?.id ? [currentUser.id] : [];
          setAiSuggestions(prev => prev.map(item => ({ ...item, assigneeIds: fallbackId })));
      }
  };

  const handleIndividualAssignChange = (index: number, newIds: string[]) => {
      setAiSuggestions(prev => prev.map((item, i) => 
          i === index ? { ...item, assigneeIds: newIds } : item
      ));
  };

  const confirmAiSuggestions = async () => {
      if (aiSuggestions.length === 0) return;

      // SMART SCHEDULING ALGORITHM (Reajuste Realista)
      const parentStart = formData.startDate ? new Date(formData.startDate) : new Date();
      const originalParentEnd = formData.dueDate ? new Date(formData.dueDate) : new Date();
      
      // Cursor for planning - Start from Parent Start
      let currentCursor = new Date(parentStart);
      
      // Daily work hours assumption
      const WORK_HOURS_PER_DAY = 8;
      let totalCalculatedHours = 0;
      
      // Track max end date to update parent task later if needed
      let newMaxEndDate = new Date(parentStart);

      const newSubs: BpmnSubTask[] = [];

      // Process Suggestions and Split if Multiple Assignees (caso o usuário force manualmente múltiplos na linha)
      aiSuggestions.forEach((item) => {
          const targetAssignees = item.assigneeIds.length > 0 ? item.assigneeIds : [currentUser?.id];
          
          targetAssignees.forEach(userId => {
              if (!userId) return; // Skip invalid

              const start = new Date(currentCursor);
              
              // Accumulate total hours for the parent task estimation
              totalCalculatedHours += item.hours;

              // Calculate duration in days (rounding up)
              const durationDays = Math.ceil(item.hours / WORK_HOURS_PER_DAY);
              const end = new Date(currentCursor);
              
              // Set end date (Duration - 1 day because start counts as day 1, but minimum same day)
              end.setDate(end.getDate() + (durationDays > 0 ? durationDays - 1 : 0));
              end.setHours(18, 0, 0, 0); // End of business day

              // Update Global Max End Date tracking
              if (end > newMaxEndDate) {
                  newMaxEndDate = new Date(end);
              }

              // Find assignee Name for UI
              const assigneeObj = orgMembers.find(m => m.id === userId);

              newSubs.push({
                  id: crypto.randomUUID(),
                  text: item.title, // Keep original title, assignee column distinguishes them
                  completed: false,
                  startDate: start.toISOString(),
                  dueDate: end.toISOString(),
                  estimatedHours: item.hours,
                  assigneeId: userId,
                  assignee: assigneeObj?.nome || 'Desconhecido'
              });
          });

          // After processing this item (for all users), advance the cursor
          // If allocated to multiple people, we assume they work in parallel, so we advance based on the item duration once
          // OR simpler: Sequential. Let's do sequential to be safe on deadlines.
          const durationDays = Math.ceil(item.hours / WORK_HOURS_PER_DAY);
          currentCursor.setDate(currentCursor.getDate() + durationDays);
          currentCursor.setHours(9, 0, 0, 0); // Start of business day
      });

      // Check if we need to extend the parent task deadline
      let updatedDueDate = formData.dueDate;
      let deadlineExtended = false;

      if (newMaxEndDate > originalParentEnd) {
          updatedDueDate = newMaxEndDate.toISOString();
          deadlineExtended = true;
      }

      // 1. Update Local State (Provisório para UI responder rápido)
      const updatedFormData = {
          ...formData,
          subtasks: [...(formData.subtasks || []), ...newSubs],
          estimatedHours: totalCalculatedHours, // Update total hours to sum of subtasks
          dueDate: updatedDueDate
      };
      setFormData(updatedFormData);

      // 2. Sync to DB Immediately (Parent Update + Subtasks Insert)
      if (!isNaN(Number(formData.id))) {
          try {
              // Update Parent Task (New Deadline + New Hours)
              await updateTask(Number(formData.id), {
                  duracaohoras: totalCalculatedHours,
                  datafim: updatedDueDate,
                  // deadline: updatedDueDate // REMOVED to avoid error
              });

              // Insert Subtasks
              await syncSubtasks(Number(formData.id), newSubs.map(s => ({
                  nome: s.text,
                  status: 'todo',
                  dueDate: s.dueDate,
                  startDate: s.startDate,
                  estimatedHours: s.estimatedHours,
                  assigneeId: s.assigneeId
              })));

              // 3. Recarrega do banco para garantir que temos os IDs reais
              await loadSubtasks();

              let alertMsg = `${newSubs.length} subtarefas criadas!`;
              if (deadlineExtended) {
                  alertMsg += `\n\nNota: A data de entrega da tarefa principal foi estendida automaticamente para ${newMaxEndDate.toLocaleDateString()} para acomodar o trabalho.`;
              }
              alert(alertMsg);

          } catch (err) {
              console.error("Erro ao salvar subtarefas automáticas:", err);
              alert("Erro ao salvar no banco de dados.");
          }
      }

      setAiSuggestions([]); // Clear suggestions after adding
      logEvent('feature_use', { feature: 'AI Subtasks Confirmed' });
  };

  const discardAiSuggestions = () => {
      setAiSuggestions([]);
  };

  const handleSave = async () => {
    logEvent('feature_use', { feature: 'Save Task' });
    
    // Save main task updates directly to DB
    if (!isNaN(Number(formData.id))) {
        await updateTask(Number(formData.id), {
            titulo: formData.text,
            descricao: formData.description,
            status: formData.status,
            responsavel: formData.assigneeId,
            duracaohoras: formData.estimatedHours,
            datainicio: formData.startDate,
            datafim: formData.dueDate,
            // REMOVED deadline and dataproposta to avoid errors on tables without these columns
            gravidade: formData.gut?.g,
            urgencia: formData.gut?.u,
            tendencia: formData.gut?.t
        });
    }

    // Propagate up
    onSave(formData);

    // Sync any *new* manually added subtasks (non-numeric ID) to DB
    if (!isNaN(Number(formData.id))) {
        const newSubs = (formData.subtasks || []).filter(s => isNaN(Number(s.id))).map(s => ({
            nome: s.text,
            status: s.completed ? 'done' : 'pending',
            dueDate: s.dueDate,
            assigneeId: s.assigneeId || currentUser?.id
        }));
        
        if (newSubs.length > 0) {
            await syncSubtasks(Number(formData.id), newSubs);
            // Recarrega para obter IDs
            await loadSubtasks();
        }
    }

    onClose();
  };

  const handleDelete = () => {
      if (onDelete && window.confirm("Tem certeza que deseja excluir esta tarefa? Isso removerá também todas as subtarefas vinculadas.")) {
          onDelete(task.id);
      }
  };

  const gutScore = (formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1);

  const STATUS_CONFIG: { id: TaskStatus, label: string, icon: any, color: string }[] = [
      { id: 'todo', label: 'A Fazer', icon: Clock, color: 'text-slate-500' },
      { id: 'doing', label: 'Fazendo', icon: PlayCircle, color: 'text-blue-500' },
      { id: 'review', label: 'Em Revisão', icon: Eye, color: 'text-purple-500' },
      { id: 'approval', label: 'Aprovação', icon: ShieldCheck, color: 'text-orange-500' },
      { id: 'done', label: 'Concluído', icon: CheckCircle, color: 'text-emerald-500' },
  ];

  const isSubtask = formData.isSubtask;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Slide-in Panel with Glass Effect - Increased Width for better spacing */}
      <div className="relative w-full md:w-[1000px] h-full glass-panel border-l border-white/10 flex flex-col animate-ios-slide-left md:rounded-l-[32px] shadow-2xl">
        
      {/* Top Navigation Bar */}
      <header className="bg-white/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 h-20 flex items-center px-6 md:px-8 justify-between shrink-0 z-20 backdrop-blur-md rounded-tl-[32px]">
          <div className="flex items-center gap-4">
              <button 
                  onClick={onClose}
                  className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                  <ArrowLeft className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="bg-slate-200 dark:bg-black/40 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5">
                          <Hash className="w-3 h-3"/> {task.id}
                      </span>
                      {isSubtask ? (
                          <span className="uppercase tracking-wider font-bold text-purple-500 flex items-center gap-1">
                              <CornerDownRight className="w-3 h-3"/> Subtarefa
                          </span>
                      ) : (
                          <span className="uppercase tracking-wider font-bold text-blue-600 dark:text-blue-500">Tarefa</span>
                      )}
                      {opportunityTitle && (
                          <>
                            <span>/</span>
                            <span className="text-slate-400 truncate max-w-[200px] md:max-w-xs">{opportunityTitle}</span>
                          </>
                      )}
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold flex items-center gap-2 text-lg">
                      <Layers className="w-4 h-4 text-slate-500"/>
                      {nodeTitle}
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-3">
              {onDelete && (
                  <button 
                    onClick={handleDelete}
                    className="p-3 hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    title="Excluir Tarefa"
                  >
                      <Trash2 className="w-5 h-5"/>
                  </button>
              )}
              <button 
                onClick={handleSave} 
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-transform active:scale-95 min-h-[48px]"
              >
                  <CheckCircle className="w-4 h-4"/>
                  Salvar
              </button>
          </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Main Info (Wider) */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Title Input */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                     <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Título da Tarefa</label>
                     <textarea 
                        value={formData.text}
                        onChange={e => handleChange('text', e.target.value)}
                        className="bg-transparent text-2xl font-bold text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-600 w-full resize-none h-auto min-h-[40px]"
                        placeholder="O que precisa ser feito?"
                        rows={2}
                     />
                     
                     <div className="mt-6">
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <AlignLeft className="w-4 h-4"/> Descrição Detalhada
                        </label>
                        <textarea 
                            value={formData.description || ''}
                            onChange={e => handleChange('description', e.target.value)}
                            className="w-full glass-input rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 min-h-[120px] focus:border-blue-500 outline-none resize-y leading-relaxed"
                            placeholder="Descreva o contexto técnico..."
                        />
                     </div>
                </div>

                {/* Checklist Section - ONLY FOR PARENT TASKS */}
                {!isSubtask && (
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-purple-500"/> Checklist
                            </h3>
                            <button 
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="text-xs flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-4 py-2.5 rounded-lg border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50 min-h-[40px]"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                                {isGenerating ? 'Gerando...' : 'Gerar IA'}
                            </button>
                        </div>
                        
                        {/* AI Suggestions Preview */}
                        {aiSuggestions.length > 0 && (
                            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-3 flex items-center gap-2">
                                    <Sparkles className="w-3 h-3"/> Sugestões da IA (Agendamento Automático)
                                </h4>
                                
                                {/* Bulk Assignee Selector (MULTI) */}
                                <div className="flex items-center gap-2 mb-4 bg-white/50 dark:bg-white/5 p-2 rounded-lg border border-purple-100 dark:border-white/5">
                                    <User className="w-4 h-4 text-purple-500"/>
                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Atribuir e balancear entre:</span>
                                    <MultiUserSelect 
                                        members={orgMembers} 
                                        selectedIds={bulkAssigneeIds} 
                                        onChange={handleBulkAssignChange} 
                                        label="Selecionar"
                                    />
                                </div>

                                <ul className="space-y-2 mb-4">
                                    {aiSuggestions.map((s, i) => (
                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 border-b border-white/5 pb-1 last:border-0">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                                <span className="truncate">{s.title}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3 text-slate-400"/>
                                                    <MultiUserSelect 
                                                        members={orgMembers}
                                                        selectedIds={s.assigneeIds}
                                                        onChange={(newIds) => handleIndividualAssignChange(i, newIds)}
                                                        label="Resp."
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-slate-500 bg-white/10 px-1.5 py-0.5 rounded w-[40px] text-center">{s.hours}h</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <button onClick={confirmAiSuggestions} className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[48px]">
                                        <CheckCircle className="w-3 h-3"/> Inserir e Reajustar Cronograma
                                    </button>
                                    <button onClick={discardAiSuggestions} className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors min-h-[48px]">
                                        Descartar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 mb-4">
                            {(formData.subtasks || []).map(sub => (
                                <div key={sub.id} className="group border border-slate-100 dark:border-white/5 rounded-xl transition-all hover:bg-white/50 dark:hover:bg-white/5 bg-white/30 dark:bg-black/20 p-3">
                                    <div className="flex items-start gap-3">
                                        <button onClick={() => toggleSubtask(sub.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white mt-0.5 shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center">
                                            {sub.completed 
                                                ? <CheckSquare className="w-6 h-6 text-emerald-500"/> 
                                                : <Square className="w-6 h-6"/>
                                            }
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between">
                                                <span className={`text-sm leading-snug block mt-1 ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {sub.text}
                                                </span>
                                                {sub.estimatedHours && (
                                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded h-fit">{sub.estimatedHours}h</span>
                                                )}
                                            </div>
                                            
                                            {/* Subtask Meta Controls */}
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1.5 rounded text-xs border border-slate-200 dark:border-white/5 hover:border-blue-400 transition-colors">
                                                    <CalendarIcon className="w-3 h-3 text-slate-400"/>
                                                    <input 
                                                        type="date" 
                                                        value={sub.dueDate ? sub.dueDate.split('T')[0] : ''}
                                                        onChange={(e) => updateSubtask(sub.id, 'dueDate', e.target.value)}
                                                        className="bg-transparent outline-none text-slate-600 dark:text-slate-300 w-[85px] cursor-pointer h-full"
                                                    />
                                                </div>
                                                
                                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1.5 rounded text-xs border border-slate-200 dark:border-white/5 hover:border-blue-400 transition-colors relative">
                                                    <User className="w-3 h-3 text-slate-400"/>
                                                    <select 
                                                        value={sub.assigneeId || ''}
                                                        onChange={(e) => {
                                                            const id = e.target.value;
                                                            const member = orgMembers.find(m => m.id === id);
                                                            updateSubtask(sub.id, 'assigneeId', id);
                                                            updateSubtask(sub.id, 'assignee', member?.nome);
                                                        }}
                                                        className="bg-transparent outline-none text-slate-600 dark:text-slate-300 appearance-none pr-4 cursor-pointer max-w-[100px] truncate h-full"
                                                    >
                                                        <option value="">-- Resp. --</option>
                                                        {orgMembers.map(m => (
                                                            <option key={m.id} value={m.id}>{m.nome}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-1 pointer-events-none opacity-50">▼</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button onClick={() => deleteSubtask(sub.id)} className="p-3 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <div className="relative flex-1">
                                <Plus className="absolute left-3 top-3 w-4 h-4 text-slate-500"/>
                                <input 
                                    type="text" 
                                    value={newSubtask}
                                    onChange={e => setNewSubtask(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                                    className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                    placeholder="Adicionar novo item..."
                                />
                            </div>
                            <button onClick={addSubtask} className="glass-button hover:bg-white/10 px-6 py-3 rounded-xl font-medium text-sm min-h-[48px]">
                                Adicionar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Settings & Meta (Narrower) */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Status Card */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                    <label className="block text-xs text-slate-500 uppercase tracking-wider mb-3">Status Atual</label>
                    <div className="flex flex-col gap-2">
                        {STATUS_CONFIG.map(config => (
                            <button
                                key={config.id}
                                onClick={() => handleChange('status', config.id)}
                                className={`w-full py-3.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-start px-4 gap-3 min-h-[48px] ${
                                    formData.status === config.id 
                                    ? `bg-slate-50 dark:bg-white/10 border-shinko-primary ${config.color.replace('text-', 'text-')}`
                                    : 'bg-transparent border-transparent text-slate-500 hover:bg-white/10'
                                }`}
                            >
                                <config.icon className={`w-4 h-4 ${formData.status === config.id ? config.color : 'text-slate-400'}`}/>
                                <span className={formData.status === config.id ? 'text-slate-900 dark:text-white' : ''}>
                                    {config.label}
                                </span>
                                {formData.status === config.id && <CheckCircle className={`w-4 h-4 ml-auto ${config.color}`}/>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Assignment & Time */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20 space-y-4">
                    <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <User className="w-4 h-4"/> Responsável Principal
                        </label>
                        <select 
                            value={formData.assigneeId || ''}
                            onChange={e => {
                                const id = e.target.value;
                                const member = orgMembers.find(m => m.id === id);
                                setFormData(prev => ({...prev, assigneeId: id, assignee: member?.nome}));
                            }}
                            className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none cursor-pointer h-12"
                        >
                            <option value="">-- Não Atribuído --</option>
                            {orgMembers.length > 0 ? (
                                orgMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.nome} ({member.perfil})
                                    </option>
                                ))
                            ) : (
                                <option value="User">Carregando...</option>
                            )}
                        </select>
                    </div>

                    <div className="space-y-4">
                         <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Timer className="w-4 h-4"/> Horas
                            </label>
                            <input 
                                type="number"
                                value={formData.estimatedHours || 0}
                                onChange={e => handleChange('estimatedHours', parseInt(e.target.value))}
                                className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none h-12"
                            />
                        </div>
                        
                        <div className="border-t border-white/5 pt-4 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-blue-500"/> Início (Data & Hora)
                                </label>
                                <input 
                                    type="datetime-local"
                                    value={toInputFormat(formData.startDate)}
                                    onChange={e => handleChange('startDate', fromInputFormat(e.target.value))}
                                    className="w-full glass-input rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none h-12"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-red-500"/> Entrega (Data & Hora)
                                </label>
                                <input 
                                    type="datetime-local"
                                    value={toInputFormat(formData.dueDate)}
                                    onChange={e => handleChange('dueDate', fromInputFormat(e.target.value))}
                                    className="w-full glass-input rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none h-12"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* GUT Matrix Mini */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
                             <BarChart3 className="w-4 h-4"/> Matriz GUT
                        </label>
                        <div className={`text-lg font-black ${
                             gutScore >= 90 ? 'text-red-500' : gutScore >= 45 ? 'text-yellow-500' : 'text-emerald-500'
                         }`}>
                             Score {gutScore}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-slate-500">
                                 <span>Gravidade</span>
                                 <span>{formData.gut?.g}</span>
                             </div>
                             <input type="range" min="1" max="5" value={formData.gut?.g} onChange={e => handleGutChange('g', parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 min-h-[24px]"/>
                         </div>
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-slate-500">
                                 <span>Urgência</span>
                                 <span>{formData.gut?.u}</span>
                             </div>
                             <input type="range" min="1" max="5" value={formData.gut?.u} onChange={e => handleGutChange('u', parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 min-h-[24px]"/>
                         </div>
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-slate-500">
                                 <span>Tendência</span>
                                 <span>{formData.gut?.t}</span>
                             </div>
                             <input type="range" min="1" max="5" value={formData.gut?.t} onChange={e => handleGutChange('t', parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 min-h-[24px]"/>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
