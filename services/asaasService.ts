
import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';

// --- CONFIGURAÇÃO ---
// TRUE = Tenta usar Supabase Edge Function. 
// Se falhar, o sistema fará fallback automático para Mock para não quebrar a UI.
const USE_REAL_ASAAS = true; 

// Link fixo gerado pelo cliente
const FIXED_PAYMENT_LINK = 'https://www.asaas.com/c/3xh5fsyxc16odebg';

// Default fallback plans in case DB is empty or not set up yet
const FALLBACK_PLANS: SubscriptionPlan[] = [
    {
        id: 'plan_scale',
        name: 'Scale',
        price: 79.90,
        features: [
            'Projetos Ilimitados', 
            'Até 5 Colaboradores', 
            'IA Gemini Integrada', 
            'Upload de Arquivos (5GB)',
            'Kanban Avançado & Storytime'
        ],
        recommended: true,
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
        value: 79.90,
        netValue: 78.00,
        billingType: 'CREDIT_CARD',
        status: 'RECEIVED',
        description: 'Assinatura Scale (Fallback Mode)',
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

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
        // Tenta buscar do banco de dados (Tabela 'plans' ou 'produtos')
        // Estrutura esperada: id, name, price, features (json/array), recommended (bool), active (bool)
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('active', true)
            .order('price', { ascending: true });

        if (error) {
            console.warn("Erro ao buscar planos do banco (usando fallback):", error.message);
            return FALLBACK_PLANS;
        }

        if (data && data.length > 0) {
            return data.map((plan: any) => ({
                id: plan.id.toString(),
                name: plan.name,
                price: Number(plan.price),
                features: Array.isArray(plan.features) ? plan.features : (plan.features ? JSON.parse(plan.features) : []),
                recommended: plan.recommended,
                cycle: plan.cycle || 'MONTHLY'
            }));
        }
        
        return FALLBACK_PLANS;
    } catch (err) {
        console.error("Erro fatal ao buscar planos:", err);
        return FALLBACK_PLANS;
    }
};

export const getUserSubscriptions = async (userId: string): Promise<AsaasSubscription[]> => {
    // 1. TENTATIVA MODO REAL
    if (USE_REAL_ASAAS) {
        try {
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: {
                    action: 'GET_SUBSCRIPTIONS',
                    userId
                }
            });

            if (error) {
                console.warn("SHINKO DEBUG: Falha ao buscar assinaturas reais.", error);
                // Fallback se a função não existir ou falhar
                return _mockGetSubscriptions(userId);
            }
            
            // O endpoint do Asaas retorna { data: [], ... }, então a edge function deve retornar { subscriptions: [...] }
            return data.subscriptions || [];

        } catch (err) {
            console.error("Erro de conexão ao buscar assinaturas:", err);
            return _mockGetSubscriptions(userId);
        }
    }

    // 2. MODO MOCK
    return _mockGetSubscriptions(userId);
};

export const createAsaasPayment = async (
    userId: string, 
    billingType: 'PIX' | 'CREDIT_CARD', 
    value: number,
    description: string
): Promise<{ payment: AsaasPayment, qrCode?: string, copyPaste?: string }> => {
    
    // 1. TENTATIVA MODO REAL (Via Supabase Edge Function)
    if (USE_REAL_ASAAS) {
        try {
            console.log("Iniciando transação segura via Shinkō Edge...");
            
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: {
                    action: 'CREATE_PAYMENT',
                    userId,
                    billingType,
                    value,
                    description
                }
            });

            // Tratamento específico de erro da Edge Function
            if (error) {
                // Tenta ler o corpo do erro se disponível
                let errorMsg = "Erro de comunicação com o servidor de pagamentos.";
                try {
                    // Às vezes o erro vem como string JSON no message
                    const body = error instanceof Error ? error.message : JSON.stringify(error);
                    console.error("SHINKO DEBUG - Edge Function Error:", body);
                } catch (e) {}
                throw new Error(errorMsg);
            }

            if (data?.error) {
                console.error("SHINKO DEBUG - Asaas API Error:", data.error);
                throw new Error(data.error || "Pagamento recusado.");
            }

            if (!data || !data.payment) {
                throw new Error("Resposta inválida do processador.");
            }

            return {
                payment: data.payment,
                qrCode: data.qrCode,     
                copyPaste: data.copyPaste 
            };

        } catch (err: any) {
            console.error("Falha crítica no pagamento real:", err);
            // Em criação de pagamento, NÃO fazemos fallback silencioso para Mock para evitar falsa sensação de pagamento.
            // Apenas repassamos o erro para a UI avisar o usuário.
            throw err; 
        }
    }

    // 2. MODO MOCK (DEV ONLY)
    return _createMockPayment(userId, billingType, value, description);
};

