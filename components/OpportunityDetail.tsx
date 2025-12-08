import React, { useState, useRef, useMemo } from 'react';
import { Opportunity, RDEStatus, BpmnData, ProjectStatus, BpmnTask, Attachment, Comment } from '../types';
import { updateOpportunity } from '../services/opportunityService';
import { updateTask, createTask, deleteTask } from '../services/projectService';
import { supabase } from '../services/supabaseClient';
import BpmnBuilder from './BpmnBuilder';
import TaskDetailModal from './TaskDetailModal';
import BurndownChart from './BurndownChart'; 
import { X, Edit, Trash2, Target, CheckCircle, Clock, AlertTriangle, FileText, DollarSign, Zap, GitMerge, LayoutDashboard, Snowflake, PlayCircle, ChevronDown, ChevronUp, Lock, Unlock, ListTodo, Calendar, User, CheckSquare, Square, Paperclip, History, Send, Download, File, Trash, ArrowLeft, ExternalLink, CloudLightning, Hash, Plus, BarChart3, Save, PieChart } from 'lucide-react';

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
  
  // Timesheet Accordion State
  const [expandedTimesheetUser, setExpandedTimesheetUser] = useState<string | null>(null);
  
  // Editable Description State
  const [editableDescription, setEditableDescription] = useState(initialOpp.description || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isClient = userRole === 'cliente';

  // --- Helper: Add to Storytime ---
  const addToStorytime = (opp: Opportunity, text: string, type: 'user' | 'system' = 'system', metadata?: any) => {
      // Prevent duplicates in short timeframe if needed, but for now just add
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
      const comments = addToStorytime(opportunity, 'Fluxo BPMN (Estrutura) atualizado via construtor.');
      const updatedOpp = { ...opportunity, bpmn: bpmnData, docsContext: docsContext || opportunity.docsContext, comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      await updateOpportunity(updatedOpp);
  };

  const handleAddNewTask = (nodeId: string, nodeLabel: string) => {
      const newTask: BpmnTask = {
          id: crypto.randomUUID(), // Temp ID
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

  const generateTaskDiffLog = (oldTask: BpmnTask, newTask: BpmnTask): string[] => {
      const changes: string[] = [];

      if (oldTask.text !== newTask.text) changes.push(`Renomeou de "${oldTask.text}" para "${newTask.text}"`);
      if (oldTask.description !== newTask.description) changes.push(`Alterou a descrição`);
      if (oldTask.status !== newTask.status) changes.push(`Alterou status de '${oldTask.status}' para '${newTask.status}'`);
      
      if (oldTask.assigneeId !== newTask.assigneeId) {
          const oldName = oldTask.assignee || 'Ninguém';
          const newName = newTask.assignee || 'Ninguém';
          changes.push(`Reatribuiu de ${oldName} para ${newName}`);
      }

      if (oldTask.estimatedHours !== newTask.estimatedHours) changes.push(`Ajustou horas de ${oldTask.estimatedHours}h para ${newTask.estimatedHours}h`);
      
      const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : '??';
      if (oldTask.dueDate !== newTask.dueDate) changes.push(`Mudou entrega de ${fmtDate(oldTask.dueDate)} para ${fmtDate(newTask.dueDate)}`);
      
      const oldGut = (oldTask.gut?.g || 0) * (oldTask.gut?.u || 0) * (oldTask.gut?.t || 0);
      const newGut = (newTask.gut?.g || 0) * (newTask.gut?.u || 0) * (newTask.gut?.t || 0);
      if (oldGut !== newGut) changes.push(`Atualizou prioridade GUT de ${oldGut} para ${newGut}`);

      const oldSubs = oldTask.subtasks?.length || 0;
      const newSubs = newTask.subtasks?.length || 0;
      if (oldSubs !== newSubs) changes.push(`${newSubs > oldSubs ? 'Adicionou' : 'Removeu'} subtarefas (${oldSubs} -> ${newSubs})`);

      return changes;
  };

  const handleTaskUpdateFromModal = async (nodeId: string, updatedTask: BpmnTask) => {
      if (!opportunity.bpmn || !opportunity.bpmn.nodes) return;
      
      const node = opportunity.bpmn.nodes.find(n => n.id === nodeId);
      const oldTask = node?.checklist?.find(t => t.id === updatedTask.id);
      const taskExists = !!oldTask;

      let newComments = opportunity.comments || [];
      const taskName = updatedTask.text || 'Tarefa sem nome';

      // --- STORYTIME LOGIC ---
      if (!taskExists) {
          // New Task Logic
          const text = `Nova tarefa criada na etapa ${node?.label}: "${taskName}".`;
          newComments = addToStorytime(opportunity, text, 'system');
      } else {
          // Update Logic (Diff)
          const changes = generateTaskDiffLog(oldTask, updatedTask);
          if (changes.length > 0) {
              const text = `Atualização em "${taskName}": ${changes.join('. ')}.`;
              newComments = addToStorytime(opportunity, text, 'system');
          }
      }

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
      const updatedOpp = { ...opportunity, bpmn: updatedBpmn, comments: newComments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);

      // Persist to DB
      await updateOpportunity(updatedOpp); 

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
                  tendencia: updatedTask.gut?.t,
                  responsavel: updatedTask.assigneeId // Ensure assignee is updated in DB
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

  const handleAttachmentAddedFromTask = (att: Attachment) => {
      // Update local state immediately so it shows in the "Files" tab
      const comments = addToStorytime(opportunity, `Arquivo anexado via Tarefa: ${att.name}`, 'system', { fileId: att.id, fileName: att.name, fileUrl: att.url });
      const updatedAttachments = [att, ...(opportunity.attachments || [])];
      const updatedOpp = { ...opportunity, attachments: updatedAttachments, comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      // Optional: Persist structure if needed, but projectService.addAttachmentToProject handles the DB side.
      // We might want to sync the new comments though.
      updateOpportunity(updatedOpp); 
  };

  const handleDeleteTask = async (nodeId: string, taskId: string) => {
      if (!opportunity.bpmn || !opportunity.bpmn.nodes) return;
      
      const node = opportunity.bpmn.nodes.find(n => n.id === nodeId);
      const taskToDelete = node?.checklist?.find(t => t.id === taskId);
      const taskName = taskToDelete?.text || 'Tarefa desconhecida';

      // --- STORYTIME LOGIC ---
      const comments = addToStorytime(opportunity, `Tarefa excluída: "${taskName}".`);

      const newNodes = opportunity.bpmn.nodes.map(node => {
          if (node.id !== nodeId) return node;
          return { ...node, checklist: node.checklist.filter(t => t.id !== taskId) };
      });

      const updatedBpmn = { ...opportunity.bpmn, nodes: newNodes };
      const updatedOpp = { ...opportunity, bpmn: updatedBpmn, comments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);
      setEditingTask(null);

      await updateOpportunity(updatedOpp);

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

      // STORYTIME LOGIC for toggle
      let newComments = opportunity.comments || [];
      if (task && !task.isSubtask) {
           const text = `Tarefa "${task.text}" marcada como ${isNowDone ? 'Concluída' : 'A Fazer'} (Status: ${newStatus}).`;
           newComments = addToStorytime(opportunity, text, 'system');
      }

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
      const updatedOpp = { ...opportunity, bpmn: updatedBpmn, comments: newComments };
      setOpportunity(updatedOpp);
      onUpdate(updatedOpp);

      // Persist status and comments
      await updateOpportunity(updatedOpp); 

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
          const { error } = await supabase.storage.from('documentos').upload(filePath, file, { upsert: true });
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
          const comments = addToStorytime(opportunity, "Descrição do projeto atualizada.");
          const updatedOpp = { ...opportunity, description: editableDescription, comments };
          setOpportunity(updatedOpp);
          onUpdate(updatedOpp);
          await updateOpportunity(updatedOpp);
      }
  };

  // --- Timesheet Data Aggregation ---
  const { timesheetData, totalProjectHours } = useMemo(() => {
      const usersMap = new Map<string, { id: string, name: string, totalHours: number, tasks: { title: string, hours: number, status: string, isSubtask: boolean, nodeLabel?: string }[] }>();
      let totalHours = 0;

      opportunity.bpmn?.nodes?.forEach(node => {
          node.checklist?.forEach(task => {
              // Process Main Task
              if (task.assigneeId) {
                  if (!usersMap.has(task.assigneeId)) {
                      usersMap.set(task.assigneeId, { id: task.assigneeId, name: task.assignee || 'Desconhecido', totalHours: 0, tasks: [] });
                  }
                  const userEntry = usersMap.get(task.assigneeId)!;
                  const h = Number(task.estimatedHours || 0);
                  userEntry.totalHours += h;
                  userEntry.tasks.push({ title: task.text, hours: h, status: task.status, isSubtask: false, nodeLabel: node.label });
                  totalHours += h;
              }

              // Process Subtasks
              task.subtasks?.forEach(sub => {
                  if (sub.assigneeId) {
                      if (!usersMap.has(sub.assigneeId)) {
                          usersMap.set(sub.assigneeId, { id: sub.assigneeId, name: sub.assignee || 'Desconhecido', totalHours: 0, tasks: [] });
                      }
                      const userEntry = usersMap.get(sub.assigneeId)!;
                      const h = Number(sub.estimatedHours || 0);
                      userEntry.totalHours += h;
                      userEntry.tasks.push({ title: sub.text, hours: h, status: sub.completed ? 'done' : 'todo', isSubtask: true, nodeLabel: node.label });
                      totalHours += h;
                  }
              });
          });
      });

      return {
          timesheetData: Array.from(usersMap.values()).sort((a,b) => b.totalHours - a.totalHours),
          totalProjectHours: totalHours
      };
  }, [opportunity.bpmn]);

  const score = opportunity.prioScore || 0;
  
  const totalTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + (node.checklist ? node.checklist.length : 0), 0) || 0;
  const completedTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + (node.checklist ? node.checklist.filter(t => t.completed).length : 0), 0) || 0;

  const tabs = [
        { id: 'overview', icon: LayoutDashboard, label: 'Visão Geral' },
        { id: 'files', icon: Paperclip, label: 'Arquivos', badge: opportunity.attachments?.length },
        { id: 'timesheet', icon: PieChart, label: 'Timesheets' }, // New Tab
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

            {/* TIMESHEET TAB */}
            {activeTab === 'timesheet' && (
                <div className="h-full flex flex-col animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/40 dark:bg-black/20 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-500"/> Alocação de Recursos
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Distribuição de horas estimadas por colaborador neste projeto.
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-500 uppercase block">Total Estimado</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{totalProjectHours}h</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {timesheetData.map(user => {
                            const percent = totalProjectHours > 0 ? (user.totalHours / totalProjectHours) * 100 : 0;
                            const isExpanded = expandedTimesheetUser === user.id;

                            return (
                                <div key={user.id} className="glass-panel rounded-xl border border-white/10 bg-white/30 dark:bg-black/10 overflow-hidden transition-all">
                                    <div 
                                        onClick={() => setExpandedTimesheetUser(isExpanded ? null : user.id)}
                                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-white/5' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-slate-300 dark:border-slate-700">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                                                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300 font-bold">{user.totalHours}h <span className="text-xs opacity-50 font-normal">({percent.toFixed(0)}%)</span></span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-4 text-slate-400">
                                            {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-black/20">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-white/5">
                                                        <th className="text-left pb-2 font-bold">Tarefa</th>
                                                        <th className="text-left pb-2 font-bold">Etapa</th>
                                                        <th className="text-right pb-2 font-bold">Status</th>
                                                        <th className="text-right pb-2 font-bold">Horas</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                                    {user.tasks.map((t, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                                            <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                                                                <div className="flex items-center gap-2">
                                                                    {t.isSubtask && <div className="w-2 h-2 border-l border-b border-slate-400 ml-1"></div>}
                                                                    <span className={t.isSubtask ? "italic text-xs" : "font-medium"}>{t.title}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 text-xs text-slate-500">{t.nodeLabel}</td>
                                                            <td className="py-2 text-right">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                                                    t.status === 'done' || t.status === 'completed'
                                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                                }`}>
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-400">{t.hours}h</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {timesheetData.length === 0 && (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                <p>Nenhuma hora alocada ainda.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'bpms' && (
                <div className="h-full animate-in fade-in">
                    <BpmnBuilder opportunity={opportunity} onSave={handleSaveBpmn} currentPlan={currentPlan} />
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
                                            
                                            {/* Checkbox (Status Toggle) - Isolated Click */}
                                            <button 
                                                onClick={(e) => toggleTaskStatus(e, node.id, task.id)}
                                                className="shrink-0 pt-0.5 focus:outline-none"
                                            >
                                                {task.completed ? <CheckSquare className="w-4 h-4 text-emerald-500"/> : <Square className="w-4 h-4 text-slate-400"/>}
                                            </button>

                                            {/* Content - Modal Trigger */}
                                            <div 
                                                className="flex flex-col flex-1 cursor-pointer min-w-0" 
                                                onClick={() => setEditingTask({nodeId: node.id, nodeLabel: node.label, task})}
                                            >
                                                <span className={`text-sm block leading-tight truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.text}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {task.assignee && <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500">{task.assignee}</span>}
                                                    {task.estimatedHours && <span className="text-[10px] text-slate-400">{task.estimatedHours}h</span>}
                                                </div>
                                            </div>

                                            {/* Edit Button (Redundant but consistent) */}
                                            <button 
                                                onClick={() => setEditingTask({nodeId: node.id, nodeLabel: node.label, task})} 
                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity"
                                            >
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
                                    {!isSharedMode && (
                                        <button onClick={() => handleDeleteFile(file)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-slate-500 hover:text-red-500 transition-colors">
                                            <Trash className="w-4 h-4"/>
                                        </button>
                                    )}
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
              onDelete={!isSharedMode ? (id) => handleDeleteTask(editingTask.nodeId, id) : undefined}
              onAttach={handleAttachmentAddedFromTask}
          />
      )}
    </div>
  );
};

export default OpportunityDetail;