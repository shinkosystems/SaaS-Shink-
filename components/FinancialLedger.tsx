import React, { useState, useMemo } from 'react';
import { FinancialTransaction } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Trash2, Calendar, Tag, DollarSign, Filter, Search, RefreshCw, Lock, ChevronLeft, ChevronRight, XCircle, Edit, User, FileText, CheckCircle2, X } from 'lucide-react';
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
    const [selectedTrans, setSelectedTrans] = useState<FinancialTransaction | null>(null); // For Detail View
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Form State
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

    // Helper to extract Client Name from description if standard format
    const extractClientInfo = (desc: string) => {
        if (desc.includes('Mensalidade - ')) {
            return desc.replace('Mensalidade - ', '').split('(')[0].trim();
        }
        return desc;
    };

    return (
        <div className="w-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente ou descrição..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-slate-400 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-2">
                        <button onClick={() => setSelectedYear(y => y-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-xs font-bold text-slate-700 dark:text-white px-2">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y+1)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <div className="flex bg-slate-200 dark:bg-black/20 p-1 rounded-lg">
                        <button onClick={() => setFilterType('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Tudo</button>
                        <button onClick={() => setFilterType('inflow')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'inflow' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}>Entradas</button>
                        <button onClick={() => setFilterType('outflow')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'outflow' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-slate-500'}`}>Saídas</button>
                    </div>
                    <button onClick={onSyncContracts} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors" title="Sincronizar Contratos">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}/>
                    </button>
                    <button onClick={handleCreateClick} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <Plus className="w-3 h-3"/> Novo
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white dark:bg-slate-900 text-slate-400 border-b border-slate-100 dark:border-white/5 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4 w-32">Data</th>
                            <th className="p-4">Descrição / Cliente</th>
                            <th className="p-4 hidden sm:table-cell">Categoria</th>
                            <th className="p-4 text-right">Valor</th>
                            <th className="p-4 w-20 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">Sem lançamentos para este período.</td></tr>
                        )}
                        {filtered.map(t => (
                            <tr 
                                key={t.id} 
                                onClick={() => setSelectedTrans(t)}
                                className="hover:bg-slate-50 dark:hover:bg-white/5 group transition-colors cursor-pointer"
                            >
                                <td className="p-4 font-mono text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            {t.isContract && (
                                                <span title="Assinatura Recorrente">
                                                    <RefreshCw className="w-3 h-3 text-emerald-500" />
                                                </span>
                                            )}
                                            {extractClientInfo(t.description)}
                                        </div>
                                        {t.isContract && t.description !== extractClientInfo(t.description) && (
                                            <span className="text-[10px] text-slate-400 mt-0.5">{t.description}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 hidden sm:table-cell">
                                    <span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500 font-medium">{t.category}</span>
                                </td>
                                <td className={`p-4 text-right font-bold ${t.type === 'inflow' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {t.type === 'inflow' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEditClick(e, t)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit className="w-3 h-3"/></button>
                                        <button onClick={(e) => handleDeleteClick(e, t.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* DETAIL POPUP */}
            {selectedTrans && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl animate-ios-pop border border-slate-200 dark:border-white/10 overflow-hidden relative">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50 dark:bg-white/5">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    {selectedTrans.type === 'inflow' ? <ArrowUpCircle className="w-5 h-5 text-emerald-500"/> : <ArrowDownCircle className="w-5 h-5 text-red-500"/>}
                                    Detalhes do Lançamento
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 font-mono">{selectedTrans.id}</p>
                            </div>
                            <button onClick={() => setSelectedTrans(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 bg-white dark:bg-white/10 rounded-full shadow-sm"><X className="w-4 h-4"/></button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            
                            {/* Value Display */}
                            <div className="text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Valor Total</span>
                                <div className={`text-4xl font-black mt-2 ${selectedTrans.type === 'inflow' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    R$ {selectedTrans.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </div>
                                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <Calendar className="w-3 h-3"/> {new Date(selectedTrans.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>

                            {/* Client & Subscription Info */}
                            {selectedTrans.isContract ? (
                                <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-slate-200 dark:border-white/5 space-y-3">
                                    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <User className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Assinante</span>
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{extractClientInfo(selectedTrans.description)}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <span className="text-[10px] text-slate-500 block mb-1">Tipo</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3 text-blue-500"/> Assinatura
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block mb-1">Parcela</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {selectedTrans.metadata?.installmentIndex !== undefined 
                                                    ? `${Number(selectedTrans.metadata.installmentIndex) + 1}ª Mensalidade` 
                                                    : 'Recorrente'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {selectedTrans.metadata?.contractId && (
                                        <div className="pt-2">
                                            <span className="text-[10px] text-slate-400 font-mono">Contrato ID: {selectedTrans.metadata.contractId}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                                    <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">Descrição</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedTrans.description}</p>
                                </div>
                            )}

                            {/* Category Badge */}
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500">Categoria Financeira</span>
                                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800">
                                    {selectedTrans.category}
                                </span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex gap-2">
                            <button 
                                onClick={(e) => { setShowModal(true); setNewTrans(selectedTrans); setSelectedTrans(null); }}
                                className="flex-1 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit className="w-3 h-3"/> Editar
                            </button>
                            <button 
                                onClick={(e) => { onDeleteTransaction(selectedTrans.id); setSelectedTrans(null); }}
                                className="flex-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-3 h-3"/> Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT/CREATE MODAL (Mantido Simplificado) */}
            {showModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-ios-pop border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{newTrans.id ? 'Editar' : 'Novo'} Lançamento</h3>
                            <button onClick={() => setShowModal(false)}><XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button onClick={() => setNewTrans({...newTrans, type: 'inflow'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newTrans.type === 'inflow' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>Entrada</button>
                                <button onClick={() => setNewTrans({...newTrans, type: 'outflow'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newTrans.type === 'outflow' ? 'bg-red-50 border-red-500 text-red-600' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>Saída</button>
                            </div>
                            <input type="text" placeholder="Descrição (ex: Mensalidade Cliente X)" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10 transition-all"/>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Valor" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="flex-1 p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10 transition-all"/>
                                <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-36 p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10 transition-all"/>
                            </div>
                            <select value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none cursor-pointer text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10 transition-all">
                                <option className="bg-white dark:bg-slate-900">Operacional</option>
                                <option className="bg-white dark:bg-slate-900">Marketing</option>
                                <option className="bg-white dark:bg-slate-900">Vendas</option>
                                <option className="bg-white dark:bg-slate-900">Administrativo</option>
                                <option className="bg-white dark:bg-slate-900">Receita Recorrente</option>
                                <option className="bg-white dark:bg-slate-900">Serviços</option>
                            </select>
                            <button onClick={handleSave} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg mt-2 hover:opacity-90 transition-opacity">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};