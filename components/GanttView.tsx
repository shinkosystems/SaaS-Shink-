
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, BpmnTask, DbTask, DbProject } from '../types';
import { ChevronDown, ChevronRight as ChevronRightIcon, Zap, Loader2, AlertTriangle, Columns, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Grid, LayoutGrid, Square, RefreshCw, Layers, CornerDownRight, Hash, CheckCircle2 } from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';
import { optimizeSchedule } from '../services/geminiService';
import { fetchAllTasks, updateTask, fetchDevelopers, fetchProjects } from '../services/projectService';
import { supabase } from '../services/supabaseClient';

interface Props {
  opportunities?: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: BpmnTask) => void;
  userRole?: string;
  projectId?: string; // Prop para filtro
  organizationId?: number; // Prop para filtrar por organização
}

// Estrutura Hierárquica para o Gantt
interface GanttRow {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  progress: number;
  type: 'project' | 'group' | 'task' | 'subtask';
  level: number; // 0=Proj, 1=Group, 2=Task, 3=Sub
  parentId?: string;
  expanded: boolean;
  visible: boolean;
  color?: string;
  
  // Contexto para edição
  dbTask?: DbTask;
  bpmnTask?: BpmnTask;
  oppId?: string;
  nodeTitle?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

export const GanttView: React.FC<Props> = ({ onSelectOpportunity, onTaskUpdate, userRole, projectId, organizationId }) => {
  const [filterProject, setFilterProject] = useState<string>(projectId || 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewDate, setViewDate] = useState(new Date());
  
  // Controla expansão por ID. Default: Projetos e Grupos expandidos.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const [editingTaskCtx, setEditingTaskCtx] = useState<{task: BpmnTask, oppId: string, nodeLabel: string} | null>(null);
  const [isBalancing, setIsBalancing] = useState(false);
  
  const [dbProjects, setDbProjects] = useState<DbProject[]>([]);
  const [allDbTasks, setAllDbTasks] = useState<DbTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Resize State ---
  const [isResizing, setIsResizing] = useState(false);
  const [resizeState, setResizeState] = useState<{
      taskId: string; // DB ID
      initialX: number;
      initialEndDate: Date;
      currentEndDate: Date;
  } | null>(null);

  useEffect(() => {
      if (projectId) setFilterProject(projectId);
  }, [projectId]);

  useEffect(() => {
      loadData();
  }, [organizationId]);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [projData, taskData] = await Promise.all([
              fetchProjects(organizationId),
              fetchAllTasks(organizationId)
          ]);
          
          setDbProjects(projData);
          setAllDbTasks(taskData);

          // Expandir Projetos e Grupos por padrão
          const initialExpanded = new Set<string>();
          projData.forEach(p => {
              const pId = `PROJ-${p.id}`;
              initialExpanded.add(pId);
              // Expand groups based on BPMN structure
              if (p.bpmn_structure && (p.bpmn_structure as any).nodes) {
                  (p.bpmn_structure as any).nodes.forEach((n: any) => {
                      initialExpanded.add(`GRP-${p.id}-${n.id}`);
                  });
              }
          });
          // Expand Orphans Group
          initialExpanded.add('GRP-ADHOC');
          
          // Merge with existing state if re-loading to keep user preference
          setExpandedIds(prev => new Set([...prev, ...initialExpanded]));

      } catch (e) {
          console.error("Erro ao carregar dados Gantt", e);
      } finally {
          setIsLoading(false);
      }
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  // --- Navigation Logic ---
  const handlePrev = () => {
      const newDate = new Date(viewDate);
      if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1);
      if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
      if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
      if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
      setViewDate(newDate);
  };

  const handleNext = () => {
      const newDate = new Date(viewDate);
      if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1);
      if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
      if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
      if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
      setViewDate(newDate);
  };

  const currentRangeLabel = useMemo(() => {
      const d = new Date(viewDate);
      if (viewMode === 'day') return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      if (viewMode === 'month') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      if (viewMode === 'year') return d.getFullYear().toString();
      
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `Semana ${startOfWeek.getDate()}/${startOfWeek.getMonth()+1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth()+1}`;
  }, [viewDate, viewMode]);

  // --- CORE LOGIC: Build the 4-Level Hierarchy ---
  const rows = useMemo(() => {
      const result: GanttRow[] = [];
      
      // Helper to parse safe date
      const safeDate = (d?: string) => d ? new Date(d) : new Date();
      const getTaskDates = (t: DbTask) => {
          let s = safeDate(t.datainicio || t.dataproposta);
          let e = safeDate(t.datafim || t.deadline || t.dataproposta);
          if (e < s) e = new Date(s);
          return { start: s, end: e };
      };

      // 1. Map DB Tasks for quick access
      const tasksByProject = new Map<number, DbTask[]>();
      const adhocTasks: DbTask[] = [];
      
      allDbTasks.forEach(t => {
          if (t.projeto) {
              if (!tasksByProject.has(t.projeto)) tasksByProject.set(t.projeto, []);
              tasksByProject.get(t.projeto)!.push(t);
          } else {
              adhocTasks.push(t);
          }
      });

      // 2. Iterate Projects (Level 1)
      dbProjects.forEach(proj => {
          if (filterProject !== 'all' && proj.id.toString() !== filterProject) return;

          const projId = `PROJ-${proj.id}`;
          const projExpanded = expandedIds.has(projId);
          
          // Project Row
          const projectRow: GanttRow = {
              id: projId,
              title: proj.nome,
              start: new Date(8640000000000000), // Will shrink
              end: new Date(-8640000000000000), // Will grow
              status: 'active',
              progress: 0,
              type: 'project',
              level: 0,
              expanded: projExpanded,
              visible: true,
              color: 'bg-indigo-600'
          };

          const projectTasks = tasksByProject.get(proj.id) || [];
          const groupRows: GanttRow[] = [];
          
          // Extract Groups from BPMN (Level 2)
          // If no BPMN structure, we create a "Geral" group
          let bpmnNodes: any[] = [];
          if (proj.bpmn_structure && (proj.bpmn_structure as any).nodes) {
              bpmnNodes = (proj.bpmn_structure as any).nodes;
          }

          if (bpmnNodes.length === 0) {
              bpmnNodes.push({ id: 'default', label: 'Execução Geral', checklist: [] });
          }

          // Bucket tasks into groups based on matching titles in BPMN or fallback
          // To simplify: We will iterate BPMN Nodes to create Groups.
          // Then we try to match "Main Tasks" (Level 3) to these nodes.
          
          const usedTaskIds = new Set<number>();

          bpmnNodes.forEach(node => {
              const groupId = `GRP-${proj.id}-${node.id}`;
              const groupExpanded = expandedIds.has(groupId);
              
              const groupRow: GanttRow = {
                  id: groupId,
                  title: node.label,
                  start: new Date(8640000000000000),
                  end: new Date(-8640000000000000),
                  status: 'active',
                  progress: 0,
                  type: 'group',
                  level: 1,
                  parentId: projId,
                  expanded: groupExpanded,
                  visible: projExpanded,
                  color: 'bg-slate-500'
              };

              const childTaskRows: GanttRow[] = [];

              // Find tasks that belong to this node. 
              // Matching Logic: Exact Title match from BPMN checklist.
              // If BPMN checklist has tasks, we look for DB tasks with same title.
              if (node.checklist) {
                  node.checklist.forEach((chk: any) => {
                      // Find corresponding DB Task (Level 3)
                      const dbTask = projectTasks.find(t => t.titulo === chk.text && !t.sutarefa && !usedTaskIds.has(t.id));
                      
                      if (dbTask) {
                          usedTaskIds.add(dbTask.id);
                          const { start, end } = getTaskDates(dbTask);
                          const taskId = `TASK-${dbTask.id}`;
                          const taskExpanded = expandedIds.has(taskId);

                          const taskRow: GanttRow = {
                              id: taskId,
                              title: dbTask.titulo,
                              start,
                              end,
                              status: dbTask.status,
                              progress: dbTask.status === 'done' ? 100 : 0,
                              type: 'task',
                              level: 2,
                              parentId: groupId,
                              expanded: taskExpanded,
                              visible: projExpanded && groupExpanded,
                              color: dbTask.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500',
                              dbTask: dbTask,
                              oppId: proj.id.toString(),
                              nodeTitle: node.label,
                              bpmnTask: { // Minimal adapter for modal
                                  id: dbTask.id.toString(),
                                  text: dbTask.titulo,
                                  status: dbTask.status as any,
                                  completed: dbTask.status === 'done',
                                  startDate: dbTask.datainicio,
                                  dueDate: dbTask.datafim,
                                  estimatedHours: dbTask.duracaohoras
                              }
                          };

                          // Find Subtasks (Level 4)
                          const subtasks = projectTasks.filter(st => (st.tarefamae === dbTask.id || st.tarefa === dbTask.id) && st.sutarefa);
                          const subRows: GanttRow[] = [];

                          subtasks.forEach(sub => {
                              usedTaskIds.add(sub.id); // Mark subtask as used
                              const { start: sStart, end: sEnd } = getTaskDates(sub);
                              subRows.push({
                                  id: `SUB-${sub.id}`,
                                  title: sub.titulo,
                                  start: sStart,
                                  end: sEnd,
                                  status: sub.status,
                                  progress: sub.status === 'done' ? 100 : 0,
                                  type: 'subtask',
                                  level: 3,
                                  parentId: taskId,
                                  expanded: false,
                                  visible: projExpanded && groupExpanded && taskExpanded,
                                  color: 'bg-purple-400',
                                  dbTask: sub,
                                  oppId: proj.id.toString(),
                                  nodeTitle: node.label,
                                  bpmnTask: {
                                      id: sub.id.toString(),
                                      text: sub.titulo,
                                      status: sub.status as any,
                                      completed: sub.status === 'done',
                                      startDate: sub.datainicio,
                                      dueDate: sub.datafim,
                                      estimatedHours: sub.duracaohoras,
                                      isSubtask: true
                                  }
                              });
                              // Update Group Range based on subtasks too
                              if (sStart < groupRow.start) groupRow.start = sStart;
                              if (sEnd > groupRow.end) groupRow.end = sEnd;
                          });

                          childTaskRows.push(taskRow, ...subRows);

                          // Update Group Range based on tasks
                          if (start < groupRow.start) groupRow.start = start;
                          if (end > groupRow.end) groupRow.end = end;
                      }
                  });
              }

              // Only add group if it has items or if strictly defined
              if (childTaskRows.length > 0) {
                  groupRows.push(groupRow, ...childTaskRows);
                  // Update Project Range based on groups
                  if (groupRow.start < projectRow.start) projectRow.start = groupRow.start;
                  if (groupRow.end > projectRow.end) projectRow.end = groupRow.end;
              }
          });

          // Handle tasks that didn't match any node (Orphans within project)
          const orphans = projectTasks.filter(t => !usedTaskIds.has(t.id) && !t.sutarefa);
          if (orphans.length > 0) {
              const miscGroupId = `GRP-${proj.id}-MISC`;
              const miscExpanded = expandedIds.has(miscGroupId);
              const miscGroupRow: GanttRow = {
                  id: miscGroupId,
                  title: "Outras Tarefas",
                  start: new Date(8640000000000000),
                  end: new Date(-8640000000000000),
                  status: 'active',
                  progress: 0,
                  type: 'group',
                  level: 1,
                  parentId: projId,
                  expanded: miscExpanded,
                  visible: projExpanded,
                  color: 'bg-slate-400'
              };
              
              const miscChildRows: GanttRow[] = [];
              orphans.forEach(t => {
                  const { start, end } = getTaskDates(t);
                  const tId = `TASK-${t.id}`;
                  const tExpanded = expandedIds.has(tId);
                  
                  const tRow: GanttRow = {
                      id: tId,
                      title: t.titulo,
                      start, end, status: t.status, progress: t.status === 'done' ? 100 : 0,
                      type: 'task', level: 2, parentId: miscGroupId, expanded: tExpanded,
                      visible: projExpanded && miscExpanded, color: 'bg-blue-500',
                      dbTask: t, oppId: proj.id.toString(), nodeTitle: 'Geral',
                      bpmnTask: { id: t.id.toString(), text: t.titulo, status: t.status as any, completed: t.status === 'done', startDate: t.datainicio, dueDate: t.datafim, estimatedHours: t.duracaohoras }
                  };

                  // Check for subtasks of orphans
                  const subs = projectTasks.filter(st => (st.tarefamae === t.id) && st.sutarefa);
                  const subRows: GanttRow[] = subs.map(s => {
                      const { start: sS, end: sE } = getTaskDates(s);
                      // Update bounds
                      if (sS < miscGroupRow.start) miscGroupRow.start = sS;
                      if (sE > miscGroupRow.end) miscGroupRow.end = sE;
                      
                      return {
                          id: `SUB-${s.id}`,
                          title: s.titulo,
                          start: sS, end: sE, status: s.status, progress: s.status === 'done' ? 100 : 0,
                          type: 'subtask', level: 3, parentId: tId, expanded: false,
                          visible: projExpanded && miscExpanded && tExpanded, color: 'bg-purple-400',
                          dbTask: s, oppId: proj.id.toString(), nodeTitle: 'Geral',
                          bpmnTask: { id: s.id.toString(), text: s.titulo, status: s.status as any, completed: s.status === 'done', startDate: s.datainicio, dueDate: s.datafim, estimatedHours: s.duracaohoras, isSubtask: true }
                      };
                  });

                  miscChildRows.push(tRow, ...subRows);
                  if (start < miscGroupRow.start) miscGroupRow.start = start;
                  if (end > miscGroupRow.end) miscGroupRow.end = end;
              });

              groupRows.push(miscGroupRow, ...miscChildRows);
              if (miscGroupRow.start < projectRow.start) projectRow.start = miscGroupRow.start;
              if (miscGroupRow.end > projectRow.end) projectRow.end = miscGroupRow.end;
          }

          // Validates Project Bounds (if empty)
          if (projectRow.start.getTime() > projectRow.end.getTime()) {
              projectRow.start = new Date();
              projectRow.end = new Date();
          }

          result.push(projectRow, ...groupRows);
      });

      // 3. Handle Adhoc Tasks (Level 1: "Tarefas Avulsas")
      if (adhocTasks.length > 0 && (filterProject === 'all' || filterProject === 'adhoc')) {
          const adhocProjId = 'PROJ-ADHOC';
          const adhocExpanded = expandedIds.has(adhocProjId);
          
          const adhocRow: GanttRow = {
              id: adhocProjId, title: "Tarefas Avulsas", start: new Date(), end: new Date(),
              status: 'active', progress: 0, type: 'project', level: 0, expanded: adhocExpanded, visible: true, color: 'bg-amber-600'
          };

          const adhocItems: GanttRow[] = [];
          let minS = new Date(8640000000000000), maxE = new Date(-8640000000000000);

          adhocTasks.forEach(t => {
              // Main Tasks only (assuming adhoc subtasks are linked to adhoc parents, handled below if hierarchy exists, but adhoc usually flat)
              if (!t.sutarefa) {
                  const { start, end } = getTaskDates(t);
                  const tId = `TASK-${t.id}`;
                  const tExpanded = expandedIds.has(tId);
                  
                  const row: GanttRow = {
                      id: tId, title: t.titulo, start, end, status: t.status, progress: t.status === 'done' ? 100 : 0,
                      type: 'task', level: 1, parentId: adhocProjId, expanded: tExpanded, visible: adhocExpanded, color: 'bg-amber-500',
                      dbTask: t, oppId: '', nodeTitle: 'Avulso',
                      bpmnTask: { id: t.id.toString(), text: t.titulo, status: t.status as any, completed: t.status === 'done', startDate: t.datainicio, dueDate: t.datafim, estimatedHours: t.duracaohoras }
                  };

                  // Check subtasks
                  const subs = adhocTasks.filter(st => st.tarefamae === t.id && st.sutarefa);
                  const subRows: GanttRow[] = subs.map(s => {
                      const { start: sS, end: sE } = getTaskDates(s);
                      if (sS < minS) minS = sS; if (sE > maxE) maxE = sE;
                      return {
                          id: `SUB-${s.id}`, title: s.titulo, start: sS, end: sE, status: s.status, progress: s.status === 'done' ? 100 : 0,
                          type: 'subtask', level: 2, parentId: tId, expanded: false, visible: adhocExpanded && tExpanded, color: 'bg-purple-400',
                          dbTask: s, oppId: '', nodeTitle: 'Avulso',
                          bpmnTask: { id: s.id.toString(), text: s.titulo, status: s.status as any, completed: s.status === 'done', startDate: s.datainicio, dueDate: s.datafim, estimatedHours: s.duracaohoras, isSubtask: true }
                      };
                  });

                  adhocItems.push(row, ...subRows);
                  if (start < minS) minS = start;
                  if (end > maxE) maxE = end;
              }
          });

          adhocRow.start = minS.getTime() === 8640000000000000 ? new Date() : minS;
          adhocRow.end = maxE.getTime() === -8640000000000000 ? new Date() : maxE;
          
          result.push(adhocRow, ...adhocItems);
      }

      return result;
  }, [dbProjects, allDbTasks, expandedIds, filterProject]);

  const handleAutoBalance = async () => {
      setIsBalancing(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          let orgId = 3;
          if (user) {
              const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
              if (userData) orgId = userData.organizacao;
          }
          const availableDevs = await fetchDevelopers(orgId);
          if (availableDevs.length === 0) {
              alert("Não há desenvolvedores disponíveis.");
              setIsBalancing(false); return;
          }

          // Coleta tasks pendentes
          const pendingTasks = allDbTasks.filter(t => t.status !== 'done' && t.organizacao === orgId && !t.sutarefa);
          if (pendingTasks.length === 0) { alert("Nada para balancear."); setIsBalancing(false); return; }

          const mapped = pendingTasks.map(t => ({
              taskId: t.id, taskText: t.titulo, assigneeId: t.responsavel, estimatedHours: t.duracaohoras, gut: { g: t.gravidade, u: t.urgencia, t: t.tendencia }
          }));

          const updates = await optimizeSchedule(mapped, availableDevs);
          
          for (const up of updates) {
              const payload: any = { datainicio: up.startDate, datafim: up.dueDate };
              if (up.assigneeId) payload.responsavel = up.assigneeId;
              await updateTask(Number(up.id), payload);
          }
          await loadData();
          alert("Cronograma otimizado!");
      } catch (e) {
          alert("Erro ao balancear.");
      } finally {
          setIsBalancing(false);
      }
  };

  // --- VIEW CONFIG ---
  const viewConfig = useMemo(() => {
      switch (viewMode) {
          case 'day': return { colWidth: 60, stepMs: 1000 * 60 * 60 * 24, labelFormat: (d: Date) => d.getDate().toString() };
          case 'week': return { colWidth: 40, stepMs: 1000 * 60 * 60 * 24, labelFormat: (d: Date) => d.getDate().toString() };
          case 'month': return { colWidth: 100, stepMs: 1000 * 60 * 60 * 24 * 30, labelFormat: (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }) };
          case 'year': return { colWidth: 120, stepMs: 1000 * 60 * 60 * 24 * 365, labelFormat: (d: Date) => d.getFullYear().toString() };
          default: return { colWidth: 50, stepMs: 1000 * 60 * 60 * 24, labelFormat: (d: Date) => d.getDate().toString() };
      }
  }, [viewMode]);

  const timelineCols = useMemo(() => {
      const cols = [];
      const curr = new Date(viewDate);
      
      if (viewMode === 'day' || viewMode === 'week') {
          curr.setDate(curr.getDate() - 5);
          const count = viewMode === 'day' ? 30 : 60;
          for (let i = 0; i < count; i++) {
              cols.push(new Date(curr));
              curr.setDate(curr.getDate() + 1);
          }
      } else if (viewMode === 'month') {
          curr.setDate(1); curr.setMonth(curr.getMonth() - 2);
          for (let i = 0; i < 18; i++) {
              cols.push(new Date(curr));
              curr.setMonth(curr.getMonth() + 1);
          }
      } else if (viewMode === 'year') {
          curr.setMonth(0, 1); curr.setFullYear(curr.getFullYear() - 1);
          for (let i = 0; i < 5; i++) {
              cols.push(new Date(curr));
              curr.setFullYear(curr.getFullYear() + 1);
          }
      }
      return cols;
  }, [viewDate, viewMode]);

  const getBarPosition = (start: Date, end: Date) => {
      const timelineStart = timelineCols[0];
      if (!timelineStart) return { left: 0, width: 0 };
      
      let diffStart = 0;
      let duration = 0;

      if (viewMode === 'day' || viewMode === 'week') {
          const dayMs = 1000 * 60 * 60 * 24;
          diffStart = (start.getTime() - timelineStart.getTime()) / dayMs;
          duration = Math.max(1, (end.getTime() - start.getTime()) / dayMs) + 1;
      } else if (viewMode === 'month') {
          diffStart = (start.getFullYear() - timelineStart.getFullYear()) * 12 + (start.getMonth() - timelineStart.getMonth()) + (start.getDate() / 30);
          duration = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      } else if (viewMode === 'year') {
          diffStart = (start.getFullYear() - timelineStart.getFullYear()) + (start.getMonth() / 12);
          duration = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }

      return { left: diffStart * viewConfig.colWidth, width: duration * viewConfig.colWidth };
  };

  useEffect(() => {
    if (!isResizing || !resizeState) return;
    const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeState.initialX;
        let daysDelta = 0;
        if (viewMode === 'day' || viewMode === 'week') daysDelta = Math.round(deltaX / viewConfig.colWidth);
        else if (viewMode === 'month') daysDelta = Math.round(deltaX / viewConfig.colWidth * 30);
        else daysDelta = Math.round(deltaX / viewConfig.colWidth * 365);

        const newEnd = new Date(resizeState.initialEndDate);
        newEnd.setDate(newEnd.getDate() + daysDelta);
        setResizeState(prev => prev ? ({ ...prev, currentEndDate: newEnd }) : null);
    };
    const handleMouseUp = async () => {
         setIsResizing(false);
         if (resizeState) {
             const dateStr = resizeState.currentEndDate.toISOString().split('T')[0];
             await updateTask(Number(resizeState.taskId), { datafim: dateStr });
             loadData();
         }
         setResizeState(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeState, viewConfig, viewMode]);

  // Logic to click item
  const handleRowClick = (row: GanttRow) => {
      if (row.type === 'project' || row.type === 'group') {
          toggleExpand(row.id);
      } else if ((row.type === 'task' || row.type === 'subtask') && row.bpmnTask) {
          setEditingTaskCtx({
              task: row.bpmnTask,
              oppId: row.oppId || '',
              nodeLabel: row.nodeTitle || 'Detalhes'
          });
      }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
        {/* HEADER CONTROLS (Same as before) */}
        <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
             <div>
                {!projectId && (
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Columns className="w-8 h-8 text-teal-500"/> Gantt Chart
                    </h2>
                )}
                <div className="flex items-center gap-3 mt-1">
                    {!projectId && <p className="text-slate-500 dark:text-slate-400 text-sm">Planejamento cronológico.</p>}
                    <div className="flex items-center gap-2 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                        <CalendarIcon className="w-3 h-3 text-teal-600 dark:text-teal-400"/>
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300 capitalize">{currentRangeLabel}</span>
                    </div>
                </div>
             </div>
             
             <div className="flex flex-wrap items-center gap-2">
                 <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                     <button onClick={handlePrev} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                     <div className="relative px-2">
                         <input type="date" value={viewDate.toISOString().split('T')[0]} onChange={(e) => setViewDate(new Date(e.target.value))} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer w-[24px] opacity-0 absolute inset-0" />
                         <CalendarIcon className="w-4 h-4 text-slate-500 pointer-events-none"/>
                     </div>
                     <button onClick={handleNext} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"><ChevronRight className="w-4 h-4"/></button>
                 </div>

                 <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {['day', 'week', 'month', 'year'].map(m => (
                        <button key={m} onClick={() => setViewMode(m as ViewMode)} className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${viewMode === m ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{m === 'day' ? 'Dia' : m === 'week' ? 'Sem' : m === 'month' ? 'Mês' : 'Ano'}</button>
                    ))}
                 </div>

                 <button onClick={handleAutoBalance} disabled={isBalancing} className="px-4 py-2 bg-purple-600 text-white rounded-xl flex items-center gap-2 shadow-lg hover:bg-purple-500 disabled:opacity-50 text-xs font-bold">
                     {isBalancing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3"/>} Otimizar (AI)
                 </button>
                 <button onClick={loadData} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}/></button>
             </div>
        </div>

        {/* GANTT AREA */}
        <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex bg-white dark:bg-slate-900 shadow-xl">
            
            {/* Left Sidebar: Tree Structure */}
            <div className="w-[300px] flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 shrink-0">
                <div className="h-12 flex items-center px-4 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-500 uppercase bg-white dark:bg-slate-900">
                    Estrutura do Projeto
                </div>
                <div className="flex-1 overflow-y-hidden">
                    {rows.map(row => {
                        if (!row.visible) return null;
                        return (
                            <div 
                                key={row.id} 
                                className={`h-10 flex items-center px-4 border-b border-slate-100 dark:border-slate-800/50 text-sm hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer truncate transition-colors
                                    ${row.type === 'project' ? 'font-bold bg-slate-200/50 dark:bg-slate-800/50' : ''}
                                    ${row.type === 'group' ? 'font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/30 dark:bg-slate-800/20' : ''}
                                    ${row.type === 'subtask' ? 'text-slate-500 text-xs' : ''}
                                `}
                                onClick={() => handleRowClick(row)}
                                style={{ paddingLeft: (row.level * 16) + 12 }}
                            >
                                <div className="mr-2 shrink-0 text-slate-400">
                                    {(row.type === 'project' || row.type === 'group' || (row.type === 'task' && rows.some(r => r.parentId === row.id))) ? (
                                        row.expanded ? <ChevronDown className="w-3 h-3"/> : <ChevronRightIcon className="w-3 h-3"/>
                                    ) : (
                                        row.type === 'subtask' ? <CornerDownRight className="w-3 h-3"/> : <Square className="w-2 h-2 rounded-full bg-slate-300"/>
                                    )}
                                </div>
                                <span className="truncate">{row.title}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Right Sidebar: Timeline */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-950">
                {/* Header Dates */}
                <div className="h-12 flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    {timelineCols.map((date, i) => (
                        <div 
                            key={i} 
                            className="shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-[10px] font-bold uppercase text-slate-500" 
                            style={{ width: viewConfig.colWidth }}
                        >
                            {viewConfig.labelFormat(date)}
                        </div>
                    ))}
                </div>

                {/* Bars */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    <div className="absolute inset-0 flex pointer-events-none h-full">
                        {timelineCols.map((_, i) => (
                            <div key={i} className="shrink-0 border-r border-slate-200/50 dark:border-slate-800/50 h-full" style={{ width: viewConfig.colWidth }}></div>
                        ))}
                    </div>
                    <div className="relative z-10 pb-10">
                        {rows.map(row => {
                            if (!row.visible) return null;
                            const endDate = (isResizing && resizeState?.taskId === row.dbTask?.id.toString()) ? resizeState.currentEndDate : row.end;
                            const pos = getBarPosition(row.start, endDate);
                            
                            // Hide bars completely out of view
                            if (pos.left + pos.width < 0) return <div key={row.id} className="h-10 border-b border-transparent"></div>;

                            return (
                                <div key={row.id} className="h-10 border-b border-transparent flex items-center relative group hover:bg-white/5">
                                    <div 
                                        className={`absolute h-6 rounded-md shadow-sm flex items-center px-2 text-[10px] text-white font-bold whitespace-nowrap overflow-hidden transition-all ${row.color || 'bg-slate-400'}`}
                                        style={{ 
                                            left: Math.max(0, pos.left), 
                                            width: Math.max(viewConfig.colWidth / 2, pos.width),
                                            opacity: row.type === 'project' ? 0.8 : row.type === 'group' ? 0.6 : 1 
                                        }}
                                        title={`${row.title} (${row.start.toLocaleDateString()} - ${row.end.toLocaleDateString()})`}
                                    >
                                        {pos.width > 30 && row.title}
                                        
                                        {/* Resize Handle for Tasks/Subtasks */}
                                        {(row.type === 'task' || row.type === 'subtask') && (
                                            <div 
                                                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/20 z-20"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    setIsResizing(true);
                                                    setResizeState({
                                                        taskId: row.dbTask!.id.toString(),
                                                        initialX: e.clientX,
                                                        initialEndDate: row.end,
                                                        currentEndDate: row.end
                                                    });
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* Modal */}
        {editingTaskCtx && (
            <TaskDetailModal 
                task={editingTaskCtx.task}
                nodeTitle={editingTaskCtx.nodeLabel}
                onClose={() => setEditingTaskCtx(null)}
                onSave={async (updated) => {
                    if (updated.id) {
                        const dbId = Number(updated.id);
                        if (!isNaN(dbId)) {
                            await updateTask(dbId, {
                                titulo: updated.text,
                                descricao: updated.description,
                                status: updated.status,
                                responsavel: updated.assigneeId,
                                duracaohoras: updated.estimatedHours,
                                datafim: updated.dueDate,
                                datainicio: updated.startDate
                            });
                        }
                    }
                    loadData();
                }}
            />
        )}
    </div>
  );
};
