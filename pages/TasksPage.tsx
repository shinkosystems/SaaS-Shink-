
import React, { useState } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { GanttView } from '../components/GanttView';
import { CalendarView } from '../components/CalendarView';
import { Opportunity } from '../types';
import { Trello, GanttChartSquare, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    userRole: string;
    organizationId?: number;
}

export const TasksPage: React.FC<Props> = ({ opportunities, onOpenProject, userRole, organizationId }) => {
    const [subView, setSubView] = useState<'kanban' | 'gantt' | 'calendar'>('kanban');

    return (
        <div className="h-full flex flex-col p-4 md:p-8 space-y-6 overflow-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Central de <span className="text-amber-500">Operações</span>.</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Execução técnica e prazos</p>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5">
                    <button onClick={() => setSubView('kanban')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'kanban' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
                        <Trello className="w-3.5 h-3.5"/> Kanban
                    </button>
                    <button onClick={() => setSubView('gantt')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'gantt' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
                        <GanttChartSquare className="w-3.5 h-3.5"/> Gantt
                    </button>
                    <button onClick={() => setSubView('calendar')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'calendar' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
                        <CalendarIcon className="w-3.5 h-3.5"/> Agenda
                    </button>
                </div>
            </header>
            <div className="flex-1 overflow-hidden">
                {subView === 'kanban' && <KanbanBoard onSelectOpportunity={onOpenProject} userRole={userRole} organizationId={organizationId} />}
                {subView === 'gantt' && <GanttView opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} organizationId={organizationId} />}
                {subView === 'calendar' && <CalendarView opportunities={opportunities} onSelectOpportunity={onOpenProject} onTaskUpdate={() => {}} organizationId={organizationId} />}
            </div>
        </div>
    );
};
