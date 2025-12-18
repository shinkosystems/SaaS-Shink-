
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
    // Subscription fields mapped from relation
    planName?: string;
    currentPlanId?: number;
    subscription_start?: string;
    subscription_end?: string;
    // Organization fields
    orgName?: string;
    orgColaboradores?: number;
    // Access Tracking
    acessos?: number;
    ultimo_acesso?: string;
}

export interface GlobalMetrics {
    totalMrr: number;
    activeClients: number;
    totalUsers: number;
    avgTicket: number;
    // New Product Indicators
    npsScore: number;
    churnRate: number;
    ltv: number;
    dau: number; // Daily Active Users (Est.)
    mau: number; // Monthly Active Users (Est.)
    periodLabel?: string;
}

export const fetchPlans = async (): Promise<DbPlan[]> => {
    try {
        // Use the robust service from asaasService which has fallbacks
        const plans = await fetchSubscriptionPlans();
        
        // Map SubscriptionPlan back to DbPlan format for admin usage
        return plans.map(p => ({
            id: p.dbId || 0,
            nome: p.name,
            valor: p.price,
            meses: p.cycle === 'YEARLY' ? 12 : 1,
            descricao: p.features.join('\n'),
            colabtotal: 0 // Not strictly needed for display
        }));
    } catch (error: any) {
        console.error('Error fetching plans:', error.message || error);
        return [];
    }
}

export const fetchGlobalMetrics = async (startDate?: string, endDate?: string): Promise<GlobalMetrics> => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Default: start of year
        
        const end = endDate ? new Date(endDate) : new Date(); 
        end.setHours(23, 59, 59, 999);

        // 1. Financial Metrics (Historical MRR from Subscription History)
        let totalMrr = 0;
        let activeClients = 0;
        let avgTicket = 0;

        try {
            let query = supabase
                .from('cliente_plano')
                .select('valor, datainicio, datafim, dono');

            query = query.lte('datainicio', end.toISOString());
            
            const { data: historyData, error: historyError } = await query;
            if (historyError) throw historyError;

            if (historyData) {
                // Filter overlap in memory
                const activeInPeriod = historyData.filter(h => {
                    const hStart = new Date(h.datainicio);
                    const hEnd = h.datafim ? new Date(h.datafim) : new Date('2099-12-31');
                    return hStart <= end && hEnd >= start;
                });

                const uniqueClients = new Set(activeInPeriod.map(h => h.dono));
                activeClients = uniqueClients.size;

                // MRR Calculation (Exit MRR)
                const exitMrrData = historyData.filter(h => {
                    const hStart = new Date(h.datainicio);
                    const hEnd = h.datafim ? new Date(h.datafim) : new Date('2099-12-31');
                    return hStart <= end && hEnd >= end;
                });
                
                const activeMap = new Map<string, number>();
                exitMrrData.forEach(h => activeMap.set(h.dono, h.valor));
                totalMrr = Array.from(activeMap.values()).reduce((a, b) => a + b, 0);
                avgTicket = activeClients > 0 ? totalMrr / activeClients : 0;
            }
        } catch (err: any) {
            console.warn("Erro parcial (Financeiro):", err.message);
        }

        // 2. Churn & LTV
        let churnRate = 0;
        let ltv = 0;
        try {
            const { count: churnedCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Bloqueado');
            
            const { count: allTimeCustomers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('perfil', 'dono');
                
            churnRate = allTimeCustomers ? (churnedCount || 0) / allTimeCustomers * 100 : 0;
            const churnDecimal = churnRate === 0 ? 0.01 : (churnRate / 100);
            ltv = avgTicket / churnDecimal;
        } catch (err) {}

        // 3. Total Users
        let totalUsers = 0;
        try {
            let userQuery = supabase.from('users').select('created_at', { count: 'exact' });
            if (startDate) userQuery = userQuery.gte('created_at', start.toISOString());
            if (endDate) userQuery = userQuery.lte('created_at', end.toISOString());
            const { count } = await userQuery;
            totalUsers = count || 0;
        } catch (err) {}

        // 4. NPS
        let npsScore = 0;
        try {
            let npsQuery = supabase.from('nps').select('nota');
            if (startDate) npsQuery = npsQuery.gte('created_at', start.toISOString());
            if (endDate) npsQuery = npsQuery.lte('created_at', end.toISOString());
            const { data: npsData } = await npsQuery;
            
            if (npsData && npsData.length > 0) {
                const promoters = npsData.filter(n => n.nota >= 9).length;
                const detractors = npsData.filter(n => n.nota <= 6).length;
                npsScore = ((promoters - detractors) / npsData.length) * 100;
            }
        } catch (err) {}

        // 5. Engagement (Simulated/Proxy)
        const { count: totalUsersAbsolute } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const mau = Math.floor((totalUsersAbsolute || 0) * 0.85);
        const dau = Math.floor(mau * 0.42);

        return {
            totalMrr,
            activeClients,
            totalUsers,
            avgTicket,
            npsScore: Math.round(npsScore),
            churnRate,
            ltv,
            dau,
            mau
        };
    } catch (e: any) {
        console.error("Erro crítico em métricas globais:", e.message || e);
        return { 
            totalMrr: 0, activeClients: 0, totalUsers: 0, avgTicket: 0,
            npsScore: 0, churnRate: 0, ltv: 0, dau: 0, mau: 0
        };
    }
};

