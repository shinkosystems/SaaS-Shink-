
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
            // Recarrega todos os dados para garantir sincronia correta com o banco
            await loadData();
            if (saved.length > 1) {
                alert(`${saved.length} lançamentos recorrentes foram criados com sucesso!`);
            }
        } else {
            alert("Erro ao salvar transação.");
        }
        setIsSyncing(false);
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
        <div className="w-full min-h-screen flex flex-col animate-in fade-in duration-500 max-w-[1600px] mx-auto p-6 md:p-12">
            
            {/* Header em Linha Única */}
            <div className="flex flex-row justify-between items-center mb-12 shrink-0 border-b border-slate-200 dark:border-white/5 pb-8">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Saúde <span className="text-amber-500">Financeira</span>.
                    </h1>
                    <p className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">FLUXO DE CAIXA E RENTABILIDADE</p>
                </div>

                <div className="glass-panel p-1.5 rounded-[1.8rem] flex shadow-xl border-slate-200 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-xl shrink-0">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-3 px-8 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-black shadow-glow-amber' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-4 h-4"/> <span className="hidden md:inline">Dashboard</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-3 px-8 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-amber-500 text-black shadow-glow-amber' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <List className="w-4 h-4"/> <span className="hidden md:inline">Lançamentos</span>
                    </button>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-32">
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
