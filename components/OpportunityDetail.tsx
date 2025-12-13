
import React, { useState } from 'react';
import { Opportunity, BpmnTask } from '../types';
import BpmnBuilder from './BpmnBuilder';
import { TaskDetailModal } from './TaskDetailModal';
import { Activity, Target, Zap, DollarSign, Calendar, Clock, Lock, ArrowLeft, MoreHorizontal, FileText } from 'lucide-react';
import { updateTask, deleteTask } from '../services/projectService';

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onUpdate: (opp: Opportunity) => void;
  userRole?: string;
  currentPlan?: string;
  isSharedMode?: boolean;
}

const OpportunityDetail: React.FC<Props> = ({ 
    opportunity, onClose, onEdit, onDelete, onUpdate, userRole, currentPlan, isSharedMode 
}) => {
    const [editingTask, setEditingTask] = useState<any | null>(null);

    const handleTaskUpdate = async (updatedTask: BpmnTask) => {
        // Logic handled inside BpmnBuilder via direct DB calls, but we might need to refresh state
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300">
            {/* Header / Stats */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex flex-wrap gap-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                            <Target className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Viabilidade</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{opportunity.viability}/5</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                            <Zap className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Velocidade</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{opportunity.velocity}/5</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                            <DollarSign className="w-5 h-5"/>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Receita Est.</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{opportunity.revenue}/5</div>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                            {opportunity.prioScore.toFixed(1)}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase">PRIO Score</span>
                    </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400"/> Descrição
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {opportunity.description}
                    </p>
                </div>
            </div>

            {/* Main Content (BPMN / Structure) */}
            <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-black/20">
                <BpmnBuilder 
                    opportunity={opportunity} 
                    onUpdate={onUpdate}
                    readOnly={isSharedMode}
                />
            </div>

            {/* Modal placeholder (handled inside BpmnBuilder usually, but good to have here if bubbled up) */}
            {editingTask && (
                <TaskDetailModal 
                    task={editingTask.task}
                    nodeTitle={editingTask.nodeLabel || 'Tarefa'}
                    opportunityTitle={opportunity.title}
                    organizationId={opportunity.organizationId}
                    onClose={() => setEditingTask(null)}
                    onSave={() => {}} 
                />
            )}
        </div>
    );
};

export default OpportunityDetail;
