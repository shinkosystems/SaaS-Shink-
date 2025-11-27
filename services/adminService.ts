
import { supabase } from './supabaseClient';
import { DbPlan } from '../types';

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
    const { data, error } = await supabase.from('planos').select('*').order('valor');
    if (error) {
        console.error('Error fetching plans:', error);
        return [];
    }
    return data as DbPlan[];
}

export const fetchGlobalMetrics = async (startDate?: string, endDate?: string): Promise<GlobalMetrics> => {
    try {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Default: start of year
        
        // FIX: Adjust end date to cover the full day (23:59:59)
        const end = endDate ? new Date(endDate) : new Date(); 
        end.setHours(23, 59, 59, 999);

        // 1. Financial Metrics (Historical MRR from Subscription History)
        // We look for plans that were active during the period (overlap logic)
        // datainicio <= end AND (datafim >= start OR datafim IS NULL)
        let query = supabase
            .from('cliente_plano')
            .select('valor, datainicio, datafim, dono');

        // Optimizing: Only fetch records that started before the end of the period
        query = query.lte('datainicio', end.toISOString());
        
        const { data: historyData } = await query;

        // Filter overlap in memory to be safe with null dates
        const activeInPeriod = historyData?.filter(h => {
            const hStart = new Date(h.datainicio);
            const hEnd = h.datafim ? new Date(h.datafim) : new Date('2099-12-31');
            return hStart <= end && hEnd >= start;
        }) || [];

        // Unique Active Clients in Period
        const uniqueClients = new Set(activeInPeriod.map(h => h.dono));
        const activeClients = uniqueClients.size;

        // MRR Calculation (Sum of latest value for each client in period)
        // Strategy: "Exit MRR" (MRR at the end of the period)
        const exitMrrData = historyData?.filter(h => {
            const hStart = new Date(h.datainicio);
            const hEnd = h.datafim ? new Date(h.datafim) : new Date('2099-12-31');
            // Active AT the end date of the filter
            return hStart <= end && hEnd >= end;
        }) || [];
        
        // Dedup: if multiple plans for same user (rare but possible), take distinct sum
        const activeMap = new Map<string, number>();
        exitMrrData.forEach(h => activeMap.set(h.dono, h.valor));
        const totalMrr = Array.from(activeMap.values()).reduce((a, b) => a + b, 0);

        const avgTicket = activeClients > 0 ? totalMrr / activeClients : 0;

        // 2. Churn Rate
        // Simplified: Count users blocked currently. 
        // Ideally we would check users blocked WITHIN the date range, but 'status' is current state.
        // We use total blocked count as a proxy for all-time churn rate relative to total users.
        const { count: churnedCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Bloqueado');
        
        const { count: allTimeCustomers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('perfil', 'dono');
            
        const churnRate = allTimeCustomers ? (churnedCount || 0) / allTimeCustomers * 100 : 0;

        // Calculate LTV
        const churnDecimal = churnRate === 0 ? 0.01 : (churnRate / 100);
        const ltv = avgTicket / churnDecimal;

        // 3. Total Users (Growth in Period)
        let userQuery = supabase.from('users').select('created_at', { count: 'exact' });
        if (startDate) userQuery = userQuery.gte('created_at', start.toISOString());
        // Use adjusted end date
        if (endDate) userQuery = userQuery.lte('created_at', end.toISOString());
        const { count: usersInPeriod } = await userQuery;

        const { count: totalUsersAbsolute } = await supabase.from('users').select('*', { count: 'exact', head: true });

        // 4. Product Metrics (NPS in Period)
        let npsQuery = supabase.from('nps').select('nota');
        if (startDate) npsQuery = npsQuery.gte('created_at', start.toISOString());
        if (endDate) npsQuery = npsQuery.lte('created_at', end.toISOString());
        const { data: npsData } = await npsQuery;
        
        let npsScore = 0;
        if (npsData && npsData.length > 0) {
            const promoters = npsData.filter(n => n.nota >= 9).length;
            const detractors = npsData.filter(n => n.nota <= 6).length;
            npsScore = ((promoters - detractors) / npsData.length) * 100;
        }

        // 5. Engagement (Simulated based on period length)
        const mau = Math.floor((totalUsersAbsolute || 0) * 0.85);
        const dau = Math.floor(mau * 0.42);

        return {
            totalMrr,
            activeClients,
            totalUsers: usersInPeriod || 0,
            avgTicket,
            npsScore: Math.round(npsScore),
            churnRate,
            ltv,
            dau,
            mau
        };
    } catch (e) {
        console.error("Erro ao calcular métricas globais:", e);
        return { 
            totalMrr: 0, activeClients: 0, totalUsers: 0, avgTicket: 0,
            npsScore: 0, churnRate: 0, ltv: 0, dau: 0, mau: 0
        };
    }
};

export const fetchAllOwners = async (): Promise<AdminUser[]> => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select(`
                *,
                organizacoes (
                    id,
                    nome,
                    colaboradores
                )
            `)
            .eq('perfil', 'dono')
            .order('nome');

        if (error) {
            console.error('Erro ao buscar donos:', error);
            return [];
        }

        const userIds = users.map((u: any) => u.id);
        let subs: any[] = [];
        
        if (userIds.length > 0) {
            const { data } = await supabase
                .from('cliente_plano')
                .select(`
                    dono,
                    datainicio,
                    datafim,
                    plano (
                        id,
                        nome
                    )
                `)
                .in('dono', userIds)
                .order('created_at', { ascending: false });
            subs = data || [];
        }

        const mappedUsers = users.map((u: any) => {
            const latestSub: any = subs.find((s: any) => s.dono === u.id);
            const orgData = Array.isArray(u.organizacoes) ? u.organizacoes[0] : u.organizacoes;

            return {
                id: u.id,
                nome: u.nome,
                email: u.email,
                organizacao: u.organizacao,
                perfil: u.perfil,
                status: u.status,
                planName: latestSub?.plano?.nome || null,
                currentPlanId: latestSub?.plano?.id || null,
                subscription_start: latestSub?.datainicio || null,
                subscription_end: latestSub?.datafim || null,
                orgName: orgData?.nome || 'N/A',
                orgColaboradores: orgData?.colaboradores || 1,
                acessos: u.acessos || 0,
                ultimo_acesso: u.ultimo_acesso || null
            };
        });

        return mappedUsers;
    } catch (e) {
        console.error('Exceção ao buscar donos:', e);
        return [];
    }
};

