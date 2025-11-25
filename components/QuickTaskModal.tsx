
import React, { useState, useEffect } from 'react';
import { Opportunity, BpmnTask } from '../types';
import { X, CheckCircle, Calendar as CalendarIcon, User, Briefcase, Layers, Clock, BarChart3, AlignLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Props {
  opportunities: Opportunity[];
  onClose: () => void;
  onSave: (task: BpmnTask, projectId: string | null) => void;
  userRole?: string;
}

interface OrgMember {
    id: string;
    nome: string;
}

export const QuickTaskModal: React.FC<Props> = ({ opportunities, onClose, onSave, userRole }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(''); // Empty = "Tarefas Avulsas"
  const [assigneeId, setAssigneeId] = useState(''); // UUID
  const [assigneeName, setAssigneeName] = useState(''); // Display Name
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [description, setDescription] = useState('');
  
  // GUT Matrix
  const [gravidade, setGravidade] = useState(1);
  const [urgencia, setUrgencia] = useState(1);
  const [tendencia, setTendencia] = useState(1);
  
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);

  // Fetch Users
  useEffect(() => {
      const fetchOrgMembers = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              // Default assignee to current user if not set
              setAssigneeId(user.id);
              
              const { data: userData } = await supabase
                  .from('users')
                  .select('organizacao, nome')
                  .eq('id', user.id)
                  .single();

              if (userData) {
                  setAssigneeName(userData.nome || 'Eu');
                  if (userData.organizacao) {
                      const { data: members } = await supabase
                          .from('users')
                          .select('id, nome')
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

  const handleSave = () => {
      if (!taskTitle.trim()) {
          alert("Digite o título da tarefa.");
          return;
      }

      if (!assigneeId) {
          alert("Selecione um responsável.");
          return;
      }

      const newTask: BpmnTask = {
          id: crypto.randomUUID(),
          displayId: Math.floor(100000 + Math.random() * 900000),
          text: taskTitle,
          description: description,
          completed: false,
          status: 'todo',
          assignee: assigneeName || undefined,
          assigneeId: assigneeId || undefined, // Pass UUID for DB (Required)
          dueDate: dueDate,
          estimatedHours: estimatedHours,
          gut: { g: gravidade, u: urgencia, t: tendencia }
      };

      onSave(newTask, projectId || null);
      onClose();
  };

  // Filtrar projetos ativos para o dropdown
  const activeProjects = opportunities.filter(o => o.status !== 'Archived' && o.status !== 'Frozen');

  const gutScore = gravidade * urgencia * tendencia;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
        <div className="glass-panel w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-ios-pop relative overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-white/5 bg-gradient-to-r from-white/5 to-transparent shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 text-glow">
                        <CheckCircle className="w-6 h-6 text-shinko-primary"/> Nova Tarefa
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Criação rápida para Kanban e Cronograma.
                    </p>
                </div>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6"/>
                </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {/* Title */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">O que precisa ser feito?</label>
                    <input 
                        type="text" 
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        className="w-full glass-input rounded-xl p-4 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary outline-none placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                        placeholder="Ex: Criar landing page..."
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4"/> Descrição
                    </label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary outline-none min-h-[80px] resize-y"
                        placeholder="Detalhes adicionais da tarefa..."
                    />
                </div>

                {/* Project Selector */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Briefcase className="w-4 h-4"/> Vincular ao Projeto
                    </label>
                    <div className="relative">
                        <select 
                            value={projectId}
                            onChange={e => setProjectId(e.target.value)}
                            className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary outline-none appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-white dark:bg-black text-slate-500">-- Tarefa Avulsa (Sem Projeto) --</option>
                            {activeProjects.map(p => (
                                <option key={p.id} value={p.id} className="bg-white dark:bg-black text-slate-900 dark:text-white">{p.title}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none opacity-50 dark:text-white">▼</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Assignee */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <User className="w-4 h-4"/> Responsável
                        </label>
                        <div className="relative">
                            <select 
                                value={assigneeId}
                                onChange={e => {
                                    const id = e.target.value;
                                    setAssigneeId(id);
                                    const member = orgMembers.find(m => m.id === id);
                                    setAssigneeName(member ? member.nome : '');
                                }}
                                className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary outline-none appearance-none cursor-pointer"
                            >
                                {orgMembers.map(m => (
                                    <option key={m.id} value={m.id} className="bg-white dark:bg-black text-slate-900 dark:text-white">{m.nome}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none opacity-50 dark:text-white">▼</div>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4"/> Prazo
                        </label>
                        <input 
                            type="date" 
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary outline-none color-scheme-light dark:color-scheme-dark"
                        />
                    </div>
                </div>

                {/* Hours */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
                         <Clock className="w-4 h-4"/> Horas Estimadas
                    </label>
                     <input 
                        type="number" 
                        value={estimatedHours}
                        onChange={e => setEstimatedHours(Number(e.target.value))}
                        className="w-full glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary outline-none"
                    />
                </div>

                {/* GUT Matrix Sliders */}
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                             <BarChart3 className="w-4 h-4"/> Matriz GUT
                        </label>
                        <span className={`text-sm font-black px-2 py-0.5 rounded ${gutScore >= 60 ? 'bg-red-100 text-red-600' : gutScore >= 27 ? 'bg-yellow-100 text-yellow-600' : 'bg-emerald-100 text-emerald-600'}`}>Score: {gutScore}</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                <span>Gravidade</span>
                                <span>{gravidade}</span>
                            </div>
                            <input type="range" min="1" max="5" value={gravidade} onChange={e => setGravidade(parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                <span>Urgência</span>
                                <span>{urgencia}</span>
                            </div>
                            <input type="range" min="1" max="5" value={urgencia} onChange={e => setUrgencia(parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                <span>Tendência</span>
                                <span>{tendencia}</span>
                            </div>
                            <input type="range" min="1" max="5" value={tendencia} onChange={e => setTendencia(parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-white/5 flex justify-end gap-4 bg-slate-50 dark:bg-white/5 shrink-0">
                <button 
                    onClick={onClose}
                    className="px-6 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSave}
                    className="px-8 py-3 bg-shinko-primary hover:bg-shinko-secondary text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center gap-2 border border-white/10"
                >
                    <Layers className="w-4 h-4"/> Criar Tarefa
                </button>
            </div>

        </div>
    </div>
  );
};
