
import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';
import { fetchSystemModuleMap } from './organizationService';

// --- CONFIGURAÇÃO ---
const USE_REAL_ASAAS = true; 
const FIXED_PAYMENT_LINK = 'https://www.asaas.com/c/3xh5fsyxc16odebg';

// Módulos disponíveis para contratação manual
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
    else { basePrice = 6500.00; planId = 10; } // Enterprise

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

const FALLBACK_PLANS: SubscriptionPlan[] = [
    { id: 'plan_free', dbId: 4, name: 'Free', price: 0.00, features: ['1 Projeto', '1 Usuário'], recommended: false, cycle: 'MONTHLY' },
    { id: 'plan_solo', dbId: 1, name: 'Core Solo', price: 89.90, features: ['1 Usuário'], recommended: false, cycle: 'MONTHLY' },
    { id: 'plan_studio', dbId: 2, name: 'Core Studio', price: 297.90, features: ['Até 5 Usuários'], recommended: true, cycle: 'MONTHLY' },
    { id: 'plan_scale', dbId: 3, name: 'Core Scale', price: 899.90, features: ['Até 15 Usuários'], recommended: false, cycle: 'MONTHLY' },
    { id: 'plan_enterprise', dbId: 10, name: 'Enterprise', price: 6500.00, features: ['Usuários Ilimitados'], recommended: false, cycle: 'MONTHLY' }
];

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

export const getCurrentUserPlan = async (userId: string): Promise<string> => {
    try {
        const { data: userProfile } = await supabase.from('users').select('organizacao, perfil, email').eq('id', userId).single();
        if (!userProfile) return 'plan_free';

        // Override Super Admin
        if (userProfile.email === 'peboorba@gmail.com' || userProfile.email === 'shinkosystems@gmail.com') return 'plan_enterprise';

        if (userProfile.organizacao) {
            const { data: orgData } = await supabase.from('organizacoes').select('plano').eq('id', userProfile.organizacao).single();
            if (orgData && orgData.plano) return mapDbPlanIdToString(orgData.plano);
        }
        return 'plan_free';
    } catch (e) {
        return 'plan_free'; 
    }
};

export const uploadReceiptAndNotify = async (
    userId: string,
    orgId: number,
    planId: number,
    totalAmount: number,
    receiptFile: File,
    description: string,
    metadata: { users: number; modules: string[] }
): Promise<{ success: boolean; error?: string }> => {
    try {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `comprovantes/${orgId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('documentos').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName);
        
        // Mapear chaves de módulos para IDs do banco
        const moduleMap = await fetchSystemModuleMap();
        const moduleIds = metadata.modules.map(key => moduleMap[key]).filter(Boolean);

        const { error: insertError } = await supabase.from('transacoes').insert({
            organization_id: orgId,
            description: description,
            amount: totalAmount,
            type: 'inflow',
            category: 'Assinatura',
            date: new Date().toISOString().split('T')[0],
            pago: false,
            comprovante: urlData.publicUrl,
            metadata: { ...metadata, planId }, // Guardamos a intenção de plano aqui
            modulos: moduleIds.length > 0 ? moduleIds : null
        });

        if (insertError) throw insertError;
        return { success: true };
    } catch (err: any) {
        console.error("Erro no envio:", err);
        return { success: false, error: err.message };
    }
};

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
        const { data, error } = await supabase.from('planos').select('*').order('valor', { ascending: true });
        if (error || !data) return FALLBACK_PLANS;
        return data.map((plan: any) => ({
            id: mapDbPlanIdToString(plan.id),
            dbId: plan.id,
            name: plan.nome,
            price: Number(plan.valor),
            features: plan.descricao ? plan.descricao.split('\n') : [],
            recommended: plan.id === 2,
            cycle: plan.meses >= 12 ? 'YEARLY' : 'MONTHLY'
        }));
    } catch (err) {
        return FALLBACK_PLANS;
    }
};

export const getUserSubscriptions = async (userId: string): Promise<AsaasSubscription[]> => [];
export const createAsaasPayment = async (u: string, b: string, v: number, d: string) => null;
export const getPaymentHistory = async (userId: string): Promise<AsaasPayment[]> => [];
