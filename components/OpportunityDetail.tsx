
import React, { useState } from 'react';
import { Opportunity, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Activity, Target, Zap, DollarSign, Calendar, Clock, Lock, 
    ArrowLeft, MoreHorizontal, FileText, Edit2, Check, X, 
    ChevronDown, ChevronUp, Layers, Rocket, ShieldCheck, TrendingUp, Trash2
} from 'lucide-react';
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
    opportunity, onClose, onDelete, onUpdate, userRole
}) => {
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descText, setDescText] = useState(opportunity.description || '');
    
    const totalTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + node.checklist.length, 0) || 0;
    const completedTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + node.checklist.filter(t => t.status === 'done').length, 0) || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const handleSaveDescription = async () => {
        setIsEditingDesc(false);
        const updatedOpp = { ...opportunity, description: descText };
        onUpdate(updatedOpp);
    };

    const handleDelete = () => {
        if (confirm("Tem certeza que deseja excluir este ativo permanentemente?")) {
            onDelete(opportunity.id);
        }
    };

    const MetricCard = ({ label, value, icon: Icon, color, subValue }: any) => (
        <div className="glass-card p-5 lg:p-8 flex flex-col justify-between h-32 lg:h-44 group hover:border-amber-500/20 transition-all">
            <div className="flex justify-between items-start">
                <div className={`p-2 lg:p-4 rounded-lg lg:rounded-[1.2rem] ${color} bg-opacity-10 text-white border border-white/5 shadow-sm`}>
                    <Icon className={`w-3.5 h-3.5 lg:w-5 lg:h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
                <div className="text-[7px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
            </div>
            <div>
                <div className="text-2xl lg:text-4xl font-black text-[var(--text-main)] leading-none tracking-tighter">{value}</div>
                {subValue && <div className="text-[7px] lg:text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{subValue}</div>}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-12 space-y-6 lg:space-y-12 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Contexto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6 pb-6 lg:pb-8 border-b border-[var(--border-color)]">
                <div className="space-y-2 lg:space-y-4 w-full">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span className="shrink-0 px-2.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[7px] lg:text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                            {opportunity.archetype}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="shrink-0 text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Calendar className="w-3 h-3"/> {new Date(opportunity.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="text-2xl lg:text-5xl font-black text-[var(--text-main)] tracking-tighter leading-tight">{opportunity.title}</h1>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex items-center gap-3 p-3 lg:p-4 glass-panel rounded-xl lg:rounded-3xl border-[var(--border-color)]">
                         <TrendingUp className="w-4 h-4 text-emerald-500"/>
                         <div>
                             <div className="text-[7px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Saúde Técnica</div>
                             <div className="text-[11px] lg:text-sm font-bold text-[var(--text-main)] whitespace-nowrap">Alta Performance</div>
                         </div>
                    </div>
                    {userRole !== 'cliente' && (
                        <button 
                            onClick={handleDelete}
                            className="p-3 lg:p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl lg:rounded-[1.5rem] transition-all border border-red-500/20 shadow-lg active:scale-90"
                        >
                            <Trash2 className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>

            {/* Grid de Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                <MetricCard label="PRIO-6 Score" value={opportunity.prioScore.toFixed(1)} icon={Target} color="bg-purple-500" subValue="Matemática" />
                <MetricCard label="Progresso" value={`${progress}%`} icon={Activity} color="bg-blue-500" subValue={`${completedTasks}/${totalTasks}`} />
                <MetricCard label="Velocidade" value={`${opportunity.velocity}/5`} icon={Zap} color="bg-amber-500" subValue="Time to MVP" />
                <MetricCard label="Receita" value={`${opportunity.revenue}/5`} icon={DollarSign} color="bg-emerald-500" subValue="Comercial" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                {/* Contexto Estratégico */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel rounded-2xl lg:rounded-[3rem] overflow-hidden border border-[var(--border-color)]">
                        <div className="px-6 lg:px-8 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-black/5 dark:bg-white/5">
                            <h3 className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500"/> Contexto Estratégico
                            </h3>
                            {!isEditingDesc && (
                                <button onClick={() => setIsEditingDesc(true)} className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-all flex items-center gap-1">
                                    <Edit2 className="w-3 h-3"/> <span className="hidden sm:inline">Editar</span>
                                </button>
                            )}
                        </div>
                        <div className="p-6 lg:p-10">
                            {isEditingDesc ? (
                                <div className="space-y-6">
                                    <textarea value={descText} onChange={(e) => setDescText(e.target.value)} className="w-full h-60 lg:h-80 p-5 rounded-xl text-base leading-relaxed text-[var(--text-main)] bg-[var(--input-bg)] outline-none border border-amber-500/30 resize-none shadow-inner" autoFocus />
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Descartar</button>
                                        <button onClick={handleSaveDescription} className="px-6 py-3 bg-amber-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-amber">Sincronizar</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-base lg:text-xl text-[var(--text-main)] opacity-80 leading-relaxed font-medium whitespace-pre-line">{opportunity.description || "Iniciativa sem contexto estratégico mapeado."}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Metadados */}
                <div className="space-y-6 lg:space-y-8">
                    <div className="glass-card p-6 lg:p-10 group border-[var(--border-color)]">
                        <h3 className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 lg:mb-10 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500"/> Crivo T.A.D.S.
                        </h3>
                        <div className="space-y-2 lg:space-y-4">
                            {Object.entries(opportunity.tads || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-3 lg:p-5 rounded-xl lg:rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-transparent transition-all">
                                    <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-widest text-slate-500">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    {value ? (
                                        <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[8px] lg:text-[9px] uppercase tracking-widest">
                                            <Check className="w-3 h-3 stroke-[4px]"/> <span className="hidden sm:inline">Validado</span>
                                        </div>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-lg font-black text-[8px] uppercase tracking-widest border border-[var(--border-color)]">Pendente</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 lg:p-10 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 lg:mb-8">Governança</h3>
                        <div className="space-y-3 lg:space-y-6">
                            {[
                                { label: 'Arquétipo', val: opportunity.archetype, icon: Rocket },
                                { label: 'Intensidade', val: `L${opportunity.intensity}`, icon: Zap },
                                { label: 'ID', val: opportunity.id.substring(0, 8), mono: true, icon: Lock }
                            ].map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                                    <span className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <i.icon className="w-3 h-3"/> {i.label}
                                    </span>
                                    <span className={`text-[9px] lg:text-xs font-black text-[var(--text-main)] ${i.mono ? 'font-mono opacity-50' : ''}`}>{i.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpportunityDetail;
