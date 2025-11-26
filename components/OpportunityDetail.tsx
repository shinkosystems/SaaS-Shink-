
import React, { useState, useRef } from 'react';
import { Opportunity, RDEStatus, BpmnData, ProjectStatus, BpmnTask, Attachment, Comment } from '../types';
import { updateOpportunity } from '../services/opportunityService';
import { updateTask, createTask, deleteTask } from '../services/projectService';
import { supabase } from '../services/supabaseClient';
import BpmnBuilder from './BpmnBuilder';
import TaskDetailModal from './TaskDetailModal';
import BurndownChart from './BurndownChart'; 
import { X, Edit, Trash2, Target, CheckCircle, Clock, AlertTriangle, FileText, DollarSign, Zap, GitMerge, LayoutDashboard, Snowflake, PlayCircle, ChevronDown, Lock, Unlock, ListTodo, Calendar, User, CheckSquare, Square, Paperclip, History, Send, Download, File, Trash, ArrowLeft, ExternalLink, CloudLightning, Hash, Plus, BarChart3, Save } from 'lucide-react';

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
  
  // Editable Description State
  const [editableDescription, setEditableDescription] = useState(initialOpp.description || '');

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

  const handleDeleteTask = async (nodeId: string, taskId: string) => {
      // Remove from Local UI
      if (!opportunity.bpmn || !opportunity.bpmn.nodes) return;
      
      const newNodes = opportunity.bpmn.nodes.map(node => {
          if (node.id !== nodeId) return node;
          return { ...node, checklist: node.checklist.filter(t => t.id !== taskId) };
      });

      const updatedBpmn = { ...opportunity.bpmn, nodes: newNodes };
      const updatedOpp = { ...opportunity, bpmn: updatedBpmn };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      setEditingTask(null);

      // Remove from DB
      if (!isNaN(Number(taskId))) {
          await deleteTask(Number(taskId));
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

  const handleDescriptionSave = async () => {
      if (editableDescription !== opportunity.description) {
          const updatedOpp = { ...opportunity, description: editableDescription };
          setOpportunity(updatedOpp);
          onUpdate(updatedOpp);
          await updateOpportunity(updatedOpp);
      }
  };

  const score = opportunity.prioScore || 0;
  
  const totalTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + (node.checklist ? node.checklist.length : 0), 0) || 0;
  const completedTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + (node.checklist ? node.checklist.filter(t => t.completed).length : 0), 0) || 0;

  const tabs = [
        { id: 'overview', icon: LayoutDashboard, label: 'Visão Geral' },
        { id: 'files', icon: Paperclip, label: 'Arquivos', badge: opportunity.attachments?.length },
        { id: 'comments', icon: History, label: 'Storytime', badge: opportunity.comments?.length },
        { id: 'tasks', icon: ListTodo, label: 'Tarefas', badge: `${completedTasks}/${totalTasks}` },
        ...(!isClient ? [{ id: 'bpms', icon: GitMerge, label: 'BPMS' }] : [])
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-50/50 dark:bg-transparent">
      
      {/* Top Tabs */}
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
                        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-500"/> Descrição do Projeto
                                </h3>
                                {editableDescription !== opportunity.description && (
                                    <button onClick={handleDescriptionSave} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                                        <Save className="w-3 h-3"/> Salvar
                                    </button>
                                )}
                            </div>
                            <textarea 
                                value={editableDescription}
                                onChange={e => setEditableDescription(e.target.value)}
                                className="w-full bg-transparent text-slate-600 dark:text-slate-300 text-sm leading-relaxed outline-none resize-none h-48 custom-scrollbar"
                                placeholder="Sem descrição."
                            />
                        </div>

                        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-amber-500"/> Progresso & Burndown
                             </h3>
                             <BurndownChart opportunity={opportunity} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Métricas Chave</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl">
                                    <span className="text-xs text-slate-500 block mb-1">PRIO-6 Score</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{score.toFixed(1)}</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl">
                                    <span className="text-xs text-slate-500 block mb-1">Tarefas</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{completedTasks}/{totalTasks}</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl">
                                    <span className="text-xs text-slate-500 block mb-1">Velocidade</span>
                                    <span className="text-2xl font-black text-green-500">{opportunity.velocity}/5</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl">
                                    <span className="text-xs text-slate-500 block mb-1">Viabilidade</span>
                                    <span className="text-2xl font-black text-blue-500">{opportunity.viability}/5</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Arquétipo</h3>
                            <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                                <Target className="w-5 h-5"/>
                                <span className="font-bold">{opportunity.archetype}</span>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {activeTab === 'bpms' && (
                <div className="h-full animate-in fade-in">
                    <BpmnBuilder opportunity={opportunity} onSave={handleSaveBpmn} />
                </div>
            )}

            {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {opportunity.bpmn?.nodes.map(node => (
                        <div key={node.id} className="glass-panel p-4 rounded-xl border border-white/10 bg-white/40 dark:bg-black/20 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <h4 className="font-bold text-slate-900 dark:text-white truncate pr-2">{node.label}</h4>
                                <button onClick={() => handleAddNewTask(node.id, node.label)} className="text-slate-500 hover:text-amber-500 transition-colors">
                                    <Plus className="w-4 h-4"/>
                                </button>
                            </div>
                            <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                                {(node.checklist || []).map(task => (
                                    <div key={task.id} className="p-3 bg-white dark:bg-black/30 rounded-lg border border-slate-100 dark:border-white/5 hover:border-blue-500/50 transition-all group">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex gap-2 items-start flex-1 cursor-pointer" onClick={(e) => toggleTaskStatus(e, node.id, task.id)}>
                                                {task.completed ? <CheckSquare className="w-4 h-4 text-emerald-500 mt-0.5"/> : <Square className="w-4 h-4 text-slate-400 mt-0.5"/>}
                                                <div>
                                                    <span className={`text-sm block leading-tight ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.text}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {task.assignee && <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500">{task.assignee}</span>}
                                                        {task.estimatedHours && <span className="text-[10px] text-slate-400">{task.estimatedHours}h</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => setEditingTask({nodeId: node.id, nodeLabel: node.label, task})} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity">
                                                <Edit className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!node.checklist || node.checklist.length === 0) && (
                                    <div className="text-center py-4 text-xs text-slate-500 italic">Sem tarefas nesta etapa.</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'files' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Arquivos do Projeto</h3>
                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                            {isUploading ? <Clock className="w-4 h-4 animate-spin"/> : <Paperclip className="w-4 h-4"/>}
                            Upload
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
                        </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {opportunity.attachments?.map(file => (
                            <div key={file.id} className="glass-panel p-4 rounded-xl border border-white/10 bg-white/40 dark:bg-black/20 flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center text-slate-500">
                                    <File className="w-6 h-6"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={file.name}>{file.name}</h4>
                                    <p className="text-xs text-slate-500">{file.size} • {new Date(file.uploadedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={file.url} target="_blank" download className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 hover:text-blue-500 transition-colors">
                                        <Download className="w-4 h-4"/>
                                    </a>
                                    <button onClick={() => handleDeleteFile(file)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-slate-500 hover:text-red-500 transition-colors">
                                        <Trash className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!opportunity.attachments || opportunity.attachments.length === 0) && (
                            <div className="col-span-full text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                                <CloudLightning className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                                <p>Nenhum arquivo anexado ainda.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'comments' && (
                <div className="h-full flex flex-col animate-in fade-in">
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-4">
                        {opportunity.comments?.length === 0 && (
                            <div className="text-center text-slate-500 py-10">
                                <History className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                                <p>Nenhuma atividade registrada no Storytime.</p>
                            </div>
                        )}
                        {opportunity.comments?.map(comment => (
                            <div key={comment.id} className={`flex gap-4 ${comment.type === 'system' ? 'opacity-70' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    comment.type === 'system' ? 'bg-slate-200 dark:bg-white/10 text-slate-500' : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                                }`}>
                                    {comment.type === 'system' ? <Zap className="w-4 h-4"/> : comment.author.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{comment.author}</span>
                                        <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className={`text-sm p-3 rounded-xl rounded-tl-none inline-block max-w-3xl ${
                                        comment.type === 'system' ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 italic font-mono text-xs' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-white/5'
                                    }`}>
                                        {comment.text}
                                        {comment.metadata?.fileUrl && (
                                            <a href={comment.metadata.fileUrl} target="_blank" className="block mt-2 text-blue-500 hover:underline flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3"/> Ver Anexo
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-white dark:bg-black/40 border-t border-slate-200 dark:border-white/10 rounded-xl mt-4 flex gap-2 items-center">
                        <input 
                            type="text" 
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                            placeholder="Digite um comentário..."
                            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-500"
                        />
                        <button onClick={handleSendComment} disabled={!newComment.trim()} className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <Send className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            )}

          </div>
      </div>

      {/* Task Detail Modal */}
      {editingTask && (
          <TaskDetailModal 
              task={editingTask.task}
              nodeTitle={editingTask.nodeLabel}
              opportunityTitle={opportunity.title}
              onClose={() => setEditingTask(null)}
              onSave={(updatedTask) => handleTaskUpdateFromModal(editingTask.nodeId, updatedTask)}
              onDelete={(id) => handleDeleteTask(editingTask.nodeId, id)}
          />
      )}
    </div>
  );
};

export default OpportunityDetail;
