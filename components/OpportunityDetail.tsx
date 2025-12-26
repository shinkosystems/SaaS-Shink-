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

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Contexto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-8 border-b border-slate-200 dark:border-[#333]">
                <div className="space-y-2 w-full">
                    <div className="flex items-center gap-2">
                        <span className="shrink-0 px-2.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-amber-500/20">
                            {opportunity.archetype}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-widest flex items-center gap-2">
                             • {new Date(opportunity.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{opportunity.title}</h1>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex items-center gap-3 p-3 border border-slate-200 dark:border-[#333] rounded-2xl">
                         <TrendingUp className="w-4 h-4 text-emerald-500"/>
                         <div>
                             <div className="text-[8px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-widest">Saúde Técnica</div>
                             <div className="text-[11px] font-bold text-slate-900 dark:text-white">Alta Performance</div>
                         </div>
                    </div>
                    {userRole !== 'cliente' && (
                        <button onClick={handleDelete} className="p-3 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg active:scale-95">
                            <Trash2 className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>

            {/* Grid de Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="PRIO-6 Score" value={opportunity.prioScore.toFixed(1)} icon={Target} color="bg-purple-500" subValue="Matemática" />
                <MetricCard label="Progresso" value={`${progress}%`} icon={Activity} color="bg-blue-500" subValue={`${completedTasks}/${totalTasks}`} />
                <MetricCard label="Velocidade" value={`${opportunity.velocity}/5`} icon={Zap} color="bg-amber-500" subValue="Time to MVP" />
                <MetricCard label="Receita" value={`${opportunity.revenue}/5`} icon={DollarSign} color="bg-emerald-500" subValue="Comercial" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contexto Estratégico */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-[#333]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#333] flex justify-between items-center bg-slate-100/50 dark:bg-white/5">
                            <h3 className="text-[9px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500"/> Contexto Estratégico
                            </h3>
                            {!isEditingDesc && (
                                <button onClick={() => setIsEditingDesc(true)} className="px-3 py-1.5 border border-slate-300 dark:border-[#333] text-slate-700 dark:text-white hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all">
                                    Editar
                                </button>
                            )}
                        </div>
                        <div className="p-8">
                            {isEditingDesc ? (
                                <div className="space-y-6">
                                    <textarea value={descText} onChange={(e) => setDescText(e.target.value)} className="w-full h-80 p-5 rounded-xl text-base leading-relaxed text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 outline-none border border-amber-500/30 resize-none shadow-inner" autoFocus />
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#A1A1AA]">Descartar</button>
                                        <button onClick={handleSaveDescription} className="px-6 py-2 bg-amber-500 text-black rounded-lg font-bold text-[10px] uppercase tracking-widest">Sincronizar</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-base lg:text-lg text-slate-600 dark:text-[#A1A1AA] leading-relaxed font-medium whitespace-pre-line">{opportunity.description || "Iniciativa sem contexto estratégico mapeado."}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Metadados */}
                <div className="space-y-6">
                    <div className="glass-card p-8 rounded-2xl border border-slate-200 dark:border-[#333] space-y-6">
                        <h3 className="text-[10px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-200 dark:border-[#333] pb-4">
                            <ShieldCheck className="w-4 h-4 text-emerald-500"/> Crivo T.A.D.S.
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(opportunity.tads || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-[#333] group hover:border-slate-300 dark:hover:border-white/20 transition-all">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#A1A1AA]">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    {value ? <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[4px]"/> : <span className="text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase">OFF</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-2xl border border-slate-200 dark:border-[#333] bg-gradient-to-br from-amber-500/[0.02] to-transparent">
                        <h3 className="text-[10px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-[0.2em] mb-6">Governança</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Arquétipo', val: opportunity.archetype, icon: Rocket },
                                { label: 'Intensidade', val: `L${opportunity.intensity}`, icon: Zap },
                                { label: 'ID', val: opportunity.id.substring(0, 8), mono: true, icon: Lock }
                            ].map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-slate-100 dark:border-[#333] pb-3">
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-[#A1A1AA] uppercase tracking-widest flex items-center gap-2">
                                        <i.icon className="w-3.5 h-3.5"/> {i.label}
                                    </span>
                                    <span className={`text-[10px] font-bold text-slate-900 dark:text-white ${i.mono ? 'font-mono opacity-50' : ''}`}>{i.val}</span>
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