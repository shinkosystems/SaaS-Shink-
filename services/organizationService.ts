
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

export const createOrganization = async (userId: string, name: string, sector: string, dna?: string) => {
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

        // 2. Vincular o Usuário à nova Organização
        const { error: userError } = await supabase
            .from('users')
            .update({ organizacao: org.id, perfil: 'dono' })
            .eq('id', userId);
        
        if (userError) throw userError;

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

export const getPublicOrgDetails = async (orgId: number) => {
    try {
        const { data, error } = await supabase.from('organizacoes').select('nome, logo, cor, plano').eq('id', orgId).single();
        if (error || !data) return null;
        const isWhitelabelAllowed = data.plano === 10 || data.plano === 5 || (data as any).whitelable === true;
        if (isWhitelabelAllowed) return { name: data.nome, logoUrl: data.logo, primaryColor: data.cor, plano: data.plano };
        return null;
    } catch (error) { return null; }
};

export const fetchRoles = async (organizationId: number) => {
    if (!organizationId) return [];
    const { data, error } = await supabase.from('area_atuacao').select('*').eq('empresa', organizationId).order('cargo', { ascending: true });
    if (error) return [];
    return data.map((d: any) => ({ id: d.id, nome: d.cargo || `Cargo ${d.id}` })) || [];
};

export const createRole = async (name: string, organizationId: number) => {
    if (!organizationId) throw new Error("Organization ID required to create role");
    const { data, error } = await supabase.from('area_atuacao').insert({ cargo: name, empresa: organizationId }).select().single();
    if (error) throw error;
    return { id: data.id, nome: data.cargo };
};

export const deleteRole = async (id: number) => {
    const { error } = await supabase.from('area_atuacao').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const fetchOrganizationMembersWithRoles = async (orgId: number) => {
    const { data, error } = await supabase.from('users').select('id, nome, email, avatar_url, cargo, perfil').eq('organizacao', orgId).order('nome');
    if (error) return [];
    const cargoIds = [...new Set(data.map((u: any) => u.cargo).filter(Boolean))];
    let areaMap = new Map<number, string>();
    if (cargoIds.length > 0) {
        const { data: areas } = await supabase.from('area_atuacao').select('*').in('id', cargoIds);
        areas?.forEach((a: any) => {
            const name = a.cargo || a.nome || `Cargo ${a.id}`;
            areaMap.set(a.id, name);
        });
    }
    return data.map((u: any) => ({ ...u, roleName: areaMap.get(u.cargo) || (u.cargo ? 'Cargo Excluído' : 'Sem Cargo') }));
};

export const updateUserRole = async (userId: string, roleId: number | null) => {
    const { error } = await supabase.from('users').update({ cargo: roleId }).eq('id', userId);
    if (error) throw error;
    return true;
};

export const checkAndIncrementAiUsage = async (orgId: number): Promise<{ success: boolean; usage: number; limit: number }> => {
    try {
        const { data: orgData, error } = await supabase.from(ORG_TABLE).select('pedidoia, plano').eq('id', orgId).single();
        if (error || !orgData) throw new Error("Erro ao verificar limite de IA.");
        const currentUsage = orgData.pedidoia || 0;
        const planKey = getPlanKeyFromId(orgData.plano || 4); 
        const limit = PLAN_LIMITS[planKey]?.aiLimit || 0;
        if (limit === 0) return { success: false, usage: currentUsage, limit: 0 };
        if (limit < 9000 && currentUsage >= limit) return { success: false, usage: currentUsage, limit };
        await supabase.from(ORG_TABLE).update({ pedidoia: currentUsage + 1 }).eq('id', orgId);
        return { success: true, usage: currentUsage + 1, limit };
    } catch (e: any) { return { success: false, usage: 0, limit: 0 }; }
};

export const getPlanDefaultModules = (planId: number): string[] => {
    const planKey = getPlanKeyFromId(planId);
    const planConfig = PLAN_LIMITS[planKey];
    if (!planConfig) return ['projects', 'kanban'];
    const modules = ['projects', 'kanban'];
    if (planConfig.features.gantt) modules.push('gantt', 'calendar');
    if (planConfig.features.financial) modules.push('financial');
    if (planConfig.features.clients) modules.push('clients');
    if (planConfig.features.metrics) modules.push('engineering', 'product');
    if (planConfig.features.crm) modules.push('crm');
    if (planConfig.features.aiAdvanced) modules.push('ia');
    if (planConfig.features.whitelabel) modules.push('whitelabel');
    return modules;
};
