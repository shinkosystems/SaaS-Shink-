
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, BpmnTask, DbTask } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { GanttView } from './GanttView';
import { CalendarView } from './CalendarView';
import OpportunityDetail from './OpportunityDetail'; 
import BpmnBuilder from './BpmnBuilder';
import { ArrowLeft, LayoutDashboard, Trello, GanttChartSquare, Calendar as CalendarIcon, Edit, Workflow, ChevronRight, ChevronLeft, Sparkles, Lock, Loader2, Filter, Users, Clock, X } from 'lucide-react';
import { fetchAllTasks, fetchOrgMembers } from '../services/projectService';

interface Props {
  opportunity: Opportunity;
  onBack: () => void;
  onUpdate: (opp: Opportunity) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  userRole?: string;
  currentPlan?: string;
  isSharedMode?: boolean;
  activeModules?: string[];
  customLogoUrl?: string | null;
  orgName?: string;
}

const Logo = ({ customLogoUrl, orgName }: { customLogoUrl?: string | null, orgName?: string }) => (
    <div className="flex items-center gap-3">
        {customLogoUrl ? (
            <img src={customLogoUrl} alt={orgName} className="h-7 w-auto object-contain" />
        ) : (
            <>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-glow-amber">
                    <Sparkles className="w-4 h-4"/>
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-sm tracking-tighter text-slate-900 dark:text-white leading-none">Shinkō</span>
                    <span className="text-[6px] font-black uppercase tracking-widest text-amber-500 mt-0.5">OS 26</span>
                </div>
            </>
        )}
    </div>
);

type Tab = 'overview' | 'bpms' | 'kanban' | 'calendar' | 'gantt';
type TimeFilter = 'all' | 'day' | 'week' | 'month';

