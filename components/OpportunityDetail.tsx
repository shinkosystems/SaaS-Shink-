
import React, { useState, useEffect, useMemo } from 'react';
import { Opportunity, Archetype, RDEStatus, TadsCriteria } from '../types';
import { 
    DollarSign, Zap, ChevronRight, Edit3, 
    CheckCircle2, Rocket, Clock, TrendingUp,
    Calendar, Calculator, Save, X, Activity, Target
} from 'lucide-react';
import { getOperationalRates } from '../services/financialService';

interface Props {
  opportunity: Opportunity;
  onUpdate: (opp: Opportunity) => void;
  onEdit: (opp: Opportunity) => void; 
  userRole?: string;
  isSharedMode?: boolean;
}

export const OpportunityDetail: React.FC<Props> = ({ 
    opportunity, onUpdate, isSharedMode 
}) => {
    const [rates, setRates] = useState<any>(null);
    const [editField, setEditField] = useState<string | null>(null);
    const [tempVal, setTempVal] = useState<any>(null);

    useEffect(() => {
        if (opportunity.organizationId) {
            getOperationalRates(opportunity.organizationId).then(setRates);
        }
    }, [opportunity.organizationId]);

    const financial = useMemo(() => {
        let totalHours = 0;
        opportunity.bpmn?.nodes?.forEach(node => {
            node.checklist?.forEach(task => {
                totalHours += Number(task.estimatedHours || 2);
            });
        });
        const accumulatedCost = totalHours * (rates?.totalRate || 85);
        const ltv = (Number(opportunity.mrr) || 0) * (Number(opportunity.meses) || 1);
        const margin = ltv > 0 ? ((ltv - accumulatedCost) / ltv) * 100 : 0;
        return { totalHours, accumulatedCost, ltv, margin };
    }, [opportunity, rates]);

    const handleInlineSave = (field: keyof Opportunity, val: any) => {
        const updated = { ...opportunity, [field]: val };
        
        // Recalcula o score PRIO-6 se mudar um dos pilares RDE
        if (['velocity', 'viability', 'revenue'].includes(field as string)) {
            updated.prioScore = ((Number(updated.velocity || 1) * 0.4) + 
                                (Number(updated.viability || 1) * 0.35) + 
                                (Number(updated.revenue || 1) * 0.25)) * 10;
        }
        
        onUpdate(updated);
        setEditField(null);
    };

    const InlineInput = ({ field, type = "text", prefix = "" }: any) => {
        const isEditing = editField === field;
        const value = isEditing ? tempVal : (opportunity as any)[field];

        if (isEditing) {
            return (
                <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                    <input 
                        autoFocus
                        type={type}
                        value={value}
                        onChange={e => setTempVal(type === 'number' ? Number(e.target.value) : e.target.value)}
                        onBlur={() => handleInlineSave(field, tempVal)}
                        onKeyDown={e => e.key === 'Enter' && handleInlineSave(field, tempVal)}
                        className="bg-white dark:bg-white/10 border-2 border-amber-500 rounded-lg px-2 py-1 text-sm font-black outline-none w-24 text-slate-900 dark:text-white shadow-lg"
                    />
                </div>
            );
        }

        return (
            <div 
                onClick={() => {!isSharedMode && (setEditField(field), setTempVal((opportunity as any)[field]))}}
                className="cursor-pointer hover:text-amber-500 transition-colors flex items-center gap-1 group"
            >
                <span className="font-black">{prefix}{type === 'number' && field === 'mrr' ? Number(value).toLocaleString('pt-BR') : value}</span>
                <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        );
    };

    return (
        <div className="max-w-xl mx-auto px-6 py-6 space-y-8 animate-in fade-in duration-500">
            
            {/* HERO CARD - DESIGN COMPACTO SEM SOBREPOSIÇÃO */}
            <div 
                className="w-full aspect-[1.8/1] rounded-[2.2rem] p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl border border-white/10"
                style={{ backgroundColor: opportunity.color || '#3B82F6' }}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-30"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <div className="space-y-1 max-w-[70%]">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/60">
                            <Rocket className="w-3 h-3"/> {opportunity.archetype}
                        </div>
                        {editField === 'title' ? (
                            <input 
                                autoFocus
                                value={tempVal}
                                onChange={e => setTempVal(e.target.value)}
                                onBlur={() => handleInlineSave('title', tempVal)}
                                onKeyDown={e => e.key === 'Enter' && handleInlineSave('title', tempVal)}
                                className="bg-transparent text-xl font-black text-white outline-none border-b border-white/40 w-full"
                            />
                        ) : (
                            <h1 
                                onClick={() => {!isSharedMode && (setEditField('title'), setTempVal(opportunity.title))}}
                                className="text-xl font-black text-white tracking-tighter leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {opportunity.title}
                            </h1>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50 mb-0.5">PRIO-6</div>
                        <div className="text-4xl font-black text-white tracking-tighter leading-none">
                            {opportunity.prioScore.toFixed(1)}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex justify-between items-end">
                    <div className="space-y-1">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">Mensalidade</div>
                        <div className="text-2xl font-black text-white leading-none">
                            <InlineInput field="mrr" type="number" prefix="R$ " />
                        </div>
                    </div>
                    <div className="w-10 h-6 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center backdrop-blur-md">
                        <div className="w-5 h-3 bg-white/30 rounded-sm"></div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO: BUSINESS CASE (GRID LIMPO) */}
            <div className="bg-white dark:bg-white/[0.02] p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                    <Calculator className="w-3 h-3" /> Matemática de Valor
                </h3>
                
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Vida Útil</span>
                        <div className="flex items-baseline gap-1 text-sm">
                            <InlineInput field="meses" type="number" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Meses</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">LTV Projetado</span>
                        <div className="text-sm font-black text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financial.ltv)}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Custo Engenharia</span>
                        <div className="text-sm font-black text-rose-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financial.accumulatedCost)}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ROI Operacional</span>
                        <div className={`text-sm font-black ${financial.margin > 30 ? 'text-emerald-500' : 'text-amber-500'}`}>{financial.margin.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO: MATRIZ RDE (DRAGGABLE SLIDERS) */}
            <div className="space-y-6">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] px-1">Sensibilidade RDE</h3>
                <div className="space-y-8 px-1">
                    {[
                        { key: 'velocity', label: 'Rapidez de Entrega', icon: Zap },
                        { key: 'viability', label: 'Viabilidade Técnica', icon: Target },
                        { key: 'revenue', label: 'Impacto Financeiro', icon: DollarSign }
                    ].map(item => (
                        <div key={item.key} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    <item.icon className="w-3 h-3 opacity-40"/>
                                    {item.label}
                                </div>
                                <div className="text-xs font-black text-amber-500">Ponto {(opportunity as any)[item.key]}</div>
                            </div>
                            <input 
                                type="range" min="1" max="5" step="1"
                                disabled={isSharedMode}
                                value={(opportunity as any)[item.key]}
                                onChange={e => handleInlineSave(item.key as any, parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* SEÇÃO: CRIVO T.A.D.S (TOGGLES COMPACTOS) */}
            <div className="space-y-3">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] px-1 mb-4">Crivo de Escala</h3>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { k: 'scalability', l: 'Escalabilidade' },
                        { k: 'integration', l: 'Integração Nativa' },
                        { k: 'painPoint', l: 'Resolução de Dor' },
                        { k: 'recurring', l: 'Recorrência Ativa' },
                        { k: 'mvpSpeed', l: 'Velocidade MVP' }
                    ].map(item => (
                        <button 
                            key={item.k}
                            onClick={() => !isSharedMode && handleInlineSave('tads' as any, { ...opportunity.tads, [item.k]: !opportunity.tads[item.k as keyof TadsCriteria] })}
                            className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${opportunity.tads[item.k as keyof TadsCriteria] ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-400 opacity-60'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.l}</span>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${opportunity.tads[item.k as keyof TadsCriteria] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${opportunity.tads[item.k as keyof TadsCriteria] ? 'left-4.5' : 'left-0.5'}`}></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* DESCRIÇÃO ESTRATÉGICA */}
            <div className="space-y-4 pt-4 pb-20">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] px-1">Missão Macro</h3>
                <div 
                    onClick={() => {!isSharedMode && setEditField('desc_modal')}}
                    className="p-8 rounded-[2rem] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-sm cursor-pointer hover:border-amber-500/20 transition-all shadow-inner"
                >
                    {opportunity.description || "Toque para definir o objetivo macro deste ativo..."}
                </div>
            </div>

            {/* MODAL DE CONTEXTO */}
            {editField === 'desc_modal' && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#0A0A0C] w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 shadow-2xl animate-ios-pop border border-white/10">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xl font-black tracking-tighter">Missão Estratégica</h4>
                            <button onClick={() => setEditField(null)} className="p-2 text-slate-400"><X className="w-5 h-5"/></button>
                        </div>
                        <textarea 
                            autoFocus
                            defaultValue={opportunity.description}
                            id="desc-area"
                            className="w-full h-64 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border-none outline-none text-sm font-medium resize-none leading-relaxed dark:text-white"
                            placeholder="Descreva o propósito..."
                        />
                        <button 
                            onClick={() => handleInlineSave('description', (document.getElementById('desc-area') as any).value)}
                            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            Sincronizar Missão
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OpportunityDetail;
