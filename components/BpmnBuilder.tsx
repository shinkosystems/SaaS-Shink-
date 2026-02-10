
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, BpmnNode, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Plus, BrainCircuit, Zap, Loader2 as Loader, Sparkles, RefreshCw,
    ChevronRight, ChevronDown, Workflow, Clock, Trash2, ListTodo,
    ChevronUp, Layout
} from 'lucide-react';
import { updateTask, deleteTask, syncBpmnTasks } from '../services/projectService';
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
    const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<{task: BpmnTask, nodeId: string, nodeLabel: string} | null>(null);

    useEffect(() => {
        if (opportunity.bpmn?.nodes) {
            setNodes(opportunity.bpmn.nodes);
            // Expande a primeira etapa por padrão se houver
            if (opportunity.bpmn.nodes.length > 0 && !expandedNodeId) {
                setExpandedNodeId(opportunity.bpmn.nodes[0].id);
            }
        }
    }, [opportunity.bpmn]);

    const handleTaskClick = (e: React.MouseEvent, task: BpmnTask, node: BpmnNode) => {
        e.stopPropagation();
        setEditingTask({
            task,
            nodeId: node.id,
            nodeLabel: node.label
        });
    };

    const handleAddTask = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (readOnly) return;
        const newTask: BpmnTask = {
            id: crypto.randomUUID(),
            text: 'Novo Ativo de Engenharia',
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
        const hasContext = !!(opportunity.description || opportunity.docsContext);
        if (!hasContext) return alert("Adicione uma descrição técnica para que a IA possa projetar as atividades.");
        
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

            if (result && result.nodes && result.nodes.length > 0) {
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
                        estimatedHours: Number(t.estimatedHours) || 4
                    }))
                }));
                
                setNodes(hydratedNodes);
                setExpandedNodeId(hydratedNodes[0].id);
                await saveStructure(hydratedNodes);
            }
        } catch (e) {
            console.error("BPMN Gen Error:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSyncTasks = async () => {
        if (!opportunity.dbProjectId) return alert("Sincronize o projeto primeiro.");
        setIsSyncing(true);
        try {
            const updatedNodes = await syncBpmnTasks(opportunity.dbProjectId, opportunity.organizationId!, nodes);
            setNodes(updatedNodes);
            await saveStructure(updatedNodes);
            alert("Workflow Sincronizado!");
        } catch (e) {
            alert("Erro ao sincronizar.");
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
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'done': return 'bg-emerald-500';
            case 'doing': return 'bg-blue-500';
            case 'review': return 'bg-purple-500';
            case 'approval': return 'bg-orange-500';
            default: return 'bg-slate-300 dark:bg-slate-700';
        }
    };

    // Constantes para a Pilha de Cards
    const CARD_HEADER_HEIGHT = 80;
    const EXPANDED_EXTRA_HEIGHT = 450;

    const containerMinHeight = useMemo(() => {
        if (nodes.length === 0) return 400;
        const baseHeight = nodes.length * CARD_HEADER_HEIGHT;
        return expandedNodeId ? baseHeight + EXPANDED_EXTRA_HEIGHT : baseHeight + 100;
    }, [nodes.length, expandedNodeId]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#020203]">
            {/* Toolbar Superior Industrial */}
            <div className="px-6 py-4 md:h-20 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                        <Workflow className="w-5 h-5"/>
                    </div>
                    <div>
                        <h3 className="font-black text-[10px] md:text-xs text-slate-900 dark:text-white uppercase tracking-widest leading-none">Sequence Engine</h3>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Fluxo Sequencial de Engenharia</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                        onClick={handleGenerateAiFlow}
                        disabled={isGenerating || readOnly}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isGenerating ? <Loader className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>}
                        IA Flow
                    </button>
                    
                    <button 
                        onClick={handleSyncTasks}
                        disabled={isSyncing || nodes.length === 0 || readOnly}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        Sync Kanban
                    </button>
                </div>
            </div>

            {/* Área de Pilha de Cards */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative bg-slate-50 dark:bg-transparent">
                {nodes.length === 0 && !isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-6 opacity-40">
                        <Layout className="w-16 h-16 text-slate-300"/>
                        <p className="text-xs font-black uppercase tracking-widest">Nenhuma etapa projetada. Use a IA Flow para estruturar o ativo.</p>
                    </div>
                ) : (
                    <div 
                        className="relative max-w-2xl mx-auto transition-all duration-700 ease-in-out"
                        style={{ minHeight: `${containerMinHeight}px`, perspective: '1500px' }}
                    >
                        {nodes.map((node, idx) => {
                            const isExpanded = expandedNodeId === node.id;
                            const expandedIdx = nodes.findIndex(n => n.id === expandedNodeId);
                            
                            // Cálculo da posição na pilha (estilo Carteira)
                            let translateY = idx * CARD_HEADER_HEIGHT;
                            if (expandedNodeId && idx > expandedIdx) {
                                translateY += EXPANDED_EXTRA_HEIGHT;
                            }

                            return (
                                <div 
                                    key={node.id}
                                    onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                                    className={`
                                        absolute top-0 left-0 w-full rounded-[2.5rem] bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/5 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden cursor-pointer
                                        ${isExpanded ? 'z-50 scale-[1.02]' : 'hover:-translate-y-2'}
                                    `}
                                    style={{ 
                                        transform: `translateY(${translateY}px)`,
                                        zIndex: isExpanded ? 50 : idx + 10,
                                        height: isExpanded ? `${EXPANDED_EXTRA_HEIGHT + CARD_HEADER_HEIGHT}px` : `${CARD_HEADER_HEIGHT + 20}px`
                                    }}
                                >
                                    {/* Cabeçalho do Card da Etapa */}
                                    <div className="h-20 flex items-center justify-between px-8 md:px-10 border-b border-slate-50 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-black">
                                                {idx + 1}
                                            </div>
                                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-slate-300">
                                                {node.label}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black px-2.5 py-1 bg-slate-200 dark:bg-white/5 rounded-lg text-slate-500">
                                                {(node.checklist || []).length} CARDS
                                            </span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                                        </div>
                                    </div>

                                    {/* Conteúdo Expandido: Lista de Tarefas Industrial */}
                                    <div className={`p-6 md:p-8 space-y-4 overflow-y-auto custom-scrollbar ${isExpanded ? 'h-[430px]' : 'h-0'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atividades desta Etapa</p>
                                            {!readOnly && (
                                                <button 
                                                    onClick={(e) => handleAddTask(e, node.id)} 
                                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all"
                                                >
                                                    <Plus className="w-3.5 h-3.5"/> Adicionar Task
                                                </button>
                                            )}
                                        </div>

                                        {(node.checklist || []).map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={(e) => handleTaskClick(e, task, node)}
                                                className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-white/5 p-5 md:p-6 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm group relative overflow-hidden flex flex-col"
                                            >
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(task.status)} opacity-80`}></div>
                                                
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <ListTodo className="w-3 h-3"/>
                                                        <span className="text-[8px] font-black uppercase tracking-widest">{task.category || 'Ativo'}</span>
                                                    </div>
                                                    {!readOnly && (
                                                        <button 
                                                            onClick={(e) => handleQuickDelete(e, node.id, task.id)}
                                                            className="p-1.5 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5"/>
                                                        </button>
                                                    )}
                                                </div>

                                                <h4 className={`text-sm font-black tracking-tight mb-4 ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                    {task.text}
                                                </h4>

                                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-slate-400">
                                                            <Clock className="w-3 h-3"/>
                                                            <span className="text-[9px] font-black">{task.estimatedHours || 2}h</span>
                                                        </div>
                                                        {task.dueDate && (
                                                            <span className="text-[8px] font-black text-slate-400 uppercase">
                                                                {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {node.checklist.length === 0 && (
                                            <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem]">
                                                <ListTodo className="w-10 h-10 mx-auto mb-3"/>
                                                <p className="text-[10px] font-black uppercase">Nenhuma tarefa alocada</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
                    readOnly={readOnly}
                />
            )}
        </div>
    );
};

export default BpmnBuilder;
