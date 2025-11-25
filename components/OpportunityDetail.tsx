
import React, { useState, useRef } from 'react';
import { Opportunity, RDEStatus, BpmnData, ProjectStatus, BpmnTask, Attachment, Comment } from '../types';
import { updateOpportunity } from '../services/opportunityService';
import { updateTask, createTask } from '../services/projectService';
import { supabase } from '../services/supabaseClient';
import BpmnBuilder from './BpmnBuilder';
import TaskDetailModal from './TaskDetailModal';
import BurndownChart from './BurndownChart'; 
import { X, Edit, Trash2, Target, CheckCircle, Clock, AlertTriangle, FileText, DollarSign, Zap, GitMerge, LayoutDashboard, Snowflake, PlayCircle, ChevronDown, Lock, Unlock, ListTodo, Calendar, User, CheckSquare, Square, Paperclip, History, Send, Download, File, Trash, ArrowLeft, ExternalLink, CloudLightning, Hash, Plus } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onUpdate: (opp: Opportunity) => void;
  userRole?: string;
  currentUserId?: string;
  userName?: string;
}

const OpportunityDetail: React.FC<Props> = ({ opportunity: initialOpp, onClose, onEdit, onDelete, onUpdate, userRole, currentUserId, userName }) => {
  const [opportunity, setOpportunity] = useState(initialOpp);
  const [activeTab, setActiveTab] = useState<'overview' | 'bpms' | 'tasks' | 'files' | 'comments'>('overview');
  const [editingTask, setEditingTask] = useState<{nodeId: string, nodeLabel: string, task: BpmnTask} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isClient = userRole === 'cliente';

  // --- Helper: Add to Storytime ---
  const addToStorytime = (opp: Opportunity, text: string, type: 'user' | 'system' = 'system', metadata?: any) => {
      const newComment: Comment = {
          id: crypto.randomUUID(),
          text,
          author: type === 'system' ? 'Shinkō System' : (userName || 'Usuário'),
          createdAt: new Date().toISOString(),
          type,
          metadata
      };
      return [newComment, ...(opp.comments || [])];
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
      onDelete(opportunity.id);
    }
  };
  
  const handleSaveBpmn = async (bpmnData: BpmnData, docsContext?: string) => {
      const comments = addToStorytime(opportunity, 'Fluxo BPMN atualizado via construtor.');
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

  const handleTaskUpdateFromModal = async (nodeId: string, updatedTask: BpmnTask) => {
      if (!opportunity.bpmn || !opportunity.bpmn.nodes) return;
      
      const node = opportunity.bpmn.nodes.find(n => n.id === nodeId);
      const taskExists = node?.checklist?.some(t => t.id === updatedTask.id);

      let newNodes;
      
      if (taskExists) {
          newNodes = opportunity.bpmn.nodes.map(node => {
              if (node.id !== nodeId) return node;
              return { ...node, checklist: node.checklist.map(t => t.id === updatedTask.id ? updatedTask : t) };
          });
      } else {
          newNodes = opportunity.bpmn.nodes.map(node => {
              if (node.id !== nodeId) return node;
              return { ...node, checklist: [...(node.checklist || []), updatedTask] };
          });
      }

      const updatedBpmn = { ...opportunity.bpmn, nodes: newNodes };
      const updatedOpp = { ...opportunity, bpmn: updatedBpmn };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);

      if (taskExists) {
          if (updatedTask.dbId || !isNaN(Number(updatedTask.id))) {
              const dbId = updatedTask.dbId || Number(updatedTask.id);
              await updateTask(dbId, {
                  titulo: updatedTask.text,
                  descricao: updatedTask.description,
                  status: updatedTask.status,
                  duracaohoras: updatedTask.estimatedHours,
                  datainicio: updatedTask.startDate,
                  datafim: updatedTask.dueDate,
                  gravidade: updatedTask.gut?.g,
                  urgencia: updatedTask.gut?.u,
                  tendencia: updatedTask.gut?.t
              });
          }
      } else {
          if (opportunity.dbProjectId && updatedTask.assigneeId) {
              await createTask({
                  projeto: opportunity.dbProjectId,
                  titulo: updatedTask.text,
                  descricao: updatedTask.description,
                  status: updatedTask.status,
                  responsavel: updatedTask.assigneeId,
                  gravidade: updatedTask.gut?.g,
                  urgencia: updatedTask.gut?.u,
                  tendencia: updatedTask.gut?.t,
                  datainicio: updatedTask.startDate,
                  datafim: updatedTask.dueDate,
                  duracaohoras: updatedTask.estimatedHours,
                  organizacao: opportunity.organizationId
              });
          }
      }
  };

  const canEditTask = (task: BpmnTask): boolean => {
      if (!isClient) return true;
      if (!task.assignee || !userName) return false;
      const assigneeNorm = task.assignee.trim().toLowerCase();
      const userNorm = userName.trim().toLowerCase();
      if (assigneeNorm === userNorm) return true;
      if (assigneeNorm.includes(userNorm.split(' ')[0])) return true;
      return false;
  };

  const toggleTaskStatus = async (e: React.MouseEvent, nodeId: string, taskId: string) => {
      e.stopPropagation(); 
      if (!opportunity.bpmn || !opportunity.bpmn.nodes) return;

      const node = opportunity.bpmn.nodes.find(n => n.id === nodeId);
      const task = node?.checklist?.find(t => t.id === taskId);
      if (task && !canEditTask(task)) {
          alert("Somente o responsável pode editar esta tarefa.");
          return;
      }

      const isNowDone = !task?.completed;
      const newStatus = isNowDone ? 'done' : 'todo';

      const newNodes = opportunity.bpmn.nodes.map(node => {
          if (node.id !== nodeId) return node;
          if (!node.checklist) return node;
          return {
              ...node,
              checklist: node.checklist.map(t => {
                  if (t.id !== taskId) return t;
                  return { ...t, completed: isNowDone, status: newStatus, completedAt: isNowDone ? new Date().toISOString() : undefined } as BpmnTask;
              })
          };
      });

      const updatedBpmn = { ...opportunity.bpmn, nodes: newNodes };
      const updatedOpp = { ...opportunity, bpmn: updatedBpmn };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);

      if (task && (task.dbId || !isNaN(Number(task.id)))) {
          const dbId = task.dbId || Number(task.id);
          await updateTask(dbId, { status: newStatus });
      }
  };

  const toggleFreeze = async () => {
      const newStatus = opportunity.status === 'Frozen' ? 'Active' : 'Frozen';
      const comments = addToStorytime(opportunity, `Projeto ${newStatus === 'Frozen' ? 'CONGELADO' : 'ATIVADO'} manualmente.`);
      const updatedOpp = { ...opportunity, status: newStatus, comments } as Opportunity;
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp); 
      await updateOpportunity(updatedOpp);
  };

  const togglePriorityLock = async () => {
      const newLock = !opportunity.priorityLock;
      const comments = addToStorytime(opportunity, `Prioridade ${newLock ? 'TRAVADA' : 'DESTRAVADA'}.`);
      const updatedOpp = { ...opportunity, priorityLock: newLock, comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      await updateOpportunity(updatedOpp);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      let fileUrl = '';
      try {
          const sanitizedName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "_");
          const fileName = `${Date.now()}-${sanitizedName}`;
          const filePath = `documentos/${fileName}`;
          const { error } = await supabase.storage.from('documentos').upload(filePath, file);
          if (error) throw error;
          const { data } = supabase.storage.from('documentos').getPublicUrl(filePath);
          fileUrl = data.publicUrl;
      } catch (err) {
          fileUrl = URL.createObjectURL(file);
      }

      const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
          uploadedAt: new Date().toISOString(),
          url: fileUrl
      };

      const comments = addToStorytime(opportunity, `Arquivo anexado: ${file.name}`, 'system', { fileId: newAttachment.id, fileName: newAttachment.name, fileUrl: fileUrl });
      const updatedOpp = { ...opportunity, attachments: [newAttachment, ...(opportunity.attachments || [])], comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      await updateOpportunity(updatedOpp);
      setIsUploading(false);
  };

  const handleDeleteFile = async (file: Attachment) => {
      if (!window.confirm(`Tem certeza que deseja excluir "${file.name}"?`)) return;
      const comments = addToStorytime(opportunity, `Arquivo removido: ${file.name}`);
      const updatedOpp = { ...opportunity, attachments: (opportunity.attachments || []).filter(a => a.id !== file.id), comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      await updateOpportunity(updatedOpp);
  };

  const handleSendComment = async () => {
      if (!newComment.trim()) return;
      const comments = addToStorytime(opportunity, newComment, 'user');
      const updatedOpp = { ...opportunity, comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      await updateOpportunity(updatedOpp);
      setNewComment('');
  };

  const score = opportunity.prioScore || 0;
  const isFrozen = opportunity.status === 'Frozen';
  
  const totalTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + (node.checklist ? node.checklist.length : 0), 0) || 0;
  const completedTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + (node.checklist ? node.checklist.filter(t => t.completed).length : 0), 0) || 0;

  // NOTE: This component is now mainly used within ProjectWorkspace as the "Overview" tab.
  // We remove the fixed overlay to let it flow in the workspace container.
  
  const tabs = [
        { id: 'overview', icon: LayoutDashboard, label: 'Visão Geral' },
        { id: 'files', icon: Paperclip, label: 'Arquivos', badge: opportunity.attachments?.length },
        { id: 'comments', icon: History, label: 'Storytime', badge: opportunity.comments?.length },
        { id: 'tasks', icon: ListTodo, label: 'Tarefas', badge: `${completedTasks}/${totalTasks}` },
        ...(!isClient ? [{ id: 'bpms', icon: GitMerge, label: 'BPMS' }] : [])
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-50/50 dark:bg-transparent">
      
      {/* Top Tabs - Styled to fit Workspace */}
      <div className="border-b border-slate-200 dark:border-white/5 px-6 py-0 sticky top-0 z-10 bg-white/80 dark:bg-black/40 backdrop-blur-xl">
         <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`h-14 flex items-center gap-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-amber-500 text-amber-600 dark:text-amber-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10'}`}>
                    <tab.icon className="w-4 h-4" /> 
                    {tab.label}
                    {tab.badge !== undefined && tab.badge !== 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>{tab.badge}</span>}
                </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            
            {activeTab === 'overview' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-ios-pop duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel rounded-3xl p-8">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <FileText className="w-6 h-6 text-slate-400"/> Descrição
                             </h3>
                             <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-lg font-light">{opportunity.description}</p>
                        </div>
                        <div className="glass-panel rounded-3xl p-8">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <Clock className="w-6 h-6 text-slate-400"/> Progresso
                             </h3>
                             <BurndownChart opportunity={opportunity} />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50"></div>
                             <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Score PRIO-6</span>
                                    <div className={`text-5xl font-black drop-shadow-lg ${score >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' : score >= 3.0 ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{score.toFixed(2)}</div>
                                </div>
                                <div className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mt-4">
                                    <div className={`h-full shadow-[0_0_15px_currentColor] ${score >= 4.0 ? 'bg-emerald-500 text-emerald-500' : score >= 3.0 ? 'bg-blue-500 text-blue-500' : 'bg-yellow-500 text-yellow-500'}`} style={{ width: `${(score/5)*100}%` }}></div>
                                </div>
                             </div>
                        </div>
                        <div className="glass-panel rounded-3xl p-8 space-y-6">
                            {[{ l: 'Arquétipo', v: opportunity.archetype, c: 'text-indigo-600 dark:text-indigo-400' }, { l: 'Intensidade', v: `Nível ${opportunity.intensity}`, c: 'text-pink-600 dark:text-pink-400' }, { l: 'RDE', v: opportunity.rde, c: opportunity.rde === 'Quente' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400' }].map((stat, i) => (
                                <div key={i}>
                                    <span className="text-slate-500 text-xs uppercase block mb-2 font-bold tracking-widest">{stat.l}</span>
                                    <span className={`${stat.c} font-bold text-xl tracking-tight`}>{stat.v}</span>
                                    {i < 2 && <div className="w-full h-px bg-slate-200 dark:bg-white/5 mt-6"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            )}
            
            {activeTab === 'files' && (
                <div className="h-full flex flex-col animate-ios-pop">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Arquivos</h3>
                        <div className="relative">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-12 bg-amber-600 hover:bg-amber-500 text-white px-6 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                {isUploading ? <CloudLightning className="w-4 h-4 animate-pulse"/> : <Paperclip className="w-4 h-4"/>}
                                Anexar
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(opportunity.attachments || []).map((file) => (
                            <div key={file.id} onClick={() => window.open(file.url || '#', '_blank')} className="glass-panel p-6 rounded-2xl flex items-center justify-between group hover:border-amber-500/50 transition-all cursor-pointer hover:-translate-y-1">
                                <div className="flex items-center gap-4 overflow-hidden flex-1 mr-4">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm shrink-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">{file.type}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{file.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{file.size}</div>
                                    </div>
                                </div>
                                {!isClient && <button onClick={(e) => {e.stopPropagation(); handleDeleteFile(file);}} className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash className="w-5 h-5"/></button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'comments' && (
                <div className="flex flex-col h-full max-w-5xl mx-auto w-full animate-ios-pop">
                    <div className="flex-1 overflow-y-auto p-6 mb-6 custom-scrollbar glass-panel rounded-3xl">
                        <div className="space-y-8">
                            {[...(opportunity.comments || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((comment) => (
                                <div key={comment.id} className="relative pl-6 border-l-2 border-slate-200 dark:border-white/10 group hover:border-slate-400 dark:hover:border-white/30 transition-colors">
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${comment.type === 'system' ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'} border-4 border-white dark:border-[#050505]`}></div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${comment.type === 'system' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{comment.author}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-600">{new Date(comment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 leading-relaxed">{comment.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escreva uma atualização..." className="w-full glass-input rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-amber-500 h-16 resize-none shadow-inner" />
                        <button onClick={handleSendComment} disabled={!newComment.trim()} className="h-16 w-16 flex items-center justify-center bg-amber-600 hover:bg-amber-500 text-white rounded-2xl transition-colors shadow-lg shadow-amber-900/20"><Send className="w-6 h-6"/></button>
                    </div>
                </div>
            )}

            {activeTab === 'tasks' && (
                <div className="h-full flex flex-col animate-ios-pop">
                    <div className="space-y-6 pb-10">
                        {opportunity.bpmn?.nodes?.map(node => (
                            <div key={node.id} className="glass-panel rounded-2xl overflow-hidden">
                                <div className="bg-slate-100 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-glow"></div> {node.label}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-slate-500 bg-slate-200 dark:bg-black/30 px-2 py-1 rounded-lg border border-slate-300 dark:border-white/5">{node.checklist ? node.checklist.filter(t => t.completed).length : 0}/{node.checklist ? node.checklist.length : 0}</span>
                                        {!isClient && (
                                            <button 
                                                onClick={() => handleAddNewTask(node.id, node.label)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                title="Adicionar nova tarefa nesta etapa"
                                            >
                                                <Plus className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-200 dark:divide-white/5">
                                    {(node.checklist || []).map(task => (
                                        <div key={task.id} onClick={() => canEditTask(task) && setEditingTask({nodeId: node.id, nodeLabel: node.label, task})} className={`flex items-center gap-6 p-6 transition-all ${canEditTask(task) ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5' : 'opacity-60'} group`}>
                                            <button onClick={(e) => toggleTaskStatus(e, node.id, task.id)} disabled={!canEditTask(task)} className={`shrink-0 transition-transform active:scale-90 ${canEditTask(task) ? 'text-slate-400 hover:text-slate-600 dark:hover:text-white' : 'text-slate-600'}`}>
                                                {task.completed ? <CheckSquare className="w-6 h-6 text-emerald-500 drop-shadow-md"/> : <Square className="w-6 h-6"/>}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-base font-medium truncate block ${task.completed ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200 group-hover:text-black dark:group-hover:text-white'}`}>{task.text}</span>
                                            </div>
                                            {task.assignee && <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-300 flex items-center gap-2"><User className="w-3 h-3"/> {task.assignee}</div>}
                                        </div>
                                    ))}
                                    {(!node.checklist || node.checklist.length === 0) && (
                                        <div className="p-6 text-center text-sm text-slate-500 italic">
                                            Nenhuma tarefa nesta etapa.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'bpms' && !isClient && (
                <div className="h-full flex flex-col animate-ios-pop duration-300">
                    <BpmnBuilder opportunity={opportunity} onSave={handleSaveBpmn} />
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
             onOpenProject={() => setEditingTask(null)} 
             onSave={(updatedTask) => handleTaskUpdateFromModal(editingTask.nodeId, updatedTask)}
          />
      )}
    </div>
  );
};

export default OpportunityDetail;
