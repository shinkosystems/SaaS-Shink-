import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';
import { fetchSystemModuleMap } from './organizationService';

// --- CONFIGURAÇÃO ---
const ALLOW_SIMULATION = true; // Permite simular o fluxo se a Edge Function falhar

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
            recommended: plan.id === 2, 
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

export interface AsaasPaymentResponse {
    payment: any;
    qrCode?: string;
    copyPaste?: string;
    bankSlipUrl?: string;
    invoiceUrl?: string;
    error?: string;
    isSimulated?: boolean;
}

export const createAsaasPayment = async (userId: string, billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO', value: number, description: string): Promise<AsaasPaymentResponse | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('asaas-integration', {
            body: { action: 'CREATE_PAYMENT', userId, billingType, value, description }
        });

        // Se houver erro na função ou ela não existir, usamos contingência se permitido
        if (error || !data) {
            console.warn("Edge Function Asaas falhou. Entrando em modo de simulação...");
            if (ALLOW_SIMULATION) return getSimulatedPayment(billingType, value);
            throw error || new Error("Resposta vazia da função");
        }
        
        const result = data as any;
        return {
            payment: result.payment,
            qrCode: result.qrCode,
            copyPaste: result.copyPaste,
            bankSlipUrl: result.payment?.bankSlipUrl,
            invoiceUrl: result.payment?.invoiceUrl || result.payment?.url 
        };
    } catch (e: any) {
        console.error("Erro na integração Asaas:", e.message);
        if (ALLOW_SIMULATION) return getSimulatedPayment(billingType, value);
        return null;
    }
};

// Gera dados fictícios para permitir o teste da UI sem depender da Edge Function ativa
const getSimulatedPayment = (type: string, value: number): AsaasPaymentResponse => {
    const mockId = `pay_${Math.random().toString(36).substr(2, 9)}`;
    return {
        isSimulated: true,
        payment: { id: mockId, value, status: 'PENDING', identificationField: '00190.00009 02305.050006 13075.210007 9 95000000035000' },
        qrCode: 'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMWEhIuIyV9LAAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAEFSURBVHja7dAxAQAADMOg+Te9OPrAA6S7ZgAAAAAA', // Mock QR pixel
        copyPaste: '00020101021226830014br.gov.bcb.pix0121suporte@shinko.com.br520400005303986540510.005802BR5915SHINKO SYSTEMS6009SAO PAULO62070503***6304E2D1',
        bankSlipUrl: '#',
        invoiceUrl: '#'
    };
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
            metadata: { ...metadata, planId, simulated: true },
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