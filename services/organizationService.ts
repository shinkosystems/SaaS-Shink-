
import { supabase } from './supabaseClient';
import { PLAN_LIMITS } from '../types';

const ORG_TABLE = 'organizacoes';
const LOGO_BUCKET = 'fotoperfil'; 

// System Modules Definition
export const SYSTEM_MODULES_DEF = [
    'projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'engineering', 'product', 'ia', 'whitelabel'
];

// Helper to determine plan string from ID
const getPlanKeyFromId = (id: number): string => {
    switch (id) {
        case 4: return 'plan_free';
        case 1: return 'plan_solo';
        case 2: return 'plan_studio';
        case 3: return 'plan_scale';
        case 9: return 'plan_scale'; 
        case 5: return 'plan_agency'; 
        case 10: return 'plan_enterprise';
        case 11: return 'plan_solo_yearly';
        case 12: return 'plan_studio_yearly';
        case 13: return 'plan_scale_yearly';
        default: return 'plan_free';
    }
};

/**
 * Fix: Added missing getPlanDefaultModules function
 */
export const getPlanDefaultModules = (planId: number): string[] => {
    switch (planId) {
        case 4: // Free
            return ['kanban', 'crm'];
        case 1: // Solo
            return ['projects', 'kanban', 'gantt', 'crm'];
        case 2: // Studio
            return ['projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'ia'];
        case 3: // Scale
        case 9:
            return ['projects', 'kanban', 'gantt', 'calendar', 'crm', 'financial', 'clients', 'engineering', 'product', 'ia'];
        case 10: // Enterprise
            return SYSTEM_MODULES_DEF;
        default:
            return ['kanban'];
    }
};

/**
 * Busca o ID da organização vinculada ao e-mail de um dono.
 */
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
        // 1. Criar a Organização
        const { data: org, error: orgError } = await supabase
            .from(ORG_TABLE)
            .insert({ 
                nome: name, 
                setor: sector, 
                dna: dna || '',
                plano: 4, // Default Free
                colaboradores: 1,
                pedidoia: 0,
                cor: '#F59E0B'
            })
            .select()
            .single();
        
        if (orgError) throw orgError;

        // 2. Garantir que o registro do usuário exista na tabela 'users' (Upsert)
        const { error: userError } = await supabase
            .from('users')
            .upsert({ 
                id: userId,
                nome: userName || 'Proprietário',
                email: userEmail || '',
                organizacao: org.id, 
                perfil: 'dono',
                status: 'Ativo'
            });
        
        if (userError) throw userError;

        // 3. Criar automaticamente um Cliente (Stakeholder) com o nome da empresa
        // Isso permite que o dono já comece a criar projetos associados à própria marca/internamente.
        await supabase
            .from('clientes')
            .insert({
                nome: name,
                email: userEmail || '',
                status: 'Ativo',
                organizacao: org.id,
                valormensal: 0,
                meses: 12,
                data_inicio: new Date().toISOString().split('T')[0]
            });

        return org;
    } catch (err: any) {
        throw new Error(`Falha ao criar organização: ${err.message}`);
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
        throw new Error(`Erro no upload do logo: ${error.message}`);
    }
};

