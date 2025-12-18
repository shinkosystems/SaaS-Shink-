
import React, { useState, useEffect } from 'react';
import { Opportunity, BpmnNode, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Plus, Settings, MoreHorizontal, CheckCircle2, Circle, 
    ArrowRight, BrainCircuit, Save, Zap, Loader2, Sparkles, RefreshCw,
    ChevronRight
} from 'lucide-react';
import { updateTask, deleteTask, syncTaskChecklist, syncBpmnTasks } from '../services/projectService';
import { generateBpmn } from '../services/geminiService';
import { fetchRoles } from '../services/organizationService';

interface Props {
  opportunity: Opportunity;
  onUpdate: (opp: Opportunity) => void;
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
                '', // orgType opcional
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
                onUpdate({
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
            // Sincroniza e retorna a estrutura com IDs de banco populados
            const updatedNodes = await syncBpmnTasks(opportunity.dbProjectId, opportunity.organizationId, nodes);
            
            // Mantemos os nodes locais atualizados para não sumir a visualização
            setNodes(updatedNodes);
            
            // Persistimos a estrutura no objeto de projeto (Opportunity)
            onUpdate({ 
                ...opportunity, 
                bpmn: { 
                    ...opportunity.bpmn, 
                    nodes: updatedNodes 
                } 
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
        setNodes(newNodes);
        
        if (updatedTask.dbId) {
            await updateTask(updatedTask.dbId, {
                titulo: updatedTask.text,
                descricao: updatedTask.description,
                status: updatedTask.status,
                responsavel: updatedTask.assigneeId,
                duracaohoras: updatedTask.estimatedHours,
                datafim: updatedTask.dueDate
            });
        }
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-color)]">
            {/* Control Bar */}
            <div className="h-20 px-8 border-b border-[var(--border-color)] bg-[var(--surface)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-glow-amber">
                        <Sparkles className="w-5 h-5"/>
                    </div>
                    <div>
                        <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-widest">Workflow Engine</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Mapeamento de Processo Crítico</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleGenerateAiFlow}
                        disabled={isGenerating || readOnly}
                        className="flex items-center gap-3 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>}
                        {isGenerating ? 'Analisando Contexto...' : 'Gerar Fluxo via IA'}
                    </button>
                    
                    <div className="w-px h-8 bg-[var(--border-color)] mx-2"></div>

                    <button 
                        onClick={handleSyncTasks}
                        disabled={isSyncing || nodes.length === 0 || readOnly}
                        className="flex items-center gap-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        Sincronizar no Kanban
                    </button>
                </div>
            </div>

            {/* Builder Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-12 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-slate-50 dark:bg-black/10">
                {nodes.length === 0 && !isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 dark:bg-white/5 border border-[var(--border-color)] flex items-center justify-center text-slate-300">
                            <Workflow className="w-12 h-12"/>
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-[var(--text-main)]">Sem Fluxo Definido.</h4>
                            <p className="text-sm text-slate-500 font-bold mt-2">Utilize o botão acima para que nossa IA gere o escopo técnico baseado na sua descrição estratégica.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-12 min-w-max pb-12 items-start">
                        {nodes.map((node, idx) => (
                            <div key={node.id} className="flex items-center gap-6">
                                <div className="w-80 glass-card p-2 border-[var(--border-color)] flex flex-col shadow-2xl">
                                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-t-[1.8rem] mb-2">
                                        <h3 className="font-black text-xs uppercase tracking-widest text-[var(--text-main)] truncate" title={node.label}>{node.label}</h3>
                                        <div className="text-[9px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20">{node.checklist.length}</div>
                                    </div>
                                    
                                    <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {node.checklist.map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => handleTaskClick(task, node)}
                                                className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl hover:border-amber-500/50 cursor-pointer shadow-sm group transition-all active:scale-95"
                                            >
                                                <p className={`text-xs font-bold leading-relaxed mb-3 ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-[var(--text-main)]'}`}>
                                                    {task.text}
                                                </p>
                                                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                                                    <span className="text-[9px] font-black uppercase text-slate-400">
                                                        {task.estimatedHours || 2}h
                                                    </span>
                                                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {idx < nodes.length - 1 && (
                                    <div className="text-slate-300 dark:text-slate-800 flex flex-col items-center gap-2">
                                        <div className="w-8 h-[2px] bg-current rounded-full"></div>
                                        <ChevronRight className="w-6 h-6"/>
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
                        setNodes(nodes.map(n => ({ ...n, checklist: n.checklist.filter(t => t.id !== id) })));
                        setEditingTask(null);
                    }}
                />
            )}
        </div>
    );
};

const Workflow = ({className}: any) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);

export default BpmnBuilder;
