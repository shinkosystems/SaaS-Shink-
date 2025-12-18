
import React, { useState, useEffect } from 'react';
import { FinancialDashboard } from './FinancialDashboard';
import { FinancialLedger } from './FinancialLedger';
import { LayoutDashboard, List, Loader2 } from 'lucide-react';
import { FinancialTransaction } from '../types';
import { supabase } from '../services/supabaseClient';
import { fetchTransactions, addTransaction, updateTransaction, deleteTransaction, syncContractTransactions } from '../services/financialService';

interface Props {
    orgType?: string;
}

export const FinancialScreen: React.FC<Props> = ({ orgType }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger'>('dashboard');
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [orgId, setOrgId] = useState<number | null>(null);

    const loadData = async () => {
        if (transactions.length === 0) setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            if (userData && userData.organizacao) {
                setOrgId(userData.organizacao);
                const data = await fetchTransactions(userData.organizacao);
                setTransactions(data);
            }
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleAddTransaction = async (t: Omit<FinancialTransaction, 'id'>) => {
        if (!orgId) return;
        const tempId = crypto.randomUUID();
        const newT = { ...t, id: tempId, organizationId: orgId };
        setTransactions(prev => [newT, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        const saved = await addTransaction({ ...t, organizationId: orgId });
        if (saved) setTransactions(prev => prev.map(item => item.id === tempId ? saved : item));
        else { setTransactions(prev => prev.filter(item => item.id !== tempId)); alert("Erro ao salvar transação."); }
    };

    const handleEditTransaction = async (t: FinancialTransaction) => {
        if (!orgId) return;
        setTransactions(prev => prev.map(item => item.id === t.id ? t : item).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        const updated = await updateTransaction(t);
        if (!updated) { alert("Erro ao atualizar transação."); loadData(); }
    };

    const handleDeleteTransaction = async (id: string) => {
        const backup = [...transactions];
        setTransactions(prev => prev.filter(t => t.id !== id));
        const success = await deleteTransaction(id);
        if (!success) { setTransactions(backup); alert("Erro ao excluir transação."); }
    };

    const handleSyncContracts = async () => {
        if (!orgId) return;
        setIsSyncing(true);
        const result = await syncContractTransactions(orgId);
        setIsSyncing(false);
        if (result.created > 0) { alert(`${result.created} parcelas lançadas!`); loadData(); }
        else if (result.errors > 0) alert("Erro ao sincronizar contratos.");
        else alert("Tudo sincronizado.");
    };

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
            <div className="flex justify-center mb-8 shrink-0">
                <div className="glass-panel p-1 rounded-2xl flex shadow-sm">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-black shadow-glow-amber' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-4 h-4"/> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-amber-500 text-black shadow-glow-amber' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <List className="w-4 h-4"/> Lançamentos
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                {loading ? (
                    <div className="w-full py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500"/></div>
                ) : (
                    activeTab === 'dashboard' ? (
                        <FinancialDashboard manualTransactions={transactions} orgType={orgType} />
                    ) : (
                        <FinancialLedger 
                            transactions={transactions} 
                            onAddTransaction={handleAddTransaction}
                            onEditTransaction={handleEditTransaction}
                            onDeleteTransaction={handleDeleteTransaction}
                            onSyncContracts={handleSyncContracts}
                            isSyncing={isSyncing}
                        />
                    )
                )}
            </div>
        </div>
    );
};
