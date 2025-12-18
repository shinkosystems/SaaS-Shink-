
import React, { useState, useMemo } from 'react';
import { FinancialTransaction } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Trash2, Calendar, Tag, DollarSign, Filter, Search, RefreshCw, Lock, ChevronLeft, ChevronRight, XCircle, Edit, User, FileText, CheckCircle2, X, Save, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { logEvent } from '../services/analyticsService';

interface Props {
    transactions: FinancialTransaction[];
    onAddTransaction: (t: Omit<FinancialTransaction, 'id'>) => void;
    onEditTransaction: (t: FinancialTransaction) => void;
    onDeleteTransaction: (id: string) => void;
    onSyncContracts: () => void;
    isSyncing?: boolean;
}

export const FinancialLedger: React.FC<Props> = ({ transactions, onAddTransaction, onEditTransaction, onDeleteTransaction, onSyncContracts, isSyncing }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedTrans, setSelectedTrans] = useState<FinancialTransaction | null>(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [newTrans, setNewTrans] = useState<Partial<FinancialTransaction>>({
        type: 'outflow',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category: 'Operacional'
    });

    const handleEditClick = (e: React.MouseEvent, t: FinancialTransaction) => {
        e.stopPropagation();
        setNewTrans(t);
        setShowModal(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteTransaction(id);
        if (selectedTrans?.id === id) setSelectedTrans(null);
    }

    const handleCreateClick = () => {
        setNewTrans({
            type: 'outflow',
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: '',
            category: 'Operacional',
            id: undefined 
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
                organizationId: 0
            });
        }
        setShowModal(false);
    };

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            const tYear = new Date(t.date).getFullYear();
            const dateMatch = tYear === selectedYear;
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || t.type === filterType;
            return matchesSearch && matchesType && dateMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedYear, searchTerm, filterType]);

    const extractClientInfo = (desc: string) => {
        if (desc.includes('Mensalidade - ')) {
            return desc.replace('Mensalidade - ', '').split('(')[0].trim();
        }
        return desc;
    };

    return (
        <div className="w-full flex flex-col bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden shadow-glass backdrop-blur-3xl animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="p-6 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-6 justify-between items-center bg-white/5 dark:bg-black/5">
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:min-w-[280px]">
                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500"/>
                        <input 
                            type="text" 
                            placeholder="Buscar lançamento..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl text-xs font-bold text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl px-3">
                        <button onClick={() => setSelectedYear(y => y-1)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-xs font-black text-[var(--text-main)] tracking-widest px-2">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y+1)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-[var(--border-color)]">
                        <button onClick={() => setFilterType('all')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterType === 'all' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Tudo</button>
                        <button onClick={() => setFilterType('inflow')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterType === 'inflow' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Entradas</button>
                        <button onClick={() => setFilterType('outflow')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterType === 'outflow' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500'}`}>Saídas</button>
                    </div>
                    <button onClick={onSyncContracts} className="p-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl hover:bg-white dark:hover:bg-white/5 transition-all">
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`}/>
                    </button>
                    <button onClick={handleCreateClick} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl">
                        <Plus className="w-4 h-4"/> Novo Lançamento
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-black/5 dark:bg-white/5 text-slate-400 border-b border-[var(--border-color)] text-[10px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="p-6">Data</th>
                            <th className="p-6">Descrição / Ativo</th>
                            <th className="p-6 hidden sm:table-cell">Categoria</th>
                            <th className="p-6 text-right">Valor</th>
                            <th className="p-6 w-24 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Sem lançamentos detectados no período.</td></tr>
                        )}
                        {filtered.map(t => (
                            <tr 
                                key={t.id} 
                                onClick={() => setSelectedTrans(t)}
                                className="hover:bg-slate-50 dark:hover:bg-white/5 group transition-colors cursor-pointer"
                            >
                                <td className="p-6 font-black text-xs text-slate-500 uppercase">{new Date(t.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}</td>
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-[var(--text-main)] flex items-center gap-3">
                                            {t.isContract && <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />}
                                            {extractClientInfo(t.description)}
                                        </div>
                                        {t.isContract && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Recorrência Ativa</span>}
                                    </div>
                                </td>
                                <td className="p-6 hidden sm:table-cell">
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full text-slate-500 border border-[var(--border-color)]">{t.category}</span>
                                </td>
                                <td className={`p-6 text-right font-black text-lg ${t.type === 'inflow' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <span className="text-xs mr-1 opacity-50">R$</span>{t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="p-6">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEditClick(e, t)} className="p-2.5 bg-white dark:bg-white/5 text-slate-400 hover:text-amber-500 rounded-xl border border-[var(--border-color)] transition-all"><Edit className="w-4 h-4"/></button>
                                        <button onClick={(e) => handleDeleteClick(e, t.id)} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* DETAIL MODAL - SHINKO GLASS */}
            {selectedTrans && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-in fade-in">
                    <div className="glass-panel w-full max-w-lg rounded-[3rem] shadow-glass border-[var(--border-color)] overflow-hidden relative animate-ios-pop flex flex-col">
                        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-black text-[var(--text-main)] tracking-tighter flex items-center gap-3">
                                    {selectedTrans.type === 'inflow' ? <ArrowUpRight className="w-6 h-6 text-emerald-500"/> : <ArrowDownRight className="w-6 h-6 text-red-500"/>}
                                    Detalhes Técnicos
                                </h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Snapshot Financeiro</p>
                            </div>
                            <button onClick={() => setSelectedTrans(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400"/></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="text-center space-y-4">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Montante Liquidado</span>
                                <div className={`text-6xl font-black tracking-tighter leading-none ${selectedTrans.type === 'inflow' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <span className="text-2xl mr-2 opacity-50 tracking-normal font-bold">R$</span>
                                    {selectedTrans.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </div>
                                <div className="inline-flex items-center gap-3 px-5 py-2 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 border border-[var(--border-color)]">
                                    <Calendar className="w-4 h-4 text-amber-500"/> {new Date(selectedTrans.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                            </div>

                            <div className="glass-card p-8 border-[var(--border-color)] space-y-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-glow-amber">
                                        {selectedTrans.isContract ? <RefreshCw className="w-7 h-7"/> : <FileText className="w-7 h-7"/>}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo Relacionado</div>
                                        <div className="text-lg font-black text-[var(--text-main)] tracking-tight mt-1">{extractClientInfo(selectedTrans.description)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 pt-4 border-t border-[var(--border-color)]">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Categoria</span>
                                        <div className="text-sm font-bold text-[var(--text-main)] mt-1">{selectedTrans.category}</div>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vínculo</span>
                                        <div className="text-sm font-bold text-[var(--text-main)] mt-1">{selectedTrans.isContract ? 'Assinatura Ativa' : 'Pagamento Único'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-[var(--border-color)] bg-white/5 flex gap-4">
                            <button 
                                onClick={() => { setShowModal(true); setNewTrans(selectedTrans); setSelectedTrans(null); }}
                                className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                            >
                                <Edit className="w-4 h-4"/> Editar Lançamento
                            </button>
                            <button 
                                onClick={() => { onDeleteTransaction(selectedTrans.id); setSelectedTrans(null); }}
                                className="px-6 py-4 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                                <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT MODAL - SHINKO GLASS */}
            {showModal && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-black/60 backdrop-blur-2xl animate-in fade-in">
                    <div className="glass-panel w-full max-w-md rounded-[3rem] shadow-glass border-[var(--border-color)] overflow-hidden relative animate-ios-pop">
                        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-black text-[var(--text-main)] tracking-tighter">{newTrans.id ? 'Refinar' : 'Novo'} Lançamento</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400"/></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-[var(--border-color)]">
                                <button onClick={() => setNewTrans({...newTrans, type: 'inflow'})} className={`flex-1 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'inflow' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Entrada</button>
                                <button onClick={() => setNewTrans({...newTrans, type: 'outflow'})} className={`flex-1 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'outflow' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500'}`}>Saída</button>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Identificação do Ativo</label>
                                    <input type="text" placeholder="Ex: Mensalidade Cliente Alpha" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all"/>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Montante (R$)</label>
                                        <input type="number" placeholder="0,00" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="w-full p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl text-sm font-black text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all"/>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Data Fiscal</label>
                                        <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl text-xs font-black text-[var(--text-main)] outline-none focus:border-amber-500/50 transition-all uppercase tracking-widest"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Natureza Operacional</label>
                                    <select value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="w-full p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-main)] outline-none cursor-pointer">
                                        <option value="Operacional" className="dark:bg-slate-900">Operacional</option>
                                        <option value="Marketing" className="dark:bg-slate-900">Marketing</option>
                                        <option value="Vendas" className="dark:bg-slate-900">Vendas</option>
                                        <option value="Receita Recorrente" className="dark:bg-slate-900">Receita Recorrente</option>
                                        <option value="Infraestrutura" className="dark:bg-slate-900">Infraestrutura</option>
                                    </select>
                                </div>
                            </div>

                            <button onClick={handleSave} className="w-full py-5 bg-amber-500 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-glow-amber hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                <Save className="w-4 h-4"/> Sincronizar no Caixa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
