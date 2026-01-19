
import React, { useState, useEffect } from 'react';
import { Opportunity, BpmnNode, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Plus, BrainCircuit, Zap, Loader2 as Loader, Sparkles, RefreshCw,
    ChevronRight, Workflow, Clock, Trash2, X
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

    const handleAddTask = (nodeId: string) => {
        if (readOnly) return;
        const newTask: BpmnTask = {
            id: crypto.randomUUID(),
            text: 'Nova Tarefa de Engenharia',
            description: '',
            category: 'Gestão',
            status: 'todo',
            completed: false,
            estimatedHours: 2
        };

        const newNodes = nodes.map(n => {
            if (n.id === nodeId) {
                return { ...n, checklist: [...(n.checklist || []), newTask] };
            }
            return n;
        });

        setNodes(newNodes);
        saveStructure(newNodes);
    };

    const handleQuickDelete = (e: React.MouseEvent, nodeId: string, taskId: string) => {
        e.stopPropagation();
        if (readOnly) return;
        
        const newNodes = nodes.map(n => {
            if (n.id === nodeId) {
                return { ...n, checklist: (n.checklist || []).filter(t => t.id !== taskId) };
            }
            return n;
        });

        setNodes(newNodes);
        saveStructure(newNodes);
    };

    const saveStructure = async (updatedNodes: BpmnNode[]) => {
        const updatedBpmn = { 
            ...opportunity.bpmn, 
            nodes: updatedNodes 
        };
        await onUpdate({
            ...opportunity,
            bpmn: updatedBpmn
        } as any);
    };

    const handleGenerateAiFlow = async () => {
        if (!opportunity.description) return alert("Adicione uma missão/contexto ao projeto antes de gerar o fluxo.");
        
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
                const hydratedNodes = result.nodes.map((n: any, nIdx: number) => ({
                    id: n.id || `node-${nIdx}-${Date.now()}`,
                    label: n.label,
                    checklist: (n.checklist || []).map((t: any) => ({
                        id: crypto.randomUUID(),
                        text: t.text,
                        description: t.description || '',
                        category: n.label,
                        status: 'todo',
                        completed: false,
                        estimatedHours: Number(t.estimatedHours) || 2
                    }))
                }));
                
                setNodes(hydratedNodes);
                await saveStructure(hydratedNodes);
            } else {
                alert("A IA não retornou um fluxo válido. Tente refinar a missão estratégica.");
            }
        } catch (e) {
            console.error("Erro na geração de fluxo IA:", e);
            alert("Falha na rede. Verifique sua chave de IA.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSyncTasks = async () => {
        if (!opportunity.organizationId || !opportunity.dbProjectId) return alert("Projeto não sincronizado com o banco.");
        setIsSyncing(true);
        try {
            // Lógica de Carga de Trabalho: Agendamento Cascata
            let currentScheduleDate = new Date();
            let accumulatedHours = 0;

            const scheduledNodes = nodes.map(node => {
                return {
                    ...node,
                    checklist: (node.checklist || []).map(task => {
                        // Calcula dias de offset baseado em 8h/dia útil
                        const daysOffset = Math.floor(accumulatedHours / 8);
                        const scheduleDate = new Date(currentScheduleDate);
                        scheduleDate.setDate(scheduleDate.getDate() + daysOffset);
                        
                        // Incrementa horas para a próxima tarefa
                        accumulatedHours += (task.estimatedHours || 2);
                        
                        return {
                            ...task,
                            startDate: task.startDate || scheduleDate.toISOString(),
                            dueDate: task.dueDate || scheduleDate.toISOString()
                        };
                    })
                };
            });

            const updatedNodes = await syncBpmnTasks(opportunity.dbProjectId, opportunity.organizationId, scheduledNodes);
            setNodes(updatedNodes);
            await saveStructure(updatedNodes);
            alert("Sucesso: Kanban sincronizado com cronograma de carga de trabalho!");
        } catch (e) {
            console.error("Sync Error:", e);
            alert("Erro ao sincronizar tarefas no Kanban.");
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
                    checklist: (n.checklist || []).map(t => t.id === updatedTask.id ? updatedTask : t)
                };
            }
            return n;
        });

        setNodes(newNodes);
        await saveStructure(newNodes);

        if (updatedTask.dbId) {
            await updateTask(updatedTask.dbId, {
                titulo: updatedTask.text,
                descricao: updatedTask.description,
                category: updatedTask.category,
                status: updatedTask.status,
                responsavel: updatedTask.assigneeId,
                duracaohoras: updatedTask.estimatedHours,
                datafim: updatedTask.dueDate
            });

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
            {/* Header Interno do Workflow */}
            <div className="px-8 h-20 border-b border-[var(--border-color)] bg-[var(--surface)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-glow-amber">
                        <Sparkles className="w-5 h-5"/>
                    </div>
                    <div>
                        <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-widest leading-none">Workflow Engine</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Snapshot de Processo Shinkō</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleGenerateAiFlow}
                        disabled={isGenerating || readOnly}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isGenerating ? <Loader className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>}
                        Gerar Fluxo IA
                    </button>
                    
                    <button 
                        onClick={handleSyncTasks}
                        disabled={isSyncing || nodes.length === 0 || readOnly}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        Sincronizar Kanban
                    </button>
                </div>
            </div>

            {/* Canvas de Processos */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-12 relative bg-slate-50 dark:bg-black/10">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
                
                {nodes.length === 0 && !isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 relative z-10">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-200 dark:bg-white/5 border border-[var(--border-color)] flex items-center justify-center text-slate-400">
                            <Workflow className="w-10 h-10"/>
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-[var(--text-main)]">Nenhum fluxo mapeado.</h4>
                            <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">Converta sua estratégia em etapas técnicas via IA para iniciar a engenharia.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-10 min-w-max pb-12 items-start relative z-10">
                        {nodes.map((node, idx) => (
                            <div key={node.id} className="flex items-center gap-6">
                                <div className="w-80 glass-panel p-2 border-[var(--border-color)] flex flex-col shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[300px]">
                                    <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-black/5 dark:bg-white/5 mb-3">
                                        <h3 className="font-black text-xs uppercase tracking-widest text-[var(--text-main)] truncate max-w-[70%]" title={node.label}>{node.label}</h3>
                                        <div className="flex items-center gap-2">
                                            {!readOnly && (
                                                <button 
                                                    onClick={() => handleAddTask(node.id)}
                                                    className="p-1.5 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-all"
                                                    title="Adicionar Ativo Manual"
                                                >
                                                    <Plus className="w-4 h-4"/>
                                                </button>
                                            )}
                                            <span className="text-[9px] font-black px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg">{(node.checklist || []).length}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar px-2">
                                        {(node.checklist || []).map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => handleTaskClick(task, node)}
                                                className="p-5 bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/5 rounded-3xl hover:border-amber-500/40 cursor-pointer shadow-sm group transition-all active:scale-[0.97] relative"
                                            >
                                                {!readOnly && (
                                                    <button 
                                                        onClick={(e) => handleQuickDelete(e, node.id, task.id)}
                                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl"
                                                    >
                                                        <X className="w-4 h-4"/>
                                                    </button>
                                                )}
                                                <p className={`text-[11px] font-bold leading-relaxed mb-4 ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {task.text}
                                                </p>
                                                <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-white/5">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Clock className="w-3.5 h-3.5"/>
                                                        <span className="text-[9px] font-black uppercase">
                                                            {task.estimatedHours || 2}h
                                                        </span>
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {idx < nodes.length - 1 && (
                                    <div className="text-slate-300 dark:text-slate-800 flex flex-col items-center gap-3">
                                        <div className="w-6 h-[2.5px] bg-current rounded-full"></div>
                                        <ChevronRight className="w-5 h-5"/>
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
                        const newNodes = nodes.map(n => ({ ...n, checklist: (n.checklist || []).filter(t => t.id !== id) }));
                        setNodes(newNodes);
                        await saveStructure(newNodes);
                        setEditingTask(null);
                    }}
                />
            )}
        </div>
    );
};

export default BpmnBuilder;
