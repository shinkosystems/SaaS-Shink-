
import React, { useState, useEffect, useMemo } from 'react';
import { CrmOpportunity, CrmStage, CrmActivity } from '../types';
import { fetchCrmOpportunities, updateCrmOpportunityStage, saveCrmOpportunity, deleteCrmOpportunity, finalizeDeal, FinalizeDealPayload } from '../services/crmService';
import { Plus, Search, DollarSign, Calendar, User, Building2, Loader2, List, Phone, Mail, CheckSquare } from 'lucide-react';
import { CrmDealModal } from './CrmDealModal';
import { CrmEntityModal } from './CrmEntityModal';
import { CrmWonModal } from './CrmWonModal';

interface Props {
    organizationId?: number;
}

const STAGES: { id: CrmStage, label: string, color: string }[] = [
    { id: 'qualification', label: 'Qualificação', color: 'border-blue-500' },
    { id: 'proposal', label: 'Proposta', color: 'border-yellow-500' },
    { id: 'negotiation', label: 'Negociação', color: 'border-orange-500' },
    { id: 'won', label: 'Fechado', color: 'border-emerald-500' },
    { id: 'lost', label: 'Perdido', color: 'border-red-500' }
];

type CrmView = 'pipeline' | 'contacts' | 'companies' | 'activities';

export const CrmBoard: React.FC<Props> = ({ organizationId }) => {
    const [view, setView] = useState<CrmView>('pipeline');
    const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [selectedDeal, setSelectedDeal] = useState<CrmOpportunity | null>(null);
    const [editingEntity, setEditingEntity] = useState<{ entity: CrmOpportunity, type: 'contact' | 'company' } | null>(null);
    const [dealToWin, setDealToWin] = useState<CrmOpportunity | null>(null);
    const [draggedDeal, setDraggedDeal] = useState<CrmOpportunity | null>(null);

    useEffect(() => { loadData(); }, [organizationId]);

    const loadData = async () => {
        if (!organizationId) return;
        setIsLoading(true);
        const data = await fetchCrmOpportunities(organizationId);
        setOpportunities(data);
        setIsLoading(false);
    };

    const handleDrop = async (e: React.DragEvent, targetStage: CrmStage) => {
        e.preventDefault();
        if (!draggedDeal || draggedDeal.stage === targetStage) return;
        if (targetStage === 'won') {
            setDealToWin({ ...draggedDeal, stage: 'won' });
            setDraggedDeal(null);
            return;
        }
        const updatedDeal = { ...draggedDeal, stage: targetStage };
        setOpportunities(prev => prev.map(o => o.id === draggedDeal.id ? updatedDeal : o));
        await updateCrmOpportunityStage(draggedDeal.id, targetStage);
        setDraggedDeal(null);
    };

    const handleCreateDeal = () => {
        if (!organizationId) return alert("Erro de organização");
        setSelectedDeal({
            id: 'temp', organizationId, title: 'Nova Oportunidade', value: 0, probability: 10, stage: 'qualification',
            expectedCloseDate: new Date().toISOString().split('T')[0], owner: 'Eu', createdAt: new Date().toISOString(), lastInteraction: new Date().toISOString(),
            contact: { name: '', role: '', email: '', phone: '' }, company: { name: '' }, activities: []
        });
    };

    const filteredOpps = opportunities.filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPipeline = filteredOpps.reduce((acc, o) => acc + o.value, 0);

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CRM & Vendas</h1>
                        <p className="text-slate-500 text-sm mt-1">Pipeline Total: <span className="font-bold text-emerald-500">R$ {totalPipeline.toLocaleString()}</span></p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                            <button onClick={() => setView('pipeline')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${view === 'pipeline' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Pipeline</button>
                            <button onClick={() => setView('contacts')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${view === 'contacts' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Contatos</button>
                        </div>
                        <button onClick={handleCreateDeal} className="bg-emerald-600 text-white hover:opacity-90 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg">
                            <Plus className="w-3 h-3"/> Novo Negócio
                        </button>
                    </div>
                </div>
            </div>

            {/* Pipeline */}
            {view === 'pipeline' && (
                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                    <div className="flex gap-4 h-full min-w-[1200px]">
                        {STAGES.map(stage => {
                            const items = filteredOpps.filter(o => o.stage === stage.id);
                            const val = items.reduce((acc, o) => acc + o.value, 0);
                            return (
                                <div key={stage.id} onDragOver={e => {e.preventDefault(); e.dataTransfer.dropEffect = 'move';}} onDrop={(e) => handleDrop(e, stage.id)} className="flex-1 min-w-[260px] flex flex-col h-full bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className={`p-4 border-t-4 ${stage.color} bg-white dark:bg-white/5 rounded-t-xl mb-1`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">{stage.label}</h3>
                                            <span className="text-xs bg-slate-100 dark:bg-black/20 px-2 rounded-full font-bold text-slate-500">{items.length}</span>
                                        </div>
                                        <div className="text-xs font-mono text-slate-500">R$ {val.toLocaleString()}</div>
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                                        {items.map(opp => (
                                            <div key={opp.id} draggable onDragStart={(e) => {setDraggedDeal(opp); e.dataTransfer.setData('text/plain', opp.id);}} onClick={() => setSelectedDeal(opp)} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group hover:-translate-y-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white mb-2 leading-tight text-sm">{opp.title}</h4>
                                                <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                                                    <div className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {opp.company.name || 'Empresa'}</div>
                                                    <div className="flex items-center gap-1"><User className="w-3 h-3"/> {opp.contact.name || 'Contato'}</div>
                                                </div>
                                                <div className="mt-3 pt-2 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">R$ {opp.value.toLocaleString()}</span>
                                                    <span className="text-[9px] text-slate-400">{opp.probability}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Other views placeholder */}
            {view !== 'pipeline' && (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Visualização em lista simplificada em breve.</div>
            )}

            {selectedDeal && (
                <CrmDealModal 
                    opportunity={selectedDeal} 
                    onClose={() => setSelectedDeal(null)} 
                    onSave={async (deal) => { await saveCrmOpportunity(deal); loadData(); }} 
                    onDelete={async (id) => { await deleteCrmOpportunity(id); loadData(); setSelectedDeal(null); }}
                />
            )}
            
            {dealToWin && (
                <CrmWonModal opportunity={dealToWin} onClose={() => setDealToWin(null)} onConfirm={async (payload) => {
                    const res = await finalizeDeal(payload, organizationId!);
                    if(res.success) { loadData(); setDealToWin(null); }
                }}/>
            )}
        </div>
    );
};
