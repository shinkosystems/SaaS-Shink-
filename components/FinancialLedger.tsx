
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
        <div className="w-full flex flex-col bg-white dark:bg-[#0A0A0C] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-soft animate-in fade-in duration-500">
            
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row gap-6 justify-between items-center bg-slate-50/30 dark:bg-white/[0.01]">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 md:min-w-[280px]">
                        <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2">
                        <button onClick={() => setSelectedYear(y => y-1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                        <span className="text-xs font-black text-slate-900 dark:text-white tracking-widest px-2">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y+1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-center sm:justify-end">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                        <button onClick={() => setFilterType('all')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'all' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Tudo</button>
                        <button onClick={() => setFilterType('inflow')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'inflow' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Entradas</button>
                        <button onClick={() => setFilterType('outflow')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'outflow' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500'}`}>Saídas</button>
                    </div>
                    <button onClick={onSyncContracts} title="Sincronizar Contratos" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
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

            {/* Table Optimized for Space */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left table-auto">
                    <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-6 py-4 w-28">Data</th>
                            <th className="px-6 py-4">Descrição / Ativo</th>
                            <th className="px-6 py-4 w-32">Categoria</th>
                            <th className="px-6 py-4 w-40 text-right">Valor</th>
                            <th className="px-6 py-4 w-24 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="py-32 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.5em] opacity-40">Sem registros.</td></tr>
                        )}
                        {filtered.map(t => (
                            <tr 
                                key={t.id} 
                                className="hover:bg-slate-50/50 dark:hover:bg-white/5 group transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-3 font-black text-[11px] text-slate-500 uppercase whitespace-nowrap">
                                    {new Date(t.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            {t.isContract && <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin-slow shrink-0" />}
                                            <span className="truncate max-w-[200px] md:max-w-[400px]">{extractClientInfo(t.description)}</span>
                                        </div>
                                        {t.isContract && <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">Recorrência</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full text-slate-500 border border-slate-200 dark:border-white/10 whitespace-nowrap">{t.category}</span>
                                </td>
                                <td className={`px-6 py-3 text-right font-black text-base ${t.type === 'inflow' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <span className="text-[10px] mr-1 opacity-50 font-bold">R$</span>{t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex justify-center gap-2 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEditClick(e, t)} className="p-2 bg-white dark:bg-white/5 text-slate-400 hover:text-amber-500 rounded-lg border border-slate-200 dark:border-white/10 transition-all"><Edit className="w-4 h-4"/></button>
                                        <button onClick={(e) => handleDeleteClick(e, t.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FORM MODAL remains as a high-priority independent pop-up */}
            {showModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] overflow-hidden animate-ios-pop flex flex-col">
                        
                        <div className="p-10 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black">
                                        <Plus className="w-6 h-6 stroke-[3px]"/>
                                    </div>
                                    {newTrans.id ? 'Editar' : 'Novo'}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-3 ml-1">LANÇAMENTO DE FLUXO</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all text-slate-400"><X className="w-7 h-7"/></button>
                        </div>

                        <div className="p-10 space-y-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-[1.8rem] border border-slate-200 dark:border-white/10 shadow-inner">
                                <button 
                                    onClick={() => setNewTrans({...newTrans, type: 'inflow'})}
                                    className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'inflow' ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}
                                >
                                    Receita (+)
                                </button>
                                <button 
                                    onClick={() => setNewTrans({...newTrans, type: 'outflow'})}
                                    className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${newTrans.type === 'outflow' ? 'bg-red-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}
                                >
                                    Despesa (-)
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Descrição do Ativo</label>
                                    <div className="relative group">
                                        <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                        <input 
                                            value={newTrans.description} 
                                            onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                                            placeholder="Ex: Assinatura Shinkō Core..."
                                            className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Valor Nominal</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                            <input 
                                                type="number"
                                                value={newTrans.amount} 
                                                onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})}
                                                placeholder="0.00"
                                                className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xl font-black text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Data Fiscal</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                            <input 
                                                type="date"
                                                value={newTrans.date} 
                                                onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                                                className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all uppercase shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Categoria do Ativo</label>
                                    <div className="relative group">
                                        <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                        <select 
                                            value={newTrans.category} 
                                            onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                                            className="w-full pl-14 pr-10 py-5 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 appearance-none cursor-pointer transition-all shadow-inner"
                                        >
                                            <option value="Operacional">Operacional</option>
                                            <option value="Vendas">Receita de Vendas</option>
                                            <option value="Infraestrutura">Infraestrutura / Cloud</option>
                                            <option value="Marketing">Marketing & Ads</option>
                                            <option value="Pessoal">Pessoal / Salários</option>
                                            <option value="Impostos">Impostos & Taxas</option>
                                            <option value="Investimento">Investimento</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-6 shrink-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95">Descartar</button>
                            <button 
                                onClick={handleSave}
                                className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                <Save className="w-5 h-5"/> Sincronizar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
