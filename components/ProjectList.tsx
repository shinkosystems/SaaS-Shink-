
import React, { useState, useEffect } from 'react';
import { Opportunity, ProjectStatus } from '../types';
import { Search, Filter, LayoutGrid, Zap, Target, ArrowRight, Lock, Briefcase, GanttChartSquare, Plus } from 'lucide-react';
import { GanttView } from './GanttView';
import { getCurrentUserPlan } from '../services/asaasService';
import { supabase } from '../services/supabaseClient';

interface Props {
  opportunities: Opportunity[];
  onOpenProject: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number;
  onOpenCreate?: () => void;
  initialFilterStatus?: string;
  activeModules?: string[];
}

type ViewMode = 'grid' | 'gantt';

export const ProjectList: React.FC<Props> = ({ opportunities, onOpenProject, userRole, organizationId, onOpenCreate, initialFilterStatus, activeModules }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus || 'All');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPlan, setCurrentPlan] = useState('plan_free');

  useEffect(() => {
      const checkPlan = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const plan = await getCurrentUserPlan(user.id);
              setCurrentPlan(plan);
          }
      };
      checkPlan();
  }, []);

  const filteredOpps = opportunities.filter(opp => {
      const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (opp.description && opp.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'All' || opp.status === filterStatus;
      return matchesSearch && matchesStatus;
  });

  const canCreateProject = true; 
  const isGanttEnabled = activeModules ? activeModules.includes('gantt') : false;
  const canViewGantt = isGanttEnabled;

  const handleCreateClick = () => {
      if (canCreateProject) {
          if (onOpenCreate) onOpenCreate();
      }
  };

  const getStatusDotColor = (status: string) => {
      switch(status) {
          case 'Active': return 'bg-emerald-500';
          case 'Negotiation': return 'bg-blue-500';
          case 'Future': return 'bg-amber-500';
          case 'Frozen': return 'bg-cyan-500';
          default: return 'bg-slate-400';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'Active': return 'Em Andamento';
          case 'Negotiation': return 'Negociação';
          case 'Future': return 'Backlog';
          case 'Frozen': return 'Pausado';
          case 'Archived': return 'Arquivado';
          default: return status;
      }
  };

  return (
    <div className="w-full flex flex-col h-full animate-in fade-in duration-500">
        
        {/* Header Minimalista */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Projetos
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Gestão de portfólio.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                
                {onOpenCreate && userRole !== 'cliente' && (
                    <button 
                        onClick={handleCreateClick}
                        className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90`}
                    >
                        <Plus className="w-3 h-3"/> 
                        Novo
                    </button>
                )}

                <div className="relative flex-1 md:min-w-[200px] w-full">
                    <Search className="w-3 h-3 absolute left-3 top-3 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-transparent border-b border-slate-200 dark:border-white/10 text-xs font-medium outline-none focus:border-slate-400 transition-all"
                    />
                </div>
                
                {/* View Switcher Minimal */}
                <div className="flex gap-1 shrink-0">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        title="Grade"
                    >
                        <LayoutGrid className="w-4 h-4"/>
                    </button>
                    {canViewGantt && (
                        <button 
                            onClick={() => setViewMode('gantt')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'gantt' ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title="Cronograma Gantt"
                        >
                            <GanttChartSquare className="w-4 h-4"/>
                        </button>
                    )}
                </div>

                {viewMode === 'grid' && (
                    <div className="relative shrink-0">
                        <select 
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="appearance-none pl-2 pr-8 py-2 bg-transparent text-xs font-bold outline-none cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                            <option value="All">Todos</option>
                            <option value="Active">Ativos</option>
                            <option value="Negotiation">Negociação</option>
                            <option value="Future">Backlog</option>
                            <option value="Frozen">Congelados</option>
                            <option value="Archived">Arquivados</option>
                        </select>
                        <Filter className="w-3 h-3 absolute right-0 top-2.5 text-slate-400 pointer-events-none"/>
                    </div>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* GRID VIEW - Minimalist Cards */}
            {viewMode === 'grid' && (
                <div className="h-full overflow-y-auto custom-scrollbar pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredOpps.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 text-sm">
                                Nenhum projeto encontrado.
                            </div>
                        )}

                        {filteredOpps.map(opp => (
                            <div 
                                key={opp.id}
                                onClick={() => onOpenProject(opp)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between h-[200px]"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusDotColor(opp.status)}`}></div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{getStatusLabel(opp.status)}</span>
                                        </div>
                                        {opp.priorityLock && <Lock className="w-3 h-3 text-slate-400" />}
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2">
                                        {opp.title}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                        <Briefcase className="w-3 h-3"/>
                                        <span className="truncate">{opp.clientId ? 'Cliente Externo' : 'Interno'}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase">
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-3 h-3"/> {opp.velocity}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target className="w-3 h-3"/> {opp.viability}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GANTT VIEW */}
            {viewMode === 'gantt' && canViewGantt && (
                <div className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                    <GanttView 
                        opportunities={filteredOpps} 
                        onSelectOpportunity={onOpenProject} 
                        onTaskUpdate={() => {}} 
                        userRole={userRole}
                        organizationId={organizationId} 
                    />
                </div>
            )}
        </div>
    </div>
  );
};
