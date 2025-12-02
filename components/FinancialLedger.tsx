
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

    // Date Filters
    const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('year'); // Default to Year to show more data initially
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3));

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const quarterNames = ["Q1 (Jan-Mar)", "Q2 (Abr-Jun)", "Q3 (Jul-Set)", "Q4 (Out-Dez)"];

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
            id: undefined // Ensure ID is undefined for new creation
        });
        setShowModal(true);
    };

    const handleSave = () => {
        if (!newTrans.description || !newTrans.amount) {
            alert("Preencha descrição e valor.");
            return;
        }
        
        if (newTrans.id) {
            // EDIT MODE
            logEvent('feature_use', { feature: 'Edit Transaction', type: newTrans.type });
            onEditTransaction(newTrans as FinancialTransaction);
        } else {
            // CREATE MODE
            logEvent('feature_use', { feature: 'Add Transaction', type: newTrans.type });
            onAddTransaction({
                date: newTrans.date!,
                description: newTrans.description,
                amount: Number(newTrans.amount),
                type: newTrans.type as 'inflow' | 'outflow',
                category: newTrans.category || 'Geral',
                organizationId: 0 // Will be set by parent
            });
        }
        setShowModal(false);
    };

    // Safer Date Parsing (Timezone Agnostic)
    const parseDateParts = (dateStr: string) => {
        if (!dateStr) return { year: 0, month: 0, day: 0 };
        // Take only the YYYY-MM-DD part to avoid ISO time causing timezone shifts
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [y, m, d] = cleanDate.split('-').map(Number);
        return { year: y, month: m - 1, day: d }; // Month is 0-indexed for logic
    };

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            const { year: tYear, month: tMonth } = parseDateParts(t.date);

            let dateMatch = false;
            if (timeRange === 'month') {
                dateMatch = tYear === selectedYear && tMonth === selectedMonth;
            } else if (timeRange === 'quarter') {
                const qStart = selectedQuarter * 3;
                const qEnd = qStart + 2;
                dateMatch = tYear === selectedYear && tMonth >= qStart && tMonth <= qEnd;
            } else {
                dateMatch = tYear === selectedYear;
            }

            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || t.type === filterType;
            
            return matchesSearch && matchesType && dateMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, timeRange, selectedYear, selectedMonth, selectedQuarter, searchTerm, filterType]);

    // Totais do período filtrado
    const totalInflow = filtered.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
    const totalOutflow = filtered.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalInflow - totalOutflow;

    const clearFilters = () => {
        setSearchTerm('');
        setFilterType('all');
        setTimeRange('year');
        setSelectedYear(new Date().getFullYear());
    };

    return (
        <div className="w-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Toolbar - Sticky Top relative to page scroll is standard for tables */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 bg-slate-50 dark:bg-slate-950/50 rounded-t-2xl">
                
                {/* Top Row: Date Filters & Summary */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    
                    {/* Date Controls */}
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full xl:w-auto min-h-[56px]">
                        {/* Range Switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shrink-0 h-10 items-center">
                            <button onClick={() => setTimeRange('month')} className={`px-3 h-full rounded-md text-xs font-bold transition-all ${timeRange === 'month' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Mensal</button>
                            <button onClick={() => setTimeRange('quarter')} className={`px-3 h-full rounded-md text-xs font-bold transition-all ${timeRange === 'quarter' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Trimestral</button>
                            <button onClick={() => setTimeRange('year')} className={`px-3 h-full rounded-md text-xs font-bold transition-all ${timeRange === 'year' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Anual</button>
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                        {/* Selectors */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center flex-1 sm:flex-initial">
                            {timeRange === 'month' && (
                                <div className="relative min-w-[130px] h-10">
                                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="appearance-none pl-8 pr-8 h-full w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-amber-500 outline-none cursor-pointer">
                                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                    <Calendar className="w-4 h-4 absolute left-2.5 top-3 text-slate-500 pointer-events-none"/>
                                </div>
                            )}

                            {timeRange === 'quarter' && (
                                <div className="relative min-w-[130px] h-10">
                                    <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="appearance-none pl-8 pr-8 h-full w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-amber-500 outline-none cursor-pointer">
                                        {quarterNames.map((q, i) => <option key={i} value={i}>{q}</option>)}
                                    </select>
                                    <Filter className="w-4 h-4 absolute left-2.5 top-3 text-slate-500 pointer-events-none"/>
                                </div>
                            )}

                            <div className="flex items-center px-1 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shrink-0">
                                <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded h-full min-w-[32px] flex items-center justify-center"><ChevronLeft className="w-4 h-4"/></button>
                                <span className="text-xs font-bold px-2 min-w-[40px] text-center">{selectedYear}</span>
                                <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded h-full min-w-[32px] flex items-center justify-center"><ChevronRight className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>

                    {/* Period Summary */}
                    <div className="flex items-center gap-4 text-xs font-bold bg-white dark:bg-slate-900 p-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full xl:w-auto justify-between xl:justify-end min-h-[56px]">
                        <div className="text-emerald-600 flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase">Entradas</span>
                            <span>+ {totalInflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="text-red-600 flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase">Saídas</span>
                            <span>- {totalOutflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                        <div className={`${balance >= 0 ? 'text-emerald-600' : 'text-red-600'} flex flex-col items-end`}>
                            <span className="text-[10px] text-slate-400 uppercase">Saldo</span>
                            <span>{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Search & Actions - Fixed flex-wrap for tablets */}
                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                    <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto flex-1">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                            <input 
                                type="text" 
                                placeholder="Buscar lançamentos..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none w-full shadow-sm"
                            />
                        </div>
                        <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm self-start sm:self-auto shrink-0 h-11 items-center">
                            <button onClick={() => setFilterType('all')} className={`px-4 h-full text-xs font-bold rounded transition-colors ${filterType === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500'}`}>Todos</button>
                            <button onClick={() => setFilterType('inflow')} className={`px-4 h-full text-xs font-bold rounded transition-colors ${filterType === 'inflow' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'text-slate-500'}`}>Entradas</button>
                            <button onClick={() => setFilterType('outflow')} className={`px-4 h-full text-xs font-bold rounded transition-colors ${filterType === 'outflow' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'text-slate-500'}`}>Saídas</button>
                        </div>
                    </div>
                    
                    {/* Actions - Allow wrap on mobile/tablet */}
                    <div className="flex gap-2 w-full xl:w-auto justify-end flex-wrap shrink-0">
                        <button 
                            onClick={onSyncContracts}
                            disabled={isSyncing}
                            className="h-11 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-transform disabled:opacity-50 whitespace-nowrap flex-shrink-0 min-w-[48px]"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}/> 
                            {isSyncing ? 'Sincronizando...' : 'Buscar Contratos'}
                        </button>
                        <button 
                            onClick={handleCreateClick}
                            className="h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform whitespace-nowrap flex-shrink-0 min-w-[48px]"
                        >
                            <Plus className="w-4 h-4"/> Novo Lançamento
                        </button>
                    </div>
                </div>
            </div>

            {/* Table - Remove fixed overflow to allow page scroll */}
            <div className="w-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-5 dark:bg-slate-950 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm">
                        <tr>
                            <th className="p-4 font-medium w-32">Data</th>
                            <th className="p-4 font-medium">Descrição</th>
                            <th className="p-4 font-medium hidden sm:table-cell">Categoria</th>
                            <th className="p-4 font-medium text-right">Valor</th>
                            <th className="p-4 font-medium text-right w-24">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="w-8 h-8 opacity-20"/>
                                        <p>Nenhum lançamento encontrado neste período.</p>
                                        {transactions.length > 0 && (
                                            <button onClick={clearFilters} className="text-amber-500 text-xs font-bold hover:underline mt-2 p-2">
                                                Limpar filtros para ver {transactions.length} lançamentos antigos
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {filtered.map(t => {
                            const { day, month, year } = parseDateParts(t.date);
                            const displayDate = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
                            
                            return (
                                <tr 
                                    key={t.id} 
                                    onClick={() => handleEditClick(t)}
                                    className={`transition-colors group cursor-pointer min-h-[64px] ${t.isContract ? 'bg-emerald-50/30 dark:bg-emerald-900/5 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                >
                                    <td className="p-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-xs">{displayDate}</td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        {t.isContract && <span title="Recorrente (Contrato)"><RefreshCw className="w-3 h-3 text-emerald-500 shrink-0"/></span>}
                                        <span className="truncate max-w-[200px] sm:max-w-none">{t.description}</span>
                                    </td>
                                    <td className="p-4 hidden sm:table-cell">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-500 font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-bold ${t.type === 'inflow' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {t.type === 'inflow' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} 
                                                className="text-slate-400 hover:text-blue-500 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }} 
                                                className="text-slate-400 hover:text-red-500 p-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl p-6 animate-ios-pop border border-white/10 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {newTrans.id ? 'Editar Lançamento' : 'Adicionar Lançamento'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"><XCircle className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setNewTrans({...newTrans, type: 'inflow'})}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all min-h-[80px] justify-center ${newTrans.type === 'inflow' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}
                                >
                                    <ArrowUpCircle className="w-6 h-6"/> Entrada
                                </button>
                                <button 
                                    onClick={() => setNewTrans({...newTrans, type: 'outflow'})}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all min-h-[80px] justify-center ${newTrans.type === 'outflow' ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}
                                >
                                    <ArrowDownCircle className="w-6 h-6"/> Saída
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block">Descrição</label>
                                <input type="text" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="glass-input w-full p-3 h-12 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors"/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">Valor (R$)</label>
                                    <input type="number" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} className="glass-input w-full p-3 h-12 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">Data</label>
                                    <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="glass-input w-full p-3 h-12 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors"/>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block">Categoria</label>
                                <select value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="glass-input w-full p-3 h-12 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors bg-white dark:bg-slate-900 cursor-pointer">
                                    <optgroup label="Custos Diretos (COGS)">
                                        <option value="Infraestrutura">Infraestrutura (Servidores/API)</option>
                                        <option value="Operacional">Operacional (Suporte/Ferramentas)</option>
                                    </optgroup>
                                    <optgroup label="Despesas (OPEX)">
                                        <option value="Marketing">Marketing</option>
                                        <option value="Vendas">Vendas</option>
                                        <option value="Pessoal">Pessoal / Salários</option>
                                        <option value="Administrativo">Administrativo</option>
                                    </optgroup>
                                    <optgroup label="Receitas">
                                        <option value="Consultoria">Consultoria</option>
                                        <option value="Setup">Setup / Implantação</option>
                                        <option value="Outros">Outros</option>
                                    </optgroup>
                                </select>
                                <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                                    *Infraestrutura e Operacional contam como Custo Direto na Margem Bruta.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white min-h-[48px] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-8 py-3 rounded-lg text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg hover:opacity-90 transition-opacity min-h-[48px]">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
