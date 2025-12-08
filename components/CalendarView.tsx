
import React, { useMemo, useState, useEffect } from 'react';
import { Opportunity, TaskStatus, BpmnTask, DbTask } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Clock, Zap, Plus, LayoutGrid, Columns, Square, Loader2, CheckCircle2, Hash, RefreshCw, Grid, CornerDownRight, AlignLeft } from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';
import { optimizeSchedule } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { fetchAssignableUsers, updateTask, fetchAllTasks, deleteTask } from '../services/projectService';

interface Props {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onTaskUpdate: (oppId: string, nodeId: string, task: BpmnTask) => void;
  onCreateAdhocTask?: (task: BpmnTask) => void;
  onRefresh?: () => void;
  userRole?: string;
  projectId?: string; // Prop para filtrar
  organizationId?: number; // Prop para filtrar por organização
}

interface EditableTaskContext {
    task: BpmnTask;
    oppId: string;
    nodeId: string;
    nodeLabel: string;
    opportunity?: Opportunity;
}

type ViewMode = 'month' | 'week' | 'day' | 'year';

// Feriados Nacionais Fixos (Dia-Mês)
const FIXED_HOLIDAYS = [
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
];

// Feriados Móveis
const MOBILE_HOLIDAYS = [
  '2025-03-03', '2025-03-04', '2025-04-18', '2025-06-19',
  '2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04',
  '2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27',
  '2028-02-28', '2028-02-29', '2028-04-14', '2028-06-15',
  '2029-02-12', '2029-02-13', '2029-03-30', '2029-05-31',
  '2030-03-04', '2030-03-05', '2030-04-19', '2030-06-20'
];

const normalizeDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
};

const isBusinessDay = (date: Date): boolean => {
    const d = normalizeDate(date);
    const day = d.getDay();
    if (day === 0 || day === 6) return false; 

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    const fixed = `${mm}-${dd}`;
    const full = `${yyyy}-${mm}-${dd}`;

    if (FIXED_HOLIDAYS.includes(fixed)) return false;
    if (MOBILE_HOLIDAYS.includes(full)) return false;

    return true;
};

const getBusinessDatesInRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    let current = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    
    if (current > end) return [current];

    let loops = 0;
    while (current <= end && loops < 10000) {
        if (isBusinessDay(current)) {
            dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
        current = normalizeDate(current);
        loops++;
    }
    return dates;
};

