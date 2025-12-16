import React, { useState, useEffect } from 'react';
import { Opportunity, BpmnNode, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { Plus, Settings, MoreHorizontal, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { updateTask, deleteTask, syncTaskChecklist } from '../services/projectService';

interface Props {
  opportunity: Opportunity;
  onUpdate: (opp: Opportunity) => void;
  readOnly?: boolean;
}

const BpmnBuilder: React.FC<Props> = ({ opportunity, onUpdate, readOnly }) => {
    const [nodes, setNodes] = useState<BpmnNode[]>(opportunity.bpmn?.nodes || []);
    const [editingTask, setEditingTask] = useState<{task: BpmnTask, nodeId: number, nodeLabel: string} | null>(null);

    // Sync state if opportunity changes externally
    useEffect(() => {
        if (opportunity.bpmn?.nodes) {
            setNodes(opportunity.bpmn.nodes);
        }
    }, [opportunity.bpmn]);

    const handleTaskClick = (task: BpmnTask, node: BpmnNode) => {
        setEditingTask({
            task,
            nodeId: Number(node.id) || 0, // Should be careful with string/number IDs
            nodeLabel: node.label
        });
    };

    const handleTaskSave = async (updatedTask: BpmnTask) => {
        if (!editingTask) return;
        
        // 1. Update the Modal State immediately to reflect changes (Fixes "members not showing" issue)
        setEditingTask(prev => prev ? { ...prev, task: updatedTask } : null);

        // 2. Optimistic update of the main Node Tree
        const newNodes = nodes.map(n => {
            if (n.label === editingTask.nodeLabel) { // Use ID in real scenario if available
                return {
                    ...n,
                    checklist: n.checklist.map(t => t.id === updatedTask.id ? updatedTask : t)
                };
            }
            return n;
        });
        setNodes(newNodes);

        // 3. DB Update
        if (updatedTask.id && !isNaN(Number(updatedTask.id))) {
            const dbId = Number(updatedTask.id);
            
            // Save Parent
            await updateTask(dbId, {
                titulo: updatedTask.text,
                descricao: updatedTask.description,
                status: updatedTask.status,
                responsavel: updatedTask.assigneeId,
                duracaohoras: updatedTask.estimatedHours,
                datainicio: updatedTask.startDate,
                datafim: updatedTask.dueDate,
                gravidade: updatedTask.gut?.g,
                urgencia: updatedTask.gut?.u,
                tendencia: updatedTask.gut?.t,
                membros: updatedTask.members, // Persistence for members
                etiquetas: updatedTask.tags   // Persistence for tags
            });

            // Save Subtasks (Checklist)
            if (updatedTask.subtasks && opportunity.organizationId) {
                await syncTaskChecklist(dbId, updatedTask.subtasks, opportunity.organizationId, opportunity.dbProjectId, updatedTask.assigneeId);
            }
        }
    };

    const handleTaskDelete = async (id: string) => {
        if (!editingTask) return;
        if (!isNaN(Number(id))) {
            await deleteTask(Number(id));
            const newNodes = nodes.map(n => ({
                ...n,
                checklist: n.checklist.filter(t => t.id !== id)
            }));
            setNodes(newNodes);
            setEditingTask(null);
        }
    };

    return (
        <div className="h-full w-full overflow-x-auto overflow-y-auto custom-scrollbar p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-slate-50 dark:bg-slate-900/50">
            <div className="flex gap-12 min-w-max pb-12">
                {nodes.map((node, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                        <div className="w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 flex flex-col">
                            {/* Node Header */}
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 rounded-t-2xl">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate" title={node.label}>{node.label}</h3>
                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                    <MoreHorizontal className="w-4 h-4"/>
                                </button>
                            </div>
                            
                            {/* Checklist */}
                            <div className="p-2 flex-1 space-y-2 min-h-[100px] max-h-[400px] overflow-y-auto custom-scrollbar">
                                {node.checklist.map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => handleTaskClick(task, node)}
                                        className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-xl hover:border-blue-300 dark:hover:border-blue-500/50 cursor-pointer shadow-sm group transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 ${task.status === 'done' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                {task.status === 'done' ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {task.text}
                                                </p>
                                                <div className="flex justify-between items-center mt-2">
                                                    {task.assignee ? (
                                                        <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-slate-500 font-bold">
                                                            {task.assignee.split(' ')[0]}
                                                        </span>
                                                    ) : <span className="text-[10px] text-slate-300 italic">Sem resp.</span>}
                                                    
                                                    {task.estimatedHours && (
                                                        <span className="text-[10px] text-slate-400">{task.estimatedHours}h</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {node.checklist.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-xs italic">
                                        Lista vazia
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Arrow Connector (except last) */}
                        {idx < nodes.length - 1 && (
                            <div className="text-slate-300 dark:text-slate-700">
                                <ArrowRight className="w-8 h-8"/>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Task Modal */}
            {editingTask && (
                <TaskDetailModal 
                    task={editingTask.task}
                    nodeTitle={editingTask.nodeLabel}
                    opportunityTitle={opportunity.title}
                    organizationId={opportunity.organizationId}
                    onClose={() => setEditingTask(null)}
                    onSave={handleTaskSave}
                    onDelete={(id) => handleTaskDelete(id)}
                />
            )}
        </div>
    );
};

export default BpmnBuilder;