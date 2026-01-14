
import { supabase } from './supabaseClient';
import { PLAN_LIMITS } from '../types';

const ORG_TABLE = 'organizacoes';
const LOGO_BUCKET = 'fotoperfil'; 

export const SYSTEM_MODULES_DEF = [
    'projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'engineering', 'product', 'ia', 'whitelabel', 'assets'
];

export const getPlanDefaultModules = (planId: number): string[] => {
    return SYSTEM_MODULES_DEF;
};

// --- FUNÇÕES DE GESTÃO DE MÓDULOS ---

export const fetchSystemModuleMap = async (): Promise<Record<string, number>> => {
    try {
        const { data, error } = await supabase.from('modulos').select('id, nome');
        if (error) throw error;
        const map: Record<string, number> = {};
        data?.forEach((m: any) => {
            map[m.nome.toLowerCase()] = m.id;
        });
        return map;
    } catch (e) {
        console.error("Error fetching module map:", e);
        return {};
    }
};

export const fetchActiveOrgModules = async (orgId: number): Promise<string[]> => {
    try {
        if (!orgId) return [];
        const { data: relations, error: relError } = await supabase
            .from('organizacao_modulo')
            .select('modulo')
            .eq('organizacao', orgId);
        
        if (relError) throw relError;
        if (!relations || relations.length === 0) return [];

        const moduleIds = relations.map(r => r.modulo).filter(id => id !== null);
        if (moduleIds.length === 0) return [];

        const { data: moduleNames, error: nameError } = await supabase
            .from('modulos')
            .select('nome')
            .in('id', moduleIds);
        
        if (nameError) throw nameError;
        return (moduleNames || []).map((m: any) => m.nome).filter(Boolean);
    } catch (e: any) {
        console.error("Error fetching modules:", e.message);
        return [];
    }
};

export const updateOrgModules = async (orgId: number, moduleList: string[]) => {
    try {
        if (!orgId) return false;
        const { data: modData, error: fetchError } = await supabase
            .from('modulos')
            .select('id, nome')
            .in('nome', moduleList);
        
        if (fetchError) throw fetchError;
        if (!modData) return false;

        await supabase.from('organizacao_modulo').delete().eq('organizacao', orgId);
        
        if (modData.length > 0) {
            const rows = modData.map(m => ({ organizacao: orgId, modulo: m.id }));
            const { error: insertError } = await supabase.from('organizacao_modulo').insert(rows);
            if (insertError) throw insertError;
        }
        return true;
    } catch (e: any) {
        console.error("Error updating modules:", e.message);
        return false;
    }
};

export const updateOrgModulesByIds = async (orgId: number, moduleIds: number[]) => {
    try {
        if (!orgId) return false;
        
        await supabase.from('organizacao_modulo').delete().eq('organizacao', orgId);
        
        if (moduleIds.length > 0) {
            const rows = moduleIds.map(id => ({ organizacao: orgId, modulo: id }));
            const { error: insertError } = await supabase.from('organizacao_modulo').insert(rows);
            if (insertError) throw insertError;
        }
        return true;
    } catch (e: any) {
        console.error("Error updating modules by IDs:", e.message);
        return false;
    }
};

export const createOrganization = async (userId: string, name: string, sector: string, dna?: string, userEmail?: string, userName?: string) => {
    try {
        // Tenta inserir com o campo 'plano'
        let { data: org, error: orgError } = await supabase
            .from(ORG_TABLE)
            .insert({ 
                nome: name, 
                setor: sector, 
                dna: dna || '',
                plano: 4, 
                colaboradores: 100,
                pedidoia: 0,
                cor: '#F59E0B'
            })
            .select()
            .single();
        
        // Fallback robusto: se a coluna 'plano' falhar por erro de cache de schema, tenta sem ela
        if (orgError && orgError.message.includes('plano')) {
            const { data: fallbackOrg, error: fallbackError } = await supabase
                .from(ORG_TABLE)
                .insert({ 
                    nome: name, 
                    setor: sector, 
                    dna: dna || '',
                    colaboradores: 100,
                    pedidoia: 0,
                    cor: '#F59E0B'
                })
                .select()
                .single();
            
            if (fallbackError) throw fallbackError;
            org = fallbackOrg;
        } else if (orgError) {
            throw orgError;
        }

        if (!org) throw new Error("Falha ao retornar organização criada.");

        // Criar usuário Dono
        const { error: userError } = await supabase
            .from('users')
            .upsert({ 
                id: userId,
                nome: userName || 'Proprietário',
                email: userEmail || '',
                organizacao: org.id, 
                perfil: 'dono',
                status: 'Ativo',
                ativo: true 
            });
        
        if (userError) throw userError;

        // Ativar módulos iniciais
        await updateOrgModules(org.id, ['projects', 'kanban', 'ia', 'clients']);

        // --- AUTOMATIZAÇÃO SHINKŌ: CRIAR PROJETO DE SUPORTE DEFAULT ---
        // Correção: Adicionado 'rde: Morno' para evitar erro NOT NULL
        const { error: supportError } = await supabase.from('projetos').insert({
            nome: 'Central de Suporte & Voz do Cliente',
            descricao: 'Processo padrão para recebimento de feedbacks e chamados técnicos. Este projeto recebe cards automaticamente do portal de tickets.',
            organizacao: org.id,
            arquetipo: 'Serviço Tecnológico',
            intensidade: 1,
            velocidade: 5,
            viabilidade: 5,
            receita: 1,
            prioseis: 60,
            cor: '#3B82F6',
            projoport: false,
            rde: 'Morno'
        });

        if (supportError) console.error("Erro ao criar projeto suporte default:", supportError);

        await supabase.from('clientes').insert({
            nome: name,
            email: userEmail || '',
            status: 'Ativo',
            organizacao: org.id,
            valormensal: 0,
            meses: 12,
            data_inicio: new Date().toISOString().split('T')[0],
            contrato: 'Draft'
        });

        return org;
    } catch (err: any) {
        console.error("Erro fatal na criação de org:", err);
        throw new Error(`Falha ao criar organização: ${err.message}`);
    }
};

