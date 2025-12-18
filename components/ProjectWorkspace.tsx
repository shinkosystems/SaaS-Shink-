
import React, { useState } from 'react';
import { Opportunity, BpmnTask, ProjectStatus } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { GanttView } from './GanttView';
import { CalendarView } from './CalendarView';
import OpportunityDetail from './OpportunityDetail'; 
import BpmnBuilder from './BpmnBuilder';
import { ArrowLeft, LayoutDashboard, Trello, GanttChartSquare, Calendar as CalendarIcon, Edit, Workflow, ChevronRight } from 'lucide-react';

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
}

type Tab = 'overview' | 'bpms' | 'kanban' | 'calendar';

export const ProjectWorkspace: React.FC<Props> = ({ opportunity, onBack, onUpdate, onEdit, onDelete, userRole, currentPlan, isSharedMode, activeModules }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs = [
      { id: 'overview', label: 'Geral', icon: LayoutDashboard, moduleId: 'projects' },
      { id: 'bpms', label: 'BPMS & Fluxo', icon: Workflow, moduleId: 'projects' }, 
      { id: 'kanban', label: 'Tarefas', icon: Trello, moduleId: 'kanban' }, 
      { id: 'calendar', label: 'Agenda', icon: CalendarIcon, moduleId: 'calendar' },
  ].filter(tab => !activeModules || activeModules.includes(tab.moduleId) || tab.moduleId === 'projects'); 

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#050505] animate-in fade-in duration-300">
      <header className="h-16 lg:h-20 px-4 lg:px-8 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl shrink-0 z-20">
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
              <button 
                onClick={onBack} 
                className="p-2 lg:p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl lg:rounded-2xl text-slate-500 transition-all"
              >
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              
              <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 lg:gap-3 overflow-hidden">
                      <span className="hidden sm:inline text-[9px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">Iniciativa Ativa</span>
                      <ChevronRight className="hidden sm:inline w-2.5 h-2.5 text-slate-300 dark:text-slate-700"/>
                      <h1 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate">{opportunity.title}</h1>
                  </div>
              </div>
          </div>
          
          <div className="flex gap-2">
              <button 
                onClick={() => onEdit(opportunity)} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
              >
                  <Edit className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Editar Info</span>
              </button>
          </div>
      </header>

      {/* Navigation Tabs - Icon only on mobile */}
      <div className="px-4 lg:px-8 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex gap-6 lg:gap-10 shrink-0 overflow-x-auto no-scrollbar">
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
                      isSharedMode={isSharedMode}
                  />
              </div>
          )}
          
          {activeTab === 'bpms' && (
              <div className="h-full w-full overflow-hidden">
                  <BpmnBuilder 
                      opportunity={opportunity} 
                      onUpdate={onUpdate}
                      readOnly={isSharedMode}
                  />
              </div>
          )}

          {activeTab === 'kanban' && (
              <div className="h-full p-4 lg:p-8 overflow-y-auto custom-scrollbar">
                  <KanbanBoard 
                      onSelectOpportunity={() => {}} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                      organizationId={opportunity.organizationId} 
                      currentPlan={currentPlan}
                      activeModules={activeModules}
                  />
              </div>
          )}
          
          {activeTab === 'calendar' && (
              <div className="h-full p-4 lg:p-8 overflow-y-auto custom-scrollbar">
                  <CalendarView 
                      opportunities={[opportunity]} 
                      onSelectOpportunity={() => {}} 
                      onTaskUpdate={() => {}} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                      organizationId={opportunity.organizationId}
                      activeModules={activeModules}
                  />
              </div>
          )}
      </div>
    </div>
  );
};
