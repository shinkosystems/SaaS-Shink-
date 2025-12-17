
import React, { useState } from 'react';
import { Opportunity, BpmnTask } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { Activity, Target, Zap, DollarSign, Calendar, Clock, Lock, ArrowLeft, MoreHorizontal, FileText, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
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
    // Description State
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descText, setDescText] = useState(opportunity.description || '');
    
    // Derived Stats
    const totalTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + node.checklist.length, 0) || 0;
    const completedTasks = opportunity.bpmn?.nodes?.reduce((acc, node) => acc + node.checklist.filter(t => t.status === 'done').length, 0) || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const handleSaveDescription = async () => {
        setIsEditingDesc(false);
        // Call parent update
        const updatedOpp = { ...opportunity, description: descText };
        onUpdate(updatedOpp);
    };

    const handleCancelDescription = () => {
        setDescText(opportunity.description || '');
        setIsEditingDesc(false);
    };

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                            <Target className="w-4 h-4"/>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">PRIO Score</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {opportunity.prioScore.toFixed(1)}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <Activity className="w-4 h-4"/>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Progresso</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {progress}%
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Zap className="w-4 h-4"/>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Velocidade</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {opportunity.velocity}/5
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                            <DollarSign className="w-4 h-4"/>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Receita</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {opportunity.revenue}/5
                    </div>
                </div>
            </div>

            {/* Description Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400"/> Descrição do Projeto
                    </h3>
                    {!isEditingDesc && (
                        <button 
                            onClick={() => setIsEditingDesc(true)} 
                            className="text-xs font-bold text-slate-500 hover:text-blue-500 flex items-center gap-1 transition-colors"
                        >
                            <Edit2 className="w-3 h-3"/> Editar Texto
                        </button>
                    )}
                </div>
                
                <div className="p-6">
                    {isEditingDesc ? (
                        <div className="space-y-4 animate-in fade-in">
                            <textarea 
                                value={descText}
                                onChange={(e) => setDescText(e.target.value)}
                                className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm leading-relaxed text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                                placeholder="Descreva os objetivos e escopo do projeto..."
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={handleCancelDescription}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveDescription}
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    <Check className="w-3 h-3"/> Salvar Descrição
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line ${isDescExpanded ? '' : 'line-clamp-3'}`}>
                                {opportunity.description || "Sem descrição definida."}
                            </p>
                            
                            {(opportunity.description && opportunity.description.length > 150) && (
                                <button 
                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    className="mt-3 text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                                >
                                    {isDescExpanded ? (
                                        <>Recolher <ChevronUp className="w-3 h-3"/></>
                                    ) : (
                                        <>Ler tudo <ChevronDown className="w-3 h-3"/></>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions / Shortcuts Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TADS Validation Summary */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 p-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Validação T.A.D.S.</h3>
                    <div className="space-y-3">
                        {Object.entries(opportunity.tads || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                {value ? (
                                    <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><Check className="w-3 h-3"/> Validado</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-slate-400 font-bold text-xs"><X className="w-3 h-3"/> Não</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Block */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 p-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Informações</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                            <span className="text-xs text-slate-500">Arquétipo</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{opportunity.archetype}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                            <span className="text-xs text-slate-500">Criado em</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {new Date(opportunity.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">ID do Sistema</span>
                            <span className="text-xs font-mono text-slate-400">{opportunity.id.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default OpportunityDetail;