export const ProjectWorkspace: React.FC<Props> = ({ opportunity, onBack, onUpdate, onEdit, onDelete, userRole, currentPlan, isSharedMode, activeModules, customLogoUrl, orgName }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [projectTasks, setProjectTasks] = useState<DbTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  
  // Filtros de Snapshot
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [viewDate, setViewDate] = useState(new Date());

  const isClient = userRole === 'cliente';
  const readOnly = isClient || isSharedMode;

  useEffect(() => {
    loadProjectTasks();
    if (opportunity.organizationId) {
        fetchOrgMembers(opportunity.organizationId).then(setMembers);
    }
  }, [opportunity.id]);

  const loadProjectTasks = async () => {
    if (!opportunity.organizationId) return;
    setLoadingTasks(true);
    try {
        const all = await fetchAllTasks(opportunity.organizationId);
        const filtered = all.filter(t => t.projeto?.toString() === (opportunity.dbProjectId?.toString() || opportunity.id));
        setProjectTasks(filtered);
    } catch (e) {
        console.error("Erro ao carregar tarefas do projeto:", e);
    } finally {
        setLoadingTasks(false);
    }
  };

  const handleNavigateTime = (direction: 'prev' | 'next') => {
      const mod = direction === 'next' ? 1 : -1;
      const newDate = new Date(viewDate);
      if (timeFilter === 'day') newDate.setDate(viewDate.getDate() + mod);
      else if (timeFilter === 'week') newDate.setDate(viewDate.getDate() + (mod * 7));
      else if (timeFilter === 'month') newDate.setMonth(viewDate.getMonth() + mod);
      setViewDate(newDate);
  };

  const timeLabel = useMemo(() => {
      if (timeFilter === 'all') return 'TODO O PROJETO';
      if (timeFilter === 'day') return viewDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
      if (timeFilter === 'week') {
          const start = new Date(viewDate);
          start.setDate(viewDate.getDate() - viewDate.getDay());
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          return `${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}`;
      }
      if (timeFilter === 'month') return viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
      return '';
  }, [timeFilter, viewDate]);

  const parseSafeDate = (d: string | null | undefined) => {
      if (!d) return null;
      if (d.includes('-') && !d.includes('T')) {
          const [y, m, day] = d.split('-').map(Number);
          return new Date(y, m - 1, day);
      }
      return new Date(d);
  };

  const filteredTasks = useMemo(() => {
      return projectTasks.filter(task => {
          // 1. Filtro de Membro
          const matchesMember = memberFilter === 'all' || task.responsavel === memberFilter;
          if (!matchesMember) return false;

          // 2. Filtro de Tempo
          if (timeFilter === 'all') return true;

          const basis = parseSafeDate(task.datafim || task.datainicio || task.createdat);
          if (!basis) return true;

          const basisTime = new Date(basis.getFullYear(), basis.getMonth(), basis.getDate()).getTime();
          const targetTime = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate()).getTime();

          if (timeFilter === 'day') {
              return basisTime === targetTime;
          }

          if (timeFilter === 'week') {
              const startOfWeek = new Date(viewDate);
              startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
              startOfWeek.setHours(0,0,0,0);
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              endOfWeek.setHours(23,59,59,999);
              return basis >= startOfWeek && basis <= endOfWeek;
          }

          if (timeFilter === 'month') {
              return basis.getMonth() === viewDate.getMonth() && basis.getFullYear() === viewDate.getFullYear();
          }

          return true;
      });
  }, [projectTasks, timeFilter, memberFilter, viewDate]);

  const tabs = [
      { id: 'overview', label: 'Geral', icon: LayoutDashboard, moduleId: 'projects' },
      { id: 'bpms', label: 'Fluxo', icon: Workflow, moduleId: 'projects' }, 
      { id: 'kanban', label: 'Kanban', icon: Trello, moduleId: 'kanban' }, 
      { id: 'gantt', label: 'Gantt', icon: GanttChartSquare, moduleId: 'gantt' },
      { id: 'calendar', label: 'Agenda', icon: CalendarIcon, moduleId: 'calendar' },
  ].filter(tab => {
      if (tab.id === 'overview' || tab.id === 'bpms') return true;
      if (!activeModules) return true;
      return activeModules.includes(tab.moduleId) || activeModules.includes(tab.id);
  }); 

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#050505] animate-in fade-in duration-300">
      <header className="h-16 lg:h-20 px-4 lg:px-8 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl shrink-0 z-30">
          <div className="flex items-center gap-3 lg:gap-8 min-w-0">
              <div className="hidden sm:block border-r border-slate-200 dark:border-white/10 pr-6">
                <Logo customLogoUrl={customLogoUrl} orgName={orgName} />
              </div>
              
              <button 
                onClick={onBack} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 transition-all"
              >
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              
              <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 lg:gap-3 overflow-hidden">
                      <span className="hidden lg:inline text-[9px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">Snapshot de Projeto</span>
                      <ChevronRight className="hidden lg:inline w-2.5 h-2.5 text-slate-300 dark:text-slate-700"/>
                      <h1 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate">{opportunity.title}</h1>
                  </div>
              </div>
          </div>
          
          <div className="flex gap-2">
              {loadingTasks && <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-4 mt-2" />}
              {readOnly ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10">
                      <Lock className="w-3 h-3"/> Somente Leitura
                  </div>
              ) : (
                <button 
                    onClick={() => onEdit(opportunity)} 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                    <Edit className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Editar Projeto</span>
                </button>
              )}
          </div>
      </header>

      <div className="px-4 lg:px-8 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex flex-col md:flex-row justify-between shrink-0 overflow-hidden">
          <div className="flex gap-6 lg:gap-10 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`h-12 lg:h-14 flex items-center gap-2 lg:gap-3 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.1em] lg:tracking-[0.2em] border-b-[3px] transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'border-amber-500 text-slate-900 dark:text-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                >
                    <tab.icon className={`w-4.5 h-4.5 lg:w-4 lg:h-4 ${activeTab === tab.id ? 'text-amber-500' : ''}`}/> 
                    <span className="hidden lg:inline">{tab.label}</span>
                </button>
            ))}
          </div>

          {/* FILTROS DE SNAPSHOT */}
          {activeTab !== 'overview' && activeTab !== 'bpms' && (
              <div className="flex items-center gap-4 py-2 overflow-x-auto no-scrollbar">
                  <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>
                  
                  {/* Tempo */}
                  <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 shrink-0 gap-1">
                      {['all', 'day', 'week', 'month'].map((t) => (
                          <button 
                            key={t} 
                            onClick={() => { setTimeFilter(t as any); if(t !== 'all') setViewDate(new Date()); }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeFilter === t ? 'bg-white dark:bg-white/10 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              {t === 'all' ? 'Tudo' : t === 'day' ? 'Dia' : t === 'week' ? 'Sem' : 'Mês'}
                          </button>
                      ))}
                      
                      {timeFilter !== 'all' && (
                          <div className="flex items-center border-l border-slate-200 dark:border-white/10 ml-1 pl-1">
                              <button onClick={() => handleNavigateTime('prev')} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-400"><ChevronLeft className="w-3 h-3"/></button>
                              <span className="text-[8px] font-black uppercase text-amber-500 px-2 min-w-[80px] text-center">{timeLabel}</span>
                              <button onClick={() => handleNavigateTime('next')} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-400"><ChevronRight className="w-3 h-3"/></button>
                          </div>
                      )}
                  </div>

                  {/* Colaborador */}
                  <div className="relative group shrink-0">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
                      <select 
                        value={memberFilter}
                        onChange={e => setMemberFilter(e.target.value)}
                        className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 pl-9 pr-8 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-slate-600 dark:text-slate-300 min-w-[140px]"
                      >
                          <option value="all">TODOS MEMBROS</option>
                          {members.map(m => <option key={m.id} value={m.id}>{m.nome.toUpperCase()}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
                      </div>
                  </div>

                  {(timeFilter !== 'all' || memberFilter !== 'all') && (
                      <button 
                        onClick={() => { setTimeFilter('all'); setMemberFilter('all'); setViewDate(new Date()); }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all shrink-0"
                        title="Limpar Filtros"
                      >
                          <X className="w-4 h-4"/>
                      </button>
                  )}
              </div>
          )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-100/50 dark:bg-black/20">
          {activeTab === 'overview' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-1">
                  <OpportunityDetail 
                      opportunity={opportunity} 
                      onClose={onBack} 
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      userRole={userRole}
                      currentPlan={currentPlan}
                      isSharedMode={readOnly}
                  />
              </div>
          )}
          
          {activeTab === 'bpms' && (
              <div className="h-full w-full overflow-hidden">
                  <BpmnBuilder 
                      opportunity={opportunity} 
                      onUpdate={onUpdate}
                      readOnly={readOnly}
                  />
              </div>
          )}

          {activeTab === 'kanban' && (
              <div className="h-full p-4 lg:p-8 overflow-y-auto custom-scrollbar">
                  <KanbanBoard 
                      tasks={filteredTasks}
                      onSelectOpportunity={() => {}} 
                      userRole={userRole}
                      organizationId={opportunity.organizationId} 
                      readOnly={readOnly}
                      onRefresh={loadProjectTasks}
                  />
              </div>
          )}

          {activeTab === 'gantt' && (
              <div className="h-full p-4 lg:p-8 overflow-hidden">
                  <GanttView 
                      tasks={filteredTasks}
                      opportunities={[opportunity]} 
                      onSelectOpportunity={() => {}} 
                      onTaskUpdate={loadProjectTasks} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                      organizationId={opportunity.organizationId}
                      readOnly={readOnly}
                  />
              </div>
          )}
          
          {activeTab === 'calendar' && (
              <div className="h-full p-4 lg:p-8 overflow-y-auto custom-scrollbar">
                  <CalendarView 
                      tasks={filteredTasks}
                      opportunities={[opportunity]} 
                      onSelectOpportunity={() => {}} 
                      onTaskUpdate={loadProjectTasks} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                      organizationId={opportunity.organizationId}
                  />
              </div>
          )}
      </div>
    </div>
  );
};