export const getPaymentHistory = async (userId: string): Promise<AsaasPayment[]> => {
    // 1. TENTATIVA MODO REAL
    if (USE_REAL_ASAAS) {
        try {
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: {
                    action: 'GET_HISTORY',
                    userId
                }
            });

            if (error) {
                console.warn("SHINKO DEBUG: Falha ao buscar histórico real.");
                // Fallback gracioso para array vazio ou mock
                return MOCK_PAYMENTS; 
            }
            
            return data.payments || [];

        } catch (err) {
            console.error("Erro de conexão (Catch):", err);
            return MOCK_PAYMENTS; // Fallback para Mock
        }
    }

    // 2. MODO MOCK
    await new Promise(r => setTimeout(r, 800));
    return MOCK_PAYMENTS;
};

export const checkPaymentStatus = async (paymentId: string): Promise<AsaasPayment | null> => {
    if (USE_REAL_ASAAS) {
        try {
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: { action: 'CHECK_STATUS', paymentId }
            });
            
            if (error) return null;
            return data.payment;
        } catch (e) {
            return null;
        }
    }

    // Mock Logic
    await new Promise(r => setTimeout(r, 500));
    const p = MOCK_PAYMENTS.find(pay => pay.id === paymentId);
    if (p && Math.random() > 0.3) {
        p.status = 'RECEIVED';
    }
    return p || null;
};

// --- PRIVATE HELPER MOCK ---
const _createMockPayment = async (userId: string, billingType: string, value: number, description: string) => {
    console.warn("Usando Mock de Pagamento (Dev Mode)");
    await new Promise(r => setTimeout(r, 1500));

    const newPayment: AsaasPayment = {
        id: `pay_${Math.floor(Math.random() * 1000000)}`,
        dateCreated: new Date().toISOString(),
        customer: userId,
        paymentLink: `https://www.asaas.com/c/mock${Date.now()}`,
        value: value,
        netValue: value * 0.99,
        billingType: billingType as any,
        status: 'PENDING',
        description: description,
        invoiceUrl: '#'
    };
    
    MOCK_PAYMENTS = [newPayment, ...MOCK_PAYMENTS];

    if (billingType === 'PIX') {
        return {
            payment: newPayment,
            qrCode: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg', 
            copyPaste: '00020126360014BR.GOV.BCB.PIX0114+551199999999952040000530398654041.005802BR5913Shinko System6008Sao Paulo62070503***6304E2CA'
        };
    }

    return { payment: newPayment };
}

const _mockGetSubscriptions = async (userId: string): Promise<AsaasSubscription[]> => {
    await new Promise(r => setTimeout(r, 600));
    
    // Mock de uma assinatura ativa para testes de UI
    // Em produção, isso só retornaria se a Edge Function falhasse
    return [
        {
            id: 'sub_mock_123',
            dateCreated: new Date(Date.now() - 86400000 * 15).toISOString(),
            customer: userId,
            billingType: 'CREDIT_CARD',
            cycle: 'MONTHLY',
            value: 79.90,
            nextDueDate: new Date(Date.now() + 86400000 * 15).toISOString(), // Daqui 15 dias
            status: 'ACTIVE',
            description: 'Assinatura Scale - Shinkō OS'
        }
    ];
}