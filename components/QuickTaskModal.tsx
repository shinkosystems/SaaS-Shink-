
import React, { useState, useEffect } from 'react';
import { Opportunity, BpmnTask } from '../types';
import { X, CheckCircle, Calendar as CalendarIcon, User, Briefcase, Layers, Clock, BarChart3, AlignLeft, ChevronDown, Tag } from 'lucide-react';
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

const SHINKO_CATEGORIES = [
    "Adm", "Financeiro", "Gestão", "Tecnológico", "RH", 
    "Modelagem", "Interface", "Lógica", "Marketing", "Suporte"
];

export const QuickTaskModal: React.FC<Props> = ({ opportunities, onClose, onSave, userRole }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [category, setCategory] = useState('Gestão');
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
      const fetchMembers = async () => {
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
      fetchMembers();
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
          gut: { g: gravidade, u: urgencia, t: tendencia },
          tags: [category] // Usando tags para armazenar a categoria principal
      };

      // @ts-ignore - Enviando categoria extra no payload para o service
      newTask.category = category;

      onSave(newTask, projectId || null);
  };

  const activeProjects = opportunities.filter(o => o.status !== 'Archived' && o.status !== 'Frozen');
  const gutScore = gravidade * urgencia * tendencia;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-lg max-h-[95vh] rounded-[3rem] shadow-2xl flex flex-col animate-ios-pop relative overflow-hidden bg-[#F2F2F7] dark:bg-[#0A0A0C]">
            
            <div className="flex justify-between items-center p-8 pb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-amber-500 stroke-[2px]"/>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Nova Tarefa
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Criação rápida Shinkō Engine</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-3 bg-white dark:bg-white/5 rounded-full shadow-sm">
                    <X className="w-5 h-5"/>
                </button>
            </div>

            <div className="px-8 pb-8 pt-4 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">O que precisa ser feito?</label>
                    <input 
                        type="text" 
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] p-6 text-xl font-bold shadow-soft transition-all outline-none text-slate-900 dark:text-white"
                        placeholder="Ex: Criar landing page..."
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-3">
                            <Tag className="w-4 h-4 text-slate-400"/> Categoria
                        </label>
                        <div className="relative">
                            <select 
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-white dark:bg-white/5 border-none rounded-[1.5rem] p-6 text-sm font-bold cursor-pointer shadow-soft appearance-none outline-none text-slate-800 dark:text-white"
                            >
                                {SHINKO_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat} className="bg-white dark:bg-black">{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-3">
                            <Briefcase className="w-4 h-4 text-slate-400"/> Projeto
                        </label>
                        <div className="relative">
                            <select 
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                className="w-full bg-white dark:bg-white/5 border-none rounded-[1.5rem] p-6 text-sm font-bold cursor-pointer shadow-soft appearance-none outline-none text-slate-800 dark:text-white"
                            >
                                <option value="" className="bg-white dark:bg-black">-- Avulsa --</option>
                                {activeProjects.map(p => (
                                    <option key={p.id} value={p.id} className="bg-white dark:bg-black">{p.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-3">
                        <AlignLeft className="w-4 h-4 text-slate-400"/> Descrição
                    </label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border-none rounded-[1.5rem] p-6 text-base min-h-[100px] resize-none shadow-soft outline-none text-slate-700 dark:text-slate-300"
                        placeholder="Detalhes adicionais..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-3">
                            <User className="w-4 h-4 text-slate-400"/> Responsável
                        </label>
                        <div className="relative">
                            <select 
                                value={assigneeId}
                                onChange={e => {
                                    const id = e.target.value;
                                    setAssigneeId(id);
                                    setAssigneeName(orgMembers.find(m => m.id === id)?.nome || '');
                                }}
                                className="w-full bg-white dark:bg-white/5 border-none rounded-[1.5rem] p-6 text-sm font-bold cursor-pointer shadow-soft appearance-none outline-none text-slate-800 dark:text-white"
                            >
                                {orgMembers.map(m => (
                                    <option key={m.id} value={m.id} className="bg-white dark:bg-black">{m.nome}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-4">
                         <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-3">
                            <CalendarIcon className="w-4 h-4 text-slate-400"/> Prazo
                        </label>
                        <input 
                            type="date" 
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border-none rounded-[1.5rem] p-6 text-sm shadow-soft uppercase font-black tracking-widest outline-none text-slate-800 dark:text-white"
                        />
                    </div>
                </div>

                <div className="bg-white/50 dark:bg-white/[0.02] p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-inner">
                    <div className="flex justify-between items-center mb-8">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                             <BarChart3 className="w-5 h-5 text-slate-400"/> Matriz GUT
                        </label>
                        <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border ${gutScore >= 60 ? 'bg-red-500/10 text-red-500 border-red-500/20' : gutScore >= 27 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            GUT {gutScore}
                        </span>
                    </div>
                    
                    <div className="space-y-8">
                        {[
                            { label: 'Gravidade', val: gravidade, set: setGravidade },
                            { label: 'Urgência', val: urgencia, set: setUrgencia },
                            { label: 'Tendência', val: tendencia, set: setTendencia }
                        ].map(item => (
                            <div key={item.label} className="space-y-4">
                                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">
                                    <span>{item.label}</span>
                                    <span className="text-slate-900 dark:text-white">{item.val}</span>
                                </div>
                                <div className="relative h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full">
                                    <input 
                                        type="range" min="1" max="5" 
                                        value={item.val} 
                                        onChange={e => item.set(parseInt(e.target.value))} 
                                        className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer z-10"
                                    />
                                    <div 
                                        className="h-full bg-amber-500 rounded-full relative" 
                                        style={{ width: `${(item.val - 1) * 25}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-[#0A0A0C] shadow-lg"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8 pb-10 flex justify-between items-center bg-white/40 dark:bg-black/20 shrink-0">
                <button onClick={onClose} className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">CANCELAR</button>
                <button onClick={handleSave} className="px-14 py-5 bg-[#F59E0B] text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.15em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-amber-500/20">SINCRONIZAR ATIVO</button>
            </div>
        </div>
    </div>
  );
};
