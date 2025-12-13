
import React, { useState, useMemo } from 'react';
import { FinancialTransaction } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Trash2, Calendar, Tag, DollarSign, Filter, Search, RefreshCw, Lock, ChevronLeft, ChevronRight, XCircle, Edit } from 'lucide-react';
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

    const handleEditClick = (t: FinancialTransaction) => {
        setNewTrans(t);
        setShowModal(true);
    };

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

    return (
        <div className="w-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-2">
                        <button onClick={() => setSelectedYear(y => y-1)}><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-xs font-bold text-slate-700 dark:text-white px-2">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y+1)}><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <div className="flex bg-slate-200 dark:bg-black/20 p-1 rounded-lg">
                        <button onClick={() => setFilterType('all')} className={`px-3 py-1 text-xs font-bold rounded-md ${filterType === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>Tudo</button>
                        <button onClick={() => setFilterType('inflow')} className={`px-3 py-1 text-xs font-bold rounded-md ${filterType === 'inflow' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}>Entradas</button>
                        <button onClick={() => setFilterType('outflow')} className={`px-3 py-1 text-xs font-bold rounded-md ${filterType === 'outflow' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-slate-500'}`}>Saídas</button>
                    </div>
                    <button onClick={onSyncContracts} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 text-slate-500">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}/>
                    </button>
                    <button onClick={handleCreateClick} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90">
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
                            <th className="p-4">Descrição</th>
                            <th className="p-4 hidden sm:table-cell">Categoria</th>
                            <th className="p-4 text-right">Valor</th>
                            <th className="p-4 w-20 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">Sem lançamentos.</td></tr>
                        )}
                        {filtered.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 group transition-colors">
                                <td className="p-4 font-mono text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        {t.isContract && <RefreshCw className="w-3 h-3 text-emerald-500"/>}
                                        {t.description}
                                    </div>
                                </td>
                                <td className="p-4 hidden sm:table-cell">
                                    <span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">{t.category}</span>
                                </td>
                                <td className={`p-4 text-right font-bold ${t.type === 'inflow' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {t.type === 'inflow' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditClick(t)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit className="w-3 h-3"/></button>
                                        <button onClick={() => onDeleteTransaction(t.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Simplificado */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-ios-pop">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{newTrans.id ? 'Editar' : 'Novo'} Lançamento</h3>
                            <button onClick={() => setShowModal(false)}><XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button onClick={() => setNewTrans({...newTrans, type: 'inflow'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${newTrans.type === 'inflow' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-200 text-slate-500'}`}>Entrada</button>
                                <button onClick={() => setNewTrans({...newTrans, type: 'outflow'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${newTrans.type === 'outflow' ? 'bg-red-50 border-red-500 text-red-600' : 'border-slate-200 text-slate-500'}`}>Saída</button>
                            </div>
                            <input type="text" placeholder="Descrição" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none font-bold"/>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Valor" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="flex-1 p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                                <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-32 p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                            </div>
                            <select value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none cursor-pointer">
                                <option>Operacional</option><option>Marketing</option><option>Vendas</option><option>Administrativo</option><option>Receita Recorrente</option>
                            </select>
                            <button onClick={handleSave} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg mt-2">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
