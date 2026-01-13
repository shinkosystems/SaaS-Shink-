
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

// --- FUNÇÕES DE GESTÃO DE MÓDULOS ALINHADAS AO SCHEMA ---

/**
 * Busca a lista de nomes (slugs) de módulos ativos para uma organização.
 * Refatorado para consulta em duas etapas para evitar erros de Join ambíguo.
 */
export const fetchActiveOrgModules = async (orgId: number): Promise<string[]> => {
    try {
        if (!orgId) return [];

        // 1. Busca os IDs dos módulos vinculados na tabela associativa
        const { data: relations, error: relError } = await supabase
            .from('organizacao_modulo')
            .select('modulo')
            .eq('organizacao', orgId);
        
        if (relError) throw relError;
        if (!relations || relations.length === 0) return [];

        const moduleIds = relations.map(r => r.modulo).filter(id => id !== null);
        if (moduleIds.length === 0) return [];

        // 2. Busca os nomes reais desses módulos na tabela mestre
        const { data: moduleNames, error: nameError } = await supabase
            .from('modulos')
            .select('nome')
            .in('id', moduleIds);
        
        if (nameError) throw nameError;

        return (moduleNames || [])
            .map((m: any) => m.nome)
            .filter(Boolean);

    } catch (e: any) {
        const errorDetail = e?.message || e?.details || JSON.stringify(e);
        console.error("Error fetching modules:", errorDetail);
        return [];
    }
};

/**
 * Atualiza os módulos de uma organização.
 * Primeiro busca os IDs correspondentes aos nomes fornecidos e atualiza a tabela associativa.
 */
export const updateOrgModules = async (orgId: number, moduleList: string[]) => {
    try {
        if (!orgId) return false;

        // 1. Busca os IDs reais dos módulos baseados nos nomes (slugs)
        const { data: modData, error: fetchError } = await supabase
            .from('modulos')
            .select('id, nome')
            .in('nome', moduleList);
        
        if (fetchError) throw fetchError;
        if (!modData) return false;

        // 2. Remove vínculos antigos para garantir sincronia limpa
        const { error: deleteError } = await supabase
            .from('organizacao_modulo')
            .delete()
            .eq('organizacao', orgId);
        
        if (deleteError) throw deleteError;

        // 3. Insere os novos vínculos
        if (modData.length > 0) {
            const rows = modData.map(m => ({ 
                organizacao: orgId, 
                modulo: m.id 
            }));
            const { error: insertError } = await supabase.from('organizacao_modulo').insert(rows);
            if (insertError) throw insertError;
        }
        return true;
    } catch (e: any) {
        const errorDetail = e?.message || e?.details || JSON.stringify(e);
        console.error("Error updating modules:", errorDetail);
        return false;
    }
};

/**
 * Gera um mapeamento dinâmico de Nome -> ID para tradução rápida.
 */
export const fetchSystemModuleMap = async (): Promise<Record<string, number>> => {
    try {
        const { data, error } = await supabase.from('modulos').select('id, nome');
        if (error) throw error;
        
        const map: Record<string, number> = {};
        data?.forEach(m => {
            if (m.nome) map[m.nome.toLowerCase()] = m.id;
        });
        return map;
    } catch (e: any) {
        const errorDetail = e?.message || e?.details || JSON.stringify(e);
        console.error("Error fetching system module map:", errorDetail);
        return {};
    }
};

/**
 * Atualiza módulos da organização usando IDs numéricos diretos.
 */
export const updateOrgModulesByIds = async (orgId: number, moduleIds: number[]) => {
    try {
        if (!orgId) return false;

        await supabase.from('organizacao_modulo').delete().eq('organizacao', orgId);
        
        if (moduleIds.length > 0) {
            const rows = moduleIds.map(id => ({ 
                organizacao: orgId, 
                modulo: id 
            }));
            const { error: insertError } = await supabase.from('organizacao_modulo').insert(rows);
            if (insertError) throw insertError;
        }
        return true;
    } catch (e: any) {
        const errorDetail = e?.message || e?.details || JSON.stringify(e);
        console.error("Error updating modules by ids:", errorDetail);
        return false;
    }
};

/**
 * Busca detalhes públicos de uma organização para customização dinâmica (White Label).
 */
export const getPublicOrgDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from(ORG_TABLE)
            .select('nome, logo, cor, setor')
            .eq('id', orgId)
            .single();
        if (error) throw error;
        return data;
    } catch (err: any) {
        const errorDetail = err?.message || err?.details || JSON.stringify(err);
        console.error("Error fetching public org details:", errorDetail);
        return null;
    }
};

