
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
  const [projectId, setProjectId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [description, setDescription] = useState('');
  
  const [gravidade, setGravidade] = useState(1);
  const [urgencia, setUrgencia] = useState(1);
  const [tendencia, setTendencia] = useState(1);
  
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);

  useEffect(() => {
      const fetchOrgMembers = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              setAssigneeId(user.id);
              const { data: userData } = await supabase.from('users').select('organizacao, nome').eq('id', user.id).single();
              if (userData) {
                  setAssigneeName(userData.nome || 'Eu');
                  if (userData.organizacao) {
                      const { data: members } = await supabase.from('users').select('id, nome').eq('organizacao', userData.organizacao).order('nome');
                      if (members) setOrgMembers(members);
                  }
              }
          }
      };
      fetchOrgMembers();
  }, []);

  const handleSave = () => {
      if (!taskTitle.trim()) return alert("Digite o título da tarefa.");
      if (!assigneeId) return alert("Selecione um responsável.");

      const newTask: BpmnTask = {
          id: crypto.randomUUID(),
          displayId: Math.floor(100000 + Math.random() * 900000),
          text: taskTitle,
          description: description,
          completed: false,
          status: 'todo',
          assignee: assigneeName || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate,
          estimatedHours: estimatedHours,
          gut: { g: gravidade, u: urgencia, t: tendencia }
      };

      onSave(newTask, projectId || null);
      onClose();
  };

  const activeProjects = opportunities.filter(o => o.status !== 'Archived' && o.status !== 'Frozen');
  const gutScore = gravidade * urgencia * tendencia;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
        <div className="glass-panel w-full max-w-lg max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col animate-ios-pop relative overflow-hidden bg-white dark:bg-[#0A0A0C]">
            
            <div className="flex justify-between items-center p-8 border-b border-slate-200 dark:border-white/5 shrink-0">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-amber-500"/> Nova Tarefa
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Criação rápida Shinkō Engine</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 bg-slate-100 dark:bg-white/5 rounded-full">
                    <X className="w-5 h-5"/>
                </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">O que precisa ser feito?</label>
                    <input 
                        type="text" 
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        className="w-full glass-input rounded-2xl p-5 text-lg font-bold shadow-inner"
                        placeholder="Ex: Criar landing page..."
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4"/> Descrição
                    </label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full glass-input rounded-2xl p-4 text-sm min-h-[100px] resize-none shadow-inner"
                        placeholder="Detalhes adicionais da tarefa..."
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                        <Briefcase className="w-4 h-4"/> Projeto Vinculado
                    </label>
                    <select 
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className="w-full glass-input rounded-2xl p-4 text-sm cursor-pointer shadow-inner appearance-none"
                    >
                        <option value="" className="bg-white dark:bg-black">-- Tarefa Avulsa (Ad-hoc) --</option>
                        {activeProjects.map(p => (
                            <option key={p.id} value={p.id} className="bg-white dark:bg-black">{p.title}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                            <User className="w-4 h-4"/> Responsável
                        </label>
                        <select 
                            value={assigneeId}
                            onChange={e => {
                                const id = e.target.value;
                                setAssigneeId(id);
                                setAssigneeName(orgMembers.find(m => m.id === id)?.nome || '');
                            }}
                            className="w-full glass-input rounded-2xl p-4 text-sm cursor-pointer shadow-inner appearance-none"
                        >
                            {orgMembers.map(m => (
                                <option key={m.id} value={m.id} className="bg-white dark:bg-black">{m.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4"/> Prazo
                        </label>
                        <input 
                            type="date" 
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full glass-input rounded-2xl p-4 text-sm shadow-inner uppercase font-bold"
                        />
                    </div>
                </div>

                <div className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <BarChart3 className="w-4 h-4"/> Matriz GUT
                        </label>
                        <span className={`text-xs font-black px-3 py-1 rounded-lg border ${gutScore >= 60 ? 'bg-red-500/10 text-red-500 border-red-500/20' : gutScore >= 27 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>GUT {gutScore}</span>
                    </div>
                    
                    <div className="space-y-4">
                        {[
                            { label: 'Gravidade', val: gravidade, set: setGravidade },
                            { label: 'Urgência', val: urgencia, set: setUrgencia },
                            { label: 'Tendência', val: tendencia, set: setTendencia }
                        ].map(item => (
                            <div key={item.label} className="space-y-2">
                                <div className="flex justify-between text-[8px] text-slate-400 font-black uppercase tracking-widest">
                                    <span>{item.label}</span>
                                    <span>{item.val}</span>
                                </div>
                                <input type="range" min="1" max="5" value={item.val} onChange={e => item.set(parseInt(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8 border-t border-slate-200 dark:border-white/5 flex justify-end gap-4 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
                <button onClick={onClose} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Cancelar</button>
                <button 
                    onClick={handleSave}
                    className="px-10 py-4 bg-amber-500 text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-glow-amber transition-all active:scale-95"
                >
                    Sincronizar Ativo
                </button>
            </div>

        </div>
    </div>
  );
};
