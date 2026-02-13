
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Opportunity, DbTask, BpmnTask } from '../types';
import { RefreshCw, Clock, Lock, Trash2, Edit, DollarSign, BarChart3, AlignLeft, User, ChevronDown, Layers, FileText, Cpu, ArrowRight, X, LayoutGrid, FileSpreadsheet, Download, Plus, UploadCloud, Loader2, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { createTask, updateTask, deleteTask } from '../services/projectService';

interface Props {
  tasks: DbTask[]; 
  onSelectOpportunity: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number; 
  projectId?: string;
  readOnly?: boolean;
  onRefresh?: () => void;
}

const COLUMNS = [
    { id: 'todo', label: 'Backlog', color: 'bg-slate-300', accent: 'border-slate-400/20 bg-slate-400/5' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500', accent: 'border-blue-500/20 bg-blue-500/5' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500', accent: 'border-purple-500/20 bg-purple-500/5' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500', accent: 'border-orange-500/20 bg-orange-500/5' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500', accent: 'border-emerald-500/20 bg-emerald-500/5' }
];

export const KanbanBoard: React.FC<Props> = ({ tasks, organizationId, projectId, readOnly, onRefresh }) => {
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);
    const [showBatchInsertModal, setShowBatchInsertModal] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const columnsData = useMemo(() => {
        return COLUMNS.reduce((acc, col) => {
            acc[col.id] = tasks.filter(t => !t.sutarefa && (t.status || 'todo').toLowerCase() === col.id);
            return acc;
        }, {} as Record<string, DbTask[]>);
    }, [tasks]);

    // --- HANDLERS DE DRAG & DROP ---
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        if (readOnly) return;
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId.toString());
        e.dataTransfer.effectAllowed = 'move';
        
        // Efeito visual de "levantar" o card
        const target = e.currentTarget as HTMLElement;
        target.classList.add('grabbing-card');
        
        // Timeout para a imagem fantasma não herdar a opacidade zero
        setTimeout(() => {
            target.style.opacity = '0.4';
            target.style.transform = 'scale(1.05) rotate(2deg)';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('grabbing-card');
        target.style.opacity = '1';
        target.style.transform = 'scale(1) rotate(0deg)';
        setDraggedTaskId(null);
        setDropTargetColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        if (readOnly) return;
        e.preventDefault();
        if (dropTargetColumn !== columnId) setDropTargetColumn(columnId);
    };

    const handleDrop = async (e: React.DragEvent, columnId: string) => {
        if (readOnly) return;
        e.preventDefault();
        setDropTargetColumn(null);
        
        const taskIdStr = e.dataTransfer.getData('taskId');
        const taskId = parseInt(taskIdStr);
        if (isNaN(taskId)) return;

        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (taskToUpdate && taskToUpdate.status !== columnId) {
            try {
                // Atualização otimista na UI (opcional se onRefresh for rápido)
                await updateTask(taskId, { status: columnId });
                onRefresh?.();
            } catch (err) {
                alert("Falha ao sincronizar estágio.");
                onRefresh?.(); 
            }
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('https://esm.sh/xlsx@0.18.5');
            const data = [
                ["Titulo", "Descricao", "Categoria", "Horas Estimadas", "Prazo (AAAA-MM-DD)", "Gravidade (1-5)", "Urgencia (1-5)", "Tendencia (1-5)"],
                ["Exemplo de Ativo", "Desenvolver lógica de precificação", "Lógica", 4, "2025-12-31", 3, 3, 3]
            ];
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Tasks");
            XLSX.writeFile(wb, "modelo_shinko_batch_tasks.xlsx");
        } catch (e) {
            alert("Erro ao gerar modelo.");
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !organizationId) return;

        setIsImporting(true);
        try {
            const XLSX = await import('https://esm.sh/xlsx@0.18.5');
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                let successCount = 0;
                for (const row of data) {
                    const title = row.Titulo || row.titulo || row.Título || row.título || 'Ativo Importado';
                    const description = row.Descricao || row.descricao || row.Descrição || row.descrição || '';
                    const category = row.Categoria || row.categoria || 'Gestão';
                    const hours = Number(row["Horas Estimadas"] || row["Horas"] || row.horas || 2);
                    let dueDate = row["Prazo (AAAA-MM-DD)"] || row.Prazo || row.prazo || new Date().toISOString();
                    if (dueDate instanceof Date) dueDate = dueDate.toISOString();

                    const taskPayload = {
                        titulo: title,
                        descricao: description,
                        category: category,
                        duracaohoras: isNaN(hours) ? 2 : hours,
                        datafim: dueDate,
                        projeto: projectId ? Number(projectId) : null,
                        organizacao: Number(organizationId),
                        status: 'todo'
                    };
                    
                    const res = await createTask(taskPayload);
                    if (res) successCount++;
                }

                alert(`${successCount} ativos sincronizados!`);
                onRefresh?.();
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            setIsImporting(false);
        }
    };

    // Estilo Nubank: A interface de fundo encolhe quando o modal abre
    const isModalOpen = !!editingTaskCtx || showBatchInsertModal;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-[#020203]">
            
            {/* CONTAINER COM EFEITO DE ESCALA (CONTEXTUAL SHEET) */}
            <div className={`flex flex-col h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isModalOpen ? 'scale-[0.96] rounded-[3rem] opacity-50 blur-[2px] pointer-events-none' : 'scale-100'}`}>
                
                {/* TOOLBAR OPERACIONAL - REESTILIZADA NUBANK */}
                {!readOnly && (
                    <div className="px-8 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                                <Layers className="w-5 h-5"/>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Workflow Master</span>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Operação Industrial</h3>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button 
                                onClick={() => setShowBatchInsertModal(true)}
                                className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4 stroke-[3px]"/> Nova Task
                            </button>

                            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

                            <button 
                                onClick={handleDownloadTemplate}
                                className="p-3.5 bg-white dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl transition-all"
                                title="Baixar Modelo XLSX"
                            >
                                <FileSpreadsheet className="w-5 h-5"/>
                            </button>

                            <label className="cursor-pointer group">
                                <div className="px-6 py-3.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-amber-500/50 transition-all flex items-center gap-2">
                                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4 text-amber-500"/>}
                                    {isImporting ? 'Importando...' : 'Subir Planilha'}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept=".xlsx, .xls" 
                                    onChange={handleExcelUpload}
                                    disabled={isImporting}
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* BOARD AREA */}
                <div className="flex overflow-x-auto custom-scrollbar p-8 md:p-12 gap-8">
                    {COLUMNS.map(col => (
                        <div 
                            key={col.id} 
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDrop={(e) => handleDrop(e, col.id)}
                            onDragLeave={() => setDropTargetColumn(null)}
                            className={`
                                w-[320px] shrink-0 flex flex-col rounded-[2.5rem] transition-all duration-500 relative
                                ${dropTargetColumn === col.id ? 'bg-amber-500/5 ring-2 ring-amber-500/40 scale-[1.02] shadow-2xl' : 'bg-white/40 dark:bg-white/[0.01]'}
                            `}
                        >
                            {/* HEADER COLUNA */}
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-4 rounded-full ${col.color}`}></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{col.label}</h3>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400">
                                    {columnsData[col.id]?.length || 0}
                                </span>
                            </div>

                            {/* ÁREA DE CARDS - GLASS EFFECT */}
                            <div className="flex-1 px-4 pb-12 space-y-4 min-h-[400px]">
                                {columnsData[col.id]?.map(task => (
                                    <div 
                                        key={task.id}
                                        draggable={!readOnly}
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setEditingTaskCtx(task)}
                                        className="
                                            group relative bg-white dark:bg-[#111113] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 
                                            shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] transition-all duration-500 cursor-pointer
                                            hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:scale-[1.03] hover:border-amber-500/20 active:scale-95
                                        "
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest truncate">{task.projetoData?.nome || 'Avulso'}</div>
                                                <div className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">#{task.id}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                {task.responsavelData?.avatar_url ? (
                                                    <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-3.5 h-3.5 text-slate-300"/>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 leading-snug line-clamp-3 mb-6 group-hover:text-amber-500 transition-colors">
                                            {task.titulo}
                                        </h4>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                                            <div className="flex items-center gap-4 text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3"/>
                                                    <span className="text-[9px] font-black">{task.duracaohoras || 2}h</span>
                                                </div>
                                                {task.category && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{task.category}</span>
                                                )}
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-amber-500 transition-all group-hover:translate-x-1"/>
                                        </div>
                                    </div>
                                ))}

                                {columnsData[col.id]?.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-10 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2.5rem]">
                                        <LayoutGrid className="w-8 h-8 mb-2"/>
                                        <p className="text-[9px] font-black uppercase tracking-widest">Livre</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL DE EDIÇÃO / DETALHES */}
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(), text: editingTaskCtx.titulo, description: editingTaskCtx.descricao,
                        category: editingTaskCtx.category, completed: editingTaskCtx.status === 'done', status: editingTaskCtx.status as any, 
                        estimatedHours: editingTaskCtx.duracaohoras, dueDate: editingTaskCtx.datafim, assigneeId: editingTaskCtx.responsavel,
                        dbId: editingTaskCtx.id, gut: { g: editingTaskCtx.gravidade || 3, u: editingTaskCtx.urgencia || 3, t: editingTaskCtx.tendencia || 3 }
                    }}
                    nodeTitle={editingTaskCtx.category || 'Tarefa'}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, 
                            descricao: updated.description,
                            status: updated.status, 
                            category: updated.category,
                            responsavel: updated.assigneeId, 
                            datafim: updated.dueDate, 
                            duracaohoras: updated.estimatedHours,
                            gravidade: updated.gut?.g,
                            urgencia: updated.gut?.u,
                            tendencia: updated.gut?.t
                        });
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                />
            )}

            {/* CRIAÇÃO DIRETA */}
            {showBatchInsertModal && (
                <TaskDetailModal 
                    task={{
                        id: 'new', text: '', description: '', category: 'Gestão', 
                        status: 'todo', completed: false, estimatedHours: 2, 
                        dueDate: new Date().toISOString().split('T')[0]
                    }}
                    nodeTitle="Nova Tarefa Operacional"
                    opportunityTitle="Injeção de Ativo"
                    organizationId={organizationId}
                    onClose={() => setShowBatchInsertModal(false)}
                    onSave={async (task) => {
                        await createTask({
                            titulo: task.text,
                            descricao: task.description,
                            projeto: projectId ? Number(projectId) : null,
                            responsavel: task.assigneeId,
                            organizacao: organizationId,
                            status: task.status,
                            category: task.category,
                            gravidade: task.gut?.g,
                            urgencia: task.gut?.u,
                            tendencia: task.gut?.t,
                            datafim: task.dueDate,
                            duracaohoras: task.estimatedHours
                        });
                        onRefresh?.();
                        setShowBatchInsertModal(false);
                    }}
                />
            )}

            <style>{`
                .grabbing-card {
                    cursor: grabbing !important;
                    z-index: 1000 !important;
                    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.2) !important;
                }
                .grabbing-card * {
                    pointer-events: none !important;
                }
            `}</style>
        </div>
    );
};
