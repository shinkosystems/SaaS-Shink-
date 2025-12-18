
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
      <header className="h-20 px-8 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl shrink-0 z-20">
          <div className="flex items-center gap-6">
              <button 
                onClick={onBack} 
                className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-500 transition-all shadow-sm dark:shadow-none"
              >
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              
              <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Iniciativa Ativa</span>
                      <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700"/>
                      <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate max-w-md">{opportunity.title}</h1>
                  </div>
              </div>
          </div>
          
          <div className="flex gap-3">
              <button 
                onClick={() => onEdit(opportunity)} 
                className="flex items-center gap-3 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
              >
                  <Edit className="w-4 h-4"/> Editar Info
              </button>
          </div>
      </header>

      <div className="px-8 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex gap-10 shrink-0 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`h-14 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] border-b-[3px] transition-all whitespace-nowrap ${
                      activeTab === tab.id 
                      ? 'border-amber-500 text-slate-900 dark:text-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
              >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-amber-500' : ''}`}/> 
                  {tab.label}
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
              <div className="h-full p-8 overflow-y-auto custom-scrollbar">
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
              <div className="h-full p-8 overflow-y-auto custom-scrollbar">
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
