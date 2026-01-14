
import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';

export const PRICING_MODULES = [
    { id: 'gantt', label: 'Cronograma Gantt', price: 29.90 },
    { id: 'financial', label: 'Gestão Financeira', price: 39.90 },
    { id: 'crm', label: 'CRM de Vendas', price: 49.90 },
    { id: 'ia', label: 'Shinkō Guru AI', price: 59.90 },
    { id: 'engineering', label: 'Engenharia (DORA)', price: 69.90 },
    { id: 'whitelabel', label: 'White Label', price: 1500.00 }
];

export const calculateDynamicPrice = (users: number, selectedModuleIds: string[], billingCycle: 'monthly' | 'yearly') => {
    let basePrice = 0;
    let planId = 4; // Free

    if (users === 1) { basePrice = 89.90; planId = 1; }
    else if (users <= 5) { basePrice = 297.90; planId = 2; }
    else if (users <= 15) { basePrice = 899.90; planId = 3; }
    else { basePrice = 6500.00; planId = 10; } 

    const modulesPrice = selectedModuleIds.reduce((acc, id) => {
        const mod = PRICING_MODULES.find(m => m.id === id);
        return acc + (mod ? mod.price : 0);
    }, 0);

    const totalMonthly = basePrice + modulesPrice;
    const finalPrice = billingCycle === 'yearly' ? (totalMonthly * 0.8) : totalMonthly;

    return {
        total: finalPrice,
        planId,
        basePrice,
        modulesPrice
    };
};

export const mapDbPlanIdToString = (dbId: number | string): string => {
    const id = Number(dbId);
    if (id === 10) return 'plan_enterprise';
    switch (id) {
        case 1: return 'plan_solo';
        case 2: return 'plan_studio';
        case 3: return 'plan_scale';
        case 4: return 'plan_free';
        default: return 'plan_free';
    }
};

/**
 * Busca os planos disponíveis configurados no banco de dados
 */
export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
        const { data, error } = await supabase.from('planos').select('*').order('valor', { ascending: true });
        if (error) throw error;
        
        return (data || []).map(p => ({
            id: `plan_${p.id}`,
            dbId: p.id,
            name: p.nome,
            price: p.valor,
            features: p.descricao ? p.descricao.split('\n') : [],
            recommended: p.id === 2,
            cycle: p.meses >= 12 ? 'YEARLY' : 'MONTHLY',
            colabtotal: p.colabtotal || 1,
            meses: p.meses || 1,
            descricao_raw: p.descricao
        })) as SubscriptionPlan[];
    } catch (e) {
        console.error("Error fetching subscription plans:", e);
        return [];
    }
};

/**
 * Invoca a API Route (Vercel) para gerar o link de checkout no Asaas
 */
export const createAsaasCheckout = async (params: {
    userId: string;
    orgId: number;
    planId: number;
    value: number;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
}) => {
    try {
        // Chamada para a rota de API local (Vercel Bridge)
        const response = await fetch('/api/asaas-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Erro na requisição');

        // Retorna a URL de fatura do Asaas para redirecionamento
        return { success: true, url: data.invoiceUrl };
    } catch (e: any) {
        console.error("Erro no checkout Asaas:", e.message);
        return { success: false, error: e.message };
    }
};

export const getCurrentUserPlan = async (userId: string): Promise<string> => {
    try {
        const { data: userProfile } = await supabase.from('users').select('organizacao').eq('id', userId).single();
        if (userProfile?.organizacao) {
            const { data: orgData } = await supabase.from('organizacoes').select('plano').eq('id', userProfile.organizacao).single();
            if (orgData?.plano) return mapDbPlanIdToString(orgData.plano);
        }
        return 'plan_free';
    } catch (e) {
        return 'plan_free'; 
    }
};
