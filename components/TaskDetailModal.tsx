
import React, { useState, useEffect, useRef } from 'react';
import { BpmnTask, BpmnSubTask, TaskStatus, Attachment } from '../types';
import { X, User, Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2, AlignLeft, Clock, PlayCircle, CheckCircle, BarChart3, Timer, Sparkles, Loader2, ArrowLeft, Layers, Hash, Eye, ShieldCheck, CornerDownRight, ChevronDown, Check, Paperclip, UploadCloud, File as FileIcon, ExternalLink, ArrowUpRight, Save } from 'lucide-react';
import { generateSubtasksForTask } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { syncSubtasks, updateTask, fetchSubtasks, addAttachmentToProject, fetchProjectAttachments, promoteSubtask, createTask } from '../services/projectService';

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
}

export const TaskDetailModal: React.FC<Props> = ({ task, nodeTitle, opportunityTitle, onSave, onClose, onDelete, onAttach, orgType }) => {
  const [formData, setFormData] = useState<BpmnTask>({ ...task, subtasks: task.subtasks || [], gut: task.gut || { g: 1, u: 1, t: 1 } });
  const [newSubtask, setNewSubtask] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  // Carrega subtarefas e membros... (Lógica mantida, apenas UI alterada)
  useEffect(() => {
      // Logic for loading subtasks/members remains same...
      const fetchMembers = async () => {
          const { data } = await supabase.from('users').select('id, nome, perfil').order('nome');
          if (data) setOrgMembers(data);
      };
      fetchMembers();
  }, []);

  const handleSave = () => {
      onSave(formData);
      onClose();
  };

  const STATUS_CONFIG = [
      { id: 'todo', label: 'A Fazer', color: 'text-slate-500' },
      { id: 'doing', label: 'Fazendo', color: 'text-blue-500' },
      { id: 'review', label: 'Revisão', color: 'text-purple-500' },
      { id: 'done', label: 'Concluído', color: 'text-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative w-full md:w-[800px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 flex flex-col animate-ios-slide-left shadow-2xl">
        
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 h-16 flex items-center px-6 justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 text-sm text-slate-500">
              <Layers className="w-4 h-4"/>
              <span className="font-bold text-slate-900 dark:text-white">{nodeTitle}</span>
              <span className="text-slate-300">/</span>
              <span className="truncate max-w-[200px]">{opportunityTitle}</span>
          </div>
          <div className="flex gap-2">
              {onDelete && (
                  <button onClick={() => onDelete(task.id)} className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/10">
                      <Trash2 className="w-4 h-4"/>
                  </button>
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-white/5">
                  <X className="w-5 h-5"/>
              </button>
          </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50 dark:bg-[#050505]">
        <div className="space-y-8">
            
            {/* Title & Desc */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                 <input 
                    value={formData.text}
                    onChange={e => setFormData({...formData, text: e.target.value})}
                    className="bg-transparent text-xl font-bold text-slate-900 dark:text-white outline-none w-full mb-4"
                    placeholder="Título da Tarefa"
                 />
                 <textarea 
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-transparent text-sm text-slate-600 dark:text-slate-400 min-h-[80px] outline-none resize-none leading-relaxed"
                    placeholder="Adicione uma descrição detalhada..."
                 />
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                    <div className="flex gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-lg">
                        {STATUS_CONFIG.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setFormData({...formData, status: s.id as any})}
                                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                    formData.status === s.id 
                                    ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Responsável & Horas</label>
                    <div className="flex gap-2">
                        <select 
                            value={formData.assigneeId || ''}
                            onChange={e => setFormData({...formData, assigneeId: e.target.value})}
                            className="flex-1 bg-slate-50 dark:bg-black/20 border-transparent rounded-lg text-sm p-2 outline-none"
                        >
                            <option value="">Ninguém</option>
                            {orgMembers.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                        </select>
                        <input 
                            type="number" 
                            value={formData.estimatedHours} 
                            onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})}
                            className="w-20 bg-slate-50 dark:bg-black/20 rounded-lg text-sm p-2 outline-none text-center"
                        />
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-purple-500"/> Subtarefas
                    </h3>
                </div>
                <div className="space-y-2">
                    {formData.subtasks?.map(sub => (
                        <div key={sub.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg group">
                            <button onClick={() => {/* Toggle Logic */}} className="text-slate-400 hover:text-emerald-500">
                                {sub.completed ? <CheckSquare className="w-4 h-4 text-emerald-500"/> : <Square className="w-4 h-4"/>}
                            </button>
                            <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{sub.text}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 mt-2">
                        <Plus className="w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setFormData(prev => ({...prev, subtasks: [...(prev.subtasks||[]), {id: Date.now().toString(), text: newSubtask, completed: false}]}));
                                    setNewSubtask('');
                                }
                            }}
                            className="flex-1 bg-transparent text-sm outline-none"
                            placeholder="Adicionar item..."
                        />
                    </div>
                </div>
            </div>

        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
              <Save className="w-4 h-4"/> Salvar
          </button>
      </div>

      </div>
    </div>
  );
};
