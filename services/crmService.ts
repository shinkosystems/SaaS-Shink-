
import { supabase } from './supabaseClient';
import { CrmOpportunity } from '../types';
import { createClient } from './clientService';
import { addTransaction } from './financialService';

const TABLE = 'crm_opportunities';

// Mappers to translate DB snake_case to TS camelCase/Nested
const mapDbToOpp = (row: any): CrmOpportunity => ({
    id: row.id,
    organizationId: row.organizacao,
    title: row.titulo,
    value: row.valor || 0,
    probability: row.probabilidade || 0,
    stage: row.estagio,
    expectedCloseDate: row.data_fechamento_prevista || new Date().toISOString(),
    owner: row.responsavel || 'Eu',
    createdAt: row.created_at,
    lastInteraction: row.updated_at,
    contact: {
        name: row.contato_nome || '',
        role: row.contato_cargo || '',
        email: row.contato_email || '',
        phone: row.contato_telefone || '',
        source: row.origem || ''
    },
    company: {
        name: row.empresa_nome || '',
        cnpj: row.empresa_cnpj || '',
        sector: row.empresa_setor || '',
        address: row.empresa_endereco || ''
    },
    activities: row.atividades || []
});

const mapOppToDb = (opp: CrmOpportunity) => ({
    organizacao: opp.organizationId,
    titulo: opp.title,
    valor: opp.value,
    probabilidade: opp.probability,
    estagio: opp.stage,
    data_fechamento_prevista: opp.expectedCloseDate,
    responsavel: opp.owner === 'Eu' ? undefined : opp.owner,
    
    // Flattened Fields
    contato_nome: opp.contact.name,
    contato_email: opp.contact.email,
    contato_cargo: opp.contact.role,
    contato_telefone: opp.contact.phone,
    origem: opp.contact.source,
    
    empresa_nome: opp.company.name,
    empresa_cnpj: opp.company.cnpj,
    empresa_setor: opp.company.sector,
    empresa_endereco: opp.company.address,
    
    atividades: opp.activities
});

export const fetchCrmOpportunities = async (organizationId?: number): Promise<CrmOpportunity[]> => {
    if (!organizationId) return [];

    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('organizacao', organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar CRM:', error.message);
        return [];
    }

    return data.map(mapDbToOpp);
};

// --- NEW FINALIZATION LOGIC ---
export interface FinalizeDealPayload {
    opportunityId: string;
    clientData: {
        name: string;
        email: string;
        phone: string;
        document: string; // CPF/CNPJ
        type: 'Física' | 'Jurídica';
        address: string;
    };
    financialData: {
        amount: number;
        date: string;
        description: string;
        isContract: boolean;
        months?: number;
    };
}

export const finalizeDeal = async (payload: FinalizeDealPayload, organizationId: number) => {
    try {
        console.log("Finalizando Negócio...", payload);

        // 1. Update Opportunity Stage to WON
        await updateCrmOpportunityStage(payload.opportunityId, 'won');

        // 2. Create Client
        const newClient = await createClient({
            nome: payload.clientData.name,
            email: payload.clientData.email,
            telefone: payload.clientData.phone,
            cnpj: payload.clientData.document,
            tipo_pessoa: payload.clientData.type,
            endereco: payload.clientData.address,
            valormensal: payload.financialData.isContract ? payload.financialData.amount : 0,
            meses: payload.financialData.months || 12,
            status: 'Ativo',
            data_inicio: payload.financialData.date,
            organizacao: organizationId
        });

        // 3. Create Transaction (First Payment)
        // If it's a contract, we assume the first payment happens now.
        // The contract syncing logic handles future payments.
        await addTransaction({
            amount: payload.financialData.amount,
            description: payload.financialData.description,
            type: 'inflow',
            category: 'Vendas',
            date: payload.financialData.date,
            organizationId: organizationId
        });

        return { success: true, clientId: newClient?.id };

    } catch (e: any) {
        console.error("Erro ao finalizar negócio:", e);
        throw new Error(e.message || "Erro na automação de fechamento.");
    }
};

export const updateCrmOpportunityStage = async (id: string, newStage: string): Promise<boolean> => {
    // If it's a temp ID, we can't update in DB
    if (id === 'temp' || id.length < 10) return false;

    const { error } = await supabase
        .from(TABLE)
        .update({ estagio: newStage, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar estágio:', error.message);
        return false;
    }

    // NOTE: Automatic trigger removed. 
    // "Won" logic is now handled explicitly via finalizeDeal to allow user input.

    return true;
};

export const saveCrmOpportunity = async (opp: CrmOpportunity): Promise<CrmOpportunity> => {
    if (!opp.organizationId) {
        console.error("Erro: ID da Organização obrigatório para salvar negócio.");
        throw new Error("Organização não definida.");
    }

    const payload = mapOppToDb(opp);
    
    // Get current user to set as owner if it's new
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    if (currentUserId && (!payload.responsavel || payload.responsavel === 'Eu')) {
        // @ts-ignore
        payload.responsavel = currentUserId; 
    }

    let query;
    // Check if it's a new insertion (temp ID) or update
    if (opp.id === 'temp' || !opp.id) {
        // Insert
        query = supabase.from(TABLE).insert(payload).select().single();
    } else {
        // Update
        query = supabase.from(TABLE).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', opp.id).select().single();
    }

    const { data, error } = await query;

    if (error) {
        console.error('Erro ao salvar oportunidade:', error.message);
        throw error;
    }

    return mapDbToOpp(data);
};

export const deleteCrmOpportunity = async (id: string): Promise<boolean> => {
    if (id === 'temp') return true;

    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao deletar oportunidade:', error.message);
        return false;
    }
    return true;
};
