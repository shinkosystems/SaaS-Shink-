
import React, { useState, useEffect, useMemo } from 'react';
import { CrmOpportunity, CrmStage, CrmActivity } from '../types';
import { fetchCrmOpportunities, updateCrmOpportunityStage, saveCrmOpportunity, deleteCrmOpportunity, finalizeDeal, FinalizeDealPayload } from '../services/crmService';
import { Plus, Search, Filter, DollarSign, Calendar, User, Building2, Loader2, List, Phone, Mail, CheckSquare, Clock } from 'lucide-react';
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
    { id: 'won', label: 'Fechado (Ganho)', color: 'border-emerald-500' },
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

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Drag & Drop State
    const [draggedDeal, setDraggedDeal] = useState<CrmOpportunity | null>(null);

    useEffect(() => {
        loadData();
    }, [organizationId]);

    const loadData = async () => {
        if (!organizationId) return;
        setIsLoading(true);
        const data = await fetchCrmOpportunities(organizationId);
        setOpportunities(data);
        setIsLoading(false);
    };

    // --- Drag & Drop Logic ---
    const handleDragStart = (e: React.DragEvent, deal: CrmOpportunity) => {
        setDraggedDeal(deal);
        e.dataTransfer.setData('text/plain', deal.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStage: CrmStage) => {
        e.preventDefault();
        if (!draggedDeal) return;
        if (draggedDeal.stage === targetStage) return;

        // If dropped in WON, open the modal instead of immediate update
        if (targetStage === 'won') {
            setDealToWin({ ...draggedDeal, stage: 'won' }); // Stage updated tentatively for modal context
            setDraggedDeal(null);
            return;
        }

        // Optimistic UI Update
        const updatedDeal = { ...draggedDeal, stage: targetStage };
        setOpportunities(prev => prev.map(o => o.id === draggedDeal.id ? updatedDeal : o));
        
        // API Update
        await updateCrmOpportunityStage(draggedDeal.id, targetStage);
        setDraggedDeal(null);
    };

    const handleStageChange = async (id: string, newStage: CrmStage) => {
        // Find deal to check if it's WON
        const deal = opportunities.find(o => o.id === id);
        
        if (newStage === 'won' && deal) {
            setDealToWin({ ...deal, stage: 'won' });
            return;
        }

        setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage: newStage } : o));
        await updateCrmOpportunityStage(id, newStage);
    };

    const handleCreateDeal = () => {
        if (!organizationId) {
            alert("Erro: Organização não identificada.");
            return;
        }
        const newDeal: CrmOpportunity = {
            id: 'temp', 
            organizationId: organizationId,
            title: 'Nova Oportunidade',
            value: 0,
            probability: 10,
            stage: 'qualification',
            expectedCloseDate: new Date().toISOString().split('T')[0],
            owner: 'Eu',
            createdAt: new Date().toISOString(),
            lastInteraction: new Date().toISOString(),
            contact: { name: '', role: '', email: '', phone: '' },
            company: { name: '' },
            activities: []
        };
        setSelectedDeal(newDeal);
    };

    const handleSaveDeal = async (deal: CrmOpportunity) => {
        try {
            const saved = await saveCrmOpportunity(deal);
            if (deal.id === 'temp') {
                setOpportunities(prev => [saved, ...prev]);
            } else {
                setOpportunities(prev => prev.map(o => o.id === saved.id ? saved : o));
            }
        } catch (e: any) {
            alert('Erro ao salvar oportunidade: ' + e.message);
        }
    };

    const handleConfirmWin = async (payload: FinalizeDealPayload) => {
        if (!organizationId) return;
        try {
            const result = await finalizeDeal(payload, organizationId);
            if (result.success) {
                setOpportunities(prev => prev.map(o => o.id === payload.opportunityId ? { ...o, stage: 'won' } : o));
                alert("Negócio fechado e Cliente criado com sucesso!");
                setDealToWin(null);
            }
        } catch (e: any) {
            alert('Erro ao finalizar negócio: ' + e.message);
        }
    };

    const handleDeleteDeal = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta oportunidade?')) {
            await deleteCrmOpportunity(id);
            setOpportunities(prev => prev.filter(o => o.id !== id));
            setSelectedDeal(null);
        }
    };

    const handleEditEntity = (opp: CrmOpportunity, type: 'contact' | 'company') => {
        setEditingEntity({ entity: opp, type });
    };

    // Filter Logic
    const filteredOpps = opportunities.filter(o => {
        const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              o.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              o.contact.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesDate = true;
        if (startDate && o.expectedCloseDate < startDate) matchesDate = false;
        if (endDate && o.expectedCloseDate > endDate) matchesDate = false;

        return matchesSearch && matchesDate;
    });

    const totalPipelineValue = filteredOpps.reduce((acc, o) => acc + o.value, 0);

    // Derivar Dados para outras Views
    const contacts = useMemo(() => {
        const map = new Map();
        filteredOpps.forEach(o => {
            const key = o.contact.email || o.contact.name;
            if (key && !map.has(key)) {
                map.set(key, { ...o.contact, deals: [o.title], _opp: o });
            } else if (key) {
                map.get(key).deals.push(o.title);
            }
        });
        return Array.from(map.values());
    }, [filteredOpps]);

    const companies = useMemo(() => {
        const map = new Map();
        filteredOpps.forEach(o => {
            const key = o.company.name;
            if (key && !map.has(key)) {
                map.set(key, { ...o.company, totalValue: o.value, dealsCount: 1, _opp: o });
            } else if (key) {
                const entry = map.get(key);
                entry.totalValue += o.value;
                entry.dealsCount += 1;
            }
        });
        return Array.from(map.values());
    }, [filteredOpps]);

    const allActivities = useMemo(() => {
        const acts: (CrmActivity & { dealTitle: string })[] = [];
        filteredOpps.forEach(o => {
            if (o.activities) {
                o.activities.forEach(a => acts.push({ ...a, dealTitle: o.title }));
            }
        });
        return acts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredOpps]);

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            {/* Header with Navigation */}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <DollarSign className="w-8 h-8 text-emerald-500"/> CRM & Vendas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            Pipeline Total: <span className="text-emerald-500 font-bold">R$ {totalPipelineValue.toLocaleString()}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setView('pipeline')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'pipeline' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Pipeline</button>
                            <button onClick={() => setView('contacts')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'contacts' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Contatos</button>
                            <button onClick={() => setView('companies')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'companies' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Empresas</button>
                            <button onClick={() => setView('activities')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'activities' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Atividades</button>
                        </div>
                        <button 
                            onClick={handleCreateDeal}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4"/> Novo Negócio
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar oportunidades, empresas ou pessoas..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <Calendar className="w-4 h-4 text-slate-400"/>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none w-24"
                            />
                            <span className="text-slate-400">-</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none w-24"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-slate-400 hover:text-red-500">Limpar</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Views Content */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* PIPELINE VIEW */}
                {view === 'pipeline' && (
                    <div className="h-full overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-4 h-full min-w-[1200px]">
                            {STAGES.map(stage => {
                                const items = filteredOpps.filter(o => o.stage === stage.id);
                                const stageValue = items.reduce((acc, o) => acc + o.value, 0);

                                return (
                                    <div 
                                        key={stage.id}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, stage.id)} 
                                        className={`flex-1 min-w-[280px] flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 h-full ${draggedDeal ? 'border-dashed border-slate-400/50' : ''}`}
                                    >
                                        <div className={`p-4 border-t-4 ${stage.color} bg-white dark:bg-slate-800 rounded-t-xl shadow-sm mb-1`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">{stage.label}</h3>
                                                <span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold text-slate-500">{items.length}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono">
                                                R$ {stageValue.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                                            {isLoading ? (
                                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400"/></div>
                                            ) : (
                                                items.map(opp => (
                                                    <div 
                                                        key={opp.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, opp)}
                                                        onClick={() => setSelectedDeal(opp)}
                                                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg cursor-grab active:cursor-grabbing transition-all hover:-translate-y-1 group relative"
                                                    >
                                                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 leading-tight">{opp.title}</h4>
                                                        
                                                        <div className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="w-3 h-3"/> {opp.company.name || 'Sem Empresa'}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-3 h-3"/> {opp.contact.name || 'Sem Contato'}
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                                                            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                                                R$ {opp.value.toLocaleString()}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                                                                {opp.probability}% Prob.
                                                            </div>
                                                        </div>

                                                        {/* Quick Stage Move (Hover) */}
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="bg-slate-900 text-white rounded-lg shadow-xl p-1 flex gap-1">
                                                                {STAGES.map(s => (
                                                                    <button 
                                                                        key={s.id}
                                                                        onClick={(e) => { e.stopPropagation(); handleStageChange(opp.id, s.id); }}
                                                                        className={`w-2 h-6 rounded-sm hover:scale-125 transition-transform ${s.color.replace('border-', 'bg-')}`}
                                                                        title={`Mover para ${s.label}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* CONTACTS VIEW */}
                {view === 'contacts' && (
                    <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 font-medium">Nome</th>
                                    <th className="p-4 font-medium">Cargo</th>
                                    <th className="p-4 font-medium">Email</th>
                                    <th className="p-4 font-medium">Telefone</th>
                                    <th className="p-4 font-medium">Oportunidades</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {contacts.map((c, i) => (
                                    <tr 
                                        key={i} 
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                        onClick={() => handleEditEntity(c._opp, 'contact')}
                                    >
                                        <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">{c.name.charAt(0)}</div>
                                            {c.name}
                                        </td>
                                        <td className="p-4 text-slate-500">{c.role}</td>
                                        <td className="p-4 text-slate-500">{c.email}</td>
                                        <td className="p-4 text-slate-500">{c.phone}</td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            {c.deals.join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* COMPANIES VIEW */}
                {view === 'companies' && (
                    <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 font-medium">Empresa</th>
                                    <th className="p-4 font-medium">CNPJ</th>
                                    <th className="p-4 font-medium">Setor</th>
                                    <th className="p-4 font-medium">Endereço</th>
                                    <th className="p-4 font-medium text-right">Valor em Pipeline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {companies.map((c, i) => (
                                    <tr 
                                        key={i} 
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                        onClick={() => handleEditEntity(c._opp, 'company')}
                                    >
                                        <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500"><Building2 className="w-4 h-4"/></div>
                                            {c.name}
                                        </td>
                                        <td className="p-4 text-slate-500">{c.cnpj}</td>
                                        <td className="p-4 text-slate-500"><span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-xs">{c.sector}</span></td>
                                        <td className="p-4 text-slate-500 max-w-[200px] truncate">{c.address}</td>
                                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            R$ {c.totalValue.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({c.dealsCount} deals)</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ACTIVITIES VIEW */}
                {view === 'activities' && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                            {allActivities.map((act, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-4 shadow-sm hover:border-emerald-500/30 transition-colors">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {act.type === 'call' && <Phone className="w-5 h-5"/>}
                                        {act.type === 'email' && <Mail className="w-5 h-5"/>}
                                        {act.type === 'task' && <CheckSquare className="w-5 h-5"/>}
                                        {act.type === 'meeting' && <Calendar className="w-5 h-5"/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-bold text-sm ${act.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>{act.subject}</h4>
                                            <span className="text-xs text-slate-400 font-mono">{new Date(act.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{act.dealTitle}</span>
                                            <span>•</span>
                                            <span>{act.owner}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {allActivities.length === 0 && (
                                <div className="text-center py-12 text-slate-500">Nenhuma atividade registrada.</div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {selectedDeal && (
                <CrmDealModal 
                    opportunity={selectedDeal} 
                    onClose={() => setSelectedDeal(null)} 
                    onSave={handleSaveDeal}
                    onDelete={handleDeleteDeal}
                />
            )}

            {editingEntity && (
                <CrmEntityModal 
                    entity={editingEntity.entity}
                    type={editingEntity.type}
                    onClose={() => setEditingEntity(null)}
                    onSave={handleSaveDeal}
                />
            )}

            {dealToWin && (
                <CrmWonModal 
                    opportunity={dealToWin}
                    onClose={() => setDealToWin(null)}
                    onConfirm={handleConfirmWin}
                />
            )}
        </div>
    );
};
