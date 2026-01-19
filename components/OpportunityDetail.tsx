import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Opportunity, BpmnTask, ProjectStatus } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Activity, Target, Zap, DollarSign, Calendar, Clock, Lock, 
    ArrowLeft, MoreHorizontal, FileText, Edit2, Check, X, 
    ChevronDown, ChevronUp, Layers, Rocket, ShieldCheck, TrendingUp, Trash2,
    PlayCircle, PauseCircle, Timer, Archive, CheckCircle2, AlertTriangle, Download
} from 'lucide-react';
import { updateTask, deleteTask } from '../services/projectService';
import { getOperationalRates } from '../services/financialService';

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

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string; icon: any }[] = [
    { value: 'Active', label: 'EM EXECUÇÃO', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: PlayCircle },
    { value: 'Negotiation', label: 'NEGOCIAÇÃO', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: DollarSign },
    { value: 'Future', label: 'OPORTUNIDADE', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Timer },
    { value: 'Frozen', label: 'CONGELADO', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: PauseCircle },
    { value: 'Archived', label: 'ARQUIVADO', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: Archive }
];

// Added export to the component declaration
const OpportunityDetail: React.FC<Props> = ({ 
    opportunity, onClose, onDelete, onUpdate, userRole
}) => {
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descText, setDescText] = useState(opportunity.description || '');
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [rates, setRates] = useState<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (opportunity.organizationId) {
            getOperationalRates(opportunity.organizationId).then(setRates);
        }
    }, [opportunity.organizationId]);

    const financialHealth = useMemo(() => {
        let totalHours = 0;
        opportunity.bpmn?.nodes?.forEach(node => {
            node.checklist.forEach(task => {
                totalHours += Number(task.estimatedHours || 2);
            });
        });

        const accumulatedCost = totalHours * (rates?.totalRate || 0);
        const revenue = (opportunity as any).revenue_value || 0; // Se houver contrato
        const margin = revenue > 0 ? ((revenue - accumulatedCost) / revenue) * 100 : 0;

        return { totalHours, accumulatedCost, revenue, margin };
    }, [opportunity, rates]);

    const totalTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + node.checklist.length, 0) || 0;
    const completedTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + node.checklist.filter(t => t.status === 'done').length, 0) || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsStatusMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStatusSelect = (newStatus: ProjectStatus) => {
        if (userRole === 'cliente') return;
        setIsStatusMenuOpen(false);
        const updatedOpp = { ...opportunity, status: newStatus };
        onUpdate(updatedOpp);
    };

    const handleSaveDescription = async () => {
        setIsEditingDesc(false);
        const updatedOpp = { ...opportunity, description: descText };
        onUpdate(updatedOpp);
    };

    const handleDelete = () => {
        if (confirm("Deseja permanentemente excluir este projeto?")) {
            onDelete(opportunity.id);
        }
    };

    const MetricCard = ({ label, value, icon: Icon, color, subValue }: any) => (
        <div className="glass-card p-6 flex flex-col justify-between h-36 group rounded-2xl">
            <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-lg ${color} bg-opacity-10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/5`}>
                    <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                </div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-widest">{label}</div>
            </div>
            <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{value}</div>
                {subValue && <div className="text-[8px] font-bold text-slate-400 dark:text-[#A1A1AA] mt-1 uppercase tracking-wider">{subValue}</div>}
            </div>
        </div>
    );

    const currentStatusObj = STATUS_OPTIONS.find(s => s.value === opportunity.status) || STATUS_OPTIONS[2];

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Contexto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-8 border-b border-slate-200 dark:border-[#333]">
                <div className="space-y-4 w-full">
                    <div className="flex items-center gap-3">
                        <div className="relative" ref={menuRef}>
                            <button 
                                onClick={() => userRole !== 'cliente' && setIsStatusMenuOpen(!isStatusMenuOpen)}
                                className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${currentStatusObj.color} hover:scale-[1.02] active:scale-98`}
                            >
                                <currentStatusObj.icon className="w-3.5 h-3.5" />
                                {currentStatusObj.label}
                                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isStatusMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 dark:bg-[#1A1A1E] backdrop-blur-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-[500] animate-in fade-in zoom-in-95 duration-200 p-1.5">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleStatusSelect(opt.value)}
                                            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${opportunity.status === opt.value ? 'bg-[#007AFF] text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <opt.icon className={`w-4 h-4 ${opportunity.status === opt.value ? 'text-white' : 'text-slate-400'}`} />
                                                {opt.label}
                                            </span>
                                            {opportunity.status === opt.value && <Check className="w-4 h-4 stroke-[4px]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <span className="shrink-0 px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/5">
                            {opportunity.archetype}
                        </span>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{opportunity.title}</h1>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    {opportunity.pdfUrl && (
                        <a 
                            href={opportunity.pdfUrl} 
                            target="_blank" 
                            className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all shadow-md"
                        >
                            <Download className="w-4 h-4"/> Documento Escopo
                        </a>
                    )}
                    <div className="flex-1 lg:flex-none flex items-center gap-4 p-4 border border-slate-200 dark:border-[#333] rounded-[1.5rem] bg-white dark:bg-white/[0.02]">
                         <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <TrendingUp className="w-5 h-5"/>
                         </div>
                         <div>
                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lucratividade Técnica</div>
                             <div className="text-sm font-black text-emerald-500 uppercase tracking-tight">{financialHealth.margin.toFixed(1)}% de Margem</div>
                         </div>
                    </div>
                    {userRole !== 'cliente' && (
                        <button onClick={handleDelete} className="p-4 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-lg active:scale-95">
                            <Trash2 className="w-6 h-6"/>
                        </button>
                    )}
                </div>
            </div>

            {/* Grid de Métricas ABC */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Custo Acumulado" value={`R$ ${financialHealth.accumulatedCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} icon={DollarSign} color="bg-red-500" subValue={`${financialHealth.totalHours}h de Produção`} />
                <MetricCard label="Status Operacional" value={`${progress}%`} icon={CheckCircle2} color="bg-emerald-500" subValue={`${completedTasks}/${totalTasks} Tasks`} />
                <MetricCard label="PRIO-6 Score" value={opportunity.prioScore.toFixed(1)} icon={Target} color="bg-purple-500" subValue="Matemática de Valor" />
                <MetricCard label="Time to MVP" value={`${opportunity.velocity}/5`} icon={Zap} color="bg-amber-500" subValue="Velocidade de Saída" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contexto Estratégico */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-[#333] shadow-soft">
                        <div className="px-8 py-5 border-b border-slate-200 dark:border-[#333] flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <h3 className="text-[10px] font-black text-slate-500 dark:text-[#A1A1AA] uppercase tracking-[0.3em] flex items-center gap-3">
                                <FileText className="w-4 h-4 text-amber-500"/> Missão Estratégica
                            </h3>
                            {!isEditingDesc && (
                                <button onClick={() => setIsEditingDesc(true)} className="px-5 py-2 border border-slate-300 dark:border-[#333] text-slate-700 dark:text-white hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Refinar Texto
                                </button>
                            )}
                        </div>
                        <div className="p-10">
                            {isEditingDesc ? (
                                <div className="space-y-6">
                                    <textarea value={descText} onChange={(e) => setDescText(e.target.value)} className="w-full h-80 p-8 rounded-[2rem] text-lg leading-relaxed text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 outline-none border border-amber-500/30 resize-none shadow-inner font-medium" autoFocus />
                                    <div className="flex justify-end gap-4">
                                        <button onClick={() => setIsEditingDesc(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Descartar</button>
                                        <button onClick={handleSaveDescription} className="px-10 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Sincronizar Ativo</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line">
                                    {opportunity.description || "Iniciativa sem contexto estratégico mapeado."}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Metadados */}
                <div className="space-y-6">
                    <div className="glass-card p-8 rounded-[2.5rem] border border-slate-200 dark:border-[#333] space-y-8 shadow-soft">
                        <h3 className="text-[10px] font-black text-slate-500 dark:text-[#A1A1AA] uppercase tracking-[0.3em] flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500"/> Validação T.A.D.S.
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(opportunity.tads || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 dark:border-[#333] bg-slate-50/50 dark:bg-transparent group hover:border-amber-500/30 transition-all">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#A1A1AA]">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    {value ? <Check className="w-4 h-4 text-emerald-500 stroke-[4px]"/> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {financialHealth.margin < 30 && (
                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0"/>
                            <div>
                                <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">Alerta de Margem</h4>
                                <p className="text-[10px] text-amber-600/80 font-bold mt-1">O custo de execução ABC está próximo ou acima da receita projetada para este ativo. Revise o peso das atividades.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Added default export to resolve "Module has no default export" error in ProjectWorkspace.tsx
export default OpportunityDetail;
