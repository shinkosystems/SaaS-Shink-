
import React, { useState } from 'react';
import { Opportunity, BpmnTask, ProjectStatus } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { GanttView } from './GanttView';
import { CalendarView } from './CalendarView';
import OpportunityDetail from './OpportunityDetail'; 
import { ArrowLeft, LayoutDashboard, Trello, GanttChartSquare, Calendar as CalendarIcon, Lock, Edit, Trash2, Link as LinkIcon, Check } from 'lucide-react';

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

type Tab = 'overview' | 'kanban' | 'gantt' | 'calendar';

export const ProjectWorkspace: React.FC<Props> = ({ opportunity, onBack, onUpdate, onEdit, onDelete, userRole, currentPlan, isSharedMode, activeModules }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const canViewGantt = activeModules?.includes('gantt');

  const tabs = [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, moduleId: 'projects' },
      { id: 'kanban', label: 'Kanban', icon: Trello, moduleId: 'kanban' },
      { id: 'gantt', label: 'Gantt', icon: GanttChartSquare, locked: !canViewGantt, moduleId: 'gantt' },
      { id: 'calendar', label: 'Agenda', icon: CalendarIcon, moduleId: 'calendar' },
  ].filter(tab => !activeModules || activeModules.includes(tab.moduleId) || tab.moduleId === 'projects'); 

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#050505]">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500"><ArrowLeft className="w-5 h-5"/></button>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{opportunity.title}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-white/10 text-slate-500">{opportunity.status}</span>
          </div>
          <div className="flex gap-2">
              <button onClick={() => onEdit(opportunity)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><Edit className="w-4 h-4"/></button>
          </div>
      </header>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] flex gap-6">
          {tabs.map(tab => (
              <button
                  key={tab.id}
                  onClick={() => !tab.locked && setActiveTab(tab.id as Tab)}
                  className={`h-12 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  <tab.icon className="w-4 h-4"/> {tab.label}
                  {tab.locked && <Lock className="w-3 h-3 text-slate-400"/>}
              </button>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
          {activeTab === 'overview' && (
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
          {activeTab === 'gantt' && canViewGantt && (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
                  <GanttView 
                      opportunities={[opportunity]} 
                      onSelectOpportunity={() => {}} 
                      onTaskUpdate={() => {}} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                      organizationId={opportunity.organizationId}
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