export const uploadAvatar = async (userId: string, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `fotoperfil/avatar-${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        // Atualizar a tabela de usuários com a nova URL
        const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        return publicUrl;
    } catch (error: any) {
        throw new Error(`Erro no upload da foto: ${error.message}`);
    }
};

export const fetchOrganizationDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from(ORG_TABLE)
            .select('*')
            .eq('id', orgId)
            .single();
        if (error && error.code !== 'PGRST116') console.error(`Error fetching organization details:`, error);
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
        if (error) throw new Error(error.message);
        return { success: true, data };
    } catch (err: any) { throw new Error(err.message); }
};

export const seedSystemModules = async () => {
    try {
        const { data: existing } = await supabase.from('modulos').select('nome');
        const existingNames = new Set(existing?.map(m => m.nome) || []);
        const toInsert = SYSTEM_MODULES_DEF.filter(key => !existingNames.has(key)).map(key => ({ nome: key }));
        if (toInsert.length > 0) await supabase.from('modulos').insert(toInsert);
    } catch (e) {}
};

export const fetchSystemModuleMap = async (): Promise<Record<string, number>> => {
    await seedSystemModules();
    const { data } = await supabase.from('modulos').select('id, nome');
    if (!data) return {};
    const map: Record<string, number> = {};
    data.forEach(m => { if (m.nome) map[m.nome] = m.id; });
    return map;
};

export const fetchActiveOrgModules = async (orgId: number): Promise<string[]> => {
    try {
        const { data, error } = await supabase.from('organizacao_modulo').select('modulo (nome)').eq('organizacao', orgId);
        if (error) return []; 
        return data.map((item: any) => item.modulo?.nome).filter(Boolean);
    } catch (e) { return []; }
};

export const updateOrgModules = async (orgId: number, moduleKeys: string[]) => {
    try {
        await seedSystemModules();
        const { data: allModules } = await supabase.from('modulos').select('id, nome');
        if (!allModules) throw new Error("System modules not found.");
        const moduleMap = new Map(allModules.map(m => [m.nome, m.id]));
        const idsToInsert = moduleKeys.map(k => moduleMap.get(k)).filter(Boolean) as number[];
        return updateOrgModulesByIds(orgId, idsToInsert);
    } catch (err: any) { throw new Error(err.message); }
};

export const updateOrgModulesByIds = async (orgId: number, moduleIds: number[]) => {
    try {
        await supabase.from('organizacao_modulo').delete().eq('organizacao', orgId);
        if (moduleIds.length > 0) {
            const payload = moduleIds.map(modId => ({ organizacao: orgId, modulo: modId }));
            await supabase.from('organizacao_modulo').insert(payload);
        }
        return { success: true };
    } catch (err: any) { throw new Error(err.message); }
};

export const contractModule = async (orgId: number, moduleKey: string) => {
    try {
        const moduleMap = await fetchSystemModuleMap();
        const moduleId = moduleMap[moduleKey];
        if (!moduleId) throw new Error("Módulo inválido.");
        const { data: existing } = await supabase.from('organizacao_modulo').select('id').eq('organizacao', orgId).eq('modulo', moduleId).single();
        if (existing) return { success: true, msg: "Já contratado" };
        await supabase.from('organizacao_modulo').insert({ organizacao: orgId, modulo: moduleId });
        return { success: true };
    } catch (err: any) { throw new Error(err.message); }
};

/**
 * Fix: Added missing fetchRoles function
 */
export const fetchRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('area_atuacao')
        .select('*')
        .eq('organizacao', orgId);
    if (error) return [];
    return data.map((d: any) => ({
        id: d.id,
        nome: d.nome || d.name || d.titulo || d.descricao || `Cargo ${d.id}`
    }));
};

/**
 * Fix: Added missing createRole function
 */
export const createRole = async (nome: string, orgId: number) => {
    const { data, error } = await supabase
        .from('area_atuacao')
        .insert({ nome, organizacao: orgId })
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Fix: Added missing deleteRole function
 */
export const deleteRole = async (id: number) => {
    const { error } = await supabase
        .from('area_atuacao')
        .delete()
        .eq('id', id);
    return !error;
};

/**
 * Fix: Added missing fetchOrganizationMembersWithRoles function
 */
export const fetchOrganizationMembersWithRoles = async (orgId: number) => {
    const { data, error } = await supabase
        .from('users')
        .select(`
            id, nome, email, avatar_url, perfil, cargo
        `)
        .eq('organizacao', orgId);
    
    if (error) return [];
    return data;
};

/**
 * Fix: Added missing updateUserRole function
 */
export const updateUserRole = async (userId: string, roleId: number | null) => {
    const { error } = await supabase
        .from('users')
        .update({ cargo: roleId })
        .eq('id', userId);
    return !error;
};

/**
 * Fix: Completed truncated getPublicOrgDetails function
 */
export const getPublicOrgDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase
            .from('organizacoes')
            .select('nome, logo, cor, plano')
            .eq('id', orgId)
            .single();
        if (error) return null;
        return data;
    } catch (e) {
        return null;
    }
};
