import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { supabase } from './supabaseClient';

// --- CONFIGURAÇÃO ---
// TRUE = Tenta usar Supabase Edge Function. 
// Se falhar, o sistema fará fallback automático para Mock para não quebrar a UI.
const USE_REAL_ASAAS = true; 

// Link fixo gerado pelo cliente
const FIXED_PAYMENT_LINK = 'https://www.asaas.com/c/3xh5fsyxc16odebg';

// Default fallback plans
const FALLBACK_PLANS: SubscriptionPlan[] = [
    {
        id: 'plan_free',
        name: 'Free',
        price: 0,
        features: [
            '1 Usuário (Dono)',
            'Até 3 Projetos Ativos',
            'Metodologia Shinkō',
            'Kanban & Cronograma',
            'Sem Módulo Financeiro'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_consultant',
        name: 'Usuário',
        price: 89.90,
        features: [
            '1 Usuário Adicional',
            'Projetos Ilimitados',
            'Framework Shinkō (RDE & Prio-6)',
            'Gantt & Kanban',
            'IA Generativa Básica'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_studio',
        name: 'Studio',
        price: 297.00,
        features: [
            'Até 5 Usuários',
            'Tudo do Usuário +',
            'Módulo Financeiro & Contratos',
            'Portal do Cliente Ilimitado',
            'IA Leitura de Documentos (OCR)'
        ],
        recommended: true,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_scale',
        name: 'Scale',
        price: 799.00,
        features: [
            'Até 15 Usuários',
            'Tudo do Studio +',
            'Métricas de Engenharia (DORA)',
            'Métricas de Produto (NPS/KPIs)',
            'IA Avançada & Prioridade'
        ],
        recommended: false,
        cycle: 'MONTHLY'
    },
    {
        id: 'plan_agency',
        name: 'Agency',
        price: 1500.00,
        features: [
            'Tudo do Scale +',
            'Whitelabel Completo',
            'Painel de Gestão de Clientes',
            'Suporte Prioritário',
            'Taxa de R$ 49/usuário'
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
        value: 297.90,
        netValue: 290.00,
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

export const getCurrentUserPlan = async (userId: string): Promise<string> => {
    try {
        // 1. Get user's org and profile
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('organizacao, perfil')
            .eq('id', userId)
            .single();

        if (profileError || !userProfile) {
            console.warn("User profile not found for plan check, defaulting to free.");
            return 'plan_free';
        }

        let ownerId = userId;
        // 2. If user is not the owner, find the owner of the organization
        if (userProfile.perfil !== 'dono' && userProfile.organizacao) {
            const { data: ownerProfile, error: ownerError } = await supabase
                .from('users')
                .select('id')
                .eq('organizacao', userProfile.organizacao)
                .eq('perfil', 'dono')
                .limit(1)
                .single();
            
            if (ownerError || !ownerProfile) {
                // This case can happen if org has no owner, fallback to free
                return 'plan_free';
            }
            ownerId = ownerProfile.id;
        }

        // 3. Query the subscription plan using the owner's ID
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
            return 'plan_free'; // Subscription expired
        }
        
        // 4. Map plan name from DB to internal plan ID
        const planName = subData.plano?.nome?.toLowerCase() || '';
        if (planName.includes('agency')) return 'plan_agency';
        if (planName.includes('scale')) return 'plan_scale';
        if (planName.includes('studio')) return 'plan_studio';
        if (planName.includes('consultant')) return 'plan_consultant';

        return 'plan_free';

    } catch (e) {
        console.error("Error getting user plan:", e);
        return 'plan_free'; // Default fallback
    }
};

// A função `createSubscriptionAndGetLink`, que estava causando instabilidade, foi removida.
// Foi substituída por um fluxo de pagamento manual com envio de comprovante.
export const uploadReceiptAndNotify = async (
    userId: string,
    planId: string,
    planPrice: number,
    receiptFile: File
): Promise<{ success: boolean; error?: string }> => {
    try {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `comprovantes/${userId}-${planId}-${Date.now()}.${fileExt}`;

        // Usa o bucket 'documentos' para simplificar, idealmente seria 'comprovantes'
        const { error: uploadError } = await supabase.storage
            .from('documentos') 
            .upload(fileName, receiptFile);

        if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(fileName);

        if (!urlData?.publicUrl) throw new Error("Não foi possível obter a URL do arquivo.");
        
        // Assume a existência da tabela 'pagamentos_pendentes'
        const { error: insertError } = await supabase
            .from('pagamentos_pendentes')
            .insert({
                user_id: userId,
                plan_id: planId,
                receipt_url: urlData.publicUrl,
                valor: planPrice,
                status: 'PENDENTE'
            });

        if (insertError) throw new Error(`Erro ao registrar pagamento: ${insertError.message}`);
        
        return { success: true };
    } catch (err: any) {
        console.error("Erro no envio de comprovante:", err);
        return { success: false, error: err.message };
    }
};

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    try {
        // Tenta buscar do banco de dados (Tabela 'plans' ou 'produtos')
        // Estrutura esperada: id, name, price, features (json/array), recommended (bool), active (bool)
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
                // Map DB Plan to UI Plan ID for logic
                let planId = 'plan_free';
                const nameLower = plan.nome.toLowerCase();
                if (nameLower.includes('agency')) planId = 'plan_agency';
                else if (nameLower.includes('scale')) planId = 'plan_scale';
                else if (nameLower.includes('studio')) planId = 'plan_studio';
                else if (nameLower.includes('consultant')) planId = 'plan_consultant';

                return {
                    id: planId,
                    name: plan.nome,
                    price: Number(plan.valor),
                    features: plan.descricao ? [plan.descricao] : [], // Simple description mapping
                    recommended: nameLower.includes('studio'),
                    cycle: 'MONTHLY'
                };
            });
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
                // Fallback: Retorna vazio em vez de mock para não exibir dados falsos.
                return [];
            }
            
            return data.subscriptions || [];

        } catch (err) {
            // Fallback: Retorna vazio em vez de mock.
            return [];
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
                let errorMsg = "Erro de comunicação com o servidor de pagamentos.";
                try {
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
                // Fallback: Retorna vazio para não exibir dados falsos.
                return []; 
            }
            
            return data.payments || [];

        } catch (err) {
            console.error("Erro de conexão (Catch):", err);
            // Fallback: Retorna vazio.
            return [];
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
    return [
        {
            id: 'sub_mock_123',
            dateCreated: new Date(Date.now() - 86400000 * 15).toISOString(),
            customer: userId,
            billingType: 'CREDIT_CARD',
            cycle: 'MONTHLY',
            value: 297.00,
            nextDueDate: new Date(Date.now() + 86400000 * 15).toISOString(), 
            status: 'ACTIVE',
            description: 'Assinatura Studio - Shinkō OS'
        }
    ];
}