export const CalendarView: React.FC<Props> = ({ opportunities, onSelectOpportunity, onTaskUpdate, onCreateAdhocTask, onRefresh, userRole, projectId, organizationId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [editingContext, setEditingContext] = useState<EditableTaskContext | null>(null);
  const [isBalancing, setIsBalancing] = useState(false);
  const [dbTasks, setDbTasks] = useState<DbTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  const [filterProject, setFilterProject] = useState<string>(projectId || 'all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [userMap, setUserMap] = useState<Record<string, any>>({});

  useEffect(() => {
      if (projectId) setFilterProject(projectId);
  }, [projectId]);

  const loadTasks = async () => {
      setIsLoadingTasks(true);
      const tasks = await fetchAllTasks(organizationId);
      setDbTasks(tasks);
      setIsLoadingTasks(false);
  };

  // Carrega todas as tarefas (DB) ao montar ou dar refresh
  useEffect(() => {
      loadTasks();
  }, [onRefresh, organizationId]);

  useEffect(() => {
      const fetchUsers = async () => {
          if (userRole === 'cliente') return;
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
               const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
               if (userData) {
                   const { data } = await supabase.from('users').select('id, nome').eq('organizacao', userData.organizacao);
                   if (data) {
                       const map: Record<string, any> = {};
                       data.forEach(u => map[u.nome] = u);
                       setUserMap(map);
                   }
               }
          }
      };
      fetchUsers();
  }, [userRole]);

  const projects = useMemo(() => opportunities.map(o => ({ id: o.id, title: o.title })), [opportunities]);
  
  const assignees = useMemo(() => {
      const set = new Set<string>();
      dbTasks.forEach(t => { if(t.responsavelData?.nome) set.add(t.responsavelData.nome); });
      Object.keys(userMap).forEach(u => set.add(u));
      return Array.from(set).sort();
  }, [dbTasks, userMap]);

  const taskMap = useMemo(() => {
      const map = new Map<number, string>();
      dbTasks.forEach(t => map.set(t.id, t.titulo));
      return map;
  }, [dbTasks]);

  const visibleTasks = useMemo(() => {
    const tasks: Array<any> = [];

    // Mapeamento de Projetos para Cores e Títulos
    const projectMeta = new Map<number, { title: string, color: string, opp: Opportunity, customColor?: string }>();
    opportunities.forEach(o => {
        // Use custom color if available, otherwise default logic
        const customColor = o.color;
        
        const color = 
            o.status === 'Active' ? 'bg-emerald-500' :
            o.status === 'Negotiation' ? 'bg-blue-500' :
            o.status === 'Future' ? 'bg-yellow-500' :
            'bg-slate-500';
        projectMeta.set(Number(o.id), { title: o.title, color, opp: o, customColor });
    });

    dbTasks.forEach(dbTask => {
        // Filtros
        if (filterProject !== 'all') {
            if (filterProject === 'adhoc') {
                // Se o filtro é "Tarefas Avulsas", pula se tiver projeto
                if (dbTask.projeto) return;
            } else {
                // Se for projeto específico
                if (dbTask.projeto?.toString() !== filterProject) return;
            }
        }

        if (filterAssignee !== 'all') {
            if (dbTask.responsavelData?.nome !== filterAssignee) return;
        }
        
        // Determina cor e título
        let meta: { title: string; color: string; opp?: Opportunity; customColor?: string } = { 
            title: 'Projeto Desconhecido', 
            color: 'bg-slate-400', 
            opp: undefined, 
            customColor: undefined 
        };
        
        if (dbTask.projeto && projectMeta.has(dbTask.projeto)) {
            meta = projectMeta.get(dbTask.projeto)!;
        } else if (!dbTask.projeto) {
            // Tarefas Avulsas (Sem projeto vinculado)
            meta = { title: 'Tarefa Avulsa', color: 'bg-neutral-500', opp: undefined, customColor: '#737373' };
        } else if (dbTask.projeto) {
             // Tem projeto mas não está na lista carregada (ex: arquivado ou sem acesso)
             // Tenta pegar cor do projetoData (join)
             meta = { 
                 title: dbTask.projetoData?.nome || 'Projeto Arquivado', 
                 color: 'bg-slate-400', 
                 opp: undefined,
                 customColor: dbTask.projetoData?.cor
             };
        }

        // Use custom color if available
        const effectiveBgColor = meta.customColor ? undefined : meta.color;
        const style = meta.customColor ? { backgroundColor: meta.customColor, borderLeftColor: meta.customColor } : {};

        let displayHeader = meta.title;

        const safeDateParse = (dateStr?: string) => {
            if (!dateStr) return null;
            const isoStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
            return new Date(isoStr);
        };

        let start = safeDateParse(dbTask.datainicio) || safeDateParse(dbTask.dataproposta);
        let end = safeDateParse(dbTask.datafim) || safeDateParse(dbTask.deadline);

        if (!start && end) start = end;
        if (start && !end) end = start;

        if (start && end) {
            if (end < start) end = start; // Safety fix

            const businessDays = getBusinessDatesInRange(start, end);
            let effectiveDays = businessDays.length > 0 ? businessDays : [end];
            
            if (start.getDay() === 0 || start.getDay() === 6) {
                 if (!effectiveDays.find(d => d.getTime() === start!.getTime())) effectiveDays.push(start);
            }

            const totalHours = Number(dbTask.duracaohoras) || 2;
            const dailyLoad = parseFloat((totalHours / Math.max(1, effectiveDays.length)).toFixed(1));

            const taskAdapter: BpmnTask = {
                id: dbTask.id.toString(),
                text: dbTask.titulo,
                description: dbTask.descricao,
                status: dbTask.status as any,
                completed: dbTask.status === 'done',
                assignee: dbTask.responsavelData?.nome,
                assigneeId: dbTask.responsavel,
                startDate: dbTask.datainicio,
                dueDate: dbTask.datafim || dbTask.deadline,
                estimatedHours: dbTask.duracaohoras,
                gut: { g: dbTask.gravidade, u: dbTask.urgencia, t: dbTask.tendencia },
                assigneeIsDev: dbTask.responsavelData?.desenvolvedor,
                isSubtask: dbTask.sutarefa,
                projectId: dbTask.projeto || undefined // Pass projectId to support attachments
            };

            effectiveDays.forEach((dateObj, index) => {
                const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                
                let effectiveStatus: TaskStatus = 'todo';
                if (dbTask.status) effectiveStatus = dbTask.status as TaskStatus;

                const isMultiDay = effectiveDays.length > 1;
                const partLabel = isMultiDay ? `(${index + 1}/${effectiveDays.length})` : '';

                tasks.push({
                    date: dateStr,
                    taskId: dbTask.id,
                    task: taskAdapter, 
                    taskText: dbTask.titulo,
                    isSubtask: dbTask.sutarefa, 
                    status: effectiveStatus,
                    completed: effectiveStatus === 'done',
                    assignee: dbTask.responsavelData?.nome,
                    oppTitle: displayHeader, 
                    oppColor: effectiveBgColor,
                    style: style, // Pass custom style
                    oppId: dbTask.projeto?.toString() || '',
                    nodeId: 'manual', 
                    nodeLabel: dbTask.projeto ? 'Tarefa de Projeto' : 'Tarefa Avulsa',
                    opportunity: meta.opp,
                    dailyHours: dailyLoad,
                    partLabel: partLabel,
                    rawDate: dateObj
                });
            });
        }
    });

    return tasks;
  }, [dbTasks, opportunities, filterProject, filterAssignee, taskMap]);

  const handleBalanceClick = async () => {
      setIsBalancing(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          let orgId = 3;
          if (user) {
               const { data: uData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
               if (uData) orgId = uData.organizacao;
          }
          // Change from fetchDevelopers to fetchAssignableUsers
          const availableDevs = await fetchAssignableUsers(orgId);

          const globalPendingTasks = dbTasks
            .filter(t => t.status !== 'done' && t.status !== 'Archived' && t.organizacao === orgId)
            .map(t => ({
                taskId: t.id,
                taskText: t.titulo,
                assigneeId: t.responsavel,
                estimatedHours: t.duracaohoras || 2,
                gut: { g: t.gravidade, u: t.urgencia, t: t.tendencia },
                originalAssigneeId: t.responsavel
            }));

          if (globalPendingTasks.length === 0) {
              alert("Não há tarefas pendentes para reorganizar.");
              setIsBalancing(false);
              return;
          }

          const updates = await optimizeSchedule(globalPendingTasks, availableDevs);
          
          if (updates && updates.length > 0) {
              let updateCount = 0;
              for (const update of updates) {
                  if (update.id && !isNaN(Number(update.id))) {
                       const payload: any = {
                           datainicio: update.startDate, 
                           datafim: update.dueDate,      
                           deadline: update.dueDate
                       };
                       if (update.assigneeId) {
                           payload.responsavel = update.assigneeId;
                       }
                       
                       await updateTask(Number(update.id), payload);
                       updateCount++;
                  }
              }
              
              alert(`Otimização Concluída!\n${updateCount} tarefas foram ajustadas e/ou realocadas.\nData de Início e Fim atualizadas.`);
              loadTasks();
              if (onRefresh) onRefresh();
          } else {
              alert("A agenda já estava otimizada.");
          }
      } catch (error) {
          console.error(error);
          alert("Erro ao processar balanceamento.");
      } finally {
          setIsBalancing(false);
      }
  };

  const getMonthData = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay(); 
      const days: Date[] = [];
      for (let i = 0; i < firstDayOfWeek; i++) days.push(null as any);
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
      return days;
  };

  const getWeekData = () => {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); 
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          days.push(d);
      }
      return days;
  };

  const getDayData = () => [new Date(currentDate)];

  const handleNext = () => {
      const newDate = new Date(currentDate);
      if (viewMode === 'month') { newDate.setMonth(newDate.getMonth() + 1); newDate.setDate(1); } 
      else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
      else if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
      else newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
  };

  const handlePrev = () => {
      const newDate = new Date(currentDate);
      if (viewMode === 'month') { newDate.setMonth(newDate.getMonth() - 1); newDate.setDate(1); } 
      else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
      else if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
      else newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
  };

  const isHolidayDay = (date: Date) => {
      return !isBusinessDay(date) && date.getDay() !== 0 && date.getDay() !== 6;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return visibleTasks.filter(t => t.date === dateStr);
  };

  const titleFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' });

  const renderYearView = () => {
      const year = currentDate.getFullYear();
      const months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(year, i, 1);
          const monthTasks = visibleTasks.filter(t => t.rawDate && t.rawDate.getMonth() === i && t.rawDate.getFullYear() === year);
          const totalLoad = monthTasks.reduce((acc, t) => acc + (t.dailyHours || 0), 0);
          return { date: d, tasks: monthTasks, load: totalLoad };
      });

      return (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {months.map((m, i) => {
                  const intensity = Math.min(1, m.load / 200); // Cap at 200h for visual heat
                  return (
                      <div key={i} className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/5 rounded-xl p-4 relative overflow-hidden group hover:border-amber-500/50 transition-all">
                          <div 
                              className="absolute bottom-0 left-0 right-0 bg-amber-500/10 dark:bg-amber-500/20 transition-all"
                              style={{ height: `${intensity * 100}%` }}
                          ></div>
                          
                          <div className="relative z-10">
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize mb-2">
                                  {m.date.toLocaleDateString('pt-BR', { month: 'long' })}
                              </h3>
                              <div className="flex justify-between items-end">
                                  <div className="text-3xl font-black text-slate-400 dark:text-neutral-500">{m.tasks.length}</div>
                                  <div className="text-xs font-bold text-slate-500 uppercase">Tarefas</div>
                              </div>
                              <div className="mt-2 text-xs text-slate-400">
                                  Carga Estimada: {m.load.toFixed(0)}h
                              </div>
                          </div>
                      </div>
                  )
              })}
          </div>
      )
  }

  const renderGrid = () => {
      let datesToRender: Date[] = [];
      let gridColsClass = '';
      if (viewMode === 'month') { datesToRender = getMonthData(); gridColsClass = 'grid-cols-7'; } 
      else if (viewMode === 'week') { datesToRender = getWeekData(); gridColsClass = 'grid-cols-7'; } 
      else { datesToRender = getDayData(); gridColsClass = 'grid-cols-1'; }

      return (
        <div className={`grid ${gridColsClass} gap-px bg-slate-200 dark:bg-[#222] border border-slate-200 dark:border-[#222] rounded-lg overflow-hidden shadow-sm`}>
            {viewMode !== 'day' && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                <div key={day} className={`p-3 text-center text-xs font-bold uppercase tracking-wider ${
                    idx === 0 || idx === 6 ? 'bg-slate-50/50 dark:bg-[#111] text-slate-400' : 'bg-white dark:bg-[#111] text-slate-500 dark:text-neutral-400'
                }`}>{day}</div>
            ))}

            {datesToRender.map((date, index) => {
                if (!date && viewMode === 'month') return <div key={`blank-${index}`} className="bg-white dark:bg-[#111] min-h-[120px]"></div>;
                
                const isHoliday = isHolidayDay(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isToday = new Date().toDateString() === date.toDateString();
                const dayTasks = getTasksForDate(date);

                const isNonBusiness = isHoliday || isWeekend;

                return (
                    <div 
                        key={date.toISOString()} 
                        className={`p-1 border-t border-l border-slate-100 dark:border-[#222] transition-colors relative group flex flex-col
                            ${viewMode === 'day' ? 'min-h-[400px]' : 'min-h-[120px]'}
                            ${isToday ? 'bg-white dark:bg-[#111]' : ''}
                            ${isNonBusiness ? 'bg-slate-50 dark:bg-[#0a0a0a]' : 'bg-white dark:bg-[#111]'}
                        `}
                    >
                        {/* Day Header */}
                        <div className="flex justify-center items-center py-1 relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold leading-none ${isToday ? 'bg-blue-600 text-white' : isHoliday ? 'text-red-500' : 'text-slate-700 dark:text-neutral-300'}`}>
                                {date.getDate()}
                            </div>
                        </div>

                        {isHoliday && (
                            <div className="text-[10px] text-center font-bold text-red-500 uppercase tracking-tighter mb-1">Feriado</div>
                        )}

                        <div className="flex flex-col gap-1 mt-1 relative z-10 flex-1 px-1">
                            {dayTasks.map((t, i) => (
                                <div 
                                    key={`${t.taskId}-${i}`}
                                    onClick={(e) => { e.stopPropagation(); setEditingContext({ task: t.task, oppId: t.oppId, nodeId: t.nodeId, nodeLabel: t.nodeLabel, opportunity: t.opportunity }); }}
                                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer hover:brightness-110 transition-all shadow-sm active:scale-95 leading-tight truncate
                                        ${t.completed ? 'opacity-50 line-through grayscale' : ''}
                                        ${isHoliday ? 'opacity-70' : ''}
                                        ${!t.oppColor && !t.style?.backgroundColor ? 'bg-slate-500 text-white' : 'text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]'}
                                    `}
                                    style={{
                                        marginLeft: t.isSubtask ? '8px' : '0px',
                                        backgroundColor: t.style?.backgroundColor || (t.oppColor ? t.oppColor.replace('bg-', '') : '#64748b'), // Fallback to slate-500 hex
                                        // Handle tailwind classes vs hex
                                        ...(t.oppColor && !t.oppColor.startsWith('bg-') ? { backgroundColor: t.oppColor } : {})
                                    }}
                                >
                                    {t.isSubtask && <span className="opacity-70 mr-1">↳</span>}
                                    <span title={t.taskText}>{t.taskText}</span>
                                    {t.dailyHours > 0 && <span className="opacity-70 ml-1 font-normal text-[9px]">{t.dailyHours}h</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      );
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 shrink-0">
        <div className="flex flex-col items-start gap-4 w-full lg:w-auto">
            {!projectId && (
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-shinko-primary" /> 
                        {viewMode === 'year' ? currentDate.getFullYear() : titleFormat.format(currentDate)}
                    </h2>
                    <div className="flex bg-white dark:bg-[#0a0a0a] p-1 rounded-lg border border-slate-200 dark:border-white/10">
                        {['month', 'week', 'day', 'year'].map(m => (
                            <button key={m} onClick={() => setViewMode(m as ViewMode)} className={`h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1 transition-all capitalize ${viewMode === m ? 'bg-shinko-primary text-white shadow' : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'}`}>
                                {m === 'month' ? <LayoutGrid className="w-3 h-3"/> : m === 'week' ? <Columns className="w-3 h-3"/> : m === 'year' ? <Grid className="w-3 h-3"/> : <Square className="w-3 h-3"/>} 
                                {m === 'month' ? 'Mês' : m === 'week' ? 'Sem' : m === 'year' ? 'Ano' : 'Dia'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {userRole !== 'cliente' && !projectId && (
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative group">
                        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="appearance-none pl-9 pr-8 h-10 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 outline-none cursor-pointer min-w-[160px]">
                            <option value="all" className="dark:bg-black">Todos Projetos</option>
                            <option value="adhoc" className="dark:bg-black text-amber-500">Tarefas Avulsas</option>
                            {projects.map(p => <option key={p.id} value={p.id} className="dark:bg-black">{p.title}</option>)}
                        </select>
                        <Hash className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none"/>
                    </div>
                    <div className="relative group">
                        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="appearance-none pl-9 pr-8 h-10 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 outline-none cursor-pointer min-w-[160px]">
                            <option value="all" className="dark:bg-black">Todos Resp.</option>
                            {assignees.map(a => <option key={a} value={a} className="dark:bg-black">{a}</option>)}
                        </select>
                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none"/>
                    </div>

                    <button onClick={handleBalanceClick} disabled={isBalancing} className="flex items-center gap-2 px-6 h-10 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait ml-2">
                        {isBalancing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        {isBalancing ? 'Recalculando...' : 'Otimizar Agenda'}
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex gap-2 items-center">
            <div className="flex gap-2">
                <button onClick={handlePrev} className="h-10 w-10 flex items-center justify-center bg-white dark:bg-[#0a0a0a] hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div className="relative h-10 w-10 flex items-center justify-center bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded hover:border-amber-500 transition-colors">
                    <input 
                        type="date" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => setCurrentDate(new Date(e.target.value))}
                        value={currentDate.toISOString().split('T')[0]}
                    />
                    <CalendarIcon className="w-5 h-5 text-slate-500"/>
                </div>
                <button onClick={handleNext} className="h-10 w-10 flex items-center justify-center bg-white dark:bg-[#0a0a0a] hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <button onClick={loadTasks} className="h-10 w-10 flex items-center justify-center bg-slate-200 dark:bg-[#151515] hover:bg-slate-300 dark:hover:bg-white/10 rounded text-slate-500 dark:text-white transition-colors ml-2">
                <RefreshCw className={`w-4 h-4 ${isLoadingTasks ? 'animate-spin' : ''}`}/>
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          {viewMode === 'year' ? (
              renderYearView()
          ) : (
              visibleTasks.length === 0 ? (
                 <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl p-12 text-center min-w-[300px]">
                    <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-4" />
                    <h3 className="text-slate-700 dark:text-neutral-300 font-bold text-lg">Agenda Vazia</h3>
                    <p className="text-slate-500 mt-2">Nenhuma tarefa encontrada para este período ou filtros.</p>
                 </div>
              ) : (
                 renderGrid()
              )
          )}
      </div>

      {editingContext && (
          <TaskDetailModal 
              task={editingContext.task}
              nodeTitle={editingContext.nodeLabel}
              opportunityTitle={editingContext.opportunity?.title}
              onClose={() => setEditingContext(null)}
              onOpenProject={() => { if (editingContext.opportunity) { onSelectOpportunity(editingContext.opportunity); setEditingContext(null); } }}
              onDelete={async (id) => {
                  if (!isNaN(Number(id))) {
                      await deleteTask(Number(id));
                      loadTasks();
                      setEditingContext(null);
                  }
              }}
              onSave={async (updatedTask) => {
                  if (!isNaN(Number(updatedTask.id))) {
                      await updateTask(Number(updatedTask.id), {
                          titulo: updatedTask.text,
                          descricao: updatedTask.description,
                          status: updatedTask.status,
                          responsavel: updatedTask.assigneeId,
                          duracaohoras: updatedTask.estimatedHours,
                          datainicio: updatedTask.startDate,
                          datafim: updatedTask.dueDate,
                          gravidade: updatedTask.gut?.g,
                          urgencia: updatedTask.gut?.u,
                          tendencia: updatedTask.gut?.t
                      });
                  } else {
                      await onTaskUpdate(editingContext.oppId, editingContext.nodeId, updatedTask);
                  }
                  
                  loadTasks(); 
                  if (onRefresh) onRefresh(); 
              }}
          />
      )}
    </div>
  );
};
