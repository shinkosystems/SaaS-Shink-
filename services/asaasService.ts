


import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';

// --- CONFIGURAÇÃO ---
// TRUE = Tenta usar Supabase Edge Function. 
// Se falhar, o sistema fará fallback automático para Mock para não quebrar a UI.
const USE_REAL_ASAAS = true; 

// Link fixo gerado pelo cliente
const FIXED_PAYMENT_LINK = 'https://www.asaas.com/c/3xh5fsyxc16odebg';

// Updated Fallback Plans based on new Pricing Structure
const FALLBACK_PLANS: SubscriptionPlan[] = [
    {
        id: 'plan_free',
        dbId: 4,
        name: 'Free',
        price: 0.00,
        features: [
            'Apenas 1 Projeto Ativo',
            '1 Usuário (Dono)',
            'Sem acesso a IA',
            'Kanban & Cronograma Básico'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_usuario',
        dbId: 1,
        name: 'Básico',
        price: 99.90,
        features: [
            '1 Usuário',
            'Projetos Ilimitados',
            'Framework Shinkō Básico (6 etapas)',
            'Kanban e Cronograma Básico',
            'Sem Financeiro',
            'IA Limitada'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_studio',
        dbId: 2,
        name: 'Studio',
        price: 349.00,
        features: [
            'Pequenas Agências e Times de Produto',
            'Até 5 Usuários inclusos',
            'Módulo Financeiro (MRR/Conciliação)',
            'Portal do Cliente (Modo Leitura)',
            'IA Generativa (BPMN e Tasks)'
        ],
        recommended: true,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_scale',
        dbId: 3,
        name: 'Governança',
        price: 1990.00,
        features: [
            'Empresas em Crescimento',
            'Até 25 Usuários inclusos',
            'Score PRIO-6 Ilimitado',
            'Matriz Visual de Projetos (MVV)',
            'Nivelamento de Recursos (AI)',
            'Suporte Prioritário'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_enterprise',
        dbId: 10,
        name: 'Enterprise',
        price: 6500.00,
        features: [
            'Uso Ilimitado de todas as ferramentas',
            'IA Completa: Gerador de Fluxo (BPMS), Enriquecimento',
            'Portal do Cliente Interativo: Aprovação de Milestones',
            'White Label / Branding Personalizado',
            'SLA de Suporte Prioritário'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    }
];

// --- DADOS MOCKADOS (FALLBACK DE EMERGÊNCIA) ---
let MOCK_PAYMENTS: AsaasPayment[] = [
    {
        id: 'pay_mock_1',
        dateCreated: new Date(Date.now() - 86400000 * 30).toISOString(),
        customer: 'cus_000001',
        paymentLink: null,
        value: 349.00,
        netValue: 340.00,
        billingType: 'CREDIT_CARD',
        status: 'RECEIVED',
        description: 'Assinatura Studio (Fallback Mode)',
        invoiceUrl: '#'
    }
];

// --- FUNÇÕES ---

export const getFixedPaymentLink = () => FIXED_PAYMENT_LINK;

export const calculateSubscriptionStatus = (lastPaymentDate: string | Date) => {
    const paymentDate = new Date(lastPaymentDate);
    const expireDate = new Date(paymentDate);
    expireDate.setDate(expireDate.getDate() + 30); // Ciclo de 30 dias

    const today = new Date();
    const timeDiff = expireDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
        isValid: daysRemaining > 0,
        daysRemaining,
        expireDate,
        shouldWarn: daysRemaining <= 5 && daysRemaining > 0
    };
};

export const mapDbPlanIdToString = (dbId: number | string): string => {
    const id = Number(dbId);
    
    // Check for ID 10 specifically first (Enterprise)
    if (id === 10) return 'plan_enterprise';
    
    // Check for IDs 6 and 8 (TRIAL)
    if (id === 6 || id === 8) return 'plan_trial';
    
    // Check for ID 5 (Agency - maps to legacy or enterprise features depending on logic)
    if (id === 5) return 'plan_agency';

    switch (id) {
        case 1: return 'plan_usuario';
        case 2: return 'plan_studio';
        case 3: return 'plan_scale';
        case 4: return 'plan_free';
        case 9: return 'plan_scale'; // Mapeamento do plano Governança (ID 9)
        default: return 'plan_free';
    }
};

export const getCurrentUserPlan = async (userId: string): Promise<string> => {
    try {
        // 1. Get user profile to find organization
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('organizacao, perfil, email')
            .eq('id', userId)
            .single();

        if (profileError || !userProfile) {
            return 'plan_free';
        }

        // SUPER ADMIN OVERRIDE
        if (userProfile.email === 'peboorba@gmail.com') {
            return 'plan_enterprise';
        }

        // 2. PRIORITY CHECK (CONNECTION): Check the 'plano' column on the 'organizacoes' table directly.
        // This confirms the connection: User -> Organization -> Plan
        if (userProfile.organizacao) {
            const { data: orgData, error: orgError } = await supabase
                .from('organizacoes')
                .select('plano')
                .eq('id', userProfile.organizacao)
                .single();

            if (!orgError && orgData && orgData.plano) {
                // Return the plan attached to the organization
                return mapDbPlanIdToString(orgData.plano);
            }
        }

        // 3. Fallback: Check subscription history (cliente_plano) 
        // This is only for users not yet migrated to the new org-based plan structure
        let ownerId = userId;
        if (userProfile.perfil !== 'dono' && userProfile.organizacao) {
            const { data: ownerProfile } = await supabase
                .from('users')
                .select('id')
                .eq('organizacao', userProfile.organizacao)
                .eq('perfil', 'dono')
                .limit(1)
                .single();
            
            if (ownerProfile) ownerId = ownerProfile.id;
        }

        const { data: subData, error: subError } = await supabase
            .from('cliente_plano')
            .select('datafim, plano (id, nome)')
            .eq('dono', ownerId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (subError || !subData) {
            return 'plan_free';
        }

        const endDate = new Date(subData.datafim || '2099-12-31');
        if (endDate < new Date()) {
            return 'plan_free';
        }
        
        return mapDbPlanIdToString(subData.plano?.id || 4);

    } catch (e) {
        console.error("Error getting user plan:", e);
        return 'plan_free'; 
    }
};

export const uploadReceiptAndNotify = async (
    userId: string,
    planId: string,
    planPrice: number,
    receiptFile: File
): Promise<{ success: boolean; error?: string }> => {
    try {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `comprovantes/${userId}-${planId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('documentos') 
            .upload(fileName, receiptFile);

        if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(fileName);

        if (!urlData?.publicUrl) throw new Error("Não foi possível obter a URL do arquivo.");
        
        // Removed table 'pagamentos_pendentes' usage as it doesn't exist in schema
        // Just return success for now (mocking the notification part)
        
        return { success: true };
    } catch (err: any) {
        console.error("Erro no envio de comprovante:", err);
        return { success: false, error: err.message };
    }
};

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
        const { data, error } = await supabase
            .from('planos')
            .select('*')
            .order('valor', { ascending: true });

        if (error) {
            console.warn("Erro ao buscar planos do banco (usando fallback):", error.message);
            return FALLBACK_PLANS;
        }

        if (data && data.length > 0) {
            return data.map((plan: any) => {
                const planKey = mapDbPlanIdToString(plan.id);
                const featuresList = plan.descricao ? plan.descricao.split('\n').filter((s: string) => s.trim().length > 0) : [];

                return {
                    id: planKey,
                    dbId: plan.id,
                    name: plan.nome,
                    price: Number(plan.valor),
                    features: featuresList.length > 0 ? featuresList : FALLBACK_PLANS.find(p => p.id === planKey)?.features || [],
                    recommended: plan.id === 2,
                    cycle: 'MONTHLY'
                };
            }).sort((a,b) => {
                const order = ['plan_free', 'plan_usuario', 'plan_studio', 'plan_scale', 'plan_agency', 'plan_enterprise'];
                return order.indexOf(a.id) - order.indexOf(b.id);
            });
        }
        
        return FALLBACK_PLANS;
    } catch (err) {
        console.error("Erro fatal ao buscar planos:", err);
        return FALLBACK_PLANS;
    }
};

export const getUserSubscriptions = async (userId: string): Promise<AsaasSubscription[]> => {
    if (USE_REAL_ASAAS) {
        try {
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: { action: 'GET_SUBSCRIPTIONS', userId }
            });
            if (error) return [];
            return data.subscriptions || [];
        } catch (err) { return []; }
    }
    return _mockGetSubscriptions(userId);
};

export const createAsaasPayment = async (userId: string, billingType: 'PIX' | 'CREDIT_CARD', value: number, description: string) => {
    return _createMockPayment(userId, billingType, value, description); 
};

export const getPaymentHistory = async (userId: string): Promise<AsaasPayment[]> => {
    if (USE_REAL_ASAAS) {
        try {
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: { action: 'GET_HISTORY', userId }
            });
            if (error) return [];
            return data.payments || [];
        } catch (err) { return []; }
    }
    return Promise.resolve(MOCK_PAYMENTS);
};

const _createMockPayment = async (userId: string, billingType: string, value: number, description: string) => {
    await new Promise(r => setTimeout(r, 1500));
    const newPayment: AsaasPayment = {
        id: `pay_${Math.floor(Math.random() * 1000000)}`,
        dateCreated: new Date().toISOString(),
        customer: userId,
        paymentLink: null,
        value: value,
        netValue: value * 0.99,
        billingType: billingType as any,
        status: 'PENDING',
        description: description,
        invoiceUrl: '#'
    };
    if (billingType === 'PIX') {
        return {
            payment: newPayment,
            qrCode: 'mock-qrcode', 
            copyPaste: 'mock-pix-copy-paste'
        };
    }
    return { payment: newPayment };
}

const _mockGetSubscriptions = async (userId: string): Promise<AsaasSubscription[]> => {
    await new Promise(r => setTimeout(r, 600));
    return [];
}