
import { supabase } from './supabaseClient';

export const createStripePaymentIntent = async (
    // amount removido, o backend busca o preço
    planId: number, 
    planName: string,
    userId: string,
    email: string
): Promise<{ clientSecret: string; error?: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('payment-sheet', {
            body: {
                planId,
                planName,
                userId,
                email
            }
        });

        if (error) throw error;
        return { clientSecret: data.clientSecret };
    } catch (err: any) {
        console.error("Erro ao criar pagamento Stripe:", err);
        return { clientSecret: '', error: err.message };
    }
};

// --- NOVAS FUNÇÕES PARA MÓDULOS E PORTAL ---

export const createModuleCheckoutSession = async (
    moduleId: string,
    moduleName: string,
    price: number,
    userId: string,
    orgId: number
): Promise<{ url: string | null; error?: string }> => {
    try {
        // EM PRODUÇÃO: Isso chamaria uma Edge Function (ex: 'create-checkout')
        // const { data, error } = await supabase.functions.invoke('create-checkout', {
        //    body: { moduleId, orgId, price }
        // });
        // return { url: data.url };

        // SIMULAÇÃO PARA DEMONSTRAÇÃO:
        console.log(`[StripeService] Criando checkout para módulo ${moduleId} (Org: ${orgId}) - R$ ${price}`);
        
        // Retornamos um link fictício ou simulamos um delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Em um app real, isso seria https://checkout.stripe.com/c/pay/...
        return { url: 'https://buy.stripe.com/test_module_checkout' };

    } catch (err: any) {
        return { url: null, error: err.message };
    }
};

export const createCustomerPortalSession = async (userId: string): Promise<{ url: string | null }> => {
    try {
        // EM PRODUÇÃO: Chama Edge Function 'create-portal'
        console.log(`[StripeService] Gerando link do portal para ${userId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { url: 'https://billing.stripe.com/p/login/test' };
    } catch (err) {
        return { url: null };
    }
};
