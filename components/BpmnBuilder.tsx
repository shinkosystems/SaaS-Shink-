import React, { useState, useEffect } from 'react';
import { Opportunity, BpmnNode, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Plus, BrainCircuit, Zap, LoaderCircle as Loader, Sparkles, RefreshCw,
    ChevronRight, Workflow as WorkflowIcon, Clock
} from 'lucide-react';
import { updateTask, deleteTask, syncTaskChecklist, syncBpmnTasks } from '../services/projectService';
import { generateBpmn } from '../services/geminiService';
import { fetchRoles } from '../services/organizationService';

interface Props {
  opportunity: Opportunity;
  onUpdate: (opp: Opportunity) => Promise<void> | void;
  readOnly?: boolean;
}

const BpmnBuilder: React.FC<Props> = ({ opportunity, onUpdate, readOnly }) => {
    const [nodes, setNodes] = useState<BpmnNode[]>(opportunity.bpmn?.nodes || []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [editingTask, setEditingTask] = useState<{task: BpmnTask, nodeId: string, nodeLabel: string} | null>(null);

    useEffect(() => {
        if (opportunity.bpmn?.nodes) {
            setNodes(opportunity.bpmn.nodes);
        }
    }, [opportunity.bpmn]);

    const handleTaskClick = (task: BpmnTask, node: BpmnNode) => {
        setEditingTask({
            task,
            nodeId: node.id,
            nodeLabel: node.label
        });
    };

    const handleGenerateAiFlow = async () => {
        if (!opportunity.description) return alert("Adicione um contexto ao projeto antes de gerar o fluxo.");
        
        setIsGenerating(true);
        try {
            const roles = opportunity.organizationId ? await fetchRoles(opportunity.organizationId) : [];
            const result = await generateBpmn(
                opportunity.title, 
                opportunity.description, 
                opportunity.archetype, 
                opportunity.docsContext,
                '', 
                roles
            );

            if (result && result.nodes) {
                const newNodes = result.nodes.map((n: any) => ({
                    ...n,
                    checklist: n.checklist.map((t: any) => ({
                        ...t,
                        id: crypto.randomUUID(),
                        status: 'todo',
                        completed: false
                    }))
                }));
                
                setNodes(newNodes);
                await onUpdate({
                    ...opportunity,
                    bpmn: { ...opportunity.bpmn, nodes: newNodes, lanes: result.lanes || [], edges: result.edges || [] }
                } as any);
            }
        } catch (e) {
            alert("Erro ao gerar fluxo via IA.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSyncTasks = async () => {
        if (!opportunity.organizationId || !opportunity.dbProjectId) return;
        setIsSyncing(true);
        try {
            const updatedNodes = await syncBpmnTasks(opportunity.dbProjectId, opportunity.organizationId, nodes);
            setNodes(updatedNodes);
            await onUpdate({ 
                ...opportunity, 
                bpmn: { ...opportunity.bpmn, nodes: updatedNodes } 
            } as any);
            alert("Tarefas sincronizadas no Kanban!");
        } catch (e) {
            alert("Erro ao sincronizar tarefas.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleTaskSave = async (updatedTask: BpmnTask) => {
        if (!editingTask) return;
        
        const newNodes = nodes.map(n => {
            if (n.id === editingTask.nodeId) {
                return {
                    ...n,
                    checklist: n.checklist.map(t => t.id === updatedTask.id ? updatedTask : t)
                };
            }
            return n;
        });

        // 1. Atualizar Estado Local IMEDIATAMENTE para feedback visual
        setNodes(newNodes);
        
        // 2. Persistir no JSON do Projeto (Estrutura visual contendo checklist/subtarefas)
        const updatedOpp = { ...opportunity, bpmn: { ...opportunity.bpmn, nodes: newNodes } } as any;
        await onUpdate(updatedOpp);

        // 3. Sincronizar com Tabela de Tasks se houver ID de banco
        if (updatedTask.dbId) {
            const now = new Date().toISOString();
            const updatePayload: any = {
                titulo: updatedTask.text,
                descricao: updatedTask.description,
                status: updatedTask.status,
                responsavel: updatedTask.assigneeId,
                duracaohoras: updatedTask.estimatedHours,
                datafim: updatedTask.dueDate,
                anexos: updatedTask.attachments // Importante: passar o array de anexos para o serviço packAttachments
            };

            if (updatedTask.status !== editingTask.task.status) {
                const dateFields: Record<string, string> = {
                    todo: 'dataafazer',
                    doing: 'datafazendo',
                    review: 'datarevisao',
                    approval: 'dataaprovacao',
                    done: 'dataconclusao'
                };
                const field = dateFields[updatedTask.status];
                if (field) updatePayload[field] = now;
            }

            await updateTask(updatedTask.dbId, updatePayload);

            // Sincronizar checklist (subtarefas)
            if (updatedTask.subtasks && opportunity.organizationId) {
                await syncTaskChecklist(
                    updatedTask.dbId, 
                    updatedTask.subtasks, 
                    opportunity.organizationId, 
                    opportunity.dbProjectId, 
                    updatedTask.assigneeId
                );
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-color)]">
            <div className="px-4 py-4 md:h-20 md:px-8 border-b border-[var(--border-color)] bg-[var(--surface)] flex flex-col md:flex-row items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-glow-amber shrink-0">
                        <Sparkles className="w-4 h-4"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-[10px] md:text-sm text-[var(--text-main)] uppercase tracking-widest leading-none truncate">Workflow Engine</h3>
                        <p className="text-[7px] md:text-[9px] text-slate-500 font-bold uppercase mt-1">Snapshot de Processo</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                        onClick={handleGenerateAiFlow}
                        disabled={isGenerating || readOnly}
                        className="flex-1 md:flex-none whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isGenerating ? <Loader className="w-3.5 h-3.5 animate-spin"/> : <BrainCircuit className="w-3.5 h-3.5"/>}
                        <span className="hidden sm:inline">Gerar Fluxo</span>
                        <span className="sm:hidden">IA Flow</span>
                    </button>
                    
                    <button 
                        onClick={handleSyncTasks}
                        disabled={isSyncing || nodes.length === 0 || readOnly}
                        className="flex-1 md:flex-none whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
                        <span className="hidden sm:inline">Sincronizar Kanban</span>
                        <span className="sm:hidden">Sync</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-5 md:p-12 relative bg-slate-50 dark:bg-black/10">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
                
                {nodes.length === 0 && !isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-white/5 border border-[var(--border-color)] flex items-center justify-center text-slate-400">
                            <WorkflowIcon className="w-8 h-8"/>
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-[var(--text-main)]">Nenhum fluxo mapeado.</h4>
                            <p className="text-xs text-slate-500 font-bold mt-2">Converta sua estratégia em etapas técnicas via IA.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-6 md:gap-10 min-w-max pb-12 items-start relative z-10">
                        {nodes.map((node, idx) => (
                            <div key={node.id} className="flex items-center gap-4 md:gap-6">
                                <div className="w-64 md:w-80 glass-panel p-2 border-[var(--border-color)] flex flex-col shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
                                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-black/5 dark:bg-white/5 mb-2">
                                        <h3 className="font-black text-[9px] md:text-xs uppercase tracking-widest text-[var(--text-main)] truncate max-w-[80%]" title={node.label}>{node.label}</h3>
                                        <span className="text-[8px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg">{node.checklist.length}</span>
                                    </div>
                                    
                                    <div className="p-2 space-y-2 max-h-[450px] overflow-y-auto custom-scrollbar">
                                        {node.checklist.map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => handleTaskClick(task, node)}
                                                className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/40 cursor-pointer shadow-sm group transition-all active:scale-[0.97]"
                                            >
                                                <p className={`text-[11px] font-bold leading-relaxed mb-4 ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {task.text}
                                                </p>
                                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3 text-slate-400"/>
                                                        <span className="text-[8px] font-black uppercase text-slate-400">
                                                            {task.estimatedHours || 2}h
                                                        </span>
                                                    </div>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'done' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {idx < nodes.length - 1 && (
                                    <div className="text-slate-300 dark:text-slate-800 flex flex-col items-center gap-2">
                                        <div className="w-4 h-[2px] bg-current rounded-full"></div>
                                        <ChevronRight className="w-4 h-4"/>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingTask && (
                <TaskDetailModal 
                    task={editingTask.task}
                    nodeTitle={editingTask.nodeLabel}
                    opportunityTitle={opportunity.title}
                    organizationId={opportunity.organizationId}
                    onClose={() => setEditingTask(null)}
                    onSave={handleTaskSave}
                    onDelete={async (id) => {
                        if (editingTask.task.dbId) await deleteTask(editingTask.task.dbId);
                        const newNodes = nodes.map(n => ({ ...n, checklist: n.checklist.filter(t => t.id !== id) }));
                        setNodes(newNodes);
                        await onUpdate({ ...opportunity, bpmn: { ...opportunity.bpmn, nodes: newNodes } } as any);
                        setEditingTask(null);
                    }}
                />
            )}
        </div>
    );
};

// Fixed: Added default export
export default BpmnBuilder;