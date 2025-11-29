
import React, { useState, useEffect } from 'react';
import { FinancialDashboard } from './FinancialDashboard';
import { FinancialLedger } from './FinancialLedger';
import { LayoutDashboard, List, Loader2 } from 'lucide-react';
import { FinancialTransaction } from '../types';
import { supabase } from '../services/supabaseClient';
import { fetchTransactions, addTransaction, updateTransaction, deleteTransaction, syncContractTransactions } from '../services/financialService';

export const FinancialScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger'>('dashboard');
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [orgId, setOrgId] = useState<number | null>(null);

    const loadData = async () => {
        // Se não for a carga inicial, não ativa o loading full screen
        if (transactions.length === 0) setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            if (userData && userData.organizacao) {
                setOrgId(userData.organizacao);
                
                // Busca transações reais (que agora incluem as importadas dos contratos)
                const data = await fetchTransactions(userData.organizacao);
                setTransactions(data);
            }
        }
        setLoading(false);
    };

    // Fetch Real Data
    useEffect(() => {
        loadData();
    }, []);

    const handleAddTransaction = async (t: Omit<FinancialTransaction, 'id'>) => {
        if (!orgId) return;
        
        // Otimistic update
        const tempId = crypto.randomUUID();
        const newT = { ...t, id: tempId, organizationId: orgId };
        setTransactions(prev => [newT, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const saved = await addTransaction({ ...t, organizationId: orgId });
        
        if (saved) {
            setTransactions(prev => prev.map(item => item.id === tempId ? saved : item));
        } else {
            setTransactions(prev => prev.filter(item => item.id !== tempId));
            alert("Erro ao salvar transação.");
        }
    };

    const handleEditTransaction = async (t: FinancialTransaction) => {
        if (!orgId) return;

        // Optimistic Update
        setTransactions(prev => prev.map(item => item.id === t.id ? t : item).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const updated = await updateTransaction(t);
        if (updated) {
            setTransactions(prev => prev.map(item => item.id === updated.id ? updated : item));
        } else {
            alert("Erro ao atualizar transação.");
            loadData(); // Revert on error
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        // Permitir deleção de qualquer transação agora que elas são reais no banco
        const backup = [...transactions];
        setTransactions(prev => prev.filter(t => t.id !== id));

        const success = await deleteTransaction(id);
        if (!success) {
            setTransactions(backup);
            alert("Erro ao excluir transação.");
        }
    };

    const handleSyncContracts = async () => {
        if (!orgId) return;
        setIsSyncing(true);
        const result = await syncContractTransactions(orgId);
        setIsSyncing(false);
        
        if (result.created > 0) {
            alert(`${result.created} parcelas de contratos foram lançadas com sucesso!`);
            loadData(); // Refresh list
        } else if (result.errors > 0) {
            alert("Houve um erro ao sincronizar alguns contratos.");
        } else {
            alert("Todos os contratos já estão sincronizados.");
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-500">
            
            {/* Tab Switcher */}
            <div className="flex justify-center mb-6">
                <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex shadow-inner">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'dashboard' 
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4"/> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'ledger' 
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <List className="w-4 h-4"/> Lançamentos
                    </button>
                </div>
            </div>

            {/* Content Area - No fixed height, no overflow hidden */}
            <div className="w-full">
                {loading ? (
                    <div className="w-full py-20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-shinko-primary"/>
                    </div>
                ) : (
                    activeTab === 'dashboard' ? (
                        <FinancialDashboard manualTransactions={transactions} />
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
