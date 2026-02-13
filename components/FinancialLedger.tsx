
import React, { useState, useMemo, useEffect } from 'react';
import { FinancialTransaction } from '../types';
import { Plus, Trash2, ChevronLeft, ChevronRight, Search, RefreshCw, Edit, FileText, Save, ArrowUpRight, ArrowDownRight, X, DollarSign, Calendar, Tag, Repeat, Filter, CreditCard, Cpu, ArrowRight, Hash } from 'lucide-react';
import { ElasticSwitch } from './ElasticSwitch';

interface Props {
    transactions: FinancialTransaction[];
    onAddTransaction: (t: Omit<FinancialTransaction, 'id'>) => void;
    onEditTransaction: (t: FinancialTransaction) => void;
    onDeleteTransaction: (id: string) => void;
    onSyncContracts: () => void;
    isSyncing?: boolean;
}

const SHINKO_CATEGORIES = [
    "Adm", "Financeiro", "Gestão", "Tecnológico", "RH", 
    "Modelagem", "Interface", "Lógica", "Marketing", "Suporte"
];

type ListPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export const FinancialLedger: React.FC<Props> = ({ transactions, onAddTransaction, onEditTransaction, onDeleteTransaction, onSyncContracts, isSyncing }) => {
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [listPeriod, setListPeriod] = useState<ListPeriod>('month');
    const [viewDate, setViewDate] = useState(new Date());
    
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

    const [newTrans, setNewTrans] = useState<Partial<FinancialTransaction>>({
        type: 'outflow',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category: 'Financeiro',
        isRecurring: false,
        periodicity: 'monthly',
        installments: 12,
        metadata: {}
    });

    useEffect(() => {
        setExpandedCardId(null);
        setFlippedCardId(null);
    }, [viewDate, listPeriod, searchTerm, filterType]);

    const handleOpenEdit = (t: FinancialTransaction) => {
        setNewTrans({ ...t });
        setShowModal(true);
    };

    const handleCreateClick = () => {
        setNewTrans({
            type: 'outflow',
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: '',
            category: 'Financeiro',
            isRecurring: false,
            periodicity: 'monthly',
            installments: 12,
            id: undefined,
            metadata: {}
        });
        setShowModal(true);
    };

    const handleSave = () => {
        if (!newTrans.description || !newTrans.amount) {
            alert("Preencha descrição e valor.");
            return;
        }
        
        if (newTrans.id) {
            onEditTransaction(newTrans as FinancialTransaction);
        } else {
            onAddTransaction({
                date: newTrans.date!,
                description: newTrans.description,
                amount: Number(newTrans.amount),
                type: newTrans.type as 'inflow' | 'outflow',
                category: newTrans.category || 'Geral',
                organizationId: newTrans.organizationId || 0,
                isRecurring: newTrans.isRecurring,
                periodicity: newTrans.periodicity,
                installments: newTrans.isRecurring ? Number(newTrans.installments) : 1,
                metadata: newTrans.metadata || {}
            });
        }
        setShowModal(false);
    };

    const filtered = useMemo(() => {
        let startRange = new Date(viewDate);
        let endRange = new Date(viewDate);

        if (listPeriod === 'day') {
            startRange.setHours(0,0,0,0);
            endRange.setHours(23,59,59,999);
        } else if (listPeriod === 'week') {
            const day = startRange.getDay();
            startRange.setDate(startRange.getDate() - day);
            endRange.setDate(startRange.getDate() + 6);
        } else if (listPeriod === 'month') {
            startRange.setDate(1);
            startRange.setHours(0,0,0,0);
            endRange = new Date(startRange.getFullYear(), startRange.getMonth() + 1, 0);
            endRange.setHours(23,59,59,999);
        } else if (listPeriod === 'quarter') {
            const q = Math.floor(startRange.getMonth() / 3);
            startRange = new Date(startRange.getFullYear(), q * 3, 1);
            endRange = new Date(startRange.getFullYear(), (q + 1) * 3, 0);
        } else if (listPeriod === 'year') {
            startRange = new Date(startRange.getFullYear(), 0, 1);
            endRange = new Date(startRange.getFullYear(), 11, 31);
        }

        return transactions.filter(t => {
            const tDate = new Date(t.date);
            const dateMatch = listPeriod === 'all' ? true : (tDate >= startRange && tDate <= endRange);
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || t.type === filterType;
            return matchesSearch && matchesType && dateMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, listPeriod, viewDate, searchTerm, filterType]);

    const handleNavigate = (dir: 'next' | 'prev') => {
        const mod = dir === 'next' ? 1 : -1;
        const newDate = new Date(viewDate);
        if (listPeriod === 'day') newDate.setDate(newDate.getDate() + mod);
        else if (listPeriod === 'week') newDate.setDate(newDate.getDate() + (mod * 7));
        else if (listPeriod === 'month') newDate.setMonth(newDate.getMonth() + mod);
        else if (listPeriod === 'quarter') newDate.setMonth(newDate.getMonth() + (mod * 3));
        else if (listPeriod === 'year') newDate.setFullYear(newDate.getFullYear() + mod);
        setViewDate(newDate);
    };

    const CARD_HEADER_OFFSET = 85;
    const EXPANDED_HEIGHT = 460;
    const BASE_HEIGHT = 180;

    const containerHeight = useMemo(() => {
        if (filtered.length === 0) return 400;
        const currentExpandedIdx = filtered.findIndex(t => t.id === expandedCardId);
        const baseStackHeight = (filtered.length - 1) * CARD_HEADER_OFFSET + BASE_HEIGHT + 150;
        return currentExpandedIdx !== -1 ? baseStackHeight + (EXPANDED_HEIGHT - BASE_HEIGHT) : baseStackHeight;
    }, [filtered.length, expandedCardId, filtered]);

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-500 pb-40" onClick={() => { setExpandedCardId(null); setFlippedCardId(null); }}>
            
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-center mb-12" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 md:min-w-[320px]">
                        <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar lançamento..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1 shadow-sm">
                        <button onClick={() => handleNavigate('prev')} className="p-2.5 hover:bg-black/5 rounded-xl transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-[10px] font-black tracking-widest px-4 uppercase text-slate-600 dark:text-slate-300">
                            {listPeriod === 'all' ? 'HISTÓRICO' : listPeriod === 'year' ? viewDate.getFullYear() : listPeriod === 'month' ? viewDate.toLocaleDateString('pt-BR', {month:'short', year:'numeric'}) : 'FILTRO'}
                        </span>
                        <button onClick={() => handleNavigate('next')} className="p-2.5 hover:bg-black/5 rounded-xl transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-center">
                    <button onClick={onSyncContracts} className="p-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:scale-105 transition-all text-slate-400">
                        <RefreshCw className={`w-4.5 h-4.5 ${isSyncing ? 'animate-spin' : ''}`}/>
                    </button>
                    <button 
                        onClick={handleCreateClick} 
                        className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <Plus className="w-4.5 h-4.5"/> Novo Registro
                    </button>
                </div>
            </div>

            <div 
                key={`${viewDate.toISOString()}-${filtered.length}`}
                className="relative transition-all duration-700 ease-in-out" 
                style={{ minHeight: `${containerHeight}px`, perspective: '2000px' }}
            >
                {filtered.map((t, idx) => {
                    const isExpanded = expandedCardId === t.id;
                    const isFlipped = flippedCardId === t.id;
                    const isOutflow = t.type === 'outflow';
                    const expandedIdx = filtered.findIndex(item => item.id === expandedCardId);
                    
                    let translateY = idx * CARD_HEADER_OFFSET;
                    if (expandedIdx !== -1 && idx > expandedIdx) {
                        translateY += (EXPANDED_HEIGHT - CARD_HEADER_OFFSET - 20);
                    }

                    return (
                        <div 
                            key={t.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isExpanded) {
                                    setFlippedCardId(isFlipped ? null : t.id);
                                } else {
                                    setExpandedCardId(t.id);
                                    setFlippedCardId(null);
                                }
                            }}
                            className={`
                                w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer absolute top-0 left-0
                                ${isExpanded ? 'scale-[1.02]' : 'hover:-translate-y-2'}
                            `}
                            style={{
                                transform: `translateY(${translateY}px)`,
                                zIndex: isExpanded ? 100 : idx + 10,
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            <div 
                                className={`relative w-full transition-transform duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFlipped ? 'rotate-y-180' : ''}`}
                                style={{ transformStyle: 'preserve-3d', height: isExpanded ? `${EXPANDED_HEIGHT}px` : `${BASE_HEIGHT}px` }}
                            >
                                <div 
                                    className={`absolute inset-0 w-full rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 transition-all duration-500 backface-hidden bg-white dark:bg-[#1a1a1e]`}
                                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
                                >
                                    <div className={`p-8 pb-7 flex justify-between items-start transition-colors duration-500 rounded-t-[2.5rem] ${isOutflow ? 'bg-rose-50/70 dark:bg-rose-500/10' : 'bg-emerald-50/70 dark:bg-emerald-500/10'} border-b border-slate-100 dark:border-white/5`}>
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                <Calendar className="w-3 h-3"/> {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white truncate pr-4">{t.description}</h3>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shrink-0 transition-all ${isOutflow ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                            {t.category}
                                        </div>
                                    </div>

                                    <div className="p-8 pt-7 flex-1 flex flex-col justify-end">
                                        <div className="flex justify-between items-end relative">
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-slate-400">Volume Consolidado</div>
                                                <div className={`text-5xl font-black ${isOutflow ? 'text-rose-500' : 'text-emerald-500'} tracking-tighter leading-none`}>
                                                    <span className="text-sm font-bold mr-1.5 opacity-50">R$</span>
                                                    {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-slate-400">Status Flow</div>
                                                <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest ${isOutflow ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {isOutflow ? <ArrowDownRight className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
                                                    {isOutflow ? 'Débito' : 'Crédito'}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && !isFlipped && (
                                            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-center items-center animate-pulse shrink-0">
                                                <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400">Toque para Auditoria Técnica</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div 
                                    className={`absolute inset-0 w-full rounded-[2.5rem] shadow-2xl p-10 flex flex-col rotate-y-180 backface-hidden border border-white/20 bg-[#0a0a0b]`}
                                    style={{ transform: 'rotateY(180deg) translateZ(1px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                >
                                    <div className="flex justify-between items-center mb-10 relative z-20">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-500/10 rounded-xl">
                                                <Cpu className="w-6 h-6 text-amber-500"/>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block">Ledger Industrial</span>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Protocolo Shinkō v2.6</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                                            className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-6 h-6"/>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-10 mb-8 relative z-20 flex-1">
                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Natureza do Ativo</h4>
                                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                                                    {t.isRecurring ? <Repeat className="w-5 h-5 text-emerald-500"/> : <CreditCard className="w-5 h-5 text-blue-500"/>}
                                                    <span className="text-xs font-black uppercase text-white">{t.isRecurring ? `Recorrência (${t.periodicity})` : 'Pagamento Único'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-8">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
                                                className="w-full py-6 rounded-[2rem] bg-white text-black font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 hover:bg-amber-500 shadow-glow-white active:scale-95 group"
                                            >
                                                Refinar Registro <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1"/>
                                            </button>
                                            <div className="p-5 bg-white/5 rounded-[1.8rem] border border-white/5 text-[10px] text-slate-500 leading-relaxed font-medium italic text-center">
                                                Registro sincronizado. Auditoria industrial ativa.
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto text-center relative z-20 opacity-30">
                                        <span className="text-[8px] font-black uppercase tracking-[0.6em] text-slate-600">ID: {t.id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-40 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] opacity-30 w-full">
                        <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-300"/>
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Nenhum lançamento no radar</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 md:p-16 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={e => e.stopPropagation()}>
                    <div className="w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] overflow-hidden animate-ios-pop flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50/50 dark:bg-white/5">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-11 h-11 rounded-[1.1rem] bg-amber-500 flex items-center justify-center text-black shadow-lg">
                                        <Plus className="w-6 h-6 stroke-[3px]"/>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {newTrans.id ? 'Refinar' : 'Novo'} Lançamento.
                                    </h3>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all text-slate-400"><X className="w-6 h-6"/></button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                                <button onClick={() => setNewTrans({...newTrans, type: 'inflow'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'inflow' ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}>Receita (+)</button>
                                <button onClick={() => setNewTrans({...newTrans, type: 'outflow'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'outflow' ? 'bg-red-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}>Despesa (-)</button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição do Ativo</label>
                                    <input value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} placeholder="Ex: Pagamento Consultoria..." className="w-full px-6 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-inner dark:text-white"/>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Unitário (R$)</label>
                                        <input type="number" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} className="w-full px-6 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-inner dark:text-white"/>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data Inicial</label>
                                        <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full px-6 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 transition-all uppercase shadow-inner dark:text-white"/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria Estratégica</label>
                                    <select value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 dark:text-white">
                                        {SHINKO_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-8 bg-slate-50 dark:bg-white/[0.03] rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-8 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Repeat className="w-5 h-5"/></div>
                                            <div>
                                                <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-widest block">Recorrência Industrial</span>
                                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Habilitar Fluxo Sequencial</span>
                                            </div>
                                        </div>
                                        <ElasticSwitch checked={newTrans.isRecurring || false} onChange={() => setNewTrans({...newTrans, isRecurring: !newTrans.isRecurring})} />
                                    </div>

                                    {newTrans.isRecurring && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Hash className="w-3 h-3"/> Quantidade de Parcelas
                                                </label>
                                                <input 
                                                    type="number" 
                                                    min="2" max="120"
                                                    value={newTrans.installments} 
                                                    onChange={e => setNewTrans({...newTrans, installments: parseInt(e.target.value)})}
                                                    className="w-full p-4 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 outline-none font-black text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar className="w-3 h-3"/> Periodicidade
                                                </label>
                                                <select 
                                                    value={newTrans.periodicity} 
                                                    onChange={e => setNewTrans({...newTrans, periodicity: e.target.value as any})}
                                                    className="w-full p-4 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 outline-none font-bold text-xs uppercase dark:text-white cursor-pointer"
                                                >
                                                    <option value="monthly">Mensal</option>
                                                    <option value="quarterly">Trimestral</option>
                                                    <option value="semiannual">Semestral</option>
                                                    <option value="yearly">Anual</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 flex gap-4 shrink-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
                            <button onClick={handleSave} className="flex-[1.5] py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all">
                                <Save className="w-4 h-4"/> Sincronizar {newTrans.isRecurring ? 'Lote de Lançamentos' : 'Registro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .rotate-y-180 { transform: rotateY(180deg); }
                .backface-hidden { backface-visibility: hidden !important; -webkit-backface-visibility: hidden !important; }
                .shadow-glow-white { box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
};