export const fetchAllOwners = async (): Promise<AdminUser[]> => {
    try {
        // 1. Fetch Users directly (Dono only)
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('perfil', 'dono')
            .order('acessos', { ascending: false }); // Prioritize active users

        if (userError) throw userError;
        if (!users) return [];

        // 2. Fetch Organizations Manually
        const orgIds = [...new Set(users.map((u: any) => u.organizacao).filter(Boolean))];
        let orgMap = new Map<number, any>();
        
        if (orgIds.length > 0) {
            const { data: orgs, error: orgError } = await supabase
                .from('organizacoes')
                .select('id, nome, colaboradores, plano')
                .in('id', orgIds);
                
            if (!orgError && orgs) {
                orgs.forEach((o: any) => orgMap.set(o.id, o));
            }
        }

        // 3. Fetch Plans to map ID to Name
        const plans = await fetchPlans(); 
        const planMap = new Map();
        plans.forEach(p => planMap.set(p.id, p.nome));

        // 4. Merge Data with Business Logic Overrides
        return users.map((u: any) => {
            const org = orgMap.get(u.organizacao) || {};
            
            // PRIORITY LOGIC FOR ADMIN DISPLAY
            let currentPlanId = org.plano || 4;
            
            // Override for Master Users
            if (u.email === 'peboorba@gmail.com') {
                currentPlanId = 10; // Enterprise
            } else if (u.email === 'gabriel.araujo@shinko.com.br' || u.nome === 'Gabriel Araújo') {
                currentPlanId = 3; // Scale
            } else if (u.nome.includes('Cleinte Plano 1')) {
                currentPlanId = 2; // Studio
            }

            const currentPlanName = planMap.get(currentPlanId) || 'Free';

            return {
                id: u.id,
                nome: u.nome,
                email: u.email,
                organizacao: u.organizacao,
                perfil: u.perfil,
                status: u.status,
                planName: currentPlanName,
                currentPlanId: currentPlanId,
                orgName: org.nome || 'N/A',
                orgColaboradores: org.colaboradores || 1,
                acessos: u.acessos || 0,
                ultimo_acesso: u.ultimo_acesso || null
            };
        });

    } catch (e: any) {
        console.error('Exceção ao buscar donos:', e.message || e);
        return [];
    }
};

interface UpdatePayload {
    userId: string;
    orgId: number;
    userName: string;
    orgName: string;
    orgLimit: number;
    userStatus: string; 
    planId: number;
    start: string;
    end: string;
    value: number;
}

