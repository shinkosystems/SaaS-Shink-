
import React, { useState } from 'react';
import { Opportunity, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { 
    Activity, Target, Zap, DollarSign, Calendar, Clock, Lock, 
    ArrowLeft, MoreHorizontal, FileText, Edit2, Check, X, 
    ChevronDown, ChevronUp, Layers, Rocket, ShieldCheck, TrendingUp
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
    opportunity, onClose, onEdit, onDelete, onUpdate, userRole, currentPlan, isSharedMode 
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

    const MetricCard = ({ label, value, icon: Icon, color, subValue }: any) => (
        <div className="glass-card p-8 flex flex-col justify-between h-44 group hover:border-amber-500/20 transition-all">
            <div className="flex justify-between items-start">
                <div className={`p-4 rounded-[1.2rem] ${color} bg-opacity-10 text-white border border-white/5 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</div>
            </div>
            <div>
                <div className="text-4xl font-black text-[var(--text-main)] leading-none tracking-tighter">{value}</div>
                {subValue && <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{subValue}</div>}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-8 md:p-12 space-y-12 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Contexto */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-[var(--border-color)]">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                            {opportunity.archetype}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Calendar className="w-3 h-3"/> {new Date(opportunity.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="text-5xl font-black text-[var(--text-main)] tracking-tighter leading-none">{opportunity.title}</h1>
                </div>
                <div className="flex items-center gap-4 p-4 glass-panel rounded-3xl border-[var(--border-color)]">
                     <TrendingUp className="w-5 h-5 text-emerald-500"/>
                     <div>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saúde Técnica</div>
                         <div className="text-sm font-bold text-[var(--text-main)]">Alta Performance</div>
                     </div>
                </div>
            </div>

            {/* Grid de Métricas Ativas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="PRIO-6 Score" value={opportunity.prioScore.toFixed(1)} icon={Target} color="bg-purple-500" subValue="Prioridade Matemática" />
                <MetricCard label="Progresso" value={`${progress}%`} icon={Activity} color="bg-blue-500" subValue={`${completedTasks}/${totalTasks} Tasks Concluídas`} />
                <MetricCard label="Velocidade" value={`${opportunity.velocity}/5`} icon={Zap} color="bg-amber-500" subValue="Time to MVP" />
                <MetricCard label="Receita" value={`${opportunity.revenue}/5`} icon={DollarSign} color="bg-emerald-500" subValue="Potencial Comercial" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Contexto Estratégico */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel rounded-[3rem] overflow-hidden border border-[var(--border-color)]">
                        <div className="px-8 py-6 border-b border-[var(--border-color)] flex justify-between items-center bg-black/5 dark:bg-white/5">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                <FileText className="w-4 h-4 text-amber-500"/> Contexto do Ativo
                            </h3>
                            {!isEditingDesc && (
                                <button onClick={() => setIsEditingDesc(true)} className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-all flex items-center gap-2">
                                    <Edit2 className="w-3 h-3"/> Editar Texto
                                </button>
                            )}
                        </div>
                        <div className="p-10">
                            {isEditingDesc ? (
                                <div className="space-y-6">
                                    <textarea value={descText} onChange={(e) => setDescText(e.target.value)} className="w-full h-80 p-8 glass-panel rounded-[2rem] text-lg leading-relaxed text-[var(--text-main)] bg-[var(--input-bg)] outline-none border-amber-500/30 resize-none shadow-inner" autoFocus />
                                    <div className="flex justify-end gap-4">
                                        <button onClick={() => setIsEditingDesc(false)} className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Descartar</button>
                                        <button onClick={handleSaveDescription} className="px-10 py-4 bg-amber-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-amber">Sincronizar Mudanças</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xl text-[var(--text-main)] opacity-80 leading-relaxed font-medium whitespace-pre-line drop-shadow-sm">{opportunity.description || "Iniciativa sem contexto estratégico mapeado."}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Metadados */}
                <div className="space-y-8">
                    <div className="glass-card p-10 group border-[var(--border-color)]">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500"/> Validação T.A.D.S.
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(opportunity.tads || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-5 rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-transparent group-hover:border-slate-200 dark:group-hover:border-white/5 transition-all">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    {value ? (
                                        <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                                            <Check className="w-3 h-3 stroke-[4px]"/> Validado
                                        </div>
                                    ) : (
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-full font-black text-[8px] uppercase tracking-widest border border-[var(--border-color)]">Pendente</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-10 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Informações de Governança</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Arquétipo', val: opportunity.archetype, icon: Rocket },
                                { label: 'Intensidade', val: `L${opportunity.intensity}`, icon: Zap },
                                { label: 'Operador ID', val: opportunity.id.substring(0, 8), mono: true, icon: Lock }
                            ].map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <i.icon className="w-3 h-3"/> {i.label}
                                    </span>
                                    <span className={`text-xs font-black text-[var(--text-main)] ${i.mono ? 'font-mono opacity-50' : ''}`}>{i.val}</span>
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
