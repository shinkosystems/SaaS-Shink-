
import React, { useState, useEffect } from 'react';
import { BpmnTask, BpmnSubTask, TaskStatus } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2, AlignLeft, Clock, PlayCircle, CheckCircle, BarChart3, Timer, Sparkles, Loader2, ArrowLeft, Layers, Hash, Eye, ShieldCheck } from 'lucide-react';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { logEvent } from '../services/analyticsService';
import { syncSubtasks } from '../services/projectService';

interface Props {
  task: BpmnTask;
  nodeTitle: string;
  opportunityTitle?: string;
  onSave: (updatedTask: BpmnTask) => void;
  onClose: () => void;
  onOpenProject?: () => void;
}

export interface OrgMember {
    id: string;
    nome: string;
    perfil: string;
}

const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onOpenProject }) => {
  const [formData, setFormData] = useState<BpmnTask>({
    ...task,
    subtasks: task.subtasks || [],
    status: task.status || (task.completed ? 'done' : 'todo'),
    gut: task.gut || { g: 1, u: 1, t: 1 },
    estimatedHours: task.estimatedHours || 2,
    startDate: task.startDate || new Date().toISOString().split('T')[0],
    dueDate: task.dueDate || new Date().toISOString().split('T')[0]
  });

  const [newSubtask, setNewSubtask] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [currentUser, setCurrentUser] = useState<{id: string, nome: string} | null>(null);

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
      setIsGenerating(true);
      setAiSuggestions([]); // Reset previous suggestions
      try {
          const context = `${nodeTitle} - ${opportunityTitle || ''}`;
          const generated = await generateSubtasksForTask(formData.text, context);
          
          if (generated && generated.length > 0) {
              setAiSuggestions(generated);
              logEvent('feature_use', { feature: 'AI Subtasks Generated' });
          } else {
              alert("A IA não gerou sugestões. Tente melhorar o título da tarefa ou adicionar mais contexto na descrição.");
          }
      } catch (e) {
          console.error(e);
          alert("Erro ao conectar com a IA.");
      } finally {
          setIsGenerating(false);
      }
  };

  const confirmAiSuggestions = () => {
      if (aiSuggestions.length === 0) return;

      const today = new Date();

      const newSubs: BpmnSubTask[] = aiSuggestions.map((txt, index) => {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + (index + 1));
          const dateStr = targetDate.toISOString().split('T')[0];

          return {
              id: crypto.randomUUID(),
              text: txt,
              completed: false,
              dueDate: dateStr,
              // Explicitly assign to current user as requested
              assigneeId: currentUser?.id,
              assignee: currentUser?.nome
          };
      });

      setFormData(prev => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), ...newSubs]
      }));
      setAiSuggestions([]); // Clear suggestions after adding
      logEvent('feature_use', { feature: 'AI Subtasks Confirmed' });
  };

  const discardAiSuggestions = () => {
      setAiSuggestions([]);
  };

  const handleSave = async () => {
    logEvent('feature_use', { feature: 'Save Task' });
    
    // Save main task updates (calls parent handler which likely calls updateTask)
    onSave(formData);

    // Sync subtasks to DB if this is a real numeric ID task (DB Task)
    if (!isNaN(Number(formData.id))) {
        // We only want to insert NEW subtasks (those with non-numeric IDs generated by crypto.randomUUID)
        // Existing subtasks already have numeric IDs from DB and shouldn't be re-inserted by syncSubtasks
        const newSubs = (formData.subtasks || []).filter(s => isNaN(Number(s.id))).map(s => ({
            nome: s.text,
            status: s.completed ? 'done' : 'pending',
            dueDate: s.dueDate,
            assigneeId: s.assigneeId || currentUser?.id // Fallback to current user if missing
        }));
        
        if (newSubs.length > 0) {
            await syncSubtasks(Number(formData.id), newSubs);
        }
    }

    onClose();
  };

  const gutScore = (formData.gut?.g || 1) * (formData.gut?.u || 1) * (formData.gut?.t || 1);

  const STATUS_CONFIG: { id: TaskStatus, label: string, icon: any, color: string }[] = [
      { id: 'todo', label: 'A Fazer', icon: Clock, color: 'text-slate-500' },
      { id: 'doing', label: 'Fazendo', icon: PlayCircle, color: 'text-blue-500' },
      { id: 'review', label: 'Em Revisão', icon: Eye, color: 'text-purple-500' },
      { id: 'approval', label: 'Aprovação', icon: ShieldCheck, color: 'text-orange-500' },
      { id: 'done', label: 'Concluído', icon: CheckCircle, color: 'text-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Slide-in Panel with Glass Effect */}
      <div className="relative w-full md:w-[800px] h-full glass-panel border-l border-white/10 flex flex-col animate-ios-slide-left md:rounded-l-[32px] shadow-2xl">
        
      {/* Top Navigation Bar */}
      <header className="bg-white/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 h-20 flex items-center px-6 md:px-8 justify-between shrink-0 z-20 backdrop-blur-md rounded-tl-[32px]">
          <div className="flex items-center gap-4">
              <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                  <ArrowLeft className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="bg-slate-200 dark:bg-black/40 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5">
                          <Hash className="w-3 h-3"/> {task.id}
                      </span>
                      <span className="uppercase tracking-wider font-bold text-blue-600 dark:text-blue-500">Tarefa</span>
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
              <button 
                onClick={handleSave} 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-transform active:scale-95"
              >
                  <CheckCircle className="w-4 h-4"/>
                  Salvar
              </button>
          </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Main Info */}
            <div className="lg:col-span-2 space-y-6">
                
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

                {/* Checklist Section */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-purple-500"/> Checklist
                        </h3>
                        <button 
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="text-xs flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                            {isGenerating ? 'Gerando...' : 'Gerar IA'}
                        </button>
                    </div>
                    
                    {/* AI Suggestions Preview */}
                    {aiSuggestions.length > 0 && (
                        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-3 flex items-center gap-2">
                                <Sparkles className="w-3 h-3"/> Sugestões da IA
                            </h4>
                            <ul className="space-y-2 mb-4">
                                {aiSuggestions.map((s, i) => (
                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                        {s}
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-2">
                                <button onClick={confirmAiSuggestions} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3"/> Inserir no Checklist
                                </button>
                                <button onClick={discardAiSuggestions} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                                    Descartar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 mb-4">
                        {(formData.subtasks || []).map(sub => (
                            <div key={sub.id} className="group border border-slate-100 dark:border-white/5 rounded-xl transition-all hover:bg-white/50 dark:hover:bg-white/5 bg-white/30 dark:bg-black/20 p-3">
                                <div className="flex items-start gap-3">
                                    <button onClick={() => toggleSubtask(sub.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white mt-0.5 shrink-0">
                                        {sub.completed 
                                            ? <CheckSquare className="w-5 h-5 text-emerald-500"/> 
                                            : <Square className="w-5 h-5"/>
                                        }
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-sm leading-snug block ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {sub.text}
                                        </span>
                                        
                                        {/* Subtask Meta Controls */}
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-xs border border-slate-200 dark:border-white/5 hover:border-blue-400 transition-colors">
                                                <CalendarIcon className="w-3 h-3 text-slate-400"/>
                                                <input 
                                                    type="date" 
                                                    value={sub.dueDate || ''}
                                                    onChange={(e) => updateSubtask(sub.id, 'dueDate', e.target.value)}
                                                    className="bg-transparent outline-none text-slate-600 dark:text-slate-300 w-[85px] cursor-pointer"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-xs border border-slate-200 dark:border-white/5 hover:border-blue-400 transition-colors relative">
                                                <User className="w-3 h-3 text-slate-400"/>
                                                <select 
                                                    value={sub.assigneeId || ''}
                                                    onChange={(e) => {
                                                        const id = e.target.value;
                                                        const member = orgMembers.find(m => m.id === id);
                                                        updateSubtask(sub.id, 'assigneeId', id);
                                                        updateSubtask(sub.id, 'assignee', member?.nome);
                                                    }}
                                                    className="bg-transparent outline-none text-slate-600 dark:text-slate-300 appearance-none pr-4 cursor-pointer max-w-[100px] truncate"
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
                                    
                                    <button onClick={() => deleteSubtask(sub.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                        <div className="relative flex-1">
                            <Plus className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
                            <input 
                                type="text" 
                                value={newSubtask}
                                onChange={e => setNewSubtask(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                                className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                placeholder="Adicionar novo item..."
                            />
                        </div>
                        <button onClick={addSubtask} className="glass-button hover:bg-white/10 px-4 py-2 rounded-xl font-medium text-sm">
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Settings & Meta */}
            <div className="space-y-6">
                
                {/* Status Card */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                    <label className="block text-xs text-slate-500 uppercase tracking-wider mb-3">Status Atual</label>
                    <div className="flex flex-col gap-2">
                        {STATUS_CONFIG.map(config => (
                            <button
                                key={config.id}
                                onClick={() => handleChange('status', config.id)}
                                className={`w-full py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-start px-4 gap-3 ${
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
                            className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
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

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Timer className="w-4 h-4"/> Horas
                            </label>
                            <input 
                                type="number"
                                value={formData.estimatedHours || 0}
                                onChange={e => handleChange('estimatedHours', parseInt(e.target.value))}
                                className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-blue-500"/> Início
                                </label>
                                <input 
                                    type="date"
                                    value={formData.startDate || ''}
                                    onChange={e => handleChange('startDate', e.target.value)}
                                    className="w-full glass-input rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-red-500"/> Entrega
                                </label>
                                <input 
                                    type="date"
                                    value={formData.dueDate || ''}
                                    onChange={e => handleChange('dueDate', e.target.value)}
                                    className="w-full glass-input rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none"
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
                             <input type="range" min="1" max="5" value={formData.gut?.g} onChange={e => handleGutChange('g', parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                         </div>
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-slate-500">
                                 <span>Urgência</span>
                                 <span>{formData.gut?.u}</span>
                             </div>
                             <input type="range" min="1" max="5" value={formData.gut?.u} onChange={e => handleGutChange('u', parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                         </div>
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-slate-500">
                                 <span>Tendência</span>
                                 <span>{formData.gut?.t}</span>
                             </div>
                             <input type="range" min="1" max="5" value={formData.gut?.t} onChange={e => handleGutChange('t', parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
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
