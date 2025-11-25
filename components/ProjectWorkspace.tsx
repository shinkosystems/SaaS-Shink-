
import React, { useState } from 'react';
import { Opportunity, BpmnTask, ProjectStatus } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { GanttView } from './GanttView';
import { CalendarView } from './CalendarView';
import OpportunityDetail from './OpportunityDetail'; // Reused for Overview/Files/Storytime logic
import { ArrowLeft, LayoutDashboard, Trello, GanttChartSquare, Calendar as CalendarIcon, Lock, Unlock, Edit, Trash2, PlayCircle, Snowflake } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
  onBack: () => void;
  onUpdate: (opp: Opportunity) => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  userRole?: string;
}

type Tab = 'overview' | 'kanban' | 'gantt' | 'calendar';

export const ProjectWorkspace: React.FC<Props> = ({ opportunity, onBack, onUpdate, onEdit, onDelete, userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
          case 'Negotiation': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
          case 'Future': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
          case 'Frozen': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
          case 'Archived': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
          default: return 'text-slate-500';
      }
  };

  const isClient = userRole === 'cliente';

  // Reusing logic from OpportunityDetail for internal updates
  const handleTaskUpdate = (oppId: string, nodeId: string, task: BpmnTask) => {
      // This is a simplified handler. Ideally, ProjectWorkspace should manage or delegate state updates.
      // Since Kanban/Gantt/Calendar manage their own data fetching, we primarily use this for 
      // updating the parent opportunity state if needed, though most child components fetch directly from DB now.
      console.log("Task Updated in Workspace:", task.text);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-[#050505] overflow-hidden">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>

              <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">{opportunity.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getStatusColor(opportunity.status)}`}>
                          {opportunity.status}
                      </span>
                      {opportunity.priorityLock && <Lock className="w-3 h-3 text-red-500"/>}
                  </div>
              </div>
          </div>

          {!isClient && (
              <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(opportunity)} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors" title="Editar Detalhes">
                      <Edit className="w-4 h-4"/>
                  </button>
                  {/* Additional header actions can go here */}
              </div>
          )}
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-white/10 px-6 flex gap-6 shrink-0 overflow-x-auto no-scrollbar">
          {[
              { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'kanban', label: 'Kanban', icon: Trello },
              { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
              { id: 'calendar', label: 'Cronograma', icon: CalendarIcon },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 h-12 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id 
                      ? 'border-amber-500 text-amber-600 dark:text-amber-500' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
              >
                  <tab.icon className="w-4 h-4"/>
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
          
          {activeTab === 'overview' && (
              // We reuse OpportunityDetail but strip its modal overlay via CSS or Logic if needed.
              // Since OpportunityDetail is built as a modal, we render it directly. 
              // Ideally, we refactor OpportunityDetail to separate content from modal wrapper.
              // For now, we will use it as the "Overview" content provider by just mounting it 
              // and letting it handle its internal tabs (Files, Storytime, etc).
              // To avoid double headers, we might need to adjust OpportunityDetail or accept redundancy.
              // *Strategy*: We use OpportunityDetail but pass a prop to hide header? 
              // OR simpler: Just replicate overview logic here if simple. 
              // *Better*: Render OpportunityDetail fully as the "Overview" module.
              <div className="h-full w-full">
                  <OpportunityDetail 
                      opportunity={opportunity} 
                      onClose={onBack} // Not really closing, but acts as exit if inside logic triggers it
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      userRole={userRole}
                      // We force a "page mode" style override via class if possible or accept the modal look for now.
                      // Actually, let's just render it. It has a fixed position z-index. 
                      // We need to modify OpportunityDetail to support inline rendering.
                      // See Change #4 below for OpportunityDetail tweak.
                  />
              </div>
          )}

          {activeTab === 'kanban' && (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
                  <KanbanBoard 
                      onSelectOpportunity={() => {}} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id} 
                  />
              </div>
          )}

          {activeTab === 'gantt' && (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
                  <GanttView 
                      opportunities={[opportunity]} 
                      onSelectOpportunity={() => {}} 
                      onTaskUpdate={handleTaskUpdate} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                  />
              </div>
          )}

          {activeTab === 'calendar' && (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
                  <CalendarView 
                      opportunities={[opportunity]} 
                      onSelectOpportunity={() => {}} 
                      onTaskUpdate={handleTaskUpdate} 
                      userRole={userRole}
                      projectId={opportunity.dbProjectId?.toString() || opportunity.id}
                  />
              </div>
          )}

      </div>
    </div>
  );
};
