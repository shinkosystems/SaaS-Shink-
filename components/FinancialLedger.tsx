
import React, { useState, useMemo } from 'react';
import { FinancialTransaction } from '../types';
import { Plus, Trash2, ChevronLeft, ChevronRight, Search, RefreshCw, Edit, FileText, Save, ArrowUpRight, ArrowDownRight, X, DollarSign, Calendar, Tag, Repeat, Filter } from 'lucide-react';
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

    const [newTrans, setNewTrans] = useState<Partial<FinancialTransaction>>({
        type: 'outflow',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category: 'Financeiro',
        isRecurring: false,
        periodicity: 'monthly',
        installments: 1,
        metadata: {}
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
        }
    }

    const handleCreateClick = () => {
        setNewTrans({
            type: 'outflow',
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: '',
            category: 'Financeiro',
            isRecurring: false,
            periodicity: 'monthly',
            installments: 1,
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
                installments: newTrans.installments,
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
            endRange = new Date(startRange.getFullYear(), startRange.getMonth() + 1, 0);
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

    const extractClientInfo = (desc: string) => {
        if (desc.includes('Mensalidade - ')) {
            return desc.replace('Mensalidade - ', '').split('(')[0].trim();
        }
        return desc;
    };

    return (
        <div className="w-full flex flex-col bg-white dark:bg-[#0A0A0C] rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-soft animate-in fade-in duration-500 pb-20">
            
            <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.01] space-y-6">
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
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
                                {listPeriod === 'all' ? 'TODO O HISTÓRICO' : listPeriod === 'year' ? viewDate.getFullYear() : listPeriod === 'month' ? viewDate.toLocaleDateString('pt-BR', {month:'short', year:'numeric'}) : 'FILTRO ATIVO'}
                            </span>
                            <button onClick={() => handleNavigate('next')} className="p-2.5 hover:bg-black/5 rounded-xl transition-all"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-center">
                         <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                            {[
                                { id: 'day', label: 'Dia' },
                                { id: 'week', label: 'Sem' },
                                { id: 'month', label: 'Mês' },
                                { id: 'quarter', label: 'Tri' },
                                { id: 'year', label: 'Ano' },
                                { id: 'all', label: 'Tudo' }
                            ].map(p => (
                                <button key={p.id} onClick={() => setListPeriod(p.id as any)} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${listPeriod === p.id ? 'bg-white dark:bg-white/10 shadow-md text-slate-900 dark:text-white' : 'text-slate-400'}`}>{p.label}</button>
                            ))}
                        </div>
                        <button onClick={onSyncContracts} title="Sincronizar Contratos" className="p-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:scale-105 transition-all text-slate-400">
                            <RefreshCw className={`w-4.5 h-4.5 ${isSyncing ? 'animate-spin' : ''}`}/>
                        </button>
                        <button 
                            onClick={handleCreateClick} 
                            className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                        >
                            <Plus className="w-4.5 h-4.5"/> Novo Registro
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${filterType === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-transparent text-slate-400 border-slate-200'}`}>Tudo</button>
                    <button onClick={() => setFilterType('inflow')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${filterType === 'inflow' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-transparent text-slate-400 border-slate-200'}`}>Entradas</button>
                    <button onClick={() => setFilterType('outflow')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${filterType === 'outflow' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-slate-400 border-slate-200'}`}>Saídas</button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left table-auto">
                    <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-5 w-28">Data</th>
                            <th className="px-8 py-5">Descrição do Ativo</th>
                            <th className="px-8 py-5 w-32">Categoria</th>
                            <th className="px-8 py-5 w-40 text-right">Valor Consolidado</th>
                            <th className="px-8 py-5 w-24 text-center">Controle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="py-32 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-30">
                                    <Filter className="w-12 h-12"/>
                                    <span className="text-xs font-black uppercase tracking-[0.4em]">Nenhum lançamento</span>
                                </div>
                            </td></tr>
                        )}
                        {filtered.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 group transition-colors cursor-pointer">
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs text-slate-900 dark:text-white">{new Date(t.date).getDate()}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(t.date).toLocaleDateString('pt-BR', {month:'short'})}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${t.type === 'inflow' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {t.type === 'inflow' ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                                {(t.isContract || t.isRecurring) && <Repeat className="w-3 h-3 text-emerald-500 shrink-0" />}
                                                <span className="truncate max-w-[400px]">{extractClientInfo(t.description)}</span>
                                            </div>
                                            {t.isRecurring && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Recorrência Ativa</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg text-slate-500 border border-slate-200 dark:border-white/10">{t.category}</span>
                                </td>
                                <td className={`px-8 py-5 text-right font-black text-lg ${t.type === 'inflow' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <span className="text-[10px] mr-1.5 opacity-40 font-bold">R$</span>{t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEditClick(e, t)} className="p-2 text-slate-400 hover:text-amber-500 transition-all hover:bg-amber-50 rounded-lg"><Edit className="w-4 h-4"/></button>
                                        <button onClick={(e) => handleDeleteClick(e, t.id)} className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 md:p-16 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] overflow-hidden animate-ios-pop flex flex-col max-h-[95vh]">
                        
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
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] ml-1">REGISTRO DE FLUXO</p>
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
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                                    <div className="relative group">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                        <input value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} placeholder="Ex: Pagamento Consultoria..." className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-inner dark:text-white"/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-500" />
                                            <input type="number" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-inner dark:text-white"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                            <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 transition-all uppercase shadow-inner dark:text-white"/>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                                    <select value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 dark:text-white">
                                        {SHINKO_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-white/[0.03] rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl"><Repeat className="w-4 h-4"/></div>
                                            <div>
                                                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest block">Recorrência</span>
                                                <span className="text-[9px] text-slate-500 uppercase font-bold">Automático</span>
                                            </div>
                                        </div>
                                        <ElasticSwitch checked={newTrans.isRecurring || false} onChange={() => setNewTrans({...newTrans, isRecurring: !newTrans.isRecurring})} />
                                    </div>

                                    {newTrans.isRecurring && (
                                        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Periodicidade</label>
                                                    <select value={newTrans.periodicity} onChange={e => setNewTrans({...newTrans, periodicity: e.target.value as any})} className="w-full p-3.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-bold outline-none focus:border-amber-500 dark:text-white">
                                                        <option value="monthly">Mensal</option>
                                                        <option value="quarterly">Trimestral</option>
                                                        <option value="semiannual">Semestral</option>
                                                        <option value="yearly">Anual</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ocorrências</label>
                                                    <input type="number" min="1" max="60" value={newTrans.installments} onChange={e => setNewTrans({...newTrans, installments: parseInt(e.target.value)})} className="w-full p-3.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm font-black outline-none focus:border-amber-500 dark:text-white"/>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-4 shrink-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
                            <button onClick={handleSave} className="flex-[1.5] py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"><Save className="w-4 h-4"/> Sincronizar Registro</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