export const fetchRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('area_atuacao')
        .select('*')
        .eq('empresa', Number(orgId));
    if (error) return [];
    return data.map((d: any) => ({
        id: d.id,
        nome: d.cargo || `Cargo ${d.id}`,
        custo_base: d.custo_base || 0
    }));
};

export const updateOrgDetails = async (orgId: number, updates: any) => {
    const payload: any = {};
    if (updates.logoUrl !== undefined) payload.logo = updates.logoUrl;
    if (updates.primaryColor !== undefined) payload.cor = updates.primaryColor;
    if (updates.name !== undefined) payload.nome = updates.name;
    if (updates.limit !== undefined) payload.colaboradores = updates.limit;
    if (updates.aiSector !== undefined) payload.setor = updates.aiSector; 
    if (updates.aiTone !== undefined) payload.tomdevoz = updates.aiTone;
    if (updates.aiContext !== undefined) payload.dna = updates.aiContext;
    if (Object.keys(payload).length === 0) return { success: true };
    try {
        const { data, error } = await supabase.from(ORG_TABLE).update(payload).eq('id', orgId).select();
        if (error) throw error;
        return { success: true, data };
    } catch (err: any) { throw new Error(err.message); }
};

export const fetchOrganizationMembersWithRoles = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`id, nome, email, avatar_url, perfil, cargo, ativo, custo_mensal`)
            .eq('organizacao', orgId);
        if (error) throw error;
        return data || [];
    } catch (e) {
        const { data } = await supabase.from('users').select(`id, nome, email, avatar_url, perfil, cargo, ativo`).eq('organizacao', orgId);
        return (data || []).map((u: any) => ({ ...u, custo_mensal: 0 }));
    }
};

export const updateUserRole = async (userId: string, roleId: number | null) => {
    const { error } = await supabase.from('users').update({ cargo: roleId }).eq('id', userId);
    return !error;
};

export const updateUserCost = async (userId: string, cost: number) => {
    const { error } = await supabase.from('users').update({ custo_mensal: cost }).eq('id', userId);
    return !error;
};

export const fetchOrganizationDetails = async (orgId: number) => {
    const { data } = await supabase.from(ORG_TABLE).select('*').eq('id', orgId).maybeSingle();
    return data;
};

export const findOrgIdByOwnerEmail = async (email: string): Promise<number | null> => {
    const { data } = await supabase.from('users').select('organizacao').eq('email', email).eq('perfil', 'dono').maybeSingle();
    return data?.organizacao || null;
};

export const uploadAvatar = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;
    await supabase.storage.from(LOGO_BUCKET).upload(fileName, file, { upsert: true });
    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
    await supabase.from('users').update({ avatar_url: data.publicUrl }).eq('id', userId);
    return data.publicUrl;
};

export const updateRoleCost = async (id: number, cost: number) => {
    const { error } = await supabase.from('area_atuacao').update({ custo_base: cost }).eq('id', id);
    return !error;
};

export const createRole = async (nome: string, orgId: number) => {
    const { data } = await supabase.from('area_atuacao').insert({ cargo: nome, empresa: orgId }).select().single();
    return data;
};

export const deleteRole = async (id: number) => {
    const { error } = await supabase.from('area_atuacao').delete().eq('id', id);
    return !error;
};
