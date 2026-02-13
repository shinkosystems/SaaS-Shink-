
import React, { useState, useEffect } from 'react';
import { FinancialDashboard } from './FinancialDashboard';
import { FinancialLedger } from './FinancialLedger';
import { LayoutDashboard, List, Loader2, DollarSign, CreditCard } from 'lucide-react';
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
        setLoading(true);
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
        setIsSyncing(true);
        const saved = await addTransaction({ ...t, organizationId: orgId });
        if (saved && saved.length > 0) {
            await loadData();
        } else {
            alert("Erro ao salvar transação.");
        }
        setIsSyncing(false);
    };

    const handleEditTransaction = async (t: FinancialTransaction) => {
        if (!orgId) return;
        const updated = await updateTransaction(t);
        if (!updated) { alert("Erro ao atualizar transação."); loadData(); }
        else loadData();
    };

    const handleDeleteTransaction = async (id: string) => {
        const success = await deleteTransaction(id);
        if (success) loadData();
        else alert("Erro ao excluir transação.");
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
        <div className="w-full min-h-screen flex flex-col animate-in fade-in duration-500 bg-white dark:bg-[#020203]">
            {/* Nubank-Style Header */}
            <header className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-8 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Finanças.</h2>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                            Saúde Financeira Industrial
                        </h2>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Fluxo de Caixa e Rentabilidade ABC</p>
                    </div>

                    <div className="flex bg-white/10 p-1.5 rounded-[1.8rem] border border-white/10 w-full md:w-fit">
                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white text-amber-500 shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            <LayoutDashboard className="w-4 h-4"/> Dashboard
                        </button>
                        <button 
                            onClick={() => setActiveTab('ledger')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-amber-500 shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            <List className="w-4 h-4"/> Lançamentos
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full px-4 md:px-0 pb-32">
                {loading ? (
                    <div className="w-full py-40 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-amber-500"/>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Ledger...</span>
                    </div>
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
