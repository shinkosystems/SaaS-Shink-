
import { supabase } from './supabaseClient';
import { createTask } from './projectService';

export const createTicket = async (orgId: number, ticketData: { titulo: string, descricao: string, urgencia: number, email: string }) => {
    try {
        // 1. Registrar o ticket na tabela dedicada para auditoria
        const { data: ticket, error } = await supabase
            .from('chamados')
            .insert({
                titulo: ticketData.titulo,
                descricao: ticketData.descricao,
                urgencia: ticketData.urgencia,
                organizacao_id: orgId,
                email_contato: ticketData.email,
                status: 'Aberto'
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Localizar o Projeto de Suporte da Org
        const { data: project } = await supabase
            .from('projetos')
            .select('id')
            .eq('organizacao', orgId)
            .eq('nome', 'Central de Suporte & Voz do Cliente')
            .single();

        if (project) {
            // 3. Gerar Card no Kanban automaticamente
            // Mapeamos a urgência (1-5) para o score GUT
            await createTask({
                projeto: project.id,
                titulo: `[Chamado #${ticket.id.split('-')[0]}] ${ticketData.titulo}`,
                descricao: `Cliente: ${ticketData.email}\n\n${ticketData.descricao}`,
                status: 'todo',
                category: 'Suporte',
                gravidade: ticketData.urgencia,
                urgencia: ticketData.urgencia,
                tendencia: ticketData.urgencia,
                organizacao: orgId,
                duracaohoras: 2
            });
        }

        return { success: true, ticketId: ticket.id };
    } catch (e: any) {
        console.error("Erro ao criar ticket:", e.message);
        return { success: false, error: e.message };
    }
};

export const fetchOrganizationPublicInfo = async (orgId: number) => {
    const { data, error } = await supabase
        .from('organizacoes')
        .select('nome, logo, cor')
        .eq('id', orgId)
        .single();
    if (error) return null;
    return data;
};
