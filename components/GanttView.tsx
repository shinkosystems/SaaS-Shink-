
import React, { useState, useMemo, useEffect } from 'react';
import { Opportunity, BpmnTask, DbTask } from '../types';
import { ChevronDown, ChevronRight as ChevronRightIcon, Zap, Loader2, AlertTriangle, Columns, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Grid, LayoutGrid, Square, RefreshCw } from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';
import { optimizeSchedule } from '../services/geminiService';
import { fetchAllTasks, updateTask, fetchDevelopers } from '../services/projectService';
import { supabase } from '../services/supabaseClient';

interface Props {
  opportunities?: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: BpmnTask) => void;
  userRole?: string;
  projectId?: string; // Prop para filtro
}

interface GanttTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  assignee?: string;
  progress: number;
  type: 'project' | 'task' | 'subtask';
  parentId?: string;
  oppId?: string;
  expanded?: boolean;
  color?: string;
  originalTask?: BpmnTask;
  dbTask?: DbTask;
  estimatedHours?: number;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

export const GanttView: React.FC<Props> = ({ onSelectOpportunity, onTaskUpdate, userRole, projectId }) => {
  const [filterProject, setFilterProject] = useState<string>(projectId || 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewDate, setViewDate] = useState(new Date());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingTaskCtx, setEditingTaskCtx] = useState<{task: BpmnTask, oppId: string, nodeLabel: string} | null>(null);
  const [isBalancing, setIsBalancing] = useState(false);
  const [allDbTasks, setAllDbTasks] = useState<DbTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Resize State ---
  const [isResizing, setIsResizing] = useState(false);
  const [resizeState, setResizeState] = useState<{
      taskId: string;
      initialX: number;
      initialEndDate: Date;
      currentEndDate: Date;
      originalTask: BpmnTask;
  } | null>(null);

  useEffect(() => {
      if (projectId) setFilterProject(projectId);
  }, [projectId]);

  useEffect(() => {
      loadTasks();
  }, []);

  const loadTasks = async () => {
      setIsLoading(true);
      const data = await fetchAllTasks();
      if (Array.isArray(data)) {
          setAllDbTasks(data);
          // Auto expand projects and tasks by default
          const newExpanded = new Set<string>();
          data.forEach(t => {
              newExpanded.add(`PROJ-${t.projeto}`);
              if (!t.sutarefa) newExpanded.add(`TASK-${t.id}`);
          });
          setExpandedIds(newExpanded);
      } else {
          setAllDbTasks([]);
      }
      setIsLoading(false);
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
      
      // Week logic
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `Semana ${Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)} (${startOfWeek.getDate()}/${startOfWeek.getMonth()+1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth()+1})`;
  }, [viewDate, viewMode]);

  // --- Data Transformation: DbTask -> Gantt Rows ---
  const { rows, flatList } = useMemo(() => {
    let processedRows: GanttTask[] = [];
    let flat: GanttTask[] = [];
    
    if (!Array.isArray(allDbTasks)) return { rows: [], flatList: [] };

    const projectsMap = new Map<number | null, DbTask[]>();
    allDbTasks.forEach(t => {
        if (!projectsMap.has(t.projeto)) projectsMap.set(t.projeto, []);
        projectsMap.get(t.projeto)?.push(t);
    });

    projectsMap.forEach((tasks, projectId) => {
        // FIX: Safety check for null projectId (Adhoc tasks)
        const pidStr = projectId?.toString();
        if (filterProject !== 'all' && pidStr !== filterProject) return;

        const projectTitle = tasks[0]?.projetoData?.nome || (projectId ? `Projeto ${projectId}` : 'Tarefas Avulsas');
        const projId = `PROJ-${projectId}`;
        
        const projectRow: GanttTask = {
            id: projId,
            title: projectTitle,
            start: new Date(),
            end: new Date(),
            status: 'active',
            type: 'project',
            progress: 0,
            expanded: expandedIds.has(projId),
            color: 'bg-indigo-500'
        };

        const mainTasks = tasks.filter(t => t.sutarefa !== true);
        const processedTaskIds = new Set<number>();
        const childRows: GanttTask[] = [];
        
        let projStart = new Date(8640000000000000);
        let projEnd = new Date(-8640000000000000);
        let totalCount = 0;
        let doneCount = 0;

        // Helper for dates
        const getDates = (t: DbTask) => {
            const startStr = t.datainicio || t.dataproposta;
            const endStr = t.datafim || t.deadline || t.dataproposta;
            let tStart = startStr ? new Date(startStr) : new Date();
            let tEnd = endStr ? new Date(endStr) : new Date();
            if (tEnd < tStart) tEnd = new Date(tStart);
            return { tStart, tEnd, startStr, endStr };
        }

        // 1. Process Main Tasks and their Children
        mainTasks.forEach(mainTask => {
            processedTaskIds.add(mainTask.id);
            const taskId = `TASK-${mainTask.id}`;
            const { tStart, tEnd, startStr, endStr } = getDates(mainTask);

            const taskAdapter: BpmnTask = {
                id: mainTask.id.toString(),
                text: mainTask.titulo,
                status: mainTask.status as any,
                completed: mainTask.status === 'done',
                assignee: mainTask.responsavelData?.nome,
                assigneeId: mainTask.responsavel,
                assigneeIsDev: mainTask.responsavelData?.desenvolvedor,
                startDate: startStr,
                dueDate: endStr,
                estimatedHours: mainTask.duracaohoras,
                gut: { g: mainTask.gravidade, u: mainTask.urgencia, t: mainTask.tendencia }
            };

            const taskRow: GanttTask = {
                id: taskId,
                title: mainTask.titulo,
                start: tStart,
                end: tEnd,
                status: mainTask.status,
                assignee: mainTask.responsavelData?.nome,
                type: 'task',
                parentId: projId,
                progress: mainTask.status === 'done' ? 100 : 0,
                expanded: expandedIds.has(taskId),
                color: mainTask.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500',
                originalTask: taskAdapter,
                estimatedHours: mainTask.duracaohoras,
                dbTask: mainTask
            };

            childRows.push(taskRow);
            flat.push(taskRow);

            // Update Project Dates
            if (tStart < projStart) projStart = tStart;
            if (tEnd > projEnd) projEnd = tEnd;
            totalCount++;
            if (mainTask.status === 'done') doneCount++;

            // Process Subtasks linked to this parent
            const subtasks = tasks.filter(t => (t.tarefamae || t.tarefa) === mainTask.id);
            
            if (subtasks.length > 0 && expandedIds.has(taskId)) {
                subtasks.forEach(sub => {
                    processedTaskIds.add(sub.id);
                    const subId = `SUB-${sub.id}`;
                    const { tStart: sStart, tEnd: sEnd, startStr: sStartStr, endStr: sEndStr } = getDates(sub);

                    const subAdapter: BpmnTask = {
                        id: sub.id.toString(),
                        text: sub.titulo,
                        status: sub.status as any,
                        completed: sub.status === 'done',
                        assignee: sub.responsavelData?.nome,
                        assigneeId: sub.responsavel,
                        assigneeIsDev: sub.responsavelData?.desenvolvedor,
                        startDate: sStartStr,
                        dueDate: sEndStr,
                        estimatedHours: sub.duracaohoras,
                    };

                    const subRow: GanttTask = {
                        id: subId,
                        title: sub.titulo,
                        start: sStart,
                        end: sEnd,
                        status: sub.status,
                        assignee: sub.responsavelData?.nome,
                        type: 'subtask',
                        parentId: taskId,
                        progress: sub.status === 'done' ? 100 : 0,
                        color: 'bg-purple-400',
                        originalTask: subAdapter,
                        estimatedHours: sub.duracaohoras,
                        dbTask: sub
                    };
                    childRows.push(subRow);
                    flat.push(subRow);
                });
            }
        });

        // 2. Process Orphans (Subtasks with no visible parent in this view)
        const orphans = tasks.filter(t => !processedTaskIds.has(t.id));
        orphans.forEach(orphan => {
             const orphanId = `ORPH-${orphan.id}`;
             const { tStart, tEnd, startStr, endStr } = getDates(orphan);

             const orphanAdapter: BpmnTask = {
                id: orphan.id.toString(),
                text: orphan.titulo,
                status: orphan.status as any,
                completed: orphan.status === 'done',
                assignee: orphan.responsavelData?.nome,
                assigneeId: orphan.responsavel,
                assigneeIsDev: orphan.responsavelData?.desenvolvedor,
                startDate: startStr,
                dueDate: endStr,
                estimatedHours: orphan.duracaohoras,
            };

            const orphanRow: GanttTask = {
                id: orphanId,
                title: `[Avulsa] ${orphan.titulo}`,
                start: tStart,
                end: tEnd,
                status: orphan.status,
                assignee: orphan.responsavelData?.nome,
                type: 'subtask', // Treat as subtask visual style
                parentId: projId, // Attach to project root
                progress: orphan.status === 'done' ? 100 : 0,
                color: 'bg-amber-500', // Different color for orphans
                originalTask: orphanAdapter,
                estimatedHours: orphan.duracaohoras,
                dbTask: orphan
            };
            childRows.push(orphanRow);
            flat.push(orphanRow);
            
            if (tStart < projStart) projStart = tStart;
            if (tEnd > projEnd) projEnd = tEnd;
        });

        projectRow.start = projStart.getTime() === 8640000000000000 ? new Date() : projStart;
        projectRow.end = projEnd.getTime() === -8640000000000000 ? new Date() : projEnd;
        projectRow.progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

        processedRows.push(projectRow);
        if (expandedIds.has(projId)) {
            processedRows.push(...childRows);
        }
    });

    return { rows: processedRows, flatList: flat };

  }, [allDbTasks, filterProject, expandedIds]);

  const dailyLoads = useMemo(() => {
      const loads: Record<string, Record<string, number>> = {}; 
      flatList.forEach(task => {
          if (!task.assignee || !task.originalTask?.assigneeIsDev) return; 
          if (task.status === 'done') return;

          const hoursPerDay = (task.estimatedHours || 2) / Math.max(1, (task.end.getTime() - task.start.getTime()) / (1000 * 3600 * 24));
          
          let curr = new Date(task.start);
          while (curr <= task.end) {
              const dateKey = curr.toISOString().split('T')[0];
              if (!loads[dateKey]) loads[dateKey] = {};
              if (!loads[dateKey][task.assignee]) loads[dateKey][task.assignee] = 0;
              loads[dateKey][task.assignee] += hoursPerDay;
              curr.setDate(curr.getDate() + 1);
          }
      });
      return loads;
  }, [flatList]);

  const handleAutoBalance = async () => {
      setIsBalancing(true);
      try {
          // 1. Get Current User Context to find Organization
          const { data: { user } } = await supabase.auth.getUser();
          let orgId = 3; // default fallback
          if (user) {
              const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
              if (userData) orgId = userData.organizacao;
          }

          // 2. Fetch available developers for this organization
          const availableDevs = await fetchDevelopers(orgId);

          if (availableDevs.length === 0) {
              alert("Não há desenvolvedores cadastrados nesta organização para balanceamento.");
              setIsBalancing(false);
              return;
          }

          // 3. Prepare tasks for optimizer
          // We send all pending tasks to the algorithm so it can fill holes
          const tasksToBalance = flatList
            .filter(t => t.status !== 'done' && t.dbTask?.organizacao === orgId) 
            .map(t => ({
                taskId: t.dbTask!.id, // Use numeric ID
                taskText: t.title,
                assigneeId: t.dbTask!.responsavel, // Current UUID
                estimatedHours: t.estimatedHours,
                gut: t.originalTask!.gut
            }));

          if (tasksToBalance.length === 0) {
              alert("Não há tarefas pendentes nesta organização para balancear.");
              setIsBalancing(false);
              return;
          }

          // 4. Run Optimizer
          // Returns updates: { id, startDate, dueDate, assigneeId }
          const updates = await optimizeSchedule(tasksToBalance, availableDevs);
          
          // 5. Apply Updates (Dates AND Assignees)
          let reassignCount = 0;
          for (const up of updates) {
              const payload: any = {
                  datainicio: up.startDate,
                  datafim: up.dueDate
              };
              if (up.assigneeId) {
                  payload.responsavel = up.assigneeId;
                  // Check if it was actually changed
                  const original = tasksToBalance.find(t => t.taskId.toString() === up.id.toString());
                  if (original && original.assigneeId !== up.assigneeId) {
                      reassignCount++;
                  }
              }
              await updateTask(Number(up.id), payload);
          }
          
          await loadTasks();
          alert(`Otimização concluída!\n${updates.length} tarefas niveladas.\n${reassignCount} tarefas redistribuídas entre programadores para garantir prazos.`);

      } catch (e) {
          console.error(e);
          alert("Erro no balanceamento.");
      } finally {
          setIsBalancing(false);
      }
  };

  // --- VIEW MODE LOGIC ---
  const viewConfig = useMemo(() => {
      switch (viewMode) {
          case 'day':
              return { colWidth: 60, stepMs: 1000 * 60 * 60 * 24, labelFormat: (d: Date) => d.getDate().toString(), headerFormat: 'dd/MM' };
          case 'week':
              return { colWidth: 40, stepMs: 1000 * 60 * 60 * 24, labelFormat: (d: Date) => d.getDate().toString(), headerFormat: 'dd/MM' };
          case 'month':
              return { colWidth: 100, stepMs: 1000 * 60 * 60 * 24 * 30, labelFormat: (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }), headerFormat: 'MMM/yy' };
          case 'year':
              return { colWidth: 120, stepMs: 1000 * 60 * 60 * 24 * 365, labelFormat: (d: Date) => d.getFullYear().toString(), headerFormat: 'yyyy' };
          default:
              return { colWidth: 50, stepMs: 1000 * 60 * 60 * 24, labelFormat: (d: Date) => d.getDate().toString(), headerFormat: 'dd/MM' };
      }
  }, [viewMode]);

  const timelineCols = useMemo(() => {
      const cols = [];
      const curr = new Date(viewDate);
      
      // Adjust start based on viewMode
      if (viewMode === 'day' || viewMode === 'week') {
          curr.setDate(curr.getDate() - 5);
          const count = viewMode === 'day' ? 30 : 60;
          for (let i = 0; i < count; i++) {
              cols.push(new Date(curr));
              curr.setDate(curr.getDate() + 1);
          }
      } else if (viewMode === 'month') {
          curr.setDate(1); // Start of this month
          curr.setMonth(curr.getMonth() - 2); // Buffer
          for (let i = 0; i < 18; i++) {
              cols.push(new Date(curr));
              curr.setMonth(curr.getMonth() + 1);
          }
      } else if (viewMode === 'year') {
          curr.setMonth(0, 1); // Start of this year
          curr.setFullYear(curr.getFullYear() - 1);
          for (let i = 0; i < 5; i++) {
              cols.push(new Date(curr));
              curr.setFullYear(curr.getFullYear() + 1);
          }
      }
      return cols;
  }, [viewDate, viewMode]);

  const timelineStart = timelineCols[0];

  const getBarPosition = (start: Date, end: Date) => {
      if (!timelineStart) return { left: 0, width: 0 };
      
      let diffStart = 0;
      let duration = 0;

      if (viewMode === 'day' || viewMode === 'week') {
          const dayMs = 1000 * 60 * 60 * 24;
          diffStart = (start.getTime() - timelineStart.getTime()) / dayMs;
          duration = Math.max(1, (end.getTime() - start.getTime()) / dayMs) + 1;
      } else if (viewMode === 'month') {
          // Approx months
          diffStart = (start.getFullYear() - timelineStart.getFullYear()) * 12 + (start.getMonth() - timelineStart.getMonth()) + (start.getDate() / 30);
          duration = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      } else if (viewMode === 'year') {
          // Approx years
          diffStart = (start.getFullYear() - timelineStart.getFullYear()) + (start.getMonth() / 12);
          duration = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }

      return { 
          left: diffStart * viewConfig.colWidth, 
          width: duration * viewConfig.colWidth 
      };
  };

  useEffect(() => {
    if (!isResizing || !resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeState.initialX;
        let daysDelta = 0;
        
        if (viewMode === 'day' || viewMode === 'week') {
            daysDelta = Math.round(deltaX / viewConfig.colWidth);
        } else if (viewMode === 'month') {
            daysDelta = Math.round(deltaX / viewConfig.colWidth * 30);
        } else {
            daysDelta = Math.round(deltaX / viewConfig.colWidth * 365);
        }

        const newEnd = new Date(resizeState.initialEndDate);
        newEnd.setDate(newEnd.getDate() + daysDelta);
        setResizeState(prev => prev ? ({ ...prev, currentEndDate: newEnd }) : null);
    };

    const handleMouseUp = async () => {
         setIsResizing(false);
         if (resizeState) {
             const dateStr = resizeState.currentEndDate.toISOString().split('T')[0];
             await updateTask(Number(resizeState.taskId), { datafim: dateStr });
             loadTasks();
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

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
        <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
             <div>
                {!projectId && (
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Columns className="w-8 h-8 text-teal-500"/> Gantt Chart
                    </h2>
                )}
                <div className="flex items-center gap-3 mt-1">
                    {!projectId && <p className="text-slate-500 dark:text-slate-400 text-sm">Planejamento cronológico.</p>}
                    {/* Date Range Label */}
                    <div className="flex items-center gap-2 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                        <CalendarIcon className="w-3 h-3 text-teal-600 dark:text-teal-400"/>
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300 capitalize">{currentRangeLabel}</span>
                    </div>
                </div>
             </div>
             
             <div className="flex flex-wrap items-center gap-2">
                 {/* Navigation & Date Picker */}
                 <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                     <button onClick={handlePrev} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                     <div className="relative px-2">
                         <input 
                            type="date" 
                            value={viewDate.toISOString().split('T')[0]}
                            onChange={(e) => setViewDate(new Date(e.target.value))}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer w-[24px] opacity-0 absolute inset-0"
                         />
                         <CalendarIcon className="w-4 h-4 text-slate-500 pointer-events-none"/>
                     </div>
                     <button onClick={handleNext} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"><ChevronRight className="w-4 h-4"/></button>
                 </div>

                 <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {['day', 'week', 'month', 'year'].map(m => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m as ViewMode)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                                viewMode === m 
                                ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' 
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {m === 'day' ? 'Dia' : m === 'week' ? 'Sem' : m === 'month' ? 'Mês' : 'Ano'}
                        </button>
                    ))}
                 </div>

                 <button onClick={handleAutoBalance} disabled={isBalancing} className="px-4 py-2 bg-purple-600 text-white rounded-xl flex items-center gap-2 shadow-lg hover:bg-purple-500 disabled:opacity-50 text-xs font-bold">
                     {isBalancing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3"/>}
                     Otimizar Agenda (AI)
                 </button>
                 <button onClick={loadTasks} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}/></button>
             </div>
        </div>

        <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex bg-white dark:bg-slate-900 shadow-xl">
            {/* Left List */}
            <div className="w-[250px] flex flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 shrink-0">
                <div className="h-12 flex items-center px-4 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-500 uppercase">Estrutura</div>
                <div className="flex-1 overflow-y-hidden">
                    {rows.map(row => (
                        <div 
                            key={row.id} 
                            className={`h-10 flex items-center px-4 border-b border-slate-100 dark:border-slate-800/50 text-sm hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer truncate ${row.type === 'project' ? 'font-bold bg-slate-100/50 dark:bg-slate-800/30' : ''} ${row.id.startsWith('ORPH') ? 'text-amber-600 dark:text-amber-400 italic' : ''}`}
                            onClick={() => {
                                if (row.type === 'project' || row.type === 'task') toggleExpand(row.id);
                                if ((row.type === 'task' || row.type === 'subtask') && row.originalTask) {
                                    setEditingTaskCtx({
                                        task: row.originalTask,
                                        oppId: row.dbTask?.projeto?.toString() || '',
                                        nodeLabel: row.type === 'task' ? 'Tarefa Principal' : 'Subtarefa'
                                    });
                                }
                            }}
                            style={{ paddingLeft: row.type === 'project' ? 8 : row.type === 'task' ? 24 : 48 }}
                        >
                            {(row.type === 'project' || (row.type === 'task' && flatList.some(f => f.parentId === row.id))) && (
                                <div className="mr-2">{row.expanded ? <ChevronDown className="w-3 h-3"/> : <ChevronRightIcon className="w-3 h-3"/>}</div>
                            )}
                            <span className="truncate">{row.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-950">
                {/* Header Scale */}
                <div className="h-12 flex border-b border-slate-200 dark:border-slate-700">
                    {timelineCols.map((date, i) => {
                        const dateKey = date.toISOString().split('T')[0];
                        // Simple overload check (only for daily/weekly view to preserve performance)
                        const isOverload = (viewMode === 'day' || viewMode === 'week') && Object.values(dailyLoads[dateKey] || {}).some((h: number) => h > 8.01);
                        
                        return (
                            <div 
                                key={i} 
                                className={`shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-[10px] font-bold uppercase text-slate-500 ${isOverload ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : ''}`} 
                                style={{ width: viewConfig.colWidth }}
                            >
                                {viewConfig.labelFormat(date)}
                                {isOverload && <AlertTriangle className="w-3 h-3"/>}
                            </div>
                        );
                    })}
                </div>

                {/* Bars Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    <div className="absolute inset-0 flex pointer-events-none h-full">
                        {timelineCols.map((_, i) => (
                            <div key={i} className="shrink-0 border-r border-slate-100 dark:border-slate-800 h-full" style={{ width: viewConfig.colWidth }}></div>
                        ))}
                    </div>
                    <div className="relative z-10 pb-10">
                        {rows.map(row => {
                            const endDate = (isResizing && resizeState?.taskId === row.originalTask?.id) ? resizeState.currentEndDate : row.end;
                            const pos = getBarPosition(row.start, endDate);
                            
                            // Don't render if out of current view window
                            if (pos.left + pos.width < 0) return <div key={row.id} className="h-10 border-b border-transparent"></div>;

                            return (
                                <div key={row.id} className="h-10 border-b border-transparent flex items-center relative group">
                                    <div 
                                        className={`absolute h-6 rounded shadow-sm ${row.color || 'bg-slate-400'} flex items-center px-2 text-[10px] text-white font-bold whitespace-nowrap overflow-hidden`}
                                        style={{ left: Math.max(0, pos.left), width: Math.max(viewConfig.colWidth / 2, pos.width) }}
                                        title={`${row.title} (${row.start.toLocaleDateString()} - ${row.end.toLocaleDateString()}) | Resp: ${row.assignee || 'N/A'}`}
                                    >
                                        {pos.width > 30 && row.title}
                                        
                                        {/* Resize Handle */}
                                        {(row.type === 'task' || row.type === 'subtask') && (
                                            <div 
                                                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/20 z-20"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    setIsResizing(true);
                                                    setResizeState({
                                                        taskId: row.originalTask!.id,
                                                        initialX: e.clientX,
                                                        initialEndDate: row.end,
                                                        currentEndDate: row.end,
                                                        originalTask: row.originalTask!
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

        {editingTaskCtx && (
            <TaskDetailModal 
                task={editingTaskCtx.task}
                nodeTitle={editingTaskCtx.nodeLabel}
                onClose={() => setEditingTaskCtx(null)}
                onSave={async (updated) => {
                    await updateTask(Number(updated.id), {
                        titulo: updated.text,
                        descricao: updated.description,
                        status: updated.status,
                        responsavel: updated.assigneeId,
                        duracaohoras: updated.estimatedHours,
                        datafim: updated.dueDate,
                        datainicio: updated.startDate
                    });
                    loadTasks();
                }}
            />
        )}
    </div>
  );
};