// --- FUNÇÕES DE ORGANIZAÇÃO E USUÁRIOS ---

export const findOrgIdByOwnerEmail = async (email: string): Promise<number | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('organizacao, perfil')
            .eq('email', email)
            .eq('perfil', 'dono')
            .single();
        
        if (error || !data) return null;
        return data.organizacao;
    } catch (e) {
        return null;
    }
};

export const createOrganization = async (userId: string, name: string, sector: string, dna?: string, userEmail?: string, userName?: string) => {
    try {
        const { data: org, error: orgError } = await supabase
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
        
        if (orgError) throw orgError;

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

        // Vincula módulos padrão para nova organização
        await updateOrgModules(org.id, ['projects', 'kanban', 'ia']);

        await supabase
            .from('clientes')
            .insert({
                nome: name,
                email: userEmail || '',
                status: 'Ativo',
                organizacao: org.id,
                valormensal: 0,
                meses: 12,
                data_inicio: new Date().toISOString().split('T')[0],
                contrato: 'Draft',
                logo_url: ''
            });

        return org;
    } catch (err: any) {
        const errorDetail = err?.message || err?.details || JSON.stringify(err);
        throw new Error(`Falha ao criar organização: ${errorDetail}`);
    }
};

export const uploadLogo = async (orgId: number, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `fotoperfil/org-logo-${orgId}-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(fileName, file, { upsert: true });
        
        if (error) throw error;
        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
        return data.publicUrl;
    } catch (error: any) {
        const errorDetail = error?.message || error?.details || JSON.stringify(error);
        throw new Error(`Erro no upload do logo: ${errorDetail}`);
    }
};

export const uploadAvatar = async (userId: string, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `fotoperfil/avatar-${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
        const publicUrl = data.publicUrl;
        const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId);
        if (updateError) throw updateError;
        return publicUrl;
    } catch (error: any) {
        const errorDetail = error?.message || error?.details || JSON.stringify(error);
        throw new Error(`Erro no upload da foto: ${errorDetail}`);
    }
};

export const fetchOrganizationDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase.from(ORG_TABLE).select('*').eq('id', orgId).single();
        if (error && error.code !== 'PGRST116') {
            console.error(`Error fetching organization details:`, error.message);
        }
        return data;
    } catch (err) { return null; }
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
    } catch (err: any) { 
        const errorDetail = err?.message || err?.details || JSON.stringify(err);
        throw new Error(errorDetail); 
    }
};

export const fetchRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('area_atuacao')
        .select('*')
        .eq('empresa', Number(orgId));
    
    if (error) {
        console.warn("Cargos não carregados:", error.message);
        return [];
    }

    return data.map((d: any) => ({
        id: d.id,
        nome: d.cargo || `Cargo ${d.id}`,
        custo_base: d.custo_base || 0
    }));
};

export const updateRoleCost = async (roleId: number, cost: number) => {
    const { error } = await supabase.from('area_atuacao').update({ custo_base: cost }).eq('id', roleId);
    return !error;
};

export const createRole = async (nome: string, orgId: number) => {
    const { data, error } = await supabase.from('area_atuacao').insert({ cargo: nome, empresa: orgId }).select().single();
    if (error) throw error;
    return data;
};

export const deleteRole = async (id: number) => {
    const { error } = await supabase.from('area_atuacao').delete().eq('id', id);
    return !error;
};

/**
 * Busca membros com detecção automática de colunas opcionais (custo_mensal)
 */
export const fetchOrganizationMembersWithRoles = async (orgId: number) => {
    const targetOrgId = Number(orgId);
    if (!targetOrgId) return [];

    try {
        const { data, error } = await supabase
            .from('users')
            .select(`id, nome, email, avatar_url, perfil, cargo, ativo, custo_mensal`)
            .eq('organizacao', targetOrgId);
        
        if (error) {
            const { data: safeData, error: safeError } = await supabase
                .from('users')
                .select(`id, nome, email, avatar_url, perfil, cargo, ativo`)
                .eq('organizacao', targetOrgId);

            if (safeError) return [];
            return (safeData || []).map((u: any) => ({ ...u, custo_mensal: 0 }));
        }
        return data || [];
    } catch (e) {
        return [];
    }
};

export const updateUserRole = async (userId: string, roleId: number | null) => {
    const { error } = await supabase.from('users').update({ cargo: roleId }).eq('id', userId);
    return !error;
};

export const updateUserCost = async (userId: string, cost: number) => {
    try {
        const { error } = await supabase.from('users').update({ custo_mensal: cost }).eq('id', userId);
        return !error;
    } catch (e) { return false; }
};