export const updateGlobalClientData = async (data: UpdatePayload): Promise<{ success: boolean, msg?: string }> => {
    try {
        const promises = [];

        // 1. Update User Basic Info
        if (data.userId) {
            promises.push(
                supabase.from('users').update({ 
                    nome: data.userName,
                    status: data.userStatus
                }).eq('id', data.userId)
            );
        }

        // 2. Update Organization Info (Limit & Name)
        if (data.orgId) {
            const orgUpdatePayload: any = {
                nome: data.orgName,
                colaboradores: data.orgLimit
            };
            
            // CONNECTING PLAN TO ORGANIZATION
            if (data.planId) {
                orgUpdatePayload.plano = data.planId;
            }

            promises.push(
                supabase.from('organizacoes').update(orgUpdatePayload).eq('id', data.orgId)
            );
        }

        // 3. Register Subscription History (Ledger)
        if (data.planId) {
            const subPayload = {
                dono: data.userId,
                plano: data.planId,
                datainicio: data.start ? data.start : new Date().toISOString().split('T')[0],
                datafim: data.end ? data.end : null,
                valor: data.value
            };
            promises.push(
                supabase.from('cliente_plano').insert(subPayload)
            );
        }

        const results = await Promise.all(promises);
        
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            const errorMessages = errors.map(e => e.error?.message || "Erro desconhecido");
            return { success: false, msg: errorMessages.join('; ') };
        }

        return { success: true };

    } catch (err: any) {
        console.error('Exceção no serviço de update global:', err);
        return { success: false, msg: err.message || JSON.stringify(err) };
    }
};

export const updateUserStatus = async (userId: string, newStatus: string): Promise<{ success: boolean }> => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);
        
        if (error) {
            console.error('Error updating user status:', error.message);
            return { success: false };
        }
        return { success: true };
    } catch (e) {
        console.error('Exception updating user status:', e);
        return { success: false };
    }
};

// --- APPROVALS LOGIC ---

export const fetchPendingApprovals = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
        .from('transacoes')
        .select('*, organizacoes(nome)')
        .eq('pago', false)
        .not('comprovante', 'is', null)
        .neq('comprovante', '') // Filter empty strings
        .order('date', { ascending: false });

    if (error) {
        console.error("Erro ao buscar aprovações pendentes:", error);
        return [];
    }

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
        orgName: d.organizacoes?.nome || 'Organização Desconhecida'
    }));
};

export const approveSubscription = async (transactionId: string, orgId: number): Promise<{ success: boolean; msg?: string }> => {
    try {
        console.log(`[AdminService] Approving Transaction: ${transactionId} for Org: ${orgId}`);

        if (!transactionId) throw new Error("Transaction ID is missing");
        if (!orgId) throw new Error("Organization ID is missing");

        // 1. Marcar transação como Paga
        const { error: transError } = await supabase
            .from('transacoes')
            .update({ pago: true })
            .eq('id', transactionId) 
            .select();

        if (transError) {
            console.error("Trans update error:", transError);
            throw new Error(`Falha ao atualizar transação: ${transError.message}`);
        }

        // 2. Atualizar vencimento da organização (+30 dias)
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);

        const { error: orgError } = await supabase
            .from('organizacoes')
            .update({ vencimento: newExpiry.toISOString() })
            .eq('id', orgId)
            .select(); 

        if (orgError) {
            console.error("Org update error:", orgError);
            throw new Error(`Falha ao atualizar vencimento: ${orgError.message}`);
        }

        // 3. Provisionamento Automático
        const { data: transData } = await supabase
            .from('transacoes')
            .select('metadata, modulos')
            .eq('id', transactionId)
            .single();

        if (transData) {
            const meta = transData.metadata || {};
            const modulesArray = transData.modulos;

            if (meta.users) {
                await supabase
                    .from('organizacoes')
                    .update({ colaboradores: meta.users })
                    .eq('id', orgId);
            }

            if (modulesArray && Array.isArray(modulesArray) && modulesArray.length > 0) {
                await updateOrgModulesByIds(orgId, modulesArray);
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error("Erro na aprovação:", e);
        return { success: false, msg: e.message || "Erro desconhecido" };
    }
};
