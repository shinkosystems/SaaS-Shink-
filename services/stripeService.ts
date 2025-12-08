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