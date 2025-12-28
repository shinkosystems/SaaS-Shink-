
import React, { useState, useMemo } from 'react';
import { FinancialTransaction } from '../types';
import { Plus, Trash2, ChevronLeft, ChevronRight, Search, RefreshCw, Edit, FileText, Save, ArrowUpRight, ArrowDownRight, X, DollarSign, Calendar, Tag } from 'lucide-react';

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
        setNewTrans({ ...t });
        setShowModal(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(confirm("Deseja realmente excluir este lançamento?")) {
            onDeleteTransaction(id);
            if (selectedTrans?.id === id) setSelectedTrans(null);
        }
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
                organizationId: newTrans.organizationId || 0
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
        <div className="w-full flex flex-col bg-white dark:bg-[#0A0A0C] rounded-[3rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-soft animate-in fade-in duration-500">
            
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50/20 dark:bg-white/[0.01]">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 md:min-w-[280px]">
                        <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2">
                        <button onClick={() => setSelectedYear(y => y-1)} className="p-2 hover:bg-black/5 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-xs font-black tracking-widest px-2">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y+1)} className="p-2 hover:bg-black/5 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-center sm:justify-end">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                        <button onClick={() => setFilterType('all')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'all' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Tudo</button>
                        <button onClick={() => setFilterType('inflow')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'inflow' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Entradas</button>
                        <button onClick={() => setFilterType('outflow')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'outflow' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500'}`}>Saídas</button>
                    </div>
                    <button onClick={onSyncContracts} title="Sincronizar Contratos" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:scale-105 transition-all">
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`}/>
                    </button>
                    <button 
                        onClick={handleCreateClick} 
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <Plus className="w-4 h-4"/> Lançamento
                    </button>
                </div>
            </div>

            {/* Table High Density */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left table-auto">
                    <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-6 py-4 w-24">Data</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4 w-28">Categoria</th>
                            <th className="px-6 py-4 w-32 text-right">Valor</th>
                            <th className="px-6 py-4 w-20 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="py-24 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.5em] opacity-40">Nenhum registro.</td></tr>
                        )}
                        {filtered.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 group transition-colors cursor-pointer">
                                <td className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase">{new Date(t.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            {t.isContract && <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin-slow shrink-0" />}
                                            <span className="truncate max-w-[150px] md:max-w-[400px]">{extractClientInfo(t.description)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-full text-slate-500 border border-slate-200 dark:border-white/10">{t.category}</span>
                                </td>
                                <td className={`px-6 py-4 text-right font-black text-base ${t.type === 'inflow' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <span className="text-[10px] mr-1 opacity-50 font-bold">R$</span>{t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-1.5 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEditClick(e, t)} className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"><Edit className="w-3.5 h-3.5"/></button>
                                        <button onClick={(e) => handleDeleteClick(e, t.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FORM MODAL - REFINED COMPACT & BREATHING ROOM ON BORDERS */}
            {showModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 md:p-16 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="w-full max-w-md rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] overflow-hidden animate-ios-pop flex flex-col max-h-full">
                        
                        {/* Modal Header Compact */}
                        <div className="p-6 md:p-8 pb-4 md:pb-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50/50 dark:bg-white/5">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-11 h-11 rounded-[1.1rem] bg-amber-500 flex items-center justify-center text-black shadow-lg">
                                        <Plus className="w-6 h-6 stroke-[3px]"/>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {newTrans.id ? 'Editar' : 'Novo'} Lançamento.
                                    </h3>
                                </div>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] ml-1">REGISTRO DE FLUXO</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all text-slate-400"><X className="w-6 h-6"/></button>
                        </div>

                        {/* Modal Body Compact */}
                        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                                <button 
                                    onClick={() => setNewTrans({...newTrans, type: 'inflow'})}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'inflow' ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}
                                >
                                    Receita (+)
                                </button>
                                <button 
                                    onClick={() => setNewTrans({...newTrans, type: 'outflow'})}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'outflow' ? 'bg-red-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}
                                >
                                    Despesa (-)
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                                    <div className="relative group">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                        <input 
                                            value={newTrans.description} 
                                            onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                                            placeholder="Ex: Pagamento Consultoria..."
                                            className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-500" />
                                            <input 
                                                type="number"
                                                value={newTrans.amount} 
                                                onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                            <input 
                                                type="date"
                                                value={newTrans.date} 
                                                onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 transition-all uppercase shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                                    <div className="relative group">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                        <select 
                                            value={newTrans.category} 
                                            onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                                            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 appearance-none cursor-pointer shadow-inner"
                                        >
                                            <option value="Operacional">Operacional</option>
                                            <option value="Vendas">Vendas</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Infraestrutura">Infraestrutura</option>
                                            <option value="Impostos">Impostos</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Compact */}
                        <div className="p-6 md:p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-4 shrink-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
                            <button 
                                onClick={handleSave}
                                className="flex-[1.5] py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4"/> Sincronizar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
