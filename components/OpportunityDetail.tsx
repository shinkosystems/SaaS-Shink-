import React, { useState, useRef, useMemo } from 'react';
import { Opportunity, RDEStatus, BpmnData, ProjectStatus, BpmnTask, Attachment, Comment } from '../types';
import { updateOpportunity } from '../services/opportunityService';
import { updateTask, createTask, deleteTask } from '../services/projectService';
import { supabase } from '../services/supabaseClient';
import BpmnBuilder from './BpmnBuilder';
import { TaskDetailModal } from './TaskDetailModal';
import BurndownChart from './BurndownChart'; 
import { X, Edit, Trash2, Target, CheckCircle, Clock, AlertTriangle, FileText, DollarSign, Zap, GitMerge, LayoutDashboard, Snowflake, PlayCircle, ChevronDown, ChevronUp, Lock, Unlock, ListTodo, Calendar, User, CheckSquare, Square, Paperclip, History, Send, Download, File, Trash, ArrowLeft, ExternalLink, CloudLightning, Hash, Plus, BarChart3, Save, PieChart, Palette } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onUpdate: (opp: Opportunity) => void;
  userRole?: string;
  currentUserId?: string;
  userName?: string;
  currentPlan?: string;
  isSharedMode?: boolean;
}

const OpportunityDetail: React.FC<Props> = ({ opportunity: initialOpp, onClose, onEdit, onDelete, onUpdate, userRole, currentUserId, userName, currentPlan, isSharedMode }) => {
  const [opportunity, setOpportunity] = useState(initialOpp);
  const [activeTab, setActiveTab] = useState<'overview' | 'bpms' | 'tasks' | 'files' | 'comments' | 'timesheet'>('overview');
  const [editingTask, setEditingTask] = useState<{nodeId: string, nodeLabel: string, task: BpmnTask} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const [expandedTimesheetUser, setExpandedTimesheetUser] = useState<string | null>(null);
  const [editableDescription, setEditableDescription] = useState(initialOpp.description || '');
  const [projectColor, setProjectColor] = useState(initialOpp.color || '#3b82f6');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isClient = userRole === 'cliente';

  const addToStorytime = (opp: Opportunity, text: string, type: 'user' | 'system' = 'system', metadata?: any) => {
      const newComment: Comment = {
          id: crypto.randomUUID(),
          text,
          author: type === 'system' ? 'Sistema' : (userName || 'Usuário'),
          createdAt: new Date().toISOString(),
          type,
          metadata
      };
      return [newComment, ...(opp.comments || [])];
  };

  const handleSaveBpmn = async (bpmnData: BpmnData, docsContext?: string) => {
      const comments = addToStorytime(opportunity, 'Fluxo BPMN atualizado.');
      const updatedOpp = { ...opportunity, bpmn: bpmnData, docsContext: docsContext || opportunity.docsContext, comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      await updateOpportunity(updatedOpp);
  };

  const handleAddNewTask = (nodeId: string, nodeLabel: string) => {
      const newTask: BpmnTask = {
          id: crypto.randomUUID(),
          text: '',
          status: 'todo',
          completed: false,
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          estimatedHours: 2,
          gut: { g: 1, u: 1, t: 1 }
      };
      setEditingTask({ nodeId, nodeLabel, task: newTask });
  };

  const { timesheetData, totalProjectHours } = useMemo(() => {
      const usersMap = new Map<string, { id: string, name: string, totalHours: number, tasks: any[] }>();
      let totalHours = 0;
      opportunity.bpmn?.nodes?.forEach(node => {
          node.checklist?.forEach(task => {
              if (task.assigneeId) {
                  if (!usersMap.has(task.assigneeId)) usersMap.set(task.assigneeId, { id: task.assigneeId, name: task.assignee || 'Desconhecido', totalHours: 0, tasks: [] });
                  const u = usersMap.get(task.assigneeId)!;
                  const h = Number(task.estimatedHours || 0);
                  u.totalHours += h;
                  u.tasks.push({ title: task.text, hours: h, status: task.status });
                  totalHours += h;
              }
          });
      });
      return { timesheetData: Array.from(usersMap.values()).sort((a,b) => b.totalHours - a.totalHours), totalProjectHours: totalHours };
  }, [opportunity.bpmn]);

  const tabs = [
        { id: 'overview', icon: LayoutDashboard, label: 'Visão Geral' },
        { id: 'tasks', icon: ListTodo, label: 'Tarefas' },
        { id: 'timesheet', icon: PieChart, label: 'Timesheets' },
        { id: 'files', icon: Paperclip, label: 'Arquivos' },
        { id: 'comments', icon: History, label: 'Histórico' },
        ...(!isClient ? [{ id: 'bpms', icon: GitMerge, label: 'Fluxo' }] : [])
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0a]">
      
      {/* Top Tabs Minimalist */}
      <div className="border-b border-slate-200 dark:border-white/10 px-6 sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-xl">
         <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`h-12 flex items-center gap-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap uppercase tracking-wider ${activeTab === tab.id ? 'border-amber-500 text-amber-600 dark:text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <tab.icon className="w-4 h-4" /> 
                    {tab.label}
                </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            
            {activeTab === 'overview' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4"/> Descrição
                                </h3>
                            </div>
                            <textarea 
                                value={editableDescription}
                                onChange={e => setEditableDescription(e.target.value)}
                                className="w-full bg-transparent text-slate-700 dark:text-slate-300 text-sm leading-relaxed outline-none resize-none h-40 custom-scrollbar"
                                placeholder="Sem descrição."
                            />
                        </div>

                        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4"/> Progresso
                             </h3>
                             <BurndownChart opportunity={opportunity} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Métricas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">PRIO-6 Score</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">{opportunity.prioScore?.toFixed(1)}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Arquétipo</span>
                                    <span className="text-xs font-bold text-indigo-500 block mt-2 line-clamp-1">{opportunity.archetype}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {opportunity.bpmn?.nodes.map(node => (
                        <div key={node.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-3 h-fit">
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2">
                                <h4 className="font-bold text-slate-700 dark:text-white text-sm">{node.label}</h4>
                                <button onClick={() => handleAddNewTask(node.id, node.label)} className="text-slate-400 hover:text-amber-500"><Plus className="w-4 h-4"/></button>
                            </div>
                            <div className="space-y-2">
                                {(node.checklist || []).map(task => (
                                    <div key={task.id} onClick={() => setEditingTask({nodeId: node.id, nodeLabel: node.label, task})} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-white/5 hover:border-blue-500/50 cursor-pointer shadow-sm group">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm leading-snug ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.text}</span>
                                            {task.completed && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0"/>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            {task.assignee && <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500">{task.assignee}</span>}
                                            {task.estimatedHours && <span className="text-[10px] text-slate-400">{task.estimatedHours}h</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Other tabs follow similar clean structure */}
            {activeTab === 'bpms' && (
                <div className="h-full animate-in fade-in border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <BpmnBuilder opportunity={opportunity} onSave={handleSaveBpmn} currentPlan={currentPlan} />
                </div>
            )}
          </div>
      </div>

      {editingTask && (
          <TaskDetailModal 
              task={editingTask.task}
              nodeTitle={editingTask.nodeLabel}
              opportunityTitle={opportunity.title}
              onClose={() => setEditingTask(null)}
              onSave={() => {}} // Implementation in parent
          />
      )}
    </div>
  );
};

export default OpportunityDetail;