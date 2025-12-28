
import { supabase } from './supabaseClient';
import { DbPlan, FinancialTransaction } from '../types';
import { fetchSubscriptionPlans, mapDbPlanIdToString } from './asaasService';
import { updateOrgModulesByIds } from './organizationService';

export interface AdminUser {
    id: string;
    nome: string;
    email: string;
    organizacao: number;
    perfil: string;
    status: string;
    planName?: string;
    currentPlanId?: number;
    subscription_start?: string;
    subscription_end?: string;
    orgName?: string;
    orgColaboradores?: number;
    acessos?: number;
    ultimo_acesso?: string;
}

export interface GlobalMetrics {
    totalMrr: number;
    activeClients: number;
    totalUsers: number;
    avgTicket: number;
    npsScore: number;
    churnRate: number;
    ltv: number;
    dau: number; 
    mau: number; 
}

export const fetchPlans = async (): Promise<DbPlan[]> => {
    try {
        const plans = await fetchSubscriptionPlans();
        return plans.map(p => ({
            id: p.dbId || 0,
            nome: p.name,
            valor: p.price,
            meses: p.cycle === 'YEARLY' ? 12 : 1,
            descricao: p.features.join('\n'),
            colabtotal: 0 
        }));
    } catch (error: any) {
        return [];
    }
}

export const fetchGlobalMetrics = async (startDate?: string, endDate?: string): Promise<GlobalMetrics> => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date(); 
        end.setHours(23, 59, 59, 999);

        let totalMrr = 0;
        let activeClients = 0;
        let avgTicket = 0;

        const { data: historyData } = await supabase.from('cliente_plano').select('valor, datainicio, datafim, dono').lte('datainicio', end.toISOString());
        if (historyData) {
            const activeInPeriod = historyData.filter(h => {
                const hStart = new Date(h.datainicio);
                const hEnd = h.datafim ? new Date(h.datafim) : new Date('2099-12-31');
                return hStart <= end && hEnd >= start;
            });
            activeClients = new Set(activeInPeriod.map(h => h.dono)).size;
            totalMrr = historyData.reduce((acc, h) => acc + (h.valor || 0), 0) / 12; // Média simples
            avgTicket = activeClients > 0 ? totalMrr / activeClients : 0;
        }

        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        return {
            totalMrr,
            activeClients,
            totalUsers: totalUsers || 0,
            avgTicket,
            npsScore: 85,
            churnRate: 2,
            ltv: 5000,
            dau: Math.floor((totalUsers || 0) * 0.4),
            mau: Math.floor((totalUsers || 0) * 0.9)
        };
    } catch (e: any) {
        return { totalMrr: 0, activeClients: 0, totalUsers: 0, avgTicket: 0, npsScore: 0, churnRate: 0, ltv: 0, dau: 0, mau: 0 };
    }
};

export const fetchAllOwners = async (): Promise<AdminUser[]> => {
    try {
        const { data: users, error: userError } = await supabase.from('users').select('*').eq('perfil', 'dono').order('acessos', { ascending: false });
        if (userError || !users) return [];

        const orgIds = [...new Set(users.map((u: any) => u.organizacao).filter(Boolean))];
        let orgMap = new Map<number, any>();
        
        if (orgIds.length > 0) {
            const { data: orgs } = await supabase.from('organizacoes').select('id, nome, colaboradores, plano').in('id', orgIds);
            if (orgs) orgs.forEach((o: any) => orgMap.set(o.id, o));
        }

        const plans = await fetchPlans(); 
        const planMap = new Map(plans.map(p => [p.id, p.nome]));

        return users.map((u: any) => {
            const org = orgMap.get(u.organizacao) || {};
            const currentPlanId = org.plano || 4;
            return {
                id: u.id,
                nome: u.nome,
                email: u.email,
                organizacao: u.organizacao,
                perfil: u.perfil,
                status: u.status,
                planName: planMap.get(currentPlanId) || 'Free',
                currentPlanId: currentPlanId,
                orgName: org.nome || 'N/A',
                orgColaboradores: org.colaboradores || 1,
                acessos: u.acessos || 0,
                ultimo_acesso: u.ultimo_acesso || null
            };
        });
    } catch (e: any) { return []; }
};

export const updateGlobalClientData = async (data: any): Promise<{ success: boolean, msg?: string }> => {
    try {
        await supabase.from('users').update({ nome: data.userName, status: data.userStatus }).eq('id', data.userId);
        await supabase.from('organizacoes').update({ nome: data.orgName, colaboradores: data.orgLimit, plano: data.planId }).eq('id', data.orgId);
        return { success: true };
    } catch (err: any) { return { success: false, msg: err.message }; }
};

export const fetchPendingApprovals = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('transacoes').select('*, organizacoes(nome)').eq('pago', false).not('comprovante', 'is', null).order('date', { ascending: false });
    if (error) return [];
    return data.map((d: any) => ({
        id: d.id,
        date: d.date,
        description: d.description,
        amount: d.amount,
        type: d.type,
        category: d.category,
        organizationId: d.organization_id,
        pago: d.pago,
        comprovante: d.comprovante,
        orgName: d.organizacoes?.nome || 'Organização Desconhecida',
        metadata: d.metadata,
        modulos: d.modulos
    }));
};

export const approveSubscription = async (transactionId: string, orgId: number): Promise<{ success: boolean; msg?: string }> => {
    try {
        const { data: transData } = await supabase.from('transacoes').select('*').eq('id', transactionId).single();
        if (!transData) throw new Error("Transação não localizada.");

        const meta = transData.metadata || {};
        const moduleIds = transData.modulos;

        // 1. Marcar como Paga
        await supabase.from('transacoes').update({ pago: true }).eq('id', transactionId);

        // 2. Atualizar Organização (Plano, Vencimento, Colaboradores)
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);

        const orgUpdate: any = {
            vencimento: newExpiry.toISOString(),
            plano: meta.planId || 4
        };

        if (meta.users) orgUpdate.colaboradores = meta.users;

        await supabase.from('organizacoes').update(orgUpdate).eq('id', orgId);

        // 3. Liberar Módulos
        if (moduleIds && Array.isArray(moduleIds) && moduleIds.length > 0) {
            await updateOrgModulesByIds(orgId, moduleIds);
        }

        // 4. Salvar histórico
        await supabase.from('cliente_plano').insert({
            organizacao: orgId,
            plano: meta.planId || 4,
            datainicio: new Date().toISOString().split('T')[0],
            datafim: newExpiry.toISOString().split('T')[0],
            dono: transData.metadata?.userId || null // Tentamos pegar o UID se disponível
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, msg: e.message || "Erro desconhecido" };
    }
};
