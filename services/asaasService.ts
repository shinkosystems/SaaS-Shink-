import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';
import { fetchSystemModuleMap } from './organizationService';

// --- CONFIGURAÇÃO ---
const USE_REAL_ASAAS = true; 

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

export const getCurrentUserPlan = async (userId: string): Promise<string> => {
    try {
        const { data: userProfile } = await supabase.from('users').select('organizacao, perfil, email').eq('id', userId).single();
        if (!userProfile) return 'plan_free';

        if (userProfile.organizacao) {
            const { data: orgData } = await supabase.from('organizacoes').select('plano').eq('id', userProfile.organizacao).single();
            if (orgData && orgData.plano) return mapDbPlanIdToString(orgData.plano);
        }
        return 'plan_free';
    } catch (e) {
        return 'plan_free'; 
    }
};

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
        // Busca os dados diretamente da tabela planos conforme o novo schema
        const { data, error } = await supabase
            .from('planos')
            .select('id, nome, valor, colabtotal, meses, descricao')
            .order('valor', { ascending: true });
        
        if (error || !data) throw error;

        return data.map((plan: any) => ({
            id: mapDbPlanIdToString(plan.id),
            dbId: plan.id,
            name: plan.nome,
            price: Number(plan.valor),
            features: plan.descricao ? plan.descricao.split('\n').filter((f: string) => f.trim() !== '') : [],
            recommended: plan.id === 2, // Studio (ID 2) é o recomendado por padrão
            cycle: plan.meses >= 12 ? 'YEARLY' : 'MONTHLY',
            colabtotal: Number(plan.colabtotal),
            meses: Number(plan.meses),
            descricao_raw: plan.descricao
        }));
    } catch (err) {
        console.error("Erro ao carregar planos do banco:", err);
        return [];
    }
};

export const createAsaasPayment = async (userId: string, billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO', value: number, description: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('asaas-integration', {
            body: { action: 'CREATE_PAYMENT', userId, billingType, value, description }
        });
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Erro na integração Asaas:", e);
        return null;
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
        
        const moduleMap = await fetchSystemModuleMap();
        const moduleIds = metadata.modules.map(key => moduleMap[key.toLowerCase()]).filter(Boolean);

        const { error: insertError } = await supabase.from('transacoes').insert({
            organization_id: orgId,
            description: description,
            amount: totalAmount,
            type: 'inflow',
            category: 'Assinatura',
            date: new Date().toISOString().split('T')[0],
            pago: false,
            comprovante: urlData.publicUrl,
            metadata: { ...metadata, planId },
            modulos: moduleIds.length > 0 ? moduleIds : null
        });

        if (insertError) throw insertError;
        return { success: true };
    } catch (err: any) {
        console.error("Erro no envio:", err);
        return { success: false, error: err.message };
    }
};

export const getUserSubscriptions = async (userId: string): Promise<AsaasSubscription[]> => [];
export const getPaymentHistory = async (userId: string): Promise<AsaasPayment[]> => [];