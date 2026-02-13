
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, BpmnTask, DbTask } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { GanttView } from './GanttView';
import { CalendarView } from './CalendarView';
import OpportunityDetail from './OpportunityDetail'; 
import BpmnBuilder from './BpmnBuilder';
import { 
    ArrowLeft, LayoutDashboard, Trello, GanttChartSquare, 
    Calendar as CalendarIcon, Edit, Workflow, ChevronRight, 
    ChevronLeft, Sparkles, Lock, Loader2, Filter, Users, 
    Clock, X, Search, Eye, HelpCircle, Settings, EyeOff,
    Briefcase, Layers, Zap
} from 'lucide-react';
import { fetchAllTasks, fetchOrgMembers } from '../services/projectService';
import { ProjectSettingsModal } from './ProjectSettingsModal';

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

type Tab = 'overview' | 'bpms' | 'kanban';

export const ProjectWorkspace: React.FC<Props> = ({ 
    opportunity, onBack, onUpdate, onEdit, onDelete, 
    userRole, currentPlan, isSharedMode, activeModules, 
    customLogoUrl, orgName 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isExiting, setIsExiting] = useState(false);
  const [projectTasks, setProjectTasks] = useState<DbTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const isClient = userRole === 'cliente';
  const readOnly = isClient || isSharedMode;

  useEffect(() => {
    loadProjectTasks();
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

  const handleGoBack = () => {
      setIsExiting(true);
      setTimeout(() => {
          onBack();
      }, 450);
  };

  const CARTEIRAS = [
      { id: 'overview', label: 'Detalhes', icon: Briefcase },
      { id: 'bpms', label: 'Fluxo', icon: Zap },
      { id: 'kanban', label: 'Kanban', icon: Layers }
  ];

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-[#020203] overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-enter'}`}>
      
      {/* CABEÇALHO ULTRA-SLIM */}
      <div className="bg-[#F59E0B] px-6 py-3 md:px-12 flex items-center justify-between shrink-0 relative z-30 shadow-lg border-b border-white/10">
          <div className="flex items-center gap-4">
              <button 
                  onClick={handleGoBack}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all border border-white/10"
              >
                  <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="flex flex-col">
                  <h2 className="text-sm font-black text-white leading-none tracking-tight truncate max-w-[200px] md:max-w-md uppercase">
                      {opportunity.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                      <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">Ativo Operacional</span>
                  </div>
              </div>
          </div>
          
          {!readOnly && (
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
            >
                <Settings className="w-4 h-4" />
            </button>
          )}
      </div>

      {/* TABS (CARTEIRAS) - FORMATO SEGMENTED CONTROL NATIVO */}
      <div className="w-full bg-white dark:bg-[#020203] border-b border-slate-100 dark:border-white/5 px-6 py-3 shrink-0 z-20">
          <div className="max-w-xl mx-auto flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
              {CARTEIRAS.map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`
                          flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300
                          ${activeTab === tab.id 
                              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm scale-[1.02] font-black' 
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold'}
                      `}
                  >
                      <tab.icon className={`w-3 h-3 ${activeTab === tab.id ? 'text-amber-500' : ''}`} />
                      <span className="text-[9px] uppercase tracking-widest">
                          {tab.label}
                      </span>
                  </button>
              ))}
          </div>
      </div>

      {/* CONTEÚDO PRINCIPAL COM SCROLL INDEPENDENTE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-transparent">
          <div className="max-w-4xl mx-auto pb-32">
            {activeTab === 'overview' && (
                <div className="animate-in fade-in duration-500">
                    <OpportunityDetail 
                        opportunity={opportunity} 
                        onEdit={onEdit}
                        onUpdate={onUpdate}
                        userRole={userRole}
                        isSharedMode={readOnly}
                    />
                </div>
            )}
            
            {activeTab === 'bpms' && (
                <div className="animate-in fade-in duration-500">
                    <BpmnBuilder 
                        opportunity={opportunity} 
                        onUpdate={onUpdate}
                        readOnly={readOnly}
                    />
                </div>
            )}

            {activeTab === 'kanban' && (
                <div className="animate-in fade-in duration-500 p-6">
                    <KanbanBoard 
                        tasks={projectTasks}
                        onSelectOpportunity={() => {}} 
                        userRole={userRole}
                        organizationId={opportunity.organizationId} 
                        projectId={opportunity.id}
                        readOnly={readOnly}
                        onRefresh={loadProjectTasks}
                    />
                </div>
            )}
          </div>
      </div>

      {/* MODAL DE CONFIGURAÇÕES AVANÇADAS (CRUD PROJETO + CLIENTE) */}
      {showSettings && (
        <ProjectSettingsModal 
            opportunity={opportunity}
            onClose={() => setShowSettings(false)}
            onUpdateProject={async (updated) => {
                await onUpdate(updated);
            }}
            onDeleteProject={async (id) => {
                await onDelete(id);
            }}
        />
      )}
    </div>
  );
};
