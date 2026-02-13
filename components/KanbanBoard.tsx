
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Opportunity, DbTask, BpmnTask } from '../types';
import { RefreshCw, Clock, Lock, Trash2, Edit, DollarSign, BarChart3, AlignLeft, User, ChevronDown, Layers, FileText, Cpu, ArrowRight, X, LayoutGrid, FileSpreadsheet, Download, Plus, UploadCloud, Loader2 } from 'lucide-react';
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
    { id: 'todo', label: 'Backlog', color: 'bg-slate-400', accent: 'bg-slate-500' },
    { id: 'doing', label: 'Execução', color: 'bg-blue-500', accent: 'bg-blue-600' },
    { id: 'review', label: 'Revisão', color: 'bg-purple-500', accent: 'bg-purple-600' },
    { id: 'approval', label: 'Aprovação', color: 'bg-orange-500', accent: 'bg-orange-600' },
    { id: 'done', label: 'Concluído', color: 'bg-emerald-500', accent: 'bg-emerald-600' }
];

export const KanbanBoard: React.FC<Props> = ({ tasks, organizationId, projectId, readOnly, onRefresh }) => {
    const [editingTaskCtx, setEditingTaskCtx] = useState<DbTask | null>(null);
    const [showBatchInsertModal, setShowBatchInsertModal] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const columnsData = useMemo(() => {
        return COLUMNS.reduce((acc, col) => {
            acc[col.id] = tasks.filter(t => !t.sutarefa && (t.status || 'todo').toLowerCase() === col.id);
            return acc;
        }, {} as Record<string, DbTask[]>);
    }, [tasks]);

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('https://esm.sh/xlsx@0.18.5');
            const data = [
                ["Titulo", "Descricao", "Categoria", "Horas Estimadas", "Prazo (AAAA-MM-DD)", "Gravidade (1-5)", "Urgencia (1-5)", "Tendencia (1-5)"],
                ["Exemplo de Tarefa", "Descrição detalhada aqui", "Lógica", 4, "2025-12-31", 3, 3, 3]
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
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                let successCount = 0;
                for (const row of data) {
                    const taskPayload = {
                        titulo: row.Titulo || row.titulo || 'Tarefa Importada',
                        descricao: row.Descricao || row.descricao || '',
                        category: row.Categoria || row.categoria || 'Gestão',
                        duracaohoras: Number(row["Horas Estimadas"] || row.horas || 2),
                        datafim: row["Prazo (AAAA-MM-DD)"] || row.prazo || new Date().toISOString(),
                        gravidade: Number(row["Gravidade (1-5)"] || row.g || 1),
                        urgencia: Number(row["Urgencia (1-5)"] || row.u || 1),
                        tendencia: Number(row["Tendencia (1-5)"] || row.t || 1),
                        projeto: projectId ? Number(projectId) : null,
                        organizacao: organizationId,
                        status: 'todo'
                    };
                    
                    const res = await createTask(taskPayload);
                    if (res) successCount++;
                }

                alert(`${successCount} tarefas sincronizadas com o projeto!`);
                onRefresh?.();
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            alert("Erro ao processar planilha.");
            setIsImporting(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            
            {/* TOOLBAR OPERACIONAL DE BATELADA */}
            {!readOnly && (
                <div className="px-8 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <Layers className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operação em Lote</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* BOTÃO 1: INSERIR MANUAL */}
                        <button 
                            onClick={() => setShowBatchInsertModal(true)}
                            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5"/> Nova Task
                        </button>

                        <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

                        {/* BOTÃO 3: BAIXAR MODELO */}
                        <button 
                            onClick={handleDownloadTemplate}
                            className="px-6 py-2.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Download className="w-3.5 h-3.5"/> Modelo .xlsx
                        </button>

                        {/* BOTÃO 2: UPLOAD EXCEL */}
                        <label className="cursor-pointer">
                            <div className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-500 transition-all flex items-center gap-2">
                                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <UploadCloud className="w-3.5 h-3.5"/>}
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

            <div className="flex overflow-x-auto custom-scrollbar bg-transparent p-8 md:p-12">
                <div className="flex gap-8 min-w-max">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="w-[320px] flex flex-col space-y-6">
                            {/* HEADER DA COLUNA */}
                            <div className="flex items-center justify-between px-2 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-5 rounded-full ${col.color}`}></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{col.label}</h3>
                                </div>
                                <div className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-400">
                                    {columnsData[col.id]?.length || 0}
                                </div>
                            </div>

                            {/* ÁREA DE CARDS */}
                            <div className="space-y-5 px-1 pb-10">
                                {columnsData[col.id]?.map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={() => setEditingTaskCtx(task)}
                                        className="group relative bg-white dark:bg-[#0c0c0e] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-soft transition-all duration-300 cursor-pointer hover:shadow-2xl hover:border-amber-500/30 hover:-translate-y-1"
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r-full bg-slate-100 dark:bg-white/5 transition-colors group-hover:bg-amber-500"></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest truncate max-w-[150px]">{task.projetoData?.nome || 'Avulso'}</span>
                                                <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase mt-0.5">#{task.id}</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/50 flex items-center justify-center overflow-hidden">
                                                {task.responsavelData?.avatar_url ? (
                                                    <img src={task.responsavelData.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-3.5 h-3.5 text-slate-300"/>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-200 leading-snug line-clamp-3 mb-6">
                                            {task.titulo}
                                        </h4>

                                        <div className="flex items-center justify-between pt-5 border-t border-slate-50 dark:border-white/5">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3"/>
                                                    <span className="text-[9px] font-black">{task.duracaohoras || 2}h</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-amber-500 transition-colors"/>
                                        </div>
                                    </div>
                                ))}
                                {columnsData[col.id]?.length === 0 && (
                                    <div className="py-16 flex flex-col items-center justify-center text-center opacity-10 border-2 border-dashed border-slate-300 dark:border-white/5 rounded-[2.5rem]">
                                        <LayoutGrid className="w-10 h-10 mb-2"/>
                                        <p className="text-[9px] font-black uppercase">Vazio</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL DE EDIÇÃO / DETALHES EXISTENTE */}
            {editingTaskCtx && (
                <TaskDetailModal 
                    task={{
                        id: editingTaskCtx.id.toString(), text: editingTaskCtx.titulo, description: editingTaskCtx.descricao,
                        category: editingTaskCtx.category, completed: editingTaskCtx.status === 'done', status: editingTaskCtx.status as any, 
                        estimatedHours: editingTaskCtx.duracaohoras, dueDate: editingTaskCtx.datafim, assigneeId: editingTaskCtx.responsavel,
                        dbId: editingTaskCtx.id
                    }}
                    nodeTitle={editingTaskCtx.category || 'Tarefa'}
                    onClose={() => setEditingTaskCtx(null)}
                    onSave={async (updated) => {
                        await updateTask(Number(updated.id), { 
                            titulo: updated.text, status: updated.status, category: updated.category,
                            responsavel: updated.assigneeId, datafim: updated.dueDate, duracaohoras: updated.estimatedHours
                        });
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                    onDelete={async (id) => {
                        await deleteTask(Number(id));
                        onRefresh?.(); setEditingTaskCtx(null);
                    }}
                />
            )}

            {/* COMPONENTE (1): INSERIR TAREFA MANUAL COM TODOS OS DADOS */}
            {showBatchInsertModal && (
                <TaskDetailModal 
                    task={{
                        id: 'new', text: '', description: '', category: 'Gestão', 
                        status: 'todo', completed: false, estimatedHours: 2, 
                        dueDate: new Date().toISOString().split('T')[0]
                    }}
                    nodeTitle="Nova Tarefa Operacional"
                    opportunityTitle="Criação Direta no Ativo"
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
        </div>
    );
};
