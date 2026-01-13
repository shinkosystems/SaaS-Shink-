
import { supabase } from './supabaseClient';
import { FinancialTransaction } from '../types';

const TABLE = 'transacoes';

export const fetchTransactions = async (organizationId: number): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

    if (error) return [];
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
        installments: row.installments,
        metadata: row.metadata || {}
    }));
};

/**
 * Atividade Baseada em Custos (ABC) Granular
 * Prioriza custos diretos apontados em usuários e cargos
 */
export const getOperationalRates = async (organizationId: number) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Busca Despesas Tecnológicas para rateio de infra
    const { data: trans } = await supabase
        .from(TABLE)
        .select('amount, category')
        .eq('organization_id', organizationId)
        .eq('type', 'outflow')
        .eq('category', 'Tecnológico')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    // 2. Busca Usuários e Cargos com seus custos apontados
    const { data: users } = await supabase
        .from('users')
        .select('id, custo_mensal, cargo')
        .eq('organizacao', organizationId)
        .eq('ativo', true);

    const { data: roles } = await supabase
        .from('area_atuacao')
        .select('id, custo_base')
        .eq('empresa', organizationId);

    const techTotal = trans?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;
    const numUsers = users?.length || 1;
    const totalHoursCapacity = numUsers * 160;

    // 3. Calcula o Custo Homem Médio baseado no APONTAMENTO REAL
    let totalRhCost = 0;
    const roleMap = new Map(roles?.map(r => [r.id, r.custo_base]) || []);

    users?.forEach(u => {
        const cost = u.custo_mensal || roleMap.get(u.cargo) || 0;
        totalRhCost += Number(cost);
    });

    if (totalRhCost === 0) {
        const { data: rhTrans } = await supabase
            .from(TABLE)
            .select('amount')
            .eq('organization_id', organizationId)
            .eq('type', 'outflow')
            .eq('category', 'RH')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
        totalRhCost = rhTrans?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;
    }

    // FALLBACK CRÍTICO: Se tudo estiver zerado, assume uma taxa de mercado para o dashboard não ficar vazio
    let manHourCost = totalRhCost / totalHoursCapacity;
    if (manHourCost === 0) manHourCost = 85.00; // Média de R$ 85,00/h se nada for configurado

    const techHourCost = techTotal / totalHoursCapacity;

    return {
        manHourCost,
        techHourCost,
        totalRate: manHourCost + techHourCost,
        capacity: totalHoursCapacity,
        rhTotal: totalRhCost,
        techTotal,
        isFallback: totalRhCost === 0
    };
};

export const addTransaction = async (transaction: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction[] | null> => {
    const { organizationId, isRecurring, installments, periodicity, ...baseData } = transaction;
    const records = [];
    const count = isRecurring ? (installments || 12) : 1;

    for (let i = 0; i < count; i++) {
        const date = new Date(baseData.date);
        if (periodicity === 'monthly') date.setMonth(date.getMonth() + i);
        else if (periodicity === 'quarterly') date.setMonth(date.getMonth() + (i * 3));
        else if (periodicity === 'yearly') date.setFullYear(date.getFullYear() + i);

        records.push({
            ...baseData,
            date: date.toISOString().split('T')[0],
            organization_id: organizationId,
            is_recurring: isRecurring,
            installments: installments,
            periodicity: periodicity
        });
    }

    const { data, error } = await supabase.from(TABLE).insert(records).select();
    if (error) return null;
    return data as any;
};

export const updateTransaction = async (t: FinancialTransaction) => {
    const { id, ...data } = t;
    const { error } = await supabase.from(TABLE).update({
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: t.date,
        type: t.type
    }).eq('id', id);
    return !error;
};

export const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
};

export const syncContractTransactions = async (organizationId: number) => {
    const { data: clients } = await supabase.from('clientes').select('*').eq('organizacao', organizationId).eq('status', 'Ativo');
    if (!clients) return { created: 0, errors: 0 };

    let created = 0;
    for (const client of clients) {
        if (!client.valormensal || client.valormensal <= 0) continue;
        const { data: existing } = await supabase.from(TABLE).select('id').eq('organization_id', organizationId).eq('metadata->contractId', client.id);
        if (existing && existing.length > 0) continue;

        const success = await addTransaction({
            amount: client.valormensal,
            description: `Mensalidade - ${client.nome}`,
            date: client.data_inicio || new Date().toISOString().split('T')[0],
            type: 'inflow',
            category: 'Vendas',
            organizationId,
            isRecurring: true,
            installments: client.meses || 12,
            periodicity: 'monthly',
            metadata: { contractId: client.id }
        });
        if (success) created += 1;
    }
    return { created, errors: 0 };
};