interface UpdatePayload {
    userId: string;
    orgId: number;
    userName: string;
    orgName: string;
    orgLimit: number;
    userStatus: string; // ADDED THIS FIELD
    planId: number;
    start: string;
    end: string;
    value: number;
}

export const updateGlobalClientData = async (data: UpdatePayload): Promise<{ success: boolean, msg?: string }> => {
    try {
        const promises = [];

        if (data.userId) {
            promises.push(
                supabase.from('users').update({ 
                    nome: data.userName,
                    status: data.userStatus // Update Status Here
                }).eq('id', data.userId)
            );
        }

        if (data.orgId) {
            promises.push(
                supabase.from('organizacoes').update({ 
                    nome: data.orgName,
                    colaboradores: data.orgLimit
                }).eq('id', data.orgId)
            );
        }

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
            console.error("Erros parciais no update:", errors);
            const errorMessages = errors.map(e => {
                if (e.error) {
                    return e.error.message || e.error.details || JSON.stringify(e.error);
                }
                return "Erro desconhecido";
            });
            
            return { success: false, msg: errorMessages.join('; ') };
        }

        return { success: true };

    } catch (err: any) {
        console.error('Exceção no serviço de update global:', err);
        return { success: false, msg: err.message || JSON.stringify(err) };
    }
};

export const updateUserSubscription = async (userId: string, data: { planId: number, start: string, end: string, value: number }): Promise<{ success: boolean, msg?: string }> => {
    return { success: false, msg: "Função obsoleta. Use updateGlobalClientData." };
};

export const updateUserStatus = async (userId: string, newStatus: string): Promise<{ success: boolean }> => {
    const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
    
    if (error) {
        console.error('Error updating user status:', error.message);
        return { success: false };
    }
    return { success: true };
};
