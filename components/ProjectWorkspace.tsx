
import React, { useState } from 'react';
import { Opportunity, BpmnTask, ProjectStatus } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { GanttView } from './GanttView';
import { CalendarView } from './CalendarView';
import OpportunityDetail from './OpportunityDetail'; 
import BpmnBuilder from './BpmnBuilder';
import { ArrowLeft, LayoutDashboard, Trello, GanttChartSquare, Calendar as CalendarIcon, Lock, Edit, Trash2, Link as LinkIcon, Check, Workflow } from 'lucide-react';

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
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, moduleId: 'projects' },
      { id: 'bpms', label: 'BPMS & Fluxo', icon: Workflow, moduleId: 'projects' }, // BPMS is core to Shinko
      { id: 'kanban', label: 'Tarefas', icon: Trello, moduleId: 'kanban' }, 
      { id: 'calendar', label: 'Agenda', icon: CalendarIcon, moduleId: 'calendar' },
  ].filter(tab => !activeModules || activeModules.includes(tab.moduleId) || tab.moduleId === 'projects'); 

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#050505] animate-in fade-in duration-300">
      {/* Page Header (Not Modal Header) */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shrink-0">
          <div className="flex items-center gap-4">
              <button 
                onClick={onBack} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                title="Voltar para lista"
              >
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              
              <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                      <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">{opportunity.title}</h1>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          opportunity.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          opportunity.status === 'Negotiation' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                      }`}>
                          {opportunity.status}
                      </span>
                  </div>
              </div>
          </div>
          
          <div className="flex gap-2">
              <button onClick={() => onEdit(opportunity)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-500 transition-colors">
                  <Edit className="w-4 h-4"/> <span className="hidden sm:inline">Editar Info</span>
              </button>
          </div>
      </header>

      {/* Tabs Navigation */}
      <div className="px-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] flex gap-8 shrink-0 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`h-12 flex items-center gap-2 text-sm font-bold border-b-[3px] transition-all whitespace-nowrap ${
                      activeTab === tab.id 
                      ? 'border-shinko-primary text-slate-900 dark:text-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-200 dark:hover:border-white/10'
                  }`}
              >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-shinko-primary' : ''}`}/> 
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-black/20">
          {activeTab === 'overview' && (
              <div className="h-full overflow-y-auto custom-scrollbar">
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
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
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
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
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
