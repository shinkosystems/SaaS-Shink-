
import { supabase } from './supabaseClient';
import { FinancialTransaction } from '../types';

const TABLE = 'transacoes';

export const fetchTransactions = async (organizationId: number): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Erro ao buscar transações:', error.message || error);
        return [];
    }

    return data.map((row: any) => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: Number(row.amount),
        type: row.type,
        category: row.category,
        organizationId: row.organization_id,
        isContract: !!row.metadata?.contractId,
        isRecurring: !!row.is_recurring,
        periodicity: row.periodicity,
        installments: row.installments
    }));
};

export const addTransaction = async (transaction: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction[] | null> => {
    try {
        const transactionsToInsert: any[] = [];
        const installments = transaction.installments || 1;
        const startDate = new Date(transaction.date);
        
        // Se for recorrente, gera múltiplas linhas, senão gera apenas uma
        for (let i = 0; i < (transaction.isRecurring ? installments : 1); i++) {
            const currentDate = new Date(startDate);
            
            // Lógica de incremento de data conforme periodicidade
            if (transaction.isRecurring) {
                if (transaction.periodicity === 'monthly') {
                    currentDate.setMonth(startDate.getMonth() + i);
                } else if (transaction.periodicity === 'quarterly') {
                    currentDate.setMonth(startDate.getMonth() + (i * 3));
                } else if (transaction.periodicity === 'semiannual') {
                    currentDate.setMonth(startDate.getMonth() + (i * 6));
                } else if (transaction.periodicity === 'yearly') {
                    currentDate.setFullYear(startDate.getFullYear() + i);
                }
            }

            transactionsToInsert.push({
                date: currentDate.toISOString().split('T')[0],
                description: transaction.isRecurring && installments > 1 
                    ? `${transaction.description} (${i + 1}/${installments})` 
                    : transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                organization_id: transaction.organizationId,
                is_recurring: transaction.isRecurring,
                periodicity: transaction.periodicity,
                installments: transaction.installments,
                metadata: {
                    isRecurringChild: i > 0,
                    sequence: i + 1
                }
            });
        }

        const { data, error } = await supabase
            .from(TABLE)
            .insert(transactionsToInsert)
            .select();

        if (error) throw error;

        return data.map((row: any) => ({
            id: row.id,
            date: row.date,
            description: row.description,
            amount: Number(row.amount),
            type: row.type,
            category: row.category,
            organizationId: row.organization_id,
            isRecurring: row.is_recurring,
            periodicity: row.periodicity,
            installments: row.installments
        }));
    } catch (error: any) {
        console.error('Erro ao adicionar transação(ões):', error.message || error);
        return null;
    }
};

export const updateTransaction = async (transaction: FinancialTransaction): Promise<FinancialTransaction | null> => {
    const { id, ...updates } = transaction;
    
    const payload = {
        date: updates.date,
        description: updates.description,
        amount: updates.amount,
        type: updates.type,
        category: updates.category,
        organization_id: updates.organizationId,
        is_recurring: updates.isRecurring,
        periodicity: updates.periodicity,
        installments: updates.installments
    };

    const { data, error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar transação:', error.message);
        return null;
    }

    return {
        id: data.id,
        date: data.date,
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        organizationId: data.organization_id,
        isContract: !!(data.metadata?.contractId),
        isRecurring: data.is_recurring,
        periodicity: data.periodicity,
        installments: data.installments
    };
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao deletar transação:', error.message || error);
        return false;
    }
    return true;
};

export const syncContractTransactions = async (organizationId: number): Promise<{ created: number, errors: number }> => {
    try {
        const { data: clients, error: clientsError } = await supabase
            .from('clientes')
            .select('*')
            .eq('organizacao', organizationId)
            .neq('status', 'Bloqueado'); 

        if (clientsError || !clients) throw new Error("Erro ao buscar clientes: " + (clientsError?.message || 'Sem dados'));

        const { data: existingTrans, error: transError } = await supabase
            .from(TABLE)
            .select('metadata')
            .eq('organization_id', organizationId)
            .not('metadata', 'is', null);

        if (transError) throw new Error("Erro ao buscar transações existentes: " + transError.message);

        const existingSet = new Set<string>();
        existingTrans?.forEach((t: any) => {
            if (t.metadata?.contractId !== undefined && t.metadata?.installmentIndex !== undefined) {
                existingSet.add(`${t.metadata.contractId}-${t.metadata.installmentIndex}`);
            }
        });

        const transactionsToInsert: any[] = [];

        clients.forEach((client: any) => {
            const startDateStr = client.data_inicio;
            const monthlyValue = Number(client.valormensal);
            const durationMonths = Number(client.meses || 12);

            if (!startDateStr || !monthlyValue) return;

            const start = new Date(startDateStr);
            start.setHours(12, 0, 0, 0); 

            for (let i = 0; i < durationMonths; i++) {
                const uniqueKey = `${client.id}-${i}`;

                if (existingSet.has(uniqueKey)) continue;

                const installmentDate = new Date(start);
                installmentDate.setMonth(start.getMonth() + i);
                const isoDate = installmentDate.toISOString().split('T')[0];

                transactionsToInsert.push({
                    organization_id: organizationId,
                    date: isoDate,
                    description: `Mensalidade - ${client.nome} (${i + 1}/${durationMonths})`,
                    amount: monthlyValue,
                    type: 'inflow',
                    category: 'Receita Recorrente',
                    metadata: {
                        contractId: client.id,
                        installmentIndex: i,
                        isAutoGenerated: true
                    }
                });
            }
        });

        if (transactionsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from(TABLE)
                .insert(transactionsToInsert);

            if (insertError) {
                console.error("Erro no insert em lote:", insertError.message);
                return { created: 0, errors: transactionsToInsert.length };
            }
        }

        return { created: transactionsToInsert.length, errors: 0 };

    } catch (error: any) {
        console.error("Falha na sincronização:", error.message || error);
        return { created: 0, errors: 1 };
    }
};
