
import React, { useState, useEffect } from 'react';
import { Opportunity, ProjectStatus, PLAN_LIMITS } from '../types';
import { Search, Filter, LayoutGrid, Zap, Target, ArrowRight, Lock, Briefcase, Trello, GanttChartSquare, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
}

type ViewMode = 'grid' | 'kanban' | 'gantt';

export const ProjectList: React.FC<Props> = ({ opportunities, onOpenProject, userRole, organizationId, onOpenCreate, initialFilterStatus }) => {
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

  const planConfig = PLAN_LIMITS[currentPlan] || PLAN_LIMITS['plan_free'];
  const maxProjects = planConfig.maxProjects;
  const currentCount = opportunities.length;
  const isUnlimited = maxProjects >= 9999;
  const canCreateProject = currentCount < maxProjects;
  const canViewGantt = planConfig.features.gantt;

  // Calculate usage percentage for bar
  const usagePercentage = isUnlimited ? 0 : Math.min(100, (currentCount / maxProjects) * 100);

  const handleCreateClick = () => {
      if (canCreateProject) {
          if (onOpenCreate) onOpenCreate();
      } else {
          alert(`Limite de projetos (${maxProjects}) atingido para o plano ${currentPlan === 'plan_free' ? 'Free' : 'Atual'}. Faça upgrade para criar mais.`);
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
          case 'Negotiation': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
          case 'Future': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
          case 'Frozen': return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30';
          default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'Active': return 'Sprint Ativo';
          case 'Negotiation': return 'Em Negociação';
          case 'Future': return 'Backlog Futuro';
          case 'Frozen': return 'Congelado';
          case 'Archived': return 'Arquivado';
          default: return status;
      }
  };

  const KanbanColumn = ({ status, label, color }: { status: ProjectStatus, label: string, color: string }) => {
      const items = filteredOpps.filter(o => o.status === status);
      return (
          <div className="flex-1 min-w-[300px] flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 h-full">
              <div className={`p-4 border-b border-slate-200 dark:border-white/5 rounded-t-2xl flex justify-between items-center ${color}`}>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{label}</h3>
                  <span className="text-xs bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
              </div>
              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                  {items.map(opp => (
                      <div 
                          key={opp.id} 
                          onClick={() => onOpenProject(opp)}
                          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-shinko-primary/50 group"
                      >
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{opp.clientId ? 'Cliente' : 'Interno'}</span>
                              {opp.priorityLock && <Lock className="w-3 h-3 text-red-500"/>}
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-shinko-primary transition-colors">{opp.title}</h4>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                              <div className="flex items-center gap-1 text-slate-500 text-xs">
                                  <Target className="w-3 h-3"/> Score: <span className="font-bold text-slate-700 dark:text-slate-300">{opp.prioScore.toFixed(1)}</span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-shinko-primary opacity-0 group-hover:opacity-100 transition-all"/>
                          </div>
                      </div>
                  ))}
                  {items.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs italic">Nenhum projeto</div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="w-full flex flex-col h-full animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <LayoutGrid className="w-8 h-8 text-shinko-primary"/> Meus Projetos
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Gerencie seu portfólio de oportunidades e execuções.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                
                {onOpenCreate && userRole !== 'cliente' && (
                    <button 
                        onClick={handleCreateClick}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap ${
                            canCreateProject 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/20' 
                            : 'bg-slate-200 dark:bg-white/10 text-slate-500 cursor-not-allowed opacity-70'
                        }`}
                        title={!canCreateProject ? "Limite de projetos atingido. Faça upgrade." : ""}
                    >
                        {!canCreateProject ? <Lock className="w-4 h-4"/> : <Plus className="w-4 h-4"/>} 
                        Novo Projeto ({currentCount}/{isUnlimited ? '∞' : maxProjects})
                    </button>
                )}

                <div className="relative flex-1 md:min-w-[240px] w-full">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar projeto..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-shinko-primary shadow-sm"
                    />
                </div>
                
                {/* View Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-shinko-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        title="Grade"
                    >
                        <LayoutGrid className="w-4 h-4"/>
                    </button>
                    <button 
                        onClick={() => setViewMode('kanban')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow text-shinko-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        title="Pipeline (Kanban)"
                    >
                        <Trello className="w-4 h-4"/>
                    </button>
                    
                    {/* Gantt Button Lock */}
                    <button 
                        onClick={() => canViewGantt ? setViewMode('gantt') : alert("Gantt disponível apenas nos planos superiores. Faça upgrade para visualizar.")}
                        className={`p-2 rounded-lg transition-all relative group ${
                            viewMode === 'gantt' 
                            ? 'bg-white dark:bg-slate-700 shadow text-shinko-primary' 
                            : canViewGantt ? 'text-slate-500 hover:text-slate-900 dark:hover:text-white' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        }`}
                        title={canViewGantt ? "Cronograma Global" : "Bloqueado no Plano Free"}
                    >
                        <GanttChartSquare className="w-4 h-4"/>
                        {!canViewGantt && (
                            <div className="absolute top-0 right-0 -mt-1 -mr-1">
                                <Lock className="w-3 h-3 text-red-500 fill-white dark:fill-slate-900"/>
                            </div>
                        )}
                    </button>
                </div>

                {viewMode === 'grid' && (
                    <div className="relative shrink-0">
                        <select 
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-shinko-primary cursor-pointer shadow-sm"
                        >
                            <option value="All">Todos Status</option>
                            <option value="Active">Ativos</option>
                            <option value="Negotiation">Negociação</option>
                            <option value="Future">Futuros</option>
                            <option value="Frozen">Congelados</option>
                            <option value="Archived">Arquivados</option>
                        </select>
                        <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none"/>
                    </div>
                )}
            </div>
        </div>

        {/* Limit Banner (Only for Limited Plans) */}
        {!isUnlimited && (
            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className={`p-2 rounded-lg ${canCreateProject ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {canCreateProject ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                </div>
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Uso do Plano Free (Projetos)</span>
                        <span className={`text-xs font-bold ${!canCreateProject ? 'text-red-500' : 'text-slate-500'}`}>
                            {currentCount} de {maxProjects} utilizados
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${!canCreateProject ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{ width: `${usagePercentage}%` }}
                        ></div>
                    </div>
                </div>
                {!canCreateProject && (
                    <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-lg shadow hover:opacity-90 transition-opacity whitespace-nowrap">
                        Fazer Upgrade
                    </button>
                )}
            </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="h-full overflow-y-auto custom-scrollbar pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOpps.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20"/>
                                <p>Nenhum projeto encontrado.</p>
                            </div>
                        )}

                        {filteredOpps.map(opp => (
                            <div 
                                key={opp.id}
                                onClick={() => onOpenProject(opp)}
                                className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/60 hover:border-shinko-primary/50 dark:hover:border-shinko-primary/50 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between h-[240px]"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${getStatusColor(opp.status)}`}>
                                            {getStatusLabel(opp.status)}
                                        </span>
                                        {opp.priorityLock ? (
                                            <span title="Prioridade Travada">
                                                <Lock className="w-4 h-4 text-red-500" />
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <span className="text-xs font-bold">Prio-6</span>
                                                <span className="text-lg font-black text-slate-900 dark:text-white">{opp.prioScore.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2 group-hover:text-shinko-primary transition-colors">
                                        {opp.title}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                        <Briefcase className="w-4 h-4"/>
                                        <span className="truncate">{opp.clientId ? 'Cliente Vinculado' : 'Projeto Interno'}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                    <div className="flex gap-3 text-xs font-bold text-slate-500">
                                        <div className="flex items-center gap-1" title="Velocidade">
                                            <Zap className="w-3 h-3 text-amber-500"/> {opp.velocity}/5
                                        </div>
                                        <div className="flex items-center gap-1" title="Viabilidade">
                                            <Target className="w-3 h-3 text-blue-500"/> {opp.viability}/5
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-shinko-primary group-hover:text-white transition-colors">
                                        <ArrowRight className="w-4 h-4"/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KANBAN VIEW (PROJECT PIPELINE) */}
            {viewMode === 'kanban' && (
                <div className="h-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                    <div className="flex gap-4 h-full min-w-[1200px]">
                        <KanbanColumn status="Active" label="Sprint Ativo" color="bg-emerald-500/10 border-emerald-500/20" />
                        <KanbanColumn status="Negotiation" label="Em Negociação" color="bg-blue-500/10 border-blue-500/20" />
                        <KanbanColumn status="Future" label="Backlog Futuro" color="bg-yellow-500/10 border-yellow-500/20" />
                        <KanbanColumn status="Frozen" label="Congelado" color="bg-cyan-500/10 border-cyan-500/20" />
                        <KanbanColumn status="Archived" label="Arquivado" color="bg-slate-500/10 border-slate-500/20" />
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
            
            {viewMode === 'gantt' && !canViewGantt && (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                    <Lock className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4"/>
                    <h3 className="text-xl font-bold text-slate-500">Visualização Bloqueada</h3>
                    <p className="text-slate-400 mt-2 max-w-md">O gráfico de Gantt Global é exclusivo para planos Studio ou superiores. Faça um upgrade para organizar seu cronograma mestre.</p>
                </div>
            )}

        </div>
    </div>
  );
};
